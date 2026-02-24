use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;

// ---------------------------------------------------------------------------
// Payload structs — deserialized from TypeScript invoke payload
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct ReleaseLinkPayload {
    pub url: String,
    pub platform: String,
}

#[derive(Deserialize)]
pub struct ReleaseSitePayload {
    pub mbid: String,
    pub title: String,
    pub year: Option<i32>,
    pub r#type: String,
    pub cover_art_url: Option<String>,
    pub links: Vec<ReleaseLinkPayload>,
}

#[derive(Deserialize)]
pub struct ArtistSitePayload {
    pub name: String,
    pub slug: String,
    pub tags: String,
    pub country: Option<String>,
    pub r#type: Option<String>,
    pub begin_year: Option<i32>,
    pub ended: bool,
    pub bio: Option<String>,
    pub releases: Vec<ReleaseSitePayload>,
}

#[derive(Serialize)]
pub struct SiteGenResult {
    pub output_dir: String,
    pub cover_count: usize,
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Escapes the five HTML special characters. Applied to all user-supplied text
/// before format!() interpolation. Never applied to URL strings in href= attrs.
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

/// Downloads a cover image to `dest`. Returns true on success, false on any error.
/// Best-effort — callers must not abort on false.
async fn download_cover(url: &str, dest: &std::path::Path) -> bool {
    let Ok(response) = reqwest::get(url).await else {
        return false;
    };
    if !response.status().is_success() {
        return false;
    }
    let Ok(bytes) = response.bytes().await else {
        return false;
    };
    std::fs::write(dest, &bytes).is_ok()
}

/// Maps a lowercase platform identifier to a display label.
fn platform_label(platform: &str) -> String {
    match platform {
        "bandcamp" => "Bandcamp".to_string(),
        "spotify" => "Spotify".to_string(),
        "soundcloud" => "SoundCloud".to_string(),
        "youtube" => "YouTube".to_string(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        }
    }
}

/// Builds tag pill HTML from a comma-separated tag string.
/// Returns empty string if no tags.
fn build_tags_html(tags: &str) -> String {
    let trimmed = tags.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let pills: Vec<String> = trimmed
        .split(',')
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .map(|t| format!(r#"<span class="tag">{}</span>"#, html_escape(t)))
        .collect();

    if pills.is_empty() {
        return String::new();
    }

    format!(r#"<div class="tags">{}</div>"#, pills.join("\n    "))
}

/// Builds the releases section HTML. Uses `downloaded` set to decide whether
/// to render an <img> or an inline SVG placeholder per release.
fn build_releases_html(releases: &[ReleaseSitePayload], downloaded: &HashSet<String>) -> String {
    if releases.is_empty() {
        return String::new();
    }

    let cards: Vec<String> = releases
        .iter()
        .map(|r| {
            // Cover image or placeholder
            let cover_html = if downloaded.contains(&r.mbid) {
                format!(
                    r#"<img src="covers/{mbid}.jpg" alt="{title}" class="cover" loading="lazy">"#,
                    mbid = r.mbid,
                    title = html_escape(&r.title),
                )
            } else {
                r##"<div class="cover-placeholder"><svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#1c1c1c" rx="4"/><text x="60" y="70" font-size="40" text-anchor="middle" fill="#404040">&#9835;</text></svg></div>"##.to_string()
            };

            // Year and type metadata
            let year_str = r.year.map(|y| format!("{}", y)).unwrap_or_default();
            let mut meta_parts = Vec::new();
            if !year_str.is_empty() {
                meta_parts.push(format!(
                    r#"<span class="release-year">{}</span>"#,
                    html_escape(&year_str)
                ));
            }
            if !r.r#type.is_empty() {
                meta_parts.push(format!(
                    r#"<span class="release-type">{}</span>"#,
                    html_escape(&r.r#type)
                ));
            }
            let meta_html = if meta_parts.is_empty() {
                String::new()
            } else {
                format!(
                    r#"<div class="release-meta">{}</div>"#,
                    meta_parts.join(" ")
                )
            };

            // Platform links
            let links_html = if r.links.is_empty() {
                String::new()
            } else {
                let link_items: Vec<String> = r
                    .links
                    .iter()
                    .map(|l| {
                        format!(
                            r#"<a href="{url}" target="_blank" rel="noopener noreferrer" class="link-{platform}">{label}</a>"#,
                            url = l.url,
                            platform = l.platform,
                            label = platform_label(&l.platform),
                        )
                    })
                    .collect();
                format!(
                    r#"<div class="release-links">{}</div>"#,
                    link_items.join("\n          ")
                )
            };

            format!(
                r#"<div class="release-card">
      {cover_html}
      <div class="release-info">
        <div class="release-title">{title}</div>
        {meta_html}
        {links_html}
      </div>
    </div>"#,
                cover_html = cover_html,
                title = html_escape(&r.title),
                meta_html = meta_html,
                links_html = links_html,
            )
        })
        .collect();

    cards.join("\n    ")
}

/// Builds the complete HTML document string for the generated artist site.
/// All text fields go through html_escape(). URLs in href= attrs are NOT escaped.
fn build_html(artist: &ArtistSitePayload, downloaded: &HashSet<String>) -> String {
    let name = html_escape(&artist.name);

    // Bio section — optional
    let bio_html = artist
        .bio
        .as_deref()
        .map(|b| format!(r#"<p class="bio">{}</p>"#, html_escape(b)))
        .unwrap_or_default();

    // Tags section
    let tags_html = build_tags_html(&artist.tags);

    // Artist metadata line (country, type, begin_year, ended)
    let mut meta_parts: Vec<String> = Vec::new();
    if let Some(ref country) = artist.country {
        if !country.is_empty() {
            meta_parts.push(html_escape(country));
        }
    }
    if let Some(ref atype) = artist.r#type {
        if !atype.is_empty() {
            meta_parts.push(html_escape(atype));
        }
    }
    if let Some(year) = artist.begin_year {
        if artist.ended {
            meta_parts.push(format!("{}–", year));
        } else {
            meta_parts.push(format!("est. {}", year));
        }
    }
    let meta_html = if meta_parts.is_empty() {
        String::new()
    } else {
        format!(
            r#"<p class="artist-meta">{}</p>"#,
            meta_parts.join(" &middot; ")
        )
    };

    // Releases section
    let releases_html = build_releases_html(&artist.releases, downloaded);
    let releases_section = if releases_html.is_empty() {
        String::new()
    } else {
        format!(
            r#"<section class="discography">
      <h2>Discography</h2>
      <div class="release-grid">
    {releases_html}
      </div>
    </section>"#,
            releases_html = releases_html
        )
    };

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{name}</title>
  <style>
    /* Mercury dark theme — static hex translations (no OKLCH for browser compatibility) */
    :root {{
      --bg-base: #111111;
      --bg-surface: #1c1c1c;
      --text-primary: #e8e8e8;
      --text-secondary: #b3b3b3;
      --text-muted: #808080;
      --link-color: #7ab4d8;
      --tag-bg: #1a2530;
      --tag-text: #7ab4d8;
      --tag-border: #2a3d50;
      --border-default: #333333;
      --bandcamp-color: #1da0c3;
      --spotify-color: #1db954;
      --soundcloud-color: #ff5500;
      --youtube-color: #ff0000;
    }}

    *, *::before, *::after {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    html, body {{
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
    }}

    body {{
      padding: 1rem;
    }}

    main.artist-page {{
      max-width: 720px;
      margin: 0 auto;
      padding: 2rem 0;
    }}

    h1.artist-name {{
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
      line-height: 1.2;
    }}

    h2 {{
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 1rem;
    }}

    p.artist-meta {{
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }}

    p.bio {{
      color: var(--text-secondary);
      font-size: 0.9375rem;
      line-height: 1.7;
      margin: 1rem 0;
      white-space: pre-wrap;
    }}

    /* Tags */
    .tags {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin: 1rem 0;
    }}

    .tag {{
      display: inline-block;
      background: var(--tag-bg);
      color: var(--tag-text);
      border: 1px solid var(--tag-border);
      border-radius: 4px;
      padding: 0.125rem 0.5rem;
      font-size: 0.8125rem;
      white-space: nowrap;
    }}

    /* Discography */
    section.discography {{
      margin-top: 2rem;
      border-top: 1px solid var(--border-default);
      padding-top: 1.5rem;
    }}

    .release-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }}

    @media (max-width: 480px) {{
      .release-grid {{
        grid-template-columns: 1fr;
      }}
    }}

    .release-card {{
      display: flex;
      gap: 0.75rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 0.75rem;
      overflow: hidden;
    }}

    .release-card img.cover {{
      width: 120px;
      height: 120px;
      min-width: 120px;
      object-fit: cover;
      border-radius: 3px;
      display: block;
    }}

    .cover-placeholder {{
      width: 120px;
      height: 120px;
      min-width: 120px;
      border-radius: 3px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }}

    .release-info {{
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      flex: 1;
    }}

    .release-title {{
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }}

    .release-meta {{
      font-size: 0.8125rem;
      color: var(--text-muted);
    }}

    .release-year {{
      margin-right: 0.25rem;
    }}

    .release-type {{
      color: var(--text-muted);
    }}

    /* Platform links */
    .release-links {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: auto;
      padding-top: 0.5rem;
    }}

    .release-links a {{
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      text-decoration: none;
      color: #ffffff;
      transition: opacity 0.15s ease;
    }}

    .release-links a:hover {{
      opacity: 0.85;
    }}

    .link-bandcamp {{
      background-color: var(--bandcamp-color);
    }}

    .link-spotify {{
      background-color: var(--spotify-color);
    }}

    .link-soundcloud {{
      background-color: var(--soundcloud-color);
    }}

    .link-youtube {{
      background-color: var(--youtube-color);
    }}

    /* Default for unknown platforms */
    .release-links a:not([class*="link-bandcamp"]):not([class*="link-spotify"]):not([class*="link-soundcloud"]):not([class*="link-youtube"]) {{
      background-color: #404040;
    }}

    /* Footer */
    footer {{
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-default);
      text-align: center;
    }}

    footer small {{
      color: var(--text-muted);
      font-size: 0.8125rem;
    }}

    footer a {{
      color: var(--link-color);
      text-decoration: none;
    }}

    footer a:hover {{
      text-decoration: underline;
    }}
  </style>
</head>
<body>
  <main class="artist-page">
    <h1 class="artist-name">{name}</h1>
    {meta_html}
    {bio_html}
    {tags_html}
    {releases_section}
    <footer><small>Made with <a href="https://github.com/yourusername/mercury">Mercury</a></small></footer>
  </main>
</body>
</html>"#,
        name = name,
        meta_html = meta_html,
        bio_html = bio_html,
        tags_html = tags_html,
        releases_section = releases_section,
    )
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Generates a self-contained static artist site in `output_dir/{artist.slug}/`.
/// Downloads cover art sequentially (best-effort). Writes index.html with inline CSS.
/// Returns the output path and number of covers successfully downloaded.
#[tauri::command]
pub async fn generate_artist_site(
    output_dir: String,
    artist: ArtistSitePayload,
) -> Result<SiteGenResult, String> {
    let out_path = PathBuf::from(&output_dir).join(&artist.slug);
    let covers_path = out_path.join("covers");

    std::fs::create_dir_all(&covers_path)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    // Download covers sequentially to avoid rate-limiting Cover Art Archive
    let mut downloaded_mbids: HashSet<String> = HashSet::new();
    for release in &artist.releases {
        if let Some(ref url) = release.cover_art_url {
            let dest = covers_path.join(format!("{}.jpg", release.mbid));
            if download_cover(url, &dest).await {
                downloaded_mbids.insert(release.mbid.clone());
            }
        }
    }

    // Generate HTML using the downloaded set for cover img vs placeholder decision
    let html = build_html(&artist, &downloaded_mbids);

    std::fs::write(out_path.join("index.html"), html.as_bytes())
        .map_err(|e| format!("Failed to write index.html: {}", e))?;

    Ok(SiteGenResult {
        output_dir: out_path.to_string_lossy().to_string(),
        cover_count: downloaded_mbids.len(),
    })
}

/// Opens the given path in the OS file explorer. Fire-and-forget — does not wait for the
/// explorer window to close. Uses std::process::Command to avoid new crate dependencies.
#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_escape_ampersand() {
        assert_eq!(html_escape("Simon & Garfunkel"), "Simon &amp; Garfunkel");
    }

    #[test]
    fn html_escape_lt_gt() {
        assert_eq!(html_escape("<script>"), "&lt;script&gt;");
    }

    #[test]
    fn html_escape_quote() {
        assert_eq!(html_escape(r#"say "hello""#), "say &quot;hello&quot;");
    }

    #[test]
    fn html_escape_apostrophe() {
        assert_eq!(html_escape("it's"), "it&#x27;s");
    }

    #[test]
    fn html_escape_clean_string_unchanged() {
        assert_eq!(html_escape("Radiohead"), "Radiohead");
    }

    #[test]
    fn build_tags_html_empty_string() {
        assert_eq!(build_tags_html(""), "");
    }

    #[test]
    fn build_tags_html_whitespace_only() {
        assert_eq!(build_tags_html("   "), "");
    }

    #[test]
    fn build_tags_html_single_tag() {
        let result = build_tags_html("post-rock");
        assert!(result.contains("post-rock"));
        assert!(result.contains("class=\"tag\""));
    }

    #[test]
    fn build_tags_html_multiple_tags() {
        let result = build_tags_html("post-rock, ambient, shoegaze");
        assert!(result.contains("post-rock"));
        assert!(result.contains("ambient"));
        assert!(result.contains("shoegaze"));
    }

    #[test]
    fn build_tags_html_escapes_tag_content() {
        let result = build_tags_html("jazz & blues");
        assert!(result.contains("jazz &amp; blues"));
        assert!(!result.contains("jazz & blues"));
    }

    #[test]
    fn platform_label_known_platforms() {
        assert_eq!(platform_label("bandcamp"), "Bandcamp");
        assert_eq!(platform_label("spotify"), "Spotify");
        assert_eq!(platform_label("soundcloud"), "SoundCloud");
        assert_eq!(platform_label("youtube"), "YouTube");
    }

    #[test]
    fn platform_label_unknown_capitalizes_first() {
        assert_eq!(platform_label("tidal"), "Tidal");
        assert_eq!(platform_label("deezer"), "Deezer");
    }

    #[test]
    fn platform_label_empty_string() {
        assert_eq!(platform_label(""), "");
    }

    #[test]
    fn build_html_no_xss_in_name() {
        let artist = ArtistSitePayload {
            name: "<script>alert(1)</script>".to_string(),
            slug: "test".to_string(),
            tags: String::new(),
            country: None,
            r#type: None,
            begin_year: None,
            ended: false,
            bio: None,
            releases: vec![],
        };
        let downloaded = HashSet::new();
        let html = build_html(&artist, &downloaded);
        assert!(!html.contains("<script>alert(1)</script>"));
        assert!(html.contains("&lt;script&gt;"));
    }

    #[test]
    fn build_html_no_xss_in_bio() {
        let artist = ArtistSitePayload {
            name: "Test Artist".to_string(),
            slug: "test".to_string(),
            tags: String::new(),
            country: None,
            r#type: None,
            begin_year: None,
            ended: false,
            bio: Some("<script>evil()</script>".to_string()),
            releases: vec![],
        };
        let downloaded = HashSet::new();
        let html = build_html(&artist, &downloaded);
        assert!(!html.contains("<script>evil()</script>"));
        assert!(html.contains("&lt;script&gt;"));
    }

    #[test]
    fn build_html_uses_hex_colors_not_oklch() {
        let artist = ArtistSitePayload {
            name: "Test".to_string(),
            slug: "test".to_string(),
            tags: String::new(),
            country: None,
            r#type: None,
            begin_year: None,
            ended: false,
            bio: None,
            releases: vec![],
        };
        let html = build_html(&artist, &HashSet::new());
        assert!(!html.contains("oklch("), "HTML must not contain OKLCH colors");
        assert!(html.contains("#111111") || html.contains("#1c1c1c"));
    }

    #[test]
    fn build_html_no_external_dependencies() {
        let artist = ArtistSitePayload {
            name: "Test".to_string(),
            slug: "test".to_string(),
            tags: String::new(),
            country: None,
            r#type: None,
            begin_year: None,
            ended: false,
            bio: None,
            releases: vec![],
        };
        let html = build_html(&artist, &HashSet::new());
        // No CDN link tags or script tags pointing to external resources
        assert!(!html.contains("cdn."));
        assert!(!html.contains("fonts.googleapis.com"));
        assert!(!html.contains("<script src="));
    }

    #[test]
    fn build_html_cover_placeholder_when_not_downloaded() {
        let artist = ArtistSitePayload {
            name: "Test".to_string(),
            slug: "test".to_string(),
            tags: String::new(),
            country: None,
            r#type: None,
            begin_year: None,
            ended: false,
            bio: None,
            releases: vec![ReleaseSitePayload {
                mbid: "abc123".to_string(),
                title: "Album One".to_string(),
                year: Some(2020),
                r#type: "Album".to_string(),
                cover_art_url: Some("https://example.com/cover.jpg".to_string()),
                links: vec![],
            }],
        };
        let downloaded = HashSet::new(); // nothing downloaded
        let html = build_html(&artist, &downloaded);
        assert!(html.contains("cover-placeholder"));
        assert!(!html.contains(r#"src="covers/abc123.jpg""#));
    }

    #[test]
    fn build_html_cover_img_when_downloaded() {
        let artist = ArtistSitePayload {
            name: "Test".to_string(),
            slug: "test".to_string(),
            tags: String::new(),
            country: None,
            r#type: None,
            begin_year: None,
            ended: false,
            bio: None,
            releases: vec![ReleaseSitePayload {
                mbid: "abc123".to_string(),
                title: "Album One".to_string(),
                year: Some(2020),
                r#type: "Album".to_string(),
                cover_art_url: Some("https://example.com/cover.jpg".to_string()),
                links: vec![],
            }],
        };
        let mut downloaded = HashSet::new();
        downloaded.insert("abc123".to_string());
        let html = build_html(&artist, &downloaded);
        assert!(html.contains(r#"src="covers/abc123.jpg""#));
        assert!(!html.contains("cover-placeholder"));
    }
}

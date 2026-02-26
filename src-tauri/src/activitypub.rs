use rsa::{RsaPrivateKey, RsaPublicKey};
use rsa::pkcs8::{EncodePrivateKey, DecodePrivateKey, LineEnding};
use rsa::pkcs1::EncodeRsaPublicKey;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use crate::ai::taste_db::TasteDbState;

// ---------------------------------------------------------------------------
// Payload and result structs
// ---------------------------------------------------------------------------

#[derive(Deserialize, Clone)]
pub struct ActorIdentity {
    pub handle: String,
    pub display_name: String,
    pub hosting_url: String,
}

#[derive(Serialize)]
pub struct ApExportResult {
    pub actor_path: String,
    pub webfinger_path: String,
    pub outbox_path: String,
    pub post_count: usize,
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Retrieves or generates a stable RSA-2048 keypair persisted in user_identity.
///
/// Mastodon caches actors by key ID — the keypair MUST NOT change between exports.
/// Private key stored as PKCS8 PEM. Public key returned as PKCS1 PEM (Mastodon
/// requires PKCS1 / SPKI-incompatible format for publicKeyPem field).
fn ensure_rsa_keypair(conn: &rusqlite::Connection) -> Result<(String, String), String> {
    // Check for existing private key in user_identity table
    let existing: Result<String, _> = conn.query_row(
        "SELECT value FROM user_identity WHERE key = 'ap_private_key_pem'",
        [],
        |row| row.get(0),
    );

    let (priv_pem, pub_pem) = match existing {
        Ok(pem) => {
            // Parse existing private key
            let priv_key = RsaPrivateKey::from_pkcs8_pem(&pem)
                .map_err(|e| format!("Failed to parse stored RSA key: {}", e))?;
            let pub_key = RsaPublicKey::from(&priv_key);
            let pub_pem = pub_key
                .to_pkcs1_pem(LineEnding::LF)
                .map_err(|e| format!("Failed to encode public key: {}", e))?;
            (pem, pub_pem.to_string())
        }
        Err(_) => {
            // Generate new RSA-2048 keypair
            let mut rng = rand::thread_rng();
            let priv_key = RsaPrivateKey::new(&mut rng, 2048)
                .map_err(|e| format!("Failed to generate RSA key: {}", e))?;
            let pub_key = RsaPublicKey::from(&priv_key);

            let priv_pem = priv_key
                .to_pkcs8_pem(LineEnding::LF)
                .map_err(|e| format!("Failed to encode private key: {}", e))?;
            let pub_pem = pub_key
                .to_pkcs1_pem(LineEnding::LF)
                .map_err(|e| format!("Failed to encode public key: {}", e))?;

            let priv_pem_str = priv_pem.to_string();
            let pub_pem_str = pub_pem.to_string();

            // Persist private key — upsert to survive re-export
            conn.execute(
                "INSERT INTO user_identity (key, value) VALUES ('ap_private_key_pem', ?1) \
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                rusqlite::params![priv_pem_str],
            )
            .map_err(|e| format!("Failed to persist RSA key: {}", e))?;

            (priv_pem_str, pub_pem_str)
        }
    };

    Ok((priv_pem, pub_pem))
}

/// Builds the ActivityPub actor.json JSON-LD document.
/// Dual @context: activitystreams + security/v1 (required for publicKey field).
/// Public key MUST be PKCS1 PEM — Mastodon rejects PKCS8/SPKI format.
fn build_actor_json(identity: &ActorIdentity, pub_key_pem: &str) -> String {
    let url = &identity.hosting_url;
    let actor = serde_json::json!({
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://w3id.org/security/v1"
        ],
        "type": "Person",
        "id": format!("{}/ap/actor.json", url),
        "url": url,
        "preferredUsername": identity.handle,
        "name": identity.display_name,
        "summary": "Music curator on BlackTape",
        "inbox": format!("{}/ap/inbox", url),
        "outbox": format!("{}/ap/outbox.json", url),
        "followers": format!("{}/ap/followers.json", url),
        "following": format!("{}/ap/following.json", url),
        "manuallyApprovesFollowers": false,
        "discoverable": true,
        "publicKey": {
            "id": format!("{}/ap/actor.json#main-key", url),
            "owner": format!("{}/ap/actor.json", url),
            "publicKeyPem": pub_key_pem
        }
    });
    serde_json::to_string_pretty(&actor).unwrap_or_default()
}

/// Builds the WebFinger JRD document (.well-known/webfinger.json).
/// Subject uses acct:{handle}@{hostname} format for Mastodon discovery.
fn build_webfinger_json(identity: &ActorIdentity) -> String {
    // Extract hostname: strip scheme (https://) then take up to first '/'
    let after_scheme = identity
        .hosting_url
        .strip_prefix("https://")
        .unwrap_or(&identity.hosting_url);
    let hostname = after_scheme.split('/').next().unwrap_or(after_scheme);

    let url = &identity.hosting_url;
    let webfinger = serde_json::json!({
        "subject": format!("acct:{}@{}", identity.handle, hostname),
        "aliases": [
            format!("{}/ap/actor.json", url)
        ],
        "links": [
            {
                "rel": "self",
                "type": "application/activity+json",
                "href": format!("{}/ap/actor.json", url)
            }
        ]
    });
    serde_json::to_string_pretty(&webfinger).unwrap_or_default()
}

/// Builds the outbox.json OrderedCollection.
/// Empty collection — no curator_posts table exists yet.
fn build_outbox_json(identity: &ActorIdentity) -> String {
    let url = &identity.hosting_url;
    let outbox = serde_json::json!({
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "OrderedCollection",
        "id": format!("{}/ap/outbox.json", url),
        "totalItems": 0,
        "orderedItems": []
    });
    serde_json::to_string_pretty(&outbox).unwrap_or_default()
}

// ---------------------------------------------------------------------------
// Tauri command
// ---------------------------------------------------------------------------

/// Exports ActivityPub static files to a user-chosen directory.
///
/// Writes three files:
/// - `{output_dir}/ap/actor.json`      — ActivityPub Person document
/// - `{output_dir}/ap/outbox.json`     — Empty OrderedCollection
/// - `{output_dir}/.well-known/webfinger.json` — WebFinger JRD
///
/// RSA keypair is generated on first export and reused on all subsequent exports
/// (persisted in user_identity table). Mastodon caches actors by key ID — changing
/// the keypair would break federation for existing followers.
#[tauri::command]
pub async fn export_activitypub(
    output_dir: String,
    identity: ActorIdentity,
    state: tauri::State<'_, TasteDbState>,
) -> Result<ApExportResult, String> {
    // 1. Strip trailing slash from hosting_url
    let mut identity = identity;
    identity.hosting_url = identity.hosting_url.trim_end_matches('/').to_string();

    // 2. Validate hosting_url starts with https://
    if !identity.hosting_url.starts_with("https://") {
        return Err("Hosting URL must start with https://".to_string());
    }

    // 3. Get/generate RSA keypair via taste.db
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let (_, pub_key_pem) = ensure_rsa_keypair(&conn)?;
    drop(conn);

    // 4. Build JSON strings
    let actor_json = build_actor_json(&identity, &pub_key_pem);
    let webfinger_json = build_webfinger_json(&identity);
    let outbox_json = build_outbox_json(&identity);

    // 5. Create output directories
    let out = PathBuf::from(&output_dir);
    let ap_dir = out.join("ap");
    let wellknown_dir = out.join(".well-known");
    fs::create_dir_all(&ap_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&wellknown_dir).map_err(|e| e.to_string())?;

    // 6. Write files
    let actor_path = ap_dir.join("actor.json");
    let outbox_path = ap_dir.join("outbox.json");
    let webfinger_path = wellknown_dir.join("webfinger.json");
    fs::write(&actor_path, actor_json).map_err(|e| e.to_string())?;
    fs::write(&outbox_path, outbox_json).map_err(|e| e.to_string())?;
    fs::write(&webfinger_path, webfinger_json).map_err(|e| e.to_string())?;

    // 7. Return result
    Ok(ApExportResult {
        actor_path: actor_path.to_string_lossy().into_owned(),
        webfinger_path: webfinger_path.to_string_lossy().into_owned(),
        outbox_path: outbox_path.to_string_lossy().into_owned(),
        post_count: 0,
    })
}

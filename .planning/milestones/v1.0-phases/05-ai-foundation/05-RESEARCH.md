# Phase 5: AI Foundation - Research

**Researched:** 2026-02-17
**Domain:** Local-first AI inference, embeddings, recommendation engine, taste profiling
**Confidence:** MEDIUM (active ecosystem with many viable paths; model landscape evolving rapidly)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Natural Language Query UX
- Dedicated explore page — separate from the main search bar, not mixed into it
- One-shot query with free-text refinement: user types a query, gets results, then can type follow-up text to refine ("darker", "more electronic", "from the 90s")
- Results have a curated list feel — numbered, with descriptions, feels like a human wrote it. Not the same artist cards as regular search.
- Refinement is free text input below results (not suggested chips)

#### Recommendation Surface
- Woven into artist pages — not a separate "For You" section
- Sits alongside (enhances) the existing tag-based Related Artists discovery panel from Phase 4, as a separate section
- No explanation for why something was recommended — just show the artists, let the music speak
- Recommendations require listening history — they only appear once there's enough taste data. No cold-start recs from catalog alone.

#### Taste Profile
- Invisible engine with subtle hints — no dedicated "your taste" page, but the UI reflects taste (e.g. explore page surfaces genres the user gravitates toward)
- Fed by local library (scanned files) + explicit signals (saving/favoriting artists). Not passive browsing.
- Full user editing: tag management (add/remove/weight tags like "more ambient, less techno") AND artist anchors (pin specific artists as taste anchors)
- Both tag adjustments and artist anchors shape the same underlying profile

#### AI Backend Strategy
- Local-first, API optional: ships with a small open-source model that runs locally. Users CAN add an API key (OpenAI, Anthropic, etc.) for better results. Local is default.
- Opt-in: AI features are off by default. User enables them with a clear prompt ("Enable AI features — downloads ~500MB model")
- Target local model size: medium (~500MB-1GB) — small language model capable of generating summaries and handling NL queries

#### AI Content Transparency
- No "AI-generated" labels on summaries — if content is useful, the source method doesn't matter
- Standard loading states for AI operations — same spinner/skeleton as data loading, AI isn't treated as special
- Honest fallback: when AI can't produce a good result, show "Not enough data to generate this" rather than guessing wrong or showing nothing

### Claude's Discretion
- Exact model selection (which open model to use locally)
- Embedding strategy for artist similarity
- How taste profile is stored locally (schema, format)
- How API key configuration UI works
- Loading skeleton and progress designs
- How "subtle hints" of taste manifest in the UI

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Summary

This phase adds four AI capabilities to Mercury's desktop app: (1) natural-language exploration, (2) artist recommendations, (3) artist/genre summaries, and (4) taste profiling. The user has decided on a local-first approach with optional cloud API keys, opt-in activation with a ~500MB-1GB model download, and specific UX decisions for how each feature surfaces.

The recommended architecture uses **llama-server** (from llama.cpp) as a **Tauri sidecar process**, communicating via a local HTTP API. This approach cleanly separates AI inference from the main Tauri/Rust process, avoids C++ linking conflicts with existing Rust dependencies (rusqlite, lofty), and provides a battle-tested, OpenAI-compatible API for both completions and embeddings. For the text generation model, **Gemma 3 1B QAT Q4** (~500MB) is recommended as the default local model. For embeddings, **Qwen3-Embedding-0.6B GGUF** (~400MB Q5) is recommended, stored in a separate sqlite-vec-powered vector table for cosine similarity search. The taste profile is built as a weighted tag vector + artist anchor list stored in a new `taste.db` SQLite database alongside the existing `mercury.db` and `library.db`.

**Primary recommendation:** Use llama-server as a Tauri sidecar with Gemma 3 1B for text generation and Qwen3-Embedding-0.6B for embeddings, with sqlite-vec for vector similarity search. This keeps AI inference isolated, avoids Rust FFI complexity, and provides a clean HTTP API that both local and remote providers can satisfy.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| llama.cpp (llama-server) | Latest release (b5460+) | Local LLM inference server | Industry standard for local inference; OpenAI-compatible HTTP API; prebuilt binaries for Windows x86_64 |
| sqlite-vec | 0.1.6 | Vector similarity search in SQLite | Runs everywhere (including Rust via rusqlite); pure C, no deps; KNN via vec0 virtual tables |
| @tauri-apps/plugin-shell | 2.x | Sidecar process management | Official Tauri plugin for spawning/managing external binaries; stdout/stdin streaming |

### Models (Downloaded at Opt-in)
| Model | Size (Q4) | Purpose | Why This One |
|-------|-----------|---------|--------------|
| Gemma 3 1B IT QAT Q4_0 | ~500MB | Text generation (summaries, NL queries, recommendations) | Google's QAT preserves quality at 3x less memory; 1B is within target size; 140+ language support; strong instruction following |
| Qwen3-Embedding-0.6B GGUF Q5 | ~400MB | Text embeddings for artist/tag similarity | Purpose-built embedding model; 0.6B fits easily; MTEB competitive; supports flexible dimensions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zerocopy | latest | Zero-copy vector passing to sqlite-vec from Rust | When inserting/querying vectors in Rust |
| tauri-plugin-upload (or fetch API) | 2.x | Model file download with progress | During opt-in model download flow |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| llama-server sidecar | Rust native llama.cpp bindings (llama-cpp-2 crate) | Native bindings compile llama.cpp from source, risk linker conflicts with rusqlite/lofty, harder to update; sidecar is isolated and easier to maintain |
| llama-server sidecar | wllama (WebAssembly) | WASM runs in browser tab, limited to single-thread without special headers, slower than native; sidecar uses native CPU/SIMD |
| Gemma 3 1B | Qwen3-0.6B (~400MB Q4) | Smaller but noticeably less capable for generation tasks; Gemma 1B is the sweet spot for quality-within-budget |
| Gemma 3 1B | Phi-3 mini 3.8B (~2.3GB Q4) | Better quality but exceeds 1GB target; could be offered as "enhanced" download option |
| sqlite-vec | In-memory cosine similarity | No persistence, slow for large catalogs; sqlite-vec integrates with existing SQLite infrastructure |

**Installation:**

Rust (Cargo.toml additions):
```toml
sqlite-vec = "0.1"
zerocopy = { version = "0.8", features = ["derive"] }
tauri-plugin-shell = "2"
```

Frontend (package.json additions):
```bash
npm install @tauri-apps/plugin-shell
```

No npm package needed for llama-server — it's a standalone binary bundled as a sidecar.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── ai/                        # AI engine module (NEW)
│   │   ├── engine.ts              # AI provider interface (local/remote)
│   │   ├── local-provider.ts      # llama-server HTTP client
│   │   ├── remote-provider.ts     # OpenAI/Anthropic API client
│   │   ├── model-manager.ts       # Model download, status, lifecycle
│   │   ├── prompts.ts             # Prompt templates for each task
│   │   └── index.ts               # Barrel export
│   ├── taste/                     # Taste profile module (NEW)
│   │   ├── profile.svelte.ts      # Reactive taste state (tag weights + anchors)
│   │   ├── signals.ts             # Signal collection (library scan, favorites)
│   │   ├── embeddings.ts          # Embedding generation + vector ops
│   │   └── index.ts               # Barrel export
│   ├── components/
│   │   ├── AiRecommendations.svelte  # Artist page recs section
│   │   ├── AiSettings.svelte         # AI enable/disable + API key config
│   │   └── ExploreResult.svelte      # NL explore result card (numbered, with description)
│   └── ...
├── routes/
│   ├── explore/                   # NL explore page (NEW)
│   │   ├── +page.svelte
│   │   └── +page.ts
│   └── settings/                  # Settings page (NEW or extended)
│       ├── +page.svelte
│       └── +page.ts
src-tauri/
├── src/
│   ├── ai/                        # AI sidecar management (NEW)
│   │   ├── mod.rs                 # Tauri commands for AI lifecycle
│   │   ├── sidecar.rs             # llama-server process management
│   │   └── embeddings.rs          # Embedding storage/retrieval (sqlite-vec)
│   └── ...
├── binaries/                      # Sidecar binaries (NEW)
│   └── llama-server-x86_64-pc-windows-msvc.exe
```

### Pattern 1: AI Provider Interface
**What:** Abstract interface that both local (llama-server) and remote (OpenAI/Anthropic) providers implement, so all AI features work with either backend.
**When to use:** Every AI operation — summaries, NL queries, recommendations, embeddings.
**Example:**
```typescript
// src/lib/ai/engine.ts
export interface AiProvider {
    /** Generate text completion */
    complete(prompt: string, options?: CompletionOptions): Promise<string>;
    /** Generate text embeddings */
    embed(texts: string[]): Promise<number[][]>;
    /** Check if provider is available and ready */
    isReady(): Promise<boolean>;
}

export interface CompletionOptions {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
}

// The active provider — set at AI initialization
let activeProvider: AiProvider | null = null;

export function getAiProvider(): AiProvider | null {
    return activeProvider;
}
```

### Pattern 2: Sidecar Lifecycle Management
**What:** Start llama-server as a Tauri sidecar on demand, manage its lifecycle, and clean up on app exit.
**When to use:** When AI features are enabled and the local model is downloaded.
**Example:**
```typescript
// src/lib/ai/local-provider.ts
// llama-server runs on localhost:8847 (avoid conflicts with common ports)
const LLAMA_SERVER_PORT = 8847;
const LLAMA_SERVER_BASE = `http://127.0.0.1:${LLAMA_SERVER_PORT}`;

export class LocalAiProvider implements AiProvider {
    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
        const response = await fetch(`${LLAMA_SERVER_BASE}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: options?.systemPrompt ?? '' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: options?.maxTokens ?? 512,
                temperature: options?.temperature ?? 0.7
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    }

    async embed(texts: string[]): Promise<number[][]> {
        const response = await fetch(`${LLAMA_SERVER_BASE}/v1/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: texts,
                encoding_format: 'float'
            })
        });
        const data = await response.json();
        return data.data.map((d: { embedding: number[] }) => d.embedding);
    }

    async isReady(): Promise<boolean> {
        try {
            const res = await fetch(`${LLAMA_SERVER_BASE}/health`);
            return res.ok;
        } catch { return false; }
    }
}
```

### Pattern 3: Taste Profile as Weighted Tag Vector
**What:** Represent user taste as a sparse vector of tag weights, derived from library contents and explicit edits, stored in SQLite.
**When to use:** For recommendations and NL explore personalization.
**Example:**
```typescript
// src/lib/taste/profile.svelte.ts
export interface TasteProfile {
    /** Tag name → weight (0.0 to 1.0, can be negative for suppressed tags) */
    tagWeights: Map<string, number>;
    /** MBIDs of artist anchors the user pinned */
    artistAnchors: string[];
    /** When the profile was last recomputed */
    lastUpdated: number;
}

// Reactive state — persisted to taste.db
export const tasteState = $state<TasteProfile>({
    tagWeights: new Map(),
    artistAnchors: [],
    lastUpdated: 0
});
```

### Pattern 4: Remote Provider (API Key)
**What:** When user provides an API key, route AI operations through the remote API with the same interface.
**When to use:** When user opts for better-quality AI results via cloud API.
**Example:**
```typescript
// src/lib/ai/remote-provider.ts
export class RemoteAiProvider implements AiProvider {
    constructor(
        private apiKey: string,
        private baseUrl: string,  // OpenAI, Anthropic, etc.
        private model: string
    ) {}

    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: options?.systemPrompt ?? '' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: options?.maxTokens ?? 512,
                temperature: options?.temperature ?? 0.7
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // embed() follows same pattern with /v1/embeddings
}
```

### Anti-Patterns to Avoid
- **Compiling llama.cpp from source in the Tauri build:** This risks linker conflicts with rusqlite (both use C FFI) and massively increases build times. Use prebuilt llama-server binary as a sidecar instead.
- **Running AI inference on the main thread:** Even with a local server, network requests can block. Always use async/await and show loading states.
- **Embedding all 2.8M artists at once:** The embedding model processes text, and embedding every artist's tag set would take hours. Use lazy embedding — compute embeddings on-demand for artists the user interacts with, and pre-embed the user's library artists.
- **Storing embeddings in the main mercury.db:** Keep vector data separate to avoid bloating the shared discovery index. Use a dedicated taste.db or ai.db.
- **Hard-coding prompt templates:** Prompts will need iteration. Keep all prompt templates in a single `prompts.ts` file, not scattered across components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM inference | Custom GGUF loader or WASM runtime | llama-server (prebuilt binary) | Battle-tested, handles memory management, quantization, KV cache, SIMD optimization — thousands of edge cases |
| Vector similarity search | Manual cosine distance calculation loops | sqlite-vec extension | Handles indexing, KNN search, multiple vector formats, memory management |
| Model download with progress | Custom HTTP download + file writing | Tauri upload plugin or fetch + Tauri FS API with Channel progress | Handles partial downloads, resumption, progress reporting |
| Prompt engineering | Ad-hoc string concatenation | Structured prompt templates with typed parameters | Maintainability, testability, easy iteration |
| Token counting | Character-based length estimation | llama-server's /tokenize endpoint | Accurate tokenization prevents context window overflow |

**Key insight:** AI inference is extraordinarily complex at the systems level. llama.cpp represents millions of lines of optimized C/C++ handling quantization, KV caching, SIMD, memory mapping, and hardware-specific optimizations. Wrapping it via a clean HTTP API (the sidecar approach) gives us all of that without taking on any of that complexity.

## Common Pitfalls

### Pitfall 1: Model Loading Blocks the UI
**What goes wrong:** User enables AI, model loads for 10-30 seconds, UI freezes.
**Why it happens:** llama-server takes time to load the model into memory. If the frontend polls too aggressively or doesn't show progress, the user thinks the app crashed.
**How to avoid:** Start llama-server asynchronously via sidecar spawn. Poll the /health endpoint every 500ms. Show a clear loading state ("Loading AI model...") with a progress indication. Only mark AI as "ready" when /health returns 200.
**Warning signs:** No loading indicator during model initialization; synchronous sidecar spawn.

### Pitfall 2: llama-server Port Conflicts
**What goes wrong:** User has another local LLM app (Ollama, LM Studio) running on the same port.
**Why it happens:** Many tools default to port 8080. If Mercury also uses 8080, sidecar fails to start.
**How to avoid:** Use a non-standard port (e.g., 8847). On startup, check if the port is available before spawning. If taken, increment port or show a clear error. Store the active port in state.
**Warning signs:** Sidecar spawn succeeds but HTTP requests fail with connection refused.

### Pitfall 3: Orphaned Sidecar Process
**What goes wrong:** User force-quits Mercury, llama-server keeps running in background consuming RAM.
**Why it happens:** Tauri's sidecar management may not clean up on abnormal termination.
**How to avoid:** Register a cleanup handler in Tauri's `on_window_event` for `CloseRequested` and `Destroyed`. On app startup, check for and kill any orphaned llama-server processes. Use a PID file in the app data directory.
**Warning signs:** Task manager shows llama-server.exe running after Mercury is closed.

### Pitfall 4: Embedding Dimension Mismatch
**What goes wrong:** Switching between local embedding model and remote API produces different dimension vectors that can't be compared.
**Why it happens:** Different models produce different embedding dimensions (Qwen3-Embedding-0.6B produces 1024-dim, OpenAI text-embedding-3-small produces 1536-dim).
**How to avoid:** Store the model name/dimension alongside each embedding in sqlite-vec. When the embedding model changes, mark old embeddings as stale and re-embed on next access. Or: normalize to a fixed dimension using Matryoshka truncation (Qwen3-Embedding supports this).
**Warning signs:** Cosine similarity scores suddenly all near 0 or garbage after changing providers.

### Pitfall 5: Taste Profile Cold Start
**What goes wrong:** Recommendations section shows on artist pages before enough data exists, producing random or unhelpful results.
**Why it happens:** Insufficient listening history or library data to build a meaningful taste profile.
**How to avoid:** Define a minimum threshold (e.g., 20+ library tracks or 5+ favorited artists) before enabling recommendations. Show nothing rather than bad recommendations. The user decided: "Recommendations require listening history — they only appear once there's enough taste data."
**Warning signs:** Recommendations appear for users with no library or favorites.

### Pitfall 6: Context Window Overflow on NL Queries
**What goes wrong:** User's refinement chain gets too long, prompt exceeds model's context window, response quality degrades or errors.
**Why it happens:** Each refinement appends to the conversation history. Small models (1B) have limited context windows (4K-8K tokens).
**How to avoid:** Track token count of the conversation. When approaching the limit, summarize previous context into a shorter prompt and start fresh. Or limit to 3-5 refinement turns before suggesting "Start a new search."
**Warning signs:** Later refinements produce worse or incoherent results; model starts repeating itself.

### Pitfall 7: Sidecar Binary Missing on First Run
**What goes wrong:** AI features fail silently because llama-server binary isn't present — it's downloaded with the model, not bundled with the installer.
**Why it happens:** To keep installer small, the llama-server binary is downloaded during opt-in rather than bundled.
**How to avoid:** Two approaches: (A) Bundle llama-server with the installer (~5MB compressed, acceptable) and only download model files during opt-in. (B) Download both binary and model during opt-in, but this complicates the flow. **Recommendation: Bundle the binary, download only the model.** This is simpler and the binary is small.
**Warning signs:** /health endpoint returns connection refused even after "AI enabled" toggle.

## Code Examples

### Sidecar Configuration (tauri.conf.json)
```json
// Source: https://v2.tauri.app/develop/sidecar/
{
  "bundle": {
    "externalBin": [
      "binaries/llama-server"
    ]
  }
}
```
Binary must exist as `src-tauri/binaries/llama-server-x86_64-pc-windows-msvc.exe` (for Windows x86_64).

### Sidecar Spawn from Rust
```rust
// Source: https://v2.tauri.app/develop/sidecar/
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[tauri::command]
async fn start_ai_server(app: tauri::AppHandle) -> Result<(), String> {
    let model_path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models")
        .join("gemma-3-1b-it-qat-q4_0.gguf");

    let sidecar = app.shell()
        .sidecar("binaries/llama-server")
        .map_err(|e| e.to_string())?
        .args([
            "--model", &model_path.to_string_lossy(),
            "--port", "8847",
            "--ctx-size", "4096",
            "--threads", "4"
        ]);

    let (mut rx, _child) = sidecar.spawn()
        .map_err(|e| e.to_string())?;

    // Stream stdout events (for logging/debugging)
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[llama-server] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[llama-server] {}", String::from_utf8_lossy(&line));
                }
                _ => {}
            }
        }
    });

    Ok(())
}
```

### Sidecar Permissions (capabilities/default.json)
```json
// Source: https://v2.tauri.app/develop/sidecar/
{
  "permissions": [
    "shell:allow-spawn",
    {
      "identifier": "shell:allow-spawn",
      "allow": [
        {
          "name": "binaries/llama-server",
          "sidecar": true,
          "args": true
        }
      ]
    }
  ]
}
```

### sqlite-vec Registration with rusqlite
```rust
// Source: https://alexgarcia.xyz/sqlite-vec/rust.html
use rusqlite::ffi::sqlite3_auto_extension;
use sqlite_vec::sqlite3_vec_init;

// Register sqlite-vec before opening any connection
unsafe {
    sqlite3_auto_extension(Some(std::mem::transmute(sqlite3_vec_init as *const ())));
}

let db = rusqlite::Connection::open("taste.db")?;

// Create vector table for artist embeddings
db.execute_batch("
    CREATE VIRTUAL TABLE IF NOT EXISTS artist_embeddings USING vec0(
        artist_mbid TEXT PRIMARY KEY,
        embedding float[768]
    );
")?;

// Query nearest neighbors
let mut stmt = db.prepare("
    SELECT artist_mbid, distance
    FROM artist_embeddings
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT 20
")?;
```

### Taste Profile Schema (taste.db)
```sql
-- User's taste tag weights (sparse vector representation)
CREATE TABLE IF NOT EXISTS taste_tags (
    tag TEXT PRIMARY KEY,
    weight REAL NOT NULL DEFAULT 0.0,  -- -1.0 to 1.0
    source TEXT NOT NULL,               -- 'library', 'favorite', 'manual'
    updated_at INTEGER NOT NULL
);

-- Artist anchors the user pinned
CREATE TABLE IF NOT EXISTS taste_anchors (
    artist_mbid TEXT PRIMARY KEY,
    artist_name TEXT NOT NULL,
    pinned_at INTEGER NOT NULL
);

-- Favorited/saved artists
CREATE TABLE IF NOT EXISTS favorite_artists (
    artist_mbid TEXT PRIMARY KEY,
    artist_name TEXT NOT NULL,
    artist_slug TEXT NOT NULL,
    saved_at INTEGER NOT NULL
);

-- AI settings
CREATE TABLE IF NOT EXISTS ai_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Keys: 'enabled', 'provider' ('local'|'remote'), 'api_key', 'api_base_url',
--        'api_model', 'local_model_path', 'local_model_status' ('none'|'downloading'|'ready')
```

### Embedding Strategy for Artist Similarity
```typescript
// Generate a text description of an artist for embedding
function artistToEmbeddingText(artist: ArtistResult): string {
    const parts: string[] = [];
    parts.push(artist.name);
    if (artist.tags) {
        parts.push(`genres: ${artist.tags}`);
    }
    if (artist.country) {
        parts.push(`from ${artist.country}`);
    }
    return parts.join('. ');
}

// Compute taste vector from user's library + favorites
async function computeTasteEmbedding(
    provider: AiProvider,
    profile: TasteProfile
): Promise<number[]> {
    // Build a text description of the user's taste
    const tagDesc = Array.from(profile.tagWeights.entries())
        .filter(([_, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, weight]) => `${tag} (${(weight * 100).toFixed(0)}%)`)
        .join(', ');

    const tasteText = `Music taste: ${tagDesc}`;
    const embeddings = await provider.embed([tasteText]);
    return embeddings[0];
}
```

### Model Download Flow
```typescript
// src/lib/ai/model-manager.ts
const MODEL_URLS = {
    generation: {
        url: 'https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/resolve/main/gemma-3-1b-it-qat-q4_0.gguf',
        filename: 'gemma-3-1b-it-qat-q4_0.gguf',
        sizeBytes: 524_288_000,  // ~500MB
    },
    embedding: {
        url: 'https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/main/qwen3-embedding-0.6b-q5_k_m.gguf',
        filename: 'qwen3-embedding-0.6b-q5_k_m.gguf',
        sizeBytes: 440_000_000,  // ~440MB
    }
};

export async function downloadModel(
    modelKey: keyof typeof MODEL_URLS,
    onProgress: (downloaded: number, total: number) => void
): Promise<string> {
    const model = MODEL_URLS[modelKey];
    // Use Tauri invoke to download to app data directory
    // Rust side handles the actual HTTP download with progress Channel
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('download_model', {
        url: model.url,
        filename: model.filename,
        onProgress  // Tauri Channel for progress updates
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cloud-only AI (API calls) | Local-first with GGUF quantized models | 2024-2025 | Desktop apps can run capable LLMs locally on consumer hardware |
| TensorFlow.js / ONNX in browser | llama.cpp server or WASM (wllama) | 2024-2025 | GGUF format + llama.cpp is now the standard for local inference |
| Custom embedding pipelines | Dedicated embedding models (Qwen3-Embedding, nomic-embed) | 2025 | Purpose-built models outperform using LLMs for embeddings |
| PostgreSQL + pgvector for vector search | sqlite-vec for embedded/local | 2024 | No server needed; SQLite extension runs everywhere including Rust |
| Word2Vec / GloVe for music tag embeddings | Transformer-based text embedding models | 2023-2025 | Much better semantic understanding of genre/style relationships |
| Large models only (7B+) | Sub-2B models with QAT quantization | 2025 | Gemma 3 1B QAT achieves near-BF16 quality at 500MB |

**Deprecated/outdated:**
- **rustformers/llm:** Unmaintained Rust LLM ecosystem — do not use
- **sqlite-vss:** Predecessor to sqlite-vec, replaced; sqlite-vec is the current project
- **llama.cpp Python bindings (llama-cpp-python):** Not relevant for a Rust/TypeScript desktop app

## Open Questions

1. **Dual-model sidecar: one server or two?**
   - What we know: llama-server loads one model at a time. Gemma 3 1B (generation) and Qwen3-Embedding-0.6B (embeddings) are separate models.
   - What's unclear: Whether to run two llama-server instances on different ports, or swap models on demand (slower but uses less memory).
   - Recommendation: Start with **two instances** (port 8847 for generation, 8848 for embeddings). Total memory ~1.5GB. If memory is a concern, implement model swapping in v2 — embeddings are batchable and less latency-sensitive.

2. **Pre-computing embeddings for the full catalog (2.8M artists)**
   - What we know: Embedding all 2.8M artists would take days on consumer hardware and produce ~8GB of vector data.
   - What's unclear: Whether pre-computed embeddings should be distributed with the database or computed locally.
   - Recommendation: **Do not pre-compute.** Use lazy embedding: embed artists as the user encounters them. Cache embeddings in sqlite-vec. For recommendations, only compare against artists in the user's taste neighborhood (same tags). This keeps the vector database small and responsive.

3. **llama-server startup time on cold start**
   - What we know: Loading a 500MB model takes 5-15 seconds depending on hardware. The user expects AI features to "just work" after opt-in.
   - What's unclear: Whether to start llama-server at app launch (always warm) or on-demand (first AI request).
   - Recommendation: **Start at app launch if AI is enabled.** The memory cost (~500MB per model) is acceptable for desktop, and it eliminates first-request latency. Show a subtle "AI loading" indicator in the header during startup.

4. **How refinement works for NL explore**
   - What we know: User types a query, gets results, types follow-up like "darker". The model needs context from the previous query.
   - What's unclear: How much conversation context to maintain and how to structure the refinement prompt.
   - Recommendation: Keep a rolling conversation of max 5 exchanges. Structure each refinement as a system prompt with original query + results summary + refinement instruction. Reset context on new search.

5. **API key storage security**
   - What we know: Users may enter API keys for OpenAI/Anthropic. These are sensitive credentials.
   - What's unclear: Whether to use OS keychain (via Tauri plugin) or simple encrypted storage.
   - Recommendation: For v1, store encrypted in taste.db with a simple key derived from the app identifier. Upgrade to OS keychain in a future phase if demand warrants it. Never log or display the full key.

## Sources

### Primary (HIGH confidence)
- [Tauri 2.0 Sidecar Documentation](https://v2.tauri.app/develop/sidecar/) — Binary bundling, spawning, permissions
- [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp) — Server API, prebuilt binary releases
- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec) — Vector search extension, Rust integration
- [sqlite-vec Rust docs](https://alexgarcia.xyz/sqlite-vec/rust.html) — rusqlite registration pattern
- [Gemma 3 QAT GGUF](https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf) — Model card, size, capabilities
- [Qwen3-Embedding-0.6B GGUF](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF) — Embedding model card
- [Tauri plugin-shell reference](https://v2.tauri.app/reference/javascript/shell/) — Shell plugin API

### Secondary (MEDIUM confidence)
- [Building Local LM Desktop Applications with Tauri](https://medium.com/@dillon.desilva/building-local-lm-desktop-applications-with-tauri-f54c628b13d9) — Practical sidecar pattern for LLMs
- [A Technical Blueprint for Local-First AI with Rust and Tauri](https://medium.com/@Musbell008/a-technical-blueprint-for-local-first-ai-with-rust-and-tauri-b9211352bc0e) — Three-layer architecture pattern
- [llama.cpp server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) — HTTP API endpoint details
- [wllama GitHub](https://github.com/ngxson/wllama) — WASM alternative (evaluated, not recommended as primary)
- [BentoML: Best Open-Source SLMs 2026](https://www.bentoml.com/blog/the-best-open-source-small-language-models) — Model landscape overview
- [nomic-embed-text-v2-moe GGUF](https://huggingface.co/nomic-ai/nomic-embed-text-v2-moe-GGUF) — Alternative embedding model evaluated

### Tertiary (LOW confidence)
- [Spotify recommendation system overview](https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide) — Inspiration for taste profile concepts (cloud-based, different scale)
- [llama-cpp-2 crate](https://crates.io/crates/llama-cpp-2) — Rust native bindings evaluated but not recommended due to linking complexity

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH — llama-server sidecar pattern is well-documented and used in production by projects like Jan and LM Studio. sqlite-vec is pre-v1 but functional. Model selection may need adjustment as the landscape evolves.
- Architecture: MEDIUM — The provider interface pattern is solid and well-established. The dual-sidecar vs. model-swapping question needs empirical testing. Taste profile schema is a reasonable design but may need iteration based on actual usage.
- Pitfalls: HIGH — Common pitfalls are well-documented across Tauri sidecar, llama.cpp, and local AI communities. Process management and port conflicts are the most frequently reported issues.

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (30 days — model landscape changes frequently but architecture patterns are stable)

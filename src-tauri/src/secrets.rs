/// OS credential store access (Windows Credential Manager / macOS Keychain / Linux Secret Service).
/// Sensitive values (API keys, OAuth tokens) are stored here — never in taste.db.

const SERVICE: &str = "blacktape";

/// Retrieve a secret from the OS credential store.
/// Returns None if the key does not exist.
#[tauri::command]
pub fn get_secret(key: String) -> Result<Option<String>, String> {
    match keyring::Entry::new(SERVICE, &key) {
        Err(e) => Err(format!("Keyring error: {}", e)),
        Ok(entry) => match entry.get_password() {
            Ok(val) => Ok(Some(val)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(format!("Keyring read error: {}", e)),
        },
    }
}

/// Store a secret in the OS credential store.
#[tauri::command]
pub fn set_secret(key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE, &key).map_err(|e| format!("Keyring error: {}", e))?;
    entry
        .set_password(&value)
        .map_err(|e| format!("Keyring write error: {}", e))
}

/// Delete a secret from the OS credential store.
/// Succeeds even if the key does not exist.
#[tauri::command]
pub fn delete_secret(key: String) -> Result<(), String> {
    match keyring::Entry::new(SERVICE, &key) {
        Err(e) => Err(format!("Keyring error: {}", e)),
        Ok(entry) => match entry.delete_credential() {
            Ok(_) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(format!("Keyring delete error: {}", e)),
        },
    }
}

/// One-shot migration: moves plaintext secrets from taste.db into the OS keyring.
/// Runs on every startup — is a no-op once the rows are cleared.
pub fn migrate_plaintext_secrets(conn: &rusqlite::Connection) {
    let sensitive_keys: &[(&str, &str)] = &[
        ("api_key", "ai_api_key"),
        ("spotify_client_id", "spotify_client_id"),
        ("spotify_access_token", "spotify_access_token"),
        ("spotify_refresh_token", "spotify_refresh_token"),
    ];

    for (db_key, keyring_key) in sensitive_keys {
        let value: Option<String> = conn
            .query_row(
                "SELECT value FROM ai_settings WHERE key = ?1",
                rusqlite::params![db_key],
                |row| row.get(0),
            )
            .ok();

        if let Some(ref v) = value {
            if !v.is_empty() {
                // Move to keyring
                if let Ok(entry) = keyring::Entry::new(SERVICE, keyring_key) {
                    let _ = entry.set_password(v);
                }
                // Erase from DB
                let _ = conn.execute(
                    "DELETE FROM ai_settings WHERE key = ?1",
                    rusqlite::params![db_key],
                );
            }
        }
    }
}

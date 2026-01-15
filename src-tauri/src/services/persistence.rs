//! State persistence service using bincode serialization and zstd compression

use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use bincode;
use zstd;
use serde::{Serialize, Deserialize};
use crate::state::AppState;
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};

/// Default persistence file name
const STATE_FILE: &str = "pixel_client_state.bin";

/// Default compression level
const COMPRESSION_LEVEL: i32 = 3;

/// Auto-save interval (30 seconds)
const AUTO_SAVE_INTERVAL: Duration = Duration::from_secs(30);

/// Maximum backup count
const MAX_BACKUPS: u8 = 5;

/// Get the default state file path
fn get_state_file_path() -> Option<PathBuf> {
    // Use current directory for development
    // In production, use tauri::api::path::app_data_dir
    let path = PathBuf::from(STATE_FILE);
    Some(path)
}

/// Save state to file with compression
#[tauri::command]
pub fn save_state(state: &AppState) -> Result<(), String> {
    let path = get_state_file_path()
        .ok_or("Failed to get state file path".to_string())?;
    
    // Serialize state
    let serialized = bincode::serialize(state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;
    
    // Compress with zstd
    let compressed = zstd::encode_all(std::io::Cursor::new(serialized), COMPRESSION_LEVEL)
        .map_err(|e| format!("Failed to compress state: {}", e))?;
    
    // Write to file
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&path)
        .map_err(|e| format!("Failed to open state file: {}", e))?;
    
    file.write_all(&compressed)
        .map_err(|e| format!("Failed to write state file: {}", e))?;
    
    file.flush()
        .map_err(|e| format!("Failed to flush state file: {}", e))?;
    
    Ok(())
}

/// Load state from file with decompression
#[tauri::command]
pub fn load_state() -> Result<AppState, String> {
    let path = get_state_file_path()
        .ok_or("Failed to get state file path".to_string())?;
    
    if !path.exists() {
        return Ok(AppState::default());
    }
    
    // Read compressed data
    let mut file = File::open(&path)
        .map_err(|e| format!("Failed to open state file: {}", e))?;
    
    let mut compressed = Vec::new();
    file.read_to_end(&mut compressed)
        .map_err(|e| format!("Failed to read state file: {}", e))?;
    
    if compressed.is_empty() {
        return Ok(AppState::default());
    }
    
    // Decompress
    let decompressed = zstd::decode_all(std::io::Cursor::new(compressed))
        .map_err(|e| format!("Failed to decompress state: {}", e))?;
    
    // Deserialize
    let state = bincode::deserialize(&decompressed)
        .map_err(|e| format!("Failed to deserialize state: {}", e))?;
    
    Ok(state)
}

/// Create backup of current state
#[tauri::command]
pub fn create_backup() -> Result<(), String> {
    let state = load_state()?;
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let backup_name = format!("{}.{}.bak", STATE_FILE, timestamp);
    let backup_path = PathBuf::from(&backup_name);
    
    // Serialize state
    let serialized = bincode::serialize(&state)
        .map_err(|e| format!("Failed to serialize backup: {}", e))?;
    
    // Compress
    let compressed = zstd::encode_all(std::io::Cursor::new(serialized), COMPRESSION_LEVEL)
        .map_err(|e| format!("Failed to compress backup: {}", e))?;
    
    // Write backup
    let mut file = File::create(&backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    
    file.write_all(&compressed)
        .map_err(|e| format!("Failed to write backup: {}", e))?;
    
    // Clean old backups
    clean_old_backups()?;
    
    Ok(())
}

/// Clean old backup files
fn clean_old_backups() -> Result<(), String> {
    // This is a simplified version - in production, use glob or similar
    // For now, just return Ok
    Ok(())
}

/// Get state file size in bytes
#[tauri::command]
pub fn get_state_size() -> Result<u64, String> {
    let path = get_state_file_path()
        .ok_or("Failed to get state file path".to_string())?;
    
    if !path.exists() {
        return Ok(0);
    }
    
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get state file metadata: {}", e))?;
    
    Ok(metadata.len())
}

/// Export state to JSON format
#[tauri::command]
pub fn export_state_json() -> Result<String, String> {
    let state = load_state()?;
    let json = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize state to JSON: {}", e))?;
    Ok(json)
}

/// Import state from JSON format
#[tauri::command]
pub fn import_state_json(json: String) -> Result<(), String> {
    let state: AppState = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to deserialize state from JSON: {}", e))?;
    
    save_state(&state)?;
    Ok(())
}

/// Clear all state data
#[tauri::command]
pub fn clear_state() -> Result<(), String> {
    let path = get_state_file_path()
        .ok_or("Failed to get state file path".to_string())?;
    
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Failed to remove state file: {}", e))?;
    }
    
    Ok(())
}

/// Persistence service wrapper for auto-save
#[derive(Clone)]
pub struct PersistenceService {
    state: Arc<RwLock<AppState>>,
    last_save: Arc<RwLock<SystemTime>>,
    auto_save_enabled: Arc<RwLock<bool>>,
}

impl PersistenceService {
    pub fn new(state: Arc<RwLock<AppState>>) -> Self {
        Self {
            state,
            last_save: Arc::new(RwLock::new(SystemTime::UNIX_EPOCH)),
            auto_save_enabled: Arc::new(RwLock::new(true)),
        }
    }

    /// Check if auto-save is needed and perform save
    pub fn check_and_save(&self) -> Result<(), String> {
        let auto_save = *self.auto_save_enabled.read().map_err(|e| format!("Read lock error: {}", e))?;
        if !auto_save {
            return Ok(());
        }

        let last_save = *self.last_save.read().map_err(|e| format!("Read lock error: {}", e))?;
        let now = SystemTime::now();

        if now.duration_since(last_save).unwrap_or(Duration::ZERO) >= AUTO_SAVE_INTERVAL {
            let state = self.state.read().map_err(|e| format!("Read lock error: {}", e))?.clone();
            save_state(&state)?;
            *self.last_save.write().map_err(|e| format!("Write lock error: {}", e))? = now;
        }

        Ok(())
    }

    /// Enable or disable auto-save
    pub fn set_auto_save(&self, enabled: bool) {
        *self.auto_save_enabled.write().map_err(|_| "Write lock error".to_string()).unwrap_or_else(|_| {
            // If write fails, just ignore
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    #[test]
    fn test_save_and_load_state() {
        let temp_dir = TempDir::new().unwrap();
        let state_path = temp_dir.path().join(STATE_FILE);
        
        // Create test state
        let mut state = AppState::default();
        state.theme = "test_theme".to_string();
        state.language = "en".to_string();
        
        // Save
        let result = save_state_at_path(&state, &state_path);
        assert!(result.is_ok());
        
        // Load
        let loaded = load_state_at_path(&state_path).unwrap();
        assert_eq!(loaded.theme, "test_theme");
        assert_eq!(loaded.language, "en");
    }
    
    #[test]
    fn test_export_import_json() {
        let mut state = AppState::default();
        state.theme = "json_test".to_string();
        
        let json = export_state_to_json(&state).unwrap();
        let imported = import_state_from_json(&json).unwrap();
        
        assert_eq!(imported.theme, "json_test");
    }
}

// Helper functions for testing with custom paths
fn save_state_at_path(state: &AppState, path: &PathBuf) -> Result<(), String> {
    let serialized = bincode::serialize(state)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    let compressed = zstd::encode_all(std::io::Cursor::new(serialized), COMPRESSION_LEVEL)
        .map_err(|e| format!("Failed to compress: {}", e))?;
    let mut file = File::create(path).map_err(|e| format!("Failed to create: {}", e))?;
    file.write_all(&compressed).map_err(|e| format!("Failed to write: {}", e))?;
    Ok(())
}

fn load_state_at_path(path: &PathBuf) -> Result<AppState, String> {
    if !path.exists() {
        return Ok(AppState::default());
    }
    let mut file = File::open(path).map_err(|e| format!("Failed to open: {}", e))?;
    let mut compressed = Vec::new();
    file.read_to_end(&mut compressed).map_err(|e| format!("Failed to read: {}", e))?;
    if compressed.is_empty() {
        return Ok(AppState::default());
    }
    let decompressed = zstd::decode_all(std::io::Cursor::new(compressed))
        .map_err(|e| format!("Failed to decompress: {}", e))?;
    let state = bincode::deserialize(&decompressed)
        .map_err(|e| format!("Failed to deserialize: {}", e))?;
    Ok(state)
}

fn export_state_to_json(state: &AppState) -> Result<String, String> {
    serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize: {}", e))
}

fn import_state_from_json(json: &str) -> Result<AppState, String> {
    serde_json::from_str(json)
        .map_err(|e| format!("Failed to deserialize: {}", e))
}

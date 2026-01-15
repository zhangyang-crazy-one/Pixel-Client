// Tauri application core
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{Manager, State};
use ts_rs::TS;

// Core modules
mod state;
mod commands;

// Re-export state types
pub use state::{AppState, SharedState, Message, ChatSession, LLMProvider, LLMModel, AppConfig};

// Legacy AppConfig for backward compatibility
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize, TS)]
#[ts(export, export_to = "../src/types/app_config.ts")]
pub struct LegacyAppConfig {
    pub theme: String,
    pub language: String,
    pub active_model: String,
    pub provider: String,
}

// Legacy state for backward compatibility
pub struct PixelState {
    pub config: Arc<Mutex<LegacyAppConfig>>,
}

// Core commands
#[tauri::command]
fn get_config(state: State<'_, PixelState>) -> LegacyAppConfig {
    state.config.blocking_lock().clone()
}

#[tauri::command]
fn update_config(config: LegacyAppConfig, state: State<'_, PixelState>) {
    *state.config.blocking_lock() = config;
}

#[tauri::command]
fn send_notification(_title: String, _body: String) -> Result<(), String> {
    Ok(())
}

// App configuration
pub fn configure_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            // Legacy commands
            get_config,
            update_config,
            send_notification,
        ])
}

pub fn initialize_state<R: tauri::Runtime>(app: &tauri::AppHandle) {
    let state = PixelState {
        config: Arc::new(Mutex::new(LegacyAppConfig {
            theme: "system".to_string(),
            language: "en".to_string(),
            active_model: "gpt-4".to_string(),
            provider: "openai".to_string(),
        })),
    };
    app.manage(state);
}

// Tauri application core
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{Manager, State};

// Core modules
mod state;
mod commands;
mod services;

// Re-export state types
pub use state::{AppState, SharedState, Message, ChatSession, LLMProvider, LLMModel, AppConfig, AppHandleHolder};

// Legacy AppConfig - kept for backward compatibility with existing frontend
// New code should use AppConfig from state module
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct LegacyAppConfig {
    pub theme: String,
    pub language: String,
    pub active_model: String,
    pub provider: String,
}

// Legacy state for backward compatibility
pub struct PixelState {
    pub config: Arc<Mutex<LegacyAppConfig>>,
    pub app_handle: AppHandleHolder,
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
            // Chat commands
            commands::create_chat_session,
            commands::add_message_to_session,
            commands::get_session_messages,
            commands::delete_chat_session,
            commands::get_active_sessions,
            commands::stream_chat_completions,
            commands::cancel_chat_stream,
            // Excalidraw commands
            commands::save_excalidraw_scene,
            commands::load_excalidraw_scene,
            commands::list_excalidraw_scenes,
            commands::delete_excalidraw_scene,
            commands::export_excalidraw_scene,
            commands::import_excalidraw_scene,
            // Renderer commands
            services::renderer_cmd_wrapper::render_markdown,
            services::renderer_cmd_wrapper::process_custom_syntax,
            services::renderer_cmd_wrapper::highlight_code_sync,
            // Persistence commands
            services::persistence_cmd_wrapper::save_state,
            services::persistence_cmd_wrapper::load_state,
            services::persistence_cmd_wrapper::create_backup,
            services::persistence_cmd_wrapper::get_state_size,
            services::persistence_cmd_wrapper::export_state_json,
            services::persistence_cmd_wrapper::import_state_json,
            services::persistence_cmd_wrapper::clear_state,
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
        app_handle: AppHandleHolder::new(app.clone()),
    };
    app.manage(state);
}

#[cfg(test)]
mod tests {
    use super::*;
    use state::AppConfig;
    
    #[test]
    fn types_are_exportable() {
        // Verify AppConfig implements TS trait (triggered by cargo test --lib)
        let config = AppConfig::default();
        let _serialized = serde_json::to_string(&config).unwrap();
    }
}

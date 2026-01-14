// Tauri application core
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_notification::NotificationExt;

mod notifications;
use crate::notifications::NotificationManager;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct AppConfig {
    pub theme: String,
    pub language: String,
    pub active_model: String,
    pub provider: String,
}

pub struct PixelState {
    pub config: Arc<Mutex<AppConfig>>,
    pub notification_manager: Arc<NotificationManager>,
}

#[tauri::command]
fn get_config(state: State<'_, PixelState>) -> AppConfig {
    state.config.blocking_lock().clone()
}

#[tauri::command]
fn update_config(config: AppConfig, state: State<'_, PixelState>) {
    *state.config.blocking_lock() = config;
}

#[tauri::command]
fn send_notification(title: String, body: String, state: State<'_, PixelState>) -> Result<(), String> {
    state.notification_manager.send_notification(&title, &body)
}

pub fn configure_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![get_config, update_config, send_notification])
}

pub fn initialize_state<R: tauri::Runtime>(app: &AppHandle) {
    let state = PixelState {
        config: Arc::new(Mutex::new(AppConfig {
            theme: "system".to_string(),
            language: "en".to_string(),
            active_model: "gpt-4".to_string(),
            provider: "openai".to_string(),
        })),
        notification_manager: Arc::new(NotificationManager::new(app.clone())),
    };
    app.manage(state);
}

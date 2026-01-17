// Persistence command wrappers for Tauri
// These wrappers re-export the persistence functions as Tauri commands

use crate::state::AppState;
use crate::services::persistence::{
    save_state as save_state_impl,
    load_state as load_state_impl,
    create_backup as create_backup_impl,
    get_state_size as get_state_size_impl,
    export_state_json as export_state_json_impl,
    import_state_json as import_state_json_impl,
    clear_state as clear_state_impl,
};

#[tauri::command]
pub fn save_state(state: AppState) -> Result<(), String> {
    save_state_impl(&state)
}

#[tauri::command]
pub fn load_state() -> Result<AppState, String> {
    load_state_impl()
}

#[tauri::command]
pub fn create_backup() -> Result<(), String> {
    create_backup_impl()
}

#[tauri::command]
pub fn get_state_size() -> Result<u64, String> {
    get_state_size_impl()
}

#[tauri::command]
pub fn export_state_json() -> Result<String, String> {
    export_state_json_impl()
}

#[tauri::command]
pub fn import_state_json(json: String) -> Result<(), String> {
    import_state_json_impl(json)
}

#[tauri::command]
pub fn clear_state() -> Result<(), String> {
    clear_state_impl()
}

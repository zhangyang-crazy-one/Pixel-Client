#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

mod state;
mod commands;
mod services;

#[tauri::command]
async fn close_splashscreen(window: tauri::Window) {
    if let Some(splashscreen) = window.get_by_label("splashscreen") {
        splashscreen.close().unwrap();
    }
    window.get_by_label("main").as_ref().unwrap().show().unwrap();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::chat::create_chat_session,
            commands::chat::add_message_to_session,
            commands::chat::get_session_messages,
            commands::chat::delete_chat_session,
            commands::chat::get_active_sessions,
            commands::chat::stream_chat_completions,
            commands::chat::cancel_chat_stream,
            commands::excalidraw::save_excalidraw_scene,
            commands::excalidraw::load_excalidraw_scene,
            commands::excalidraw::list_excalidraw_scenes,
            commands::excalidraw::delete_excalidraw_scene,
            commands::excalidraw::export_excalidraw_scene,
            commands::excalidraw::import_excalidraw_scene,
            services::renderer_cmd_wrapper::render_markdown,
            services::renderer_cmd_wrapper::process_custom_syntax,
            services::renderer_cmd_wrapper::highlight_code_sync,
            services::persistence_cmd_wrapper::save_state,
            services::persistence_cmd_wrapper::load_state,
            services::persistence_cmd_wrapper::create_backup,
            services::persistence_cmd_wrapper::get_state_size,
            services::persistence_cmd_wrapper::export_state_json,
            services::persistence_cmd_wrapper::import_state_json,
            services::persistence_cmd_wrapper::clear_state,
            close_splashscreen,
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_title("Pixel-Client");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

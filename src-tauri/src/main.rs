#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

mod state;
mod commands;
mod services;

use state::{PixelState, AppHandleHolder, LegacyAppConfig, SharedState, McpServerManager};
use std::sync::Arc;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::create_chat_session,
            commands::add_message_to_session,
            commands::get_session_messages,
            commands::delete_chat_session,
            commands::get_active_sessions,
            commands::stream_chat_completions,
            commands::cancel_chat_stream,
            commands::enable_deep_thinking,
            commands::get_deep_thinking_status,
            commands::parse_reasoning_content_cmd,
            commands::stream_chat_completions_with_thinking,
            commands::get_providers,
            commands::get_provider,
            commands::create_provider,
            commands::update_provider,
            commands::delete_provider,
            commands::set_default_provider,
            commands::validate_provider,
            commands::get_models,
            commands::get_model,
            commands::create_model,
            commands::update_model,
            commands::delete_model,
            commands::set_default_model,
            commands::get_default_model_config,
            commands::get_session,
            commands::update_session,
            commands::search_sessions,
            commands::clear_session_history,
            commands::duplicate_session,
            commands::get_mcp_servers,
            commands::get_mcp_server,
            commands::create_mcp_server,
            commands::update_mcp_server,
            commands::delete_mcp_server,
            commands::start_mcp_server,
            commands::stop_mcp_server,
            commands::get_mcp_server_tools,
            commands::test_mcp_server_connection,
            commands::call_mcp_tool,
            commands::get_skills,
            commands::get_skill,
            commands::create_skill,
            commands::update_skill,
            commands::delete_skill,
            commands::execute_skill,
            commands::get_skill_categories,
            commands::toggle_skill,
            commands::import_skill,
            commands::export_skill,
            commands::get_skills_by_category,
            commands::search_skills,
            commands::save_excalidraw_scene,
            commands::load_excalidraw_scene,
            commands::list_excalidraw_scenes,
            commands::delete_excalidraw_scene,
            commands::export_excalidraw_scene,
            commands::import_excalidraw_scene,
            commands::save_excalidraw_image,
            commands::save_excalidraw_image_raw,
            commands::list_excalidraw_exports,
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
        ])
        .setup(|app| {
            // Initialize state
            let pixel_state = PixelState {
                config: Arc::new(tokio::sync::Mutex::new(LegacyAppConfig::default())),
                app_handle: AppHandleHolder::new(app.handle().clone()),
            };
            app.manage(pixel_state);
            app.manage(SharedState::new());
            app.manage(McpServerManager::default());

            // Setup main window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Pixel-Client");
            }

            // Create tray menu items
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Load tray icon from embedded bytes (compile-time inclusion)
            let icon_bytes = include_bytes!("../icons/32x32.png");
            let icon = Image::from_bytes(icon_bytes)
                .unwrap_or_else(|_| app.default_window_icon().cloned().unwrap());

            // Create system tray
            let _tray = TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("PixelVerse")
                .show_menu_on_left_click(false)  // Left click shows window, right click shows menu
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Left click on tray icon: show/focus window
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Intercept close request: hide to tray instead of closing
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

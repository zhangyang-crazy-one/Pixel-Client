// Service module for Pixel-Client Tauri backend
// Re-exports renderer and persistence services as Tauri commands

pub mod renderer;
pub mod persistence;

// Re-export renderer commands with proper Tauri command wrappers
pub mod renderer_cmd_wrapper;
#[allow(unused_imports)]
pub use renderer_cmd_wrapper::{render_markdown, process_custom_syntax, highlight_code_sync};

// Re-export persistence commands with proper Tauri command wrappers
pub mod persistence_cmd_wrapper;
#[allow(unused_imports)]
pub use persistence_cmd_wrapper::{save_state, load_state, create_backup, get_state_size, export_state_json, import_state_json, clear_state};

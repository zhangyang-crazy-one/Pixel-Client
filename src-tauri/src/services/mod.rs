// Service modules for Pixel-Client Tauri backend

pub mod renderer;
pub mod persistence;

pub use renderer::{render_markdown, process_custom_syntax, highlight_code_sync};
pub use persistence::{save_state, load_state, create_backup, get_state_size, export_state_json, import_state_json, clear_state};

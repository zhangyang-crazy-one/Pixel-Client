// Renderer command wrappers for Tauri
// These wrappers re-export the renderer functions as Tauri commands

use crate::services::renderer::{render_markdown as render_markdown_impl, process_custom_syntax as process_custom_syntax_impl, highlight_code_sync as highlight_code_sync_impl};

#[tauri::command]
pub fn render_markdown(markdown_input: String) -> Result<String, String> {
    render_markdown_impl(markdown_input)
}

#[tauri::command]
pub fn process_custom_syntax(markdown_input: String) -> Result<String, String> {
    process_custom_syntax_impl(markdown_input)
}

#[tauri::command]
pub fn highlight_code_sync(code: String, language: String) -> Result<String, String> {
    highlight_code_sync_impl(code, language)
}

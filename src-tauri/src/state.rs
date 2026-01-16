//! State management module for Pixel-Client
//! Provides thread-safe global state with persistence support

use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use chrono::Utc;
use ts_rs::TS;

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "app_config.ts")]
pub struct AppConfig {
    pub theme: String,
    pub language: String,
    pub font_size: u16,
    pub auto_save: bool,
    pub notifications: bool,
    pub active_model_id: Option<String>,
    pub active_provider_id: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            language: "zh".to_string(),
            font_size: 16,
            auto_save: true,
            notifications: true,
            active_model_id: None,
            active_provider_id: None,
        }
    }
}

/// Chat message structure
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: u64,
    pub model_id: Option<String>,
    pub attachments: Vec<String>,
    pub images: Vec<String>,
}

impl Message {
    pub fn new(id: String, role: String, content: String) -> Self {
        Self {
            id,
            role,
            content,
            timestamp: Utc::now().timestamp_millis() as u64,
            model_id: None,
            attachments: Vec::new(),
            images: Vec::new(),
        }
    }
}

/// Chat session/conversation
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub messages: Vec<Message>,
    pub created_at: u64,
    pub updated_at: u64,
    pub model_id: Option<String>,
}

impl ChatSession {
    pub fn new(id: String, title: String) -> Self {
        let now = Utc::now().timestamp_millis() as u64;
        Self {
            id,
            title,
            messages: Vec::new(),
            created_at: now,
            updated_at: now,
            model_id: None,
        }
    }
}

/// LLM Provider configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LLMProvider {
    pub id: String,
    pub name: String,
    pub provider_type: String,
    pub base_url: String,
    pub api_key: String,
    pub enabled: bool,
}

/// LLM Model configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LLMModel {
    pub id: String,
    pub provider_id: String,
    pub name: String,
    pub model_id: String,
    pub model_type: String,
    pub context_length: Option<usize>,
    pub max_tokens: Option<usize>,
    pub temperature: Option<f32>,
    pub dimensions: Option<usize>,
    pub is_default: bool,
}

/// MCP Server configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct McpServer {
    pub id: String,
    pub server_type: String,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
}

/// MCP Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: Option<serde_json::Value>,
}

/// ACE Agent configuration
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AceConfig {
    pub fast_model_id: String,
    pub reflector_model_id: String,
    pub curator_model_id: String,
}

impl Default for AceConfig {
    fn default() -> Self {
        Self {
            fast_model_id: String::new(),
            reflector_model_id: String::new(),
            curator_model_id: String::new(),
        }
    }
}

/// Main application state
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AppState {
    pub config: AppConfig,
    pub sessions: HashMap<String, ChatSession>,
    pub current_session_id: Option<String>,
    pub providers: Vec<LLMProvider>,
    pub models: Vec<LLMModel>,
    pub mcp_servers: Vec<McpServer>,
    pub ace_config: AceConfig,
    pub theme: String,
    pub language: String,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            config: AppConfig::default(),
            sessions: HashMap::new(),
            current_session_id: None,
            providers: Vec::new(),
            models: Vec::new(),
            mcp_servers: Vec::new(),
            ace_config: AceConfig::default(),
            theme: "dark".to_string(),
            language: "zh".to_string(),
        }
    }
}

/// Thread-safe shared state wrapper
#[derive(Clone, Default)]
pub struct SharedState {
    pub inner: Arc<RwLock<AppState>>,
}

/// Holder for AppHandle to enable file operations in commands
#[derive(Clone)]
pub struct AppHandleHolder(pub Arc<std::sync::Mutex<tauri::AppHandle>>);

impl AppHandleHolder {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self(Arc::new(std::sync::Mutex::new(app_handle)))
    }

    pub fn get(&self) -> tauri::AppHandle {
        self.0.lock().expect("Failed to lock AppHandle").clone()
    }
}

impl SharedState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(AppState::default())),
        }
    }

    pub fn read<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&AppState) -> R,
    {
        let state = self.inner.read().expect("Failed to acquire read lock");
        f(&state)
    }

    pub fn write<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&mut AppState) -> R,
    {
        let mut state = self.inner.write().expect("Failed to acquire write lock");
        f(&mut state)
    }

    pub fn update<F>(&self, f: F)
    where
        F: FnOnce(&mut AppState),
    {
        let mut state = self.inner.write().expect("Failed to acquire write lock");
        f(&mut state);
    }
}

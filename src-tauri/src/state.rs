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

/// Chat message structure with reasoning support
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
    pub reasoning_content: Option<String>,
    pub reasoning_blocks: Vec<ReasoningBlock>,
    pub token_usage: Option<usize>,
    pub is_deep_thinking: bool,
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
            reasoning_content: None,
            reasoning_blocks: Vec::new(),
            token_usage: None,
            is_deep_thinking: false,
        }
    }
}

/// Chat session/conversation with Deep Thinking support
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub messages: Vec<Message>,
    pub created_at: u64,
    pub updated_at: u64,
    pub model_id: Option<String>,
    pub deep_thinking_config: DeepThinkingConfig,
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
            deep_thinking_config: DeepThinkingConfig::default(),
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
pub struct McpToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

/// Running MCP Server instance (not Clone-able due to Child process)
pub struct RunningMcpServer {
    pub server_id: String,
    pub process: std::process::Child,
    pub stdin: std::sync::Mutex<std::process::ChildStdin>,
    pub stdout: std::sync::Mutex<std::process::ChildStdout>,
}

/// MCP Server status for frontend (tools as JSON to avoid TS constraint)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "tools")]
pub enum McpServerStatusInfo {
    Running { server_id: String, tools: serde_json::Value },
    Stopped { server_id: String },
    Error { server_id: String, error: String },
}

/// Active MCP servers (running processes)
#[derive(Default)]
pub struct McpServerManager {
    pub servers: Arc<RwLock<HashMap<String, RunningMcpServer>>>,
}

/// Thinking depth levels for Deep Thinking mode (kept for compatibility, not used)
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS, Default)]
#[ts(export)]
pub enum ThinkingDepth {
    #[default]
    Surface,    // 浅层思考 - 标准回复
    Moderate,   // 中等思考 - 扩展推理
    Deep,       // 深度思考 - 详细步骤分析
}

/// Deep Thinking configuration per session (kept for compatibility, not used)
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DeepThinkingConfig {
    pub enabled: bool,
    pub max_tokens: usize,
    pub temperature: f32,
    pub show_reasoning: bool,
    pub token_usage: usize,
    pub started_at: Option<u64>,
}

impl Default for DeepThinkingConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            max_tokens: 8192,
            temperature: 0.7,
            show_reasoning: true,
            token_usage: 0,
            started_at: None,
        }
    }
}

/// Deep Thinking session status (kept for compatibility, not used)
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DeepThinkingStatus {
    pub enabled: bool,
    pub config: DeepThinkingConfig,
    pub token_usage: usize,
    pub steps_completed: usize,
    pub current_step: Option<String>,
}

/// Reasoning block extracted from LLM response
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ReasoningBlock {
    pub step: usize,
    pub content: String,
    pub confidence: f32,
    pub timestamp: Option<u64>,
}

/// Parsed reasoning content (kept for compatibility, not used)
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ParsedReasoning {
    pub original_content: String,
    pub reasoning_blocks: Vec<ReasoningBlock>,
    pub total_steps: usize,
    pub total_duration_ms: u64,
}

/// Message with reasoning support
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ReasoningMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub reasoning_content: Option<String>,
    pub reasoning_blocks: Vec<ReasoningBlock>,
    pub timestamp: u64,
    pub model_id: Option<String>,
    pub token_usage: Option<usize>,
}

impl ReasoningMessage {
    /// Create a new ReasoningMessage from scratch
    #[allow(dead_code)]
    pub fn new(id: String, role: String, content: String) -> Self {
        Self {
            id,
            role,
            content,
            reasoning_content: None,
            reasoning_blocks: Vec::new(),
            timestamp: Utc::now().timestamp_millis() as u64,
            model_id: None,
            token_usage: None,
        }
    }

    /// Check if this message has reasoning content
    #[allow(dead_code)]
    pub fn has_reasoning(&self) -> bool {
        self.reasoning_content.is_some() || !self.reasoning_blocks.is_empty()
    }
}

impl From<Message> for ReasoningMessage {
    fn from(msg: Message) -> Self {
        Self {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            reasoning_content: msg.reasoning_content,
            reasoning_blocks: msg.reasoning_blocks,
            timestamp: msg.timestamp,
            model_id: msg.model_id,
            token_usage: msg.token_usage,
        }
    }
}

impl From<&Message> for ReasoningMessage {
    fn from(msg: &Message) -> Self {
        Self {
            id: msg.id.clone(),
            role: msg.role.clone(),
            content: msg.content.clone(),
            reasoning_content: msg.reasoning_content.clone(),
            reasoning_blocks: msg.reasoning_blocks.clone(),
            timestamp: msg.timestamp,
            model_id: msg.model_id.clone(),
            token_usage: msg.token_usage,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct McpTool {
    pub name: String,
    pub description: String,
    pub input_schema: Option<serde_json::Value>,
}

/// ACE Agent configuration (kept for compatibility, not used)
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, TS, Default)]
#[ts(export)]
pub struct AceConfig {
    pub fast_model_id: String,
    pub reflector_model_id: String,
    pub curator_model_id: String,
}

/// Skill parameter definition (default as string to avoid TS constraint)
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(tag = "type")]
pub enum SkillParameterType {
    #[default]
    String,
    Number,
    Boolean,
    Array,
    Object,
}

impl SkillParameterType {
    /// Parse from string for backward compatibility
    #[allow(dead_code)]
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "string" => Self::String,
            "number" => Self::Number,
            "boolean" => Self::Boolean,
            "array" => Self::Array,
            "object" => Self::Object,
            _ => Self::String, // Default to string
        }
    }

    /// Convert to string for serialization
    #[allow(dead_code)]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::String => "string",
            Self::Number => "number",
            Self::Boolean => "boolean",
            Self::Array => "array",
            Self::Object => "object",
        }
    }
}

/// Skill parameter definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillParameter {
    pub name: String,
    #[serde(rename = "type")]
    pub param_type: SkillParameterType,
    pub description: String,
    pub required: bool,
    pub default: Option<String>,
}

/// Skill definition (parameters without TS export)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub parameters: Vec<SkillParameter>,
    pub code: String,
    pub enabled: bool,
    pub created_at: u64,
    pub updated_at: u64,
}

impl Default for Skill {
    fn default() -> Self {
        let now = chrono::Utc::now().timestamp_millis() as u64;
        Self {
            id: String::new(),
            name: String::new(),
            description: String::new(),
            category: String::new(),
            parameters: Vec::new(),
            code: String::new(),
            enabled: true,
            created_at: now,
            updated_at: now,
        }
    }
}

/// Main application state (TS derive removed due to complex nested types)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub config: AppConfig,
    pub sessions: HashMap<String, ChatSession>,
    pub current_session_id: Option<String>,
    pub providers: Vec<LLMProvider>,
    pub models: Vec<LLMModel>,
    pub mcp_servers: Vec<McpServer>,
    pub skills: Vec<Skill>,
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
            skills: Vec::new(),
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

/// Legacy config for backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegacyAppConfig {
    pub theme: String,
    pub language: String,
    pub active_model: String,
    pub provider: String,
}

impl Default for LegacyAppConfig {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "en".to_string(),
            active_model: "gpt-4".to_string(),
            provider: "openai".to_string(),
        }
    }
}

/// Main state wrapper used by Tauri commands
#[allow(dead_code)]
pub struct PixelState {
    pub config: Arc<tokio::sync::Mutex<LegacyAppConfig>>,
    pub app_handle: AppHandleHolder,
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

    #[allow(dead_code)]
    pub fn update<F>(&self, f: F)
    where
        F: FnOnce(&mut AppState),
    {
        let mut state = self.inner.write().expect("Failed to acquire write lock");
        f(&mut state);
    }
}

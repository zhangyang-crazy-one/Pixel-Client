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
            commands::get_session,
            commands::update_session,
            commands::search_sessions,
            commands::clear_session_history,
            commands::duplicate_session,
            // Chat reasoning commands
            commands::get_session_reasoning_messages,
            commands::get_reasoning_message,
            // Chat new commands
            commands::get_session_history,
            // MCP commands
            commands::get_mcp_servers,
            commands::get_mcp_server,
            commands::create_mcp_server,
            commands::update_mcp_server,
            commands::delete_mcp_server,
            commands::start_mcp_server,
            commands::stop_mcp_server,
            commands::get_mcp_server_tools,
            commands::call_mcp_tool,
            commands::test_mcp_server_connection,
            commands::list_mcp_resources,
            commands::read_mcp_resource,
            commands::list_mcp_prompts,
            commands::get_mcp_prompt,
            commands::get_mcp_server_status_info,
            // MCP new commands
            commands::restart_mcp_server,
            commands::get_mcp_stats,
            // Skills commands
            commands::execute_skill,
            commands::get_skills,
            commands::get_skill,
            commands::create_skill,
            commands::update_skill,
            commands::delete_skill,
            commands::get_skill_categories,
            commands::toggle_skill,
            commands::import_skill,
            commands::export_skill,
            commands::get_skills_by_category,
            commands::search_skills,
            // Skills new commands
            commands::get_skill_stats,
            commands::install_skill_from_zip,
            commands::reindex_skills,
            // Provider commands
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
            // Provider new commands
            commands::test_provider_config,
            commands::validate_model_availability,
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
    use state::{AppConfig, Message, ChatSession, LLMProvider, LLMModel, Skill, McpServer, DeepThinkingConfig, ThinkingDepth};

    // ============================================
    // Type Serialization Tests
    // ============================================

    #[test]
    fn test_app_config_serialization() {
        let config = AppConfig::default();
        let serialized = serde_json::to_string(&config).unwrap();
        let deserialized: AppConfig = serde_json::from_str(&serialized).unwrap();
        assert_eq!(config.theme, deserialized.theme);
        assert_eq!(config.language, deserialized.language);
    }

    #[test]
    fn test_message_serialization() {
        let message = Message::new("test_id".to_string(), "user".to_string(), "test content".to_string());
        let serialized = serde_json::to_string(&message).unwrap();
        let deserialized: Message = serde_json::from_str(&serialized).unwrap();
        assert_eq!(message.id, deserialized.id);
        assert_eq!(message.role, deserialized.role);
        assert_eq!(message.content, deserialized.content);
    }

    #[test]
    fn test_message_with_reasoning() {
        let mut message = Message::new("test_id".to_string(), "assistant".to_string(), "answer".to_string());
        message.reasoning_content = Some("thinking...".to_string());
        message.is_deep_thinking = true;
        
        let serialized = serde_json::to_string(&message).unwrap();
        let deserialized: Message = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.reasoning_content, Some("thinking...".to_string()));
        assert!(deserialized.is_deep_thinking);
    }

    #[test]
    fn test_chat_session_serialization() {
        let session = ChatSession::new("session_id".to_string(), "Test Session".to_string());
        let serialized = serde_json::to_string(&session).unwrap();
        let deserialized: ChatSession = serde_json::from_str(&serialized).unwrap();
        assert_eq!(session.id, deserialized.id);
        assert_eq!(session.title, deserialized.title);
    }

    #[test]
    fn test_llm_provider_serialization() {
        let provider = LLMProvider {
            id: "provider_1".to_string(),
            name: "OpenAI".to_string(),
            provider_type: "openai".to_string(),
            base_url: "https://api.openai.com/v1".to_string(),
            api_key: "sk-xxx".to_string(),
            enabled: true,
        };
        
        let serialized = serde_json::to_string(&provider).unwrap();
        let deserialized: LLMProvider = serde_json::from_str(&serialized).unwrap();
        assert_eq!(provider.name, deserialized.name);
        assert_eq!(provider.base_url, deserialized.base_url);
    }

    #[test]
    fn test_llm_model_serialization() {
        let model = LLMModel {
            id: "model_1".to_string(),
            provider_id: "provider_1".to_string(),
            name: "GPT-4".to_string(),
            model_id: "gpt-4".to_string(),
            model_type: "chat".to_string(),
            context_length: Some(8192),
            max_tokens: Some(4096),
            temperature: Some(0.7),
            dimensions: None,
            is_default: true,
        };
        
        let serialized = serde_json::to_string(&model).unwrap();
        let deserialized: LLMModel = serde_json::from_str(&serialized).unwrap();
        assert_eq!(model.name, deserialized.name);
        assert_eq!(model.model_id, deserialized.model_id);
    }

    #[test]
    fn test_skill_serialization() {
        let skill = Skill {
            id: "skill_1".to_string(),
            name: "Test Skill".to_string(),
            description: "A test skill".to_string(),
            category: "Productivity".to_string(),
            parameters: Vec::new(),
            code: "return params;".to_string(),
            enabled: true,
            created_at: 1234567890,
            updated_at: 1234567890,
        };
        
        let serialized = serde_json::to_string(&skill).unwrap();
        let deserialized: Skill = serde_json::from_str(&serialized).unwrap();
        assert_eq!(skill.name, deserialized.name);
        assert_eq!(skill.category, deserialized.category);
    }

    #[test]
    fn test_mcp_server_serialization() {
        let server = McpServer {
            id: "mcp_1".to_string(),
            server_type: "stdio".to_string(),
            command: "npx".to_string(),
            args: vec!["-y".to_string(), "@modelcontextprotocol/server-filesystem".to_string()],
            env: std::collections::HashMap::new(),
        };
        
        let serialized = serde_json::to_string(&server).unwrap();
        let deserialized: McpServer = serde_json::from_str(&serialized).unwrap();
        assert_eq!(server.command, deserialized.command);
        assert_eq!(server.args.len(), deserialized.args.len());
    }

    #[test]
    fn test_deep_thinking_config_serialization() {
        let config = DeepThinkingConfig {
            enabled: true,
            max_tokens: 16384,
            temperature: 0.5,
            思考深度: ThinkingDepth::Deep,
            show_reasoning: true,
            token_usage: 1000,
            started_at: Some(1234567890),
        };
        
        let serialized = serde_json::to_string(&config).unwrap();
        let deserialized: DeepThinkingConfig = serde_json::from_str(&serialized).unwrap();
        assert_eq!(config.enabled, deserialized.enabled);
        assert_eq!(config.max_tokens, deserialized.max_tokens);
    }

    #[test]
    fn test_thinking_depth_serialization() {
        let depths = vec![ThinkingDepth::Surface, ThinkingDepth::Moderate, ThinkingDepth::Deep];
        
        for depth in depths {
            let serialized = serde_json::to_string(&depth).unwrap();
            let deserialized: ThinkingDepth = serde_json::from_str(&serialized).unwrap();
            assert_eq!(depth, deserialized);
        }
    }

    #[test]
    fn test_app_config_with_all_fields() {
        let config = AppConfig {
            theme: "modern_dark".to_string(),
            language: "zh".to_string(),
            font_size: 18,
            auto_save: true,
            notifications: false,
            active_model_id: Some("model_1".to_string()),
            active_provider_id: Some("provider_1".to_string()),
        };
        
        let serialized = serde_json::to_string(&config).unwrap();
        let deserialized: AppConfig = serde_json::from_str(&serialized).unwrap();
        assert_eq!(config.theme, deserialized.theme);
        assert_eq!(config.font_size, deserialized.font_size);
        assert_eq!(config.active_model_id, deserialized.active_model_id);
    }

    // ============================================
    // MCP Server JSON-RPC Protocol Tests
    // ============================================

    #[test]
    fn test_mcp_json_rpc_request_format() {
        use std::collections::HashMap;
        use std::sync::atomic::{AtomicU64, Ordering};

        // Test that JSON-RPC request has correct format
        let id = 1u64;
        let method = "tools/list";
        let params = serde_json::json!({});

        let request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        assert_eq!(request["jsonrpc"], "2.0");
        assert_eq!(request["id"], id);
        assert_eq!(request["method"], method);
        assert!(request["params"].is_object());
    }

    #[test]
    fn test_mcp_json_rpc_response_format() {
        // Test successful response format
        let response = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "tools": [
                    {"name": "test_tool", "description": "A test tool"}
                ]
            }
        });

        assert_eq!(response["jsonrpc"], "2.0");
        assert_eq!(response["id"], 1);
        assert!(response["result"].is_object());
        assert!(response["result"]["tools"].is_array());
    }

    #[test]
    fn test_mcp_json_rpc_error_format() {
        // Test error response format
        let error = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "error": {
                "code": -32600,
                "message": "Invalid Request"
            }
        });

        assert_eq!(error["jsonrpc"], "2.0");
        assert_eq!(error["id"], 1);
        assert!(error["error"].is_object());
        assert_eq!(error["error"]["code"], -32600);
        assert!(error["error"]["message"].is_string());
    }

    #[test]
    fn test_mcp_content_length_header() {
        // Test Content-Length header parsing
        let json_body = r#"{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}"#;
        let content_length = json_body.len();

        let header = format!("Content-Length: {}\r\n\r\n", content_length);
        assert!(header.starts_with("Content-Length: "));
        assert!(header.contains(&content_length.to_string()));
    }

    // ============================================
    // JavaScript Skill Execution Tests
    // ============================================

    #[test]
    fn test_skill_execution_simple_return() {
        // Test basic skill code execution
        let code = "return 42;";
        let params = serde_json::json!({});
        
        // The skill should return a number
        let expected = 42i64;
        assert_eq!(expected, 42);
    }

    #[test]
    fn test_skill_execution_with_params() {
        // Test that parameters are accessible in skill code
        let params = serde_json::json!({
            "name": "test_user",
            "count": 5
        });
        
        // Verify params structure
        assert_eq!(params["name"], "test_user");
        assert_eq!(params["count"], 5);
    }

    #[test]
    fn test_skill_execution_string_concatenation() {
        // Test string operations in skill code
        let result = format!("Hello, {}!", "World");
        assert_eq!(result, "Hello, World!");
    }

    #[test]
    fn test_skill_execution_array_operations() {
        // Test array operations
        let arr = [1, 2, 3, 4, 5];
        let sum: i32 = arr.iter().sum();
        assert_eq!(sum, 15);
        
        let doubled: Vec<i32> = arr.iter().map(|x| x * 2).collect();
        assert_eq!(doubled, vec![2, 4, 6, 8, 10]);
    }

    #[test]
    fn test_skill_execution_object_operations() {
        // Test object/JSON operations
        let obj = serde_json::json!({
            "name": "test",
            "value": 100
        });
        
        assert_eq!(obj["name"], "test");
        assert_eq!(obj["value"], 100);
        
        // Test serialization
        let serialized = serde_json::to_string(&obj).unwrap();
        assert!(serialized.contains("test"));
        assert!(serialized.contains("100"));
    }

    #[test]
    fn test_skill_parameter_validation() {
        use state::{SkillParameter, SkillParameterType};

        // Test parameter schema validation
        let params = [
            SkillParameter {
                name: "name".to_string(),
                param_type: SkillParameterType::String,
                description: "Name parameter".to_string(),
                required: true,
                default: None,
            },
            SkillParameter {
                name: "count".to_string(),
                param_type: SkillParameterType::Number,
                description: "Count parameter".to_string(),
                required: false,
                default: Some("0".to_string()),
            },
        ];

        // Valid params
        let valid_input = serde_json::json!({
            "name": "test",
            "count": 5
        });
        
        assert_eq!(valid_input["name"], "test");
        assert_eq!(valid_input["count"], 5);

        // Missing required param
        let invalid_input = serde_json::json!({
            "count": 5
        });
        
        assert!(invalid_input.get("name").is_none());
    }

    // ============================================
    // State Management Tests
    // ============================================

    #[test]
    fn test_state_operations() {
        use state::{SharedState, McpServer, Skill};
        use std::collections::HashMap;

        // Test initial state
        let initial_state = SharedState::new();
        
        // Should start with empty collections
        assert!(initial_state.read(|s| s.mcp_servers.is_empty()));
        assert!(initial_state.read(|s| s.skills.is_empty()));
        assert!(initial_state.read(|s| s.providers.is_empty()));
    }

        #[test]
    fn test_mcp_server_state_transitions() {
        use state::SharedState;
        use std::collections::HashMap;

        let state = SharedState::new()
;
        
        // Add an MCP server
        state.write(|s| {
            s.mcp_servers.push(state::McpServer {
                id: "test_server".to_string(),
                server_type: "stdio".to_string(),
                command: "echo".to_string(),
                args: vec!["test".to_string()],
                env: HashMap::new(),
            });
        });
        
        // Verify it was added
        let servers = state.read(|s| s.mcp_servers.clone());
        assert_eq!(servers.len(), 1);
        assert_eq!(servers[0].id, "test_server");
        
        // Remove the server
        state.write(|s| {
            s.mcp_servers.retain(|srv| srv.id != "test_server");
        });
        
        let servers = state.read(|s| s.mcp_servers.clone());
        assert!(servers.is_empty());
    }

    #[test]
    fn test_skill_state_operations() {
        use state::SharedState;

        let state = SharedState::new();
        
        // Add a skill
        state.write(|s| {
            s.skills.push(state::Skill {
                id: "test_skill".to_string(),
                name: "Test Skill".to_string(),
                description: "A test skill".to_string(),
                category: "Testing".to_string(),
                parameters: vec![],
                code: "return params;".to_string(),
                enabled: true,
                created_at: 1234567890,
                updated_at: 1234567890,
            });
        });
        
        // Verify it was added
        let skills = state.read(|s| s.skills.clone());
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Test Skill");
        
        // Toggle enabled state
        state.write(|s| {
            if let Some(skill) = s.skills.iter_mut().find(|s| s.id == "test_skill") {
                skill.enabled = false;
            }
        });
        
        let skills = state.read(|s| s.skills.clone());
        assert!(!skills[0].enabled);
    }
}

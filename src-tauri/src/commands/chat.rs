//! Chat commands - session management and LLM streaming

use tauri::State;
use tauri::Manager;
use tauri::Emitter;
use futures::StreamExt;
use reqwest::Client;
use serde_json::json;
use crate::state::{SharedState, Message, ChatSession, PixelState, ReasoningMessage};
use uuid::Uuid;

/// Streaming state tracker
struct StreamingState {
    is_streaming: bool,
    accumulated_content: String,
}

impl Default for StreamingState {
    fn default() -> Self {
        Self {
            is_streaming: false,
            accumulated_content: String::new(),
        }
    }
}

/// Create a new chat session
#[tauri::command]
#[allow(dead_code)]
pub fn create_chat_session(
    shared_state: State<'_, SharedState>,
    title: Option<String>,
) -> Result<String, String> {
    let session_id = format!("session_{}", Uuid::new_v4());
    let title = title.unwrap_or_else(|| {
        format!("New Conversation {}", chrono::Utc::now().format("%Y-%m-%d %H:%M"))
    });

    shared_state.write(|state| {
        let session = ChatSession::new(session_id.clone(), title);
        state.sessions.insert(session_id.clone(), session);
        state.current_session_id = Some(session_id.clone());
    });

    Ok(session_id)
}

/// Add a message to a session
#[tauri::command]
#[allow(dead_code)]
pub fn add_message_to_session(
    shared_state: State<'_, SharedState>,
    session_id: String,
    role: String,
    content: String,
) -> Result<Message, String> {
    let message_id = Uuid::new_v4().to_string();
    let message = Message::new(message_id.clone(), role, content);

    shared_state.write(|state| {
        if let Some(session) = state.sessions.get_mut(&session_id) {
            session.messages.push(message.clone());
            session.updated_at = chrono::Utc::now().timestamp_millis() as u64;
        }
    });

    Ok(message)
}

/// Get session messages
#[tauri::command]
#[allow(dead_code)]
pub fn get_session_messages(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<Vec<Message>, String> {
    Ok(shared_state.read(|state| {
        state
            .sessions
            .get(&session_id)
            .map(|s| s.messages.clone())
            .unwrap_or_default()
    }))
}

/// Delete a chat session
#[tauri::command]
#[allow(dead_code)]
pub fn delete_chat_session(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<(), String> {
    shared_state.write(|state| {
        state.sessions.remove(&session_id);
        if state.current_session_id == Some(session_id.clone()) {
            state.current_session_id = None;
        }
    });
    Ok(())
}

/// Get all active sessions
#[tauri::command]
#[allow(dead_code)]
pub fn get_active_sessions(
    shared_state: State<'_, SharedState>,
    limit: i32,
) -> Result<Vec<ChatSession>, String> {
    let sessions: Vec<ChatSession> = shared_state.read(|state| {
        let mut all_sessions: Vec<_> = state.sessions.values().cloned().collect();
        all_sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        if limit > 0 && limit < all_sessions.len() as i32 {
            all_sessions.into_iter().take(limit as usize).collect()
        } else {
            all_sessions
        }
    });
    Ok(sessions)
}

/// Stream chat completions from LLM provider
/// Emits events: chat_chunk, chat_stream_end, chat_error
#[tauri::command]
#[allow(dead_code)]
pub async fn stream_chat_completions(
    messages: Vec<Message>,
    model_id: String,
    provider_id: String,
    shared_state: State<'_, SharedState>,
    app_state: State<'_, PixelState>,
) -> Result<String, String> {
    let app = app_state.app_handle.get();
    let provider = shared_state.read(|state| {
        state.providers.iter().find(|p| p.id == provider_id).cloned()
    });

    let provider = match provider {
        Some(p) => p,
        None => {
            return Err(format!("Provider '{}' not found", provider_id));
        }
    };

    if !provider.enabled {
        return Err(format!("Provider '{}' is disabled", provider.name));
    }

    // Prepare messages for API
    let api_messages: Vec<serde_json::Value> = messages
        .iter()
        .map(|m| json!({ "role": m.role, "content": m.content }))
        .collect();

    // Build request
    let client = Client::new();
    let request = client
        .post(format!("{}/chat/completions", provider.base_url))
        .header("Authorization", format!("Bearer {}", provider.api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model_id,
            "messages": api_messages,
            "stream": true,
            "max_tokens": 4096,
            "temperature": 0.7,
        }));

    // Execute streaming request
    let mut stream = match request.send().await {
        Ok(resp) => {
            if !resp.status().is_success() {
                let error_text = resp.text().await.unwrap_or_default();
                return Err(format!("API error: {}", error_text));
            }
            resp.bytes_stream()
        }
        Err(e) => {
            return Err(format!("Request failed: {}", e));
        }
    };

    // Create assistant message placeholder
    let message_id = Uuid::new_v4().to_string();
    let mut accumulated_content = String::new();

    // Process stream chunks
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(data) => {
                let text = String::from_utf8_lossy(&data);

                // Parse SSE format (data: {...})
                for line in text.lines() {
                    if line.starts_with("data: ") {
                        let data_str = &line[6..];

                        if data_str == "[DONE]" {
                            // Stream complete
                            let _ = app.emit("chat_stream_end", &json!({
                                "message_id": message_id,
                                "content": accumulated_content,
                            }));

                            // Save assistant message to session
                            let assistant_msg = Message::new(
                                message_id.clone(),
                                "assistant".to_string(),
                                accumulated_content.clone(),
                            );

                            shared_state.write(|state| {
                                if let Some(session_id) = &state.current_session_id {
                                    if let Some(session) = state.sessions.get_mut(session_id) {
                                        session.messages.push(assistant_msg);
                                        session.updated_at =
                                            chrono::Utc::now().timestamp_millis() as u64;
                                    }
                                }
                            });

                            return Ok(message_id);
                        }

                        // Parse JSON chunk
                        if let Ok(json) =
                            serde_json::from_str::<serde_json::Value>(data_str)
                        {
                            if let Some(choices) = json.get("choices").and_then(|c| c.as_array())
                            {
                                if let Some(choice) = choices.first() {
                                    if let Some(delta) = choice.get("delta")
                                        .and_then(|d| d.get("content"))
                                    {
                                        if let Some(content) = delta.as_str() {
                                            accumulated_content.push_str(content);

                                            // Emit chunk event
                                            let _ = app.emit("chat_chunk", &json!({
                                                "message_id": message_id,
                                                "chunk": content,
                                                "content": accumulated_content,
                                            }));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("Stream error: {}", e);
                let _ = app.emit("chat_error", &json!({
                    "message_id": message_id,
                    "error": error_msg,
                }));
                return Err(error_msg);
            }
        }
    }

    Err("Stream ended unexpectedly".to_string())
}

/// Cancel ongoing chat stream
#[tauri::command]
#[allow(dead_code)]
pub fn cancel_chat_stream(_message_id: String) -> Result<(), String> {
    // TODO: Implement proper cancellation with request tracking
    Ok(())
}

/// Get a specific session by ID
#[tauri::command]
#[allow(dead_code)]
pub fn get_session(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<ChatSession, String> {
    shared_state.read(|state| {
        match state.sessions.get(&session_id) {
            Some(session) => Ok(session.clone()),
            None => Err(format!("Session '{}' not found", session_id)),
        }
    })
}

/// Update session properties
#[tauri::command]
#[allow(dead_code)]
pub fn update_session(
    shared_state: State<'_, SharedState>,
    session_id: String,
    title: Option<String>,
    model_id: Option<String>,
) -> Result<ChatSession, String> {
    let mut updated = None;
    
    shared_state.write(|state| {
        if let Some(session) = state.sessions.get_mut(&session_id) {
            if let Some(t) = title {
                session.title = t;
            }
            if let Some(mid) = model_id {
                session.model_id = Some(mid);
            }
            session.updated_at = chrono::Utc::now().timestamp_millis() as u64;
            updated = Some(session.clone());
        }
    });
    
    match updated {
        Some(s) => Ok(s),
        None => Err(format!("Session '{}' not found", session_id)),
    }
}

/// Search sessions by title or content
#[tauri::command]
#[allow(dead_code)]
pub fn search_sessions(
    shared_state: State<'_, SharedState>,
    query: String,
    limit: i32,
) -> Result<Vec<ChatSession>, String> {
    let query_lower = query.to_lowercase();
    
    let sessions: Vec<ChatSession> = shared_state.read(|state| {
        let mut matching_sessions: Vec<_> = state.sessions.values()
            .filter(|s| {
                s.title.to_lowercase().contains(&query_lower) ||
                s.messages.iter().any(|m| m.content.to_lowercase().contains(&query_lower))
            })
            .cloned()
            .collect();
        
        matching_sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        
        if limit > 0 && limit < matching_sessions.len() as i32 {
            matching_sessions.into_iter().take(limit as usize).collect()
        } else {
            matching_sessions
        }
    });
    
    Ok(sessions)
}

/// Clear all messages from a session (keep session)
#[tauri::command]
#[allow(dead_code)]
pub fn clear_session_history(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<bool, String> {
    let mut cleared = false;
    
    shared_state.write(|state| {
        if let Some(session) = state.sessions.get_mut(&session_id) {
            session.messages.clear();
            session.updated_at = chrono::Utc::now().timestamp_millis() as u64;
            cleared = true;
        }
    });
    
    if cleared {
        Ok(true)
    } else {
        Err(format!("Session '{}' not found", session_id))
    }
}

/// Duplicate a session with a new ID
#[tauri::command]
#[allow(dead_code)]
pub fn duplicate_session(
    shared_state: State<'_, SharedState>,
    session_id: String,
    new_title: Option<String>,
) -> Result<String, String> {
    let mut original_session = None;
    
    shared_state.read(|state| {
        if let Some(session) = state.sessions.get(&session_id) {
            original_session = Some(session.clone());
        }
    });
    
    let original = match original_session {
        Some(s) => s,
        None => return Err(format!("Session '{}' not found", session_id)),
    };
    
    let new_session_id = format!("session_{}", Uuid::new_v4());
    let new_title = new_title.unwrap_or_else(|| format!("{} (Copy)", original.title));
    
    let duplicated_session = ChatSession {
        id: new_session_id.clone(),
        title: new_title,
        messages: original.messages,
        created_at: chrono::Utc::now().timestamp_millis() as u64,
        updated_at: chrono::Utc::now().timestamp_millis() as u64,
        model_id: original.model_id,
        deep_thinking_config: original.deep_thinking_config,
    };
    
    shared_state.write(|state| {
        state.sessions.insert(new_session_id.clone(), duplicated_session);
    });
    
    Ok(new_session_id)
}

/// Get reasoning messages from a session
/// Returns only messages with reasoning content (deep thinking messages)
#[tauri::command]
#[allow(dead_code)]
pub fn get_session_reasoning_messages(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<Vec<ReasoningMessage>, String> {
    shared_state.read(|state| {
        match state.sessions.get(&session_id) {
            Some(session) => Ok(session.messages.iter()
                .filter(|m| m.is_deep_thinking || m.reasoning_content.is_some() || !m.reasoning_blocks.is_empty())
                .map(ReasoningMessage::from)
                .collect()),
            None => Err(format!("Session '{}' not found", session_id)),
        }
    })
}

/// Get a single message as ReasoningMessage format
#[tauri::command]
#[allow(dead_code)]
pub fn get_reasoning_message(
    shared_state: State<'_, SharedState>,
    session_id: String,
    message_id: String,
) -> Result<ReasoningMessage, String> {
    shared_state.read(|state| {
        match state.sessions.get(&session_id) {
            Some(session) => {
                match session.messages.iter().find(|m| m.id == message_id) {
                    Some(msg) => Ok(ReasoningMessage::from(msg)),
                    None => Err(format!("Message '{}' not found in session", message_id)),
                }
            }
            None => Err(format!("Session '{}' not found", session_id)),
        }
    })
}

/// Session history with telemetry data
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionHistory {
    pub session_id: String,
    pub title: String,
    pub message_count: usize,
    pub total_tokens: usize,
    pub created_at: u64,
    pub updated_at: u64,
    pub model_id: Option<String>,
    pub deep_thinking_enabled: bool,
    pub messages: Vec<Message>,
}

/// Get session history with telemetry data
#[tauri::command]
#[allow(dead_code)]
pub fn get_session_history(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<SessionHistory, String> {
    shared_state.read(|state| {
        match state.sessions.get(&session_id) {
            Some(session) => {
                // Calculate total tokens from messages
                let total_tokens: usize = session.messages.iter()
                    .filter_map(|m| m.token_usage)
                    .sum();
                
                let deep_thinking_enabled = session.deep_thinking_config.enabled;
                
                Ok(SessionHistory {
                    session_id: session.id.clone(),
                    title: session.title.clone(),
                    message_count: session.messages.len(),
                    total_tokens,
                    created_at: session.created_at,
                    updated_at: session.updated_at,
                    model_id: session.model_id.clone(),
                    deep_thinking_enabled,
                    messages: session.messages.clone(),
                })
            }
            None => Err(format!("Session '{}' not found", session_id)),
        }
    })
}

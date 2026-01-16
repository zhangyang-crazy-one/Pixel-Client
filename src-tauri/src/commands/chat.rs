//! Chat commands - session management and LLM streaming

use tauri::State;
use tauri::Manager;
use tauri::Emitter;
use futures::StreamExt;
use reqwest::Client;
use serde_json::json;
use crate::state::{SharedState, Message, ChatSession};
use crate::PixelState;
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

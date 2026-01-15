//! Chat commands - basic session management

use tauri::State;
use serde::{Serialize, Deserialize};
use crate::state::{SharedState, Message, ChatSession};
use uuid::Uuid;

/// Create a new chat session
#[tauri::command]
pub fn create_chat_session(
    shared_state: State<'_, SharedState>,
    title: Option<String>,
) -> Result<String, String> {
    let session_id = format!("session_{}", Uuid::new_v4());
    let title = title.unwrap_or_else(|| format!("New Conversation {}", chrono::Utc::now().format("%Y-%m-%d %H:%M")));
    
    shared_state.write(|state| {
        let session = ChatSession::new(session_id.clone(), title);
        state.sessions.insert(session_id.clone(), session);
        state.current_session_id = Some(session_id.clone());
    });
    
    Ok(session_id)
}

/// Add a message to a session
#[tauri::command]
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
pub fn get_session_messages(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<Vec<Message>, String> {
    Ok(shared_state.read(|state| {
        state.sessions.get(&session_id)
            .map(|s| s.messages.clone())
            .unwrap_or_default()
    }))
}

/// Delete a chat session
#[tauri::command]
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

/// Placeholder for stream_chat_completions - requires more complex async handling
#[tauri::command]
pub fn stream_chat_completions(
    _messages: Vec<Message>,
    _model_id: String,
    _provider_id: String,
) -> Result<(), String> {
    // TODO: Implement full streaming support
    Ok(())
}

/// Placeholder for cancel_chat_stream
#[tauri::command]
pub fn cancel_chat_stream(_message_id: String) -> Result<(), String> {
    Ok(())
}

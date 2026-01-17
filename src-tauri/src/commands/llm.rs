//! LLM Commands - Deep Thinking mode and reasoning content parsing
//! Phase 2: LLM Features Implementation

use tauri::State;
use tauri::Manager;
use tauri::Emitter;
use serde::{Serialize, Deserialize};
use serde_json::json;
use regex::Regex;
use std::time::Instant;
use futures::StreamExt;
use crate::state::{
    SharedState, Message, ChatSession, DeepThinkingConfig, 
    DeepThinkingStatus, ThinkingDepth, ParsedReasoning, ReasoningBlock, PixelState
};

/// Enable or configure Deep Thinking mode for a session
#[tauri::command]
#[allow(dead_code)]
pub fn enable_deep_thinking(
    shared_state: State<'_, SharedState>,
    session_id: String,
    enabled: bool,
    config: Option<DeepThinkingConfig>,
) -> Result<DeepThinkingStatus, String> {
    let mut status: Option<DeepThinkingStatus> = None;

    shared_state.write(|state| {
        if let Some(session) = state.sessions.get_mut(&session_id) {
            if enabled {
                let new_config = config.unwrap_or_default();
                session.deep_thinking_config = new_config.clone();
                status = Some(DeepThinkingStatus {
                    enabled: true,
                    config: new_config,
                    token_usage: 0,
                    steps_completed: 0,
                    current_step: None,
                });
            } else {
                session.deep_thinking_config.enabled = false;
                status = Some(DeepThinkingStatus {
                    enabled: false,
                    config: session.deep_thinking_config.clone(),
                    token_usage: session.deep_thinking_config.token_usage,
                    steps_completed: 0,
                    current_step: None,
                });
            }
        }
    });

    match status {
        Some(s) => Ok(s),
        None => Err(format!("Session '{}' not found", session_id)),
    }
}

/// Get Deep Thinking status for a session
#[tauri::command]
#[allow(dead_code)]
pub fn get_deep_thinking_status(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<DeepThinkingStatus, String> {
    shared_state.read(|state| {
        match state.sessions.get(&session_id) {
            Some(session) => Ok(DeepThinkingStatus {
                enabled: session.deep_thinking_config.enabled,
                config: session.deep_thinking_config.clone(),
                token_usage: session.deep_thinking_config.token_usage,
                steps_completed: 0,
                current_step: None,
            }),
            None => Err(format!("Session '{}' not found", session_id)),
        }
    })
}

/// Parse reasoning content from LLM response
/// Extracts reasoning blocks from <reasoning> tags or other markers
#[tauri::command]
#[allow(dead_code)]
pub fn parse_reasoning_content_cmd(
    content: String,
    extract_steps: bool,
    _format_as_html: bool,
) -> Result<ParsedReasoning, String> {
    let start_time = Instant::now();
    
    // Regex patterns for different reasoning formats
    // Format 1: <reasoning>...</reasoning>
    let reasoning_tag_pattern = Regex::new(r"(?i)<reasoning>(.*?)</reasoning>")
        .map_err(|e| format!("Regex error: {}", e))?;

    // Format 2: [Reasoning: ...] or [Thinking: ...]
    // Note: Using [^[\n]* to avoid lookahead - matches until [ or newline
    let bracket_pattern = Regex::new(r"(?i)\[Reasoning\]:?\s*([^\[\n]*)")
        .map_err(|e| format!("Regex error: {}", e))?;

    let thinking_bracket_pattern = Regex::new(r"(?i)\[Thinking\]:?\s*([^\[\n]*)")
        .map_err(|e| format!("Regex error: {}", e))?;

    // Format 3: Step 1:, Step 2:, etc.
    // Simplified pattern without lookahead - will capture more and trim later
    let step_pattern = Regex::new(r"(?i)(?:^|\n)\s*(?:Step|步骤|阶段)\s*(\d+)[:：]?\s*([^\n]*)")
        .map_err(|e| format!("Regex error: {}", e))?;

    let mut reasoning_blocks: Vec<ReasoningBlock> = Vec::new();
    let mut step_counter = 0;

    // Extract from <reasoning> tags
    for cap in reasoning_tag_pattern.captures_iter(&content) {
        if let Some(match_str) = cap.get(1) {
            step_counter += 1;
            reasoning_blocks.push(ReasoningBlock {
                step: step_counter,
                content: match_str.as_str().trim().to_string(),
                confidence: 0.95,
                timestamp: None,
            });
        }
    }

    // Extract from [Reasoning: ...] brackets
    for cap in bracket_pattern.captures_iter(&content) {
        if let Some(match_str) = cap.get(1) {
            let block_content = match_str.as_str().trim().to_string();
            if !block_content.is_empty() && !reasoning_blocks.iter().any(|b| b.content == block_content) {
                step_counter += 1;
                reasoning_blocks.push(ReasoningBlock {
                    step: step_counter,
                    content: block_content,
                    confidence: 0.90,
                    timestamp: None,
                });
            }
        }
    }

    // Extract from [Thinking: ...] brackets
    for cap in thinking_bracket_pattern.captures_iter(&content) {
        if let Some(match_str) = cap.get(1) {
            let block_content = match_str.as_str().trim().to_string();
            if !block_content.is_empty() && !reasoning_blocks.iter().any(|b| b.content == block_content) {
                step_counter += 1;
                reasoning_blocks.push(ReasoningBlock {
                    step: step_counter,
                    content: block_content,
                    confidence: 0.85,
                    timestamp: None,
                });
            }
        }
    }

    // Extract step-by-step reasoning if requested
    if extract_steps {
        for cap in step_pattern.captures_iter(&content) {
            if let Some(_step_num) = cap.get(1) {
                if let Some(match_str) = cap.get(2) {
                    let block_content = match_str.as_str().trim().to_string();
                    if !block_content.is_empty() && !reasoning_blocks.iter().any(|b| b.content == block_content) {
                        step_counter += 1;
                        reasoning_blocks.push(ReasoningBlock {
                            step: step_counter,
                            content: block_content,
                            confidence: 0.80,
                            timestamp: None,
                        });
                    }
                }
            }
        }
    }

    // Sort by step number
    reasoning_blocks.sort_by_key(|b| b.step);

    // Calculate total duration
    let duration_ms = start_time.elapsed().as_millis() as u64;

    // If no explicit reasoning found, try to detect implicit reasoning
    if reasoning_blocks.is_empty() {
        // Look for numbered lists or bullet points that might indicate reasoning
        let lines: Vec<&str> = content.lines().collect();
        for line in lines.iter() {
            let trimmed = line.trim();
            if trimmed.starts_with("1.") || trimmed.starts_with("2.") || trimmed.starts_with("3.") 
                || trimmed.starts_with("①") || trimmed.starts_with("②") || trimmed.starts_with("③")
            {
                step_counter += 1;
                reasoning_blocks.push(ReasoningBlock {
                    step: step_counter,
                    content: trimmed.to_string(),
                    confidence: 0.60,
                    timestamp: None,
                });
            }
        }
    }

    Ok(ParsedReasoning {
        original_content: content,
        reasoning_blocks: reasoning_blocks.clone(),
        total_steps: reasoning_blocks.len(),
        total_duration_ms: duration_ms,
    })
}

/// Stream chat completions with Deep Thinking support
/// Enhanced version that handles reasoning content
#[tauri::command]
#[allow(dead_code)]
pub async fn stream_chat_completions_with_thinking(
    messages: Vec<Message>,
    model_id: String,
    provider_id: String,
    deep_thinking: bool,
    thinking_depth: Option<ThinkingDepth>,
    shared_state: State<'_, SharedState>,
    app_state: State<'_, PixelState>,
) -> Result<String, String> {
    let app = app_state.app_handle.get();
    
    // Get provider configuration
    let provider = shared_state.read(|state| {
        state.providers.iter().find(|p| p.id == provider_id).cloned()
    });

    let provider = match provider {
        Some(p) => p,
        None => return Err(format!("Provider '{}' not found", provider_id)),
    };

    if !provider.enabled {
        return Err(format!("Provider '{}' is disabled", provider.name));
    }

    // Prepare messages for API with thinking instructions if enabled
    let mut api_messages: Vec<serde_json::Value> = messages
        .iter()
        .map(|m| json!({ "role": m.role, "content": m.content }))
        .collect();

    // Add thinking instruction if deep thinking is enabled
    if deep_thinking {
        let depth = thinking_depth.clone().unwrap_or(ThinkingDepth::Moderate);
        let depth_instruction = match depth {
            ThinkingDepth::Surface => "Provide a concise answer with minimal reasoning.",
            ThinkingDepth::Moderate => "Show your reasoning process step by step. Use <reasoning> tags to indicate thinking steps.",
            ThinkingDepth::Deep => "Provide detailed step-by-step reasoning. Use <reasoning> tags for each step and explain your thought process thoroughly.",
        };
        
        // Add system message for thinking instructions
        api_messages.insert(0, json!({
            "role": "system",
            "content": format!("{} Also, include your reasoning process in <reasoning>...</reasoning> tags.", depth_instruction)
        }));
    }

    // Build request with thinking parameters
    let max_tokens = if deep_thinking { 16384 } else { 4096 };
    let temperature = match thinking_depth.unwrap_or(ThinkingDepth::Moderate) {
        ThinkingDepth::Deep => 0.5,
        ThinkingDepth::Surface => 0.9,
        _ => 0.7,
    };

    let client = reqwest::Client::new();
    let request = client
        .post(format!("{}/chat/completions", provider.base_url))
        .header("Authorization", format!("Bearer {}", provider.api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": model_id,
            "messages": api_messages,
            "stream": true,
            "max_tokens": max_tokens,
            "temperature": temperature,
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

    let message_id = uuid::Uuid::new_v4().to_string();
    let mut accumulated_content = String::new();
    let mut accumulated_reasoning = String::new();
    let mut reasoning_started = false;

    // Process stream chunks
    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(data) => {
                let text = String::from_utf8_lossy(&data);

                for line in text.lines() {
                    if let Some(data_str) = line.strip_prefix("data: ") {

                        if data_str == "[DONE]" {
                            // Parse reasoning from accumulated content
                            let parsed_reasoning = parse_reasoning_content_cmd(
                                accumulated_reasoning.clone(),
                                true,
                                false,
                            ).unwrap_or_else(|_| ParsedReasoning {
                                original_content: accumulated_reasoning.clone(),
                                reasoning_blocks: Vec::new(),
                                total_steps: 0,
                                total_duration_ms: 0,
                            });

                            // Create assistant message with reasoning
                            let assistant_msg = Message {
                                id: message_id.clone(),
                                role: "assistant".to_string(),
                                content: accumulated_content.clone(),
                                timestamp: chrono::Utc::now().timestamp_millis() as u64,
                                model_id: Some(model_id),
                                attachments: Vec::new(),
                                images: Vec::new(),
                                reasoning_content: if accumulated_reasoning.is_empty() { None } else { Some(accumulated_reasoning.clone()) },
                                reasoning_blocks: parsed_reasoning.reasoning_blocks,
                                token_usage: None,
                                is_deep_thinking: deep_thinking,
                            };

                            // Save to session
                            shared_state.write(|state| {
                                if let Some(session_id) = &state.current_session_id {
                                    if let Some(session) = state.sessions.get_mut(session_id) {
                                        session.messages.push(assistant_msg);
                                        session.updated_at = chrono::Utc::now().timestamp_millis() as u64;
                                    }
                                }
                            });

                            // Emit stream end event with reasoning info
                            let _ = app.emit("chat_stream_end", &json!({
                                "message_id": message_id,
                                "content": accumulated_content,
                                "reasoning_content": accumulated_reasoning,
                                "reasoning_steps": parsed_reasoning.total_steps,
                                "is_deep_thinking": deep_thinking,
                            }));

                            return Ok(message_id);
                        }

                        // Parse JSON chunk
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data_str) {
                            if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
                                if let Some(choice) = choices.first() {
                                    // Check for reasoning content in response
                                    if let Some(delta) = choice.get("delta") {
                                        // Check for content
                                        if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                                            accumulated_content.push_str(content);
                                            
                                            // Emit chunk event
                                            let _ = app.emit("chat_chunk", &json!({
                                                "message_id": message_id,
                                                "chunk": content,
                                                "content": accumulated_content,
                                                "chunk_type": "content",
                                                "is_deep_thinking": deep_thinking,
                                            }));
                                        }
                                        
                                        // Check for reasoning content
                                        if let Some(reasoning) = delta.get("reasoning_content").or(delta.get("reasoning")).and_then(|c| c.as_str()) {
                                            if !reasoning_started {
                                                reasoning_started = true;
                                                accumulated_reasoning.push_str("<reasoning>");
                                            }
                                            accumulated_reasoning.push_str(reasoning);
                                            
                                            // Emit reasoning chunk
                                            let _ = app.emit("chat_chunk", &json!({
                                                "message_id": message_id,
                                                "chunk": reasoning,
                                                "content": accumulated_reasoning,
                                                "chunk_type": "reasoning",
                                                "is_deep_thinking": deep_thinking,
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

//! Provider Commands - LLM Provider and Model management
//! Phase 3: Provider/Model API Implementation

use tauri::State;
use serde::{Serialize, Deserialize};
use crate::state::{SharedState, LLMProvider, LLMModel, AppState};

/// Validation result for provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub message: String,
    pub latency_ms: Option<u64>,
}

/// Get all providers
#[tauri::command]
#[allow(dead_code)]
pub fn get_providers(
    shared_state: State<'_, SharedState>,
) -> Vec<LLMProvider> {
    shared_state.read(|state| {
        state.providers.clone()
    })
}

/// Get a specific provider by ID
#[tauri::command]
#[allow(dead_code)]
pub fn get_provider(
    shared_state: State<'_, SharedState>,
    provider_id: String,
) -> Option<LLMProvider> {
    shared_state.read(|state| {
        state.providers.iter()
            .find(|p| p.id == provider_id)
            .cloned()
    })
}

/// Create a new provider
#[tauri::command]
#[allow(dead_code)]
pub fn create_provider(
    shared_state: State<'_, SharedState>,
    name: String,
    provider_type: String,
    base_url: String,
    api_key: String,
) -> Result<LLMProvider, String> {
    let provider_id = uuid::Uuid::new_v4().to_string();
    
    let new_provider = LLMProvider {
        id: provider_id.clone(),
        name,
        provider_type,
        base_url,
        api_key,
        enabled: true,
    };
    
    shared_state.write(|state| {
        state.providers.push(new_provider.clone());
    });
    
    Ok(new_provider)
}

/// Update an existing provider
#[tauri::command]
#[allow(dead_code)]
pub fn update_provider(
    shared_state: State<'_, SharedState>,
    provider_id: String,
    name: Option<String>,
    base_url: Option<String>,
    api_key: Option<String>,
    enabled: Option<bool>,
) -> Result<LLMProvider, String> {
    let mut updated = None;
    
    shared_state.write(|state| {
        if let Some(provider) = state.providers.iter_mut().find(|p| p.id == provider_id) {
            if let Some(n) = name { provider.name = n; }
            if let Some(url) = base_url { provider.base_url = url; }
            if let Some(key) = api_key { provider.api_key = key; }
            if let Some(e) = enabled { provider.enabled = e; }
            updated = Some(provider.clone());
        }
    });
    
    match updated {
        Some(p) => Ok(p),
        None => Err(format!("Provider '{}' not found", provider_id)),
    }
}

/// Delete a provider
#[tauri::command]
#[allow(dead_code)]
pub fn delete_provider(
    shared_state: State<'_, SharedState>,
    provider_id: String,
) -> bool {
    let mut removed = false;
    
    shared_state.write(|state| {
        let initial_len = state.providers.len();
        state.providers.retain(|p| p.id != provider_id);
        removed = state.providers.len() < initial_len;
        
        // Also remove associated models
        state.models.retain(|m| m.provider_id != provider_id);
    });
    
    removed
}

/// Set a provider as default
#[tauri::command]
#[allow(dead_code)]
pub fn set_default_provider(
    shared_state: State<'_, SharedState>,
    provider_id: String,
) -> Result<(), String> {
    let provider_id = provider_id.clone();
    let mut found = false;
    
    shared_state.write(|state| {
        // Check if provider exists
        found = state.providers.iter().any(|p| p.id == provider_id);
        if found {
            state.config.active_provider_id = Some(provider_id.clone());
        }
    });
    
    if found {
        Ok(())
    } else {
        Err(format!("Provider '{}' not found", provider_id))
    }
}

/// Validate a provider configuration by making a test API call
#[tauri::command]
#[allow(dead_code)]
pub async fn validate_provider(
    shared_state: State<'_, SharedState>,
    provider_id: String,
) -> Result<ValidationResult, String> {
    let provider = shared_state.read(|state| {
        state.providers.iter().find(|p| p.id == provider_id).cloned()
    });
    
    let provider = match provider {
        Some(p) => p,
        None => return Err(format!("Provider '{}' not found", provider_id)),
    };
    
    // Make a simple API call to validate
    let start_time = std::time::Instant::now();
    let client = reqwest::Client::new();
    
    // For OpenAI-compatible APIs, check models endpoint
    let test_url = format!("{}/models", provider.base_url);
    
    match client
        .get(&test_url)
        .header("Authorization", format!("Bearer {}", provider.api_key))
        .send()
        .await
    {
        Ok(resp) => {
            let latency_ms = start_time.elapsed().as_millis() as u64;
            
            if resp.status().is_success() {
                Ok(ValidationResult {
                    valid: true,
                    message: "Provider configuration is valid".to_string(),
                    latency_ms: Some(latency_ms),
                })
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                Ok(ValidationResult {
                    valid: false,
                    message: format!("API error: {}", error_text),
                    latency_ms: Some(latency_ms),
                })
            }
        }
        Err(e) => {
            Ok(ValidationResult {
                valid: false,
                message: format!("Connection failed: {}", e),
                latency_ms: None,
            })
        }
    }
}

// ===== Model Commands =====

/// Get all models for a provider
#[tauri::command]
#[allow(dead_code)]
pub fn get_models(
    shared_state: State<'_, SharedState>,
    provider_id: Option<String>,
) -> Vec<LLMModel> {
    shared_state.read(|state| {
        match provider_id {
            Some(pid) => state.models.iter()
                .filter(|m| m.provider_id == pid)
                .cloned()
                .collect(),
            None => state.models.clone(),
        }
    })
}

/// Get a specific model by ID
#[tauri::command]
#[allow(dead_code)]
pub fn get_model(
    shared_state: State<'_, SharedState>,
    model_id: String,
) -> Option<LLMModel> {
    shared_state.read(|state| {
        state.models.iter()
            .find(|m| m.id == model_id)
            .cloned()
    })
}

/// Create a new model
#[tauri::command]
#[allow(dead_code)]
pub fn create_model(
    shared_state: State<'_, SharedState>,
    provider_id: String,
    name: String,
    model_id: String,
    model_type: String,
) -> Result<LLMModel, String> {
    // Verify provider exists
    let provider_exists = shared_state.read(|state| {
        state.providers.iter().any(|p| p.id == provider_id)
    });
    
    if !provider_exists {
        return Err(format!("Provider '{}' not found", provider_id));
    }
    
    let new_model_id = uuid::Uuid::new_v4().to_string();
    
    let new_model = LLMModel {
        id: new_model_id,
        provider_id,
        name,
        model_id,
        model_type,
        context_length: Some(4096),
        max_tokens: Some(4096),
        temperature: Some(0.7),
        dimensions: None,
        is_default: false,
    };
    
    shared_state.write(|state| {
        state.models.push(new_model.clone());
    });
    
    Ok(new_model)
}

/// Update an existing model
#[tauri::command]
#[allow(dead_code)]
pub fn update_model(
    shared_state: State<'_, SharedState>,
    model_id: String,
    name: Option<String>,
    model_id_update: Option<String>,
    model_type: Option<String>,
    context_length: Option<usize>,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
) -> Result<LLMModel, String> {
    let mut updated = None;
    
    shared_state.write(|state| {
        if let Some(model) = state.models.iter_mut().find(|m| m.id == model_id) {
            if let Some(n) = name { model.name = n; }
            if let Some(mid) = model_id_update { model.model_id = mid; }
            if let Some(mt) = model_type { model.model_type = mt; }
            if let Some(cl) = context_length { model.context_length = Some(cl); }
            if let Some(mt) = max_tokens { model.max_tokens = Some(mt); }
            if let Some(t) = temperature { model.temperature = Some(t); }
            updated = Some(model.clone());
        }
    });
    
    match updated {
        Some(m) => Ok(m),
        None => Err(format!("Model '{}' not found", model_id)),
    }
}

/// Delete a model
#[tauri::command]
#[allow(dead_code)]
pub fn delete_model(
    shared_state: State<'_, SharedState>,
    model_id: String,
) -> bool {
    let mut removed = false;
    
    shared_state.write(|state| {
        let initial_len = state.models.len();
        state.models.retain(|m| m.id != model_id);
        removed = state.models.len() < initial_len;
    });
    
    removed
}

/// Set a model as default for its provider
#[tauri::command]
#[allow(dead_code)]
pub fn set_default_model(
    shared_state: State<'_, SharedState>,
    model_id: String,
) -> Result<(), String> {
    let model_id = model_id.clone();
    let mut found_provider_id = None;
    let mut found = false;
    
    // First, find the model and its provider_id
    shared_state.read(|state| {
        if let Some(model) = state.models.iter().find(|m| m.id == model_id) {
            found = true;
            found_provider_id = Some(model.provider_id.clone());
        }
    });
    
    if !found {
        return Err(format!("Model '{}' not found", model_id));
    }
    
    // Then update all models for that provider
    let provider_id = found_provider_id.unwrap();
    shared_state.write(|state| {
        // Unset other models as default for this provider
        for m in state.models.iter_mut() {
            if m.provider_id == provider_id {
                m.is_default = false;
            }
        }
        // Set this model as default
        if let Some(m) = state.models.iter_mut().find(|mm| mm.id == model_id) {
            m.is_default = true;
        }
        // Update active model config
        state.config.active_model_id = Some(model_id);
    });
    
    Ok(())
}

/// Get default provider and model
#[tauri::command]
#[allow(dead_code)]
pub fn get_default_model_config(
    shared_state: State<'_, SharedState>,
) -> Result<(Option<LLMProvider>, Option<LLMModel>), String> {
    shared_state.read(|state| {
        let provider_id = state.config.active_provider_id.clone();
        let model_id = state.config.active_model_id.clone();
        
        let provider = provider_id.and_then(|pid| {
            state.providers.iter().find(|p| p.id == pid).cloned()
        });
        
        let model = model_id.and_then(|mid| {
            state.models.iter().find(|m| m.id == mid).cloned()
        });
        
        Ok((provider, model))
    })
}

/// Test provider configuration without saving
#[tauri::command]
#[allow(dead_code)]
pub async fn test_provider_config(
    provider_type: String,
    base_url: String,
    api_key: String,
) -> Result<ValidationResult, String> {
    let start_time = std::time::Instant::now();
    let client = reqwest::Client::new();
    
    // For OpenAI-compatible APIs, check models endpoint
    let test_url = format!("{}/models", base_url);
    
    match client
        .get(&test_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(resp) => {
            let latency_ms = start_time.elapsed().as_millis() as u64;
            
            if resp.status().is_success() {
                Ok(ValidationResult {
                    valid: true,
                    message: format!("Provider '{}' configuration is valid", provider_type),
                    latency_ms: Some(latency_ms),
                })
            } else {
                let error_text = resp.text().await.unwrap_or_default();
                Ok(ValidationResult {
                    valid: false,
                    message: format!("API error: {}", error_text),
                    latency_ms: Some(latency_ms),
                })
            }
        }
        Err(e) => {
            Ok(ValidationResult {
                valid: false,
                message: format!("Connection failed: {}", e),
                latency_ms: None,
            })
        }
    }
}

/// Model validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelValidationResult {
    pub success: bool,
    pub latency: u64,
    pub message: String,
}

/// Validate model availability by making a test API call
#[tauri::command]
#[allow(dead_code)]
pub async fn validate_model_availability(
    _provider_type: String,
    base_url: String,
    api_key: String,
    model_id: String,
) -> Result<ModelValidationResult, String> {
    let start_time = std::time::Instant::now();
    let client = reqwest::Client::new();
    
    // Make a minimal chat completion request to validate model
    let test_url = format!("{}/chat/completions", base_url);
    
    let request_body = serde_json::json!({
        "model": model_id,
        "messages": [{"role": "user", "content": "hi"}],
        "max_tokens": 1,
        "stream": false
    });
    
    match client
        .post(&test_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(30))
        .json(&request_body)
        .send()
        .await
    {
        Ok(resp) => {
            let latency = start_time.elapsed().as_millis() as u64;
            
            if resp.status().is_success() {
                Ok(ModelValidationResult {
                    success: true,
                    latency,
                    message: format!("Model '{}' is available and working", model_id),
                })
            } else {
                let status = resp.status();
                let error_text = resp.text().await.unwrap_or_default();
                
                let message = if status.as_u16() == 404 {
                    format!("Model '{}' not found", model_id)
                } else if status.as_u16() == 401 {
                    "Invalid API key".to_string()
                } else {
                    format!("API error ({}): {}", status, error_text)
                };
                
                Ok(ModelValidationResult {
                    success: false,
                    latency,
                    message,
                })
            }
        }
        Err(e) => {
            Ok(ModelValidationResult {
                success: false,
                latency: start_time.elapsed().as_millis() as u64,
                message: format!("Connection failed: {}", e),
            })
        }
    }
}

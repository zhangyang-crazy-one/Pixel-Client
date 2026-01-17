//! Skills Commands - Skill management and execution with JavaScript runtime
//! Phase 6: Skills API Implementation with rquickjs execution engine

use tauri::State;
use serde::{Serialize, Deserialize};
use serde_json::{Value, json};
use rquickjs::{Context, Ctx, Value as JSValue, Object, Array, Function, Filter};
use crate::state::{SharedState, Skill, SkillParameter, SkillParameterType};

/// Skill execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillResult {
    pub success: bool,
    pub output: Value,
    pub error: Option<String>,
    pub execution_time_ms: u64,
}

/// Category with skill count
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillCategory {
    pub name: String,
    pub count: usize,
}

/// Execute a skill with proper JavaScript runtime
#[tauri::command]
#[allow(dead_code)]
pub async fn execute_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
    params: Value,
) -> Result<SkillResult, String> {
    let start_time = std::time::Instant::now();

    let skill = shared_state.read(|state| {
        state.skills.iter().find(|s| s.id == skill_id).cloned()
    });

    let skill = match skill {
        Some(s) => s,
        None => return Err(format!("Skill '{}' not found", skill_id)),
    };

    // Validate parameters against skill schema
    let mut errors: Vec<String> = Vec::new();
    for param in &skill.parameters {
        let param_value = params.get(&param.name);

        if param.required && param_value.is_none() {
            errors.push(format!("Missing required parameter: {}", param.name));
            continue;
        }

        if let Some(value) = param_value {
            // Type validation using SkillParameterType enum
            match &param.param_type {
                SkillParameterType::String if !value.is_string() => {
                    errors.push(format!("Parameter '{}' must be a string", param.name));
                }
                SkillParameterType::Number if !value.is_number() => {
                    errors.push(format!("Parameter '{}' must be a number", param.name));
                }
                SkillParameterType::Boolean if !value.is_boolean() => {
                    errors.push(format!("Parameter '{}' must be a boolean", param.name));
                }
                SkillParameterType::Array if !value.is_array() => {
                    errors.push(format!("Parameter '{}' must be an array", param.name));
                }
                SkillParameterType::Object if !value.is_object() => {
                    errors.push(format!("Parameter '{}' must be an object", param.name));
                }
                _ => {} // Type matches
            }
        }
    }

    if !errors.is_empty() {
        return Ok(SkillResult {
            success: false,
            output: Value::Null,
            error: Some(errors.join(", ")),
            execution_time_ms: start_time.elapsed().as_millis() as u64,
        });
    }

    // Execute the skill code
    let execution_result = execute_javascript(&skill.code, &params);

    let execution_time_ms = start_time.elapsed().as_millis() as u64;

    match execution_result {
        Ok(result) => Ok(SkillResult {
            success: true,
            output: result,
            error: None,
            execution_time_ms,
        }),
        Err(e) => Ok(SkillResult {
            success: false,
            output: Value::Null,
            error: Some(e),
            execution_time_ms,
        }),
    }
}

/// Execute JavaScript code with given parameters
fn execute_javascript(code: &str, params: &Value) -> Result<Value, String> {
    let rt = rquickjs::Runtime::new().map_err(|e| format!("Failed to create JS runtime: {}", e))?;
    let ctx = Context::full(&rt).map_err(|e| format!("Failed to create JS context: {}", e))?;

    ctx.with(|ctx| {
        // Convert params to JS object (clone ctx for the conversion)
        let params_obj = convert_json_to_js(ctx.clone(), params)
            .map_err(|e| format!("Failed to convert params: {}", e))?;

        // Set params as a global variable
        let globals = ctx.globals();
        globals.set("params", params_obj)
            .map_err(|e| format!("Failed to set params: {}", e))?;

        // Add helper functions to globals
        add_helper_functions(&globals)?;

        // Execute the code
        let result: JSValue = ctx.eval(code)
            .map_err(|e| format!("Execution error: {}", e))?;

        // Convert result back to JSON
        let json_result = convert_js_to_json(ctx, result)
            .map_err(|e| format!("Failed to convert result: {}", e))?;

        Ok(json_result)
    })
}

/// Convert JSON value to rquickjs value
fn convert_json_to_js<'js>(ctx: Ctx<'js>, value: &Value) -> Result<JSValue<'js>, String> {
    match value {
        Value::Null => Ok(JSValue::new_null(ctx)),
        Value::Bool(b) => Ok(JSValue::new_bool(ctx, *b)),
        Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                Ok(JSValue::new_float(ctx, f))
            } else if let Some(i) = n.as_i64() {
                Ok(JSValue::new_int(ctx, i as i32))
            } else {
                Ok(JSValue::new_null(ctx))
            }
        }
        Value::String(s) => ctx.eval(s.as_str()).map_err(|e| format!("{}", e)),
        Value::Array(arr) => {
            let js_arr = Array::new(ctx.clone()).map_err(|e| format!("{}", e))?;

            for (i, item) in arr.iter().enumerate() {
                let js_item = convert_json_to_js(ctx.clone(), item)?;
                js_arr.set(i, js_item).map_err(|e| format!("{}", e))?;
            }
            Ok(js_arr.into())
        }
        Value::Object(obj) => {
            let js_obj = Object::new(ctx.clone()).map_err(|e| format!("{}", e))?;

            for (key, val) in obj.iter() {
                let js_val = convert_json_to_js(ctx.clone(), val)?;
                js_obj.set(key.as_str(), js_val).map_err(|e| format!("{}", e))?;
            }
            Ok(js_obj.into())
        }
    }
}

/// Convert rquickjs value to JSON value
fn convert_js_to_json<'js>(ctx: Ctx<'js>, value: JSValue<'js>) -> Result<Value, String> {
    if value.is_null() || value.is_undefined() {
        return Ok(Value::Null);
    }
    if value.is_bool() {
        let b = value.as_bool().unwrap_or(false);
        return Ok(json!(b));
    }
    if value.is_int() {
        let i = value.as_int().unwrap_or(0);
        return Ok(json!(i));
    }
    if value.is_float() {
        let f = value.as_float().unwrap_or(0.0);
        return Ok(json!(f));
    }
    if value.is_string() {
        if let Some(js_str) = value.into_string() {
            if let Some(rs) = js_str.as_string() {
                let s = rs.to_string().map_err(|e| format!("{}", e))?;
                return Ok(json!(s));
            }
        }
        return Ok(json!(""));
    }
    if value.is_array() {
        let arr = value.into_array().unwrap();
        let len = arr.len();
        let mut result = Vec::new();

        for i in 0..len {
            let item: JSValue = arr.get(i).map_err(|e| format!("{}", e))?;
            result.push(convert_js_to_json(ctx.clone(), item)?);
        }
        return Ok(json!(result));
    }
    if value.is_object() {
        let obj = value.into_object().unwrap();
        let mut obj_map = serde_json::Map::new();

        for key_result in obj.own_keys::<String>(Filter::new().string().symbol()) {
            let prop = key_result.map_err(|e| format!("{}", e))?;
            let val: JSValue = obj.get(&prop).map_err(|e| format!("{}", e))?;
            obj_map.insert(prop, convert_js_to_json(ctx.clone(), val)?);
        }
        return Ok(Value::Object(obj_map));
    }

    Ok(Value::Null)
}

/// Add helper functions to the JavaScript globals
fn add_helper_functions(globals: &Object) -> Result<(), String> {
    // Helper: log function
    let log_func: Function = globals.ctx().eval(r#"
        function log(...args) {
            return args.join(' ');
        }
        log;
    "#).map_err(|e| format!("Failed to create log function: {}", e))?;

    globals.set("log", log_func)
        .map_err(|e| format!("Failed to set log: {}", e))?;

    // Helper: formatJson function
    let format_json_func: Function = globals.ctx().eval(r#"
        function formatJson(obj) {
            return JSON.stringify(obj, null, 2);
        }
        formatJson;
    "#).map_err(|e| format!("Failed to create formatJson function: {}", e))?;

    globals.set("formatJson", format_json_func)
        .map_err(|e| format!("Failed to set formatJson: {}", e))?;

    // Helper: getParam function
    let get_param_func: Function = globals.ctx().eval(r#"
        function getParam(name, defaultValue) {
            if (params && Object.prototype.hasOwnProperty.call(params, name)) {
                return params[name];
            }
            return defaultValue;
        }
        getParam;
    "#).map_err(|e| format!("Failed to create getParam function: {}", e))?;

    globals.set("getParam", get_param_func)
        .map_err(|e| format!("Failed to set getParam: {}", e))?;

    Ok(())
}

// ============================================
// Skill Management Commands
// ============================================

/// Get all skills
#[tauri::command]
#[allow(dead_code)]
pub fn get_skills(
    shared_state: State<'_, SharedState>,
    enabled_only: bool,
) -> Vec<Skill> {
    shared_state.read(|state| {
        let mut skills = state.skills.clone();
        if enabled_only {
            skills.retain(|s| s.enabled);
        }
        skills
    })
}

/// Get a specific skill by ID
#[tauri::command]
#[allow(dead_code)]
pub fn get_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<Skill, String> {
    shared_state.read(|state| {
        match state.skills.iter().find(|s| s.id == skill_id) {
            Some(skill) => Ok(skill.clone()),
            None => Err(format!("Skill '{}' not found", skill_id)),
        }
    })
}

/// Create a new skill
#[tauri::command]
#[allow(dead_code)]
pub fn create_skill(
    shared_state: State<'_, SharedState>,
    name: String,
    description: String,
    category: String,
    parameters: Vec<SkillParameter>,
    code: String,
) -> Result<Skill, String> {
    let skill_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis() as u64;

    let skill = Skill {
        id: skill_id.clone(),
        name,
        description,
        category,
        parameters,
        code,
        enabled: true,
        created_at: now,
        updated_at: now,
    };

    shared_state.write(|state| {
        state.skills.push(skill.clone());
    });

    Ok(skill)
}

/// Update an existing skill
#[tauri::command]
#[allow(dead_code)]
pub fn update_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
    name: Option<String>,
    description: Option<String>,
    category: Option<String>,
    parameters: Option<Vec<SkillParameter>>,
    code: Option<String>,
    enabled: Option<bool>,
) -> Result<Skill, String> {
    let mut updated = None;

    shared_state.write(|state| {
        if let Some(skill) = state.skills.iter_mut().find(|s| s.id == skill_id) {
            if let Some(n) = name { skill.name = n; }
            if let Some(d) = description { skill.description = d; }
            if let Some(c) = category { skill.category = c; }
            if let Some(p) = parameters { skill.parameters = p; }
            if let Some(c) = code { skill.code = c; }
            if let Some(e) = enabled { skill.enabled = e; }
            skill.updated_at = chrono::Utc::now().timestamp_millis() as u64;
            updated = Some(skill.clone());
        }
    });

    match updated {
        Some(s) => Ok(s),
        None => Err(format!("Skill '{}' not found", skill_id)),
    }
}

/// Delete a skill
#[tauri::command]
#[allow(dead_code)]
pub fn delete_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<bool, String> {
    let mut removed = false;

    shared_state.write(|state| {
        let initial_len = state.skills.len();
        state.skills.retain(|s| s.id != skill_id);
        removed = state.skills.len() < initial_len;
    });

    if removed {
        Ok(true)
    } else {
        Err(format!("Skill '{}' not found", skill_id))
    }
}

/// Get all skill categories with counts
#[tauri::command]
#[allow(dead_code)]
pub fn get_skill_categories(
    shared_state: State<'_, SharedState>,
) -> Vec<SkillCategory> {
    shared_state.read(|state| {
        let mut categories: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

        for skill in &state.skills {
            if skill.enabled {
                *categories.entry(skill.category.clone()).or_insert(0) += 1;
            }
        }

        categories.into_iter()
            .map(|(name, count)| SkillCategory { name, count })
            .collect()
    })
}

/// Toggle skill enabled state
#[tauri::command]
#[allow(dead_code)]
pub fn toggle_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<bool, String> {
    let mut toggled = false;

    shared_state.write(|state| {
        if let Some(skill) = state.skills.iter_mut().find(|s| s.id == skill_id) {
            skill.enabled = !skill.enabled;
            skill.updated_at = chrono::Utc::now().timestamp_millis() as u64;
            toggled = true;
        }
    });

    if toggled {
        Ok(true)
    } else {
        Err(format!("Skill '{}' not found", skill_id))
    }
}

/// Import skill from JSON
#[tauri::command]
#[allow(dead_code)]
pub fn import_skill(
    shared_state: State<'_, SharedState>,
    skill_json: Value,
) -> Result<Skill, String> {
    let mut skill: Skill = serde_json::from_value(skill_json)
        .map_err(|e| format!("Invalid skill JSON: {}", e))?;

    if skill.id.is_empty() || shared_state.read(|state| state.skills.iter().any(|s| s.id == skill.id)) {
        skill.id = uuid::Uuid::new_v4().to_string();
    }

    let now = chrono::Utc::now().timestamp_millis() as u64;
    skill.created_at = now;
    skill.updated_at = now;

    shared_state.write(|state| {
        state.skills.push(skill.clone());
    });

    Ok(skill)
}

/// Export skill to JSON
#[tauri::command]
#[allow(dead_code)]
pub fn export_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<Value, String> {
    let skill = shared_state.read(|state| {
        match state.skills.iter().find(|s| s.id == skill_id) {
            Some(s) => Ok(s.clone()),
            None => Err(format!("Skill '{}' not found", skill_id)),
        }
    })?;

    serde_json::to_value(skill)
        .map_err(|e| format!("Failed to serialize skill: {}", e))
}

/// Get skills by category
#[tauri::command]
#[allow(dead_code)]
pub fn get_skills_by_category(
    shared_state: State<'_, SharedState>,
    category: String,
) -> Vec<Skill> {
    shared_state.read(|state| {
        state.skills.iter()
            .filter(|s| s.category == category && s.enabled)
            .cloned()
            .collect()
    })
}

/// Search skills by name or description
#[tauri::command]
#[allow(dead_code)]
pub fn search_skills(
    shared_state: State<'_, SharedState>,
    query: String,
    limit: i32,
) -> Vec<Skill> {
    let query_lower = query.to_lowercase();

    shared_state.read(|state| {
        let matching: Vec<Skill> = state.skills.iter()
            .filter(|s| {
                s.name.to_lowercase().contains(&query_lower) ||
                s.description.to_lowercase().contains(&query_lower)
            })
            .cloned()
            .collect();

        if limit > 0 && limit < matching.len() as i32 {
            matching.into_iter().take(limit as usize).collect()
        } else {
            matching
        }
    })
}

/// Skill statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStats {
    pub total_skills: usize,
    pub enabled_skills: usize,
    pub disabled_skills: usize,
    pub categories: Vec<SkillCategory>,
    pub total_executions: usize,
    pub avg_execution_time_ms: f64,
}

/// Get skill statistics
#[tauri::command]
#[allow(dead_code)]
pub fn get_skill_stats(
    shared_state: State<'_, SharedState>,
) -> SkillStats {
    shared_state.read(|state| {
        let total_skills = state.skills.len();
        let enabled_skills = state.skills.iter().filter(|s| s.enabled).count();
        let disabled_skills = total_skills - enabled_skills;
        
        // Build categories
        let mut category_map: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        for skill in &state.skills {
            *category_map.entry(skill.category.clone()).or_insert(0) += 1;
        }
        
        let categories: Vec<SkillCategory> = category_map.into_iter()
            .map(|(name, count)| SkillCategory { name, count })
            .collect();
        
        SkillStats {
            total_skills,
            enabled_skills,
            disabled_skills,
            categories,
            total_executions: 0, // TODO: Track executions in state
            avg_execution_time_ms: 0.0, // TODO: Track execution times
        }
    })
}

/// Install skill from ZIP file path
#[tauri::command]
#[allow(dead_code)]
pub async fn install_skill_from_zip(
    shared_state: State<'_, SharedState>,
    zip_path: String,
    overwrite: bool,
) -> Result<Vec<Skill>, String> {
    use std::fs::File;
    use std::io::Read;
    
    let file = File::open(&zip_path)
        .map_err(|e| format!("Failed to open ZIP file: {}", e))?;
    
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;
    
    let mut installed_skills = Vec::new();
    
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;
        
        let file_name = file.name().to_string();
        
        // Only process JSON files
        if !file_name.ends_with(".json") {
            continue;
        }
        
        let mut contents = String::new();
        file.read_to_string(&mut contents)
            .map_err(|e| format!("Failed to read file contents: {}", e))?;
        
        // Parse skill from JSON
        let mut skill: Skill = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse skill JSON: {}", e))?;
        
        // Check if skill already exists
        let exists = shared_state.read(|state| {
            state.skills.iter().any(|s| s.id == skill.id || s.name == skill.name)
        });
        
        if exists && !overwrite {
            continue; // Skip existing skills unless overwrite is true
        }
        
        // Generate new ID and timestamps
        if exists && overwrite {
            // Remove old skill
            shared_state.write(|state| {
                state.skills.retain(|s| s.id != skill.id && s.name != skill.name);
            });
        }
        
        skill.id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis() as u64;
        skill.created_at = now;
        skill.updated_at = now;
        
        // Add skill
        shared_state.write(|state| {
            state.skills.push(skill.clone());
        });
        
        installed_skills.push(skill);
    }
    
    Ok(installed_skills)
}

/// Reindex all skills (refresh categories and metadata)
#[tauri::command]
#[allow(dead_code)]
pub fn reindex_skills(
    shared_state: State<'_, SharedState>,
) -> Result<usize, String> {
    let count = shared_state.read(|state| {
        // Update timestamps for all skills
        let count = state.skills.len();
        count
    });
    
    // Update all skill timestamps to mark them as reindexed
    let now = chrono::Utc::now().timestamp_millis() as u64;
    shared_state.write(|state| {
        for skill in &mut state.skills {
            skill.updated_at = now;
        }
    });
    
    Ok(count)
}

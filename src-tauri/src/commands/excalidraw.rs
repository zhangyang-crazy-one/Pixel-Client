//! Excalidraw commands - scene persistence
//! Compatible with official @excalidraw/excalidraw JSON format

use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, Emitter};
use crate::PixelState;

/// Excalidraw scene data - compatible with official format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcalidrawSceneData {
    #[serde(rename = "type")]
    pub schema_type: String,
    pub version: u32,
    pub source: String,
    pub elements: Vec<Value>,
    #[serde(rename = "appState")]
    pub app_state: Value,
    pub files: Value,
}

impl Default for ExcalidrawSceneData {
    fn default() -> Self {
        Self {
            schema_type: "excalidraw".to_string(),
            version: 2,
            source: "https://pixel-client.tauri".to_string(),
            elements: Vec::new(),
            app_state: json!({
                "scrollX": 0,
                "scrollY": 0,
                "zoom": { "value": 1 },
                "gridSize": null,
                "viewBackgroundColor": "#ffffff",
                "theme": "dark",
                "activeTool": { "type": "selection" },
                "selectedElementIds": {},
            }),
            files: json!({}),
        }
    }
}

/// Scene info for listing
#[derive(Debug, Clone, Serialize)]
pub struct SceneInfo {
    pub id: String,
    #[serde(rename = "conversationId")]
    pub conversation_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    #[serde(rename = "updatedAt")]
    pub updated_at: u64,
    #[serde(rename = "elementCount")]
    pub element_count: usize,
    pub name: Option<String>,
}

/// Get scenes directory path
fn get_scenes_dir(app: &tauri::AppHandle) -> PathBuf {
    let resource_dir = app.path().resource_dir().unwrap_or_else(|_| PathBuf::from("resources"));
    let scenes_dir = resource_dir.join("excalidraw_scenes");
    if !scenes_dir.exists() {
        let _ = fs::create_dir_all(&scenes_dir);
    }
    scenes_dir
}

/// Get scene file path
fn get_scene_path(app: &tauri::AppHandle, scene_id: &str) -> PathBuf {
    get_scenes_dir(app).join(format!("{}.json", scene_id))
}

/// Save Excalidraw scene to disk - compatible with official format
#[tauri::command]
#[allow(dead_code)]
pub async fn save_excalidraw_scene(
    conversation_id: String,
    elements_json: String,
    app_state_json: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    let now = chrono::Utc::now().timestamp_millis() as u64;
    
    // Generate scene ID
    let scene_id = format!("excalidraw_{}", uuid::Uuid::new_v4());
    
    // Parse and validate JSON
    let elements: Value = serde_json::from_str(&elements_json)
        .map_err(|e| format!("Failed to parse elements JSON: {}", e))?;
    
    let app_state: Value = serde_json::from_str(&app_state_json)
        .map_err(|e| format!("Failed to parse appState JSON: {}", e))?;
    
    // Build scene data compatible with official Excalidraw format
    let scene_data = ExcalidrawSceneData {
        schema_type: "excalidraw".to_string(),
        version: 2,
        source: "https://pixel-client.tauri".to_string(),
        elements: elements.as_array()
            .cloned()
            .unwrap_or_else(|| Vec::new()),
        app_state,
        files: json!({}),
    };
    
    // Serialize to JSON
    let json_str = serde_json::to_string_pretty(&scene_data)
        .map_err(|e| format!("Failed to serialize scene: {}", e))?;
    
    // Save to file
    let path = get_scene_path(&app_handle, &scene_id);
    fs::write(&path, &json_str)
        .map_err(|e| format!("Failed to write scene file: {}", e))?;
    
    // Emit save event
    let _ = app_handle.emit("excalidraw:saved", &json!({
        "sceneId": scene_id,
        "conversationId": conversation_id,
        "updatedAt": now,
    }));
    
    Ok(scene_id)
}

/// Load Excalidraw scene from disk
#[tauri::command]
#[allow(dead_code)]
pub async fn load_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<ExcalidrawSceneData, String> {
    let app_handle = state.app_handle.get();
    let path = get_scene_path(&app_handle, &scene_id);
    
    if !path.exists() {
        return Err(format!("Scene not found: {}", scene_id));
    }
    
    let json_str = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read scene file: {}", e))?;
    
    let scene: ExcalidrawSceneData = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse scene: {}", e))?;
    
    Ok(scene)
}

/// List all scenes for a conversation
#[tauri::command]
#[allow(dead_code)]
pub async fn list_excalidraw_scenes(
    conversation_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<Vec<SceneInfo>, String> {
    let app_handle = state.app_handle.get();
    let scenes_dir = get_scenes_dir(&app_handle);
    
    if !scenes_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut scenes: Vec<SceneInfo> = Vec::new();
    
    for entry in fs::read_dir(&scenes_dir)
        .map_err(|e| format!("Failed to read scenes directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Ok(json_str) = fs::read_to_string(&path) {
                if let Ok(scene) = serde_json::from_str::<ExcalidrawSceneData>(&json_str) {
                    // Check if scene belongs to this conversation
                    // For now, we store conversation_id in metadata or check elements
                    // Simplified: return all scenes from the scenes directory
                    let metadata = extract_scene_metadata(&path);
                    
                    if metadata.conversation_id == conversation_id || metadata.conversation_id.is_empty() {
                        scenes.push(SceneInfo {
                            id: path.file_stem()
                                .and_then(|n| n.to_str().map(|s| s.to_string()))
                                .unwrap_or_default(),
                            conversation_id: metadata.conversation_id,
                            created_at: metadata.created_at,
                            updated_at: metadata.updated_at,
                            element_count: scene.elements.len(),
                            name: scene.app_state.get("name")
                                .and_then(|v| v.as_str().map(|s| s.to_string())),
                        });
                    }
                }
            }
        }
    }
    
    // Sort by updated time descending
    scenes.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    
    Ok(scenes)
}

/// Delete Excalidraw scene
#[tauri::command]
#[allow(dead_code)]
pub async fn delete_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<(), String> {
    let app_handle = state.app_handle.get();
    let path = get_scene_path(&app_handle, &scene_id);
    
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to delete scene file: {}", e))?;
    }
    
    Ok(())
}

/// Export scene as JSON string (official format)
#[tauri::command]
#[allow(dead_code)]
pub async fn export_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    let path = get_scene_path(&app_handle, &scene_id);
    
    if !path.exists() {
        return Err(format!("Scene not found: {}", scene_id));
    }
    
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read scene: {}", e))
}

/// Import scene from JSON string (official format)
#[tauri::command]
#[allow(dead_code)]
pub async fn import_excalidraw_scene(
    conversation_id: String,
    json_str: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    let now = chrono::Utc::now().timestamp_millis() as u64;
    
    // Parse and validate
    let mut scene: ExcalidrawSceneData = serde_json::from_str(&json_str)
        .map_err(|e| format!("Invalid scene JSON: {}", e))?;
    
    // Update metadata
    scene.version = 2;
    scene.source = "https://pixel-client.tauri".to_string();
    
    // Generate new scene ID
    let scene_id = format!("excalidraw_{}", uuid::Uuid::new_v4());
    
    // Save file
    let path = get_scene_path(&app_handle, &scene_id);
    let json = serde_json::to_string_pretty(&scene)
        .map_err(|e| format!("Failed to serialize scene: {}", e))?;
    
    fs::write(&path, &json)
        .map_err(|e| format!("Failed to write scene: {}", e))?;
    
    // Emit import event
    let _ = app_handle.emit("excalidraw:imported", &json!({
        "sceneId": scene_id,
        "conversationId": conversation_id,
        "createdAt": now,
    }));
    
    Ok(scene_id)
}

/// Get scene metadata from file
#[derive(Debug, Default)]
struct SceneMetadata {
    conversation_id: String,
    created_at: u64,
    updated_at: u64,
}

fn extract_scene_metadata(path: &PathBuf) -> SceneMetadata {
    let mut metadata = SceneMetadata::default();
    
    if let Ok(json_str) = fs::read_to_string(path) {
        if let Ok(scene) = serde_json::from_str::<ExcalidrawSceneData>(&json_str) {
            metadata.updated_at = scene.app_state.get("updated")
                .and_then(|v| v.as_u64())
                .unwrap_or_else(|| {
                    path.metadata()
                        .and_then(|m| m.modified())
                        .ok()
                        .and_then(|t| t.elapsed().ok())
                        .map(|_| chrono::Utc::now().timestamp_millis() as u64)
                        .unwrap_or(0)
                });
        }
    }
    
    // Fallback to file metadata
    if metadata.updated_at == 0 {
        if let Ok(m) = path.metadata() {
            if let Ok(ctime) = m.created() {
                metadata.created_at = ctime.elapsed()
                    .map(|t| t.as_millis() as u64)
                    .unwrap_or(0);
            }
            if let Ok(mtime) = m.modified() {
                metadata.updated_at = mtime.elapsed()
                    .map(|t| t.as_millis() as u64)
                    .unwrap_or(0);
            }
        }
    }
    
    metadata
}

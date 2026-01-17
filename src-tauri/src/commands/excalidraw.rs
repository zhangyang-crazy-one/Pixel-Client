//! Excalidraw commands - scene persistence
//! Compatible with official @excalidraw/excalidraw JSON format

use base64::{Engine as _, engine::general_purpose};
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, Emitter};
use crate::state::PixelState;

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

/// Get exports directory path
fn get_exports_dir(app: &tauri::AppHandle) -> PathBuf {
    let resource_dir = app.path().resource_dir().unwrap_or_else(|_| PathBuf::from("resources"));
    let exports_dir = resource_dir.join("excalidraw_exports");
    if !exports_dir.exists() {
        let _ = fs::create_dir_all(&exports_dir);
    }
    exports_dir
}

/// Save Excalidraw image (PNG) to disk - Base64 version (fallback)
#[tauri::command]
#[allow(dead_code)]
pub async fn save_excalidraw_image(
    scene_id: String,
    image_data: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    let exports_dir = get_exports_dir(&app_handle);

    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let base64_content = image_data
        .strip_prefix("data:image/png;base64,")
        .or_else(|| image_data.strip_prefix("data:image/jpeg;base64,"))
        .unwrap_or(&image_data);

    // Decode base64
    let image_bytes = general_purpose::STANDARD
        .decode(base64_content)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    // Generate filename with timestamp
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("excalidraw_{}_{}.png", scene_id, timestamp);
    let path = exports_dir.join(&filename);

    // Save to file
    fs::write(&path, &image_bytes)
        .map_err(|e| format!("Failed to write PNG file: {}", e))?;

    // Emit save event
    let _ = app_handle.emit("excalidraw:image-saved", &json!({
        "sceneId": scene_id,
        "path": path.to_string_lossy().to_string(),
        "filename": filename,
        "size": image_bytes.len(),
    }));

    Ok(path.to_string_lossy().to_string())
}

/// Save Excalidraw image (PNG) using raw binary IPC - Tauri v2 optimized
/// This version receives raw bytes directly without base64 encoding overhead
#[tauri::command]
#[allow(dead_code)]
pub async fn save_excalidraw_image_raw(
    request: tauri::ipc::Request<'_>,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    use tauri::ipc::InvokeBody;
    
    // Extract raw binary data from request body
    let image_bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes.clone(),
        InvokeBody::Json(value) => {
            // Fallback: try to extract from JSON if raw not available
            if let Some(arr) = value.as_array() {
                arr.iter()
                    .filter_map(|v| v.as_u64().map(|n| n as u8))
                    .collect()
            } else {
                return Err("Expected raw binary data or byte array".into());
            }
        }
    };

    if image_bytes.is_empty() {
        return Err("Empty image data received".into());
    }

    // Extract scene_id from headers or use default
    let scene_id = request
        .headers()
        .get("X-Scene-Id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("default")
        .to_string();

    let app_handle = state.app_handle.get();
    let exports_dir = get_exports_dir(&app_handle);

    // Generate filename with timestamp
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("excalidraw_{}_{}.png", scene_id, timestamp);
    let path = exports_dir.join(&filename);

    // Save to file
    fs::write(&path, &image_bytes)
        .map_err(|e| format!("Failed to write PNG file: {}", e))?;

    // Emit save event
    let _ = app_handle.emit("excalidraw:image-saved", &json!({
        "sceneId": scene_id,
        "path": path.to_string_lossy().to_string(),
        "filename": filename,
        "size": image_bytes.len(),
    }));

    Ok(path.to_string_lossy().to_string())
}

/// Get list of exported images for a scene
#[tauri::command]
#[allow(dead_code)]
pub async fn list_excalidraw_exports(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<Vec<ExportInfo>, String> {
    let app_handle = state.app_handle.get();
    let exports_dir = get_exports_dir(&app_handle);

    if !exports_dir.exists() {
        return Ok(Vec::new());
    }

    let mut exports: Vec<ExportInfo> = Vec::new();
    let prefix = format!("excalidraw_{}_", scene_id);

    for entry in fs::read_dir(&exports_dir)
        .map_err(|e| format!("Failed to read exports directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) == Some("png") {
            if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                if name.starts_with(&prefix) {
                    let metadata = path.metadata()
                        .map_err(|e| format!("Failed to read metadata: {}", e))?;

                    exports.push(ExportInfo {
                        filename: path.file_name()
                            .and_then(|n| n.to_str().map(|s| s.to_string()))
                            .unwrap_or_default(),
                        path: path.to_string_lossy().to_string(),
                        size: metadata.len(),
                        created_at: metadata.created()
                            .ok()
                            .and_then(|t| t.elapsed().ok())
                            .map(|t| t.as_millis() as u64)
                            .unwrap_or(0),
                    });
                }
            }
        }
    }

    // Sort by creation time descending
    exports.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(exports)
}

/// Export info struct
#[derive(Debug, Clone, Serialize)]
pub struct ExportInfo {
    pub filename: String,
    pub path: String,
    pub size: u64,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
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

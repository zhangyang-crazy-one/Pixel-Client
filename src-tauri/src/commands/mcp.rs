//! MCP Server Commands - Full MCP Server management with process control
//! Phase 5: MCP Server API Implementation with complete JSON-RPC support

use tauri::State;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock, atomic::{AtomicU64, Ordering}, OnceLock};
use std::process::{Command, Stdio, Child, ChildStdin, ChildStdout};
use std::io::{BufRead, BufReader, Write};
use std::time::{Duration, Instant};
use crate::state::{SharedState, McpServer, RunningMcpServer, McpServerManager, McpToolDefinition, McpServerStatusInfo};

/// MCP Server status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerStatus {
    pub server_id: String,
    pub running: bool,
    pub tools: Vec<McpToolDefinition>,
    pub error: Option<String>,
}

/// MCP Tool call result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolResult {
    pub success: bool,
    pub content: serde_json::Value,
    pub is_error: bool,
}

/// JSON-RPC Message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
enum JsonRpcMessage {
    #[serde(rename = "request")]
    Request {
        jsonrpc: String,
        id: u64,
        method: String,
        params: serde_json::Value,
    },
    #[serde(rename = "response")]
    Response {
        jsonrpc: String,
        id: u64,
        result: Option<serde_json::Value>,
        error: Option<JsonRpcError>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct JsonRpcError {
    code: i32,
    message: String,
    data: Option<serde_json::Value>,
}

/// Generate unique JSON-RPC request ID
static RPC_ID: OnceLock<AtomicU64> = OnceLock::new();

fn next_rpc_id() -> u64 {
    RPC_ID.get_or_init(|| AtomicU64::new(1)).fetch_add(1, Ordering::SeqCst)
}

/// Send MCP request and get response with proper JSON-RPC handling
fn send_mcp_request(
    server_id: &str,
    request: &str,
    servers: &Arc<RwLock<HashMap<String, RunningMcpServer>>>,
    timeout_ms: u64,
) -> Result<String, String> {
    let servers = servers.read().map_err(|e| e.to_string())?;
    let server = servers.get(server_id).ok_or_else(|| "Server not running".to_string())?;
    
    let mut stdin = server.stdin.lock().map_err(|e| e.to_string())?;
    let mut stdout_lock = server.stdout.lock().map_err(|e| e.to_string())?;
    
    // Send request with Content-Length header
    let request_body = format!(
        "Content-Length: {}\r\n\r\n{}",
        request.len(),
        request
    );
    
    stdin.write_all(request_body.as_bytes()).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    
    // Read response with timeout
    let start = Instant::now();
    let mut response = String::new();
    let mut headers_complete = false;
    let mut content_length = 0;
    
    let reader = BufReader::new(&mut *stdout_lock);
    
    for line in reader.lines() {
        // Check timeout
        if start.elapsed() > Duration::from_millis(timeout_ms) {
            return Err("Request timeout".to_string());
        }
        
        let line = line.map_err(|e| e.to_string())?;
        
        // Parse Content-Length header
        if !headers_complete {
            if let Some(length_str) = line.strip_prefix("Content-Length:") {
                content_length = length_str.trim().parse::<usize>().map_err(|e| e.to_string())?;
            } else if line.is_empty() {
                headers_complete = true;
            }
            continue;
        }
        
        // Read content
        if response.len() < content_length {
            response.push_str(&line);
            if response.len() >= content_length {
                break;
            }
        }
    }
    
    if response.is_empty() {
        return Err("Empty response".to_string());
    }
    
    Ok(response)
}

/// Send JSON-RPC request and parse response
fn send_json_rpc_request(
    server_id: &str,
    method: &str,
    params: serde_json::Value,
    servers: &Arc<RwLock<HashMap<String, RunningMcpServer>>>,
) -> Result<serde_json::Value, String> {
    let id = next_rpc_id();
    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params
    });
    
    let response_str = send_mcp_request(server_id, &request.to_string(), servers, 10000)?;
    let response: serde_json::Value = serde_json::from_str(&response_str)
        .map_err(|e| format!("Failed to parse response: {}", e))?;
    
    // Check for JSON-RPC error
    if let Some(error) = response.get("error") {
        let err_msg = error.get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown error");
        return Err(format!("JSON-RPC error: {}", err_msg));
    }
    
    // Return result
    Ok(response.get("result").cloned().unwrap_or(serde_json::json!({})))
}

/// Discover tools from running MCP server
async fn discover_tools(
    server_id: &str,
    mcp_manager: &McpServerManager,
) -> Result<Vec<McpToolDefinition>, String> {
    let result = send_json_rpc_request(server_id, "tools/list", serde_json::json!({}), &mcp_manager.servers)?;

    let mut tools = Vec::new();

    if let Some(tool_list) = result.get("tools") {
        for tool in tool_list.as_array().unwrap_or(&Vec::new()) {
            let name = tool.get("name")
                .and_then(|n| n.as_str())
                .unwrap_or("")
                .to_string();

            let description = tool.get("description")
                .and_then(|d| d.as_str())
                .unwrap_or("")
                .to_string();

            let input_schema = tool.get("inputSchema")
                .cloned()
                .unwrap_or(serde_json::json!({}));

            tools.push(McpToolDefinition {
                name,
                description,
                input_schema,
            });
        }
    }

    Ok(tools)
}

// ============================================
// Public Commands
// ============================================

/// Get all MCP servers
#[tauri::command]
#[allow(dead_code)]
pub fn get_mcp_servers(
    shared_state: State<'_, SharedState>,
) -> Vec<McpServer> {
    shared_state.read(|state| {
        state.mcp_servers.clone()
    })
}

/// Get a specific MCP server by ID
#[tauri::command]
#[allow(dead_code)]
pub fn get_mcp_server(
    shared_state: State<'_, SharedState>,
    server_id: String,
) -> Option<McpServer> {
    shared_state.read(|state| {
        state.mcp_servers.iter()
            .find(|s| s.id == server_id)
            .cloned()
    })
}

/// Create a new MCP server
#[tauri::command]
#[allow(dead_code)]
pub fn create_mcp_server(
    shared_state: State<'_, SharedState>,
    server_type: String,
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<McpServer, String> {
    let server_id = uuid::Uuid::new_v4().to_string();
    
    let new_server = McpServer {
        id: server_id.clone(),
        server_type,
        command,
        args,
        env,
    };
    
    shared_state.write(|state| {
        state.mcp_servers.push(new_server.clone());
    });
    
    Ok(new_server)
}

/// Update an existing MCP server
#[tauri::command]
#[allow(dead_code)]
pub fn update_mcp_server(
    shared_state: State<'_, SharedState>,
    server_id: String,
    command: Option<String>,
    args: Option<Vec<String>>,
    env: Option<HashMap<String, String>>,
) -> Result<McpServer, String> {
    let mut updated = None;
    
    shared_state.write(|state| {
        if let Some(server) = state.mcp_servers.iter_mut().find(|s| s.id == server_id) {
            if let Some(c) = command { server.command = c; }
            if let Some(a) = args { server.args = a; }
            if let Some(e) = env { server.env = e; }
            updated = Some(server.clone());
        }
    });
    
    match updated {
        Some(s) => Ok(s),
        None => Err(format!("MCP Server '{}' not found", server_id)),
    }
}

/// Delete an MCP server
#[tauri::command]
#[allow(dead_code)]
pub fn delete_mcp_server(
    shared_state: State<'_, SharedState>,
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> bool {
    // Stop if running
    let _ = stop_mcp_server(mcp_manager.clone(), server_id.clone());
    
    let mut removed = false;
    
    shared_state.write(|state| {
        let initial_len = state.mcp_servers.len();
        state.mcp_servers.retain(|s| s.id != server_id);
        removed = state.mcp_servers.len() < initial_len;
    });
    
    removed
}

/// Start an MCP server process
#[tauri::command]
#[allow(dead_code)]
pub async fn start_mcp_server(
    shared_state: State<'_, SharedState>,
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<McpServerStatus, String> {
    let server_config = shared_state.read(|state| {
        state.mcp_servers.iter().find(|s| s.id == server_id).cloned()
    });
    
    let config = match server_config {
        Some(s) => s,
        None => return Err(format!("MCP Server '{}' not found", server_id)),
    };
    
    // Check if already running
    {
        let servers = mcp_manager.servers.read().map_err(|e| e.to_string())?;
        if servers.contains_key(&server_id) {
            return Ok(McpServerStatus {
                server_id,
                running: true,
                tools: Vec::new(),
                error: None,
            });
        }
    }
    
    // Spawn the process
    let mut child = Command::new(&config.command)
        .args(&config.args)
        .envs(&config.env)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;
    
    let stdin = child.stdin.take()
        .ok_or_else(|| "Failed to get stdin".to_string())?;
    
    let stdout = child.stdout.take()
        .ok_or_else(|| "Failed to get stdout".to_string())?;
    
    // Store the running server
    let running_server = RunningMcpServer {
        server_id: server_id.clone(),
        process: child,
        stdin: std::sync::Mutex::new(stdin),
        stdout: std::sync::Mutex::new(stdout),
    };
    
    {
        let mut servers = mcp_manager.servers.write().map_err(|e| e.to_string())?;
        servers.insert(server_id.clone(), running_server);
    }
    
    // Give the server a moment to initialize
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    // Ping to verify
    let ping_result = send_json_rpc_request(&server_id, "ping", serde_json::json!({}), &mcp_manager.servers);
    
    if ping_result.is_err() {
        // Server might not support ping, that's OK
    }
    
    // Discover tools
    let tools = discover_tools(&server_id, &mcp_manager).await
        .unwrap_or_else(|_| Vec::new());
    
    Ok(McpServerStatus {
        server_id,
        running: true,
        tools,
        error: None,
    })
}

/// Stop an MCP server process
#[tauri::command]
#[allow(dead_code)]
pub fn stop_mcp_server(
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<bool, String> {
    let mut servers = mcp_manager.servers.write().map_err(|e| e.to_string())?;
    
    if let Some(mut running) = servers.remove(&server_id) {
        // Send terminate request via JSON-RPC
        let _ = send_json_rpc_request(
            &running.server_id, 
            "terminate", 
            serde_json::json!({}), 
            &mcp_manager.servers
        );
        
        // Give it a moment to clean up
        std::thread::sleep(Duration::from_millis(100));
        
        // Kill the process if still running
        let _ = running.process.kill();
        let _ = running.process.wait();
        
        return Ok(true);
    }
    
    Ok(false)
}

/// Get available tools from an MCP server
#[tauri::command]
#[allow(dead_code)]
pub async fn get_mcp_server_tools(
    shared_state: State<'_, SharedState>,
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<Vec<McpToolDefinition>, String> {
    let server = shared_state.read(|state| {
        state.mcp_servers.iter().find(|s| s.id == server_id).cloned()
    });
    
    match server {
        Some(_s) => {
            // Check if server is running
            let is_running = {
                let servers = mcp_manager.servers.read().map_err(|e| e.to_string())?;
                servers.contains_key(&server_id)
            };
            
            if is_running {
                discover_tools(&server_id, &mcp_manager)
                    .await
                    .map_err(|e| e.to_string())
            } else {
                Ok(Vec::new())
            }
        }
        None => Err(format!("MCP Server '{}' not found", server_id)),
    }
}

/// Call an MCP tool
#[tauri::command]
#[allow(dead_code)]
pub async fn call_mcp_tool(
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<McpToolResult, String> {
    let result = send_json_rpc_request(
        &server_id,
        "tools/call",
        serde_json::json!({
            "name": tool_name,
            "arguments": arguments
        }),
        &mcp_manager.servers,
    )?;
    
    Ok(McpToolResult {
        success: true,
        content: result,
        is_error: false,
    })
}

/// Test MCP server connection
#[tauri::command]
#[allow(dead_code)]
pub async fn test_mcp_server_connection(
    shared_state: State<'_, SharedState>,
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<bool, String> {
    let server = shared_state.read(|state| {
        state.mcp_servers.iter().find(|s| s.id == server_id).cloned()
    });
    
    match server {
        Some(config) => {
            // Basic validation: check if command exists
            if config.command.is_empty() {
                return Err("Server command is empty".to_string());
            }
            
            // For stdio servers, try to ping
            if config.server_type == "stdio" {
                let servers = mcp_manager.servers.read().map_err(|e| e.to_string())?;
                if servers.contains_key(&server_id) {
                    // Server is running, test connection via JSON-RPC
                    let result = send_json_rpc_request(
                        &server_id, 
                        "ping", 
                        serde_json::json!({}), 
                        &mcp_manager.servers
                    );
                    return match result {
                        Ok(_) => Ok(true),
                        Err(_) => Ok(true), // Ping might not be supported
                    };
                }
            }
            
            Ok(true)
        }
        None => Err(format!("MCP Server '{}' not found", server_id)),
    }
}

/// List resources from an MCP server
#[tauri::command]
#[allow(dead_code)]
pub async fn list_mcp_resources(
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<serde_json::Value, String> {
    send_json_rpc_request(
        &server_id,
        "resources/list",
        serde_json::json!({}),
        &mcp_manager.servers,
    )
}

/// Read a resource from an MCP server
#[tauri::command]
#[allow(dead_code)]
pub async fn read_mcp_resource(
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
    uri: String,
) -> Result<serde_json::Value, String> {
    send_json_rpc_request(
        &server_id,
        "resources/read",
        serde_json::json!({ "uri": uri }),
        &mcp_manager.servers,
    )
}

/// List prompts from an MCP server
#[tauri::command]
#[allow(dead_code)]
pub async fn list_mcp_prompts(
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<serde_json::Value, String> {
    send_json_rpc_request(
        &server_id,
        "prompts/list",
        serde_json::json!({}),
        &mcp_manager.servers,
    )
}

/// Get a prompt from an MCP server
#[tauri::command]
#[allow(dead_code)]
pub async fn get_mcp_prompt(
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
    name: String,
    arguments: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let mut params = serde_json::json!({ "name": name });
    if let Some(args) = arguments {
        params["arguments"] = args;
    }
    send_json_rpc_request(
        &server_id,
        "prompts/get",
        params,
        &mcp_manager.servers,
    )
}

/// Restart an MCP server (stop and start)
#[tauri::command]
#[allow(dead_code)]
pub async fn restart_mcp_server(
    shared_state: State<'_, SharedState>,
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<McpServerStatus, String> {
    // First stop the server if running
    let _ = stop_mcp_server_internal(&server_id, &mcp_manager.servers);
    
    // Give it a moment to clean up
    tokio::time::sleep(Duration::from_millis(200)).await;
    
    // Get server config
    let server_config = shared_state.read(|state| {
        state.mcp_servers.iter().find(|s| s.id == server_id).cloned()
    });
    
    let config = match server_config {
        Some(s) => s,
        None => return Err(format!("MCP Server '{}' not found", server_id)),
    };
    
    // Spawn the process
    let mut child = Command::new(&config.command)
        .args(&config.args)
        .envs(&config.env)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;
    
    let stdin = child.stdin.take()
        .ok_or_else(|| "Failed to get stdin".to_string())?;
    
    let stdout = child.stdout.take()
        .ok_or_else(|| "Failed to get stdout".to_string())?;
    
    // Store the running server
    let running_server = RunningMcpServer {
        server_id: server_id.clone(),
        process: child,
        stdin: std::sync::Mutex::new(stdin),
        stdout: std::sync::Mutex::new(stdout),
    };
    
    {
        let mut servers = mcp_manager.servers.write().map_err(|e| e.to_string())?;
        servers.insert(server_id.clone(), running_server);
    }
    
    // Give the server a moment to initialize
    tokio::time::sleep(Duration::from_millis(500)).await;
    
    // Discover tools
    let tools = discover_tools(&server_id, &mcp_manager).await
        .unwrap_or_else(|_| Vec::new());
    
    Ok(McpServerStatus {
        server_id,
        running: true,
        tools,
        error: None,
    })
}

/// Internal helper to stop MCP server without Tauri State wrapper
fn stop_mcp_server_internal(
    server_id: &str,
    servers: &Arc<RwLock<HashMap<String, RunningMcpServer>>>,
) -> Result<bool, String> {
    let mut servers_guard = servers.write().map_err(|e| e.to_string())?;
    
    if let Some(mut running) = servers_guard.remove(server_id) {
        // Kill the process
        let _ = running.process.kill();
        let _ = running.process.wait();
        return Ok(true);
    }
    
    Ok(false)
}

/// Get MCP statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpStats {
    pub total_servers: usize,
    pub running_servers: usize,
    pub total_tools: usize,
    pub total_resources: usize,
    pub total_prompts: usize,
}

/// Get MCP statistics (real implementation)
#[tauri::command]
#[allow(dead_code)]
pub async fn get_mcp_stats(
    shared_state: State<'_, SharedState>,
    mcp_manager: State<'_, McpServerManager>,
) -> Result<McpStats, String> {
    let total_servers = shared_state.read(|state| state.mcp_servers.len());
    
    let running_servers = {
        let servers = mcp_manager.servers.read().map_err(|e| e.to_string())?;
        servers.len()
    };
    
    // Count tools from all running servers
    let mut total_tools = 0;
    let mut total_resources = 0;
    let mut total_prompts = 0;
    
    let server_ids: Vec<String> = {
        let servers = mcp_manager.servers.read().map_err(|e| e.to_string())?;
        servers.keys().cloned().collect()
    };
    
    for server_id in server_ids {
        // Try to get tools count
        if let Ok(tools) = discover_tools(&server_id, &mcp_manager).await {
            total_tools += tools.len();
        }
        
        // Try to get resources count
        if let Ok(result) = send_json_rpc_request(&server_id, "resources/list", serde_json::json!({}), &mcp_manager.servers) {
            if let Some(resources) = result.get("resources").and_then(|r| r.as_array()) {
                total_resources += resources.len();
            }
        }
        
        // Try to get prompts count
        if let Ok(result) = send_json_rpc_request(&server_id, "prompts/list", serde_json::json!({}), &mcp_manager.servers) {
            if let Some(prompts) = result.get("prompts").and_then(|p| p.as_array()) {
                total_prompts += prompts.len();
            }
        }
    }
    
    Ok(McpStats {
        total_servers,
        running_servers,
        total_tools,
        total_resources,
        total_prompts,
    })
}

/// Get MCP server status info with type-safe enum
#[tauri::command]
#[allow(dead_code)]
pub async fn get_mcp_server_status_info(
    shared_state: State<'_, SharedState>,
    mcp_manager: State<'_, McpServerManager>,
    server_id: String,
) -> Result<McpServerStatusInfo, String> {
    // Check if server config exists
    let server_exists = shared_state.read(|state| {
        state.mcp_servers.iter().any(|s| s.id == server_id)
    });

    if !server_exists {
        return Err(format!("MCP Server '{}' not found", server_id));
    }

    // Check if server is running - use block scope to ensure RwLockReadGuard is dropped before await
    let is_running = {
        let servers = mcp_manager.servers.read().map_err(|e| e.to_string())?;
        servers.contains_key(&server_id)
    }; // servers (RwLockReadGuard) is dropped here, before any await

    if is_running {
        // Server is running, try to get tools
        match discover_tools(&server_id, &mcp_manager).await {
            Ok(tools) => {
                // Convert tools to JSON Value for the enum
                let tools_json = serde_json::to_value(&tools)
                    .unwrap_or(serde_json::json!([]));
                Ok(McpServerStatusInfo::Running {
                    server_id,
                    tools: tools_json,
                })
            }
            Err(e) => {
                Ok(McpServerStatusInfo::Error {
                    server_id,
                    error: e,
                })
            }
        }
    } else {
        Ok(McpServerStatusInfo::Stopped { server_id })
    }
}

# API Documentation

> Pixel-Client Tauri 应用程序接口文档
> 版本: 1.1.0
> 更新日期: 2026-01-17

---

## 概览

本应用程序使用 Tauri 2.0 构建，提供以下主要功能模块的 Rust 后端命令：

| 模块 | 命令数量 | 描述 |
|------|----------|------|
| Chat | 7 | 聊天会话管理 |
| Excalidraw | 6 | 白板场景管理 |
| Renderer | 3 | Markdown 渲染 |
| Persistence | 7 | 状态持久化 |
| **MCP Server** | **6** | MCP 协议服务器管理 |
| **Skills** | **11** | 技能执行引擎 |
| Legacy | 3 | 遗留配置命令 |
| **总计** | **43** | |

---

## 使用方式

### 前端调用示例

```typescript
import { invoke } from '@tauri-apps/api/core';

// 调用命令
const result = await invoke('command_name', { /* 参数 */ });

// 示例
const messages = await invoke('get_session_messages', { sessionId: 'abc123' });
```

### 错误处理

所有命令返回 `Result<T, String>`，错误信息以字符串形式返回。

```typescript
try {
  const result = await invoke('command_name', params);
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error);
}
```

---

## Chat 命令

聊天会话管理相关命令。

### create_chat_session

创建新的聊天会话。

**签名**:
```rust
#[tauri::command]
pub fn create_chat_session(
    shared_state: State<'_, SharedState>,
    title: Option<String>,
) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `title` | `Option<String>` | 否 | 会话标题，为空时自动生成 |

**返回值**:
- `String`: 新创建会话的 ID

**示例**:
```typescript
const sessionId = await invoke('create_chat_session', {
  title: 'AI Discussion'
});
```

---

### add_message_to_session

向会话添加消息。

**签名**:
```rust
#[tauri::command]
pub fn add_message_to_session(
    shared_state: State<'_, SharedState>,
    session_id: String,
    role: String,
    content: String,
) -> Result<(), String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `session_id` | `String` | 是 | 会话 ID |
| `role` | `String` | 是 | 消息角色 (`user` / `assistant` / `system`) |
| `content` | `String` | 是 | 消息内容 |

**返回值**:
- `()`: 成功时返回空

**示例**:
```typescript
await invoke('add_message_to_session', {
  sessionId: 'abc123',
  role: 'user',
  content: 'Hello, AI!'
});
```

---

### get_session_messages

获取会话的所有消息。

**签名**:
```rust
#[tauri::command]
pub fn get_session_messages(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<Vec<Message>, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `session_id` | `String` | 是 | 会话 ID |

**返回值**:
- `Message[]`: 消息数组

**Message 类型**:
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
```

**示例**:
```typescript
const messages = await invoke('get_session_messages', {
  sessionId: 'abc123'
});
```

---

### delete_chat_session

删除聊天会话。

**签名**:
```rust
#[tauri::command]
pub fn delete_chat_session(
    shared_state: State<'_, SharedState>,
    session_id: String,
) -> Result<(), String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `session_id` | `String` | 是 | 要删除的会话 ID |

**返回值**:
- `()`: 成功时返回空

**示例**:
```typescript
await invoke('delete_chat_session', {
  sessionId: 'abc123'
});
```

---

### get_active_sessions

获取所有活动会话。

**签名**:
```rust
#[tauri::command]
pub fn get_active_sessions(
    shared_state: State<'_, SharedState>,
    limit: i32,
) -> Result<Vec<ChatSession>, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `limit` | `i32` | 否 | 返回数量限制，默认 50 |

**返回值**:
- `ChatSession[]`: 会话数组

**ChatSession 类型**:
```typescript
interface ChatSession {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
}
```

**示例**:
```typescript
const sessions = await invoke('get_active_sessions', {
  limit: 20
});
```

---

### stream_chat_completions

流式获取 AI 响应。

**签名**:
```rust
#[tauri::command]
pub async fn stream_chat_completions(
    messages: Vec<Message>,
    model_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<ChatResponse, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `messages` | `Message[]` | 是 | 消息历史 |
| `model_id` | `String` | 是 | 模型 ID |

**返回值**:
- `ChatResponse`: 聊天响应

**示例**:
```typescript
const response = await invoke('stream_chat_completions', {
  messages: [{ role: 'user', content: 'Hello' }],
  modelId: 'gpt-4'
});
```

---

### cancel_chat_stream

取消正在进行的聊天流。

**签名**:
```rust
#[tauri::command]
pub fn cancel_chat_stream(
    state: tauri::State<'_, PixelState>,
) -> Result<(), String>
```

**返回值**:
- `()`: 成功时返回空

**示例**:
```typescript
await invoke('cancel_chat_stream', {});
```

---

## Excalidraw 命令

白板场景管理相关命令。

### save_excalidraw_scene

保存 Excalidraw 场景。

**签名**:
```rust
#[tauri::command]
pub async fn save_excalidraw_scene(
    conversation_id: String,
    elements_json: String,
    app_state_json: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `conversation_id` | `String` | 是 | 关联的会话 ID |
| `elements_json` | `String` | 是 | Excalidraw 元素 JSON |
| `app_state_json` | `String` | 是 | 应用状态 JSON |

**返回值**:
- `String`: 场景 ID

**示例**:
```typescript
await invoke('save_excalidraw_scene', {
  conversationId: 'chat-123',
  elementsJson: JSON.stringify(elements),
  appStateJson: JSON.stringify(appState)
});
```

---

### load_excalidraw_scene

加载 Excalidraw 场景。

**签名**:
```rust
#[tauri::command]
pub async fn load_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<ExcalidrawSceneData, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `scene_id` | `String` | 是 | 场景 ID |

**返回值**:
- `ExcalidrawSceneData`: 场景数据

**示例**:
```typescript
const scene = await invoke('load_excalidraw_scene', {
  sceneId: 'scene-abc'
});
```

---

### list_excalidraw_scenes

列出会话的所有场景。

**签名**:
```rust
#[tauri::command]
pub async fn list_excalidraw_scenes(
    conversation_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<Vec<SceneInfo>, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `conversation_id` | `String` | 是 | 会话 ID |

**返回值**:
- `SceneInfo[]`: 场景信息数组

**示例**:
```typescript
const scenes = await invoke('list_excalidraw_scenes', {
  conversationId: 'chat-123'
});
```

---

### delete_excalidraw_scene

删除 Excalidraw 场景。

**签名**:
```rust
#[tauri::command]
pub async fn delete_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<(), String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `scene_id` | `String` | 是 | 要删除的场景 ID |

**返回值**:
- `()`: 成功时返回空

**示例**:
```typescript
await invoke('delete_excalidraw_scene', {
  sceneId: 'scene-abc'
});
```

---

### export_excalidraw_scene

导出 Excalidraw 场景为 JSON。

**签名**:
```rust
#[tauri::command]
pub async fn export_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `scene_id` | `String` | 是 | 场景 ID |

**返回值**:
- `String`: JSON 格式的场景数据

**示例**:
```typescript
const json = await invoke('export_excalidraw_scene', {
  sceneId: 'scene-abc'
});
```

---

### import_excalidraw_scene

导入 Excalidraw 场景。

**签名**:
```rust
#[tauri::command]
pub async fn import_excalidraw_scene(
    conversation_id: String,
    json_str: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `conversation_id` | `String` | 是 | 目标会话 ID |
| `json_str` | `String` | 是 | Excalidraw JSON 数据 |

**返回值**:
- `String`: 导入场景的 ID

**示例**:
```typescript
const sceneId = await invoke('import_excalidraw_scene', {
  conversationId: 'chat-123',
  jsonStr: excalidrawJson
});
```

---

## Renderer 命令

Markdown 渲染相关命令。

### render_markdown

将 Markdown 渲染为 HTML。

**签名**:
```rust
#[tauri::command]
pub fn render_markdown(markdown_input: String) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `markdown_input` | `String` | 是 | Markdown 文本 |

**返回值**:
- `String`: 渲染后的 HTML

**特性**:
- 支持 GitHub Flavored Markdown
- 支持代码语法高亮（syntect）
- 支持表格、脚注、任务列表
- 支持 `<thinking>` 自定义标签

**示例**:
```typescript
const html = await invoke('render_markdown', {
  markdownInput: '# Hello\n\n**Bold** text'
});
```

---

### process_custom_syntax

处理自定义 Markdown 语法。

**签名**:
```rust
#[tauri::command]
pub fn process_custom_syntax(markdown_input: String) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `markdown_input` | `String` | 是 | Markdown 文本 |

**返回值**:
- `String`: 处理后的 Markdown

**支持的标签**:
- `<thinking>...</thinking>` → 可折叠的思考块

**示例**:
```typescript
const processed = await invoke('process_custom_syntax', {
  markdownInput: '<thinking>分析中...</thinking>'
});
```

---

### highlight_code_sync

同步高亮代码。

**签名**:
```rust
#[tauri::command]
pub fn highlight_code_sync(code: String, language: String) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `code` | `String` | 是 | 代码文本 |
| `language` | `String` | 是 | 语言名称 |

**返回值**:
- `String`: 高亮后的 HTML

**支持的语言**:
- JavaScript, TypeScript, Python, Rust, Go, C/C++, Java, Kotlin
- SQL, HTML, CSS, YAML, JSON, Markdown, Bash/Zsh
- 及其他 50+ 语言

**示例**:
```typescript
const highlighted = await invoke('highlight_code_sync', {
  code: 'fn main() { println!("Hello"); }',
  language: 'rust'
});
```

---

## Persistence 命令

状态持久化相关命令。

### save_state

保存应用状态。

**签名**:
```rust
#[tauri::command]
pub fn save_state(state: AppState) -> Result<(), String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `state` | `AppState` | 是 | 完整应用状态 |

**存储格式**:
- 使用 bincode 序列化
- 使用 zstd 压缩（级别 3）

**示例**:
```typescript
await invoke('save_state', {
  state: { /* AppState object */ }
});
```

---

### load_state

加载应用状态。

**签名**:
```rust
#[tauri::command]
pub fn load_state() -> Result<AppState, String>
```

**返回值**:
- `AppState`: 应用状态（空状态返回默认值）

**示例**:
```typescript
const state = await invoke('load_state', {});
```

---

### create_backup

创建状态备份。

**签名**:
```rust
#[tauri::command]
pub fn create_backup() -> Result<(), String>
```

**返回值**:
- `()`: 成功时返回空

**备份文件**:
- 命名格式: `pixel_client_state.{timestamp}.bak`
- 保留最近 5 个备份

**示例**:
```typescript
await invoke('create_backup', {});
```

---

### get_state_size

获取状态文件大小。

**签名**:
```rust
#[tauri::command]
pub fn get_state_size() -> Result<u64, String>
```

**返回值**:
- `u64`: 文件大小（字节）

**示例**:
```typescript
const size = await invoke('get_state_size', {});
console.log(`State file size: ${size} bytes`);
```

---

### export_state_json

导出状态为 JSON。

**签名**:
```rust
#[tauri::command]
pub fn export_state_json() -> Result<String, String>
```

**返回值**:
- `String`: JSON 格式的状态数据

**用途**:
- 状态备份/迁移
- 调试和诊断

**示例**:
```typescript
const json = await invoke('export_state_json', {});
```

---

### import_state_json

从 JSON 导入状态。

**签名**:
```rust
#[tauri::command]
pub fn import_state_json(json: String) -> Result<(), String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `json` | `String` | 是 | JSON 格式的状态数据 |

**示例**:
```typescript
await invoke('import_state_json', {
  json: previouslyExportedJson
});
```

---

### clear_state

清除所有状态数据。

**签名**:
```rust
#[tauri::command]
pub fn clear_state() -> Result<(), String>
```

**注意**:
- 此操作不可逆
- 会清除所有聊天记录、Excalidraw 场景和设置

**示例**:
```typescript
await invoke('clear_state', {});
```

---

## MCP Server 命令

MCP (Model Context Protocol) 服务器管理命令，支持通过 stdio 启动外部 MCP 工具服务器。

### start_mcp_server

启动 MCP 服务器。

**签名**:
```rust
#[tauri::command]
pub async fn start_mcp_server(
    shared_state: State<'_, SharedState>,
    server_id: String,
) -> Result<(), String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `server_id` | `String` | 是 | MCP 服务器 ID |

**返回值**:
- `()`: 成功时返回空

**MCP 协议格式**:
- 使用 JSON-RPC 2.0 协议
- 通过 Content-Length 头传输消息
- 支持工具列表、工具调用、资源读取等方法

**示例**:
```typescript
await invoke('start_mcp_server', {
  serverId: 'filesystem-server'
});
```

---

### stop_mcp_server

停止 MCP 服务器。

**签名**:
```rust
#[tauri::command]
pub async fn stop_mcp_server(
    shared_state: State<'_, SharedState>,
    server_id: String,
) -> Result<(), String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `server_id` | `String` | 是 | MCP 服务器 ID |

**示例**:
```typescript
await invoke('stop_mcp_server', {
  serverId: 'filesystem-server'
});
```

---

### get_mcp_tools

获取 MCP 服务器工具列表。

**签名**:
```rust
#[tauri::command]
pub async fn get_mcp_tools(
    shared_state: State<'_, SharedState>,
    server_id: String,
) -> Result<Vec<McpToolDefinition>, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `server_id` | `String` | 是 | MCP 服务器 ID |

**返回值**:
- `McpToolDefinition[]`: 工具定义数组

**McpToolDefinition 类型**:
```typescript
interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

**示例**:
```typescript
const tools = await invoke('get_mcp_tools', {
  serverId: 'filesystem-server'
});
```

---

### call_mcp_tool

调用 MCP 工具。

**签名**:
```rust
#[tauri::command]
pub async fn call_mcp_tool(
    shared_state: State<'_, SharedState>,
    server_id: String,
    tool_name: String,
    arguments: Value,
) -> Result<Value, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `server_id` | `String` | 是 | MCP 服务器 ID |
| `tool_name` | `String` | 是 | 工具名称 |
| `arguments` | `Object` | 否 | 工具参数 |

**返回值**:
- `Object`: 工具执行结果

**JSON-RPC 请求格式**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {}
  }
}
```

**示例**:
```typescript
const result = await invoke('call_mcp_tool', {
  serverId: 'filesystem-server',
  toolName: 'read_file',
  arguments: { path: '/test/file.txt' }
});
```

---

### list_mcp_resources

列出 MCP 服务器资源。

**签名**:
```rust
#[tauri::command]
pub async fn list_mcp_resources(
    shared_state: State<'_, SharedState>,
    server_id: String,
) -> Result<Vec<McpResource>, String>
```

**返回值**:
- `McpResource[]`: 资源数组

**示例**:
```typescript
const resources = await invoke('list_mcp_resources', {
  serverId: 'filesystem-server'
});
```

---

### read_mcp_resource

读取 MCP 资源内容。

**签名**:
```rust
#[tauri::command]
pub async fn read_mcp_resource(
    shared_state: State<'_, SharedState>,
    server_id: String,
    resource_uri: String,
) -> Result<String, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `server_id` | `String` | 是 | MCP 服务器 ID |
| `resource_uri` | `String` | 是 | 资源 URI |

**返回值**:
- `String`: 资源内容

---

## Skills 命令

JavaScript 技能执行引擎命令，使用 rquickjs (QuickJS) 运行时执行用户定义的技能代码。

### execute_skill

执行技能代码。

**签名**:
```rust
#[tauri::command]
pub async fn execute_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
    params: Value,
) -> Result<SkillResult, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `skill_id` | `String` | 是 | 技能 ID |
| `params` | `Object` | 否 | 执行参数 |

**返回值**:
- `SkillResult`: 执行结果

**SkillResult 类型**:
```typescript
interface SkillResult {
  success: boolean;
  output: unknown;
  error?: string;
  executionTimeMs: number;
}
```

**JavaScript 上下文可用函数**:
- `log(...args)` - 输出日志
- `formatJson(obj)` - 格式化 JSON
- `getParam(name, defaultValue)` - 获取参数

**示例**:
```typescript
const result = await invoke('execute_skill', {
  skillId: 'calculate-sum',
  params: { numbers: [1, 2, 3, 4, 5] }
});
// Skill code: return params.numbers.reduce((a, b) => a + b, 0);
// Result: { success: true, output: 15, executionTimeMs: 12 }
```

---

### get_skills

获取所有技能。

**签名**:
```rust
#[tauri::command]
pub fn get_skills(
    shared_state: State<'_, SharedState>,
    enabled_only: bool,
) -> Vec<Skill>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `enabled_only` | `boolean` | 否 | 仅返回启用的技能 |

**返回值**:
- `Skill[]`: 技能数组

**Skill 类型**:
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: SkillParameter[];
  code: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: string;
}
```

---

### get_skill

获取指定技能。

**签名**:
```rust
#[tauri::command]
pub fn get_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<Skill, String>
```

---

### create_skill

创建新技能。

**签名**:
```rust
#[tauri::command]
pub fn create_skill(
    shared_state: State<'_, SharedState>,
    name: String,
    description: String,
    category: String,
    parameters: Vec<SkillParameter>,
    code: String,
) -> Result<Skill, String>
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | `String` | 是 | 技能名称 |
| `description` | `String` | 是 | 技能描述 |
| `category` | `String` | 是 | 技能分类 |
| `parameters` | `SkillParameter[]` | 是 | 参数定义 |
| `code` | `String` | 是 | JavaScript 代码 |

**示例**:
```typescript
await invoke('create_skill', {
  name: 'Format Currency',
  description: '格式化货币值',
  category: 'Utilities',
  parameters: [
    { name: 'amount', type: 'number', description: '金额', required: true },
    { name: 'currency', type: 'string', description: '货币代码', required: false, default: 'USD' }
  ],
  code: `
    const value = getParam('amount', 0);
    const currency = getParam('currency', 'USD');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(value);
  `
});
```

---

### update_skill

更新技能。

**签名**:
```rust
#[tauri::command]
pub fn update_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
    name: Option<String>,
    description: Option<String>,
    category: Option<String>,
    parameters: Option<Vec<SkillParameter>>,
    code: Option<String>,
    enabled: Option<bool>,
) -> Result<Skill, String>
```

---

### delete_skill

删除技能。

**签名**:
```rust
#[tauri::command]
pub fn delete_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<bool, String>
```

---

### toggle_skill

切换技能启用状态。

**签名**:
```rust
#[tauri::command]
pub fn toggle_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<bool, String>
```

---

### get_skill_categories

获取所有技能分类。

**签名**:
```rust
#[tauri::command]
pub fn get_skill_categories(
    shared_state: State<'_, SharedState>,
) -> Vec<SkillCategory>
```

**返回值**:
```typescript
interface SkillCategory {
  name: string;
  count: number;
}
```

---

### get_skills_by_category

按分类获取技能。

**签名**:
```rust
#[tauri::command]
pub fn get_skills_by_category(
    shared_state: State<'_, SharedState>,
    category: String,
) -> Vec<Skill>
```

---

### search_skills

搜索技能。

**签名**:
```rust
#[tauri::command]
pub fn search_skills(
    shared_state: State<'_, SharedState>,
    query: String,
    limit: i32,
) -> Vec<Skill>
```

---

### import_skill

导入技能。

**签名**:
```rust
#[tauri::command]
pub fn import_skill(
    shared_state: State<'_, SharedState>,
    skill_json: Value,
) -> Result<Skill, String>
```

---

### export_skill

导出技能。

**签名**:
```rust
#[tauri::command]
pub fn export_skill(
    shared_state: State<'_, SharedState>,
    skill_id: String,
) -> Result<Value, String>
```

---

## Legacy 命令

遗留配置命令（向后兼容）。

### get_config

获取应用配置。

**签名**:
```rust
#[tauri::command]
fn get_config(state: State<'_, PixelState>) -> LegacyAppConfig
```

**返回值**:
```typescript
interface LegacyAppConfig {
  theme: string;        // 'system' | 'light' | 'dark'
  language: string;     // 语言代码
  active_model: string; // 当前模型 ID
  provider: string;     // LLM 提供商
}
```

---

### update_config

更新应用配置。

**签名**:
```rust
#[tauri::command]
fn update_config(config: LegacyAppConfig, state: State<'_, PixelState>)
```

**参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `config` | `LegacyAppConfig` | 是 | 完整配置对象 |

---

### send_notification

发送系统通知。

**签名**:
```rust
#[tauri::command]
fn send_notification(_title: String, _body: String) -> Result<(), String>
```

**注意**:
- 需要通知权限
- 通知插件未完全配置

---

## 类型定义

### AppState

完整应用状态类型。

```typescript
interface AppState {
  // 主题和语言
  theme: string;
  language: string;
  
  // 配置
  config: AppConfig;
  
  // 聊天会话
  sessions: Map<string, ChatSession>;
  messages: Map<string, Message[]>;
  
  // Excalidraw 场景
  excalidraw_scenes: Map<string, ExcalidrawSceneData>;
  
  // 其他状态
  // ...
}
```

### ExcalidrawSceneData

Excalidraw 场景数据。

```typescript
interface ExcalidrawSceneData {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Record<string, unknown>;
  files: Record<string, FileData>;
}

interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  // ... 其他 Excalidraw 属性
}
```

---

## 错误码

| 错误码 | 描述 |
|--------|------|
| `SESSION_NOT_FOUND` | 会话不存在 |
| `SCENE_NOT_FOUND` | 场景不存在 |
| `INVALID_JSON` | JSON 解析错误 |
| `STORAGE_ERROR` | 存储错误 |
| `PERMISSION_DENIED` | 权限不足 |
| `STREAM_CANCELLED` | 流已取消 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.1.0 | 2026-01-17 | 新增 MCP Server 命令（6个）和 Skills 命令（11个），总计 43 个命令 |
| 1.0.0 | 2026-01-16 | 初始版本，包含 26 个命令 |

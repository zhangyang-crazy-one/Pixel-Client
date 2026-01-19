---
name: tauri-main
description: |
  Tauri 主进程和系统开发规范 (适用于 Tauri v2)。

  触发场景：
  - 开发 Tauri 命令 (commands)
  - IPC 通信 (@tauri-apps/api)
  - Rust 后端开发
  - 状态管理 (AppState)
  - 持久化 (bincode + zstd)

  触发词：Tauri、主进程、IPC、@tauri、invoke、listen、Rust、cargo、tauri.conf.json
---

# Tauri 主进程开发规范

> 本项目: Pixel-Client Tauri 迁移 (Rust + React)

## 核心架构

```
pixel-client-tauri/
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # Rust 核心 (commands + state)
│   │   ├── main.rs             # 应用入口
│   │   ├── renderer.rs         # Markdown/代码高亮渲染
│   │   ├── excalidraw.rs       # Excalidraw 场景持久化
│   │   ├── titlebar.rs         # 自定义标题栏
│   │   └── tray.rs             # 系统托盘
│   ├── Cargo.toml              # Rust 依赖
│   ├── tauri.conf.json         # Tauri 配置
│   └── build.rs                # 构建脚本 (syntect 缓存)
├── src/
│   ├── App.tsx                 # React 主组件
│   ├── components/             # React 组件
│   │   ├── TitleBar.tsx        # 标题栏
│   │   ├── ChatInput.tsx       # 聊天输入
│   │   ├── MessageBubble.tsx   # 消息气泡
│   │   └── ConversationList.tsx # 对话列表
│   ├── services/
│   │   └── tauri-api.ts        # Tauri API 封装
│   └── types/                  # TypeScript 类型
└── .github/workflows/ci.yml    # CI/CD
```

## 核心规范

### Tauri IPC 通信模式

```
React 前端 → invoke() → Tauri Rust 命令
React 前端 → listen() → 事件监听 (chat_chunk, chat_stream_end)
```

```typescript
// src/services/tauri-api.ts
import { invoke, listen } from '@tauri-apps/api/core';
import { invoke as invokeRust } from '@tauri-apps/api/tauri';

// 调用 Rust 命令
export const tauriApi = {
  // 配置管理
  getConfig: () => invokeRust('get_config'),
  setConfig: (config: AppConfig) => invokeRust('set_config', { config }),

  // 对话管理
  createConversation: (title: string) => invokeRust('create_conversation', { title }),
  deleteConversation: (id: string) => invokeRust('delete_conversation', { id }),
  getConversations: () => invokeRust('get_conversations'),

  // 消息管理
  addMessage: (conversationId: string, role: 'user' | 'assistant', content: string) =>
    invokeRust('add_message', { conversationId, role, content }),

  // Markdown 渲染
  renderMarkdown: (content: string) => invokeRust('renderer::render_markdown', { content }),
  highlightCode: (code: string, lang: string) => invokeRust('renderer::highlight_code', { code, lang }),

  // 持久化
  saveState: () => invokeRust('save_state_to_disk'),
  loadState: () => invokeRust('load_state_from_disk'),
};

// 事件监听
export function useTauriEvents() {
  useEffect(() => {
    const unlistenChunk = listen<string>('chat_chunk', (event) => {
      // 处理流式数据块
    });

    const unlistenEnd = listen('chat_stream_end', () => {
      // 流结束处理
    });

    return () => {
      unlistenChunk.then((fn) => fn());
      unlistenEnd.then((fn) => fn());
    };
  }, []);
}
```

### Rust 命令定义

```rust
// src-tauri/src/lib.rs

use tauri::{AppHandle, Manager, State, Window};
use serde::{Deserialize, Serialize};
use std::sync::RwLock;
use bincode::{encode, decode};
use zstd::stream::{encode_all, decode_all};
use std::fs;

// 共享状态
pub struct SharedState {
    pub config: RwLock<AppConfig>,
    pub conversations: RwLock<HashMap<String, Conversation>>,
    pub current_conversation_id: RwLock<Option<String>>,
}

#[tauri::command]
pub fn get_config(state: State<'_, SharedState>) -> Result<AppConfig, String> {
    Ok(state.config.read().unwrap().clone())
}

#[tauri::command]
pub fn set_config(state: State<'_, SharedState>, config: AppConfig) -> Result<(), String> {
    *state.config.write().unwrap() = config;
    Ok(())
}

#[tauri::command]
pub fn create_conversation(
    state: State<'_, SharedState>,
    window: Window,
    title: String,
) -> Result<Conversation, String> {
    let id = Uuid::new_v4().to_string();
    let conversation = Conversation {
        id: id.clone(),
        title,
        messages: Vec::new(),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    // 更新状态
    {
        let mut conversations = state.conversations.write().unwrap();
        conversations.insert(id.clone(), conversation.clone());
    }

    // 广播变更
    let _ = window.emit("conversation_changed", serde_json::json!({
        "type": "created",
        "id": id
    }));

    Ok(conversation)
}

// 状态变更广播
fn broadcast_state_change(window: &Window, change_type: &str) {
    let _ = window.emit("app_state_changed", serde_json::json!({
        "type": change_type,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }));
}
```

### 持久化服务 (bincode + zstd)

```rust
// 状态持久化
pub fn save_state_to_disk(app: AppHandle) -> Result<(), String> {
    let state = app.state::<SharedState>();

    let config = state.config.read().unwrap().clone();
    let conversations = state.conversations.read().unwrap().clone();

    let serialized = bincode::serialize(&(config, conversations))
        .map_err(|e| e.to_string())?;

    let compressed = encode_all(std::io::Cursor::new(Vec::new()), &serialized)
        .map_err(|e| e.to_string())?;

    let path = get_state_path(&app);
    let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
    compressed.into_writer(&mut file).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_state_from_disk(app: AppHandle) -> Result<(), String> {
    let path = get_state_path(&app);
    if !path.exists() {
        return Ok(());
    }

    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let compressed = zstd::stream::decode_all(file).map_err(|e| e.to_string())?;
    let (config, conversations): (AppConfig, HashMap<String, Conversation>) =
        bincode::deserialize(&compressed).map_err(|e| e.to_string())?;

    let state = app.state::<SharedState>();
    *state.config.write().unwrap() = config;
    *state.conversations.write().unwrap() = conversations;

    Ok(())
}
```

## Tauri 命令注册

```rust
// src-tauri/src/lib.rs

#[tauri::main]
pub fn main() {
    let shared_state = SharedState {
        config: RwLock::new(AppConfig::default()),
        conversations: RwLock::new(HashMap::new()),
        current_conversation_id: RwLock::new(None),
    };

    tauri::Builder::default()
        .manage(shared_state)
        .invoke_handler(tauri::generate_handler![
            // 配置命令
            get_config,
            set_config,
            // 对话命令
            create_conversation,
            delete_conversation,
            get_conversations,
            // 消息命令
            add_message,
            // 持久化命令
            save_state_to_disk,
            load_state_from_disk,
        ])
        .setup(|app| {
            // 初始化托盘
            setup_tray(app)?;
            // 加载持久化状态
            load_state_from_disk(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Rust 语言开发

当开发 Rust 代码时，使用 rust-analyzer：

### rust-analyzer 功能

| 功能 | 描述 |
|------|------|
| 代码补全 | 上下文感知补全（含生命周期推断） |
| 类型推断 | 显示推断的类型和生命周期 |
| 跳转到定义/实现 | 导航到定义和 trait 实现 |
| 查找引用 | 查找符号的所有使用位置 |
| 悬停文档 | 显示文档和类型信息 |
| 快速修复 | 自动修复错误、实现 trait |
| Cargo 集成 | 构建和测试集成 |

### Cargo 依赖

```toml
# src-tauri/Cargo.toml
[package]
name = "pixel-client-tauri"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["shell-open", "system-tray", "window-all"] }
tauri-build = { version = "2", features = ["codegen"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
bincode = "1"
zstd = "0.13"
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
pulldown-cmark = "0.11"
syntect = "5"
once_cell = "1"
ts-rs = "6"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]

[build-dependencies]
tauri-build = "2"
```

## 禁止事项

- ❌ 禁止在前端直接调用 Rust API（应通过 tauri-api.ts 封装）
- ❌ 禁止在前端直接导入 Rust 模块
- ❌ 禁止跳过 `@tauri-apps/api` 直接使用 Tauri IPC
- ❌ 禁止在 Rust 端使用阻塞操作（应使用 async/.await）

## 参考代码

- `src-tauri/src/lib.rs` - Rust 核心 (commands + state)
- `src/services/tauri-api.ts` - 前端 API 封装
- `src-tauri/tauri.conf.json` - Tauri 配置

## 检查清单

- [ ] 是否使用 `@tauri-apps/api` 进行 IPC 通信
- [ ] Rust 命令是否使用 `#[tauri::command]`
- [ ] 是否正确处理异步操作
- [ ] 是否在 Rust 端实现状态广播
- [ ] 是否正确配置了持久化
- [ ] Rust 代码是否使用 rust-analyzer

# Architecture Documentation

> Pixel-Client Tauri 应用程序架构文档
> 版本: 1.0.0
> 更新日期: 2026-01-16

---

## 目录

1. [系统概览](#系统概览)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [前端架构](#前端架构)
5. [后端架构](#后端架构)
6. [数据流](#数据流)
7. [模块详解](#模块详解)
8. [关键设计决策](#关键设计决策)

---

## 系统概览

Pixel-Client 是一个基于 Tauri 2.0 构建的桌面应用程序，提供 AI 聊天和白板协作功能。

### 核心特性

| 特性 | 描述 |
|------|------|
| AI 聊天 | 支持流式响应的 LLM 聊天界面 |
| Excalidraw 白板 | 手绘风格的白板协作工具 |
| Markdown 渲染 | 语法高亮的 Markdown 预览 |
| 状态持久化 | bincode + zstd 压缩的本地存储 |

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.0 | UI 框架 |
| TypeScript | 5.8.2 | 类型安全 |
| Vite | 6.2.0 | 构建工具 |
| Tailwind CSS | 4.1.18 | 样式 |
| Vitest | 4.0.17 | 测试 |

### 后端 (Rust)

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.9.5 | 桌面框架 |
| reqwest | 0.12 | HTTP 客户端 |
| pulldown-cmark | 0.11 | Markdown 解析 |
| syntect | 5.0 | 代码高亮 |
| bincode | 1.3 | 序列化 |
| zstd | 0.13 | 压缩 |

---

## 项目结构

```
pixel-client-tauri/
├── src/                          # React 前端
│   ├── components/               # React 组件
│   │   ├── Chat/                 # 聊天组件
│   │   │   ├── Chat.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── ChatMessageList.tsx
│   │   ├── Excalidraw/           # 白板组件
│   │   │   └── ExcalidrawEditor.tsx
│   │   └── ModelManager/         # 模型管理
│   │       ├── ModelManager.tsx
│   │       ├── ModelList.tsx
│   │       └── ModelForm.tsx
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useChat.ts
│   │   └── useExcalidraw.ts
│   ├── services/                 # 服务层
│   │   └── excalidrawService.ts
│   ├── types/                    # 类型定义
│   │   ├── excalidraw.types.ts
│   │   └── index.ts
│   ├── __tests__/                # 测试文件
│   │   ├── hooks/
│   │   │   └── useExcalidraw.test.ts
│   │   └── utils.test.ts
│   └── constants.ts              # 常量定义
│
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── lib.rs                # Tauri 应用入口
│   │   ├── commands/             # Tauri 命令
│   │   │   ├── mod.rs
│   │   │   ├── chat.rs           # 聊天命令
│   │   │   └── excalidraw.rs     # 白板命令
│   │   ├── services/             # 服务层
│   │   │   ├── mod.rs
│   │   │   ├── renderer.rs       # Markdown 渲染
│   │   │   ├── persistence.rs    # 状态持久化
│   │   │   ├── renderer_cmd_wrapper.rs
│   │   │   └── persistence_cmd_wrapper.rs
│   │   ├── state.rs              # 状态管理
│   │   └── types/                # 类型定义
│   └── Cargo.toml
│
├── docs/                         # 文档
│   ├── API.md                    # API 文档
│   └── EXCALIDRAW_INTEGRATION_SOLUTION.md
│
├── planning/                     # 规划文件
│   ├── task_plan.md
│   ├── progress.md               # 进度追踪
│   └── findings.md
│
├── vite.config.ts
├── vitest.config.ts
└── package.json
```

---

## 前端架构

### 组件层次

```
App.tsx
├── Chat
│   ├── ChatMessageList
│   └── ChatInput
├── ExcalidrawEditor
├── ModelManager
│   ├── ModelList
│   └── ModelForm
└── Settings
```

### 状态管理

| 类型 | 管理方式 | 用途 |
|------|----------|------|
| 局部状态 | `useState` | 组件内部状态 |
| 业务状态 | Custom Hooks | 跨组件逻辑 |
| 全局配置 | Tauri Invoke | 后端持久化 |

### 自定义 Hooks

#### useExcalidraw

管理 Excalidraw 场景状态。

```typescript
const {
  currentSceneId,  // 当前场景 ID
  isSaving,        // 是否正在保存
  isLoading,       // 是否正在加载
  lastSaved,       // 上次保存时间
  saveScene,       // 保存场景
  loadScene,       // 加载场景
  listScenes,      // 列出场景
  deleteScene,     // 删除场景
  clearScene,      // 清空场景
} = useExcalidraw({ conversationId, autoSave, onSave, onError });
```

#### useChat

管理聊天会话状态。

```typescript
const {
  messages,
  isStreaming,
  sendMessage,
  cancelStream,
} = useChat(sessionId);
```

---

## 后端架构

### Tauri 命令模式

所有后端功能通过 Tauri 命令暴露给前端：

```rust
#[tauri::command]
pub async fn command_name(
    params: ParamType,
    state: State<'_, SharedState>,
) -> Result<ReturnType, String> {
    // 实现
}
```

### 命令注册

在 `lib.rs` 中注册命令：

```rust
invoke_handler(tauri::generate_handler![
    // Chat commands
    create_chat_session,
    add_message_to_session,
    get_session_messages,
    stream_chat_completions,
    // Excalidraw commands
    save_excalidraw_scene,
    load_excalidraw_scene,
    // Renderer commands
    render_markdown,
    // Persistence commands
    save_state,
    load_state,
])
```

### 服务层

| 服务 | 职责 |
|------|------|
| `renderer.rs` | Markdown 渲染和代码高亮 |
| `persistence.rs` | 状态序列化和持久化 |
| `chat.rs` | 聊天会话管理 |
| `excalidraw.rs` | 白板场景管理 |

---

## 数据流

### 前端 → 后端

```
React Component
    ↓ invoke(command, params)
Tauri IPC
    ↓
Rust Command Handler
    ↓
Service Layer
    ↓
File System / HTTP API
```

### 后端 → 前端

```
File System / HTTP API
    ↓
Service Layer
    ↓
Tauri Event Emitter
    ↓
React Component (Event Listener)
```

### 示例：聊天流

```
1. 用户输入消息
2. useChat.sendMessage() 被调用
3. invoke('stream_chat_completions', messages) 发送请求
4. 后端流式调用 LLM API
5. 后端发射事件: chat_chunk, chat_stream_end
6. 前端监听事件，更新消息列表
```

### 示例：Excalidraw 保存

```
1. 用户绘制完成
2. Excalidraw 触发 onChange
3. useExcalidraw 防抖触发 saveScene
4. invoke('save_excalidraw_scene', elements, appState)
5. 后端保存到文件
6. 返回 sceneId
```

---

## 模块详解

### Chat 模块

**文件**: `src/hooks/useChat.ts`, `src-tauri/src/commands/chat.rs`

**功能**:
- 创建/删除聊天会话
- 添加/获取消息
- 流式 LLM 响应

**数据模型**:
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
}
```

### Excalidraw 模块

**文件**: `src/components/Excalidraw/ExcalidrawEditor.tsx`, `src-tauri/src/commands/excalidraw.rs`

**功能**:
- 白板场景 CRUD
- 自动保存
- PNG/SVG 导出
- 撤销/重做

**特性**:
- 防抖保存（默认 5 秒）
- 本地文件存储
- 官方 JSON 格式兼容

### Markdown 渲染模块

**文件**: `src-tauri/src/services/renderer.rs`

**功能**:
- Markdown → HTML 转换
- 50+ 语言代码高亮
- 自定义语法处理（thinking 标签）

**依赖**:
- `pulldown-cmark`: Markdown 解析
- `syntect`: 代码高亮

### 持久化模块

**文件**: `src-tauri/src/services/persistence.rs`

**功能**:
- 状态序列化和反序列化
- zstd 压缩
- JSON 导出/导入

**格式**:
```
+------------------+
|     Header       |  16 bytes
+------------------+
|   Compressed     |  可变大小
|     Data         |  (zstd 压缩)
+------------------+
```

---

## 关键设计决策

### 1. Tauri v2 命令模式

**决策**: 使用 `State<'_, SharedState>` 而非 `AppHandle`

**原因**:
- 更类型安全
- 更容易测试
- 更好的错误处理

**示例**:
```rust
#[tauri::command]
pub fn command(shared_state: State<'_, SharedState>) -> Result<(), String> {
    // 使用 shared_state
}
```

### 2. 状态序列化

**决策**: 使用 bincode + zstd 而非 JSON

**原因**:
- 更小的存储空间
- 更快的序列化/反序列化
- 类型安全

### 3. Excalidraw 数据格式

**决策**: 使用官方 Excalidraw JSON 格式 v2

**原因**:
- 与官方库完全兼容
- 便于导入/导出
- 未来可扩展性

### 4. 前端状态管理

**决策**: 使用自定义 Hooks 而非 Redux/Zustand

**原因**:
- 更轻量
- 更符合 React 18 范式
- 更容易测试

### 5. 错误处理

**决策**: 所有命令返回 `Result<T, String>`

**原因**:
- 简单统一
- 易于传播
- 前端友好

---

## 性能考虑

### 前端

| 优化 | 实现 |
|------|------|
| 代码分割 | Vite 动态导入 |
| 防抖 | useExcalidraw 自动保存 |
| 虚拟列表 | (待实现) |

### 后端

| 优化 | 实现 |
|------|------|
| 压缩 | zstd 级别 3 |
| 并发 | Tokio async/await |
| 缓存 | syntect 语法预加载 |

---

## 安全考虑

| 风险 | 缓解措施 |
|------|----------|
| XSS | HTML 转义 |
| 数据泄露 | 本地存储，加密 |
| API 密钥 | 环境变量管理 |

---

## 扩展指南

### 添加新命令

1. 在 `src-tauri/src/commands/` 创建命令函数
2. 添加 `#[tauri::command]` 宏
3. 在 `lib.rs` 的 `invoke_handler` 中注册
4. 在 `src/services/` 创建前端 IPC 封装
5. 在 `docs/API.md` 添加文档

### 添加新组件

1. 在 `src/components/` 创建目录
2. 实现 React 组件
3. 添加类型定义
4. 编写测试
5. 更新文档

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-01-16 | 初始版本 |

---

## 参考资源

- [Tauri 文档](https://tauri.app/)
- [React 文档](https://react.dev/)
- [Excalidraw 文档](https://docs.excalidraw.com/)
- [pulldown-cmark](https://github.com/raphlinus/pulldown-cmark)
- [syntect](https://github.com/trishume/syntect)

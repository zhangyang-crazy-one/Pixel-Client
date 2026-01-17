# API 迁移研究发现 (Findings)

> 创建日期: 2026-01-17
> 最后更新: 2026-01-17

---

## API 迁移状态总览

基于原始 `Pixel-Client/services/apiClient.ts` 的全面分析。

### 统计摘要

| 状态 | 数量 | 百分比 |
|------|------|--------|
| ✅ 完全迁移 | 11 | 37% |
| ⚠️ 部分实现 | 10 | 33% |
| ❌ 完全缺失 | 9 | 30% |
| **总计** | **30** | 100% |

---

## 1. Chat/Session API

### 完全迁移 ✅

| API | Rust 命令 | 前端调用 |
|-----|-----------|----------|
| `createChatSession` | `create_chat_session` | `invoke('create_chat_session')` |
| `addMessageToSession` | `add_message_to_session` | `invoke('add_message_to_session')` |
| `getSessionMessages` | `get_session_messages` | `invoke('get_session_messages')` |
| `deleteChatSession` | `delete_chat_session` | `invoke('delete_chat_session')` |
| `getActiveSessions` | `get_active_sessions` | `invoke('get_active_sessions')` |
| `cancelChatStream` | `cancel_chat_stream` | `invoke('cancel_chat_stream')` |

### 部分实现 ⚠️

| API | 缺失功能 | 位置 |
|-----|----------|------|
| `streamChatCompletions` | `selfThinking` 参数 | `chat.rs:125` |
| `streamChatCompletions` | `reasoning_content` 解析 | `chat.rs:225-247` |
| `streamChatCompletions` | 多模态 (图片) 内容 | `chat.rs:149-152` |

### 完全缺失 ❌

| API | 用途 | 原始位置 |
|-----|------|----------|
| `getSessionHistory` | 会话历史查询 | `apiClient.ts:174` |

---

## 2. Provider/Model API

### 部分实现 ⚠️

| API | 问题 | 建议 |
|-----|------|------|
| `testProviderConfiguration` | 返回 mock 成功 | 实现真实 HTTP 连接测试 |
| `validateModel` | 返回 mock 成功 | 实现真实模型验证 |

### 已迁移但使用 LocalStorage ⚠️

| API | 当前实现 | 建议 |
|-----|----------|------|
| `getProviders` | LocalStorage | 可选：迁移到 Rust 后端 |
| `saveProviders` | LocalStorage | 可选：迁移到 Rust 后端 |
| `getAllModels` | LocalStorage | 可选：迁移到 Rust 后端 |
| `saveModels` | LocalStorage | 可选：迁移到 Rust 后端 |

---

## 3. MCP Server API

### 完全缺失 ❌ (占位符实现)

| API | 当前状态 | 需要实现 |
|-----|----------|----------|
| `Mcp.getServers` | 返回空数组 | Rust 命令 + MCP 协议集成 |
| `Mcp.getStats` | 返回默认值 | 统计收集逻辑 |
| `Mcp.registerServer` | 空函数 | 服务器注册逻辑 |
| `Mcp.deleteServer` | 空函数 | 服务器删除逻辑 |
| `Mcp.restartServer` | 空函数 | 服务器重启逻辑 |

---

## 4. Skills API

### 完全缺失 ❌

原始项目有完整的 Skills 管理系统，Tauri 版本完全缺失：

| API | 用途 |
|-----|------|
| `getSkills` | 获取技能列表 |
| `getSkillStats` | 获取技能统计 |
| `installSkill` | 安装技能 |
| `uninstallSkill` | 卸载技能 |
| `updateSkillDescription` | 更新技能描述 |
| `reindexSkills` | 重新索引技能 |

---

## 5. 关键功能差异

### Deep Thinking 模式

**原始实现** (`Pixel-Client/services/llmService.ts:34-42`):
```typescript
export async function streamChatResponse(
  messages: Message[],
  activeModel: LLMModel,
  activeProvider: LLMProvider,
  onChunk: (chunk: string) => void,
  onRequestId: (requestId: string) => void,
  activeSessionId: string,
  signal: AbortSignal,
  deepThinkingEnabled?: boolean  // ← 支持深度思考模式
): Promise<void>
```

**Tauri 实现** (`chat.rs:125-131`):
```rust
pub async fn stream_chat_completions(
    messages: Vec<Message>,
    model_id: String,
    provider_id: String,
    shared_state: State<'_, SharedState>,
    app_state: State<'_, PixelState>,
) -> Result<String, String>
// ← 缺少 deep_thinking_enabled 参数
```

### reasoning_content 解析

**原始实现**:
- 解析 SSE 流中的 `reasoning_content` 字段
- 支持嵌套 JSON 格式
- 分别处理思维链和最终输出

**Tauri 实现**:
- 仅处理 `choices[0].delta.content`
- 不解析 `reasoning_content`

### 多模态支持

**原始实现**:
- 支持 `MessageContent` 数组格式
- 包含 `type: 'image_url'` 的内容

**Tauri 实现**:
- 仅支持纯文本 `content` 字段

---

## 6. 架构差异

| 方面 | 原始 Pixel-Client | Tauri 版本 |
|------|------------------|------------|
| 通信方式 | HTTP REST API | Tauri IPC (invoke) |
| 后端 | 远程服务器 | 本地 Rust 进程 |
| 状态存储 | 远程数据库 | 本地文件 (bincode+zstd) |
| 流式传输 | EventSource | Tauri Events |
| Provider 配置 | 后端管理 | 前端 LocalStorage |

---

## 7. 实现优先级建议

### P0 - 核心功能 (必须实现)

1. **Deep Thinking 模式** - AI 核心功能
2. **reasoning_content 解析** - 思维链输出
3. **多模态支持** - 图片对话能力

### P1 - 重要功能 (应该实现)

4. **Provider 连接测试** - 配置验证
5. **Model 验证** - 模型可用性检查
6. **Session 历史** - 数据持久化

### P2 - 扩展功能 (可选实现)

7. **MCP Server 管理** - 工具扩展
8. **Skills 管理** - 技能系统

---

## 8. 技术实现笔记

### Rust 后端需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| `src-tauri/src/commands/chat.rs` | 添加 deep_thinking, multimodal 支持 |
| `src-tauri/src/state.rs` | 添加 MCP, Skills 数据结构 |
| `src-tauri/src/commands/mod.rs` | 导出新命令 |
| `src-tauri/src/lib.rs` | 注册新命令 |

### 前端需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| `services/apiClient.ts` | 添加新 Tauri 命令调用 |
| `services/llmService.ts` | 添加 deep_thinking 支持 |
| `types/index.ts` | 添加新类型定义 |

---

## 9. 遇到的问题

| 问题 | 尝试 | 解决方案 |
|------|------|----------|
| (待记录) | | |

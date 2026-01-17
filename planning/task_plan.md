# 任务计划 (Task Plan)

> 版本: v3.0
> 更新日期: 2026-01-17

## 项目概述

Pixel-Client-Tauri 是一个基于 Tauri v2 和 React 的 AI 聊天应用客户端。

## 当前阶段

**v3.0 - 后端 API 全面迁移实现**

基于 API 迁移审查报告：
- **37%** 完全迁移 (11/30)
- **33%** 部分实现 (10/30)
- **30%** 完全缺失 (9/30)

---

## Phase 1: 文档更新 `in_progress`

| # | 任务 | 状态 |
|---|------|------|
| 1.1 | 创建 docs/API_MIGRATION.md | ⏳ 进行中 |
| 1.2 | 更新 docs/ARCHITECTURE.md | ⏳ 待完成 |
| 1.3 | 创建后端接口规范文档 | ⏳ 待完成 |

## Phase 2: Chat/Streaming API 完善 `pending`

| # | 任务 | 优先级 | 状态 |
|---|------|--------|------|
| 2.1 | Deep Thinking 模式 (selfThinking) | P0 | ⏳ |
| 2.2 | reasoning_content 解析 | P0 | ⏳ |
| 2.3 | 多模态支持 (图片内容) | P0 | ⏳ |
| 2.4 | 完善取消流请求 | P1 | ⏳ |

## Phase 3: Provider/Model API 完善 `pending`

| # | 任务 | 优先级 | 状态 |
|---|------|--------|------|
| 3.1 | test_provider_connection 真实实现 | P1 | ⏳ |
| 3.2 | validate_model 真实实现 | P1 | ⏳ |
| 3.3 | Provider 持久化到 Rust 后端 | P1 | ⏳ |

## Phase 4: Session API 补全 `pending`

| # | 任务 | 优先级 | 状态 |
|---|------|--------|------|
| 4.1 | get_session_history 实现 | P1 | ⏳ |
| 4.2 | 会话持久化机制完善 | P1 | ⏳ |

## Phase 5: MCP Server API 实现 `pending`

| # | 任务 | 优先级 | 状态 |
|---|------|--------|------|
| 5.1 | register_mcp_server | P2 | ⏳ |
| 5.2 | delete_mcp_server | P2 | ⏳ |
| 5.3 | restart_mcp_server | P2 | ⏳ |
| 5.4 | get_mcp_stats | P2 | ⏳ |
| 5.5 | get_mcp_servers | P2 | ⏳ |

## Phase 6: Skills API 实现 `pending`

| # | 任务 | 优先级 | 状态 |
|---|------|--------|------|
| 6.1 | get_skills | P2 | ⏳ |
| 6.2 | get_skill_stats | P2 | ⏳ |
| 6.3 | install_skill | P2 | ⏳ |
| 6.4 | uninstall_skill | P2 | ⏳ |
| 6.5 | update_skill_description | P2 | ⏳ |
| 6.6 | reindex_skills | P2 | ⏳ |

## Phase 7: 前端服务层更新 `pending`

| # | 任务 | 状态 |
|---|------|------|
| 7.1 | 更新 apiClient.ts | ⏳ |
| 7.2 | 更新 llmService.ts | ⏳ |
| 7.3 | 添加类型定义 | ⏳ |

## Phase 8: 测试与验证 `pending`

| # | 任务 | 状态 |
|---|------|------|
| 8.1 | 单元测试 | ⏳ |
| 8.2 | 集成测试 | ⏳ |
| 8.3 | 手动功能验证 | ⏳ |

---

## 已完成任务 (v2.x)

| # | 任务 | 完成日期 | 备注 |
|---|------|----------|------|
| 1 | 添加 'nlp' 到 ModelType 枚举 | 2026-01-15 | v2.13 |
| 2 | 移除所有 `as any` 类型断言 | 2026-01-15 | v2.13 |
| 3 | 验证 TypeScript 类型 (0 错误) | 2026-01-15 | v2.13 |
| 4 | 添加 vitest 测试配置 | 2026-01-15 | v2.13 |
| 5 | 添加单元测试 (14+ 测试) | 2026-01-15 | v2.13 |
| 6 | 更新 CI 添加 test 作业 | 2026-01-15 | v2.13 |

## 已完成任务 (v2.12)

| # | 任务 | 完成日期 | 备注 |
|---|------|----------|------|
| 1 | 项目初始化 | 2025-XX-XX | Tauri v2 + React |
| 2 | 主题系统实现 | 2025-XX-XX | 6种主题 |
| 3 | 多语言支持 | 2025-XX-XX | en/zh/ja |
| 4 | MCP 协议集成 | 2025-XX-XX | Model Context Protocol |
| 5 | ACE Agent 配置 | 2025-XX-XX | 三模型工作流 |
| 6-17 | 第一至第十三次代码审查 | 2025-12-20 ~ 2026-01-14 | v5.0-v5.5 |

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide Icons
- **后端**: Tauri v2 + Rust
- **包管理**: Bun 1.2.23
- **CI/CD**: GitHub Actions + Bun
- **测试**: Vitest 4.0.17

## 下一阶段计划

- v2.14: Rust 模块实现 (可选)
  - renderer.rs
  - persistence.rs
  - events.rs
  - state.rs
  - excalidraw.rs
  - markdown.rs

## 代码审查清单

- [x] Rust 后端 Cargo.toml 依赖配置
- [x] Rust lib.rs 命令实现
- [x] Rust notifications.rs 实现
- [x] Rust build.rs 完整性
- [x] React App.tsx 类型安全问题 (已修复)
- [x] React services/tauri-api.ts 完整性
- [x] React constants.ts 配置
- [x] React types.ts 类型文件 (已修复)
- [x] CI/CD .github/workflows/ci.yml 配置
- [x] types-sync job 验证
- [x] test job 验证

## Bun 迁移清单

- [x] package.json scripts 更新
- [x] .github/workflows/ci.yml 更新
- [x] README.md 文档更新
- [x] bun install 验证
- [x] bun run build 验证
- [x] bun run tsc 验证
- [x] bun test 验证

## 测试覆盖

| 类型 | 文件数 | 测试数 | 状态 |
|------|--------|--------|------|
| 单元测试 | 2 | 14 | ✅ 通过 |
| 类型检查 | - | 0 错误 | ✅ 通过 |
| 构建检查 | - | 成功 | ✅ 通过 |

# 全局 Claude Code 配置

> 本项目使用模块化规则系统。详细规则位于 `.claude/rules/` 目录。

---

## 规则系统概览

<rules_system>
规则按触发时机从 `.claude/rules/` 目录模块化加载。

### 规则文件

| 文件 | 触发时机 | 用途 |
|------|----------|------|
| `00-global.md` | SessionStart | 全局行为规范 |
| `01-code-quality.md` | PreToolUse (Write/Edit) | 代码验证 |
| `02-code-style.md` | PreToolUse (Write/Edit) | 代码风格 |
| `03-security.md` | PreToolUse (Write/Edit) | 安全检查 |
| `04-performance.md` | PreToolUse (Write/Edit) | 性能优化 |
| `05-documentation.md` | Stop | 文档同步 |
| `06-context7-query.md` | UserPromptSubmit | 外部查询 |
| `07-refactoring.md` | PreToolUse (Read) | 重构检测 |

### 加载机制

- **SessionStart**: 加载 `00-global.md`，初始化会话行为
- **UserPromptSubmit**: 评估技能匹配，检查外部库查询需求
- **PreToolUse**: 根据工具类型注入相关规则提醒
- **Stop**: 检查文档同步和任务完成状态
</rules_system>

---

## 核心原则（快速参考）

### 上下文窗口管理

<context_window_management>
上下文窗口接近限制时会自动压缩。不要因 token 预算提前停止任务。
在上下文刷新前保存进度到记忆中。绝不人为提前停止任何任务。
</context_window_management>

### 行动优先

<default_to_action>
默认直接实施更改，而非仅提建议。推断用户意图并采取行动。
使用工具发现缺失细节，而非猜测。Python 程序使用 `uv` 运行。
</default_to_action>

### 并行工具调用

<use_parallel_tool_calls>
无依赖的多个工具调用应并行执行。有依赖时按顺序执行。
永远不要使用占位符或猜测缺失参数。
</use_parallel_tool_calls>

### 调查后再回答

<investigate_before_answering>
永远不要对未打开的代码进行推测。必须先读取用户引用的文件再回答。
提供有根据的、无幻觉的答案。
</investigate_before_answering>

---

## 强制要求速查表

### 代码质量 (MUST)

| 规则 | 说明 |
|------|------|
| 类型安全 | 禁止 `as any`、`@ts-ignore`、`@ts-expect-error` |
| 验证 | 编辑后必须运行 `lsp_diagnostics` |
| 导出类型 | 所有导出必须有显式类型注解 |

### 代码风格 (MUST)

| 规则 | 限制 |
|------|------|
| 组件文件 | ≤ 300 行 |
| 服务文件 | ≤ 500 行 |
| 嵌套深度 | ≤ 4 层 |
| 导入 | 禁止 `import *` |

### 安全 (MUST)

| 规则 | 说明 |
|------|------|
| 环境变量 | 禁止硬编码密钥，使用 `.env` |
| 模板 | 必须维护 `.env.template` |
| Gitignore | 必须包含 `.env` 等敏感文件 |

### 性能 (MUST)

| 规则 | 说明 |
|------|------|
| 数据库 | 禁止 N+1 查询 |
| 列表 | 100+ 项使用虚拟化 |
| 清理 | useEffect 必须清理副作用 |

### 外部查询 (MUST)

| 规则 | 说明 |
|------|------|
| 不熟悉的库 | 必须先查询文档 |
| 优先级 | Context7 → deepwiki → GitHub |
| 冲突 | 官方文档优先 |

### 文档同步 (MUST)

| 触发条件 | 需更新的文档 |
|----------|--------------|
| API 变更 | `docs/API.md` |
| 架构变更 | `docs/ARCHITECTURE.md` |
| 配置变更 | `README.md`、`.env.template` |

---

## Windows 脚本编码规范

<windows_script_encoding>
在 Windows 平台编写包含中文的 PowerShell 脚本时，必须遵循以下规范以确保中文正确显示：

### 文件编码 (MUST)

| 规则 | 说明 |
|------|------|
| UTF-8 with BOM | 所有包含中文的 `.ps1` 文件**必须**使用 UTF-8 with BOM 编码保存 |
| BOM 标识 | 文件开头必须包含 BOM 字节序标记 (`EF BB BF`) |

### 输出编码设置 (MUST)

在脚本开头（注释之后）添加以下代码：

```powershell
# 设置输出编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

### 完整示例

```powershell
﻿# script-name.ps1 - 脚本描述
# 触发时机: Hook 类型
# 功能: 功能说明

param(
    [string]$ParamName = ""
)

# 设置输出编码为 UTF-8（必须在 param 之后）
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 脚本主体代码...
Write-Output "中文输出测试"
```

### 注意事项

| 规则 | 说明 |
|------|------|
| param 位置 | `param()` 块**必须**紧跟在注释之后，不能有其他可执行代码在前 |
| 编码设置位置 | 编码设置代码**必须**放在 `param()` 块之后 |
| 无 param 脚本 | 如果脚本没有参数，编码设置可以直接放在注释之后 |

### 检查清单

- [ ] 文件使用 UTF-8 with BOM 编码保存
- [ ] 脚本开头设置了 `[Console]::OutputEncoding`
- [ ] 脚本开头设置了 `$OutputEncoding`
- [ ] 中文字符在控制台正确显示
</windows_script_encoding>

---

## 临时文件清理

<cleanup>
任务结束时必须清理临时文件、辅助脚本、日志和缓存。
清理后验证工作区与原始状态一致（排除有意更改）。
</cleanup>

---

## 详细规则

完整规则请参阅 `.claude/rules/` 目录下的对应文件。

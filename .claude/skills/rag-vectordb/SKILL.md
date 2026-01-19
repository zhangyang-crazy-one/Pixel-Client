---
name: rag-vectordb
description: |
  RAG 向量数据库开发规范 (Tauri 版本)。

  触发场景：
  - 实现知识检索
  - 文本分块处理
  - 向量相似性搜索
  - Tauri 持久化存储

  触发词：RAG、向量、检索、知识库、embedding、chunk、相似性搜索、Tauri
---

# RAG 向量数据库开发规范

> 本项目: Pixel-Client Tauri 迁移 (Rust + React)

## 技术架构

```
src/
├── services/
│   └── ragService.ts       # RAG 服务（前端）
└── types/
    └── bindings.ts         # ts-rs 生成的类型

src-tauri/src/
├── lib.rs                  # Rust 命令注册
├── rag.rs                  # RAG 相关命令
└── persistence.rs          # 持久化服务

ragService.ts 功能：
├── splitTextIntoChunks()   # 文本分块
├── generateEmbeddings()    # 生成向量
└── searchMemories()        # 记忆检索
```

## 核心规范

### Tauri IPC 通信模式

```
React 前端 → invoke() → Rust 命令 → bincode/zstd 持久化
React 前端 → listen() ← 事件监听 (memory_updated)
```

### Tauri API 封装

```typescript
// services/ragService.ts
import { invoke } from '@tauri-apps/api/core';

// 调用 Rust RAG 命令
export const ragApi = {
  // 初始化 RAG 服务
  initRag: () => invoke('rag_init'),

  // 索引记忆
  indexMemory: (memory: MemoryItem) =>
    invoke('rag_index_memory', { memory }),

  // 搜索记忆
  searchMemories: (query: string, limit: number) =>
    invoke('rag_search', { query, limit }),

  // 删除记忆索引
  deleteMemoryIndex: (memoryId: string) =>
    invoke('rag_delete_memory', { memoryId }),

  // 获取统计信息
  getRagStats: () => invoke('rag_get_stats'),
};
```

### 文本分块策略

```typescript
// 默认配置
const CHUNK_SIZE = 800;      // 分块大小
const CHUNK_OVERLAP = 100;   // 重叠大小
const MAX_CHUNKS = 15;       // 最大检索块数
const MIN_SIMILARITY = 0.3;  // 最小相似度阈值

// 分块逻辑
export const splitTextIntoChunks = (content: string): string[] => {
  const chunks: string[] = [];

  // 按段落和句子分割
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = '';
  paragraphs.forEach(paragraph => {
    if ((currentChunk + paragraph).length <= CHUNK_SIZE) {
      currentChunk += paragraph + '\n\n';
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // 保留重叠区域
      currentChunk = paragraph;
    }
  });

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};
```

### 余弦相似度计算

```typescript
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
```

### 前端记忆检索

```typescript
// services/ragService.ts
import { ragApi } from './tauri-api';

export interface MemorySearchResult {
  id: string;
  content: string;
  score: number;
  topics: string[];
  importance: string;
}

export const searchMemories = async (
  query: string,
  limit: number = 5
): Promise<MemorySearchResult[]> => {
  try {
    const results = await ragApi.searchMemories(query, limit);
    return results as MemorySearchResult[];
  } catch (error) {
    console.error('[RAG] Search failed:', error);
    return [];
  }
};

export const indexMemory = async (memory: MemoryItem): Promise<boolean> => {
  try {
    await ragApi.indexMemory(memory);
    return true;
  } catch (error) {
    console.error('[RAG] Index failed:', error);
    return false;
  }
};
```

## Tauri Rust 端实现

```rust
// src-tauri/src/rag.rs

use tauri::State;
use std::sync::RwLock;
use serde::{Deserialize, Serialize};
use bincode::{encode, decode};
use zstd::{encode_all, decode_all};
use std::fs;

pub struct RagState {
    pub memories: RwLock<Vec<MemoryItem>>,
    pub embeddings: RwLock<Vec<Vec<f32>>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MemoryItem {
    pub id: String,
    pub content: String,
    pub topics: Vec<String>,
    pub importance: String,
    pub created: String,
    pub updated: String,
}

#[tauri::command]
pub fn rag_init(state: State<'_, RagState>) -> Result<(), String> {
    // 初始化 RAG 服务
    Ok(())
}

#[tauri::command]
pub fn rag_index_memory(
    state: State<'_, RagState>,
    memory: MemoryItem,
) -> Result<(), String> {
    // 生成向量并存储
    let embeddings = generate_embeddings(&memory.content);

    let mut memories = state.memories.write().map_err(|e| e.to_string())?;
    let mut emb_vec = state.embeddings.write().map_err(|e| e.to_string())?;

    memories.push(memory.clone());
    emb_vec.push(embeddings);

    Ok(())
}

#[tauri::command]
pub fn rag_search(
    state: State<'_, RagState>,
    query: String,
    limit: usize,
) -> Result<Vec<MemorySearchResult>, String> {
    let query_embedding = generate_embeddings(&query);

    let memories = state.memories.read().map_err(|e| e.to_string())?;
    let embeddings = state.embeddings.read().map_err(|e| e.to_string())?;

    let mut results: Vec<MemorySearchResult> = memories
        .iter()
        .zip(embeddings.iter())
        .map(|(mem, emb)| MemorySearchResult {
            id: mem.id.clone(),
            content: mem.content.clone(),
            score: cosine_similarity(&query_embedding, emb),
            topics: mem.topics.clone(),
            importance: mem.importance.clone(),
        })
        .filter(|r| r.score >= 0.3)
        .take(limit)
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

    Ok(results)
}

#[tauri::command]
pub fn rag_delete_memory(
    state: State<'_, RagState>,
    memory_id: String,
) -> Result<(), String> {
    // 删除记忆和对应向量
    Ok(())
}

fn generate_embeddings(text: &str) -> Vec<f32> {
    // TODO: 实现向量生成（使用 AI API 或本地模型）
    vec![]
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a > 0.0 && norm_b > 0.0 {
        dot / (norm_a * norm_b)
    } else {
        0.0
    }
}
```

## 记忆持久化服务

### 文件结构

记忆以 Markdown 文件存储在应用数据目录：

```
%APPDATA%/Pixel Client/.memories/
├── _memories_index.json      # 索引文件
├── memory_2025-12-29_主题_abc123.md
└── memory_2025-12-29_开发_def456.md
```

### 记忆文档格式

```markdown
---
id: test-memory-abc123
created: 2025-12-29T06:50:56.904Z
updated: 2025-12-29T12:37:23.935Z
topics: ["开发","工作流","指南"]
importance: medium
---

# 记忆标题

记忆正文内容...
```

### Rust 持久化命令

```rust
// src-tauri/src/persistence.rs

#[tauri::command]
pub fn save_memory_to_disk(
    app: AppHandle,
    memory: MemoryItem,
) -> Result<(), String> {
    let memory_dir = get_memory_dir(&app);

    // 生成文件名
    let timestamp = chrono::Utc::now().format("%Y-%m-%d_%H-%M-%S");
    let safe_title = memory.topics.first()
        .map(|t| t.clone())
        .unwrap_or_else(|| "memory".to_string());
    let filename = format!("memory_{}_{}_{}.md", timestamp, safe_title, &memory.id[..8]);

    let path = memory_dir.join(&filename);

    // 生成 Markdown 内容
    let content = format!(
        r#"---
id: {}
created: {}
updated: {}
topics: {:?}
importance: {}
---

# {}

{}"#,
        memory.id,
        memory.created,
        memory.updated,
        memory.topics,
        memory.importance,
        memory.topics.first().map(|s| s.as_str()).unwrap_or("Memory"),
        memory.content
    );

    fs::write(&path, content).map_err(|e| e.to_string())?;

    // 更新索引
    update_memory_index(&app, &memory)?;

    Ok(())
}

#[tauri::command]
pub fn load_memories_from_disk(
    app: AppHandle,
) -> Result<Vec<MemoryItem>, String> {
    let memory_dir = get_memory_dir(&app);
    if !memory_dir.exists() {
        return Ok(vec![]);
    }

    let mut memories = Vec::new();

    for entry in fs::read_dir(memory_dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path();

        if path.extension().map(|e| e.to_str()) == Some(Some("md")) {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(memory) = parse_memory_from_markdown(&content) {
                    memories.push(memory);
                }
            }
        }
    }

    Ok(memories)
}
```

### 事件广播

```rust
// 记忆更新后广播事件
fn broadcast_memory_update(window: &Window, memory: &MemoryItem, action: &str) {
    let _ = window.emit("memory_updated", serde_json::json!({
        "action": action,
        "memory_id": memory.id,
        "timestamp": chrono::Utc::now().to_rfc3339()
    }));
}
```

### 前端事件监听

```typescript
// 监听记忆更新事件
useEffect(() => {
  const unlisten = listen<{ action: string; memory_id: string }>(
    'memory_updated',
    (event) => {
      const { action, memory_id } = event.payload;

      switch (action) {
        case 'created':
        case 'updated':
          // 刷新记忆列表
          refreshMemories();
          break;
        case 'deleted':
          // 从本地状态移除
          setMemories(prev => prev.filter(m => m.id !== memory_id));
          break;
      }
    }
  );

  return () => {
    unlisten.then((fn) => fn());
  };
}, []);
```

## 自动注入机制

发送消息时自动搜索并注入相关记忆：

```typescript
// 基于用户问题搜索相关记忆
const autoResults = await searchMemories(userQuery, 5);

// 合并手动注入和自动检索的记忆
const allMemories = [
  ...injectedMemories,                    // 手动注入（优先级高）
  ...autoResults.filter(notDuplicate)     // 自动检索
];

// 格式化并注入到消息
messageContent = formatMemoriesIntoPrompt(allMemories) + userQuery;
```

## 禁止事项

- ❌ 禁止在没有向量的情况下进行相似性搜索
- ❌ 禁止使用过大的分块大小（超过 1000 字符）
- ❌ 禁止忽略重叠区域导致信息丢失
- ❌ 禁止在前端直接调用 Rust 持久化 API（应通过 tauri-api.ts 封装）
- ❌ 禁止在主线程进行大量向量计算

## 参考代码

- `src/services/ragService.ts` - RAG 服务实现
- `src-tauri/src/rag.rs` - Rust RAG 命令
- `src-tauri/src/persistence.rs` - 持久化服务

## 检查清单

- [ ] 是否正确配置分块参数
- [ ] 是否处理了空向量情况
- [ ] 是否设置了相似度阈值
- [ ] 是否正确处理了文件删除
- [ ] 是否通过 tauri-api.ts 调用 Rust 功能
- [ ] Memory 文件是否包含正确的 YAML frontmatter
- [ ] 是否正确监听了 memory_updated 事件
- [ ] 事件监听器是否在 useEffect 清理函数中正确移除

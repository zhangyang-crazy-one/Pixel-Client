---
name: tauri-react
description: |
  React 前端和 Tauri 集成开发规范。

  触发场景：
  - 开发 React 组件
  - 使用 hooks 管理状态
  - TypeScript 类型定义
  - Tailwind CSS 样式
  - Tauri IPC 通信

  触发词：React、前端、组件、hooks、typescript、jsx、tsx、UI、样式、Tailwind、invoke、listen
---

# React 前端开发规范

> 本项目: Pixel-Client Tauri 迁移 (Rust + React)

## 核心架构

```
src/
├── App.tsx              # 主组件（状态管理 + Tauri 集成）
├── index.tsx            # 入口
├── index.css            # 全局样式 (Tailwind)
├── hooks/               # 自定义 hooks
│   ├── useTauri.ts      # Tauri API hook
│   └── useConversations.ts
├── services/            # API 服务层
│   └── tauri-api.ts     # Tauri API 封装
├── types/               # TypeScript 类型（需与 Rust 同步）
│   └── bindings.ts      # ts-rs 生成的类型
└── utils/               # 工具函数

components/
├── ChatPanel.tsx        # AI 对话面板
├── ConversationList.tsx # 对话列表
├── ChatInput.tsx        # 聊天输入
├── MessageBubble.tsx    # 消息气泡
├── TitleBar.tsx         # 自定义标题栏
└── ...
```

## 核心规范

### Tauri IPC 通信

```typescript
// services/tauri-api.ts
import { invoke, listen } from '@tauri-apps/api/core';

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

### 状态管理

使用 React Hooks + Tauri 状态同步：

```typescript
// 状态声明
const [conversations, setConversations] = useState<Conversation[]>([]);
const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

// 加载 Tauri 状态
useEffect(() => {
  const loadState = async () => {
    const convos = await tauriApi.getConversations();
    setConversations(convos);
  };
  loadState();
}, []);

// 监听状态变更
useTauriEvents();

useEffect(() => {
  const unlisten = listen<Conversation>('conversation_created', (event) => {
    setConversations(prev => [...prev, event.payload]);
  });

  return () => {
    unlisten.then((fn) => fn());
  };
}, []);

// 回调
const handleCreateConversation = useCallback(async (title: string) => {
  const newConvo = await tauriApi.createConversation(title);
  setConversations(prev => [...prev, newConvo]);
}, []);
```

### 类型定义

集中在 `types/bindings.ts`（由 ts-rs 自动生成）：

```typescript
// types/bindings.ts - 来自 Rust 的类型同步
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AppConfig {
  theme: 'light' | 'dark';
  ai_provider: string;
  model: string;
}

// 本地扩展类型
export interface ChatState {
  isStreaming: boolean;
  currentChunk: string;
}
```

### Tailwind CSS 样式

```tsx
<div className="flex w-full h-screen bg-slate-50 dark:bg-slate-900
    text-slate-800 dark:text-slate-200 overflow-hidden">
  <ConversationList />
  <div className="flex-1 flex flex-col">
    <ChatPanel />
    <ChatInput />
  </div>
</div>
```

### 组件结构

```tsx
interface ChatPanelProps {
  conversationId: string;
  onSendMessage: (content: string) => void;
}

export function ChatPanel({ conversationId, onSendMessage }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // 使用 useCallback 避免不必要的重渲染
  const handleSend = useCallback(async (content: string) => {
    setIsStreaming(true);
    try {
      await onSendMessage(content);
    } finally {
      setIsStreaming(false);
    }
  }, [onSendMessage]);

  return (
    <div className="...">
      <MessageBubbleList messages={messages} />
      {isStreaming && <StreamingIndicator />}
    </div>
  );
}
```

## 第三方库使用

| 库 | 用途 | 导入方式 |
|------|------|----------|
| @tauri-apps/api | Tauri IPC 通信 | `import { invoke, listen } from '@tauri-apps/api/core'` |
| react-markdown | Markdown 渲染 | `import ReactMarkdown from 'react-markdown'` |
| @google/genai | Gemini AI SDK | `import { GoogleGenAI } from '@google/genai'` |

## 禁止事项

- ❌ 禁止在前端直接调用 Rust API（应通过 tauri-api.ts 封装）
- ❌ 禁止跳过 `@tauri-apps/api` 直接使用 Tauri IPC
- ❌ 禁止使用 `as any` 绕过类型检查
- ❌ 禁止在 useEffect 中忘记清理事件监听器
- ❌ 避免使用 class 组件（统一使用函数组件 + hooks）

## 参考代码

- `src/App.tsx` - 主组件（状态管理 + Tauri 集成）
- `src/services/tauri-api.ts` - Tauri API 封装
- `src/types/bindings.ts` - ts-rs 生成的类型

## 状态同步原则

在调用 Tauri 命令后，**必须**同步更新本地状态：

```typescript
// ✅ 正确 - 成功后更新本地状态
const handleCreateConversation = async (title: string) => {
  const newConvo = await tauriApi.createConversation(title);
  if (newConvo) {
    // 关键：更新本地状态
    setConversations(prev => [...prev, newConvo]);
  }
};

// ❌ 错误 - 依赖事件监听更新状态（可能导致竞态）
const handleCreateConversation = async (title: string) => {
  await tauriApi.createConversation(title);
// 状态可能不会立即更新！
};
```

## Tauri 事件处理

```typescript
// 监听 Tauri 事件
useEffect(() => {
  // 对话变更事件
  const unlistenConvo = listen<{ type: string; id: string }>(
    'conversation_changed',
    (event) => {
      const { type, id } = event.payload;
      switch (type) {
        case 'created':
          // 重新加载对话列表
          refreshConversations();
          break;
        case 'deleted':
          setConversations(prev => prev.filter(c => c.id !== id));
          break;
      }
    }
  );

  // 消息块事件（流式响应）
  const unlistenChunk = listen<string>('chat_chunk', (event) => {
    setCurrentMessage(prev => prev + event.payload);
  });

  return () => {
    unlistenConvo.then((fn) => fn());
    unlistenChunk.then((fn) => fn());
  };
}, []);
```

## 检查清单

- [ ] 是否使用 `@tauri-apps/api` 进行 IPC 通信
- [ ] 是否使用函数组件 + hooks
- [ ] 是否正确使用 TypeScript 类型（来自 bindings.ts）
- [ ] 是否使用 Tailwind CSS 样式
- [ ] 是否在 useEffect 中正确清理事件监听器
- [ ] Tauri 命令调用后是否同步更新本地状态
- [ ] 是否避免了不必要的重渲染（useCallback/useMemo）

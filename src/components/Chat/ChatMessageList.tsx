/**
 * ChatMessageList - Displays a list of chat messages
 */

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: bigint;
  model_id: string | null;
  attachments: string[];
  images: string[];
}

interface ChatMessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function formatTimestamp(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessageRole(role: string): string {
  switch (role) {
    case 'user':
      return 'User';
    case 'assistant':
      return 'AI';
    case 'system':
      return 'System';
    default:
      return role;
  }
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-500">Loading messages...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-500">No messages yet. Start a conversation!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex flex-col gap-1 p-3 rounded-lg max-w-[80%] ${
            message.role === 'user'
              ? 'self-end bg-blue-100 dark:bg-blue-900'
              : 'self-start bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{formatMessageRole(message.role)}</span>
            <span>{formatTimestamp(message.timestamp)}</span>
          </div>
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>
      ))}
    </div>
  );
}

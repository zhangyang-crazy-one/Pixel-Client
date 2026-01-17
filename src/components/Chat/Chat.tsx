/**
 * Chat - Main chat component that combines message list and input
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: bigint;
  model_id: string | null;
  attachments: string[];
  images: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  created_at: bigint;
  updated_at: bigint;
  model_id: string | null;
}

interface ChatProps {
  session: ChatSession | null;
  onSendMessage: (content: string) => Promise<void>;
  isLoading?: boolean;
}

export function Chat({ session, onSendMessage, isLoading }: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages, scrollToBottom]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      await onSendMessage(content);
    },
    [onSendMessage]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ChatMessageList
          messages={session?.messages ?? []}
          isLoading={isLoading}
        />
        <div ref={messagesEndRef} />
      </div>
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Type a message..."
      />
    </div>
  );
}

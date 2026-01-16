/**
 * Chat Hook - Manages chat session state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChatSession, Message } from '../types';
import {
  createChatSession,
  addMessageToSession,
  getSessionMessages,
  deleteChatSession,
  getActiveSessions,
} from '../tauri-api';

interface UseChatReturn {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  error: string | null;
  createSession: (title?: string) => Promise<string>;
  selectSession: (sessionId: string) => Promise<void>;
  sendMessage: (content: string, role?: string) => Promise<Message | null>;
  removeSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getActiveSessions(50);
      setSessions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(async (title?: string): Promise<string> => {
    setIsLoading(true);
    try {
      const sessionId = await createChatSession(title);
      await refreshSessions();
      return sessionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSessions]);

  const selectSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const messages = await getSessionMessages(sessionId);
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        setCurrentSession({ ...session, messages });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [sessions]);

  const sendMessage = useCallback(
    async (content: string, role: string = 'user'): Promise<Message | null> => {
      if (!currentSession) {
        setError('No session selected');
        return null;
      }

      setIsLoading(true);
      try {
        const message = await addMessageToSession(
          currentSession.id,
          role,
          content
        );

        // Update current session with new message
        setCurrentSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, message],
            updated_at: BigInt(Date.now()),
          };
        });

        // Update session list
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id
              ? { ...s, messages: [...s.messages, message], updated_at: BigInt(Date.now()) }
              : s
          )
        );

        return message;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession]
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      setIsLoading(true);
      try {
        await deleteChatSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete session');
      } finally {
        setIsLoading(false);
      }
    },
    [currentSession]
  );

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  return {
    sessions,
    currentSession,
    isLoading,
    error,
    createSession,
    selectSession,
    sendMessage,
    removeSession,
    refreshSessions,
  };
}

/**
 * Message formatting utilities
 */
export function formatTimestamp(timestamp: bigint | number): string {
  const date = new Date(Number(timestamp));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatMessageRole(role: string): string {
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

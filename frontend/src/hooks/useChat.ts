import { useState, useCallback, useRef } from 'react';
import { ChatMessage, MasteryProgress, SSEEvent, AgentRole } from '../types';

interface UseChatReturn {
  messages: ChatMessage[];
  progress: MasteryProgress | null;
  isLoading: boolean;
  sessionId: string | null;
  threadId: string | null;
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<MasteryProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messageIdCounter = useRef(0);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: String(++messageIdCounter.current),
      role: 'user',
      content,
      agentRole: null,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Placeholder for streaming assistant message
    const assistantId = String(++messageIdCounter.current);
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      agentRole: null,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/universal-mastery-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          threadId,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          try {
            const event: SSEEvent = JSON.parse(jsonStr);

            if (event.type === 'token' && event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
            } else if (event.type === 'done') {
              if (event.sessionId) setSessionId(event.sessionId);
              if (event.threadId) setThreadId(event.threadId);
              if (event.masteryProgress) setProgress(event.masteryProgress);
              if (event.currentAgent) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, agentRole: event.currentAgent as AgentRole }
                      : m
                  )
                );
              }
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${event.error}` }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Failed to connect to the learning agent. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, threadId]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`);
      if (!response.ok) throw new Error('Session not found');

      const data = await response.json();
      setSessionId(data.session.sessionId);
      setThreadId(data.session.threadId);
      setProgress(data.masteryProgress);
      setMessages(
        data.messages.map((m: any, i: number) => ({
          id: String(i + 1),
          ...m,
        }))
      );
      messageIdCounter.current = data.messages.length;
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, []);

  return { messages, progress, isLoading, sessionId, threadId, sendMessage, loadSession };
}

import { useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';
import { MermaidDiagram } from './MermaidDiagram';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend?: (message: string) => void;
}

function extractQuickReplies(content: string): string[] {
  // Match A) B) C) D) or A. B. C. style options (with or without bold)
  const abcMatch = content.match(/(?:^|\n)\s*\**[A-Da-d1-4][)\.]\**\s*(.+)/g);
  if (abcMatch && abcMatch.length >= 2) {
    return abcMatch.map(m =>
      m.replace(/^\s*\**[A-Da-d1-4][)\.]\**\s*/, '').replace(/\*\*/g, '').trim()
    ).filter(Boolean);
  }

  return [];
}

export function ChatArea({ messages, isLoading, onSend }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const lastAssistantContent = !isLoading && lastMessage?.role === 'assistant' ? lastMessage.content : '';

  const quickReplies = useMemo(() => {
    if (!lastAssistantContent) return [];
    return extractQuickReplies(lastAssistantContent);
  }, [lastAssistantContent]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-3">What would you like to master?</h2>
          <p className="text-amber-700/70 mb-8">
            Pick a topic and I'll guide you through an interactive learning adventure.
          </p>
          <div className="grid grid-cols-1 gap-3 text-left">
            {[
              '🔬 I want to master quantum mechanics from scratch',
              '🧠 Help me deeply understand how neural networks learn',
              '⚖️ I need to master contract law for my bar exam',
              '🎵 Teach me music theory, I\'m a complete beginner',
            ].map((example) => (
              <button
                key={example}
                onClick={() => onSend?.(example.replace(/^.\s/, ''))}
                className="p-4 text-sm text-amber-900 bg-white/80 border-2 border-amber-200 rounded-2xl hover:bg-amber-50 hover:border-amber-300 hover:shadow-md transition-all text-left"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {messages.map((message) => {
        const isEmpty = message.role === 'assistant' && !message.content;
        const showDots = isEmpty && isLoading;

        // Skip empty assistant messages that aren't loading
        if (isEmpty && !isLoading) return null;

        return (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${
              message.role === 'user'
                ? 'bg-orange-100 border-2 border-orange-300'
                : 'bg-emerald-100 border-2 border-emerald-300'
            }`}>
              {message.role === 'user' ? '👤' : '🧠'}
            </div>
            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-orange-50 border-2 border-orange-200 text-amber-900'
                  : 'bg-white border-2 border-emerald-200 text-gray-800'
              }`}
            >
              {showDots ? (
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              ) : message.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children }) {
                      const text = String(children).trim();
                      const isMermaidClass = /language-mermaid/.test(className || '');
                      const isMermaidSyntax = /^(graph |flowchart |sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap)/m.test(text);
                      if (isMermaidClass || isMermaidSyntax) {
                        return <MermaidDiagram chart={text} />;
                      }
                      return (
                        <code className={`${className} bg-amber-100 rounded px-1 py-0.5 text-sm`}>
                          {children}
                        </code>
                      );
                    },
                    pre({ children }) {
                      return <div className="my-2">{children}</div>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        );
      })}
      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-start pl-12">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => onSend?.(reply)}
              className="px-4 py-2 text-sm bg-white border-2 border-amber-300 text-amber-800 rounded-full hover:bg-amber-50 hover:border-amber-400 hover:shadow-sm transition-all"
            >
              {reply}
            </button>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

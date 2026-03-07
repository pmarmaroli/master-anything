import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { ChatMessage } from '../types';
import { MermaidDiagram } from './MermaidDiagram';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend?: (message: string) => void;
  listeningMode?: boolean;
  language?: string | null;
  onLanguageChange?: (lang: string) => void;
  adventureMode?: boolean;
}

function SpeakButton({ text, language }: { text: string; language?: string | null }) {
  const [speaking, setSpeaking] = useState(false);

  const toggle = useCallback(() => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/[#>`\-*_]/g, '')
      .trim();
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    if (language === 'fr') utterance.lang = 'fr-FR';
    else if (language === 'en') utterance.lang = 'en-US';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [text, speaking, language]);

  useEffect(() => {
    return () => { speechSynthesis.cancel(); };
  }, []);

  if (!('speechSynthesis' in window)) return null;

  return (
    <button
      onClick={toggle}
      className={`mt-2 text-xs flex items-center gap-1 transition-colors ${
        speaking ? 'text-amber-600' : 'text-gray-400 hover:text-amber-500'
      }`}
      title={speaking ? 'Stop reading' : 'Read aloud'}
    >
      {speaking ? '\u23F9\uFE0F Stop' : '\uD83D\uDD0A Listen'}
    </button>
  );
}

function extractQuickReplies(content: string, language?: string | null): string[] {
  const abcMatch = content.match(/(?:^|\n)\s*\**[A-Da-d1-4][)\.]\**\s*(.+)/g);
  if (abcMatch && abcMatch.length >= 2) {
    return abcMatch.map(m =>
      m.replace(/^\s*\**[A-Da-d1-4][)\.]\**\s*/, '').replace(/\*\*/g, '').trim()
    ).filter(Boolean);
  }

  const questions = content.match(/[^.!?\n]+\?/g);
  if (!questions || questions.length === 0) return [];

  const lastQuestion = questions[questions.length - 1].toLowerCase().trim();
  const fr = language === 'fr';

  const yesNoPatterns = fr
    ? /\b(souhaites?-tu|veux-tu|voulez-vous|est-ce que|as-tu|avez-vous|aimerais-tu|aimeriez-vous|on (continue|passe|commence)|pr\u00eat[e]?\s*(\u00e0|\?)|d'accord|\u00e7a te va|\u00e7a vous va|tu veux|tu pr\u00e9f\u00e8res)/i
    : /\b(do you|would you|shall (i|we)|can (i|you)|should (i|we)|are you|is (it|that|this)|ready to|want (me|to)|did you)/i;

  if (yesNoPatterns.test(lastQuestion)) {
    return fr ? ['Oui', 'Non'] : ['Yes', 'No'];
  }

  const openPatterns = fr
    ? /\b(pourquoi|comment|qu'est-ce|selon toi|\u00e0 ton avis|que penses-tu|d'apr\u00e8s toi|explique|peux-tu expliquer|quelle est|quel est|quelles sont)/i
    : /\b(why|how|what do you think|in your opinion|can you explain|what is|what are|according to you)/i;

  if (openPatterns.test(lastQuestion)) {
    return fr ? ['Je ne sais pas'] : ["I don't know"];
  }

  return [];
}

const LANGUAGES = [
  { code: 'fr', label: 'Francais', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'en', label: 'English', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
];

function MarkdownContent({ content, adventureMode }: { content: string; adventureMode?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ className, children }) {
          const text = String(children).trim();
          const isMermaidClass = /language-mermaid/.test(className || '');
          const isMermaidSyntax = /^(graph |flowchart |sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap)/m.test(text);
          if (isMermaidClass || isMermaidSyntax) {
            return <MermaidDiagram chart={text} />;
          }
          const isSvgClass = /language-svg/.test(className || '');
          const isSvgSyntax = /^<svg[\s>]/i.test(text);
          if (isSvgClass || isSvgSyntax) {
            return (
              <div
                className="my-4 flex justify-center overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            );
          }
          return (
            <code className={`${className} ${adventureMode ? 'bg-[#2a2a4a] text-[#00ff88]' : 'bg-amber-100'} rounded px-1 py-0.5 text-sm`}>
              {children}
            </code>
          );
        },
        pre({ children }) {
          return <div className="my-2">{children}</div>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function SplitBubble({ content, delay, adventureMode }: { content: string; delay: number; adventureMode?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 overflow-x-auto ${
        adventureMode ? 'adventure-bubble-bot split-bubble' : 'rounded-2xl shadow-sm bg-white border-2 border-emerald-200 text-gray-800'
      }`}
    >
      <MarkdownContent content={content} adventureMode={adventureMode} />
    </div>
  );
}

export function ChatArea({ messages, isLoading, onSend, listeningMode, language, onLanguageChange, adventureMode }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>('');

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages, isLoading]);

  // Auto-speak new assistant messages in listening mode
  useEffect(() => {
    if (!listeningMode || isLoading || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant' || !last.content || last.content === lastSpokenRef.current) return;
    lastSpokenRef.current = last.content;

    const clean = last.content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/[#>`\-*_]/g, '')
      .trim();
    if (!clean || !('speechSynthesis' in window)) return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    if (language === 'fr') utterance.lang = 'fr-FR';
    else if (language === 'en') utterance.lang = 'en-US';
    utterance.onend = () => {
      window.dispatchEvent(new CustomEvent('assistant-speech-ended'));
    };
    speechSynthesis.speak(utterance);
  }, [listeningMode, isLoading, messages, language]);

  const lastMessage = messages[messages.length - 1];
  const lastAssistantContent = !isLoading && lastMessage?.role === 'assistant' ? lastMessage.content : '';

  const quickReplies = useMemo(() => {
    if (!lastAssistantContent) return [];
    return extractQuickReplies(lastAssistantContent, language);
  }, [lastAssistantContent, language]);

  const noLang = !language;

  if (messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto ${adventureMode ? 'adventure-welcome' : ''}`}>
        <div className="text-center max-w-lg">
          <h2 className={`mb-3 ${adventureMode ? '' : 'text-2xl font-bold text-amber-900'}`}
            style={adventureMode ? { fontFamily: "'Press Start 2P', cursive", fontSize: '14px', color: '#e0e0e0' } : undefined}
          >
            {adventureMode
              ? (language === 'fr' ? 'CHOISIS TON DONJON' : 'CHOOSE YOUR DUNGEON')
              : (language === 'fr' ? 'Que voulez-vous apprendre ?' : 'What would you like to master?')
            }
          </h2>
          <p className={`mb-6 ${adventureMode ? '' : 'text-amber-700/70'}`}
            style={adventureMode ? { fontFamily: "'Press Start 2P', cursive", fontSize: '8px', color: '#6a6a8a', lineHeight: '2' } : undefined}
          >
            {adventureMode
              ? (language === 'fr' ? 'Choisis un sujet et descends dans le donjon.' : 'Pick a topic and enter the dungeon.')
              : (language === 'fr'
                ? "Choisissez un sujet et je vous guiderai dans une aventure d'apprentissage interactive."
                : "Pick a topic and I'll guide you through an interactive learning adventure.")
            }
          </p>
          <div className="flex justify-center gap-3 mb-6">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onLanguageChange?.(lang.code)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                  adventureMode
                    ? `border-2 ${language === lang.code ? 'border-[#e94560] text-[#e0e0e0]' : 'border-[#2a2a4a] text-[#6a6a8a] hover:border-[#e94560]'}`
                    : `rounded-full ${language === lang.code ? 'bg-amber-500 text-white shadow-sm' : 'bg-white/80 border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300'}`
                }`}
                style={adventureMode ? { borderRadius: '2px', fontFamily: "'Press Start 2P', cursive", fontSize: '9px', boxShadow: '2px 2px 0px #000' } : undefined}
              >
                <span>{lang.flag}</span> {lang.label}
              </button>
            ))}
          </div>
          <div className={`grid grid-cols-1 gap-3 text-left ${noLang ? 'opacity-40 pointer-events-none' : ''}`}>
            {(language === 'fr' ? [
              '\uD83D\uDD2C Je veux comprendre la physique quantique depuis zero',
              '\uD83E\uDDE0 Aide-moi a comprendre comment les reseaux de neurones apprennent',
              '\u2696\uFE0F Je dois maitriser le droit des contrats pour mon examen',
            ] : [
              '\uD83D\uDD2C I want to master quantum mechanics from scratch',
              '\uD83E\uDDE0 Help me deeply understand how neural networks learn',
              '\u2696\uFE0F I need to master contract law for my bar exam',
            ]).map((example) => (
              <button
                key={example}
                onClick={() => onSend?.(example.replace(/^.\s/, ''))}
                disabled={noLang}
                className={`p-4 text-sm text-left transition-all disabled:cursor-not-allowed ${
                  adventureMode
                    ? 'border-2 border-[#2a2a4a] text-[#e0e0e0] hover:border-[#e94560]'
                    : 'text-amber-900 bg-white/80 border-2 border-amber-200 rounded-2xl hover:bg-amber-50 hover:border-amber-300 hover:shadow-md'
                }`}
                style={adventureMode ? { borderRadius: '2px', fontFamily: "'Press Start 2P', cursive", fontSize: '8px', lineHeight: '2', backgroundColor: '#1a1a2e', boxShadow: '3px 3px 0px #000' } : undefined}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Split messages with [SPLIT] markers into multiple bubbles with staggered reveal
  const renderAssistantContent = (content: string, messageId: string) => {
    if (adventureMode && content.includes('[SPLIT]')) {
      const parts = content.split('[SPLIT]').map(s => s.trim()).filter(Boolean);
      return parts.map((part, i) => (
        <SplitBubble key={`${messageId}-split-${i}`} content={part} delay={i * 500} adventureMode={adventureMode} />
      ));
    }
    return [
      <MarkdownContent key={`${messageId}-md`} content={content} adventureMode={adventureMode} />
    ];
  };

  return (
    <div className={`flex-1 overflow-y-auto p-4 space-y-5 ${adventureMode ? 'adventure-chat' : ''}`}>
      {messages.map((message) => {
        const isEmpty = message.role === 'assistant' && !message.content;
        const showDots = isEmpty && isLoading;

        if (isEmpty && !isLoading) return null;

        const isUser = message.role === 'user';
        const isSplit = adventureMode && message.role === 'assistant' && message.content.includes('[SPLIT]');

        return (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center text-lg ${
              adventureMode
                ? (isUser ? 'adventure-avatar-user' : 'adventure-avatar-bot')
                : (isUser
                  ? 'rounded-full bg-orange-100 border-2 border-orange-300'
                  : 'rounded-full bg-emerald-100 border-2 border-emerald-300')
            }`}
              style={adventureMode ? { borderRadius: '2px', border: `2px solid ${isUser ? '#0096ff' : '#8b5cf6'}`, backgroundColor: isUser ? '#1e3a5f' : '#2a1a3e' } : undefined}
            >
              {isUser ? '\uD83D\uDDE1\uFE0F' : '\uD83E\uDDE0'}
            </div>

            {/* Bubble(s) */}
            {isSplit ? (
              <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]">
                {renderAssistantContent(message.content, message.id)}
              </div>
            ) : (
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 overflow-x-auto ${
                  adventureMode
                    ? (isUser ? 'adventure-bubble-user' : 'adventure-bubble-bot')
                    : (isUser
                      ? 'rounded-2xl shadow-sm bg-orange-50 border-2 border-orange-200 text-amber-900'
                      : 'rounded-2xl shadow-sm bg-white border-2 border-emerald-200 text-gray-800')
                }`}
              >
                {showDots ? (
                  <div className={`flex space-x-1.5 ${adventureMode ? 'adventure-dots' : ''}`}>
                    <div className={`w-2 h-2 animate-bounce ${adventureMode ? 'bg-[#e94560]' : 'bg-emerald-400 rounded-full'}`}
                      style={adventureMode ? { borderRadius: 0 } : undefined} />
                    <div className={`w-2 h-2 animate-bounce [animation-delay:0.15s] ${adventureMode ? 'bg-[#e94560]' : 'bg-emerald-400 rounded-full'}`}
                      style={adventureMode ? { borderRadius: 0 } : undefined} />
                    <div className={`w-2 h-2 animate-bounce [animation-delay:0.3s] ${adventureMode ? 'bg-[#e94560]' : 'bg-emerald-400 rounded-full'}`}
                      style={adventureMode ? { borderRadius: 0 } : undefined} />
                  </div>
                ) : message.role === 'assistant' ? (
                  <>
                    <MarkdownContent content={message.content} adventureMode={adventureMode} />
                    {!listeningMode && !adventureMode && <SpeakButton text={message.content} language={language} />}
                  </>
                ) : (
                  <p style={adventureMode ? { fontFamily: "'Press Start 2P', cursive", fontSize: '10px', lineHeight: '1.8' } : undefined}>
                    {message.content}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-start pl-12">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => onSend?.(reply)}
              className={`px-4 py-2 text-sm transition-all ${
                adventureMode
                  ? 'adventure-quick-reply'
                  : 'bg-white border-2 border-amber-300 text-amber-800 rounded-full hover:bg-amber-50 hover:border-amber-400 hover:shadow-sm'
              }`}
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

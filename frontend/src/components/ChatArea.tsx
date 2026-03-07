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
}

function SpeakButton({ text, language }: { text: string; language?: string | null }) {
  const [speaking, setSpeaking] = useState(false);

  const toggle = useCallback(() => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    // Strip markdown formatting for cleaner speech
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
      {speaking ? '⏹️ Stop' : '🔊 Listen'}
    </button>
  );
}

function extractQuickReplies(content: string, language?: string | null): string[] {
  // Match A) B) C) D) or A. B. C. style options (with or without bold)
  const abcMatch = content.match(/(?:^|\n)\s*\**[A-Da-d1-4][)\.]\**\s*(.+)/g);
  if (abcMatch && abcMatch.length >= 2) {
    return abcMatch.map(m =>
      m.replace(/^\s*\**[A-Da-d1-4][)\.]\**\s*/, '').replace(/\*\*/g, '').trim()
    ).filter(Boolean);
  }

  // Detect question type from the last sentence ending with ?
  const questions = content.match(/[^.!?\n]+\?/g);
  if (!questions || questions.length === 0) return [];

  const lastQuestion = questions[questions.length - 1].toLowerCase().trim();
  const fr = language === 'fr';

  // Yes/No detection patterns
  const yesNoPatterns = fr
    ? /\b(souhaites?-tu|veux-tu|voulez-vous|est-ce que|as-tu|avez-vous|aimerais-tu|aimeriez-vous|on (continue|passe|commence)|prêt[e]?\s*(à|\?)|d'accord|ça te va|ça vous va|tu veux|tu préfères)/i
    : /\b(do you|would you|shall (i|we)|can (i|you)|should (i|we)|are you|is (it|that|this)|ready to|want (me|to)|did you)/i;

  if (yesNoPatterns.test(lastQuestion)) {
    return fr ? ['Oui', 'Non'] : ['Yes', 'No'];
  }

  // Open question detection — suggest "I don't know"
  const openPatterns = fr
    ? /\b(pourquoi|comment|qu'est-ce|selon toi|à ton avis|que penses-tu|d'après toi|explique|peux-tu expliquer|quelle est|quel est|quelles sont)/i
    : /\b(why|how|what do you think|in your opinion|can you explain|what is|what are|according to you)/i;

  if (openPatterns.test(lastQuestion)) {
    return fr ? ['Je ne sais pas'] : ["I don't know"];
  }

  return [];
}

const LANGUAGES = [
  { code: 'fr', label: 'Francais', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function ChatArea({ messages, isLoading, onSend, listeningMode, language, onLanguageChange }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>('');

  // Auto-scroll to bottom on new messages and during streaming
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    // Use setTimeout to ensure DOM has updated
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
      // Dispatch custom event so MessageInput can auto-start mic
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
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-amber-900 mb-3">
            {language === 'fr' ? 'Que voulez-vous apprendre ?' : 'What would you like to master?'}
          </h2>
          <p className="text-amber-700/70 mb-6">
            {language === 'fr'
              ? 'Choisissez un sujet et je vous guiderai dans une aventure d\'apprentissage interactive.'
              : 'Pick a topic and I\'ll guide you through an interactive learning adventure.'}
          </p>
          <div className="flex justify-center gap-3 mb-6">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onLanguageChange?.(lang.code)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  language === lang.code
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white/80 border-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300'
                }`}
              >
                <span>{lang.flag}</span> {lang.label}
              </button>
            ))}
          </div>
          <div className={`grid grid-cols-1 gap-3 text-left ${noLang ? 'opacity-40 pointer-events-none' : ''}`}>
            {(language === 'fr' ? [
              '🔬 Je veux comprendre la physique quantique depuis zero',
              '🧠 Aide-moi a comprendre comment les reseaux de neurones apprennent',
              '⚖️ Je dois maitriser le droit des contrats pour mon examen',
            ] : [
              '🔬 I want to master quantum mechanics from scratch',
              '🧠 Help me deeply understand how neural networks learn',
              '⚖️ I need to master contract law for my bar exam',
            ]).map((example) => (
              <button
                key={example}
                onClick={() => onSend?.(example.replace(/^.\s/, ''))}
                disabled={noLang}
                className="p-4 text-sm text-amber-900 bg-white/80 border-2 border-amber-200 rounded-2xl hover:bg-amber-50 hover:border-amber-300 hover:shadow-md transition-all text-left disabled:cursor-not-allowed"
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
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm overflow-x-auto ${
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
                <>
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
                        // Render SVG code blocks as inline illustrations
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
                  {!listeningMode && <SpeakButton text={message.content} language={language} />}
                </>
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

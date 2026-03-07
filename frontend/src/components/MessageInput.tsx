import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  listeningMode?: boolean;
  language?: string | null;
  adventureMode?: boolean;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function MessageInput({ onSend, disabled, listeningMode, language, adventureMode }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // In listening mode, auto-start mic when assistant finishes speaking
  useEffect(() => {
    if (!listeningMode || !SpeechRecognition) return;
    const handler = () => {
      // Small delay to avoid picking up speaker audio
      setTimeout(() => {
        if (!recognitionRef.current) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : '';

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((r: any) => r[0].transcript)
              .join('');
            setInput(transcript);
            // Auto-send when final result is received
            if (event.results[event.results.length - 1].isFinal && transcript.trim()) {
              onSend(transcript.trim());
              setInput('');
            }
          };

          recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
          };
          recognition.onerror = () => {
            setIsListening(false);
            recognitionRef.current = null;
          };

          recognitionRef.current = recognition;
          recognition.start();
          setIsListening(true);
        }
      }, 500);
    };
    window.addEventListener('assistant-speech-ended', handler);
    return () => window.removeEventListener('assistant-speech-ended', handler);
  }, [listeningMode, onSend, language]);

  // Clear input when a message is being sent (e.g. via quick reply buttons)
  useEffect(() => {
    if (disabled) setInput('');
  }, [disabled]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    setInput('');
    // Reset textarea height immediately
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : '';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, language]);

  return (
    <div className={`border-t p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-shrink-0 ${
      adventureMode
        ? 'adventure-input-area border-[#2a2a4a]'
        : 'border-amber-200/60 bg-white/50 backdrop-blur-sm'
    }`}
      style={adventureMode ? { backgroundColor: '#1a1a2e', borderColor: '#2a2a4a' } : undefined}
    >
      <div className="flex items-end gap-2 sm:gap-3 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={adventureMode
            ? (language === 'fr' ? 'Frappe ici...' : 'Strike here...')
            : (language === 'fr' ? 'Tapez votre reponse ici...' : 'Type your answer here...')}
          disabled={disabled}
          rows={1}
          className={`flex-1 resize-none px-4 py-3 text-sm focus:outline-none disabled:opacity-50 ${
            adventureMode
              ? 'adventure-input border-2 border-[#2a2a4a] focus:border-[#e94560]'
              : 'rounded-2xl border-2 border-amber-200 bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-300 placeholder:text-amber-400'
          }`}
          style={adventureMode ? { borderRadius: '2px', backgroundColor: '#0f0f23', color: '#e0e0e0', fontFamily: "'Press Start 2P', cursive", fontSize: '10px' } : undefined}
        />
        {SpeechRecognition && !adventureMode && (
          <button
            onClick={toggleListening}
            disabled={disabled}
            className={`rounded-2xl px-3 py-3 text-sm transition-colors shadow-sm ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                : 'bg-white border-2 border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300'
            } disabled:opacity-40`}
            title={isListening ? 'Stop recording' : 'Voice input'}
          >
            \uD83C\uDF99\uFE0F
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className={`px-3 sm:px-5 py-3 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap ${
            adventureMode
              ? 'adventure-send-btn'
              : 'rounded-2xl bg-amber-500 hover:bg-amber-600 shadow-sm'
          }`}
          style={adventureMode ? { borderRadius: '2px', backgroundColor: '#e94560', boxShadow: '3px 3px 0px #000', fontFamily: "'Press Start 2P', cursive", fontSize: '9px' } : undefined}
        >
          {adventureMode ? '\u2694\uFE0F' : (language === 'fr' ? 'Envoyer' : 'Send')}
        </button>
      </div>
    </div>
  );
}

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  listeningMode?: boolean;
  language?: string | null;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function MessageInput({ onSend, disabled, listeningMode, language }: MessageInputProps) {
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
    <div className="border-t border-amber-200/60 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/50 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-end gap-2 sm:gap-3 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={language === 'fr' ? 'Tapez votre reponse ici...' : 'Type your answer here...'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-2xl border-2 border-amber-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 disabled:opacity-50 placeholder:text-amber-400"
        />
        {SpeechRecognition && (
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
            🎙️
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="rounded-2xl bg-amber-500 px-3 sm:px-5 py-3 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
        >
          {language === 'fr' ? 'Envoyer' : 'Send'}
        </button>
      </div>
    </div>
  );
}

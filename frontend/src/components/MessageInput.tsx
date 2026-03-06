import { useState, useRef, useCallback, type KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
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
    recognition.lang = ''; // auto-detect

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
  }, [isListening]);

  return (
    <div className="border-t border-amber-200/60 p-3 sm:p-4 bg-white/50 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-end gap-2 sm:gap-3 max-w-4xl mx-auto">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your answer here..."
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
          className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}

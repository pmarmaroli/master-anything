import { useEffect, useRef, useState } from 'react';

interface RoundTimerProps {
  active: boolean;
  language?: string;
}

export function RoundTimer({ active, language }: RoundTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setSeconds(0);
      setShowWarning(false);
      setWarningDismissed(false);
      const id = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
      intervalRef.current = id;
      return () => clearInterval(id);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSeconds(0);
      setShowWarning(false);
      return undefined;
    }
  }, [active]);

  useEffect(() => {
    if (seconds === 300 && !warningDismissed) {
      setShowWarning(true);
    }
  }, [seconds, warningDismissed]);

  if (!active) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const isLong = seconds >= 300;

  const warningText = language === 'fr'
    ? '5 min. Continuer ou pause ?'
    : '5 min round. Keep going or take a break?';

  return (
    <div
      className="fixed bottom-20 right-4 z-40 pointer-events-auto"
      style={{ fontFamily: "'Press Start 2P', cursive" }}
    >
      {showWarning && (
        <div
          className="mb-2 px-3 py-2 text-center"
          style={{
            background: '#e8eeff',
            border: '2px solid #cc8800',
            boxShadow: '3px 3px 0px #a0b0d0',
            fontSize: '7px',
            color: '#cc8800',
            maxWidth: '160px',
            lineHeight: '1.6',
          }}
        >
          {warningText}
          <button
            onClick={() => { setShowWarning(false); setWarningDismissed(true); }}
            style={{
              display: 'block',
              margin: '6px auto 0',
              background: '#e94560',
              border: 'none',
              color: '#fff',
              fontFamily: "'Press Start 2P', cursive",
              fontSize: '6px',
              padding: '3px 6px',
              cursor: 'pointer',
              boxShadow: '2px 2px 0px #a0b0d0',
            }}
          >
            OK
          </button>
        </div>
      )}
      <div
        style={{
          background: '#e8eeff',
          border: `2px solid ${isLong ? '#e94560' : '#c0ccee'}`,
          boxShadow: '3px 3px 0px #a0b0d0',
          padding: '4px 8px',
          fontSize: '9px',
          color: isLong ? '#e94560' : '#4a4a6a',
        }}
      >
        ⏱ {timeStr}
      </div>
    </div>
  );
}

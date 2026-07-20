import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Settings, Volume2, VolumeX } from 'lucide-react';

type Phase = 'work' | 'shortBreak' | 'longBreak';

const PHASE_LABELS: Record<Phase, string> = {
  work: 'Trabajo',
  shortBreak: 'Descanso corto',
  longBreak: 'Descanso largo',
};

const PHASE_COLORS: Record<Phase, string> = {
  work: '#d4a853',
  shortBreak: '#22c55e',
  longBreak: '#3b82f6',
};

export default function Pomodoro() {
  const [workDuration, setWorkDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [phase, setPhase] = useState<Phase>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [pulse, setPulse] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getDuration = useCallback((p: Phase) => {
    switch (p) {
      case 'work': return workDuration;
      case 'shortBreak': return shortBreakDuration;
      case 'longBreak': return longBreakDuration;
    }
  }, [workDuration, shortBreakDuration, longBreakDuration]);

  const switchPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    setTimeLeft(getDuration(newPhase) * 60);
    setIsRunning(autoStart);
  }, [getDuration, autoStart]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Phase complete
          setPulse(true);
          setTimeout(() => setPulse(false), 2000);

          setPhase(currentPhase => {
            if (currentPhase === 'work') {
              const newSessions = completedSessions + 1;
              setCompletedSessions(newSessions);
              const nextPhase = newSessions % 4 === 0 ? 'longBreak' : 'shortBreak';
              setTimeLeft(getDuration(nextPhase) * 60);
              setIsRunning(autoStart);
              return nextPhase;
            } else {
              setTimeLeft(getDuration('work') * 60);
              setIsRunning(autoStart);
              return 'work';
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, completedSessions, getDuration, autoStart]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(getDuration(phase) * 60);
  }, [phase, getDuration]);

  const skipPhase = useCallback(() => {
    if (phase === 'work') {
      const newSessions = completedSessions + 1;
      setCompletedSessions(newSessions);
      const nextPhase = newSessions % 4 === 0 ? 'longBreak' : 'shortBreak';
      switchPhase(nextPhase);
    } else {
      switchPhase('work');
    }
  }, [phase, completedSessions, switchPhase]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalSeconds = getDuration(phase) * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: `${PHASE_COLORS[phase]}20`, color: PHASE_COLORS[phase] }}>
            {PHASE_LABELS[phase]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundEnabled(s => !s)} className="p-1 rounded transition-all" style={{ color: '#9ca3af' }}>
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button onClick={() => setShowSettings(s => !s)} className="p-1 rounded transition-all" style={{ color: '#9ca3af' }}>
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        {/* Circular timer */}
        <div className="relative flex items-center justify-center" style={{ animation: pulse ? 'pulse 0.5s ease-in-out 3' : 'none' }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            {/* Background circle */}
            <circle cx="110" cy="110" r="90" fill="none" stroke="#1a2744" strokeWidth="8" />
            {/* Progress circle */}
            <circle
              cx="110"
              cy="110"
              r="90"
              fill="none"
              stroke={PHASE_COLORS[phase]}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 110 110)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-5xl font-bold" style={{ color: PHASE_COLORS[phase], transition: 'color 0.3s' }}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs mt-1" style={{ color: '#6b7280' }}>{PHASE_LABELS[phase]}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={resetTimer}
            className="flex items-center justify-center rounded-full transition-all hover:scale-105"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center justify-center rounded-full transition-all hover:scale-105"
            style={{ width: 60, height: 60, background: PHASE_COLORS[phase], color: '#0a1628' }}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button
            onClick={skipPhase}
            className="flex items-center justify-center rounded-full transition-all hover:scale-105"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Session counter */}
        <div className="text-center">
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Pomodoros completados: <span style={{ color: '#d4a853' }}>{completedSessions}</span>
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: i < (completedSessions % 4) ? '#d4a853' : '#1a2744',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.9)' }}>
          <div className="flex flex-col gap-4 p-6 rounded-xl" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)', width: 300 }}>
            <h3 className="text-lg font-semibold text-white">Configuracion</h3>

            <div className="flex flex-col gap-2">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Trabajo (min)</label>
              <input
                type="range" min="1" max="60" value={workDuration}
                onChange={e => { setWorkDuration(Number(e.target.value)); if (phase === 'work' && !isRunning) setTimeLeft(Number(e.target.value) * 60); }}
                className="w-full"
                style={{ accentColor: '#d4a853' }}
              />
              <span className="text-sm text-white">{workDuration} min</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Descanso corto (min)</label>
              <input
                type="range" min="1" max="30" value={shortBreakDuration}
                onChange={e => { setShortBreakDuration(Number(e.target.value)); if (phase === 'shortBreak' && !isRunning) setTimeLeft(Number(e.target.value) * 60); }}
                className="w-full"
                style={{ accentColor: '#22c55e' }}
              />
              <span className="text-sm text-white">{shortBreakDuration} min</span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Descanso largo (min)</label>
              <input
                type="range" min="1" max="60" value={longBreakDuration}
                onChange={e => { setLongBreakDuration(Number(e.target.value)); if (phase === 'longBreak' && !isRunning) setTimeLeft(Number(e.target.value) * 60); }}
                className="w-full"
                style={{ accentColor: '#3b82f6' }}
              />
              <span className="text-sm text-white">{longBreakDuration} min</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#9ca3af' }}>Auto-iniciar</span>
              <button
                onClick={() => setAutoStart(a => !a)}
                className="rounded-full transition-all"
                style={{
                  width: 40, height: 22,
                  background: autoStart ? '#d4a853' : '#374151',
                  position: 'relative',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute', top: 2,
                  left: autoStart ? 20 : 2,
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 rounded-md font-medium transition-all"
              style={{ background: '#d4a853', color: '#0a1628' }}
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

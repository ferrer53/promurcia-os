import { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Play, Trash2, AudioWaveform, Clock
} from 'lucide-react';

interface Recording {
  id: number;
  name: string;
  duration: number; // seconds
  date: string;
}

const MOCK_RECORDINGS: Recording[] = [
  { id: 1, name: 'Nota reunion 13feb', duration: 182, date: '13 feb 2026' },
  { id: 2, name: 'Ideas para marketing', duration: 67, date: '12 feb 2026' },
  { id: 3, name: 'Recordatorio visita', duration: 15, date: '10 feb 2026' },
];

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>(MOCK_RECORDINGS);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playingProgress, setPlayingProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    setIsRecording(true);
    setElapsed(0);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (elapsed > 0) {
      const newRecording: Recording = {
        id: Date.now(),
        name: `Grabacion ${recordings.length + 1}`,
        duration: elapsed,
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
      setRecordings(prev => [newRecording, ...prev]);
    }
    setElapsed(0);
  };

  const playRecording = (id: number, duration: number) => {
    if (playingId === id) {
      setPlayingId(null);
      setPlayingProgress(0);
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      return;
    }
    setPlayingId(id);
    setPlayingProgress(0);
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    playIntervalRef.current = setInterval(() => {
      setPlayingProgress(p => {
        if (p >= 100) {
          setPlayingId(null);
          if (playIntervalRef.current) clearInterval(playIntervalRef.current);
          return 0;
        }
        return p + (100 / duration);
      });
    }, 1000);
  };

  const deleteRecording = (id: number) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (playingId === id) {
      setPlayingId(null);
      setPlayingProgress(0);
    }
  };

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Recording area */}
      <div className="flex flex-col items-center justify-center py-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        {/* Timer */}
        <div className="text-4xl font-mono font-bold mb-6" style={{ color: isRecording ? '#ef4444' : '#d4a853' }}>
          {formatTime(elapsed)}
        </div>

        {/* Waveform visualization */}
        <div className="flex items-end gap-0.5 h-16 mb-6 px-4">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full transition-all"
              style={{
                height: isRecording
                  ? `${8 + Math.random() * 48}px`
                  : `${4 + Math.sin(i * 0.3) * 6}px`,
                background: isRecording ? '#ef4444' : '#4b5563',
                opacity: isRecording ? 0.6 + Math.random() * 0.4 : 0.3,
                transitionDuration: isRecording ? '100ms' : '500ms',
              }}
            />
          ))}
        </div>

        {/* Record / Stop button */}
        <div className="flex items-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(239,68,68,0.2)', border: '3px solid #ef4444' }}
            >
              <Mic size={28} color="#ef4444" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 animate-pulse"
              style={{ background: 'rgba(239,68,68,0.3)', border: '3px solid #ef4444' }}
            >
              <Square size={24} color="#ef4444" fill="#ef4444" />
            </button>
          )}
        </div>

        <div className="text-xs mt-4" style={{ color: '#6b7280' }}>
          {isRecording ? 'Grabando...' : 'Pulsa para grabar'}
        </div>
      </div>

      {/* Recordings list */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>
          Grabaciones ({recordings.length})
        </h3>
        <div className="space-y-2">
          {recordings.map(rec => (
            <div
              key={rec.id}
              className="flex items-center gap-3 rounded-lg p-3 transition-all"
              style={{
                background: playingId === rec.id ? 'rgba(212,168,83,0.08)' : '#111d32',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button
                onClick={() => playRecording(rec.id, rec.duration)}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: playingId === rec.id ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)' }}
              >
                {playingId === rec.id ? (
                  <AudioWaveform size={16} color="#d4a853" />
                ) : (
                  <Play size={14} color="#d4a853" fill="#d4a853" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{rec.name}</div>
                <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
                  <Clock size={10} />
                  {formatDuration(rec.duration)}
                  <span>·</span>
                  <span>{rec.date}</span>
                </div>
                {playingId === rec.id && (
                  <div className="h-1 rounded-full mt-1.5" style={{ background: '#1a2744' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${playingProgress}%`, background: '#d4a853' }} />
                  </div>
                )}
              </div>
              <button onClick={() => deleteRecording(rec.id)} className="p-1.5 rounded hover:bg-red-500/20 shrink-0">
                <Trash2 size={14} color="#ef4444" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

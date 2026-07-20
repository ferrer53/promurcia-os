import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, AlarmClock, Timer, Watch, Plus, X, Trash2, Pause, Play, RotateCcw, Flag } from 'lucide-react';

type TabId = 'clock' | 'alarms' | 'timer' | 'stopwatch';

const TABS = [
  { id: 'clock' as TabId, label: 'Reloj', icon: Clock },
  { id: 'alarms' as TabId, label: 'Alarmas', icon: AlarmClock },
  { id: 'timer' as TabId, label: 'Temporizador', icon: Timer },
  { id: 'stopwatch' as TabId, label: 'Cronometro', icon: Watch },
];

const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const MONTHS_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ========== WORLD CLOCK DATA ========== */
const WORLD_CITIES = [
  { name: 'Murcia', timezone: 'Europe/Madrid' },
  { name: 'Nueva York', timezone: 'America/New_York' },
  { name: 'Londres', timezone: 'Europe/London' },
  { name: 'Tokio', timezone: 'Asia/Tokyo' },
];

/* ========== ALARM TYPES ========== */
interface Alarm {
  id: string;
  time: string;
  label: string;
  active: boolean;
}

const DEFAULT_ALARMS: Alarm[] = [
  { id: '1', time: '07:00', label: 'Despertar', active: true },
  { id: '2', time: '08:30', label: 'Reunion equipo', active: false },
  { id: '3', time: '14:00', label: 'Almuerzo', active: true },
];

/* ========== TIMER ========== */
function useTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (timeLeft > 0) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [timeLeft]);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(initialTime);
  }, [initialTime]);

  const setTime = useCallback((seconds: number) => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setInitialTime(seconds);
    setTimeLeft(seconds);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { timeLeft, isRunning, initialTime, start, pause, reset, setTime };
}

/* ========== STOPWATCH ========== */
function useStopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
    startTimeRef.current = Date.now() - elapsed;
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 10);
  }, [elapsed]);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setElapsed(0);
    setLaps([]);
  }, []);

  const lap = useCallback(() => {
    setLaps(prev => [elapsed, ...prev]);
  }, [elapsed]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { elapsed, isRunning, laps, start, pause, reset, lap };
}

/* ========== MAIN COMPONENT ========== */
export default function ClockApp() {
  const [activeTab, setActiveTab] = useState<TabId>('clock');

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628' }}>
      {/* Tab bar */}
      <div className="flex items-center justify-center gap-1 px-3 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#d4a853] text-[#0a1628]'
                  : 'text-gray-400 hover:bg-[#1a2744] hover:text-white'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'clock' && <ClockTab />}
        {activeTab === 'alarms' && <AlarmsTab />}
        {activeTab === 'timer' && <TimerTab />}
        {activeTab === 'stopwatch' && <StopwatchTab />}
      </div>
    </div>
  );
}

/* ========== CLOCK TAB ========== */
function ClockTab() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCityTime = (tz: string) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
      }).format(now);
    } catch {
      return '--:--';
    }
  };

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  return (
    <div className="flex flex-col items-center py-6 px-4">
      {/* Analog clock */}
      <div className="relative mb-6" style={{ width: 180, height: 180 }}>
        <svg viewBox="0 0 180 180" className="w-full h-full">
          {/* Face */}
          <circle cx="90" cy="90" r="85" fill="#111d32" stroke="#d4a853" strokeWidth="2" />
          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * Math.PI / 180;
            const x1 = 90 + 72 * Math.cos(angle);
            const y1 = 90 + 72 * Math.sin(angle);
            const x2 = 90 + 78 * Math.cos(angle);
            const y2 = 90 + 78 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4a853" strokeWidth="2" strokeLinecap="round" />;
          })}
          {/* Hour hand */}
          <line
            x1="90" y1="90"
            x2={90 + 45 * Math.cos((hours % 12 + minutes / 60) * 30 * Math.PI / 180 - Math.PI / 2)}
            y2={90 + 45 * Math.sin((hours % 12 + minutes / 60) * 30 * Math.PI / 180 - Math.PI / 2)}
            stroke="white" strokeWidth="4" strokeLinecap="round"
          />
          {/* Minute hand */}
          <line
            x1="90" y1="90"
            x2={90 + 60 * Math.cos((minutes + seconds / 60) * 6 * Math.PI / 180 - Math.PI / 2)}
            y2={90 + 60 * Math.sin((minutes + seconds / 60) * 6 * Math.PI / 180 - Math.PI / 2)}
            stroke="#d4a853" strokeWidth="3" strokeLinecap="round"
          />
          {/* Second hand */}
          <line
            x1="90" y1="90"
            x2={90 + 65 * Math.cos(seconds * 6 * Math.PI / 180 - Math.PI / 2)}
            y2={90 + 65 * Math.sin(seconds * 6 * Math.PI / 180 - Math.PI / 2)}
            stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"
          />
          {/* Center dot */}
          <circle cx="90" cy="90" r="4" fill="#d4a853" />
        </svg>
      </div>

      {/* Digital time */}
      <div className="text-4xl font-light text-[#d4a853] mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {/* Date */}
      <div className="text-sm text-gray-400 mb-8">
        {DAYS_FULL[now.getDay()]}, {now.getDate()} de {MONTHS_FULL[now.getMonth()]} de {now.getFullYear()}
      </div>

      {/* World clocks */}
      <div className="w-full max-w-sm space-y-2">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Relojes mundiales</h3>
        {WORLD_CITIES.map(city => {
          const diff = Math.round((now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: city.timezone })).getTime()) / 3600000);
          return (
            <div key={city.name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <p className="text-sm text-white font-medium">{city.name}</p>
                <p className="text-[10px] text-gray-500">{diff === 0 ? 'Misma zona' : diff > 0 ? `${Math.abs(diff)}h atras` : `${Math.abs(diff)}h adelante`}</p>
              </div>
              <span className="text-lg text-[#d4a853] font-light">{formatCityTime(city.timezone)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========== ALARMS TAB ========== */
function AlarmsTab() {
  const [alarms, setAlarms] = useState<Alarm[]>(DEFAULT_ALARMS);
  const [showForm, setShowForm] = useState(false);
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('');

  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const deleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const addAlarm = () => {
    if (!newTime) return;
    setAlarms(prev => [...prev, { id: Date.now().toString(), time: newTime, label: newLabel || 'Alarma', active: true }]);
    setNewTime('08:00');
    setNewLabel('');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">Alarmas</h3>
        <button onClick={() => setShowForm(true)} className="p-1.5 rounded-lg bg-[#d4a853] text-[#0a1628] hover:brightness-110 transition-all">
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {alarms.map(alarm => (
          <div key={alarm.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div>
              <p className={`text-2xl font-light ${alarm.active ? 'text-[#d4a853]' : 'text-gray-600'}`}>{alarm.time}</p>
              <p className="text-xs text-gray-500">{alarm.label}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle */}
              <button
                onClick={() => toggleAlarm(alarm.id)}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: alarm.active ? '#d4a853' : '#374151' }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: alarm.active ? 22 : 2 }}
                />
              </button>
              <button onClick={() => deleteAlarm(alarm.id)} className="p-1.5 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl p-5 w-72" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Nueva Alarma</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hora</label>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Etiqueta</label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-full px-3 py-2 rounded-md text-sm text-white outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} placeholder="Ej: Despertar" />
              </div>
              <button onClick={addAlarm} className="w-full py-2 rounded-md bg-[#d4a853] text-[#0a1628] font-medium text-sm hover:brightness-110 transition-all">
                Crear Alarma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== TIMER TAB ========== */
function TimerTab() {
  const { timeLeft, isRunning, initialTime, start, pause, reset, setTime } = useTimer();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  const handleSetTime = () => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    setTime(totalSeconds);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = initialTime > 0 ? (initialTime - timeLeft) / initialTime : 0;
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference * (1 - progress);

  const presets = [
    { label: '1 min', seconds: 60 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
    { label: '15 min', seconds: 900 },
    { label: '25 min', seconds: 1500 },
    { label: '30 min', seconds: 1800 },
  ];

  return (
    <div className="flex flex-col items-center py-6 px-4">
      {/* Circular progress */}
      <div className="relative mb-6">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="#1a2744" strokeWidth="6" />
          <circle
            cx="90" cy="90" r="80" fill="none"
            stroke={timeLeft === 0 && initialTime > 0 ? '#ef4444' : '#d4a853'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 90 90)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-light text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(timeLeft)}
          </span>
          {initialTime > 0 && (
            <span className="text-[10px] text-gray-500 mt-1">
              {Math.round(progress * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        {!isRunning ? (
          <button onClick={start} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#d4a853] text-[#0a1628] text-sm font-medium hover:brightness-110 transition-all">
            <Play size={14} /> Iniciar
          </button>
        ) : (
          <button onClick={pause} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#d4a853] text-[#0a1628] text-sm font-medium hover:brightness-110 transition-all">
            <Pause size={14} /> Pausar
          </button>
        )}
        <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 hover:bg-[#1a2744] hover:text-white text-sm transition-all">
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>

      {/* Time inputs */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-col items-center">
          <label className="text-[10px] text-gray-500 mb-1">Horas</label>
          <input
            type="number" min={0} max={99} value={hours}
            onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-14 text-center px-2 py-1.5 rounded-md text-sm text-white outline-none"
            style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <span className="text-xl text-gray-600 mt-5">:</span>
        <div className="flex flex-col items-center">
          <label className="text-[10px] text-gray-500 mb-1">Min</label>
          <input
            type="number" min={0} max={59} value={minutes}
            onChange={e => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className="w-14 text-center px-2 py-1.5 rounded-md text-sm text-white outline-none"
            style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <span className="text-xl text-gray-600 mt-5">:</span>
        <div className="flex flex-col items-center">
          <label className="text-[10px] text-gray-500 mb-1">Seg</label>
          <input
            type="number" min={0} max={59} value={seconds}
            onChange={e => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
            className="w-14 text-center px-2 py-1.5 rounded-md text-sm text-white outline-none"
            style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        <button onClick={handleSetTime} className="mt-5 px-3 py-1.5 rounded-md text-xs bg-[#1a2744] text-[#d4a853] hover:bg-[#d4a853] hover:text-[#0a1628] transition-all border border-[#d4a853]/20">
          Establecer
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap justify-center gap-2">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => { setTime(p.seconds); setHours(Math.floor(p.seconds / 3600)); setMinutes(Math.floor((p.seconds % 3600) / 60)); setSeconds(p.seconds % 60); }}
            className="px-3 py-1.5 rounded-full text-xs text-gray-400 hover:text-white hover:bg-[#1a2744] transition-all border border-white/5"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Done indicator */}
      {timeLeft === 0 && initialTime > 0 && (
        <div className="mt-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 text-center font-medium">¡Tiempo terminado!</p>
        </div>
      )}
    </div>
  );
}

/* ========== STOPWATCH TAB ========== */
function StopwatchTab() {
  const { elapsed, isRunning, laps, start, pause, reset, lap } = useStopwatch();

  const formatMs = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatMsFull = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center py-6 px-4">
      {/* Display */}
      <div className="text-5xl font-light text-white mb-6" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatMsFull(elapsed)}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        {!isRunning ? (
          <button onClick={start} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#d4a853] text-[#0a1628] text-sm font-medium hover:brightness-110 transition-all">
            <Play size={14} /> Iniciar
          </button>
        ) : (
          <button onClick={pause} className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#d4a853] text-[#0a1628] text-sm font-medium hover:brightness-110 transition-all">
            <Pause size={14} /> Pausar
          </button>
        )}
        <button onClick={lap} disabled={!isRunning} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 hover:bg-[#1a2744] hover:text-white text-sm transition-all disabled:opacity-30">
          <Flag size={14} /> Vuelta
        </button>
        <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-gray-400 hover:bg-[#1a2744] hover:text-white text-sm transition-all">
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>

      {/* Laps */}
      {laps.length > 0 && (
        <div className="w-full max-w-xs">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Vueltas</h3>
          <div className="space-y-1 max-h-48 overflow-auto">
            {laps.map((lapTime, i) => {
              const prevLap = laps[i + 1] || 0;
              const split = lapTime - prevLap;
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-xs text-gray-500">#{laps.length - i}</span>
                  <span className="text-xs text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>+{formatMsFull(split)}</span>
                  <span className="text-xs text-[#d4a853]" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMsFull(lapTime)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

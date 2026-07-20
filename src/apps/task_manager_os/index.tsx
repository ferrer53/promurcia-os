import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Cpu, HardDrive, Wifi, Trash2, Clock, BarChart3
} from 'lucide-react';

type Tab = 'processes' | 'performance' | 'history';

interface Process {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: 'running' | 'sleeping' | 'stopped';
  user: string;
}

interface HistoryEntry {
  time: string;
  event: string;
  app: string;
}

const INITIAL_PROCESSES: Process[] = [
  { pid: 1, name: 'kernel.exe', cpu: 0.5, memory: 128, status: 'running', user: 'system' },
  { pid: 1024, name: 'browser.exe', cpu: 12.3, memory: 512, status: 'running', user: 'usuario' },
  { pid: 2048, name: 'crm.exe', cpu: 8.7, memory: 384, status: 'running', user: 'usuario' },
  { pid: 3072, name: 'calculator.exe', cpu: 0.1, memory: 32, status: 'sleeping', user: 'usuario' },
  { pid: 4096, name: 'terminal.exe', cpu: 1.2, memory: 64, status: 'running', user: 'usuario' },
  { pid: 5120, name: 'filemanager.exe', cpu: 2.5, memory: 96, status: 'running', user: 'usuario' },
  { pid: 6144, name: 'music_player.exe', cpu: 0.8, memory: 128, status: 'sleeping', user: 'usuario' },
  { pid: 7168, name: 'settings.exe', cpu: 0.3, memory: 48, status: 'running', user: 'usuario' },
  { pid: 8192, name: 'window_manager.exe', cpu: 4.5, memory: 256, status: 'running', user: 'system' },
  { pid: 9216, name: 'desktop_shell.exe', cpu: 3.2, memory: 192, status: 'running', user: 'system' },
  { pid: 10240, name: 'email_client.exe', cpu: 1.8, memory: 112, status: 'sleeping', user: 'usuario' },
  { pid: 11264, name: 'video_player.exe', cpu: 15.6, memory: 768, status: 'running', user: 'usuario' },
];

const HISTORY: HistoryEntry[] = [
  { time: '14:32:15', event: 'Inicio de sesion', app: 'Sistema' },
  { time: '14:32:45', event: 'Aplicacion lanzada', app: 'Cerebro Promurcia' },
  { time: '14:35:22', event: 'Aplicacion lanzada', app: 'Navegador' },
  { time: '14:38:10', event: 'Notificacion', app: 'Email Client' },
  { time: '14:42:05', event: 'Aplicacion cerrada', app: 'Calculadora' },
  { time: '14:45:30', event: 'Aplicacion lanzada', app: 'Terminal' },
  { time: '14:50:18', event: 'Actualizacion', app: 'Sistema' },
  { time: '14:55:42', event: 'Aplicacion lanzada', app: 'Monitor de Sistema' },
];

export default function TaskManagerOS() {
  const [activeTab, setActiveTab] = useState<Tab>('processes');
  const [processes, setProcesses] = useState<Process[]>(INITIAL_PROCESSES);
  const [sortKey, setSortKey] = useState<keyof Process>('cpu');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [cpuData, setCpuData] = useState<number[]>(new Array(60).fill(5));
  const [memoryData, setMemoryData] = useState<number[]>(new Array(60).fill(30));
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses(prev => prev.map(p => ({
        ...p,
        cpu: Math.max(0, Math.min(100, p.cpu + (Math.random() - 0.5) * 3)),
        memory: Math.max(16, Math.min(1024, p.memory + (Math.random() - 0.5) * 10)),
      })));
      setCpuData(prev => [...prev.slice(1), 5 + Math.random() * 20]);
      setMemoryData(prev => [...prev.slice(1), 30 + Math.random() * 15]);
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedProcesses = [...processes].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDesc ? bVal - aVal : aVal - bVal;
    }
    return sortDesc ? String(bVal).localeCompare(String(aVal)) : String(aVal).localeCompare(String(bVal));
  });

  const handleSort = (key: keyof Process) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
  };

  const killProcess = () => {
    if (selectedPid) {
      setProcesses(prev => prev.filter(p => p.pid !== selectedPid));
      setSelectedPid(null);
    }
  };

  const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
  const totalMem = processes.reduce((sum, p) => sum + p.memory, 0);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m ${s % 60}s`;
  };

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        {([
          { id: 'processes' as Tab, label: 'Procesos', icon: Activity },
          { id: 'performance' as Tab, label: 'Rendimiento', icon: BarChart3 },
          { id: 'history' as Tab, label: 'Historial', icon: Clock },
        ]).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg transition-all"
              style={{
                background: activeTab === t.id ? '#0a1628' : 'transparent',
                color: activeTab === t.id ? '#d4a853' : '#9ca3af',
                borderBottom: activeTab === t.id ? '2px solid #d4a853' : '2px solid transparent',
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'processes' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-xs" style={{ color: '#9ca3af' }}>
                <span>Procesos: {processes.length}</span>
                <span>CPU total: {totalCpu.toFixed(1)}%</span>
                <span>Memoria: {totalMem.toFixed(0)} MB</span>
              </div>
              {selectedPid && (
                <button
                  onClick={killProcess}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                  style={{ background: '#ef4444', color: '#fff' }}
                >
                  <Trash2 size={12} /> Finalizar tarea
                </button>
              )}
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#1a2744' }}>
                  {([
                    { key: 'name' as keyof Process, label: 'Nombre' },
                    { key: 'pid' as keyof Process, label: 'PID' },
                    { key: 'cpu' as keyof Process, label: 'CPU %' },
                    { key: 'memory' as keyof Process, label: 'Memoria (MB)' },
                    { key: 'status' as keyof Process, label: 'Estado' },
                    { key: 'user' as keyof Process, label: 'Usuario' },
                  ]).map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left py-2 px-3 font-medium cursor-pointer select-none hover:text-[#d4a853]"
                      style={{ color: '#9ca3af' }}
                    >
                      {col.label} {sortKey === col.key && (sortDesc ? '↓' : '↑')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedProcesses.map(p => (
                  <tr
                    key={p.pid}
                    onClick={() => setSelectedPid(p.pid)}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: selectedPid === p.pid ? 'rgba(212,168,83,0.08)' : 'transparent',
                      borderLeft: selectedPid === p.pid ? '2px solid #d4a853' : '2px solid transparent',
                    }}
                  >
                    <td className="py-2 px-3 font-medium" style={{ color: '#d1d5db' }}>{p.name}</td>
                    <td className="py-2 px-3" style={{ color: '#6b7280' }}>{p.pid}</td>
                    <td className="py-2 px-3" style={{ color: p.cpu > 10 ? '#ef4444' : p.cpu > 5 ? '#f59e0b' : '#22c55e' }}>{p.cpu.toFixed(1)}%</td>
                    <td className="py-2 px-3" style={{ color: '#d1d5db' }}>{p.memory.toFixed(0)}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                        background: p.status === 'running' ? 'rgba(34,197,94,0.15)' : p.status === 'sleeping' ? 'rgba(107,114,128,0.15)' : 'rgba(239,68,68,0.15)',
                        color: p.status === 'running' ? '#22c55e' : p.status === 'sleeping' ? '#9ca3af' : '#ef4444',
                      }}>
                        {p.status === 'running' ? 'Ejecutando' : p.status === 'sleeping' ? 'Durmiendo' : 'Detenido'}
                      </span>
                    </td>
                    <td className="py-2 px-3" style={{ color: '#6b7280' }}>{p.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            {/* CPU Chart */}
            <div className="rounded-lg p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={16} color="#3b82f6" />
                <span className="text-sm font-medium">CPU</span>
                <span className="text-lg font-bold ml-auto" style={{ color: '#3b82f6' }}>{totalCpu.toFixed(1)}%</span>
              </div>
              <svg viewBox="0 0 300 60" className="w-full h-16">
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M ${cpuData.map((v, i) => `${(i / (cpuData.length - 1)) * 300},${60 - (v / 50) * 60}`).join(' L ')}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                />
                <path
                  d={`M 0,60 L ${cpuData.map((v, i) => `${(i / (cpuData.length - 1)) * 300},${60 - (v / 50) * 60}`).join(' L ')} L 300,60 Z`}
                  fill="url(#cpuGrad)"
                />
              </svg>
            </div>

            {/* Memory bar */}
            <div className="rounded-lg p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-3">
                <HardDrive size={16} color="#22c55e" />
                <span className="text-sm font-medium">Memoria</span>
                <span className="text-lg font-bold ml-auto" style={{ color: '#22c55e' }}>{totalMem.toFixed(0)} MB</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: '#1a2744' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(totalMem / 4096) * 100}%`, background: '#22c55e' }} />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: '#6b7280' }}>
                <span>0 MB</span>
                <span>4 GB</span>
              </div>
            </div>

            {/* Network activity */}
            <div className="rounded-lg p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Wifi size={16} color="#8b5cf6" />
                <span className="text-sm font-medium">Red</span>
                <span className="text-sm ml-auto" style={{ color: '#8b5cf6' }}>Enviando: 12 KB/s | Recibiendo: 45 KB/s</span>
              </div>
              <svg viewBox="0 0 300 30" className="w-full h-8">
                <path
                  d={`M ${memoryData.map((v, i) => `${(i / (memoryData.length - 1)) * 300},${30 - (v / 60) * 30}`).join(' L ')}`}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Disk */}
            <div className="rounded-lg p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-3">
                <HardDrive size={16} color="#f59e0b" />
                <span className="text-sm font-medium">Disco</span>
                <span className="text-sm ml-auto" style={{ color: '#f59e0b' }}>Activo</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a2744' }}>
                <div className="h-full rounded-full" style={{ width: '35%', background: '#f59e0b' }} />
              </div>
              <div className="text-xs mt-1" style={{ color: '#6b7280' }}>128 GB / 256 GB usados</div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} color="#d4a853" />
              <span className="text-sm font-medium">Tiempo activo: {formatUptime(uptime)}</span>
            </div>
            {HISTORY.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="text-xs font-mono shrink-0" style={{ color: '#d4a853' }}>{entry.time}</div>
                <div className="text-xs" style={{ color: '#9ca3af' }}>{entry.event}</div>
                <div className="text-xs font-medium ml-auto" style={{ color: '#d1d5db' }}>{entry.app}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

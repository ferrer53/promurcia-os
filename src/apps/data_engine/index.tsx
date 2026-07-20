import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive, Mail, Mic, UserPlus, Activity, CheckCircle2,
  Loader2, ArrowRight, Database, FileUp, Settings, ChevronRight,
  Wifi, Clock, TrendingUp, AlertTriangle, RefreshCw, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const NAVY = '#0a1628';
const NAVY_LIGHT = '#111d32';
const GOLD = '#d4a853';
const GOLD_RGB = '212,168,83';

/* ═══════════════════════════════════════════
   ESTADO DEL SISTEMA (compartido con CEREBRO)
   ═══════════════════════════════════════════ */
const SYSTEM_STATE = {
  drive: { connected: true, files: 315, lastSync: 'Hace 2 minutos', syncing: false },
  gmail: { connected: true, unread: 12, leadsToday: 3, lastCheck: 'Hace 5 minutos' },
  transcriptions: { total: 156, pending: 0, completed: 156, lastTranscribed: 'llamada_maria_20231015.mp3' },
  leads: { total: 1247, newToday: 3 },
  processing: { phase: 'completed', progress: 100 },
};

/* ═══════════════════════════════════════════
   COMPONENTE: StatusBar (visible SIEMPRE arriba)
   ═══════════════════════════════════════════ */
function StatusBar() {
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: 'Drive', value: `${SYSTEM_STATE.drive.files} archivos`, icon: HardDrive, active: SYSTEM_STATE.drive.connected, color: '#3b82f6' },
    { label: 'Gmail', value: `${SYSTEM_STATE.gmail.unread} nuevos`, icon: Mail, active: SYSTEM_STATE.gmail.connected, color: '#ef4444' },
    { label: 'Transcripciones', value: `${SYSTEM_STATE.transcriptions.completed}/${SYSTEM_STATE.transcriptions.total}`, icon: Mic, active: true, color: GOLD },
    { label: 'Leads hoy', value: `${SYSTEM_STATE.leads.newToday} nuevos`, icon: UserPlus, active: true, color: '#22c55e' },
  ];

  return (
    <div className="shrink-0 w-full" style={{ background: NAVY_LIGHT, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-6 px-4 py-2">
        <div className="flex items-center gap-2 shrink-0">
          <Activity size={12} color={GOLD} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>Estado del sistema</span>
        </div>
        <Separator orientation="vertical" className="h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex items-center gap-5 flex-1">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.active ? item.color : '#4b5563', opacity: pulse ? 1 : 0.5, transition: 'opacity 0.5s' }} />
              <item.icon size={10} color={item.active ? item.color : '#4b5563'} />
              <span className="text-[10px]" style={{ color: item.active ? '#e5e7eb' : '#4b5563' }}>
                <span className="font-medium">{item.label}:</span> {item.value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Wifi size={10} color="#22c55e" className="animate-pulse" />
          <span className="text-[10px]" style={{ color: '#22c55e' }}>Online</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPONENTE: Wizard de Importaci\u00F3n
   ═══════════════════════════════════════════ */
function ImportWizard() {
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [stepProgress, setStepProgress] = useState(0);

  const steps = [
    { id: 'source', label: 'Seleccionar fuente', icon: Database },
    { id: 'upload', label: 'Subir archivos', icon: FileUp },
    { id: 'config', label: 'Configurar', icon: Settings },
    { id: 'process', label: 'Procesar', icon: Activity },
    { id: 'verify', label: 'Verificar', icon: CheckCircle2 },
  ];

  const startProcessing = () => {
    setProcessing(true);
    setStepProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setStepProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setProcessing(false);
        if (step < steps.length - 1) {
          setStep(s => s + 1);
          setStepProgress(0);
        }
      }
    }, 50);
  };

  return (
    <Card className="border-0" style={{ background: NAVY_LIGHT }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
          <Sparkles size={16} color={GOLD} /> Wizard de Importaci\u00F3n de Datos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: i <= step ? `rgba(${GOLD_RGB},0.15)` : 'rgba(255,255,255,0.04)',
                    border: i === step ? `2px solid ${GOLD}` : '2px solid transparent',
                  }}>
                  {i < step ? <CheckCircle2 size={14} color="#22c55e" /> : <s.icon size={14} color={i === step ? GOLD : '#4b5563'} />}
                </div>
                <span className="text-[9px] font-medium" style={{ color: i <= step ? GOLD : '#4b5563' }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight size={12} color={i < step ? '#22c55e' : '#374151'} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {step === 0 && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: '#9ca3af' }}>Selecciona la fuente de datos:</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Google Drive', icon: HardDrive, desc: '315 archivos disponibles', color: '#3b82f6' },
                    { name: 'Gmail', icon: Mail, desc: '12 emails nuevos', color: '#ef4444' },
                    { name: 'Subida manual', icon: FileUp, desc: 'CSV, Excel, PDF', color: '#22c55e' },
                  ].map(source => (
                    <button key={source.name} onClick={() => setStep(1)}
                      className="p-3 rounded-lg text-left transition-all hover:scale-[1.02]"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <source.icon size={20} color={source.color} className="mb-2" />
                      <p className="text-xs font-medium text-white">{source.name}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: '#6b7280' }}>{source.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: '#9ca3af' }}>Arrastra archivos aqu\u00ED o haz clic para seleccionar:</p>
                <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: 'rgba(212,168,83,0.2)', background: 'rgba(212,168,83,0.02)' }}>
                  <FileUp size={32} color={GOLD} className="mx-auto mb-2" />
                  <p className="text-xs text-white">Arrastra archivos aqu\u00ED</p>
                  <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>CSV, Excel (.xlsx), PDF, im\u00E1genes</p>
                </div>
                <div className="flex justify-between">
                  <Button onClick={() => setStep(0)} size="sm" variant="outline" className="text-xs border-white/10 text-white hover:bg-white/5">Anterior</Button>
                  <Button onClick={() => setStep(2)} size="sm" className="text-xs" style={{ background: GOLD, color: NAVY }}>Siguiente <ArrowRight size={12} className="ml-1" /></Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: '#9ca3af' }}>Configura las opciones de importaci\u00F3n:</p>
                <div className="space-y-2">
                  {[
                    { label: 'Detectar leads autom\u00E1ticamente', desc: 'Extraer contactos de los documentos', checked: true },
                    { label: 'Vincular propiedades', desc: 'Asociar datos a propiedades existentes', checked: true },
                    { label: 'Crear tareas autom\u00E1ticas', desc: 'Generar tareas desde transcripciones', checked: false },
                    { label: 'Sobrescribir duplicados', desc: 'Actualizar registros existentes', checked: false },
                  ].map(opt => (
                    <div key={opt.label} className="flex items-center gap-3 py-2 px-3 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: opt.checked ? GOLD : 'rgba(255,255,255,0.06)' }}>
                        {opt.checked && <CheckCircle2 size={12} color={NAVY} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-white">{opt.label}</p>
                        <p className="text-[9px]" style={{ color: '#6b7280' }}>{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-2">
                  <Button onClick={() => setStep(1)} size="sm" variant="outline" className="text-xs border-white/10 text-white hover:bg-white/5">Anterior</Button>
                  <Button onClick={() => { setStep(3); startProcessing(); }} size="sm" className="text-xs" style={{ background: GOLD, color: NAVY }}>Procesar <ArrowRight size={12} className="ml-1" /></Button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 size={18} color={GOLD} className="animate-spin" />
                  <span className="text-sm text-white">Procesando datos...</span>
                  <span className="text-xs ml-auto" style={{ color: GOLD }}>{stepProgress}%</span>
                </div>
                <Progress value={stepProgress} className="h-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="space-y-1">
                  {stepProgress > 20 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px]" style={{ color: '#6b7280' }}>\u2713 Leyendo archivos...</motion.p>}
                  {stepProgress > 45 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px]" style={{ color: '#6b7280' }}>\u2713 Extrayendo datos...</motion.p>}
                  {stepProgress > 70 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px]" style={{ color: '#6b7280' }}>\u2713 Limpiando registros...</motion.p>}
                  {stepProgress > 90 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px]" style={{ color: '#6b7280' }}>\u2713 Vinculando con CRM...</motion.p>}
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-3 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  <CheckCircle2 size={48} color="#22c55e" className="mx-auto mb-3" />
                </motion.div>
                <p className="text-sm font-semibold text-white">\u00A1Procesamiento completado!</p>
                <p className="text-[10px]" style={{ color: '#6b7280' }}>Se han importado 1.247 registros correctamente.</p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[{ label: 'Leads', value: '42 nuevos' }, { label: 'Propiedades', value: '5 nuevas' }, { label: 'Tareas', value: '12 creadas' }].map(item => (
                    <div key={item.label} className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="text-sm font-bold" style={{ color: GOLD }}>{item.value}</p>
                      <p className="text-[9px]" style={{ color: '#6b7280' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={() => { setStep(0); setStepProgress(0); }} size="sm" className="mt-3 text-xs" style={{ background: GOLD, color: NAVY }}>Nueva importaci\u00F3n</Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   COMPONENTE: Panel de Fuentes de Datos
   ═══════════════════════════════════════════ */
function DataSourcesPanel() {
  const sources = [
    { name: 'Google Drive', connected: true, files: 315, icon: HardDrive, color: '#3b82f6', lastSync: 'Hace 2 min' },
    { name: 'Gmail', connected: true, files: 12, icon: Mail, color: '#ef4444', lastSync: 'Hace 5 min' },
    { name: 'Transcripciones', connected: true, files: 156, icon: Mic, color: GOLD, lastSync: 'En tiempo real' },
    { name: 'Base de datos', connected: true, files: 1247, icon: Database, color: '#22c55e', lastSync: 'Hace 1 min' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {sources.map((source, i) => (
        <motion.div key={source.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <Card className="border-0" style={{ background: NAVY_LIGHT }}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${source.color}15` }}>
                  <source.icon size={16} color={source.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: source.connected ? '#22c55e' : '#ef4444' }} />
                    <p className="text-xs font-medium text-white">{source.name}</p>
                  </div>
                  <p className="text-[9px]" style={{ color: '#6b7280' }}>{source.files} archivos \u2022 {source.lastSync}</p>
                </div>
                <Badge className="text-[8px] h-4 px-1.5" style={{ background: source.connected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: source.connected ? '#22c55e' : '#ef4444', borderColor: 'transparent' }}>
                  {source.connected ? 'Activo' : 'Desconectado'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPONENTE: \u00DAltimas Operaciones
   ═══════════════════════════════════════════ */
function RecentOperationsPanel() {
  const operations = [
    { id: 1, action: 'Sincronizaci\u00F3n Drive', status: 'completed', time: '14:32', details: '3 archivos nuevos' },
    { id: 2, action: 'Lead detectado', status: 'completed', time: '14:28', details: 'Mar\u00EDa Garc\u00EDa (Idealista)' },
    { id: 3, action: 'Transcripci\u00F3n IA', status: 'completed', time: '14:15', details: 'llamada_juan.mp3 \u2014 92% positivo' },
    { id: 4, action: 'Vinculaci\u00F3n autom\u00E1tica', status: 'completed', time: '14:00', details: '+34612345678 \u2192 PM-001' },
    { id: 5, action: 'Extracci\u00F3n Gmail', status: 'completed', time: '13:45', details: '2 emails procesados' },
  ];

  return (
    <Card className="border-0" style={{ background: NAVY_LIGHT }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2 text-white">
          <Clock size={14} color={GOLD} /> \u00DAltimas operaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {operations.map((op, i) => (
          <motion.div key={op.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 py-2 px-2.5 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <CheckCircle2 size={12} color="#22c55e" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white">{op.action}</p>
              <p className="text-[9px]" style={{ color: '#6b7280' }}>{op.details}</p>
            </div>
            <span className="text-[9px] font-mono shrink-0" style={{ color: '#4b5563' }}>{op.time}</span>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   COMPONENTE PRINCIPAL: DATA ENGINE
   ═══════════════════════════════════════════ */
export default function DataEngineApp() {
  return (
    <div className="flex flex-col h-full w-full" style={{ background: NAVY }}>
      {/* Status Bar - SIEMPRE visible arriba */}
      <StatusBar />

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-5 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `rgba(${GOLD_RGB},0.15)` }}>
              <Database size={20} color={GOLD} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">Motor de Datos</h1>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Importaci\u00F3n, procesamiento y sincronizaci\u00F3n de datos</p>
            </div>
          </div>

          {/* Fuentes de datos */}
          <DataSourcesPanel />

          {/* Wizard */}
          <ImportWizard />

          {/* Operaciones recientes */}
          <RecentOperationsPanel />
        </div>
      </ScrollArea>
    </div>
  );
}

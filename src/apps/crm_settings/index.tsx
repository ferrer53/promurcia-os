import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Bot, SlidersHorizontal, Shield, Database, Mail,
  Clock, CheckCircle, XCircle, Key,
  Save, RotateCcw, Wifi, WifiOff, Trash2, Download, Loader2, AlertCircle, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';

interface Section {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const SECTIONS: Section[] = [
  { id: 'automatizaciones', label: 'Automatizaciones', icon: Bot },
  { id: 'control', label: 'Control Operativo', icon: SlidersHorizontal },
  { id: 'seguridad', label: 'Seguridad', icon: Shield },
  { id: 'backups', label: 'Backups', icon: Database },
  { id: 'email', label: 'Email Poller', icon: Mail },
];

const ROLES = [
  { id: 'superCEO', name: 'superCEO', level: 100, color: '#d4a853', desc: 'Acceso total incluyendo CEREBRO IA, gestion de usuarios, configuracion avanzada y briefing estrategico.' },
  { id: 'admin', name: 'admin', level: 90, color: '#8b5cf6', desc: 'Acceso completo al CRM excepto CEREBRO. Puede gestionar usuarios, roles y todas las operaciones.' },
  { id: 'operaciones', name: 'operaciones', level: 50, color: '#3b82f6', desc: 'Gestiona operaciones, tareas, visitas y reservas. Acceso limitado a leads y propiedades.' },
  { id: 'comercial', name: 'comercial', level: 30, color: '#22c55e', desc: 'Gestiona leads y propiedades. Acceso limitado a operaciones (solo las asignadas).' },
  { id: 'solo_lectura', name: 'solo_lectura', level: 10, color: '#6b7280', desc: 'Solo puede visualizar datos. No puede crear, editar ni eliminar ningun registro.' },
  { id: 'agente', name: 'agente', level: 50, color: '#06b6d4', desc: 'Gestiona leads y propiedades asignadas. Puede crear notas y programar visitas.' },
];

const ROLE_PERMS = [
  { module: 'Dashboard', superCEO: true, admin: true, operaciones: true, comercial: true, solo_lectura: true, agente: true },
  { module: 'Leads', superCEO: true, admin: true, operaciones: 'r', comercial: true, solo_lectura: true, agente: true },
  { module: 'Propiedades', superCEO: true, admin: true, operaciones: 'r', comercial: true, solo_lectura: true, agente: true },
  { module: 'Operaciones', superCEO: true, admin: true, operaciones: true, comercial: 'r', solo_lectura: true, agente: 'r' },
  { module: 'CEREBRO IA', superCEO: true, admin: false, operaciones: false, comercial: false, solo_lectura: false, agente: false },
  { module: 'Informes', superCEO: true, admin: true, operaciones: true, comercial: 'r', solo_lectura: true, agente: false },
  { module: 'Conocimiento', superCEO: true, admin: true, operaciones: true, comercial: true, solo_lectura: true, agente: true },
  { module: 'Configuracion', superCEO: true, admin: true, operaciones: false, comercial: false, solo_lectura: false, agente: false },
  { module: 'Usuarios/RBAC', superCEO: true, admin: true, operaciones: false, comercial: false, solo_lectura: false, agente: false },
  { module: 'Backups', superCEO: true, admin: true, operaciones: false, comercial: false, solo_lectura: false, agente: false },
];

export default function CRMSettings() {
  const [activeSection, setActiveSection] = useState('automatizaciones');
  const { user } = useAuth();
  const isAdmin = user?.role === 'superCEO' || user?.role === 'admin';

  return (
    <div className="h-full flex" style={{ background: '#0a1628' }}>
      {/* Sidebar */}
      <div className="shrink-0 w-52 border-r border-white/[0.06] py-4" style={{ background: '#111d32' }}>
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={14} color="#d4a853" />
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">CRM Ajustes</span>
          </div>
        </div>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
            style={{
              background: activeSection === s.id ? 'rgba(212,168,83,0.1)' : 'transparent',
              color: activeSection === s.id ? '#d4a853' : '#9ca3af',
              borderLeft: activeSection === s.id ? '2px solid #d4a853' : '2px solid transparent',
            }}
          >
            <s.icon size={15} />
            <span className="text-xs font-medium">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeSection === 'automatizaciones' && <AutomationSection key="auto" isAdmin={isAdmin} />}
          {activeSection === 'control' && <ControlSection key="ctrl" isAdmin={isAdmin} />}
          {activeSection === 'seguridad' && <SecuritySection key="sec" isAdmin={isAdmin} />}
          {activeSection === 'backups' && <BackupsSection key="bkp" isAdmin={isAdmin} />}
          {activeSection === 'email' && <EmailSection key="email" isAdmin={isAdmin} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Automation Section ──────────────────────────────────────────────

function AutomationSection({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const { data: settingsList, isLoading } = trpc.crm.settings.list.useQuery({});
  const updateSetting = trpc.crm.settings.update.useMutation({
    onSuccess: () => utils.crm.settings.list.invalidate(),
  });

  const autoSettings = (settingsList ?? []).filter(s => s.category === 'automation');

  const defaultAutomations = [
    { id: 'risk', label: 'Deteccion de riesgos', desc: 'Analisis automatico de operaciones en riesgo cada 10 minutos', enabled: true, interval: '10 min' },
    { id: 'briefing', label: 'Briefing diario', desc: 'Generacion automatica del informe ejecutivo cada manana', enabled: true, interval: '08:00' },
    { id: 'email_review', label: 'Revision de emails', desc: 'Escaneo de la bandeja de entrada para captura de leads', enabled: false, interval: '5 min' },
    { id: 'auto_tasks', label: 'Auto-tareas por eventos', desc: 'Creacion automatica de tareas al cambiar de etapa', enabled: true, interval: '15 min' },
    { id: 'sla_check', label: 'Verificacion SLA', desc: 'Comprobacion de incumplimientos de SLA en pipeline', enabled: true, interval: '30 min' },
    { id: 'backup', label: 'Backup diario', desc: 'Copia de seguridad automatica de datos del CRM', enabled: true, interval: '03:00' },
  ];

  const automations = defaultAutomations.map(def => {
    const setting = autoSettings.find(s => s.key === def.id);
    return { ...def, enabled: setting ? Boolean(setting.value) : def.enabled };
  });

  function toggle(id: string) {
    if (!isAdmin) return;
    const current = automations.find(a => a.id === id);
    updateSetting.mutate({ key: id, value: !current?.enabled });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="text-lg font-semibold text-white mb-1">Automatizaciones</h2>
      <p className="text-xs text-gray-400 mb-6">Configura los procesos automaticos del sistema CRM</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-10"><Loader2 size={24} color="#d4a853" className="animate-spin" /></div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {automations.map((auto, i) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-white/[0.06] p-4 flex items-center gap-4"
              style={{ background: '#111d32' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: auto.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)' }}>
                <Bot size={16} color={auto.enabled ? '#22c55e' : '#6b7280'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{auto.label}</span>
                  <Badge className="text-[9px] px-1.5 py-0 h-4" variant="outline" style={{ borderColor: '#d4a85340', color: '#d4a853' }}>
                    <Clock size={8} className="mr-1" /> {auto.interval}
                  </Badge>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{auto.desc}</p>
              </div>
              <Switch checked={auto.enabled} onCheckedChange={() => toggle(auto.id)} disabled={!isAdmin || updateSetting.isPending} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Control Section ─────────────────────────────────────────────────

function ControlSection({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils();
  const { data: settingsList } = trpc.crm.settings.list.useQuery({});
  const updateSetting = trpc.crm.settings.update.useMutation({
    onSuccess: () => utils.crm.settings.list.invalidate(),
  });

  const controlSettings = (settingsList ?? []).filter(s => s.category === 'control');
  const getSetting = (key: string, defaultValue: boolean) => {
    const s = controlSettings.find(s => s.key === key);
    return s ? Boolean(s.value) : defaultValue;
  };

  const settings = {
    autoAcciones: getSetting('autoAcciones', true),
    notificaciones: getSetting('notificaciones', true),
    enmascaramiento: getSetting('enmascaramiento', false),
    auditoria: getSetting('auditoria', true),
  };

  function update(key: string, val: boolean) {
    if (!isAdmin) return;
    updateSetting.mutate({ key, value: val });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="text-lg font-semibold text-white mb-1">Control Operativo</h2>
      <p className="text-xs text-gray-400 mb-6">Parametros de control y monitoreo del sistema</p>

      <div className="max-w-xl space-y-4">
        {[
          { key: 'autoAcciones', label: 'Auto-acciones', desc: 'Ejecutar acciones automaticas basadas en reglas de negocio', value: settings.autoAcciones },
          { key: 'notificaciones', label: 'Notificaciones', desc: 'Enviar notificaciones push y email para eventos importantes', value: settings.notificaciones },
          { key: 'enmascaramiento', label: 'Enmascaramiento de datos', desc: 'Ocultar datos sensibles en pantallas publicas', value: settings.enmascaramiento },
          { key: 'auditoria', label: 'Cadena de auditoria', desc: 'Registrar todas las acciones de usuarios en log inmutable', value: settings.auditoria },
        ].map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-white/[0.06] p-4 flex items-center justify-between"
            style={{ background: '#111d32' }}
          >
            <div>
              <span className="text-sm font-medium text-white">{item.label}</span>
              <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <Switch checked={item.value} onCheckedChange={(v) => update(item.key, v)} disabled={!isAdmin || updateSetting.isPending} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Security Section ────────────────────────────────────────────────

function SecuritySection({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="text-lg font-semibold text-white mb-1">Seguridad</h2>
      <p className="text-xs text-gray-400 mb-6">Matriz RBAC de roles y permisos</p>

      <div className="space-y-6">
        {/* Role Cards */}
        <div className="grid grid-cols-3 gap-3">
          {ROLES.map((role, i) => (
            <motion.div key={role.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/[0.06] p-4"
              style={{ background: '#111d32' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: role.color }} />
                <span className="text-sm font-semibold text-white">{role.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                  Nivel {role.level}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">{role.desc}</p>
            </motion.div>
          ))}
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* RBAC Matrix */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Matriz de Permisos</h3>
          <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#111d32' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#1a2744' }}>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>Modulo</th>
                  {ROLES.map(role => (
                    <th key={role.id} className="text-center px-3 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: role.color }}>
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_PERMS.map((perm, i) => (
                  <tr key={perm.module} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td className="px-4 py-2.5 text-xs font-medium text-white">{perm.module}</td>
                    {ROLES.map(role => {
                      const val = perm[role.id as keyof typeof perm];
                      return (
                        <td key={role.id} className="text-center px-3 py-2.5">
                          {val === true ? (
                            <CheckCircle size={14} color="#22c55e" className="mx-auto" />
                          ) : val === 'r' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>Lectura</span>
                          ) : (
                            <XCircle size={14} color="#4b5563" className="mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isAdmin && (
            <p className="text-[10px] mt-2" style={{ color: '#6b7280' }}>La matriz RBAC es de solo lectura para tu rol actual.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Backups Section ─────────────────────────────────────────────────

function BackupsSection({ isAdmin }: { isAdmin: boolean }) {
  const [backups] = useState([
    { id: 1, date: '2026-02-14 03:00', size: '245 MB', status: 'ok', type: 'Automatico' },
    { id: 2, date: '2026-02-13 03:00', size: '243 MB', status: 'ok', type: 'Automatico' },
    { id: 3, date: '2026-02-12 03:00', size: '241 MB', status: 'ok', type: 'Automatico' },
    { id: 4, date: '2026-02-11 15:30', size: '240 MB', status: 'manual', type: 'Manual' },
    { id: 5, date: '2026-02-11 03:00', size: '240 MB', status: 'ok', type: 'Automatico' },
  ]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="text-lg font-semibold text-white mb-1">Backups</h2>
      <p className="text-xs text-gray-400 mb-6">Historial de copias de seguridad</p>

      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-3 mb-4">
          {isAdmin && (
            <Button size="sm" className="text-xs gap-1.5" style={{ background: '#d4a853', color: '#0a1628' }}>
              <Download size={14} /> Backup Manual
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs gap-1.5">
            <RotateCcw size={14} /> Restaurar
          </Button>
        </div>

        {backups.map((bkp, i) => (
          <motion.div key={bkp.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-white/[0.06] p-4 flex items-center gap-4"
            style={{ background: '#111d32' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bkp.status === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)' }}>
              {bkp.status === 'ok' ? <CheckCircle size={16} color="#22c55e" /> : <Database size={16} color="#3b82f6" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">Backup {bkp.type}</span>
                <Badge className="text-[9px] h-4 px-1" variant="outline" style={{ borderColor: bkp.status === 'ok' ? '#22c55e40' : '#3b82f640', color: bkp.status === 'ok' ? '#22c55e' : '#3b82f6' }}>
                  {bkp.status === 'ok' ? 'OK' : 'Manual'}
                </Badge>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{bkp.date} · {bkp.size}</p>
            </div>
            {isAdmin && (
              <Button size="sm" variant="ghost" className="p-1.5 h-auto">
                <Trash2 size={14} color="#4b5563" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Email Section ───────────────────────────────────────────────────

function EmailSection({ isAdmin }: { isAdmin: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="text-lg font-semibold text-white mb-1">Email Poller</h2>
      <p className="text-xs text-gray-400 mb-6">Configuracion de captura de leads desde email</p>

      <div className="max-w-xl space-y-4">
        <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: '#111d32' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Wifi size={16} color="#22c55e" />
            </div>
            <div>
              <span className="text-sm font-medium text-white">Estado del servicio</span>
              <p className="text-[11px] text-gray-400">Conectado a leads@promurcia.es</p>
            </div>
            <Badge className="ml-auto text-[9px]" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
              Activo
            </Badge>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] p-4 space-y-3" style={{ background: '#111d32' }}>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Servidor IMAP</label>
            <Input value="imap.promurcia.es" readOnly className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Puerto</label>
            <Input value="993" readOnly className="text-xs w-24" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Usuario</label>
            <Input value="leads@promurcia.es" readOnly className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Intervalo de lectura</label>
            <Input value="5 minutos" readOnly className="text-xs w-32" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: '#111d32' }}>
          <h3 className="text-sm font-medium text-white mb-3">Reglas de procesamiento</h3>
          <div className="space-y-2">
            {[
              { rule: 'idealista@ notificaciones', action: 'Crear lead automatico', active: true },
              { rule: 'fotocasa@ contactos', action: 'Crear lead automatico', active: true },
              { rule: 'whatsapp@ mensajes', action: 'Crear interaccion', active: true },
              { rule: 'Spam detectado', action: 'Marcar como spam', active: false },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-2">
                  <Mail size={12} color={r.active ? '#3b82f6' : '#6b7280'} />
                  <span className="text-xs" style={{ color: '#d1d5db' }}>{r.rule}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: '#6b7280' }}>{r.action}</span>
                  {r.active ? <CheckCircle size={12} color="#22c55e" /> : <XCircle size={12} color="#4b5563" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

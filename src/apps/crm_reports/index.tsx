import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Download, TrendingUp, Users, Zap, AlertTriangle,
  Target, Clock, ChevronRight, FileText, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// ─── Mock Data ───────────────────────────────────────────────────────

const KPI_CARDS = [
  { label: 'Leads Nuevos (30 dias)', value: '142', trend: '+12%', trendUp: true, icon: Users, color: '#d4a853' },
  { label: 'Tasa de Conversion', value: '23.4%', trend: '+2.1%', trendUp: true, icon: Target, color: '#22c55e' },
  { label: 'Operaciones Activas', value: '38', trend: '+5', trendUp: true, icon: Zap, color: '#3b82f6' },
  { label: 'SLA Incumplidos', value: '7', trend: '-2', trendUp: true, icon: AlertTriangle, color: '#ef4444' },
];

const LEADS_BY_SOURCE = [
  { source: 'Idealista', count: 45, color: '#d4a853' },
  { source: 'Fotocasa', count: 32, color: '#3b82f6' },
  { source: 'Web', count: 28, color: '#22c55e' },
  { source: 'Referido', count: 18, color: '#8b5cf6' },
  { source: 'Redes Sociales', count: 12, color: '#06b6d4' },
  { source: 'Walk-in', count: 7, color: '#f59e0b' },
];

const LEAD_TREND = [38, 42, 35, 48, 52, 45, 58, 62, 55, 68, 72, 80];
const LEAD_TREND_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const OPS_BY_STATUS = [
  { status: 'Activa', count: 28, color: '#22c55e' },
  { status: 'Negociacion', count: 14, color: '#f59e0b' },
  { status: 'Cierre', count: 8, color: '#d4a853' },
  { status: 'Pausada', count: 4, color: '#6b7280' },
  { status: 'Cancelada', count: 3, color: '#ef4444' },
];

const OPS_BY_TYPE = [
  { type: 'Venta', count: 55, color: '#d4a853' },
  { type: 'Alquiler', count: 30, color: '#3b82f6' },
  { type: 'Traspaso', count: 15, color: '#8b5cf6' },
];

const AVG_DAYS_PER_STAGE = [
  { stage: 'Captacion', days: 2.5, prev: 3.2, color: '#8b5cf6' },
  { stage: 'Preparacion', days: 4.1, prev: 5.0, color: '#3b82f6' },
  { stage: 'Comercializacion', days: 6.8, prev: 8.1, color: '#06b6d4' },
  { stage: 'Negociacion', days: 11.2, prev: 12.5, color: '#f59e0b' },
  { stage: 'Cierre', days: 7.5, prev: 9.0, color: '#22c55e' },
];

const SLA_ALERTS = [
  { op: 'OP-003', stage: 'Preparacion', days: 6, sla: 5, responsible: 'Pedro S.', severity: 'critical' as const },
  { op: 'OP-008', stage: 'Captacion', days: 4, sla: 3, responsible: 'Ana R.', severity: 'warning' as const },
  { op: 'OP-010', stage: 'Comercializacion', days: 7, sla: 7, responsible: 'Carlos M.', severity: 'warning' as const },
  { op: 'OP-005', stage: 'Negociacion', days: 10, sla: 14, responsible: 'Ana R.', severity: 'normal' as const },
  { op: 'OP-011', stage: 'Seleccion Inquilino', days: 8, sla: 10, responsible: 'Ana R.', severity: 'normal' as const },
];

const PIPELINE_THROUGHPUT = [
  { month: 'Ene', entered: 18, closed: 12 },
  { month: 'Feb', entered: 22, closed: 15 },
  { month: 'Mar', entered: 20, closed: 18 },
  { month: 'Abr', entered: 25, closed: 20 },
  { month: 'May', entered: 28, closed: 22 },
  { month: 'Jun', entered: 30, closed: 26 },
];

// ─── SVG Chart Components ────────────────────────────────────────────

function BarChart({ data, height = 180 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value));
  const barW = 32;
  const gap = 16;
  const totalW = data.length * (barW + gap) + gap;
  return (
    <svg width={totalW} height={height} viewBox={`0 0 ${totalW} ${height}`}>
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 30);
        const x = gap + i * (barW + gap);
        const y = height - barH - 20;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} opacity={0.8} />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#9ca3af" fontSize="10">{d.value}</text>
            <text x={x + barW / 2} y={height - 4} textAnchor="middle" fill="#6b7280" fontSize="9">{d.label.substring(0, 6)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, labels, height = 180 }: { data: number[]; labels: string[]; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 20;
  const w = 400;
  const h = height - 30;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const y = pad + (1 - p) * (h - pad * 2);
        return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
      })}
      {/* Area */}
      <polygon
        points={`${pad},${h} ${points} ${w - pad},${h}`}
        fill="rgba(212,168,83,0.1)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#d4a853"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Points */}
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = pad + (1 - (v - min) / range) * (h - pad * 2);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#d4a853" />
            <text x={x} y={h + 14} textAnchor="middle" fill="#6b7280" fontSize="9">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PieChart({ data, size = 160 }: { data: { label: string; count: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  let acc = 0;
  const center = size / 2;
  const radius = size * 0.4;
  const r2 = radius * 0.6;

  function arcPath(start: number, end: number) {
    const x1 = center + radius * Math.cos((start - 0.5) * Math.PI * 2);
    const y1 = center + radius * Math.sin((start - 0.5) * Math.PI * 2);
    const x2 = center + radius * Math.cos((end - 0.5) * Math.PI * 2);
    const y2 = center + radius * Math.sin((end - 0.5) * Math.PI * 2);
    const large = end - start > 0.5 ? 1 : 0;
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const start = acc / total;
          acc += d.count;
          const end = acc / total;
          return <path key={i} d={arcPath(start, end)} fill={d.color} opacity={0.85} />;
        })}
        <circle cx={center} cy={center} r={r2} fill="#111d32" />
        <text x={center} y={center - 4} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">{total}</text>
        <text x={center} y={center + 10} textAnchor="middle" fill="#6b7280" fontSize="8">Total</text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-[11px] text-gray-300">{d.label}</span>
            <span className="text-[11px] text-gray-500">({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, maxVal = 15 }: { data: { stage: string; days: number; prev: number; color: string }[]; maxVal?: number }) {
  return (
    <div className="space-y-3 w-full">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-300">{d.stage}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-white">{d.days}d</span>
              <span className="text-[10px] text-gray-500 line-through">{d.prev}d</span>
              <ChevronRight size={10} color="#22c55e" />
            </div>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.days / maxVal) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="h-full rounded-full"
              style={{ background: d.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupedBarChart({ data, height = 180 }: { data: { label: string; v1: number; v2: number }[]; height?: number }) {
  const max = Math.max(...data.map(d => Math.max(d.v1, d.v2)));
  const barW = 12;
  const groupW = 48;
  const totalW = data.length * groupW + 32;
  return (
    <svg width={totalW} height={height} viewBox={`0 0 ${totalW} ${height}`}>
      {data.map((d, i) => {
        const x = 24 + i * groupW;
        const h1 = (d.v1 / max) * (height - 30);
        const h2 = (d.v2 / max) * (height - 30);
        return (
          <g key={i}>
            <rect x={x} y={height - h1 - 20} width={barW} height={h1} rx={2} fill="#d4a853" opacity={0.9} />
            <rect x={x + barW + 2} y={height - h2 - 20} width={barW} height={h2} rx={2} fill="#3b82f6" opacity={0.9} />
            <text x={x + barW} y={height - 4} textAnchor="middle" fill="#6b7280" fontSize="9">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function CRMReports() {
  const [activeTab, setActiveTab] = useState('leads');
  const [toast, setToast] = useState<string | null>(null);

  function handleExport() {
    setToast('Exportando informe...');
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0a1628' }}>
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-white/[0.06]" style={{ background: '#111d32' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: 'rgba(212,168,83,0.15)' }}>
              <BarChart3 size={20} color="#d4a853" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Informes y Analiticas</h1>
              <p className="text-xs text-gray-400">Periodo: Enero 2026 - Febrero 2026</p>
            </div>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" style={{ background: '#d4a853', color: '#0a1628' }} onClick={handleExport}>
            <Download size={14} /> Exportar
          </Button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="absolute top-4 right-4 z-50 px-4 py-3 rounded-lg border border-white/[0.08] flex items-center gap-2"
            style={{ background: '#111d32', borderLeft: '3px solid #d4a853' }}
          >
            <FileText size={14} color="#d4a853" />
            <span className="text-xs text-white">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 px-6 pt-4">
          {KPI_CARDS.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-xl border border-white/[0.06] p-4"
              style={{ background: '#111d32' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-gray-400">{kpi.label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                  <kpi.icon size={14} color={kpi.color} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
              <span className="text-[11px]" style={{ color: kpi.trendUp ? '#22c55e' : '#ef4444' }}>
                {kpi.trend} vs mes anterior
              </span>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-8 text-xs" style={{ background: '#1a2744' }}>
              <TabsTrigger value="leads" className="text-xs px-4 data-[state=active]:bg-[#d4a853] data-[state=active]:text-[#0a1628]">Leads</TabsTrigger>
              <TabsTrigger value="operaciones" className="text-xs px-4 data-[state=active]:bg-[#d4a853] data-[state=active]:text-[#0a1628]">Operaciones</TabsTrigger>
              <TabsTrigger value="tiempos" className="text-xs px-4 data-[state=active]:bg-[#d4a853] data-[state=active]:text-[#0a1628]">Tiempos</TabsTrigger>
              <TabsTrigger value="sla" className="text-xs px-4 data-[state=active]:bg-[#d4a853] data-[state=active]:text-[#0a1628]">SLA</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {activeTab === 'leads' && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                {/* Leads by Source */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={14} color="#d4a853" /> Leads por Fuente
                  </h3>
                  <div className="flex justify-center">
                    <BarChart data={LEADS_BY_SOURCE.map(d => ({ label: d.source, value: d.count, color: d.color }))} />
                  </div>
                </div>

                {/* Lead Trend */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={14} color="#d4a853" /> Evolucion de Leads
                  </h3>
                  <LineChart data={LEAD_TREND} labels={LEAD_TREND_LABELS} />
                </div>

                {/* Top Sources Table */}
                <div className="col-span-2 rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4">Top Fuentes de Leads</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: '#1a2744' }}>
                          {['Fuente', 'Leads', '% del Total', 'Tendencia', 'Conversion'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {LEADS_BY_SOURCE.map((s, i) => {
                          const pct = ((s.count / 142) * 100).toFixed(1);
                          const conv = (20 + Math.random() * 15).toFixed(1);
                          return (
                            <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-2.5 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                <span className="text-xs text-white">{s.source}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-white font-medium">{s.count}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 rounded-full overflow-hidden w-20" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                                  </div>
                                  <span className="text-[10px] text-gray-400">{pct}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-[11px]" style={{ color: '#22c55e' }}>+{(Math.random() * 8).toFixed(1)}%</td>
                              <td className="px-4 py-2.5 text-[11px] text-gray-300">{conv}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'operaciones' && (
              <motion.div
                key="operaciones"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                {/* Pie: Operations by Status */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Target size={14} color="#d4a853" /> Operaciones por Estado
                  </h3>
                  <div className="flex justify-center">
                    <PieChart data={OPS_BY_STATUS.map(d => ({ label: d.status, count: d.count, color: d.color }))} />
                  </div>
                </div>

                {/* Bar: Operations by Type */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={14} color="#d4a853" /> Operaciones por Tipo
                  </h3>
                  <div className="space-y-4 pt-2">
                    {OPS_BY_TYPE.map((d, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-300">{d.type}</span>
                          <span className="text-xs font-medium text-white">{d.count}%</span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${d.count}%` }}
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                            className="h-full rounded-full"
                            style={{ background: d.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pipeline Throughput */}
                <div className="col-span-2 rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap size={14} color="#d4a853" /> Rendimiento del Pipeline
                  </h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#d4a853' }} />
                      <span className="text-[10px] text-gray-400">Entradas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3b82f6' }} />
                      <span className="text-[10px] text-gray-400">Cierres</span>
                    </div>
                  </div>
                  <GroupedBarChart data={PIPELINE_THROUGHPUT.map(d => ({ label: d.month, v1: d.entered, v2: d.closed }))} />
                </div>
              </motion.div>
            )}

            {activeTab === 'tiempos' && (
              <motion.div
                key="tiempos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                {/* Average Days per Stage */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock size={14} color="#d4a853" /> Dias Medios por Etapa
                  </h3>
                  <HorizontalBarChart data={AVG_DAYS_PER_STAGE} />
                </div>

                {/* Comparison Table */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4">Comparativa Periodos</h3>
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#1a2744' }}>
                        {['Etapa', 'Actual', 'Anterior', 'Mejora'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-[10px] font-medium text-gray-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {AVG_DAYS_PER_STAGE.map((s, i) => {
                        const improvement = ((s.prev - s.days) / s.prev * 100).toFixed(0);
                        return (
                          <tr key={i} className="border-b border-white/[0.04] last:border-0">
                            <td className="px-3 py-2.5 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                              <span className="text-xs text-white">{s.stage}</span>
                            </td>
                            <td className="px-3 py-2.5 text-xs font-medium text-white">{s.days}d</td>
                            <td className="px-3 py-2.5 text-xs text-gray-500 line-through">{s.prev}d</td>
                            <td className="px-3 py-2.5 text-[11px]" style={{ color: '#22c55e' }}>-{improvement}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'sla' && (
              <motion.div
                key="sla"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                {/* SLA Incumplimientos by Stage */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle size={14} color="#ef4444" /> Incumplimientos por Etapa
                  </h3>
                  <div className="space-y-3">
                    {[
                      { stage: 'Captacion', count: 2, total: 12, color: '#8b5cf6' },
                      { stage: 'Preparacion', count: 1, total: 8, color: '#3b82f6' },
                      { stage: 'Comercializacion', count: 3, total: 10, color: '#06b6d4' },
                      { stage: 'Negociacion', count: 1, total: 6, color: '#f59e0b' },
                    ].map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-gray-300">{s.stage}</span>
                          <span className="text-[11px] text-gray-400">{s.count} de {s.total}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${(s.count / s.total) * 100}%`, background: '#ef4444' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Tasa de cumplimiento global</span>
                    <span className="text-sm font-bold" style={{ color: '#22c55e' }}>88.3%</span>
                  </div>
                </div>

                {/* Alert Table */}
                <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <XCircle size={14} color="#f59e0b" /> Alertas Activas
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {SLA_ALERTS.map((alert, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.04]" style={{ background: '#0a1628' }}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center`} style={{ background: alert.severity === 'critical' ? '#ef444420' : alert.severity === 'warning' ? '#f59e0b20' : '#22c55e20' }}>
                          {alert.severity === 'critical' ? <AlertTriangle size={13} color="#ef4444" /> : alert.severity === 'warning' ? <Clock size={13} color="#f59e0b" /> : <CheckCircle size={13} color="#22c55e" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-white">{alert.op}</span>
                            <Badge className="text-[8px] px-1 py-0 h-3" variant="outline" style={{ borderColor: '#f59e0b40', color: '#f59e0b' }}>{alert.stage}</Badge>
                          </div>
                          <p className="text-[10px] text-gray-500">{alert.responsible} &middot; SLA: {alert.days}/{alert.sla} dias</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolution Rate */}
                <div className="col-span-2 rounded-xl border border-white/[0.06] p-5" style={{ background: '#111d32' }}>
                  <h3 className="text-sm font-semibold text-white mb-4">Tasa de Resolucion SLA</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Resueltos a tiempo', value: '42', total: 49, color: '#22c55e' },
                      { label: 'Proximos a vencer', value: '5', total: 49, color: '#f59e0b' },
                      { label: 'Vencidos', value: '2', total: 49, color: '#ef4444' },
                    ].map((r, i) => (
                      <div key={i} className="text-center p-4 rounded-lg" style={{ background: '#0a1628' }}>
                        <div className="text-2xl font-bold mb-1" style={{ color: r.color }}>{r.value}</div>
                        <div className="text-[10px] text-gray-400 mb-2">de {r.total} totales</div>
                        <div className="text-sm font-medium" style={{ color: r.color }}>{((Number(r.value) / r.total) * 100).toFixed(1)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

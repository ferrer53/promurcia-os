import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Building2, GitBranch, TrendingUp,
  ArrowUpRight, ArrowDownRight,
  Mail, Phone, MapPin, AlertTriangle, Brain, Loader2
} from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { sourceColors, tierColors } from '../crm_leads/mockData';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ─── SVG AreaChart ─── */
function AreaChart({ data }: { data: { month: string; leads: number }[] }) {
  const w = 500, h = 200, pad = 20;
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.leads));
  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - (d.leads / max) * (h - pad * 2),
  }));
  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${lineD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 200 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a853" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d4a853" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad} y1={h - pad - t * (h - pad * 2)} x2={w - pad} y2={h - pad - t * (h - pad * 2)}
          stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
      ))}
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={lineD} fill="none" stroke="#d4a853" strokeWidth={2} strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#d4a853" stroke="#0a1628" strokeWidth={2} />
      ))}
      {data.filter((_, i) => i % 2 === 0).map((d, i) => (
        <text key={d.month} x={points[i * 2]?.x ?? 0} y={h - 4} textAnchor="middle" fill="#6b7280" fontSize="10">{d.month}</text>
      ))}
    </svg>
  );
}

/* ─── SVG BarChart ─── */
function BarChart({ data }: { data: { source: string; count: number; color: string }[] }) {
  const w = 400, h = 180, pad = 20;
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count));
  const barW = 40;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 180 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad} y1={h - pad - t * (h - pad * 2)} x2={w - pad} y2={h - pad - t * (h - pad * 2)}
          stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
      ))}
      {data.map((d, i) => {
        const bh = (d.count / max) * (h - pad * 2);
        const x = pad + 30 + i * 70;
        return (
          <g key={d.source}>
            <rect x={x - barW / 2} y={h - pad - bh} width={barW} height={bh} rx={4}
              fill={d.color} opacity={0.7} />
            <text x={x} y={h - pad - bh - 6} textAnchor="middle" fill={d.color} fontSize="10" fontWeight="600">{d.count}</text>
            <text x={x} y={h - 4} textAnchor="middle" fill="#6b7280" fontSize="9">{d.source}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Pipeline Bar ─── */
function PipelineBar({ stages }: { stages: { stage: string; count: number; color: string }[] }) {
  const total = stages.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      {stages.map(stage => (
        <div key={stage.stage} className="flex items-center gap-3">
          <span className="text-[10px] w-20 text-right shrink-0 uppercase tracking-wider" style={{ color: '#9ca3af' }}>{stage.stage}</span>
          <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((stage.count / Math.max(total, 1)) * 100 * 3, 100)}%` }}
              transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.3 }}
              className="h-full rounded-full flex items-center justify-end pr-2" style={{ background: stage.color }}>
              <span className="text-[10px] font-semibold text-white">{stage.count}</span>
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Loading Skeleton ─── */
function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="w-12 h-4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="w-16 h-6 rounded mb-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="w-24 h-3 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
    </div>
  );
}

export default function CrmDashboardApp() {
  const { data: kpis, isLoading: kpiLoading } = trpc.crm.dashboard.getKPIs.useQuery({});
  const { data: leadStats, isLoading: statsLoading } = trpc.crm.dashboard.getLeadStats.useQuery({});
  const { data: pipelineStats, isLoading: pipelineLoading } = trpc.crm.dashboard.getPipelineStats.useQuery({});
  const { data: recentActivity, isLoading: activityLoading } = trpc.crm.dashboard.getRecentActivity.useQuery({ limit: 10 });
  const { data: alerts, isLoading: alertsLoading } = trpc.crm.dashboard.getAlerts.useQuery({ limit: 5 });
  const { data: recentLeadsData } = trpc.crm.leads.list.useQuery({ page: 1, pageSize: 5 });

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const kpiItems = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Total Leads', value: String(kpis.totalLeads), change: kpis.totalLeadsChange, trend: 'up' as const, icon: Users, color: '#d4a853' },
      { label: 'Leads Nuevos (Hoy)', value: String(kpis.leadsNuevosHoy), change: kpis.leadsNuevosChange, trend: 'up' as const, icon: UserPlus, color: '#22c55e' },
      { label: 'Propiedades Activas', value: String(kpis.propiedadesActivas), change: kpis.propiedadesChange, trend: 'up' as const, icon: Building2, color: '#3b82f6' },
      { label: 'Operaciones Activas', value: String(kpis.operacionesActivas), change: kpis.operacionesChange, trend: 'up' as const, icon: GitBranch, color: '#8b5cf6' },
      { label: 'Tasa Conversion', value: `${kpis.tasaConversion}%`, change: kpis.tasaConversionChange, trend: 'up' as const, icon: TrendingUp, color: '#22c55e' },
    ];
  }, [kpis]);

  const monthlyData = leadStats?.monthlyData ?? [];
  const sourceData = leadStats?.sourceData ?? [];
  const tierDistribution = leadStats?.tierDistribution ?? { hot: { count: 0, percentage: 0 }, warm: { count: 0, percentage: 0 }, cold: { count: 0, percentage: 0 } };
  const pipelineStages = pipelineStats?.stages ?? [];
  const activityData = recentActivity ?? [];
  const alertsData = alerts ?? [];
  const recentLeads = recentLeadsData?.items ?? [];

  const activityIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    lead_creado: UserPlus,
    clasificacion_ia: Brain,
    visita: MapPin,
    llamada: Phone,
    email: Mail,
  };

  const isLoading = kpiLoading || statsLoading || pipelineLoading;

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0a1628' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Panel de Control</h1>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
            <Brain size={10} /> CEREBRO
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: '#6b7280' }}>{today}</span>
          <button className="px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-[1.02]"
            style={{ background: 'transparent', color: '#d4a853', border: '1px solid rgba(212,168,83,0.2)' }}>
            Exportar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} color="#d4a853" className="animate-spin" />
        </div>
      ) : (
        <div className="flex-1 px-6 py-5 space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-4">
            {kpiLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : kpiItems.map((kpi, i) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: easeOutExpo }}
                  className="rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-default"
                  style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,83,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                      <kpi.icon size={20} color={kpi.color} />
                    </div>
                    <div className="flex items-center gap-0.5">
                      {kpi.trend === 'up' ? <ArrowUpRight size={12} color="#22c55e" /> : <ArrowDownRight size={12} color="#ef4444" />}
                      <span className="text-[10px] font-medium" style={{ color: '#22c55e' }}>{kpi.change}</span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-white">{kpi.value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{kpi.label}</p>
                </motion.div>
              ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4, ease: easeOutExpo }}
              className="rounded-xl p-5" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-sm font-semibold text-white mb-1">Evolucion de Leads</h3>
              <p className="text-[10px] mb-4" style={{ color: '#6b7280' }}>Leads por mes</p>
              <AreaChart data={monthlyData} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.4, ease: easeOutExpo }}
              className="rounded-xl p-5" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-sm font-semibold text-white mb-1">Fuentes de Captacion</h3>
              <p className="text-[10px] mb-4" style={{ color: '#6b7280' }}>Leads por canal</p>
              <BarChart data={sourceData} />
            </motion.div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Recent Leads */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4, ease: easeOutExpo }}
              className="rounded-xl p-5" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-sm font-semibold text-white mb-1">Leads Recientes</h3>
              <p className="text-[10px] mb-4" style={{ color: '#6b7280' }}>Ultimos contactos registrados</p>
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>
                      {lead.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{lead.nombre}</p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>{lead.telefono}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize"
                      style={{ background: tierColors[lead.tier]?.bg, color: tierColors[lead.tier]?.text }}>{lead.tier}</span>
                  </div>
                ))}
                {recentLeads.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: '#6b7280' }}>No hay leads recientes</p>
                )}
              </div>
            </motion.div>

            {/* Pipeline */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4, ease: easeOutExpo }}
              className="rounded-xl p-5" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-sm font-semibold text-white mb-1">Pipeline</h3>
              <p className="text-[10px] mb-4" style={{ color: '#6b7280' }}>{pipelineStats?.stages.reduce((s, st) => s + st.count, 0) ?? 0} operaciones en curso</p>
              <PipelineBar stages={pipelineStages} />
            </motion.div>

            {/* Alerts + Tier Distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4, ease: easeOutExpo }} className="space-y-4">
              {/* Tier Distribution */}
              <div className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
                <h3 className="text-sm font-semibold text-white mb-3">Clasificacion IA</h3>
                <div className="space-y-2">
                  {(['hot', 'warm', 'cold'] as const).map(tier => (
                    <div key={tier} className="flex items-center gap-2">
                      <span className="text-[10px] w-10 uppercase font-medium" style={{ color: tierColors[tier]?.text }}>{tier}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${tierDistribution[tier].percentage}%` }}
                          transition={{ duration: 0.8, ease: easeOutExpo, delay: 0.4 }}
                          className="h-full rounded-full" style={{ background: tierColors[tier]?.text }} />
                      </div>
                      <span className="text-[10px] w-6 text-right" style={{ color: '#9ca3af' }}>{tierDistribution[tier].count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              <div className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
                <h3 className="text-sm font-semibold text-white mb-3">Alertas y Tareas</h3>
                <div className="space-y-2">
                  {alertsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="w-full h-8 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    ))
                  ) : alertsData.slice(0, 4).map(alert => (
                    <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg"
                      style={{ background: alert.priority === 'alta' ? 'rgba(212,168,83,0.05)' : 'transparent', borderLeft: alert.priority === 'alta' ? '2px solid #d4a853' : '2px solid transparent' }}>
                      <AlertTriangle size={12} className="shrink-0 mt-0.5"
                        color={alert.priority === 'alta' ? '#d4a853' : alert.priority === 'media' ? '#f59e0b' : '#6b7280'} />
                      <div className="flex-1">
                        <p className="text-[11px] text-white leading-tight">{alert.text}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: '#6b7280' }}>{alert.due}</p>
                      </div>
                    </div>
                  ))}
                  {alertsData.length === 0 && (
                    <p className="text-xs text-center py-2" style={{ color: '#6b7280' }}>Sin alertas pendientes</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Activity Timeline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4, ease: easeOutExpo }}
            className="rounded-xl p-5" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Actividad Reciente</h3>
            {activityLoading ? (
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-48 h-12 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-2">
                {activityData.map((act, i) => {
                  const IconComp = activityIcons[act.type] || Brain;
                  return (
                    <div key={act.id} className="flex items-start gap-2 min-w-[200px]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${act.color || '#6b7280'}15` }}>
                        <IconComp size={14} color={act.color || '#6b7280'} />
                      </div>
                      <div>
                        <p className="text-xs text-white leading-tight">{act.text}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{act.time}</p>
                      </div>
                      {i < activityData.length - 1 && (
                        <div className="w-8 h-px shrink-0 mt-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      )}
                    </div>
                  );
                })}
                {activityData.length === 0 && (
                  <p className="text-xs py-4" style={{ color: '#6b7280' }}>Sin actividad reciente</p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

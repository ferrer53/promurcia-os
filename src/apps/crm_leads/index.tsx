import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Eye, Pencil, Trash2, Brain,
  ChevronLeft, ChevronRight, ChevronDown, X, Phone,
  Mail, MapPin, Calendar, Building2, Star,
  MessageSquare, Bot, Tag, Loader2, AlertCircle
} from 'lucide-react';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';
import { sourceColors, estadoColors, tierColors } from './mockData';
import type { Lead } from './mockData';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function CrmLeadsApp() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isComercial = user?.role === 'comercial';
  const canEdit = user?.role !== 'solo_lectura';

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [fuenteFilter, setFuenteFilter] = useState('todos');
  const [tierFilter, setTierFilter] = useState('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sortField, setSortField] = useState<string>('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = trpc.crm.leads.list.useQuery({
    search: search || undefined,
    status: estadoFilter !== 'todos' ? estadoFilter : undefined,
    source: fuenteFilter !== 'todos' ? fuenteFilter : undefined,
    tier: tierFilter !== 'todos' ? tierFilter : undefined,
    page,
    pageSize,
  });

  const createLead = trpc.crm.leads.create.useMutation({
    onSuccess: () => {
      utils.crm.leads.list.invalidate();
      setShowCreate(false);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteLead = trpc.crm.leads.delete.useMutation({
    onSuccess: () => {
      utils.crm.leads.list.invalidate();
      setShowDetail(false);
      setSelectedLead(null);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const classifyLead = trpc.crm.leads.classify.useMutation({
    onSuccess: () => utils.crm.leads.list.invalidate(),
    onError: (err) => setErrorMsg(err.message),
  });

  const filteredLeads: Lead[] = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetail(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estas seguro de eliminar este lead?')) {
      deleteLead.mutate({ id });
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-xl font-semibold text-white">Gestion de Leads</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{totalItems} contactos en total</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:scale-[1.02]"
            style={{ background: '#d4a853', color: '#0a1628' }}>
            <Plus size={16} /> Nuevo Lead
          </button>
        )}
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="shrink-0 mx-6 mt-3 px-4 py-2 rounded-lg flex items-center gap-2 text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14} /> {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="ml-auto"><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 px-3 rounded-full" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)', height: 40 }}>
          <Search size={16} color="#6b7280" />
          <input type="text" placeholder="Buscar por nombre, email o telefono..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm outline-none w-64" style={{ color: '#fff' }} />
          {search && <button onClick={() => { setSearch(''); setPage(1); }}><X size={14} color="#6b7280" /></button>}
        </div>

        <select value={estadoFilter} onChange={e => { setEstadoFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
          style={{ background: '#1a2744', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)', height: 40 }}>
          <option value="todos">Todos los estados</option>
          <option value="nuevo">Nuevo</option>
          <option value="contactado">Contactado</option>
          <option value="cualificado">Cualificado</option>
          <option value="reserva">Reserva</option>
          <option value="vendido">Vendido</option>
          <option value="perdido">Perdido</option>
        </select>

        <select value={fuenteFilter} onChange={e => { setFuenteFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
          style={{ background: '#1a2744', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)', height: 40 }}>
          <option value="todos">Todas las fuentes</option>
          <option value="idealista">Idealista</option>
          <option value="fotocasa">Fotocasa</option>
          <option value="manual">Manual</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="web">Web</option>
          <option value="webhook">Webhook</option>
        </select>

        <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
          style={{ background: '#1a2744', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)', height: 40 }}>
          <option value="todos">Todos los tiers</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>

        <button onClick={() => { classifyLead.mutate({ id: selectedLead?.id ?? 1 }); }}
          disabled={classifyLead.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 ml-auto disabled:opacity-50"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', height: 40 }}>
          <Brain size={14} /> {classifyLead.isPending ? 'Clasificando...' : 'Clasificar IA'}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} color="#d4a853" className="animate-spin" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#1a2744' }}>
                  {[
                    { key: 'nombre', label: 'Nombre', w: '180px' },
                    { key: 'email', label: 'Email', w: '200px' },
                    { key: 'telefono', label: 'Telefono', w: '130px' },
                    { key: 'estado', label: 'Estado', w: '100px' },
                    { key: 'fuente', label: 'Fuente', w: '100px' },
                    { key: 'tier', label: 'Tier', w: '80px' },
                    { key: 'score', label: 'Score', w: '70px' },
                    { key: 'fecha', label: 'Fecha', w: '100px' },
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)}
                      className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                      style={{ color: '#9ca3af', width: col.w }}>
                      <div className="flex items-center gap-1">{col.label} {sortField === col.key && <ChevronDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />}</div>
                    </th>
                  ))}
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af', width: '90px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredLeads.map((lead, i) => (
                    <motion.tr key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3, ease: easeOutExpo }}
                      className="group cursor-pointer transition-colors duration-100"
                      style={{ background: i % 2 === 0 ? '#0a1628' : 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onClick={() => openDetail(lead)}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                            style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>
                            {lead.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-white truncate" style={{ maxWidth: 140 }}>{lead.nombre}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm truncate" style={{ color: '#d1d5db', maxWidth: 180 }}>{lead.email}</td>
                      <td className="px-3 py-3 text-sm" style={{ color: '#d1d5db' }}>{lead.telefono}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: estadoColors[lead.estado]?.bg || '#1a2744', color: estadoColors[lead.estado]?.text || '#9ca3af' }}>
                          {lead.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: `${sourceColors[lead.fuente] || '#6b7280'}20`, color: sourceColors[lead.fuente] || '#9ca3af' }}>
                          {lead.fuente}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                          style={{ background: tierColors[lead.tier]?.bg, color: tierColors[lead.tier]?.text }}>
                          {lead.tier}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-medium" style={{ color: '#d4a853' }}>{lead.score}</span>
                      </td>
                      <td className="px-3 py-3 text-sm" style={{ color: '#d1d5db' }}>{lead.fecha}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); openDetail(lead); }} className="p-1.5 rounded-md hover:bg-white/5" title="Ver"><Eye size={14} color="#9ca3af" /></button>
                          {canEdit && <button onClick={e => e.stopPropagation()} className="p-1.5 rounded-md hover:bg-white/5" title="Editar"><Pencil size={14} color="#9ca3af" /></button>}
                          {canEdit && <button onClick={e => { e.stopPropagation(); handleDelete(lead.id); }} className="p-1.5 rounded-md hover:bg-white/5" title="Eliminar"><Trash2 size={14} color="#ef4444" /></button>}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredLeads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Search size={48} color="#1a2744" />
                <p className="text-sm mt-4" style={{ color: '#6b7280' }}>No se encontraron leads</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>
            Mostrando {totalItems > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, totalItems)} de {totalItems}
          </span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="ml-4 px-2 py-1 rounded text-xs outline-none cursor-pointer"
            style={{ background: '#1a2744', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-md transition-colors disabled:opacity-30" style={{ color: '#9ca3af' }}><ChevronLeft size={16} /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p = i + 1;
            if (totalPages > 5 && page > 3) p = page - 3 + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)}
                className="w-8 h-8 rounded-md text-xs font-medium transition-colors"
                style={{ background: p === page ? '#d4a853' : 'transparent', color: p === page ? '#0a1628' : '#9ca3af' }}>{p}</button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded-md transition-colors disabled:opacity-30" style={{ color: '#9ca3af' }}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedLead && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDetail(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.4, ease: easeOutExpo }}
              className="ml-auto h-full overflow-auto" style={{ width: 600, background: '#111d32', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              onClick={e => e.stopPropagation()}>
              {/* Detail Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: '#111d32', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setShowDetail(false)} className="flex items-center gap-1 text-xs transition-colors hover:text-white" style={{ color: '#9ca3af' }}>
                  <ChevronLeft size={16} /> Volver
                </button>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: 'rgba(212,168,83,0.1)', color: '#d4a853', border: '1px solid rgba(212,168,83,0.2)' }}>
                      <Pencil size={12} /> Editar
                    </button>
                  )}
                  <button onClick={() => setShowDetail(false)} className="p-1.5 rounded-md hover:bg-white/5"><X size={16} color="#9ca3af" /></button>
                </div>
              </div>

              <LeadDetailContent lead={selectedLead} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Lead Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-xl p-6 w-[480px] max-h-[80vh] overflow-auto" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-4">Nuevo Lead</h2>
              <CreateLeadForm onSubmit={(data) => createLead.mutate(data)} onCancel={() => setShowCreate(false)} isPending={createLead.isPending} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Create Lead Form ─── */
function CreateLeadForm({ onSubmit, onCancel, isPending }: { onSubmit: (data: { nombre: string; email: string; telefono: string; zona?: string; tipoOperacion?: string; notas?: string }) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', zona: '', tipoOperacion: 'compra', notas: '' });
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Nombre *</label>
        <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Email *</label>
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Telefono *</label>
        <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Zona</label>
        <input type="text" value={form.zona} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Tipo Operacion</label>
        <select value={form.tipoOperacion} onChange={e => setForm(f => ({ ...f, tipoOperacion: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="compra">Compra</option>
          <option value="alquiler">Alquiler</option>
          <option value="inversion">Inversion</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Notas</label>
        <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ color: '#9ca3af' }}>Cancelar</button>
        <button onClick={() => onSubmit(form)} disabled={isPending || !form.nombre || !form.email || !form.telefono}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{ background: '#d4a853', color: '#0a1628' }}>{isPending ? 'Creando...' : 'Crear Lead'}</button>
      </div>
    </div>
  );
}

/* ─── Lead Detail Content ─── */
function LeadDetailContent({ lead }: { lead: Lead }) {
  return (
    <div className="px-6 py-6 space-y-6">
      {/* Main Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: easeOutExpo }}
        className="rounded-xl p-5" style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>
            {lead.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white">{lead.nombre}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                style={{ background: estadoColors[lead.estado]?.bg, color: estadoColors[lead.estado]?.text }}>{lead.estado}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                style={{ background: tierColors[lead.tier]?.bg, color: tierColors[lead.tier]?.text }}>{lead.tier}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center" style={{ border: '2px solid #d4a853' }}>
              <span className="text-sm font-bold" style={{ color: '#d4a853' }}>{lead.score}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="flex items-center gap-2">
            <Phone size={14} color="#6b7280" />
            <span className="text-sm" style={{ color: '#d1d5db' }}>{lead.telefono}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={14} color="#6b7280" />
            <span className="text-sm truncate" style={{ color: '#d1d5db' }}>{lead.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} color="#6b7280" />
            <span className="text-sm" style={{ color: '#d1d5db' }}>{lead.zona}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} color="#6b7280" />
            <span className="text-sm" style={{ color: '#d1d5db' }}>{lead.fecha}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag size={14} color="#6b7280" />
            <span className="text-sm capitalize" style={{ color: '#d1d5db' }}>{lead.tipoOperacion} - {lead.persona}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star size={14} color="#6b7280" />
            <span className="text-sm capitalize" style={{ color: '#d1d5db' }}>{lead.fuente}</span>
          </div>
        </div>

        {lead.notas && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>Notas</p>
            <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>{lead.notas}</p>
          </div>
        )}
      </motion.div>

      {/* AI Classification */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4, ease: easeOutExpo }}
        className="rounded-xl p-5" style={{ background: '#0a1628', border: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Bot size={16} color="#a78bfa" />
          <h3 className="text-sm font-semibold" style={{ color: '#a78bfa' }}>Clasificacion IA</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Tier</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize"
              style={{ background: tierColors[lead.tier]?.bg, color: tierColors[lead.tier]?.text }}>{lead.tier}</span>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Persona</p>
            <span className="text-sm font-medium text-white">{lead.persona}</span>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Score</p>
            <span className="text-sm font-medium" style={{ color: '#d4a853' }}>{lead.score}/100</span>
          </div>
        </div>
      </motion.div>

      {/* Interactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4, ease: easeOutExpo }}
        className="rounded-xl p-5" style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} color="#d4a853" />
          <h3 className="text-sm font-semibold text-white">Interacciones</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>{lead.interacciones?.length ?? 0}</span>
        </div>
        <div className="space-y-3">
          {lead.interacciones?.map((inter) => (
            <div key={inter.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${sourceColors[inter.tipo] || '#6b7280'}20` }}>
                <MessageSquare size={12} color={sourceColors[inter.tipo] || '#6b7280'} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{inter.asunto}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{inter.tipo}</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: '#d1d5db' }}>{inter.contenido}</p>
                <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{inter.fecha} · {inter.direccion}</p>
              </div>
            </div>
          )) ?? <p className="text-xs" style={{ color: '#6b7280' }}>Sin interacciones</p>}
        </div>
      </motion.div>

      {/* Linked Properties */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4, ease: easeOutExpo }}
        className="rounded-xl p-5" style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} color="#d4a853" />
          <h3 className="text-sm font-semibold text-white">Propiedades Vinculadas</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>{lead.propiedadesVinculadas?.length ?? 0}</span>
        </div>
        <div className="space-y-3">
          {lead.propiedadesVinculadas?.map((prop) => (
            <div key={prop.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Building2 size={12} color="#3b82f6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium" style={{ color: '#d4a853' }}>{prop.ref}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{prop.relacion}</span>
                </div>
                <p className="text-xs font-medium text-white mt-0.5">{prop.titulo}</p>
                <p className="text-[10px]" style={{ color: '#6b7280' }}>{prop.direccion}</p>
              </div>
            </div>
          )) ?? <p className="text-xs" style={{ color: '#6b7280' }}>Sin propiedades vinculadas</p>}
        </div>
      </motion.div>
    </div>
  );
}

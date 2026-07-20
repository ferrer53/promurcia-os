import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Plus, FileText, Tag, Clock, User, Edit3, Trash2,
  Eye, Download, BarChart3, Star, ChevronRight, X, Save, Copy, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/providers/trpc';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES = ['Procedimientos', 'Legal', 'Marketing', 'Finanzas', 'Tecnologia'];

const CAT_COLORS: Record<string, string> = {
  'Procedimientos': '#3b82f6',
  'Legal': '#8b5cf6',
  'Marketing': '#f59e0b',
  'Finanzas': '#22c55e',
  'Tecnologia': '#06b6d4',
};

export default function CRMKnowledge() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === 'superCEO' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: articlesData, isLoading } = trpc.crm.knowledge.list.useQuery({
    search: searchQuery || undefined,
    category: categoryFilter !== 'todas' ? categoryFilter : undefined,
    page: 1,
    pageSize: 100,
  });

  const createArticle = trpc.crm.knowledge.create.useMutation({
    onSuccess: () => { utils.crm.knowledge.list.invalidate(); setShowCreate(false); showToast('Articulo creado correctamente'); },
    onError: (err) => setErrorMsg(err.message),
  });

  const updateArticle = trpc.crm.knowledge.update.useMutation({
    onSuccess: () => { utils.crm.knowledge.list.invalidate(); setEditingArticle(null); showToast('Articulo actualizado'); },
    onError: (err) => setErrorMsg(err.message),
  });

  const deleteArticle = trpc.crm.knowledge.delete.useMutation({
    onSuccess: () => { utils.crm.knowledge.list.invalidate(); setSelectedArticle(null); showToast('Articulo eliminado'); },
    onError: (err) => setErrorMsg(err.message),
  });

  const articles = articlesData?.items ?? [];

  const articlesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach(a => { map[a.category] = (map[a.category] || 0) + 1; });
    return CATEGORIES.map(cat => ({ name: cat, count: map[cat] || 0, color: CAT_COLORS[cat] }));
  }, [articles]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const totalArticles = articles.length;

  return (
    <div className="h-full flex flex-col" style={{ background: '#0a1628' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 120, opacity: 0 }}
            className="absolute top-4 right-4 z-50 px-4 py-3 rounded-lg border border-white/[0.08] flex items-center gap-2"
            style={{ background: '#111d32', borderLeft: '3px solid #d4a853' }}>
            <Star size={14} color="#d4a853" />
            <span className="text-xs text-white">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
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

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Base de Conocimiento</h1>
          <Badge className="text-[10px]" variant="outline" style={{ borderColor: '#d4a85340', color: '#d4a853' }}>
            {totalArticles} articulos
          </Badge>
        </div>
        {isAdmin && (
          <Button size="sm" className="text-xs gap-1.5" style={{ background: '#d4a853', color: '#0a1628' }} onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Nuevo Articulo
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 px-3 rounded-full" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)', height: 40 }}>
          <Search size={16} color="#6b7280" />
          <input type="text" placeholder="Buscar articulos..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm outline-none w-56" style={{ color: '#fff' }} />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X size={14} color="#6b7280" /></button>}
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
          style={{ background: '#1a2744', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)', height: 40 }}>
          <option value="todas">Todas categorias</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} color="#d4a853" className="animate-spin" />
          </div>
        ) : (
          <>
            {/* Category Stats */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {articlesByCategory.map((cat, i) => (
                <motion.div key={cat.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}
                  onClick={() => setCategoryFilter(cat.name === categoryFilter ? 'todas' : cat.name)}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${cat.color}20` }}>
                    <BookOpen size={16} color={cat.color} />
                  </div>
                  <p className="text-lg font-bold text-white">{cat.count}</p>
                  <p className="text-[10px]" style={{ color: '#6b7280' }}>{cat.name}</p>
                </motion.div>
              ))}
            </div>

            {/* Articles Table */}
            <div className="space-y-2">
              <AnimatePresence>
                {articles.map((article, i) => (
                  <motion.div key={article.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className="rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all hover:bg-[rgba(212,168,83,0.02)]"
                    style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}
                    onClick={() => setSelectedArticle(article)}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${CAT_COLORS[article.category] || '#6b7280'}20` }}>
                      <FileText size={18} color={CAT_COLORS[article.category] || '#6b7280'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-white">{article.title}</h3>
                        <Badge className="text-[9px] h-4 px-1" style={{ background: `${CAT_COLORS[article.category]}20`, color: CAT_COLORS[article.category], border: 'none' }}>
                          {article.category}
                        </Badge>
                      </div>
                      <p className="text-xs mb-1 truncate" style={{ color: '#6b7280' }}>{article.summary}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}><User size={10} /> {article.author}</span>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}><Clock size={10} /> {article.date}</span>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}><Eye size={10} /> {article.views}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setEditingArticle(article); }} className="p-1.5 rounded-md hover:bg-white/5">
                          <Edit3 size={14} color="#9ca3af" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Eliminar articulo?')) deleteArticle.mutate({ id: article.id }); }} className="p-1.5 rounded-md hover:bg-white/5">
                          <Trash2 size={14} color="#ef4444" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {articles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <BookOpen size={48} color="#1a2744" />
                  <p className="text-sm mt-4" style={{ color: '#6b7280' }}>No se encontraron articulos</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedArticle(null)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.4, ease: easeOutExpo }}
              className="ml-auto h-full overflow-auto" style={{ width: 600, background: '#111d32', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: '#111d32', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-1 text-xs transition-colors hover:text-white" style={{ color: '#9ca3af' }}>
                  <ChevronRight size={16} className="rotate-180" /> Volver
                </button>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingArticle(selectedArticle)} className="p-1.5 rounded-md hover:bg-white/5"><Edit3 size={14} color="#9ca3af" /></button>
                    <button onClick={() => { if (window.confirm('Eliminar?')) deleteArticle.mutate({ id: selectedArticle.id }); }} className="p-1.5 rounded-md hover:bg-white/5"><Trash2 size={14} color="#ef4444" /></button>
                  </div>
                )}
              </div>
              <div className="px-6 py-6 space-y-4">
                <Badge className="text-[10px]" style={{ background: `${CAT_COLORS[selectedArticle.category]}20`, color: CAT_COLORS[selectedArticle.category], border: 'none' }}>
                  {selectedArticle.category}
                </Badge>
                <h2 className="text-xl font-semibold text-white">{selectedArticle.title}</h2>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}><User size={10} /> {selectedArticle.author}</span>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}><Clock size={10} /> {selectedArticle.date}</span>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: '#6b7280' }}><Eye size={10} /> {selectedArticle.views} vistas</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>{selectedArticle.summary}</p>
                {selectedArticle.content && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#d1d5db' }}>{selectedArticle.content}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreate || editingArticle) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setShowCreate(false); setEditingArticle(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-xl p-6 w-[520px] max-h-[80vh] overflow-auto" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-4">{editingArticle ? 'Editar Articulo' : 'Nuevo Articulo'}</h2>
              <ArticleForm
                initial={editingArticle}
                onSubmit={(data) => {
                  if (editingArticle) {
                    updateArticle.mutate({ id: editingArticle.id, ...data });
                  } else {
                    createArticle.mutate(data);
                  }
                }}
                onCancel={() => { setShowCreate(false); setEditingArticle(null); }}
                isPending={createArticle.isPending || updateArticle.isPending}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Article Form ─── */
function ArticleForm({ initial, onSubmit, onCancel, isPending }: { initial?: any; onSubmit: (data: any) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    category: initial?.category ?? 'Procedimientos',
    summary: initial?.summary ?? '',
    content: initial?.content ?? '',
  });
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Titulo *</label>
        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Categoria</label>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Resumen</label>
        <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: '#9ca3af' }}>Contenido</label>
        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none font-mono" style={{ background: '#1a2744', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }} />
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ color: '#9ca3af' }}>Cancelar</button>
        <button onClick={() => onSubmit(form)} disabled={isPending || !form.title}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{ background: '#d4a853', color: '#0a1628' }}>{isPending ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  );
}

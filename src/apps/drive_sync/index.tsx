import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/providers/trpc';
import {
  Cloud, FileText, FileSpreadsheet, FileImage, CheckCircle2, AlertCircle,
  Search, Link2, Phone, Mail, MapPin, Home, User, DollarSign, BedDouble, Bath,
  Maximize2, Activity, Database, Download, Filter, ChevronDown, ChevronUp,
  Layers, BrainCircuit, Sparkles, Timer, RefreshCw, FileUp, ServerOff,
  X, HardDrive, Zap, WifiOff, Upload, Trash2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface DriveFile {
  id: string; name: string; mimeType: string; size: number;
  modifiedTime?: string; createdTime?: string;
}

interface AIResult {
  fileId: string; fileName: string; mimeType: string;
  success: boolean; data: any; tokens: number; elapsedMs: number;
  error?: string;
}

interface ManualFile {
  id: string; name: string; size: number; type: string;
  content: string; status: 'pending' | 'analyzing' | 'done' | 'error';
  aiResult?: AIResult;
}

// ─── Utils ───────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (!b) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
}

function timeAgo(d?: string): string {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} dias`;
}

function getFileIcon(mimeType: string) {
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('csv'))
    return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
  if (mimeType?.includes('pdf'))
    return <FileText className="w-5 h-5 text-red-400" />;
  if (mimeType?.startsWith('image/'))
    return <FileImage className="w-5 h-5 text-purple-400" />;
  return <FileUp className="w-5 h-5 text-amber-400" />;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('csv')) return 'Excel/CSV';
  if (mimeType?.includes('pdf')) return 'PDF';
  if (mimeType?.startsWith('image/')) return 'Imagen';
  if (mimeType?.includes('text')) return 'Texto';
  if (mimeType?.includes('json')) return 'JSON';
  return 'Otro';
}

function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: '#22c55e22', text: '#4ade80', label: 'Alta' },
    medium: { bg: '#f59e0b22', text: '#fbbf24', label: 'Media' },
    low: { bg: '#ef444422', text: '#f87171', label: 'Baja' },
  };
  const c = map[level] || map.low;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 min-w-[140px] p-4 rounded-xl border"
      style={{ backgroundColor: '#0f2240', borderColor: `${color}33` }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}22` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="text-2xl font-bold" style={{ color: '#e8d5b8' }}>{value}</div>
      </div>
      <div className="text-xs" style={{ color: '#8b9cb5' }}>{label}</div>
    </motion.div>
  );
}

const TABS = ['Resumen', 'Inmuebles', 'Contactos', 'Vinculos', 'Archivos'];
const MIME_TYPES = [
  'text/csv',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'application/json',
];

// ─── XLSX Dynamic Import ─────────────────────────────────────────
async function getXLSX() { const mod = await import('xlsx'); return mod; }

// ─── Extract file content ────────────────────────────────────────
async function extractFileContent(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'csv' || ext === 'txt' || ext === 'json') {
    return await file.text();
  } else if (['xlsx', 'xls'].includes(ext)) {
    const XLSX = await getXLSX();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', cellFormula: false });
    let content = '';
    wb.SheetNames.forEach((sn) => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn]);
      content += `\n--- HOJA: ${sn} ---\n${csv}`;
    });
    return content;
  }
  return `[${ext.toUpperCase()}: ${file.name}]`;
}

// ─── Main Component ──────────────────────────────────────────────

export default function DriveSync() {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [expandedPhones, setExpandedPhones] = useState<Set<string>>(new Set());
  const [filterMime, setFilterMime] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Manual upload state
  const [manualFiles, setManualFiles] = useState<ManualFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileStoreRef = useRef<Map<string, File>>(new Map());

  // tRPC: list files from Google Drive
  const {
    data: driveData,
    isLoading: loadingDrive,
    error: driveError,
    refetch: refetchDrive,
  } = trpc.drive.listFiles.useQuery(
    { mimeTypes: MIME_TYPES, pageSize: 100 },
    { enabled: mode === 'auto', retry: 1 }
  );

  // tRPC: run extraction + AI analysis pipeline
  const pipelineMutation = trpc.drive.runExtractionPipeline.useMutation();
  const analyzeMutation = trpc.openai.analyzeDocument.useMutation();

  const driveFiles: DriveFile[] = driveData?.success ? (driveData.files || []) : [];
  const isConnected = driveData?.success === true;
  const backendUnavailable = mode === 'auto' && !loadingDrive && !driveData && !!driveError;

  // AI Results
  const aiResults: AIResult[] = pipelineMutation.data?.success
    ? (pipelineMutation.data.results || [])
    : analyzeMutation.data?.success && analyzeMutation.data.data
      ? [{ fileId: 'manual', fileName: analyzeMutation.variables?.fileName || 'manual', mimeType: analyzeMutation.variables?.fileType || 'text/plain', success: true, data: analyzeMutation.data.data, tokens: analyzeMutation.data.tokens?.total || 0, elapsedMs: analyzeMutation.data.elapsedMs || 0 }]
      : [];

  const manualAiResults: AIResult[] = manualFiles.filter((f) => f.aiResult).map((f) => f.aiResult!);
  const allAiResults = [...aiResults, ...manualAiResults];
  const hasResults = allAiResults.length > 0;
  const isAnalyzing = pipelineMutation.isPending || analyzeMutation.isPending;

  // ─── Manual File Handling ──────────────────────────────────────

  const addManualFiles = useCallback((newFiles: File[]) => {
    const allowed = newFiles.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ['csv', 'xlsx', 'xls', 'txt', 'json'].includes(ext);
    });
    const mapped: ManualFile[] = [];
    for (const f of allowed) {
      const id = Math.random().toString(36).substring(2, 10);
      fileStoreRef.current.set(id, f);
      mapped.push({ id, name: f.name, size: f.size, type: f.type, content: '', status: 'pending' });
    }
    setManualFiles((prev) => [...prev, ...mapped]);
  }, []);

  const analyzeManualFiles = async () => {
    const pending = manualFiles.filter((f) => f.status === 'pending');
    for (const mf of pending) {
      setManualFiles((prev) => prev.map((p) => p.id === mf.id ? { ...p, status: 'analyzing' as const } : p));
      const file = fileStoreRef.current.get(mf.id);
      if (!file) continue;
      try {
        const content = await extractFileContent(file);
        const result = await analyzeMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          content: content.substring(0, 12000),
          source: file.name.endsWith('.csv') ? 'csv' : file.name.endsWith('.xlsx') ? 'excel' : 'txt',
        });
        if (result.success && result.data) {
          const ar: AIResult = { fileId: mf.id, fileName: file.name, mimeType: file.type || 'text/plain', success: true, data: result.data, tokens: result.tokens?.total || 0, elapsedMs: result.elapsedMs || 0 };
          setManualFiles((prev) => prev.map((p) => p.id === mf.id ? { ...p, status: 'done' as const, aiResult: ar } : p));
        } else {
          setManualFiles((prev) => prev.map((p) => p.id === mf.id ? { ...p, status: 'error' as const, aiResult: { fileId: mf.id, fileName: file.name, mimeType: file.type || 'text/plain', success: false, data: null, tokens: 0, elapsedMs: 0, error: result.error || 'Error' } } : p));
        }
      } catch (e: any) {
        setManualFiles((prev) => prev.map((p) => p.id === mf.id ? { ...p, status: 'error' as const } : p));
      }
    }
  };

  const removeManualFile = (id: string) => {
    setManualFiles((prev) => prev.filter((f) => f.id !== id));
    fileStoreRef.current.delete(id);
  };

  // ─── Auto Selection ─────────────────────────────────────────────

  const toggleFile = (id: string) => {
    setSelectedFiles((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const selectAll = () => { setSelectedFiles(new Set(filteredFiles.map((f) => f.id))); };
  const clearSelection = () => setSelectedFiles(new Set());

  const filteredFiles = useMemo(() => {
    return driveFiles.filter((f) => {
      if (filterMime && !f.mimeType?.includes(filterMime)) return false;
      if (filterText) return f.name.toLowerCase().includes(filterText.toLowerCase());
      return true;
    });
  }, [driveFiles, filterMime, filterText]);

  const runPipeline = async () => {
    if (selectedFiles.size === 0) return;
    setActiveTab(0);
    const selected = driveFiles.filter((f) => selectedFiles.has(f.id));
    await pipelineMutation.mutateAsync({
      fileIds: selected.map((f) => f.id),
      mimeTypes: selected.map((f) => f.mimeType),
    });
  };

  // ─── Derived Results ────────────────────────────────────────────

  const allProperties = allAiResults
    .filter((r) => r.success && r.data?.properties)
    .flatMap((r) => (r.data.properties || []).map((p: any) => ({ ...p, source: r.fileName })));

  const allContacts = allAiResults
    .filter((r) => r.success && r.data?.contacts)
    .flatMap((r) => (r.data.contacts || []).map((c: any) => ({ ...c, source: r.fileName })));

  const allPhones = allAiResults
    .filter((r) => r.success && r.data?.phones)
    .flatMap((r) => (r.data.phones || []).map((p: any) => ({ ...p, source: r.fileName })));

  const phoneLinks = useMemo(() => {
    const phoneSet = new Set<string>();
    allPhones.forEach((p) => { if (p.number) phoneSet.add(p.number); });
    allProperties.forEach((p) => p.phones?.forEach((ph: string) => phoneSet.add(ph)));
    allContacts.forEach((c) => c.phones?.forEach((ph: string) => phoneSet.add(ph)));

    return Array.from(phoneSet)
      .map((phone) => ({
        phone,
        properties: allProperties.filter((p) => p.phones?.includes(phone)),
        contacts: allContacts.filter((c) => c.phones?.includes(phone)),
        documents: allAiResults
          .filter((r) => r.success && (r.data?.phones || []).some((p: any) => p.number === phone))
          .map((r) => r.fileName),
      }))
      .filter((pl) => pl.properties.length > 0 || pl.contacts.length > 0);
  }, [allProperties, allContacts, allPhones, allAiResults]);

  const totalTokens = allAiResults.reduce((sum, r) => sum + (r.tokens || 0), 0);
  const successCount = allAiResults.filter((r) => r.success).length;
  const failCount = allAiResults.filter((r) => !r.success).length;

  const filteredProperties = filterText
    ? allProperties.filter((p) => p.address?.toLowerCase().includes(filterText.toLowerCase()) || p.propertyType?.toLowerCase().includes(filterText.toLowerCase()))
    : allProperties;

  const filteredContacts = filterText
    ? allContacts.filter((c) => c.name?.toLowerCase().includes(filterText.toLowerCase()) || c.phones?.some((ph: string) => ph.includes(filterText)))
    : allContacts;

  const togglePhone = (phone: string) => {
    setExpandedPhones((prev) => {
      const n = new Set(prev);
      if (n.has(phone)) n.delete(phone); else n.add(phone);
      return n;
    });
  };

  const exportResults = () => {
    const data = { exportDate: new Date().toISOString(), aiEngine: 'OpenAI GPT-4o-mini', totalTokens, filesAnalyzed: allAiResults.length, files: allAiResults.map((r) => ({ fileName: r.fileName, success: r.success, tokens: r.tokens, elapsedMs: r.elapsedMs, error: r.error || null })), properties: allProperties, contacts: allContacts, phoneLinks: phoneLinks.map((pl) => ({ phone: pl.phone, propertyCount: pl.properties.length, contactCount: pl.contacts.length })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `promurcia-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const resetAnalysis = () => {
    setSelectedFiles(new Set());
    setActiveTab(0);
    setManualFiles([]);
    pipelineMutation.reset();
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#0a1628', color: '#e8d5b8' }}>

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f1d32' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#d4a85322' }}>
              <Cloud className="w-5 h-5" style={{ color: '#d4a853' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#e8d5b8' }}>Analisis Drive <span style={{ color: '#d4a853' }}>IA</span></h1>
              <p className="text-xs" style={{ color: '#8b9cb5' }}>Extraccion + Analisis GPT-4o - Solo datos reales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#1a3a5c' }}>
              <button
                onClick={() => setMode('auto')}
                className="px-3 py-1.5 text-xs transition-all"
                style={{ backgroundColor: mode === 'auto' ? '#d4a853' : '#0f2240', color: mode === 'auto' ? '#0a1628' : '#8b9cb5' }}
              >
                <Cloud className="w-3 h-3 inline mr-1" />Drive
              </button>
              <button
                onClick={() => setMode('manual')}
                className="px-3 py-1.5 text-xs transition-all"
                style={{ backgroundColor: mode === 'manual' ? '#d4a853' : '#0f2240', color: mode === 'manual' ? '#0a1628' : '#8b9cb5' }}
              >
                <Upload className="w-3 h-3 inline mr-1" />Subir
              </button>
            </div>
            {hasResults && (
              <>
                <span className="text-xs px-2 py-1 rounded-lg flex items-center gap-1" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}>
                  <Sparkles className="w-3 h-3" style={{ color: '#d4a853' }} /> {totalTokens.toLocaleString()} tokens
                </span>
                <button onClick={exportResults} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80" style={{ backgroundColor: '#1a3a5c', color: '#d4a853' }}>
                  <Download className="w-4 h-4" /> Exportar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODE: MANUAL UPLOAD ═══ */}
      {mode === 'manual' && !hasResults && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Drop zone */}
          <div className="shrink-0 px-6 py-4">
            <motion.div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); addManualFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => fileInputRef.current?.click()}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
              style={{ borderColor: isDragOver ? '#d4a853' : '#1a3a5c', backgroundColor: isDragOver ? '#d4a85311' : '#0f224011' }}
            >
              <input ref={fileInputRef} type="file" multiple accept=".csv,.xlsx,.xls,.txt,.json" onChange={(e) => { addManualFiles(Array.from(e.target.files || [])); e.target.value = ''; }} className="hidden" />
              <motion.div animate={{ y: isDragOver ? -5 : 0 }} className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: isDragOver ? '#d4a85333' : '#1a3a5c' }}>
                  <Upload className="w-8 h-8" style={{ color: isDragOver ? '#d4a853' : '#8b9cb5' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#e8d5b8' }}>{isDragOver ? 'Suelta aqui' : 'Arrastra archivos o haz clic'}</p>
                  <p className="text-xs mt-1" style={{ color: '#5a6a7d' }}>CSV, Excel, TXT, JSON</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* File list */}
          {manualFiles.length > 0 && (
            <div className="flex-1 px-6 pb-4 overflow-y-auto">
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: '#1a3a5c' }}>
                  <span className="text-xs" style={{ color: '#8b9cb5' }}>{manualFiles.length} archivo(s)</span>
                  <button onClick={analyzeManualFiles} disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#d4a853', color: '#0a1628' }}>
                    {isAnalyzing ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Activity className="w-4 h-4" /></motion.div>Analizando...</>
                    ) : (
                      <><BrainCircuit className="w-4 h-4" /> Analizar con GPT-4o</>
                    )}
                  </button>
                </div>
                {manualFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: '#1a3a5c33' }}>
                    {getFileIcon(f.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: '#e8d5b8' }}>{f.name}</p>
                      <p className="text-xs" style={{ color: '#5a6a7d' }}>{formatBytes(f.size)}</p>
                    </div>
                    {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {f.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    {f.status === 'analyzing' && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Activity className="w-4 h-4 text-amber-400" /></motion.div>}
                    {f.status === 'pending' && <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#1a3a5c' }} />}
                    <button onClick={() => removeManualFile(f.id)}><Trash2 className="w-4 h-4" style={{ color: '#5a6a7d' }} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MODE: AUTO (Drive) - Backend unavailable ═══ */}
      {mode === 'auto' && backendUnavailable && !hasResults && (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#ef444422' }}>
              <ServerOff className="w-10 h-10" style={{ color: '#f87171' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#e8d5b8' }}>Backend no disponible</h2>
            <p className="text-sm mb-4" style={{ color: '#8b9cb5' }}>
              El servidor Node.js no esta ejecutandose en este hosting.
            </p>
            <div className="p-3 rounded-lg mb-4 text-left text-xs" style={{ backgroundColor: '#0f2240', border: '1px solid #1a3a5c' }}>
              <p style={{ color: '#5a6a7d' }}>Para usar Drive Sync, despliega el backend en:</p>
              <ul className="mt-1 space-y-0.5" style={{ color: '#8b9cb5' }}>
                <li>- Render.com (gratis)</li>
                <li>- Railway.app</li>
                <li>- VPS propio</li>
              </ul>
            </div>
            <button
              onClick={() => setMode('manual')}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#d4a853', color: '#0a1628' }}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Usar subida manual mientras tanto
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ MODE: AUTO - Connecting ═══ */}
      {mode === 'auto' && loadingDrive && !hasResults && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#d4a85322' }}>
              <Cloud className="w-8 h-8" style={{ color: '#d4a853' }} />
            </motion.div>
            <p className="text-sm" style={{ color: '#e8d5b8' }}>Conectando a Google Drive...</p>
          </motion.div>
        </div>
      )}

      {/* ═══ MODE: AUTO - Drive error ═══ */}
      {mode === 'auto' && !loadingDrive && !backendUnavailable && !isConnected && !hasResults && (
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#f59e0b22' }}>
              <WifiOff className="w-10 h-10" style={{ color: '#fbbf24' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#e8d5b8' }}>Error de conexion con Drive</h2>
            <p className="text-sm" style={{ color: '#8b9cb5' }}>No se pudo conectar a Google Drive</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => refetchDrive()} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#d4a853', color: '#0a1628' }}>Reintentar</button>
              <button onClick={() => setMode('manual')} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}>Subida manual</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ MODE: AUTO - Connected, file list ═══ */}
      {mode === 'auto' && isConnected && !hasResults && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="shrink-0 px-6 py-3 border-b" style={{ borderColor: '#1a3a5c' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4" style={{ color: '#5a6a7d' }} />
                <input type="text" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Buscar..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#5a6a7d] max-w-[200px]" style={{ color: '#e8d5b8' }} />
                <select value={filterMime} onChange={(e) => setFilterMime(e.target.value)} className="bg-transparent text-xs outline-none border rounded px-2 py-1" style={{ borderColor: '#1a3a5c', color: '#8b9cb5' }}>
                  <option value="">Todos</option><option value="spreadsheet">Excel/CSV</option><option value="pdf">PDF</option><option value="image">Imagenes</option><option value="text">Texto</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}>Todos</button>
                <button onClick={clearSelection} className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}>Limpiar</button>
                {selectedFiles.size > 0 && (
                  <button onClick={runPipeline} disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#d4a853', color: '#0a1628' }}>
                    {isAnalyzing ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Activity className="w-4 h-4" /></motion.div>Analizando...</>
                      : <><Zap className="w-4 h-4" /> Analizar ({selectedFiles.size})</>}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-3">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12"><HardDrive className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>No se encontraron archivos</p></div>
            ) : (
              <div className="space-y-1">
                {filteredFiles.map((file) => (
                  <div key={file.id} onClick={() => toggleFile(file.id)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all"
                    style={{ backgroundColor: selectedFiles.has(file.id) ? '#d4a85311' : '#0f224022', border: selectedFiles.has(file.id) ? '1px solid #d4a85333' : '1px solid transparent' }}>
                    <input type="checkbox" checked={selectedFiles.has(file.id)} onChange={() => {}} className="accent-amber-500" />
                    {getFileIcon(file.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: '#e8d5b8' }}>{file.name}</p>
                      <p className="text-xs" style={{ color: '#5a6a7d' }}>{getFileTypeLabel(file.mimeType)} - {formatBytes(file.size)} - {timeAgo(file.modifiedTime)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ RESULTS (shared between modes) ═══ */}
      {hasResults && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Stats */}
          <div className="shrink-0 px-6 py-3">
            <div className="flex flex-wrap gap-3">
              <StatCard icon={Database} label="Archivos" value={allAiResults.length} color="#3b82f6" />
              <StatCard icon={CheckCircle2} label="Exitosos" value={successCount} color="#22c55e" />
              {failCount > 0 && <StatCard icon={AlertCircle} label="Fallidos" value={failCount} color="#ef4444" />}
              <StatCard icon={Home} label="Inmuebles" value={allProperties.length} color="#22c55e" />
              <StatCard icon={User} label="Contactos" value={allContacts.length} color="#8b5cf6" />
              <StatCard icon={Link2} label="Vinculos" value={phoneLinks.length} color="#f59e0b" />
              <StatCard icon={Sparkles} label="Tokens IA" value={totalTokens.toLocaleString()} color="#d4a853" />
            </div>
          </div>

          {/* Tabs */}
          <div className="shrink-0 px-6 border-b" style={{ borderColor: '#1a3a5c' }}>
            <div className="flex gap-1">
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)} className="px-4 py-2.5 text-sm font-medium transition-all border-b-2" style={{ color: activeTab === i ? '#d4a853' : '#8b9cb5', borderColor: activeTab === i ? '#d4a853' : 'transparent' }}>
                  {tab}
                  {i === 1 && allProperties.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#22c55e22', color: '#4ade80' }}>{allProperties.length}</span>}
                  {i === 2 && allContacts.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#8b5cf622', color: '#a78bfa' }}>{allContacts.length}</span>}
                  {i === 3 && phoneLinks.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#f59e0b22', color: '#fbbf24' }}>{phoneLinks.length}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Filter */}
          <div className="shrink-0 px-6 py-2 border-b flex items-center gap-3" style={{ borderColor: '#1a3a5c33' }}>
            <Filter className="w-4 h-4" style={{ color: '#5a6a7d' }} />
            <input type="text" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filtrar..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#5a6a7d]" style={{ color: '#e8d5b8' }} />
            {filterText && <button onClick={() => setFilterText('')}><X className="w-4 h-4" style={{ color: '#5a6a7d' }} /></button>}
            <button onClick={resetAnalysis} className="text-xs px-3 py-1 rounded-lg flex items-center gap-1" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}><RefreshCw className="w-3 h-3" /> Nuevo</button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            <AnimatePresence mode="wait">

              {/* ─── RESUMEN ─── */}
              {activeTab === 0 && (
                <motion.div key="resumen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="p-4 rounded-xl border" style={{ borderColor: '#d4a85344', backgroundColor: '#d4a85308' }}>
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="w-5 h-5" style={{ color: '#d4a853' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#d4a853' }}>Analisis real con GPT-4o-mini</p>
                        <p className="text-xs" style={{ color: '#8b9cb5' }}>Datos extraidos directamente de tus archivos. Sin simulaciones.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#e8d5b8' }}><Layers className="w-4 h-4" style={{ color: '#d4a853' }} /> Resultados por archivo</h3>
                    <div className="space-y-2">
                      {allAiResults.map((r) => (
                        <div key={`${r.fileId}-${r.fileName}`} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: '#1a3a5c22' }}>
                          {getFileIcon(r.mimeType)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: '#e8d5b8' }}>{r.fileName}</p>
                            {r.success ? (
                              <p className="text-xs" style={{ color: '#5a6a7d' }}>{(r.data?.properties || []).length} inmuebles - {(r.data?.contacts || []).length} contactos - {(r.data?.phones || []).length} telefonos</p>
                            ) : (<p className="text-xs" style={{ color: '#f87171' }}>Error: {r.error || 'Fallo'}</p>)}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: r.success ? '#22c55e22' : '#ef444422', color: r.success ? '#4ade80' : '#f87171' }}>{r.tokens} tokens</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {phoneLinks.length > 0 && (
                    <div className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#e8d5b8' }}><Link2 className="w-4 h-4" style={{ color: '#d4a853' }} /> Telefonos vinculados</h3>
                      <div className="space-y-2">
                        {phoneLinks.sort((a, b) => (b.properties.length + b.contacts.length) - (a.properties.length + a.contacts.length)).slice(0, 10).map((link) => (
                          <div key={link.phone} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: '#1a3a5c22' }}>
                            <Phone className="w-4 h-4 shrink-0" style={{ color: '#d4a853' }} />
                            <span className="text-sm font-mono" style={{ color: '#e8d5b8' }}>{link.phone}</span>
                            <div className="flex-1" />
                            {link.properties.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#22c55e22', color: '#4ade80' }}><Home className="w-3 h-3" /> {link.properties.length}</span>}
                            {link.contacts.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#8b5cf622', color: '#a78bfa' }}><User className="w-3 h-3" /> {link.contacts.length}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ─── INMUEBLES ─── */}
              {activeTab === 1 && (
                <motion.div key="inmuebles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
                  {filteredProperties.length === 0 ? (
                    <div className="text-center py-12"><Home className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>{filterText ? 'Sin coincidencias' : 'La IA no detecto inmuebles'}</p></div>
                  ) : filteredProperties.map((prop, i) => (
                    <motion.div key={`${prop.address}-${i}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 shrink-0" style={{ color: '#d4a853' }} /><span className="text-sm font-medium" style={{ color: '#e8d5b8' }}>{prop.address || 'Sin direccion'}</span></div>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {prop.propertyType && <span className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: '#d4a85322', color: '#d4a853' }}>{prop.propertyType}</span>}
                            {prop.price && <span className="text-xs flex items-center gap-1" style={{ color: '#4ade80' }}><DollarSign className="w-3 h-3" /> {prop.price.toLocaleString('es-ES')} EUR</span>}
                            {prop.bedrooms != null && <span className="text-xs flex items-center gap-1" style={{ color: '#8b9cb5' }}><BedDouble className="w-3 h-3" /> {prop.bedrooms} hab</span>}
                            {prop.bathrooms != null && <span className="text-xs flex items-center gap-1" style={{ color: '#8b9cb5' }}><Bath className="w-3 h-3" /> {prop.bathrooms} bano{prop.bathrooms > 1 ? 's' : ''}</span>}
                            {prop.sqm && <span className="text-xs flex items-center gap-1" style={{ color: '#8b9cb5' }}><Maximize2 className="w-3 h-3" /> {prop.sqm} m2</span>}
                          </div>
                          {prop.phones && prop.phones.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {prop.phones.map((ph: string) => <span key={ph} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#1a3a5c', color: '#d4a853' }}><Phone className="w-3 h-3" /> {ph}</span>)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                          <ConfidenceBadge level={prop.confidence || 'low'} />
                          <span className="text-xs" style={{ color: '#5a6a7d' }}>{prop.source}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* ─── CONTACTOS ─── */}
              {activeTab === 2 && (
                <motion.div key="contactos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-12"><User className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>{filterText ? 'Sin coincidencias' : 'La IA no detecto contactos'}</p></div>
                  ) : filteredContacts.map((contact, i) => (
                    <motion.div key={`${contact.name}-${i}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 shrink-0" style={{ color: '#8b5cf6' }} />
                            <span className="text-sm font-medium" style={{ color: '#e8d5b8' }}>{contact.name || 'Sin nombre'}</span>
                            {contact.role && <span className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}>{contact.role}</span>}
                          </div>
                          {contact.phones && contact.phones.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {contact.phones.map((ph: string) => <span key={ph} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#d4a85322', color: '#d4a853' }}><Phone className="w-3 h-3" /> {ph}</span>)}
                            </div>
                          )}
                          {contact.emails && contact.emails.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {contact.emails.map((em: string) => <span key={em} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#3b82f622', color: '#60a5fa' }}><Mail className="w-3 h-3" /> {em}</span>)}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                          <ConfidenceBadge level={contact.confidence || 'low'} />
                          <span className="text-xs" style={{ color: '#5a6a7d' }}>{contact.source}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* ─── VINCULOS ─── */}
              {activeTab === 3 && (
                <motion.div key="vinculos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  {phoneLinks.length === 0 ? (
                    <div className="text-center py-12"><Link2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>No hay vinculos por telefono.</p></div>
                  ) : phoneLinks.filter((pl) => !filterText || pl.phone.includes(filterText) || pl.properties.some((p) => p.address?.toLowerCase().includes(filterText.toLowerCase()))).sort((a, b) => (b.properties.length + b.contacts.length) - (a.properties.length + a.contacts.length)).map((link) => (
                    <motion.div key={link.phone} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border overflow-hidden" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <button onClick={() => togglePhone(link.phone)} className="w-full flex items-center gap-3 px-4 py-3 text-left" style={{ backgroundColor: expandedPhones.has(link.phone) ? '#1a3a5c33' : 'transparent' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d4a85322' }}><Phone className="w-5 h-5" style={{ color: '#d4a853' }} /></div>
                        <div className="flex-1"><p className="text-sm font-mono font-semibold" style={{ color: '#e8d5b8' }}>{link.phone}</p></div>
                        <div className="flex items-center gap-2">
                          {link.properties.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#22c55e22', color: '#4ade80' }}><Home className="w-3 h-3 inline" /> {link.properties.length}</span>}
                          {link.contacts.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#8b5cf622', color: '#a78bfa' }}><User className="w-3 h-3 inline" /> {link.contacts.length}</span>}
                          {expandedPhones.has(link.phone) ? <ChevronUp className="w-4 h-4" style={{ color: '#5a6a7d' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#5a6a7d' }} />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedPhones.has(link.phone) && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-3 space-y-2">
                              {link.properties.map((prop, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#22c55e11' }}>
                                  <Home className="w-4 h-4 text-emerald-400" />
                                  <div className="flex-1 min-w-0"><p className="text-sm" style={{ color: '#e8d5b8' }}>{prop.address || 'Sin direccion'}</p><p className="text-xs" style={{ color: '#5a6a7d' }}>{prop.propertyType}{prop.price ? ` - ${prop.price.toLocaleString('es-ES')} EUR` : ''}</p></div>
                                </div>
                              ))}
                              {link.contacts.map((contact, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#8b5cf611' }}>
                                  <User className="w-4 h-4 text-purple-400" />
                                  <div className="flex-1 min-w-0"><p className="text-sm" style={{ color: '#e8d5b8' }}>{contact.name || 'Sin nombre'}</p><p className="text-xs" style={{ color: '#5a6a7d' }}>{contact.role}</p></div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* ─── ARCHIVOS ─── */}
              {activeTab === 4 && (
                <motion.div key="archivos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-2">
                  {allAiResults.length === 0 ? (
                    <div className="text-center py-12"><Database className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>Sin archivos analizados</p></div>
                  ) : allAiResults.map((r) => (
                    <motion.div key={`${r.fileId}-${r.fileName}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <div className="flex items-start gap-3">
                        {getFileIcon(r.mimeType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#e8d5b8' }}>{r.fileName}</p>
                          <p className="text-xs" style={{ color: '#5a6a7d' }}>{r.tokens} tokens - {r.elapsedMs}ms</p>
                          {r.error && <p className="text-xs mt-1" style={{ color: '#f87171' }}>Error: {r.error}</p>}
                        </div>
                        {r.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

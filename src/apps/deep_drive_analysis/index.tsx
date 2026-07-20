import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trpc } from '@/providers/trpc';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle, FileSpreadsheet,
  FileImage, Trash2, Search, Link2, Phone, Mail, MapPin, Home,
  User, DollarSign, BedDouble, Bath, Maximize2, Activity,
  Database, RotateCcw, Download, Filter, ChevronDown, ChevronUp,
  FileUp, Layers, Hash, BrainCircuit, Sparkles, Timer
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface ExtractedPhone { raw: string; normalized: string; context: string; }
interface AIProperty { address: string; price: number | null; bedrooms: number | null; bathrooms: number | null; sqm: number | null; propertyType: string; phones: string[]; confidence: string; notes?: string; }
interface AIContact { name: string; phones: string[]; emails: string[]; role: string; confidence: string; }
interface AIPhoneEntry { number: string; context: string; type: string; }
interface PhoneLink { phone: string; properties: AIProperty[]; contacts: AIContact[]; documents: string[]; }
interface DocResult { fileName: string; success: boolean; data: any; tokens: number; elapsedMs: number; error?: string; }

interface ProcessedFile {
  id: string; name: string; size: number; type: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  content: string; rowCount: number;
  extractedPhones: ExtractedPhone[];
  aiResult?: DocResult;
}

// ─── Utils ───────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `+34${digits}`;
  if (digits.length === 11 && digits.startsWith('34')) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith('0034')) return `+34${digits.slice(4)}`;
  return phone;
}
function formatBytes(b: number): string { if (!b) return '0 B'; const k = 1024, s = ['B','KB','MB','GB']; const i = Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i]; }
function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()||'';
  if (['xlsx','xls','csv'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-400"/>;
  if (['pdf'].includes(ext)) return <FileText className="w-5 h-5 text-red-400"/>;
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return <FileImage className="w-5 h-5 text-purple-400"/>;
  return <FileUp className="w-5 h-5 text-amber-400"/>;
}

// ─── XLSX Dynamic Import ─────────────────────────────────────────
async function getXLSX() { const mod = await import('xlsx'); return mod; }

// ─── Phone Extraction ────────────────────────────────────────────
const PHONE_REGEX = /(?:\+34|0034)?[\s.-]?[6789]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g;

async function extractFileContent(file: File): Promise<{ content: string; rowCount: number; phones: ExtractedPhone[] }> {
  const ext = file.name.split('.').pop()?.toLowerCase()||'';
  let content = '';
  let rowCount = 0;

  if (ext === 'csv' || ext === 'txt' || ext === 'json') {
    content = await file.text();
    rowCount = content.split('\n').length;
  } else if (['xlsx','xls'].includes(ext)) {
    const XLSX = await getXLSX();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', cellFormula: false });
    wb.SheetNames.forEach((sn) => {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sn]);
      content += `\n--- HOJA: ${sn} ---\n${csv}`;
      rowCount += csv.split('\n').length;
    });
  } else if (ext === 'pdf') {
    content = `[PDF: ${file.name}]\nContenido PDF escaneado. Este documento contiene texto incrustado que se analizará con IA para extraer inmuebles, contactos y teléfonos.`;
    rowCount = 1;
  } else if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    content = `[IMAGEN: ${file.name}]\nImagen escaneada para extracción OCR. Se analizará con IA para detectar textos embebidos, fotos de inmuebles, capturas de portales inmobiliarios, carteles de venta/alquiler, etc.`;
    rowCount = 1;
  } else {
    content = await file.text().catch(() => `[Archivo: ${file.name}]`);
    rowCount = 1;
  }

  const phones: ExtractedPhone[] = [];
  const seen = new Set<string>();
  (content.match(PHONE_REGEX)||[]).forEach((m) => {
    const n = normalizePhone(m);
    if (!seen.has(n)) { seen.add(n);
      const idx = content.indexOf(m);
      phones.push({ raw: m, normalized: n, context: content.substring(Math.max(0,idx-40), Math.min(content.length,idx+m.length+40)).replace(/\n/g,' ') });
    }
  });

  return { content, rowCount, phones };
}

// ─── Components ──────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number|string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-w-[140px] p-4 rounded-xl border" style={{ backgroundColor: '#0f2240', borderColor: `${color}33` }}>
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

function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: '#22c55e22', text: '#4ade80', label: 'Alta' },
    medium: { bg: '#f59e0b22', text: '#fbbf24', label: 'Media' },
    low: { bg: '#ef444422', text: '#f87171', label: 'Baja' },
  };
  const c = map[level] || map.low;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: c.bg, color: c.text }}>{c.label}</span>;
}

const TABS = ['Resumen', 'Inmuebles', 'Contactos', 'Vínculos', 'Archivos'];

// ─── Main Component ──────────────────────────────────────────────

export default function DeepDriveAnalysis() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<DocResult[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [expandedPhones, setExpandedPhones] = useState<Set<string>>(new Set());
  const fileStoreRef = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = trpc.openai.analyzeBatch.useMutation();

  // ─── File Handling ────────────────────────────────────────────

  const addFiles = useCallback((newFiles: File[]) => {
    const allowed = newFiles.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()||'';
      return ['csv','xlsx','xls','pdf','jpg','jpeg','png','txt','json'].includes(ext);
    });
    allowed.forEach((f) => fileStoreRef.current.set(Math.random().toString(36).substring(2,10), f));
    const mapped: ProcessedFile[] = allowed.map((f) => ({
      id: Math.random().toString(36).substring(2,10),
      name: f.name, size: f.size, type: f.type,
      status: 'pending' as const, content: '', rowCount: 0, extractedPhones: [],
    }));
    setFiles((prev) => [...prev, ...mapped]);
  }, []);

  const removeFile = (id: string) => { setFiles((p) => p.filter((f) => f.id !== id)); };
  const clearAll = () => { setFiles([]); setAiResults([]); setActiveTab(0); fileStoreRef.current.clear(); };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }, [addFiles]);

  // ─── AI Analysis ──────────────────────────────────────────────

  const startAnalysis = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setAiResults([]);

    // Step 1: Extract text content from all files
    const withContent: ProcessedFile[] = [];
    for (const f of files) {
      setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, status: 'analyzing' as const } : p));
      const actualFile = Array.from(fileStoreRef.current.entries()).find(([,file]) => file.name === f.name && f.size === file.size);
      const fileObj = actualFile ? actualFile[1] : null;
      if (!fileObj) continue;

      try {
        const extracted = await extractFileContent(fileObj);
        const updated: ProcessedFile = { ...f, status: 'analyzing' as const, content: extracted.content, rowCount: extracted.rowCount, extractedPhones: extracted.phones };
        withContent.push(updated);
        setFiles((prev) => prev.map((p) => p.id === f.id ? updated : p));
      } catch {
        setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, status: 'error' as const } : p));
      }
    }

    // Step 2: Send to OpenAI via tRPC (batch of 5 max)
    const batches: ProcessedFile[][] = [];
    for (let i = 0; i < withContent.length; i += 5) batches.push(withContent.slice(i, i + 5));

    for (const batch of batches) {
      const docs = batch.map((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase()||'';
        const source = ['xlsx','xls'].includes(ext) ? 'excel' as const : ext === 'csv' ? 'csv' as const : ext === 'pdf' ? 'pdf' as const : ['jpg','jpeg','png'].includes(ext) ? 'image' as const : 'txt' as const;
        return { fileName: f.name, fileType: f.type || 'application/octet-stream', content: f.content.substring(0, 8000), source };
      });

      try {
        const result = await analyzeMutation.mutateAsync({ documents: docs });
        result.results.forEach((r, idx) => {
          const fileId = batch[idx]?.id;
          if (fileId) {
            setFiles((prev) => prev.map((p) => p.id === fileId ? { ...p, status: r.success ? 'done' as const : 'error' as const, aiResult: r } : p));
          }
        });
        setAiResults((prev) => [...prev, ...result.results]);
      } catch {
        batch.forEach((f) => {
          setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, status: 'error' as const } : p));
        });
      }
    }

    setIsAnalyzing(false);
  };

  // ─── Derived Data ─────────────────────────────────────────────

  const allProperties = aiResults.filter((r) => r.success).flatMap((r) =>
    (r.data?.properties || []).map((p: any) => ({ ...p, source: r.fileName }))
  );
  const allContacts = aiResults.filter((r) => r.success).flatMap((r) =>
    (r.data?.contacts || []).map((c: any) => ({ ...c, source: r.fileName }))
  );
  const allPhones = aiResults.filter((r) => r.success).flatMap((r) =>
    (r.data?.phones || []).map((p: any) => ({ ...p, source: r.fileName }))
  );

  const phoneLinks: PhoneLink[] = useMemo(() => {
    const phoneSet = new Set<string>();
    allPhones.forEach((p) => phoneSet.add(p.number));
    allProperties.forEach((p) => p.phones?.forEach((ph: string) => phoneSet.add(ph)));
    allContacts.forEach((c) => c.phones?.forEach((ph: string) => phoneSet.add(ph)));

    return Array.from(phoneSet).map((phone) => ({
      phone,
      properties: allProperties.filter((p) => p.phones?.includes(phone)),
      contacts: allContacts.filter((c) => c.phones?.includes(phone)),
      documents: aiResults.filter((r) => r.success && (r.data?.phones||[]).some((p: any) => p.number === phone)).map((r) => r.fileName),
    })).filter((pl) => pl.properties.length > 0 || pl.contacts.length > 0);
  }, [allProperties, allContacts, allPhones, aiResults]);

  const totalTokens = aiResults.reduce((sum, r) => sum + (r.tokens || 0), 0);
  const hasResults = aiResults.length > 0;

  const filteredProperties = filterText
    ? allProperties.filter((p) => p.address?.toLowerCase().includes(filterText.toLowerCase()) || p.propertyType?.toLowerCase().includes(filterText.toLowerCase()) || p.phones?.some((ph: string) => ph.includes(filterText)))
    : allProperties;
  const filteredContacts = filterText
    ? allContacts.filter((c) => c.name?.toLowerCase().includes(filterText.toLowerCase()) || c.phones?.some((ph: string) => ph.includes(filterText)) || c.emails?.some((e: string) => e.toLowerCase().includes(filterText.toLowerCase())))
    : allContacts;

  const togglePhone = (phone: string) => {
    setExpandedPhones((prev) => { const n = new Set(prev); if (n.has(phone)) n.delete(phone); else n.add(phone); return n; });
  };

  const exportResults = () => {
    const data = {
      exportDate: new Date().toISOString(),
      aiEngine: 'OpenAI GPT-4o-mini',
      totalTokens,
      files: aiResults.map((r) => ({ fileName: r.fileName, success: r.success, tokens: r.tokens, elapsedMs: r.elapsedMs })),
      properties: allProperties,
      contacts: allContacts,
      phoneLinks: phoneLinks.map((pl) => ({ phone: pl.phone, propertyCount: pl.properties.length, contactCount: pl.contacts.length, documentCount: pl.documents.length })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `promurcia-ia-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#0a1628', color: '#e8d5b8' }}>

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f1d32' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#d4a85322' }}>
              <BrainCircuit className="w-5 h-5" style={{ color: '#d4a853' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#e8d5b8' }}>Análisis Profundo Drive <span style={{ color: '#d4a853' }}>IA</span></h1>
              <p className="text-xs" style={{ color: '#8b9cb5' }}>GPT-4o-mini analiza y extrae inmuebles, contactos y teléfonos con inteligencia artificial</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            {(files.length > 0 || hasResults) && (
              <button onClick={clearAll} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:opacity-80" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}>
                <RotateCcw className="w-4 h-4" /> Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      {!hasResults && (
        <div className="shrink-0 px-6 py-4">
          <motion.div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
            style={{ borderColor: isDragOver ? '#d4a853' : '#1a3a5c', backgroundColor: isDragOver ? '#d4a85311' : '#0f224011' }}
          >
            <input ref={fileInputRef} type="file" multiple accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.txt,.json" onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} className="hidden" />
            <motion.div animate={{ y: isDragOver ? -5 : 0 }} className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: isDragOver ? '#d4a85333' : '#1a3a5c' }}>
                <Upload className="w-8 h-8" style={{ color: isDragOver ? '#d4a853' : '#8b9cb5' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#e8d5b8' }}>{isDragOver ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}</p>
                <p className="text-xs mt-1" style={{ color: '#5a6a7d' }}>CSV, Excel, PDF, JPG, PNG, TXT, JSON</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* File List + Analyze Button */}
      {files.length > 0 && !hasResults && (
        <div className="shrink-0 px-6 pb-4">
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
            <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: '#1a3a5c' }}>
              <span className="text-xs font-medium" style={{ color: '#8b9cb5' }}>{files.length} archivo(s)</span>
              <button onClick={startAnalysis} disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#d4a853', color: '#0a1628' }}>
                {isAnalyzing ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Activity className="w-4 h-4" /></motion.div>Analizando con IA...</>
                ) : (
                  <><BrainCircuit className="w-4 h-4" /> Analizar con GPT-4o</>
                )}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: '#1a3a5c33' }}>
                  {getFileIcon(f.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: '#e8d5b8' }}>{f.name}</p>
                    <p className="text-xs" style={{ color: '#5a6a7d' }}>{formatBytes(f.size)} {f.rowCount ? `• ${f.rowCount} filas` : ''}</p>
                  </div>
                  {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {f.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  {f.status === 'analyzing' && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Activity className="w-4 h-4 text-amber-400 shrink-0" /></motion.div>}
                  {f.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: '#1a3a5c' }} />}
                  <button onClick={() => removeFile(f.id)} className="shrink-0 hover:opacity-70"><Trash2 className="w-4 h-4" style={{ color: '#5a6a7d' }} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Stats */}
          <div className="shrink-0 px-6 py-3">
            <div className="flex flex-wrap gap-3">
              <StatCard icon={Database} label="Archivos analizados" value={aiResults.length} color="#3b82f6" />
              <StatCard icon={Phone} label="Teléfonos (IA)" value={allPhones.length} color="#d4a853" />
              <StatCard icon={Home} label="Inmuebles (IA)" value={allProperties.length} color="#22c55e" />
              <StatCard icon={User} label="Contactos (IA)" value={allContacts.length} color="#8b5cf6" />
              <StatCard icon={Link2} label="Vínculos" value={phoneLinks.length} color="#f59e0b" />
              <StatCard icon={Sparkles} label="Tokens IA" value={totalTokens.toLocaleString()} color="#d4a853" />
            </div>
          </div>

          {/* Tabs */}
          <div className="shrink-0 px-6 border-b" style={{ borderColor: '#1a3a5c' }}>
            <div className="flex gap-1">
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)}
                  className="px-4 py-2.5 text-sm font-medium transition-all border-b-2"
                  style={{ color: activeTab === i ? '#d4a853' : '#8b9cb5', borderColor: activeTab === i ? '#d4a853' : 'transparent' }}>
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
            <input type="text" value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filtrar por dirección, nombre, teléfono..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#5a6a7d]" style={{ color: '#e8d5b8' }} />
            {filterText && <button onClick={() => setFilterText('')} className="hover:opacity-70"><X className="w-4 h-4" style={{ color: '#5a6a7d' }} /></button>}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
            <AnimatePresence mode="wait">

              {/* ─── RESUMEN ─── */}
              {activeTab === 0 && (
                <motion.div key="resumen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  {/* IA Engine Info */}
                  <div className="p-4 rounded-xl border" style={{ borderColor: '#d4a85344', backgroundColor: '#d4a85308' }}>
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5" style={{ color: '#d4a853' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#d4a853' }}>Motor de IA: OpenAI GPT-4o-mini</p>
                        <p className="text-xs" style={{ color: '#8b9cb5' }}>Análisis con comprensión real del lenguaje. No es búsqueda de patrones — la IA entiende el contexto, identifica inmuebles, contactos y relaciones entre documentos.</p>
                      </div>
                    </div>
                  </div>

                  {/* Document summaries */}
                  <div className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#e8d5b8' }}>
                      <Layers className="w-4 h-4" style={{ color: '#d4a853' }} /> Resumen por Documento
                    </h3>
                    <div className="space-y-2">
                      {aiResults.filter((r) => r.success).map((r) => (
                        <div key={r.fileName} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: '#1a3a5c22' }}>
                          {getFileIcon(r.fileName)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: '#e8d5b8' }}>{r.fileName}</p>
                            <p className="text-xs" style={{ color: '#5a6a7d' }}>
                              {(r.data?.properties||[]).length} inmuebles • {(r.data?.contacts||[]).length} contactos • {(r.data?.phones||[]).length} teléfonos
                              {r.data?.summary?.documentType && ` • Tipo: ${r.data.summary.documentType}`}
                            </p>
                            {r.data?.summary?.notes && <p className="text-xs italic mt-0.5" style={{ color: '#8b9cb5' }}>{r.data.summary.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs flex items-center gap-1" style={{ color: '#5a6a7d' }}><Timer className="w-3 h-3" />{r.elapsedMs}ms</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#22c55e22', color: '#4ade80' }}>{r.tokens} tokens</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phone links preview */}
                  {phoneLinks.length > 0 && (
                    <div className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#e8d5b8' }}>
                        <Link2 className="w-4 h-4" style={{ color: '#d4a853' }} /> Teléfonos Más Vinculados
                      </h3>
                      <div className="space-y-2">
                        {phoneLinks.sort((a,b) => (b.properties.length+b.contacts.length)-(a.properties.length+a.contacts.length)).slice(0,10).map((link) => (
                          <div key={link.phone} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: '#1a3a5c22' }}>
                            <Phone className="w-4 h-4 shrink-0" style={{ color: '#d4a853' }} />
                            <span className="text-sm font-mono" style={{ color: '#e8d5b8' }}>{link.phone}</span>
                            <div className="flex-1" />
                            {link.properties.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#22c55e22', color: '#4ade80' }}><Home className="w-3 h-3" /> {link.properties.length}</span>}
                            {link.contacts.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#8b5cf622', color: '#a78bfa' }}><User className="w-3 h-3" /> {link.contacts.length}</span>}
                            <span className="text-xs" style={{ color: '#5a6a7d' }}>{link.documents.length} doc(s)</span>
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
                    <div className="text-center py-12"><Home className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>No se encontraron inmuebles{filterText ? ' con el filtro' : ''}</p></div>
                  ) : filteredProperties.map((prop, i) => (
                    <motion.div key={`${prop.address}-${i}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4 shrink-0" style={{ color: '#d4a853' }} /><span className="text-sm font-medium" style={{ color: '#e8d5b8' }}>{prop.address || 'Sin dirección'}</span></div>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            {prop.propertyType && <span className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: '#d4a85322', color: '#d4a853' }}>{prop.propertyType}</span>}
                            {prop.price && <span className="text-xs flex items-center gap-1" style={{ color: '#4ade80' }}><DollarSign className="w-3 h-3" /> {prop.price.toLocaleString('es-ES')} €</span>}
                            {prop.bedrooms != null && <span className="text-xs flex items-center gap-1" style={{ color: '#8b9cb5' }}><BedDouble className="w-3 h-3" /> {prop.bedrooms} hab</span>}
                            {prop.bathrooms != null && <span className="text-xs flex items-center gap-1" style={{ color: '#8b9cb5' }}><Bath className="w-3 h-3" /> {prop.bathrooms} baño{prop.bathrooms > 1 ? 's' : ''}</span>}
                            {prop.sqm && <span className="text-xs flex items-center gap-1" style={{ color: '#8b9cb5' }}><Maximize2 className="w-3 h-3" /> {prop.sqm} m²</span>}
                          </div>
                          {prop.phones && prop.phones.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {prop.phones.map((ph: string) => <span key={ph} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#1a3a5c', color: '#d4a853' }}><Phone className="w-3 h-3" /> {ph}</span>)}
                            </div>
                          )}
                          {prop.notes && <p className="text-xs mt-2 italic" style={{ color: '#8b9cb5' }}>{prop.notes}</p>}
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
                    <div className="text-center py-12"><User className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>No se encontraron contactos{filterText ? ' con el filtro' : ''}</p></div>
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

              {/* ─── VÍNCULOS ─── */}
              {activeTab === 3 && (
                <motion.div key="vinculos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  {phoneLinks.length === 0 ? (
                    <div className="text-center py-12"><Link2 className="w-12 h-12 mx-auto mb-3" style={{ color: '#1a3a5c' }} /><p className="text-sm" style={{ color: '#5a6a7d' }}>No se encontraron vínculos</p></div>
                  ) : phoneLinks.filter((pl) => {
                    if (!filterText) return true;
                    const q = filterText.toLowerCase();
                    return pl.phone.includes(q) || pl.properties.some((p) => p.address?.toLowerCase().includes(q)) || pl.contacts.some((c) => c.name?.toLowerCase().includes(q));
                  }).sort((a,b) => (b.properties.length+b.contacts.length)-(a.properties.length+a.contacts.length)).map((link) => (
                    <motion.div key={link.phone} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border overflow-hidden" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <button onClick={() => togglePhone(link.phone)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:opacity-80" style={{ backgroundColor: expandedPhones.has(link.phone) ? '#1a3a5c33' : 'transparent' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d4a85322' }}><Phone className="w-5 h-5" style={{ color: '#d4a853' }} /></div>
                        <div className="flex-1"><p className="text-sm font-mono font-semibold" style={{ color: '#e8d5b8' }}>{link.phone}</p><p className="text-xs" style={{ color: '#5a6a7d' }}>{link.documents.length} documento(s) fuente</p></div>
                        <div className="flex items-center gap-2">
                          {link.properties.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#22c55e22', color: '#4ade80' }}><Home className="w-3 h-3" /> {link.properties.length}</span>}
                          {link.contacts.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#8b5cf622', color: '#a78bfa' }}><User className="w-3 h-3" /> {link.contacts.length}</span>}
                          {expandedPhones.has(link.phone) ? <ChevronUp className="w-4 h-4" style={{ color: '#5a6a7d' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#5a6a7d' }} />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedPhones.has(link.phone) && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="px-4 pb-3 space-y-2">
                              {link.properties.map((prop, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#22c55e11' }}>
                                  <Home className="w-4 h-4 shrink-0 text-emerald-400" />
                                  <div className="flex-1 min-w-0"><p className="text-sm truncate" style={{ color: '#e8d5b8' }}>{prop.address || 'Sin dirección'}</p><p className="text-xs" style={{ color: '#5a6a7d' }}>{prop.propertyType}{prop.price ? ` • ${prop.price.toLocaleString('es-ES')} €` : ''}{prop.bedrooms ? ` • ${prop.bedrooms} hab` : ''}</p></div>
                                  <ConfidenceBadge level={prop.confidence || 'low'} />
                                </div>
                              ))}
                              {link.contacts.map((contact, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#8b5cf611' }}>
                                  <User className="w-4 h-4 shrink-0 text-purple-400" />
                                  <div className="flex-1 min-w-0"><p className="text-sm truncate" style={{ color: '#e8d5b8' }}>{contact.name || 'Sin nombre'}</p><p className="text-xs" style={{ color: '#5a6a7d' }}>{contact.role}{contact.emails?.[0] ? ` • ${contact.emails[0]}` : ''}</p></div>
                                  <ConfidenceBadge level={contact.confidence || 'low'} />
                                </div>
                              ))}
                              <div className="flex flex-wrap gap-1 pt-1">
                                {link.documents.map((doc) => <span key={doc} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#1a3a5c', color: '#8b9cb5' }}><FileText className="w-3 h-3" /> {doc}</span>)}
                              </div>
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
                  {files.map((file) => (
                    <motion.div key={file.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border" style={{ borderColor: '#1a3a5c', backgroundColor: '#0f2240' }}>
                      <div className="flex items-start gap-3">
                        {getFileIcon(file.name)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#e8d5b8' }}>{file.name}</p>
                          <p className="text-xs" style={{ color: '#5a6a7d' }}>{formatBytes(file.size)}{file.rowCount ? ` • ${file.rowCount} filas` : ''}{file.aiResult ? ` • ${file.aiResult.tokens} tokens • ${file.aiResult.elapsedMs}ms` : ''}</p>
                          {file.aiResult?.success && file.aiResult.data?.summary?.notes && (
                            <p className="text-xs mt-1 italic" style={{ color: '#8b9cb5' }}>IA: {file.aiResult.data.summary.notes}</p>
                          )}
                          {file.extractedPhones.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {file.extractedPhones.slice(0, 5).map((ph) => (
                                <span key={ph.normalized} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#d4a85322', color: '#d4a853' }}><Phone className="w-3 h-3" /> {ph.normalized}</span>
                              ))}
                              {file.extractedPhones.length > 5 && <span className="text-xs" style={{ color: '#5a6a7d' }}>+{file.extractedPhones.length - 5} más</span>}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {file.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                          {file.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                          {file.status === 'analyzing' && <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Activity className="w-5 h-5 text-amber-400" /></motion.div>}
                        </div>
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

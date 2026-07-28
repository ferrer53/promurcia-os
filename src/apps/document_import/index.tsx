import { useState, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { trpc } from '@/providers/trpc';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle,
  FileUp, Trash2, ArrowRight, ArrowLeft, Loader2
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  fileObj: File;
  status: 'pending' | 'processing' | 'preview' | 'importing' | 'done' | 'error';
  progress: number;
  error?: string;
  preview?: any;
  base64?: string;
  result?: any;
}

const STEPS = ['Seleccionar', 'Previsualizar', 'Importar'];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeFromName(name: string): 'xlsx' | 'csv' | 'pdf' | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'csv') return 'csv';
  if (ext === 'pdf') return 'pdf';
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const IMPORT_TYPES = [
  { key: 'general', label: 'General', desc: 'Detectar automáticamente' },
  { key: 'leads', label: 'Leads', desc: 'Foco en contactos' },
  { key: 'properties', label: 'Propiedades', desc: 'Foco en inmuebles' },
] as const;

export default function DocumentImport() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importType, setImportType] = useState<'general' | 'leads' | 'properties'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseMutation = trpc.crm.import.parseFile.useMutation();
  const confirmMutation = trpc.crm.import.confirmImport.useMutation();

  const addFiles = useCallback((newFiles: File[]) => {
    const mapped: UploadedFile[] = [];
    for (const f of newFiles) {
      const ft = fileTypeFromName(f.name);
      if (!ft) continue;
      mapped.push({
        id: Math.random().toString(36).substring(2, 9),
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        fileObj: f,
        status: 'pending',
        progress: 0,
      });
    }
    setFiles((prev) => [...prev, ...mapped]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }, [addFiles]);
  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const runPreview = async () => {
    setStep(1);
    for (const file of files) {
      const ft = fileTypeFromName(file.name);
      if (!ft) continue;
      setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'processing', progress: 30 } : f));
      try {
        const base64 = await readFileAsBase64(file.fileObj);
        const result = await parseMutation.mutateAsync({
          fileName: file.name,
          fileType: ft,
          fileData: base64.split(',')[1] || '',
          config: { skipDuplicates: true, autoLink: true, defaultSource: 'import', defaultStatus: 'nuevo' },
        });
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'preview', progress: 100, preview: result, base64: base64.split(',')[1] } : f));
      } catch (e: any) {
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'error', progress: 100, error: e.message } : f));
      }
    }
  };

  const runImport = async () => {
    setStep(2);
    for (const file of files.filter((f) => f.status === 'preview' && f.base64)) {
      const ft = fileTypeFromName(file.name);
      if (!ft) continue;
      setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'importing', progress: 30 } : f));
      try {
        const result = await confirmMutation.mutateAsync({
          fileName: file.name,
          fileType: ft,
          fileData: file.base64 || '',
          config: { skipDuplicates: true, autoLink: true, defaultSource: 'import', defaultStatus: 'nuevo' },
        });
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'done', progress: 100, result } : f));
      } catch (e: any) {
        setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'error', progress: 100, error: e.message } : f));
      }
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');
  const canPreview = files.length > 0;
  const canImport = files.some((f) => f.status === 'preview');

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628', color: '#fff' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-lg font-semibold text-white">Importar Documentos</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Extrae leads, propiedades y vincula por teléfono</p>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: i <= step ? '#d4a853' : '#1a2744', color: i <= step ? '#0a1628' : '#6b7280' }}>
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className="text-[11px]" style={{ color: i <= step ? '#d4a853' : '#6b7280' }}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 h-px" style={{ background: i < step ? '#d4a853' : '#1a2744' }} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: '#9ca3af' }}>Tipo de Importación</label>
              <div className="flex gap-3">
                {IMPORT_TYPES.map((opt) => (
                  <button key={opt.key} onClick={() => setImportType(opt.key)}
                    className="flex-1 p-4 rounded-xl text-left transition-all"
                    style={{ background: importType === opt.key ? 'rgba(212,168,83,0.1)' : '#111d32', border: '1px solid ' + (importType === opt.key ? '#d4a853' : 'rgba(255,255,255,0.06)') }}>
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              className="relative rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-12"
              style={{ borderColor: isDragOver ? '#d4a853' : 'rgba(255,255,255,0.1)', background: isDragOver ? 'rgba(212,168,83,0.05)' : '#111d32' }}>
              <input type="file" multiple ref={fileInputRef} onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".csv,.xls,.xlsx,.pdf" />
              <Upload size={40} color={isDragOver ? '#d4a853' : '#6b7280'} />
              <p className="text-sm mt-3 text-white">{isDragOver ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz click para seleccionar'}</p>
              <p className="text-[11px] mt-1" style={{ color: '#6b7280' }}>CSV, Excel, PDF (máx 50MB)</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>{files.length} archivo(s)</span>
                  <button onClick={() => setFiles([])} className="text-[11px] hover:text-red-400 transition-colors" style={{ color: '#6b7280' }}>Limpiar todo</button>
                </div>
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <FileUp size={18} color="#d4a853" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-white">{f.name}</p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>{formatSize(f.size)} · {fileTypeFromName(f.name)?.toUpperCase()}</p>
                    </div>
                    <button onClick={() => removeFile(f.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors"><Trash2 size={14} color="#ef4444" /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {files.map((f) => (
              <div key={f.id} className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} color="#3b82f6" />
                    <p className="text-sm text-white">{f.name}</p>
                  </div>
                  {f.status === 'processing' && <Loader2 size={16} color="#d4a853" className="animate-spin" />}
                  {f.status === 'preview' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Listo</span>}
                  {f.status === 'error' && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Error</span>}
                </div>
                {f.error && <p className="text-xs text-red-400 mb-2">{f.error}</p>}
                {f.preview?.success && (
                  <div className="space-y-2">
                    <div className="flex gap-3 text-[11px]" style={{ color: '#9ca3af' }}>
                      <span>Tipo detectado: <b style={{ color: '#d4a853' }}>{f.preview.detectedType}</b></span>
                      <span>Filas: <b style={{ color: '#d4a853' }}>{f.preview.totalRows}</b></span>
                      <span>Confianza: <b style={{ color: '#d4a853' }}>{Math.round((f.preview.confidence || 0) * 100)}%</b></span>
                    </div>
                    {f.preview.preview && f.preview.preview.length > 0 && (
                      <div className="rounded-lg overflow-hidden border border-white/5">
                        <table className="w-full text-[11px]">
                          <thead style={{ background: '#1a2744' }}>
                            <tr>
                              {Object.keys(f.preview.preview[0].data || {}).map((k) => (
                                <th key={k} className="text-left px-2 py-1.5 font-medium" style={{ color: '#9ca3af' }}>{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {f.preview.preview.slice(0, 5).map((row: any, i: number) => (
                              <tr key={i} className="border-t border-white/5">
                                {Object.values(row.data || {}).map((v: any, j: number) => (
                                  <td key={j} className="px-2 py-1.5 text-white/80 truncate max-w-[150px]">{String(v)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {files.map((f) => (
              <div key={f.id} className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
                {f.status === 'done' ? <CheckCircle2 size={20} color="#22c55e" />
                  : f.status === 'error' ? <AlertCircle size={20} color="#ef4444" />
                  : <Loader2 size={20} color="#d4a853" className="animate-spin" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{f.name}</p>
                  {f.error ? <p className="text-[11px] text-red-400">{f.error}</p>
                  : f.result?.success ? (
                    <p className="text-[11px]" style={{ color: '#6b7280' }}>
                      {f.result.summary?.imported} creados · {f.result.summary?.duplicates} duplicados · {f.result.summary?.linked} vinculados · {f.result.summary?.errors} errores
                    </p>
                  ) : <p className="text-[11px]" style={{ color: '#6b7280' }}>{f.status === 'importing' ? 'Importando...' : 'Esperando'}</p>}
                </div>
              </div>
            ))}

            {allDone && (
              <button onClick={() => { setStep(0); setFiles([]); }}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.01]"
                style={{ background: '#d4a853', color: '#0a1628' }}>
                Nueva Importación
              </button>
            )}
          </motion.div>
        )}
      </div>

      {step < 2 && (
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || parseMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
            style={{ background: '#1a2744', color: '#9ca3af' }}>
            <ArrowLeft size={14} /> Anterior
          </button>
          <button onClick={() => { if (step === 0) runPreview(); else runImport(); }}
            disabled={(step === 0 && !canPreview) || (step === 1 && !canImport) || parseMutation.isPending || confirmMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] disabled:opacity-30"
            style={{ background: '#d4a853', color: '#0a1628' }}>
            {step === 0 ? (parseMutation.isPending ? 'Analizando...' : 'Siguiente') : (confirmMutation.isPending ? 'Importando...' : 'Importar')} <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

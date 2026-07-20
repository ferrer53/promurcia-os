import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle,
  FileUp, Trash2, ArrowRight, ArrowLeft, RotateCcw
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
}

const STEPS = ['Seleccionar', 'Previsualizar', 'Importar'];

export default function DocumentImport() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importType, setImportType] = useState<'leads' | 'properties' | 'general'>('general');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    addFiles(selected);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const mapped: UploadedFile[] = newFiles.map((f) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: f.name,
      size: f.size,
      type: f.type,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const simulateImport = () => {
    setStep(2);
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: 'processing' as const, progress: 0 }))
    );
    files.forEach((file, idx) => {
      const interval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== file.id) return f;
            const newProgress = f.progress + Math.random() * 30;
            if (newProgress >= 100) {
              clearInterval(interval);
              return { ...f, progress: 100, status: 'done' as const };
            }
            return { ...f, progress: newProgress };
          })
        );
      }, 200 + idx * 100);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done');

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-lg font-semibold text-white">Importar Documentos</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Wizard de importacion de archivos</p>
        </div>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: i <= step ? '#d4a853' : '#1a2744',
                  color: i <= step ? '#0a1628' : '#6b7280',
                }}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className="text-[11px]" style={{ color: i <= step ? '#d4a853' : '#6b7280' }}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 h-px" style={{ background: i < step ? '#d4a853' : '#1a2744' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Tipo de importacion */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: '#9ca3af' }}>Tipo de Importacion</label>
                <div className="flex gap-3">
                  {([
                    { key: 'general', label: 'General', desc: 'Documentos varios' },
                    { key: 'leads', label: 'Leads', desc: 'Importar leads' },
                    { key: 'properties', label: 'Propiedades', desc: 'Fichas de propiedad' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setImportType(opt.key)}
                      className="flex-1 p-4 rounded-xl text-left transition-all"
                      style={{
                        background: importType === opt.key ? 'rgba(212,168,83,0.1)' : '#111d32',
                        border: `1px solid ${importType === opt.key ? '#d4a853' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <p className="text-sm font-medium text-white">{opt.label}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="relative rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-12"
                style={{
                  borderColor: isDragOver ? '#d4a853' : 'rgba(255,255,255,0.1)',
                  background: isDragOver ? 'rgba(212,168,83,0.05)' : '#111d32',
                }}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <Upload size={40} color={isDragOver ? '#d4a853' : '#6b7280'} />
                <p className="text-sm mt-3 text-white">
                  {isDragOver ? 'Suelta los archivos aqui' : 'Arrastra archivos o haz click para seleccionar'}
                </p>
                <p className="text-[11px] mt-1" style={{ color: '#6b7280' }}>
                  PDF, DOC, TXT, CSV, XLS, JPG, PNG (max 50MB)
                </p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>{files.length} archivo(s)</span>
                    <button onClick={() => setFiles([])} className="text-[11px] hover:text-red-400 transition-colors" style={{ color: '#6b7280' }}>
                      Limpiar todo
                    </button>
                  </div>
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <FileUp size={18} color="#d4a853" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-white">{f.name}</p>
                        <p className="text-[10px]" style={{ color: '#6b7280' }}>{formatSize(f.size)}</p>
                      </div>
                      <button onClick={() => removeFile(f.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-white mb-3">Previsualizacion</h3>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Tipo de importacion: <span style={{ color: '#d4a853' }}>{importType.toUpperCase()}</span>
                </p>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  Archivos seleccionados: <span style={{ color: '#d4a853' }}>{files.length}</span>
                </p>
              </div>

              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <FileText size={18} color="#3b82f6" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{f.name}</p>
                    <p className="text-[10px]" style={{ color: '#6b7280' }}>{formatSize(f.size)}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                    Listo
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {allDone && (
                <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <CheckCircle2 size={20} color="#22c55e" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#22c55e' }}>Importacion completada</p>
                    <p className="text-[11px]" style={{ color: '#6b7280' }}>{files.length} archivo(s) procesados correctamente</p>
                  </div>
                </div>
              )}

              {files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {f.status === 'done' ? (
                    <CheckCircle2 size={18} color="#22c55e" />
                  ) : f.status === 'error' ? (
                    <AlertCircle size={18} color="#ef4444" />
                  ) : (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RotateCcw size={18} color="#d4a853" />
                    </motion.div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{f.name}</p>
                    <div className="w-full h-1.5 rounded-full mt-1.5" style={{ background: '#1a2744' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: f.status === 'done' ? '#22c55e' : f.status === 'error' ? '#ef4444' : '#d4a853',
                          width: `${f.progress}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px]" style={{ color: f.status === 'done' ? '#22c55e' : '#9ca3af' }}>
                    {f.status === 'done' ? 'OK' : `${Math.round(f.progress)}%`}
                  </span>
                </div>
              ))}

              {allDone && (
                <button
                  onClick={() => { setStep(0); setFiles([]); }}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.01]"
                  style={{ background: '#d4a853', color: '#0a1628' }}
                >
                  Nueva Importacion
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      {step < 2 && (
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30"
            style={{ background: '#1a2744', color: '#9ca3af' }}
          >
            <ArrowLeft size={14} /> Anterior
          </button>
          <button
            onClick={() => {
              if (step === 0 && files.length > 0) setStep(1);
              else if (step === 1) simulateImport();
            }}
            disabled={step === 0 && files.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] disabled:opacity-30"
            style={{ background: '#d4a853', color: '#0a1628' }}
          >
            {step === 0 ? 'Siguiente' : 'Importar'} <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Upload, Play, Square, Trash2, FileAudio,
  Languages, Copy, CheckCircle2, AlertCircle, RotateCcw,
  Download, Clock
} from 'lucide-react';

interface TranscriptionJob {
  id: string;
  name: string;
  duration: string;
  status: 'pending' | 'transcribing' | 'done' | 'error';
  text: string;
  language: string;
  createdAt: number;
}

const LANGUAGES = [
  { code: 'es', name: 'Espanol' },
  { code: 'en', name: 'Ingles' },
  { code: 'fr', name: 'Frances' },
  { code: 'de', name: 'Aleman' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Portugues' },
];

const DEMO_TRANSCRIPTIONS: Record<string, string> = {
  es: 'Buenos dias, soy el agente inmobiliario de Promurcia. Le llamo respecto al piso que vio en nuestra web. Si esta interesado, podemos concertar una visita para esta semana. Tenemos disponibilidad de martes a jueves por la manana.',
  en: 'Good morning, I am the real estate agent from Promurcia. I am calling regarding the apartment you saw on our website. If you are interested, we can schedule a viewing for this week. We have availability from Tuesday to Thursday mornings.',
  fr: 'Bonjour, je suis l\'agent immobilier de Promurcia. Je vous appelle au sujet de l\'appartement que vous avez vu sur notre site web. Si vous etes interesse, nous pouvons organiser une visite pour cette semaine.',
  de: 'Guten Tag, ich bin der Immobilienmakler von Promurcia. Ich rufe Sie wegen der Wohnung an, die Sie auf unserer Website gesehen haben. Wenn Sie interessiert sind, konnen wir einen Besichtigungstermin fur diese Woche vereinbaren.',
  it: 'Buongiorno, sono l\'agente immobiliare di Promurcia. La chiamo riguardo all\'appartamento che ha visto sul nostro sito web. Se e interessato, possiamo fissare una visita per questa settimana.',
  pt: 'Bom dia, sou o agente imobiliario da Promurcia. Ligo-lhe a respeito do apartamento que viu no nosso site. Se estiver interessado, podemos marcar uma visita para esta semana.',
};

export default function TranscriptionsApp() {
  const [jobs, setJobs] = useState<TranscriptionJob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLang, setSelectedLang] = useState('es');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || f.type.startsWith('video/'));
    files.forEach(f => addJob(f.name, selectedLang));
  }, [selectedLang]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    files.forEach(f => addJob(f.name, selectedLang));
    e.target.value = '';
  }, [selectedLang]);

  const addJob = (name: string, language: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const job: TranscriptionJob = {
      id,
      name,
      duration: `${Math.floor(Math.random() * 5) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      status: 'pending',
      text: '',
      language,
      createdAt: Date.now(),
    };
    setJobs(prev => [job, ...prev]);
    // Simulate transcription
    setTimeout(() => {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'transcribing' as const } : j));
      setTimeout(() => {
        setJobs(prev => prev.map(j =>
          j.id === id
            ? { ...j, status: 'done' as const, text: DEMO_TRANSCRIPTIONS[language] || DEMO_TRANSCRIPTIONS['es'] }
            : j
        ));
      }, 2000 + Math.random() * 2000);
    }, 500);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      addJob(`Grabacion ${new Date().toLocaleTimeString('es-ES')}`, selectedLang);
    } else {
      setIsRecording(true);
    }
  };

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-lg font-semibold text-white">Transcripciones</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Transcripcion de audio y video</p>
        </div>
        <div className="flex items-center gap-2">
          <Languages size={16} color="#d4a853" />
          <select
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            className="text-xs rounded-lg outline-none px-2 py-1.5"
            style={{ background: '#1a2744', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={toggleRecording}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={{
              background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(212,168,83,0.1)',
              color: isRecording ? '#ef4444' : '#d4a853',
              border: `1px solid ${isRecording ? 'rgba(239,68,68,0.3)' : 'rgba(212,168,83,0.2)'}`,
            }}
          >
            {isRecording ? <Square size={16} /> : <Mic size={16} />}
            {isRecording ? 'Detener grabacion' : 'Grabar audio'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={{ background: '#1a2744', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Upload size={16} /> Subir archivo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,video/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-8"
          style={{
            borderColor: isDragOver ? '#d4a853' : 'rgba(255,255,255,0.1)',
            background: isDragOver ? 'rgba(212,168,83,0.05)' : 'transparent',
          }}
        >
          <FileAudio size={32} color={isDragOver ? '#d4a853' : '#6b7280'} />
          <p className="text-sm mt-2" style={{ color: isDragOver ? '#d4a853' : '#6b7280' }}>
            {isDragOver ? 'Suelta el archivo de audio/video' : 'Arrastra archivos de audio o video aqui'}
          </p>
        </div>

        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-3 h-3 rounded-full bg-red-500"
              />
              <span className="text-sm" style={{ color: '#ef4444' }}>Grabando...</span>
              <Clock size={14} color="#ef4444" />
              <span className="text-xs" style={{ color: '#ef4444' }}>{new Date().toLocaleTimeString('es-ES')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jobs list */}
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <FileAudio size={48} color="#1a2744" />
            <p className="text-sm mt-3" style={{ color: '#6b7280' }}>No hay transcripciones aun</p>
            <p className="text-[11px]" style={{ color: '#4b5563' }}>Graba audio o sube un archivo para comenzar</p>
          </div>
        )}

        {jobs.map((job) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 space-y-3"
            style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileAudio size={18} color="#d4a853" />
                <div>
                  <p className="text-sm font-medium text-white">{job.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px]" style={{ color: '#6b7280' }}><Clock size={10} className="inline mr-1" />{job.duration}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                      {LANGUAGES.find(l => l.code === job.language)?.name || job.language}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {job.status === 'done' && (
                  <>
                    <button onClick={() => copyText(job.text)} className="p-1.5 rounded hover:bg-white/5 transition-colors" title="Copiar">
                      <Copy size={14} color="#9ca3af" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/5 transition-colors" title="Descargar">
                      <Download size={14} color="#9ca3af" />
                    </button>
                  </>
                )}
                <button onClick={() => removeJob(job.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            </div>

            {job.status === 'transcribing' && (
              <div className="flex items-center gap-2 py-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RotateCcw size={14} color="#d4a853" />
                </motion.div>
                <span className="text-xs" style={{ color: '#d4a853' }}>Transcribiendo...</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: '#1a2744' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: '#d4a853' }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                  />
                </div>
              </div>
            )}

            {job.status === 'done' && (
              <div className="p-3 rounded-lg text-sm leading-relaxed" style={{ background: '#0a1628', color: '#d1d5db' }}>
                {job.text}
              </div>
            )}

            {job.status === 'pending' && (
              <div className="flex items-center gap-2 py-2">
                <AlertCircle size={14} color="#6b7280" />
                <span className="text-xs" style={{ color: '#6b7280' }}>Pendiente de procesar</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

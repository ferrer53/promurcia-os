import { useState, useMemo, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading, Heading2, List, ListOrdered,
  Quote, Code, FilePlus, FolderOpen, Save, Type, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, FileText
} from 'lucide-react';

interface EditorFile {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
}

const RECENT_FILES: EditorFile[] = [
  { id: '1', name: 'notas_reunion.txt', content: 'Reunion equipo - 13/02/2026\n\nAsistentes:\n- Carlos\n- Ana\n- Roberto\n\nPuntos tratados:\n1. Revision de objetivos Q1\n2. Nueva campana marketing\n3. Incorporacion de nuevo agente\n\nProxima reunion: 20/02/2026', updatedAt: Date.now() - 3600000 },
  { id: '2', name: 'contrato_borrador.txt', content: 'CONTRATO DE ARRAS\n\nEn Murcia, a 13 de febrero de 2026\n\nREUNIDOS:\n\nDe una parte, D./Dona _________________, mayor de edad, con DNI ___________, actuando en nombre propio.\n\nY de otra parte, PROMURCIA REAL ESTATE S.L., con CIF B-__________, domicilio social en ________________.\n\nINTERVIENEN:\n\nAmbas partes en su propio nombre y derecho, reconociendose mutua capacidad legal para otorgar el presente contrato.', updatedAt: Date.now() - 86400000 },
  { id: '3', name: 'sin_titulo.txt', content: '', updatedAt: Date.now() },
];

export default function TextEditor() {
  const [files, setFiles] = useState<EditorFile[]>(RECENT_FILES);
  const [currentId, setCurrentId] = useState('1');
  const [content, setContent] = useState(RECENT_FILES[0].content);
  const [showRecent, setShowRecent] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  const currentFile = files.find(f => f.id === currentId) || files[0];

  const lines = content.split('\n');
  const words = useMemo(() => content.split(/\s+/).filter(w => w.length > 0).length, [content]);
  const chars = content.length;

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = document.getElementById('text-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = content.substring(start, end);
    const newText = content.substring(0, start) + before + sel + after + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + before.length + sel.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }, [content]);

  const handleSave = () => {
    setFiles(prev => prev.map(f => f.id === currentId ? { ...f, content, updatedAt: Date.now() } : f));
  };

  const handleNewFile = () => {
    const newFile: EditorFile = { id: Date.now().toString(), name: 'nuevo_documento.txt', content: '', updatedAt: Date.now() };
    setFiles(prev => [newFile, ...prev]);
    setCurrentId(newFile.id);
    setContent('');
  };

  const handleOpenFile = (file: EditorFile) => {
    setCurrentId(file.id);
    setContent(file.content);
    setShowRecent(false);
  };

  const ToolbarButton = ({ icon: Icon, onClick, title, active }: { icon: React.ElementType; onClick: () => void; title: string; active?: boolean }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-all ${active ? 'text-[#d4a853] bg-[rgba(212,168,83,0.1)]' : 'text-gray-400 hover:text-white hover:bg-[#1a2744]'}`}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628' }}>
      {/* Menu bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 shrink-0" style={{ background: '#111d32', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <ToolbarButton icon={FilePlus} onClick={handleNewFile} title="Nuevo" />
        <ToolbarButton icon={FolderOpen} onClick={() => setShowRecent(!showRecent)} title="Abrir" />
        <ToolbarButton icon={Save} onClick={handleSave} title="Guardar" />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarButton icon={Undo} onClick={() => document.execCommand('undo')} title="Deshacer" />
        <ToolbarButton icon={Redo} onClick={() => document.execCommand('redo')} title="Rehacer" />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarButton icon={Bold} onClick={() => insertText('**', '**')} title="Negrita" />
        <ToolbarButton icon={Italic} onClick={() => insertText('*', '*')} title="Cursiva" />
        <ToolbarButton icon={Underline} onClick={() => insertText('<u>', '</u>')} title="Subrayado" />
        <ToolbarButton icon={Strikethrough} onClick={() => insertText('~~', '~~')} title="Tachado" />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarButton icon={Heading} onClick={() => insertText('# ', '\n')} title="Encabezado 1" />
        <ToolbarButton icon={Heading2} onClick={() => insertText('## ', '\n')} title="Encabezado 2" />
        <ToolbarButton icon={List} onClick={() => insertText('- ', '')} title="Lista" />
        <ToolbarButton icon={ListOrdered} onClick={() => insertText('1. ', '')} title="Lista numerada" />
        <ToolbarButton icon={Quote} onClick={() => insertText('> ', '')} title="Cita" />
        <ToolbarButton icon={Code} onClick={() => insertText('```\n', '\n```')} title="Bloque de codigo" />
        <div className="w-px h-4 bg-white/10 mx-1" />
        <ToolbarButton icon={Type} onClick={() => setWordWrap(!wordWrap)} title="Ajuste de linea" active={wordWrap} />
      </div>

      {/* Recent files dropdown */}
      {showRecent && (
        <div className="absolute top-16 left-4 z-50 rounded-lg py-2 w-64" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Archivos recientes</p>
          {files.map(file => (
            <button key={file.id} onClick={() => handleOpenFile(file)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#1a2744] transition-colors">
              <FileText size={14} className="text-gray-400 shrink-0" />
              <span className="text-xs text-white truncate">{file.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line numbers */}
        <div className="shrink-0 overflow-hidden select-none" style={{ background: '#0d1b2a', width: 48, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-right pr-3 pt-3">
            {lines.map((_, i) => (
              <div key={i} className="text-xs text-gray-600 leading-6">{i + 1}</div>
            ))}
          </div>
        </div>

        {/* Text area */}
        <div className="flex-1 overflow-auto">
          <textarea
            id="text-editor"
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-full bg-transparent text-sm text-gray-300 outline-none resize-none p-3 leading-6 font-mono"
            placeholder="Empieza a escribir..."
            style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre', tabSize: 2 }}
            spellCheck={false}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0" style={{ background: '#111d32', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">{currentFile.name}</span>
          <span className="text-[10px] text-gray-600">UTF-8</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">{words} palabras</span>
          <span className="text-[10px] text-gray-500">{chars} caracteres</span>
          <span className="text-[10px] text-gray-500">{lines.length} lineas</span>
        </div>
      </div>
    </div>
  );
}

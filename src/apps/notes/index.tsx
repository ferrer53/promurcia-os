import { useState, useMemo } from 'react';
import { Search, Plus, Trash2, FileText, Tag, X, Bold, Italic, Underline, Type, List, ListOrdered } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

const CATEGORIES = [
  { name: 'General', color: '#6b7280' },
  { name: 'Personal', color: '#8b5cf6' },
  { name: 'Trabajo', color: '#3b82f6' },
  { name: 'Ideas', color: '#22c55e' },
  { name: 'Urgente', color: '#ef4444' },
];

const INITIAL_NOTES: Note[] = [
  { id: '1', title: 'Reunion semanal', content: 'Puntos a tratar:\n- Revision de leads\n- Actualizacion de propiedades\n- Seguimiento de operaciones', category: 'Trabajo', color: '#3b82f6', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 3600000 },
  { id: '2', title: 'Ideas para marketing', content: 'Crear campana en redes sociales\nFotos profesionales de propiedades\nVideo virtual tour', category: 'Ideas', color: '#22c55e', createdAt: Date.now() - 172800000, updatedAt: Date.now() - 172800000 },
  { id: '3', title: 'Datos cliente Garcia', content: 'Telefono: +34 612 345 678\nBusca piso en centro, 3 habitaciones\nPresupuesto: 180.000€', category: 'Personal', color: '#8b5cf6', createdAt: Date.now() - 259200000, updatedAt: Date.now() - 86400000 },
  { id: '4', title: 'Tareas pendientes', content: '1. Enviar contrato a Lopez\n2. Preparar visita martes\n3. Actualizar CRM', category: 'Urgente', color: '#ef4444', createdAt: Date.now() - 100000, updatedAt: Date.now() - 100000 },
];

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  const selectedNote = notes.find(n => n.id === selectedId) || notes[0];

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => categoryFilter === 'Todas' || n.category === categoryFilter)
      .filter(n => {
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, categoryFilter, search]);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Nueva nota',
      content: '',
      category: 'General',
      color: '#6b7280',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedId(newNote.id);
  };

  const handleUpdateNote = (updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, ...updates, updatedAt: Date.now() } : n));
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id && notes.length > 1) {
      setSelectedId(notes.find(n => n.id !== id)?.id || '');
    }
  };

  const charCount = selectedNote?.content.length || 0;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const insertFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('note-content') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedNote.content;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    const newContent = before + prefix + (selected || '') + suffix + after;
    handleUpdateNote({ content: newContent });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div className="flex h-full" style={{ background: '#0a1628' }}>
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0d1b2a' }}>
        {/* Search */}
        <div className="p-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full mb-2" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search size={14} className="text-gray-500 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm text-white outline-none w-full placeholder-gray-600" placeholder="Buscar notas..." />
            {search && <button onClick={() => setSearch('')} className="text-gray-500 hover:text-white"><X size={12} /></button>}
          </div>
          {/* Category filter */}
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setCategoryFilter('Todas')} className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${categoryFilter === 'Todas' ? 'bg-[#d4a853] text-[#0a1628]' : 'text-gray-500 hover:bg-[#1a2744]'}`}>Todas</button>
            {CATEGORIES.map(c => (
              <button key={c.name} onClick={() => setCategoryFilter(c.name)} className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${categoryFilter === c.name ? 'text-white' : 'text-gray-500 hover:bg-[#1a2744]'}`} style={categoryFilter === c.name ? { background: `${c.color}30`, color: c.color } : {}}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* New note button */}
        <div className="px-3 pb-2 shrink-0">
          <button onClick={handleCreateNote} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#d4a853] text-[#0a1628] text-sm font-medium hover:brightness-110 transition-all">
            <Plus size={14} /> Nueva Nota
          </button>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-auto px-3 pb-3">
          <div className="space-y-1">
            {filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`w-full text-left p-2.5 rounded-lg transition-all ${selectedId === note.id ? 'bg-[rgba(212,168,83,0.08)] border-l-2 border-[#d4a853]' : 'hover:bg-[rgba(255,255,255,0.03)] border-l-2 border-transparent'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: note.color }} />
                  <span className="text-xs text-white font-medium truncate flex-1">{note.title || 'Sin titulo'}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={10} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 truncate ml-3">{note.content || 'Sin contenido'}</p>
                <span className="text-[9px] text-gray-600 ml-3">{formatDate(note.updatedAt)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => insertFormat('**', '**')} className="p-1.5 rounded hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors" title="Negrita"><Bold size={14} /></button>
              <button onClick={() => insertFormat('*', '*')} className="p-1.5 rounded hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors" title="Cursiva"><Italic size={14} /></button>
              <button onClick={() => insertFormat('<u>', '</u>')} className="p-1.5 rounded hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors" title="Subrayado"><Underline size={14} /></button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button onClick={() => insertFormat('# ', '')} className="p-1.5 rounded hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors" title="Titulo"><Type size={14} /></button>
              <button onClick={() => insertFormat('- ', '')} className="p-1.5 rounded hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors" title="Lista"><List size={14} /></button>
              <button onClick={() => insertFormat('1. ', '')} className="p-1.5 rounded hover:bg-[#1a2744] text-gray-400 hover:text-white transition-colors" title="Lista numerada"><ListOrdered size={14} /></button>
              <div className="flex-1" />
              {/* Category selector */}
              <select
                value={selectedNote.category}
                onChange={e => {
                  const cat = CATEGORIES.find(c => c.name === e.target.value);
                  handleUpdateNote({ category: e.target.value, color: cat?.color || '#6b7280' });
                }}
                className="text-xs bg-[#1a2744] text-gray-300 rounded px-2 py-1 outline-none border border-white/10"
              >
                {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Title */}
            <div className="px-4 pt-3 shrink-0">
              <input
                value={selectedNote.title}
                onChange={e => handleUpdateNote({ title: e.target.value })}
                className="w-full text-xl font-semibold text-white bg-transparent outline-none placeholder-gray-600"
                placeholder="Titulo de la nota"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto px-4 py-2">
              <textarea
                id="note-content"
                value={selectedNote.content}
                onChange={e => handleUpdateNote({ content: e.target.value })}
                className="w-full h-full bg-transparent text-sm text-gray-300 outline-none resize-none leading-relaxed placeholder-gray-600"
                placeholder="Escribe aqui el contenido de tu nota..."
                style={{ minHeight: 200 }}
              />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-1.5 text-[10px] text-gray-600 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span>{charCount} caracteres</span>
              <span>Ultima edicion: {formatDate(selectedNote.updatedAt)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

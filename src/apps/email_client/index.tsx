import { useState, useMemo } from 'react';
import {
  Inbox, Send, FileText, Trash2, AlertTriangle, Star, StarOff,
  Search, Plus, Reply, Forward, X, MailOpen, Mail
} from 'lucide-react';

type Folder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash';

interface Email {
  id: number;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: Folder;
}

const INITIAL_EMAILS: Email[] = [
  { id: 1, from: 'juan.garcia@email.es', to: 'usuario@promurcia.com', subject: 'Visita programada para manana', body: 'Hola,\n\nConfirmo la visita para manana a las 10:00 en la Calle Mayor 15.\n\nSaludos,\nJuan Garcia', date: '13 feb 14:30', read: false, starred: true, folder: 'inbox' },
  { id: 2, from: 'maria@promurcia.com', to: 'usuario@promurcia.com', subject: 'Nueva oferta de propiedad', body: 'Buenas,\n\nTenemos una nueva propiedad en Cartagena que podria interesarle.\nPrecio: 195.000 EUR\nMetros: 120 m2\n\nUn saludo,\nMaria', date: '13 feb 11:20', read: false, starred: false, folder: 'inbox' },
  { id: 3, from: 'info@bancosantander.es', to: 'usuario@promurcia.com', subject: 'Resumen mensual de su cuenta', body: 'Estimado cliente,\n\nLe adjuntamos el resumen mensual de su cuenta corriente.\n\nBanco Santander', date: '12 feb 09:00', read: true, starred: false, folder: 'inbox' },
  { id: 4, from: 'usuario@promurcia.com', to: 'cliente@email.es', subject: 'Re: Reunion del lunes', body: 'Perfecto,\n\nNos vemos el lunes a las 16:00 en nuestras oficinas.\n\nSaludos', date: '11 feb 16:45', read: true, starred: false, folder: 'sent' },
  { id: 5, from: 'laura.martinez@email.es', to: 'usuario@promurcia.com', subject: 'Documentos de la escritura', body: 'Hola,\n\nOs envio los documentos de la escritura firmados.\n\nLaura Martinez', date: '10 feb 10:15', read: true, starred: true, folder: 'inbox' },
  { id: 6, from: 'usuario@promurcia.com', to: 'soporte@idealista.es', subject: 'Problema con publicacion', body: 'Hola,\n\nTengo un problema con la publicacion de un anuncio.\n\nGracias', date: '09 feb', read: true, starred: false, folder: 'drafts' },
  { id: 7, from: 'oferta@spam.es', to: 'usuario@promurcia.com', subject: 'Gana dinero rapido', body: 'Oferta exclusiva!!!\n\nGana 5000 EUR al mes sin esfuerzo...', date: '08 feb', read: true, starred: false, folder: 'spam' },
  { id: 8, from: 'newsletter@fotocasa.es', to: 'usuario@promurcia.com', subject: 'Novedades de Febrero', body: 'Descubre las ultimas novedades del mercado inmobiliario...', date: '07 feb', read: true, starred: false, folder: 'inbox' },
  { id: 9, from: 'carlos.lopez@email.es', to: 'usuario@promurcia.com', subject: 'Pago de la fianza', body: 'Hola,\n\nYa he realizado el pago de la fianza. Adjunto el justificante.\n\nCarlos Lopez', date: '06 feb', read: true, starred: false, folder: 'inbox' },
  { id: 10, from: 'usuario@promurcia.com', to: 'ana@email.es', subject: 'Oferta de alquiler', body: 'Hola Ana,\n\nTe envio la oferta de alquiler para el piso del centro.\n\nSaludos', date: '05 feb', read: true, starred: false, folder: 'sent' },
];

const FOLDERS: { id: Folder; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Bandeja de entrada', icon: Inbox },
  { id: 'sent', label: 'Enviados', icon: Send },
  { id: 'drafts', label: 'Borradores', icon: FileText },
  { id: 'spam', label: 'Spam', icon: AlertTriangle },
  { id: 'trash', label: 'Papelera', icon: Trash2 },
];

export default function EmailClient() {
  const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [toast, setToast] = useState('');

  const filteredEmails = useMemo(() => {
    return emails.filter(e => {
      const inFolder = e.folder === activeFolder;
      const matchesSearch = !search || e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase());
      return inFolder && matchesSearch;
    }).sort((a, b) => b.id - a.id);
  }, [emails, activeFolder, search]);

  const selectedEmail = emails.find(e => e.id === selectedId);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  };

  const toggleStar = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails(prev => prev.map(em => em.id === id ? { ...em, starred: !em.starred } : em));
  };

  const handleSend = () => {
    if (composeTo && composeSubject) {
      const newEmail: Email = {
        id: Date.now(),
        from: 'usuario@promurcia.com',
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
        date: 'Ahora',
        read: true,
        starred: false,
        folder: 'sent',
      };
      setEmails(prev => [...prev, newEmail]);
      setShowCompose(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setToast('Mensaje enviado');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleDelete = () => {
    if (selectedId) {
      setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, folder: 'trash' } : e));
      setSelectedId(null);
    }
  };

  const unreadCount = (folder: Folder) => emails.filter(e => e.folder === folder && !e.read).length;

  return (
    <div className="flex h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Folders sidebar */}
      <div className="w-48 shrink-0 border-r flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        <div className="p-3">
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium"
            style={{ background: '#d4a853', color: '#0a1628' }}
          >
            <Plus size={14} /> Redactar
          </button>
        </div>
        <nav className="flex-1 px-2">
          {FOLDERS.map(f => {
            const Icon = f.icon;
            const count = unreadCount(f.id);
            return (
              <button
                key={f.id}
                onClick={() => { setActiveFolder(f.id); setSelectedId(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-all mb-0.5"
                style={{
                  background: activeFolder === f.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                  color: activeFolder === f.id ? '#d4a853' : '#9ca3af',
                }}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{f.label}</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#ef4444', color: '#fff' }}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Email list */}
      <div className="w-64 shrink-0 border-r overflow-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0f1a2b' }}>
        <div className="p-2">
          <div className="relative">
            <Search size={12} color="#6b7280" className="absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar correos..."
              className="w-full pl-7 pr-2 py-1.5 rounded text-xs outline-none"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
            />
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {filteredEmails.map(email => (
            <button
              key={email.id}
              onClick={() => handleSelect(email.id)}
              className="w-full text-left px-3 py-2.5 transition-colors"
              style={{
                background: selectedId === email.id ? 'rgba(212,168,83,0.08)' : email.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                borderLeft: selectedId === email.id ? '2px solid #d4a853' : !email.read ? '2px solid #3b82f6' : '2px solid transparent',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <button onClick={e => toggleStar(email.id, e)} className="shrink-0">
                  {email.starred ? <Star size={12} color="#d4a853" fill="#d4a853" /> : <StarOff size={12} color="#4b5563" />}
                </button>
                <span className={`text-xs truncate flex-1 ${!email.read ? 'font-semibold' : ''}`} style={{ color: '#d1d5db' }}>{email.from}</span>
              </div>
              <div className={`text-xs truncate ${!email.read ? 'font-medium' : ''}`} style={{ color: '#9ca3af' }}>{email.subject}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#4b5563' }}>{email.date}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Reading pane */}
      <div className="flex-1 overflow-auto p-4">
        {selectedEmail ? (
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h2 className="text-base font-semibold">{selectedEmail.subject}</h2>
              <div className="flex gap-1">
                <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-500/20" title="Eliminar"><Trash2 size={14} color="#ef4444" /></button>
                <button onClick={() => { setComposeTo(selectedEmail.from); setComposeSubject(`Re: ${selectedEmail.subject}`); setShowCompose(true); }} className="p-1.5 rounded hover:bg-white/5" title="Responder"><Reply size={14} color="#9ca3af" /></button>
                <button className="p-1.5 rounded hover:bg-white/5" title="Reenviar"><Forward size={14} color="#9ca3af" /></button>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#1a2744', color: '#d4a853' }}>
                {selectedEmail.from[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">{selectedEmail.from}</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>Para: {selectedEmail.to}</div>
              </div>
              <span className="text-xs ml-auto" style={{ color: '#4b5563' }}>{selectedEmail.date}</span>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#d1d5db' }}>{selectedEmail.body}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: '#4b5563' }}>
            <MailOpen size={48} />
            <p className="text-sm mt-2">Selecciona un correo para leerlo</p>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-xl w-[500px] max-h-[80%] flex flex-col" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.15)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold">Nuevo mensaje</h3>
              <button onClick={() => setShowCompose(false)} className="p-1 rounded hover:bg-white/5"><X size={14} color="#9ca3af" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-auto">
              <input
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                placeholder="Para"
                className="w-full px-3 py-2 rounded text-sm outline-none"
                style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
              <input
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                placeholder="Asunto"
                className="w-full px-3 py-2 rounded text-sm outline-none"
                style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
              <textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Escribe tu mensaje..."
                rows={8}
                className="w-full px-3 py-2 rounded text-sm outline-none resize-none"
                style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <button onClick={() => setShowCompose(false)} className="px-3 py-1.5 text-xs rounded" style={{ color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSend} className="px-4 py-1.5 text-xs rounded font-medium" style={{ background: '#d4a853', color: '#0a1628' }}>Enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#22c55e', color: '#fff' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  Lock, Unlock, Eye, EyeOff, Copy, Plus, Search, Trash2,
  RefreshCw, Star, Globe, Building2, Briefcase, ShoppingBag, MoreHorizontal
} from 'lucide-react';

type Category = 'todas' | 'redes' | 'bancos' | 'trabajo' | 'compras' | 'otros';

interface PasswordEntry {
  id: number;
  site: string;
  username: string;
  password: string;
  notes: string;
  category: Category;
  strength: 'weak' | 'medium' | 'strong';
}

const CATEGORIES: { id: Category; label: string; icon: typeof Globe }[] = [
  { id: 'todas', label: 'Todas', icon: Star },
  { id: 'redes', label: 'Redes Sociales', icon: Globe },
  { id: 'bancos', label: 'Bancos', icon: Building2 },
  { id: 'trabajo', label: 'Trabajo', icon: Briefcase },
  { id: 'compras', label: 'Compras', icon: ShoppingBag },
  { id: 'otros', label: 'Otros', icon: MoreHorizontal },
];

const INITIAL_ENTRIES: PasswordEntry[] = [
  { id: 1, site: 'Promurcia.com', username: 'admin@promurcia.com', password: 'Promurcia2026!', notes: 'Acceso admin', category: 'trabajo', strength: 'strong' },
  { id: 2, site: 'Idealista', username: 'promurcia_agente', password: 'Id3al1sta#', notes: 'Perfil agente', category: 'trabajo', strength: 'strong' },
  { id: 3, site: 'Fotocasa', username: 'promurcia', password: 'F0t0casa9', notes: '', category: 'trabajo', strength: 'medium' },
  { id: 4, site: 'Banco Santander', username: 'ES912100', password: 'Sant#2026', notes: 'Cuenta corporativa', category: 'bancos', strength: 'strong' },
  { id: 5, site: 'BBVA', username: 'promurcia_sl', password: 'Bbva$456', notes: '', category: 'bancos', strength: 'medium' },
  { id: 6, site: 'Instagram', username: '@promurcia', password: 'Insta2026', notes: 'Cuenta empresa', category: 'redes', strength: 'weak' },
  { id: 7, site: 'Amazon Business', username: 'promurcia@amazon.es', password: 'Amz#Biz99', notes: '', category: 'compras', strength: 'strong' },
  { id: 8, site: 'Router WiFi', username: 'admin', password: 'admin123', notes: 'Cambiar!', category: 'otros', strength: 'weak' },
];

function generatePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const special = '!@#$%^&*';
  const all = upper + lower + nums + special;
  let pass = '';
  pass += upper[Math.floor(Math.random() * upper.length)];
  pass += lower[Math.floor(Math.random() * lower.length)];
  pass += nums[Math.floor(Math.random() * nums.length)];
  pass += special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 12; i++) pass += all[Math.floor(Math.random() * all.length)];
  return pass.split('').sort(() => Math.random() - 0.5).join('');
}

function getStrength(pass: string): 'weak' | 'medium' | 'strong' {
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

export default function PasswordManager() {
  const [unlocked, setUnlocked] = useState(false);
  const [masterPass, setMasterPass] = useState('');
  const [entries, setEntries] = useState<PasswordEntry[]>(INITIAL_ENTRIES);
  const [category, setCategory] = useState<Category>('todas');
  const [search, setSearch] = useState('');
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<PasswordEntry>>({ category: 'otros' });

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const matchesCat = category === 'todas' || e.category === category;
      const matchesSearch = !search || e.site.toLowerCase().includes(search.toLowerCase()) || e.username.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [entries, category, search]);

  const handleUnlock = () => {
    if (masterPass.length > 0) setUnlocked(true);
  };

  const toggleVisible = (id: number) => {
    setVisibleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const handleAddEntry = () => {
    if (newEntry.site && newEntry.username && newEntry.password) {
      const entry: PasswordEntry = {
        id: Date.now(),
        site: newEntry.site,
        username: newEntry.username,
        password: newEntry.password,
        notes: newEntry.notes ?? '',
        category: newEntry.category ?? 'otros',
        strength: getStrength(newEntry.password),
      };
      setEntries(prev => [...prev, entry]);
      setShowAdd(false);
      setNewEntry({ category: 'otros' });
    }
  };

  const handleDelete = (id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4" style={{ background: '#0a1628', color: '#fff' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,168,83,0.15)' }}>
          <Lock size={32} color="#d4a853" />
        </div>
        <h3 className="text-lg font-semibold">Generador de Passwords</h3>
        <p className="text-xs" style={{ color: '#6b7280' }}>Introduce la contrasena maestra para acceder</p>
        <input
          type="password"
          value={masterPass}
          onChange={e => setMasterPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="Contrasena maestra"
          className="w-64 px-4 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          autoFocus
        />
        <button
          onClick={handleUnlock}
          className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: '#d4a853', color: '#0a1628' }}
        >
          Desbloquear
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        <div className="flex items-center gap-2">
          <Unlock size={18} color="#d4a853" />
          <span className="text-sm font-semibold">Passwords</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{entries.length}</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: '#d4a853', color: '#0a1628' }}
        >
          <Plus size={14} /> Anadir
        </button>
      </div>

      {/* Category filter + search */}
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: '#0f1a2b' }}>
        <div className="relative flex-1">
          <Search size={14} color="#6b7280" className="absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-3 py-1.5 rounded text-xs outline-none"
            style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
          />
        </div>
      </div>
      <div className="flex gap-1 px-4 py-2 overflow-x-auto">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = cat.id === 'todas' ? entries.length : entries.filter(e => e.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all"
              style={{
                background: category === cat.id ? 'rgba(212,168,83,0.15)' : '#1a2744',
                color: category === cat.id ? '#d4a853' : '#9ca3af',
                border: category === cat.id ? '1px solid rgba(212,168,83,0.3)' : '1px solid transparent',
              }}
            >
              <Icon size={12} />
              {cat.label}
              <span style={{ color: '#6b7280' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-auto px-4 py-2 space-y-2">
        {filtered.map(entry => {
          const isVisible = visibleIds.has(entry.id);
          return (
            <div key={entry.id} className="rounded-lg p-3" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: '#d4a853' }}>{entry.site}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
                    background: entry.strength === 'strong' ? 'rgba(34,197,94,0.15)' : entry.strength === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: entry.strength === 'strong' ? '#22c55e' : entry.strength === 'medium' ? '#f59e0b' : '#ef4444',
                  }}>
                    {entry.strength === 'strong' ? 'Fuerte' : entry.strength === 'medium' ? 'Media' : 'Debil'}
                  </span>
                </div>
                <button onClick={() => handleDelete(entry.id)} className="p-1 rounded hover:bg-red-500/20">
                  <Trash2 size={12} color="#ef4444" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs w-20 shrink-0" style={{ color: '#6b7280' }}>Usuario:</span>
                <span className="text-xs flex-1 truncate" style={{ color: '#d1d5db' }}>{entry.username}</span>
                <button onClick={() => copyToClipboard(entry.username)} className="p-1 rounded hover:bg-white/5">
                  <Copy size={12} color="#9ca3af" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-20 shrink-0" style={{ color: '#6b7280' }}>Password:</span>
                <span className="text-xs flex-1 font-mono truncate" style={{ color: '#d1d5db' }}>
                  {isVisible ? entry.password : '••••••••••••'}
                </span>
                <button onClick={() => toggleVisible(entry.id)} className="p-1 rounded hover:bg-white/5">
                  {isVisible ? <EyeOff size={12} color="#9ca3af" /> : <Eye size={12} color="#9ca3af" />}
                </button>
                <button onClick={() => copyToClipboard(entry.password)} className="p-1 rounded hover:bg-white/5">
                  <Copy size={12} color="#9ca3af" />
                </button>
              </div>
              {entry.notes && <div className="text-[11px] mt-1" style={{ color: '#4b5563' }}>{entry.notes}</div>}
            </div>
          );
        })}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-xl p-5 w-96 space-y-3" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.15)' }}>
            <h3 className="text-sm font-semibold mb-2">Anadir contrasena</h3>
            <input
              value={newEntry.site ?? ''}
              onChange={e => setNewEntry(p => ({ ...p, site: e.target.value }))}
              placeholder="Sitio web"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <input
              value={newEntry.username ?? ''}
              onChange={e => setNewEntry(p => ({ ...p, username: e.target.value }))}
              placeholder="Nombre de usuario"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <div className="flex gap-2">
              <input
                value={newEntry.password ?? ''}
                onChange={e => setNewEntry(p => ({ ...p, password: e.target.value }))}
                placeholder="Contrasena"
                className="flex-1 px-3 py-2 rounded text-sm outline-none"
                style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
              <button
                onClick={() => setNewEntry(p => ({ ...p, password: generatePassword() }))}
                className="px-3 py-2 rounded text-xs font-medium"
                style={{ background: '#1a2744', border: '1px solid rgba(212,168,83,0.3)', color: '#d4a853' }}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <select
              value={newEntry.category ?? 'otros'}
              onChange={e => setNewEntry(p => ({ ...p, category: e.target.value as Category }))}
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            >
              {CATEGORIES.filter(c => c.id !== 'todas').map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <input
              value={newEntry.notes ?? ''}
              onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notas (opcional)"
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs rounded" style={{ color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleAddEntry} className="px-4 py-1.5 text-xs rounded font-medium" style={{ background: '#d4a853', color: '#0a1628' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

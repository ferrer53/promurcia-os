import { useState } from 'react';
import { motion } from 'framer-motion';
import { trpc } from '@/providers/trpc';
import { Phone, Search, User, Home, MessageSquare, Mic, Loader2, AlertCircle } from 'lucide-react';

function normalizePhoneInput(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `+34${digits}`;
  if (digits.length === 11 && digits.startsWith('34')) return `+${digits}`;
  if (digits.length > 9) return `+${digits}`;
  return phone;
}

export default function PhoneLookup() {
  const [query, setQuery] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

  const { data, isLoading, error } = trpc.crm.phone.lookup.useQuery(
    { phone: searchPhone },
    { enabled: searchPhone.replace(/\D/g, '').length >= 9 }
  );

  const handleSearch = () => {
    const normalized = normalizePhoneInput(query);
    if (normalized.replace(/\D/g, '').length >= 9) {
      setSearchPhone(normalized);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628', color: '#fff' }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 className="text-lg font-semibold text-white">Buscar por Teléfono</h1>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Vincula leads, propiedades, interacciones y llamadas</p>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Phone size={16} color="#d4a853" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Introduce un teléfono..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#fff' }}
          />
          <button onClick={handleSearch}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
            style={{ background: '#d4a853', color: '#0a1628' }}>
            <Search size={14} className="inline mr-1" /> Buscar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} color="#d4a853" className="animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={18} color="#ef4444" />
            <p className="text-sm text-red-400">{error.message}</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs" style={{ color: '#6b7280' }}>Teléfono normalizado</p>
              <p className="text-xl font-semibold text-white">{data.phone}</p>
            </div>

            <Section icon={User} title="Leads" count={data.leads.length} color="#3b82f6">
              {data.leads.map((lead) => (
                <div key={lead.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-sm text-white font-medium">{lead.name}</p>
                  <p className="text-[11px]" style={{ color: '#9ca3af' }}>{lead.email} · {lead.phone}</p>
                  <p className="text-[11px] mt-1" style={{ color: '#6b7280' }}>Estado: {lead.status} · Zona: {lead.zone || '-'} · Presupuesto: {lead.budgetMin ?? '-'}</p>
                </div>
              ))}
            </Section>

            <Section icon={Home} title="Propiedades" count={data.properties.length} color="#22c55e">
              {data.properties.map((prop) => (
                <div key={prop.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-sm text-white font-medium">{prop.title || prop.address || prop.reference}</p>
                  <p className="text-[11px]" style={{ color: '#9ca3af' }}>{prop.type} · {prop.operation} · {prop.price?.toLocaleString('es-ES')}€</p>
                  <p className="text-[11px] mt-1" style={{ color: '#6b7280' }}>{prop.address} · {prop.city}</p>
                </div>
              ))}
            </Section>

            <Section icon={MessageSquare} title="Interacciones" count={data.interactions.length} color="#f59e0b">
              {data.interactions.map((interaction) => (
                <div key={interaction.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[11px]" style={{ color: '#9ca3af' }}>{interaction.type} · {interaction.direction} · {interaction.createdAt ? new Date(interaction.createdAt).toLocaleString('es-ES') : ''}</p>
                  <p className="text-sm text-white mt-0.5">{interaction.content}</p>
                </div>
              ))}
            </Section>

            <Section icon={Mic} title="Transcripciones" count={data.transcriptions.length} color="#8b5cf6">
              {data.transcriptions.map((t) => (
                <div key={t.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-sm text-white font-medium">{t.fileName}</p>
                  <p className="text-[11px]" style={{ color: '#9ca3af' }}>{t.processingStatus} · {t.duration}s · {t.transcript?.slice(0, 120)}...</p>
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, count, color, children }: { icon: any; title: string; count: number; color: string; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} color={color} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </motion.div>
  );
}

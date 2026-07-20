import { useState } from 'react';
import { Columns, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface Property {
  id: string;
  ref: string;
  price: number;
  sqm: number;
  bedrooms: number;
  bathrooms: number;
  zone: string;
  year: number;
  elevator: boolean;
  garage: boolean;
  terrace: boolean;
  condition: string;
  energyCert: string;
}

const PRELOADED: Property[] = [
  { id: '1', ref: 'PRO-7821', price: 285000, sqm: 95, bedrooms: 3, bathrooms: 2, zone: 'Murcia Centro', year: 2010, elevator: true, garage: false, terrace: true, condition: 'Reformado', energyCert: 'C' },
  { id: '2', ref: 'PRO-3456', price: 320000, sqm: 120, bedrooms: 4, bathrooms: 2, zone: 'El Palmar', year: 2015, elevator: false, garage: true, terrace: true, condition: 'Nuevo', energyCert: 'B' },
  { id: '3', ref: 'PRO-9012', price: 245000, sqm: 85, bedrooms: 3, bathrooms: 1, zone: 'Espinardo', year: 2005, elevator: true, garage: false, terrace: false, condition: 'Buen estado', energyCert: 'D' },
];

function formatCurrency(val: number): string {
  return val.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20ac';
}

function calculateScore(p: Property): number {
  let score = 0;
  const pricePerSqm = p.price / p.sqm;
  // Price/m2 score (lower is better)
  score += Math.max(0, 10 - pricePerSqm / 400) * 2;
  // Features score
  score += (p.elevator ? 1 : 0) + (p.garage ? 2 : 0) + (p.terrace ? 1.5 : 0);
  // Condition score
  score += p.condition === 'Nuevo' ? 3 : p.condition === 'Reformado' ? 2 : p.condition === 'Buen estado' ? 1 : 0;
  // Energy cert score
  score += ['A', 'B'].includes(p.energyCert) ? 1.5 : ['C', 'D'].includes(p.energyCert) ? 1 : 0.5;
  // Age score (newer is better)
  score += Math.max(0, (2024 - p.year) / 10);
  return Math.min(10, Math.max(0, score));
}

export default function PropertyCompare() {
  const [properties, setProperties] = useState<Property[]>(PRELOADED);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProperty, setNewProperty] = useState<Partial<Property>>({ ref: '', price: 0, sqm: 0, bedrooms: 0, bathrooms: 0, zone: '', year: 2000, elevator: false, garage: false, terrace: false, condition: 'Buen estado', energyCert: 'D' });

  const scores = properties.map(calculateScore);
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const winnerId = scores.length > 0 ? properties[scores.indexOf(bestScore)]?.id : null;

  const comparisonRows = [
    { label: 'Referencia', key: 'ref', format: (v: unknown) => v as string, isBest: () => false, isWorst: () => false },
    { label: 'Precio', key: 'price', format: (v: unknown) => formatCurrency(v as number), isBest: (vals: number[]) => vals.indexOf(Math.min(...vals)), isWorst: (vals: number[]) => vals.indexOf(Math.max(...vals)) },
    { label: 'm2', key: 'sqm', format: (v: unknown) => `${v} m2`, isBest: (vals: number[]) => vals.indexOf(Math.max(...vals)), isWorst: (vals: number[]) => vals.indexOf(Math.min(...vals)) },
    { label: 'Habitaciones', key: 'bedrooms', format: (v: unknown) => `${v}`, isBest: (vals: number[]) => vals.indexOf(Math.max(...vals)), isWorst: (vals: number[]) => vals.indexOf(Math.min(...vals)) },
    { label: 'Banos', key: 'bathrooms', format: (v: unknown) => `${v}`, isBest: (vals: number[]) => vals.indexOf(Math.max(...vals)), isWorst: (vals: number[]) => vals.indexOf(Math.min(...vals)) },
    { label: 'Ano', key: 'year', format: (v: unknown) => `${v}`, isBest: (vals: number[]) => vals.indexOf(Math.max(...vals)), isWorst: (vals: number[]) => vals.indexOf(Math.min(...vals)) },
    { label: 'Zona', key: 'zone', format: (v: unknown) => v as string, isBest: () => -1, isWorst: () => -1 },
    { label: '\u20ac/m2', key: 'pricePerSqm', format: (v: unknown) => formatCurrency(v as number), isBest: (vals: number[]) => vals.indexOf(Math.min(...vals)), isWorst: (vals: number[]) => vals.indexOf(Math.max(...vals)) },
    { label: 'Ascensor', key: 'elevator', format: (v: unknown) => v ? <CheckCircle2 size={14} color="#22c55e" /> : <XCircle size={14} color="#ef4444" />, isBest: () => -1, isWorst: () => -1 },
    { label: 'Garaje', key: 'garage', format: (v: unknown) => v ? <CheckCircle2 size={14} color="#22c55e" /> : <XCircle size={14} color="#ef4444" />, isBest: () => -1, isWorst: () => -1 },
    { label: 'Terraza', key: 'terrace', format: (v: unknown) => v ? <CheckCircle2 size={14} color="#22c55e" /> : <XCircle size={14} color="#ef4444" />, isBest: () => -1, isWorst: () => -1 },
    { label: 'Estado', key: 'condition', format: (v: unknown) => v as string, isBest: () => -1, isWorst: () => -1 },
    { label: 'Cert. Energ.', key: 'energyCert', format: (v: unknown) => v as string, isBest: () => -1, isWorst: () => -1 },
  ];

  const addProperty = () => {
    if (!newProperty.ref) return;
    const prop: Property = {
      id: Date.now().toString(),
      ref: newProperty.ref || 'NUEVO',
      price: newProperty.price || 0,
      sqm: newProperty.sqm || 0,
      bedrooms: newProperty.bedrooms || 0,
      bathrooms: newProperty.bathrooms || 0,
      zone: newProperty.zone || '',
      year: newProperty.year || 2000,
      elevator: newProperty.elevator || false,
      garage: newProperty.garage || false,
      terrace: newProperty.terrace || false,
      condition: newProperty.condition || 'Buen estado',
      energyCert: newProperty.energyCert || 'D',
    };
    setProperties([...properties, prop]);
    setShowAddForm(false);
    setNewProperty({ ref: '', price: 0, sqm: 0, bedrooms: 0, bathrooms: 0, zone: '', year: 2000, elevator: false, garage: false, terrace: false, condition: 'Buen estado', energyCert: 'D' });
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter(p => p.id !== id));
  };

  const propsWithCalc = properties.map(p => ({ ...p, pricePerSqm: p.price / p.sqm }));

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0a1628' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Columns size={16} style={{ color: '#d4a853' }} />
          <span className="text-sm font-medium text-white">Comparador de Propiedades</span>
        </div>
        {properties.length < 4 && (
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all" style={{ background: '#d4a853', color: '#0a1628' }}>
            <Plus size={12} /> Anadir
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="overflow-auto">
          <table className="w-full text-xs" style={{ minWidth: 500 }}>
            <thead>
              <tr>
                <th className="px-2 py-2 text-left font-medium" style={{ color: '#6b7280', width: 120 }}></th>
                {properties.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center" style={{
                    color: winnerId === p.id ? '#d4a853' : '#fff',
                    border: winnerId === p.id ? '2px solid #d4a853' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 4,
                    background: winnerId === p.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                  }}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">{p.ref}</span>
                      <button onClick={() => removeProperty(p.id)}><Trash2 size={10} style={{ color: '#6b7280' }} /></button>
                    </div>
                    {winnerId === p.id && <span className="text-[9px]" style={{ color: '#d4a853' }}>GANADOR</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, ri) => {
                const values = propsWithCalc.map(p => p[row.key as keyof typeof p] as number);
                const bestIdx = typeof values[0] === 'number' ? row.isBest(values as number[]) : -1;
                const worstIdx = typeof values[0] === 'number' ? row.isWorst(values as number[]) : -1;

                return (
                  <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-2 py-2 font-medium" style={{ color: '#9ca3af' }}>{row.label}</td>
                    {propsWithCalc.map((p, ci) => {
                      const val = p[row.key as keyof typeof p];
                      const isBest = ci === bestIdx;
                      const isWorst = ci === worstIdx;
                      return (
                        <td key={ci} className="px-2 py-2 text-center" style={{
                          background: isBest ? 'rgba(34,197,94,0.1)' : isWorst ? 'rgba(239,68,68,0.08)' : 'transparent',
                          color: isBest ? '#22c55e' : isWorst ? '#ef4444' : '#fff',
                        }}>
                          {row.format(val as unknown)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Score row */}
              <tr>
                <td className="px-2 py-2 font-medium" style={{ color: '#d4a853' }}>Puntuacion</td>
                {properties.map((p, idx) => (<td key={p.id} className="px-2 py-2 text-center">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center justify-center rounded-full" style={{
                        width: 36, height: 36,
                        background: scores[idx] >= 7 ? 'rgba(34,197,94,0.2)' : scores[idx] >= 5 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                        border: `2px solid ${scores[idx] >= 7 ? '#22c55e' : scores[idx] >= 5 ? '#f59e0b' : '#ef4444'}`,
                      }}>
                        <span className="text-sm font-bold" style={{ color: scores[idx] >= 7 ? '#22c55e' : scores[idx] >= 5 ? '#f59e0b' : '#ef4444' }}>{scores[idx].toFixed(1)}</span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add property form */}
      {showAddForm && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.9)' }}>
          <div className="flex flex-col gap-3 p-6 rounded-xl" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)', width: 360 }}>
            <h3 className="text-sm font-semibold text-white">Anadir propiedad</h3>
            <input placeholder="Referencia" value={newProperty.ref} onChange={e => setNewProperty({ ...newProperty, ref: e.target.value })} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div className="flex gap-2">
              <input type="number" placeholder="Precio" value={newProperty.price} onChange={e => setNewProperty({ ...newProperty, price: Number(e.target.value) })} className="flex-1 rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              <input type="number" placeholder="m2" value={newProperty.sqm} onChange={e => setNewProperty({ ...newProperty, sqm: Number(e.target.value) })} className="flex-1 rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="Hab." value={newProperty.bedrooms} onChange={e => setNewProperty({ ...newProperty, bedrooms: Number(e.target.value) })} className="flex-1 rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              <input type="number" placeholder="Banos" value={newProperty.bathrooms} onChange={e => setNewProperty({ ...newProperty, bathrooms: Number(e.target.value) })} className="flex-1 rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <input placeholder="Zona" value={newProperty.zone} onChange={e => setNewProperty({ ...newProperty, zone: e.target.value })} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div className="flex gap-1">
              {['elevator', 'garage', 'terrace'].map(ex => (
                <button key={ex} onClick={() => setNewProperty({ ...newProperty, [ex]: !newProperty[ex as keyof typeof newProperty] })} className="flex-1 py-1 rounded text-xs transition-all" style={{ background: newProperty[ex as keyof typeof newProperty] ? 'rgba(212,168,83,0.2)' : '#1a2744', color: newProperty[ex as keyof typeof newProperty] ? '#d4a853' : '#9ca3af' }}>
                  {ex.charAt(0).toUpperCase() + ex.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addProperty} className="flex-1 py-2 rounded-md text-xs font-medium transition-all" style={{ background: '#d4a853', color: '#0a1628' }}>Anadir</button>
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 rounded-md text-xs font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

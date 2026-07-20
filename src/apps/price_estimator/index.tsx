import { useState, useMemo } from 'react';
import { DollarSign } from 'lucide-react';

const ZONES: Record<string, { basePrice: number; name: string }> = {
  'murcia_centro': { basePrice: 1800, name: 'Murcia Centro' },
  'el_palmar': { basePrice: 1400, name: 'El Palmar' },
  'alberca': { basePrice: 1300, name: 'Alberca' },
  'espinardo': { basePrice: 1200, name: 'Espinardo' },
  'churra': { basePrice: 1600, name: 'Churra' },
  'la_flota': { basePrice: 1500, name: 'La Flota' },
  'ronda_sur': { basePrice: 1350, name: 'Ronda Sur' },
  'san_basilio': { basePrice: 1450, name: 'San Basilio' },
  'patrono': { basePrice: 1250, name: 'Patrono' },
  'puente_tocinos': { basePrice: 1150, name: 'Puente Tocinos' },
  'alcantarilla': { basePrice: 1000, name: 'Alcantarilla' },
  'molina_segura': { basePrice: 1300, name: 'Molina de Segura' },
};

const PROPERTY_TYPES: Record<string, number> = {
  'piso': 1.0,
  'casa': 1.2,
  'chalet': 1.3,
  'atico': 1.15,
  'duplex': 1.1,
  'estudio': 0.9,
};

const CONDITIONS: Record<string, number> = {
  'nuevo': 1.15,
  'buen_estado': 1.05,
  'reformado': 1.1,
  'a_reformar': 0.85,
};

interface Extras {
  elevator: boolean;
  garage: boolean;
  terrace: boolean;
  pool: boolean;
  garden: boolean;
  storage: boolean;
  ac: boolean;
  heating: boolean;
}

const EXTRA_RATES: Record<keyof Extras, number> = {
  elevator: 0.04,
  garage: 0.08,
  terrace: 0.04,
  pool: 0.06,
  garden: 0.04,
  storage: 0.02,
  ac: 0.02,
  heating: 0.03,
};

function formatCurrency(val: number): string {
  return val.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20ac';
}

export default function PriceEstimator() {
  const [propertyType, setPropertyType] = useState('piso');
  const [zone, setZone] = useState('murcia_centro');
  const [sqm, setSqm] = useState(95);
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [age, setAge] = useState(15);
  const [condition, setCondition] = useState('buen_estado');
  const [extras, setExtras] = useState<Extras>({ elevator: false, garage: false, terrace: false, pool: false, garden: false, storage: false, ac: false, heating: false });

  const estimate = useMemo(() => {
    const zoneData = ZONES[zone];
    const typeFactor = PROPERTY_TYPES[propertyType];
    const basePrice = sqm * zoneData.basePrice * typeFactor;
    const conditionFactor = CONDITIONS[condition];

    const bedroomFactor = 1 + (bedrooms - 2) * 0.03;
    const bathroomFactor = 1 + (bathrooms - 1) * 0.04;
    const ageFactor = Math.max(0.7, 1 - age * 0.005);

    let extrasFactor = 0;
    Object.entries(extras).forEach(([key, val]) => {
      if (val) extrasFactor += EXTRA_RATES[key as keyof Extras];
    });

    const adjustedPrice = basePrice * conditionFactor * bedroomFactor * bathroomFactor * ageFactor;
    const finalPrice = adjustedPrice * (1 + extrasFactor);

    const minPrice = Math.round(finalPrice * 0.92);
    const maxPrice = Math.round(finalPrice * 1.08);
    const midPrice = Math.round(finalPrice);
    const pricePerSqm = Math.round(midPrice / sqm);

    // Confidence level
    const confidence = Math.min(95, 60 + (condition === 'nuevo' ? 15 : 0) + (age < 5 ? 10 : age < 20 ? 0 : -10) + (extras.elevator ? 5 : 0));

    const factors = [
      { name: 'Zona ' + zoneData.name, value: zoneData.basePrice * typeFactor, percent: `+${Math.round((typeFactor - 1) * 100)}%`, positive: true },
      { name: `${sqm} m2`, value: basePrice, percent: 'Base', positive: true },
      { name: `${bedrooms} hab., ${bathrooms} banos`, value: bedroomFactor * bathroomFactor * basePrice, percent: `+${Math.round((bedroomFactor * bathroomFactor - 1) * 100)}%`, positive: true },
      { name: 'Estado: ' + condition.replace('_', ' '), value: basePrice * conditionFactor, percent: `${Math.round((conditionFactor - 1) * 100)}%`, positive: conditionFactor >= 1 },
      { name: `Antiguedad: ${age} anos`, value: basePrice * ageFactor, percent: `${Math.round((ageFactor - 1) * 100)}%`, positive: ageFactor >= 1 },
      { name: 'Extras', value: basePrice * extrasFactor, percent: `+${Math.round(extrasFactor * 100)}%`, positive: true },
    ];

    // Mock comparable properties
    const comparables = [
      { ref: 'PRO-' + (1000 + Math.floor(Math.random() * 9000)), zone: zoneData.name, sqm: sqm + Math.floor(Math.random() * 20 - 10), price: Math.round(midPrice * (0.9 + Math.random() * 0.2)), pricePerSqm: Math.round(pricePerSqm * (0.9 + Math.random() * 0.2)) },
      { ref: 'PRO-' + (1000 + Math.floor(Math.random() * 9000)), zone: zoneData.name, sqm: sqm + Math.floor(Math.random() * 20 - 10), price: Math.round(midPrice * (0.85 + Math.random() * 0.3)), pricePerSqm: Math.round(pricePerSqm * (0.85 + Math.random() * 0.3)) },
      { ref: 'PRO-' + (1000 + Math.floor(Math.random() * 9000)), zone: zoneData.name, sqm: sqm + Math.floor(Math.random() * 15 - 7), price: Math.round(midPrice * (0.95 + Math.random() * 0.15)), pricePerSqm: Math.round(pricePerSqm * (0.95 + Math.random() * 0.15)) },
      { ref: 'PRO-' + (1000 + Math.floor(Math.random() * 9000)), zone: zoneData.name, sqm: sqm + Math.floor(Math.random() * 25 - 12), price: Math.round(midPrice * (0.88 + Math.random() * 0.25)), pricePerSqm: Math.round(pricePerSqm * (0.88 + Math.random() * 0.25)) },
    ];

    return { minPrice, maxPrice, midPrice, pricePerSqm, confidence, factors, comparables };
  }, [propertyType, zone, sqm, bedrooms, bathrooms, age, condition, extras]);

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0a1628' }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <DollarSign size={16} style={{ color: '#d4a853' }} />
        <span className="text-sm font-medium text-white">Estimador de Precios</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-4">
          {/* Inputs */}
          <div className="flex-1 flex flex-col gap-3 p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Caracteristicas</h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Tipo de propiedad</label>
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                {Object.keys(PROPERTY_TYPES).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Zona</label>
              <select value={zone} onChange={e => setZone(e.target.value)} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                {Object.entries(ZONES).map(([k, v]) => <option key={k} value={k}>{v.name} - {v.basePrice}\u20ac/m2</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#9ca3af' }}>m2</label>
                <input type="number" value={sqm} onChange={e => setSqm(Number(e.target.value))} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#9ca3af' }}>Hab.</label>
                <input type="number" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#9ca3af' }}>Banos</label>
                <input type="number" value={bathrooms} onChange={e => setBathrooms(Number(e.target.value))} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Antiguedad: {age} anos</label>
              <input type="range" min="0" max="100" value={age} onChange={e => setAge(Number(e.target.value))} className="w-full" style={{ accentColor: '#d4a853' }} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Estado</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                {Object.keys(CONDITIONS).map(c => <option key={c} value={c}>{c.replace('_', ' ').charAt(0).toUpperCase() + c.replace('_', ' ').slice(1)}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Extras</label>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(extras).map(([key, val]) => (
                  <button key={key} onClick={() => setExtras(prev => ({ ...prev, [key]: !prev[key as keyof Extras] }))} className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all" style={{ background: val ? 'rgba(212,168,83,0.2)' : '#1a2744', color: val ? '#d4a853' : '#9ca3af' }}>
                    {val ? '\u2611' : '\u2610'} {key === 'ac' ? 'Aire acond.' : key === 'heating' ? 'Calefaccion' : key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 flex flex-col gap-3 p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Estimacion</h3>

            <div className="text-center py-3">
              <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Rango estimado</p>
              <p className="text-lg font-bold" style={{ color: '#d4a853' }}>{formatCurrency(estimate.minPrice)} - {formatCurrency(estimate.maxPrice)}</p>
              <p className="text-sm mt-1" style={{ color: '#fff' }}>Punto medio: <span className="font-bold" style={{ color: '#d4a853' }}>{formatCurrency(estimate.midPrice)}</span></p>
              <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{estimate.pricePerSqm} \u20ac/m2</p>
            </div>

            {/* Confidence bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#9ca3af' }}>Confianza</span>
                <span className="text-xs font-medium" style={{ color: estimate.confidence > 75 ? '#22c55e' : estimate.confidence > 50 ? '#f59e0b' : '#ef4444' }}>
                  {estimate.confidence > 75 ? 'Alta' : estimate.confidence > 50 ? 'Media' : 'Baja'}
                </span>
              </div>
              <div style={{ height: 6, background: '#1a2744', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${estimate.confidence}%`, height: '100%', background: estimate.confidence > 75 ? '#22c55e' : estimate.confidence > 50 ? '#f59e0b' : '#ef4444', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Factors */}
            <div className="flex flex-col gap-1 mt-2">
              <p className="text-[10px] uppercase" style={{ color: '#6b7280' }}>Factores</p>
              {estimate.factors.map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#9ca3af' }}>{f.name}</span>
                  <span className="text-xs font-medium" style={{ color: f.positive ? '#22c55e' : '#ef4444' }}>{f.percent}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparables */}
        <div className="p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>Propiedades comparables vendidas recientemente</h3>
          <div className="flex gap-3 overflow-auto">
            {estimate.comparables.map((c, i) => (
              <div key={i} className="flex-shrink-0 p-3 rounded-md" style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.06)', width: 160 }}>
                <p className="text-xs font-medium text-white">{c.ref}</p>
                <p className="text-[10px]" style={{ color: '#6b7280' }}>{c.zone} | {c.sqm} m2</p>
                <p className="text-sm font-semibold mt-1" style={{ color: '#d4a853' }}>{formatCurrency(c.price)}</p>
                <p className="text-[10px]" style={{ color: '#6b7280' }}>{c.pricePerSqm} \u20ac/m2</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

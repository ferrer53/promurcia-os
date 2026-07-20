import { useState, useMemo } from 'react';
import { Flame, MapPin, TrendingUp, Euro, Home, BarChart3 } from 'lucide-react';

type ViewMode = 'price' | 'demand' | 'profitability' | 'growth';

interface ZoneData {
  name: string;
  pricePerM2: number;
  demand: number;
  profitability: number;
  growth: number;
  avgRent: number;
  propertyCount: number;
  topType: string;
}

const ZONE_DATA: Record<string, ZoneData> = {
  'murcia_centro': { name: 'Murcia Centro', pricePerM2: 2400, demand: 85, profitability: 5.2, growth: 4.2, avgRent: 1200, propertyCount: 142, topType: 'Piso' },
  'el_palmar': { name: 'El Palmar', pricePerM2: 1800, demand: 72, profitability: 6.1, growth: 2.8, avgRent: 950, propertyCount: 98, topType: 'Casa' },
  'alberca': { name: 'Alberca', pricePerM2: 1550, demand: 58, profitability: 6.8, growth: 2.2, avgRent: 800, propertyCount: 65, topType: 'Piso' },
  'espinardo': { name: 'Espinardo', pricePerM2: 1400, demand: 55, profitability: 7.2, growth: 1.5, avgRent: 750, propertyCount: 87, topType: 'Piso' },
  'churra': { name: 'Churra', pricePerM2: 1600, demand: 60, profitability: 6.5, growth: 2.1, avgRent: 850, propertyCount: 72, topType: 'Casa' },
  'la_flota': { name: 'La Flota', pricePerM2: 1750, demand: 68, profitability: 5.8, growth: 3.0, avgRent: 920, propertyCount: 54, topType: 'Piso' },
  'ronda_sur': { name: 'Ronda Sur', pricePerM2: 1650, demand: 62, profitability: 6.3, growth: 2.5, avgRent: 880, propertyCount: 61, topType: 'Piso' },
  'san_basilio': { name: 'San Basilio', pricePerM2: 1500, demand: 52, profitability: 7.0, growth: 1.8, avgRent: 780, propertyCount: 45, topType: 'Piso' },
  'patrono': { name: 'Patrono', pricePerM2: 1300, demand: 48, profitability: 7.5, growth: 1.2, avgRent: 680, propertyCount: 38, topType: 'Casa' },
  'puente_tocinos': { name: 'Puente Tocinos', pricePerM2: 1100, demand: 42, profitability: 8.1, growth: 0.8, avgRent: 550, propertyCount: 52, topType: 'Piso' },
  'alcantarilla': { name: 'Alcantarilla', pricePerM2: 1000, demand: 38, profitability: 8.5, growth: 0.5, avgRent: 480, propertyCount: 34, topType: 'Casa' },
  'molina_segura': { name: 'Molina de Segura', pricePerM2: 1300, demand: 50, profitability: 7.3, growth: 1.8, avgRent: 700, propertyCount: 78, topType: 'Piso' },
};

const ZONE_KEYS = Object.keys(ZONE_DATA);

function getColorForValue(value: number, min: number, max: number, mode: ViewMode): string {
  if (mode === 'growth') {
    if (value < 0) return `rgba(239,68,68,${0.3 + Math.abs(value) / 5 * 0.7})`;
    return `rgba(34,197,94,${0.3 + value / 5 * 0.7})`;
  }
  const ratio = (value - min) / (max - min);
  if (ratio < 0.2) return `rgba(59,130,246,${0.3 + ratio * 2})`;
  if (ratio < 0.4) return `rgba(6,182,212,${0.3 + (ratio - 0.2) * 2})`;
  if (ratio < 0.6) return `rgba(34,197,94,${0.3 + (ratio - 0.4) * 2})`;
  if (ratio < 0.8) return `rgba(245,158,11,${0.3 + (ratio - 0.6) * 2})`;
  return `rgba(239,68,68,${0.3 + (ratio - 0.8) * 2})`;
}

const MODE_LABELS: Record<ViewMode, string> = {
  price: 'Precio/m2',
  demand: 'Demanda',
  profitability: 'Rentabilidad',
  growth: 'Crecimiento',
};

export default function ZoneHeatmap() {
  const [mode, setMode] = useState<ViewMode>('price');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const modeValues = useMemo(() => {
    return ZONE_KEYS.map(k => {
      const d = ZONE_DATA[k];
      switch (mode) {
        case 'price': return d.pricePerM2;
        case 'demand': return d.demand;
        case 'profitability': return d.profitability;
        case 'growth': return d.growth;
      }
    });
  }, [mode]);

  const minVal = Math.min(...modeValues);
  const maxVal = Math.max(...modeValues);

  const stats = useMemo(() => {
    const zones = Object.values(ZONE_DATA);
    const prices = zones.map(z => z.pricePerM2);
    return {
      mostExpensive: zones[prices.indexOf(Math.max(...prices))],
      cheapest: zones[prices.indexOf(Math.min(...prices))],
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      avgGrowth: (zones.reduce((a, z) => a + z.growth, 0) / zones.length).toFixed(1),
    };
  }, []);

  const selectedData = selectedZone ? ZONE_DATA[selectedZone] : null;

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0a1628' }}>
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Flame size={16} style={{ color: '#d4a853' }} />
          <span className="text-sm font-medium text-white">Mapa de Calor de Zonas</span>
        </div>
        <div className="flex items-center gap-1">
          {(['price', 'demand', 'profitability', 'growth'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-2 py-1 rounded text-xs transition-all"
              style={{
                background: mode === m ? 'rgba(212,168,83,0.2)' : '#1a2744',
                color: mode === m ? '#d4a853' : '#9ca3af',
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 gap-4 p-4">
        {/* Map area */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex-1 rounded-lg p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Simplified zone grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, height: '100%' }}>
              {ZONE_KEYS.map((key, i) => {
                const data = ZONE_DATA[key];
                const value = modeValues[i];
                const bgColor = getColorForValue(value, minVal, maxVal, mode);
                const isSelected = selectedZone === key;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedZone(isSelected ? null : key)}
                    className="flex flex-col items-center justify-center gap-1 rounded-md transition-all hover:brightness-110"
                    style={{
                      background: bgColor,
                      border: isSelected ? '2px solid #d4a853' : '1px solid rgba(255,255,255,0.06)',
                      padding: 8,
                    }}
                  >
                    <span className="text-xs font-medium text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{data.name}</span>
                    <span className="text-xs font-bold" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {mode === 'price' ? `${data.pricePerM2}\u20ac/m2` : mode === 'demand' ? `${data.demand}%` : mode === 'profitability' ? `${data.profitability}%` : `${data.growth}%`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-[10px]" style={{ color: '#6b7280' }}>Bajo</span>
            <div className="flex-1 h-2 rounded-full" style={{
              background: mode === 'growth'
                ? 'linear-gradient(90deg, #ef4444, #22c55e)'
                : 'linear-gradient(90deg, #3b82f6, #06b6d4, #22c55e, #f59e0b, #ef4444)',
            }} />
            <span className="text-[10px]" style={{ color: '#6b7280' }}>Alto</span>
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3" style={{ width: 220 }}>
          {/* Stats */}
          <div className="p-3 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>Estadisticas</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: '#9ca3af' }}>Zona mas cara</span>
                <span className="text-xs font-medium text-white">{stats.mostExpensive.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: '#9ca3af' }}>Zona mas barata</span>
                <span className="text-xs font-medium text-white">{stats.cheapest.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: '#9ca3af' }}>Precio medio</span>
                <span className="text-xs font-medium" style={{ color: '#d4a853' }}>{stats.avgPrice}\u20ac/m2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: '#9ca3af' }}>Var. anual</span>
                <span className="text-xs font-medium" style={{ color: '#22c55e' }}>+{stats.avgGrowth}%</span>
              </div>
            </div>
          </div>

          {/* Zone detail */}
          {selectedData && (
            <div className="p-3 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.3)' }}>
              <h3 className="text-xs font-medium mb-2" style={{ color: '#d4a853' }}>{selectedData.name}</h3>
              <div className="flex flex-col gap-1.5">
                {[
                  { icon: <Euro size={10} />, label: 'Precio/m2', value: `${selectedData.pricePerM2}\u20ac/m2` },
                  { icon: <Home size={10} />, label: 'Alquiler medio', value: `${selectedData.avgRent}\u20ac/mes` },
                  { icon: <BarChart3 size={10} />, label: 'Demanda', value: `${selectedData.demand}/100` },
                  { icon: <TrendingUp size={10} />, label: 'Rentabilidad', value: `${selectedData.profitability}%` },
                  { icon: <TrendingUp size={10} />, label: 'Crecimiento', value: `${selectedData.growth}%` },
                  { icon: <Home size={10} />, label: 'Propiedades', value: `${selectedData.propertyCount}` },
                  { icon: <Home size={10} />, label: 'Tipo top', value: selectedData.topType },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1" style={{ color: '#6b7280' }}>{item.icon}<span className="text-[10px]">{item.label}</span></div>
                    <span className="text-[10px] font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedData && (
            <div className="p-3 rounded-lg text-center" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
              <MapPin size={20} style={{ color: '#6b7280', margin: '0 auto 8px' }} />
              <p className="text-[10px]" style={{ color: '#6b7280' }}>Haz click en una zona para ver detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

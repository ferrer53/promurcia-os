import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';

type CategoryId = 'longitud' | 'masa' | 'temperatura' | 'volumen' | 'area' | 'velocidad' | 'tiempo' | 'datos' | 'energia';

interface Unit {
  id: string;
  name: string;
  factor: number;
  offset?: number;
}

interface Category {
  id: CategoryId;
  name: string;
  units: Unit[];
}

const CATEGORIES: Category[] = [
  {
    id: 'longitud',
    name: 'Longitud',
    units: [
      { id: 'mm', name: 'Milimetros (mm)', factor: 0.001 },
      { id: 'cm', name: 'Centimetros (cm)', factor: 0.01 },
      { id: 'm', name: 'Metros (m)', factor: 1 },
      { id: 'km', name: 'Kilometros (km)', factor: 1000 },
      { id: 'in', name: 'Pulgadas (in)', factor: 0.0254 },
      { id: 'ft', name: 'Pies (ft)', factor: 0.3048 },
      { id: 'yd', name: 'Yardas (yd)', factor: 0.9144 },
      { id: 'mi', name: 'Millas (mi)', factor: 1609.344 },
    ],
  },
  {
    id: 'masa',
    name: 'Masa',
    units: [
      { id: 'mg', name: 'Miligramos (mg)', factor: 0.000001 },
      { id: 'g', name: 'Gramos (g)', factor: 0.001 },
      { id: 'kg', name: 'Kilogramos (kg)', factor: 1 },
      { id: 't', name: 'Toneladas (t)', factor: 1000 },
      { id: 'oz', name: 'Onzas (oz)', factor: 0.0283495 },
      { id: 'lb', name: 'Libras (lb)', factor: 0.453592 },
    ],
  },
  {
    id: 'temperatura',
    name: 'Temperatura',
    units: [
      { id: 'c', name: 'Celsius (°C)', factor: 1 },
      { id: 'f', name: 'Fahrenheit (°F)', factor: 1 },
      { id: 'k', name: 'Kelvin (K)', factor: 1 },
    ],
  },
  {
    id: 'volumen',
    name: 'Volumen',
    units: [
      { id: 'ml', name: 'Mililitros (ml)', factor: 0.001 },
      { id: 'l', name: 'Litros (l)', factor: 1 },
      { id: 'm3', name: 'Metros cubicos (m³)', factor: 1000 },
      { id: 'gal', name: 'Galones (gal)', factor: 3.78541 },
      { id: 'pt', name: 'Pintas (pt)', factor: 0.473176 },
      { id: 'fl', name: 'Onzas fluidas (fl oz)', factor: 0.0295735 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    units: [
      { id: 'm2', name: 'Metros cuadrados (m²)', factor: 1 },
      { id: 'km2', name: 'Kilometros cuadrados (km²)', factor: 1000000 },
      { id: 'ha', name: 'Hectareas (ha)', factor: 10000 },
      { id: 'ft2', name: 'Pies cuadrados (ft²)', factor: 0.092903 },
      { id: 'ac', name: 'Acres (ac)', factor: 4046.86 },
    ],
  },
  {
    id: 'velocidad',
    name: 'Velocidad',
    units: [
      { id: 'ms', name: 'Metros/segundo (m/s)', factor: 1 },
      { id: 'kmh', name: 'Kilometros/hora (km/h)', factor: 0.277778 },
      { id: 'mph', name: 'Millas/hora (mph)', factor: 0.44704 },
      { id: 'kn', name: 'Nudos (kn)', factor: 0.514444 },
    ],
  },
  {
    id: 'tiempo',
    name: 'Tiempo',
    units: [
      { id: 'ms', name: 'Milisegundos (ms)', factor: 0.001 },
      { id: 's', name: 'Segundos (s)', factor: 1 },
      { id: 'min', name: 'Minutos (min)', factor: 60 },
      { id: 'h', name: 'Horas (h)', factor: 3600 },
      { id: 'd', name: 'Dias', factor: 86400 },
      { id: 'wk', name: 'Semanas', factor: 604800 },
      { id: 'mo', name: 'Meses (30d)', factor: 2592000 },
      { id: 'y', name: 'Anos (365d)', factor: 31536000 },
    ],
  },
  {
    id: 'datos',
    name: 'Datos',
    units: [
      { id: 'b', name: 'Bytes (B)', factor: 1 },
      { id: 'kb', name: 'Kilobytes (KB)', factor: 1024 },
      { id: 'mb', name: 'Megabytes (MB)', factor: 1048576 },
      { id: 'gb', name: 'Gigabytes (GB)', factor: 1073741824 },
      { id: 'tb', name: 'Terabytes (TB)', factor: 1099511627776 },
      { id: 'pb', name: 'Petabytes (PB)', factor: 1125899906842624 },
    ],
  },
  {
    id: 'energia',
    name: 'Energia',
    units: [
      { id: 'j', name: 'Julios (J)', factor: 1 },
      { id: 'cal', name: 'Calorias (cal)', factor: 4.184 },
      { id: 'kcal', name: 'Kilocalorias (kcal)', factor: 4184 },
      { id: 'kwh', name: 'Kilovatios-hora (kWh)', factor: 3600000 },
      { id: 'btu', name: 'BTU', factor: 1055.06 },
    ],
  },
];

function convertTemp(value: number, from: string, to: string): number {
  let celsius = value;
  if (from === 'f') celsius = (value - 32) * 5 / 9;
  else if (from === 'k') celsius = value - 273.15;
  if (to === 'c') return celsius;
  if (to === 'f') return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

export default function Converter() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('longitud');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('ft');
  const [inputValue, setInputValue] = useState('1');

  const category = CATEGORIES.find(c => c.id === activeCategory)!;

  const result = useMemo(() => {
    const val = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(val)) return '---';

    if (activeCategory === 'temperatura') {
      const converted = convertTemp(val, fromUnit, toUnit);
      return converted.toLocaleString('es-ES', { maximumFractionDigits: 6 });
    }

    const fromFactor = category.units.find(u => u.id === fromUnit)?.factor || 1;
    const toFactor = category.units.find(u => u.id === toUnit)?.factor || 1;
    const baseValue = val * fromFactor;
    const converted = baseValue / toFactor;

    if (converted === 0) return '0';
    if (converted < 0.000001 || converted > 1e12) return converted.toExponential(4);
    return converted.toLocaleString('es-ES', { maximumFractionDigits: 10 }).replace(/\./g, ',').replace(/,/g, '.').replace(/\./, ',');
  }, [inputValue, fromUnit, toUnit, activeCategory, category]);

  const handleCategoryChange = (catId: CategoryId) => {
    setActiveCategory(catId);
    const cat = CATEGORIES.find(c => c.id === catId)!;
    setFromUnit(cat.units[0].id);
    setToUnit(cat.units[1]?.id || cat.units[0].id);
  };

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const formatFormula = () => {
    if (activeCategory === 'temperatura') {
      if (fromUnit === toUnit) return 'Valor sin cambio';
      if (fromUnit === 'c' && toUnit === 'f') return '(°C × 9/5) + 32 = °F';
      if (fromUnit === 'f' && toUnit === 'c') return '(°F - 32) × 5/9 = °C';
      if (fromUnit === 'c' && toUnit === 'k') return '°C + 273.15 = K';
      if (fromUnit === 'k' && toUnit === 'c') return 'K - 273.15 = °C';
      return 'Conversion de temperatura';
    }
    const from = category.units.find(u => u.id === fromUnit);
    const to = category.units.find(u => u.id === toUnit);
    if (!from || !to || from.factor === to.factor) return 'Valor sin cambio';
    const ratio = from.factor / to.factor;
    return `1 ${from.id} = ${ratio.toLocaleString('es-ES', { maximumFractionDigits: 6 })} ${to.id}`;
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628' }}>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 px-3 pt-3 pb-1 shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-[#d4a853] text-[#0a1628]'
                : 'text-gray-400 hover:bg-[#1a2744] hover:text-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Conversion area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md space-y-4">
          {/* From */}
          <div className="rounded-xl p-4" style={{ background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">De</label>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value.replace(/[^0-9.,\-]/g, ''))}
              className="w-full bg-transparent text-3xl text-[#d4a853] font-light outline-none mb-3"
              placeholder="0"
            />
            <select
              value={fromUnit}
              onChange={e => setFromUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm text-white outline-none cursor-pointer"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {category.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Swap */}
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="p-2 rounded-full bg-[#1a2744] text-[#d4a853] hover:bg-[#d4a853] hover:text-[#0a1628] transition-all duration-300 hover:rotate-180"
            >
              <ArrowUpDown size={18} />
            </button>
          </div>

          {/* To */}
          <div className="rounded-xl p-4" style={{ background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">A</label>
            <div className="w-full bg-transparent text-3xl text-white font-light mb-3 truncate" style={{ minHeight: 42 }}>
              {result}
            </div>
            <select
              value={toUnit}
              onChange={e => setToUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-md text-sm text-white outline-none cursor-pointer"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {category.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Formula */}
          <p className="text-center text-xs text-gray-600 mt-4">
            {formatFormula()}
          </p>
        </div>
      </div>
    </div>
  );
}

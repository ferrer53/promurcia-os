import { useState, useMemo } from 'react';
import { Activity, Info, ArrowRight } from 'lucide-react';

type BMICategory = 'bajo' | 'normal' | 'sobrepeso' | 'obesidad1' | 'obesidad2' | 'obesidad3';

interface BMIResult {
  value: number;
  category: BMICategory;
  label: string;
  color: string;
  tip: string;
}

const CATEGORIES: Record<BMICategory, { label: string; color: string; min: number; max: number }> = {
  bajo: { label: 'Bajo peso', color: '#3b82f6', min: 0, max: 18.5 },
  normal: { label: 'Peso normal', color: '#22c55e', min: 18.5, max: 25 },
  sobrepeso: { label: 'Sobrepeso', color: '#f59e0b', min: 25, max: 30 },
  obesidad1: { label: 'Obesidad I', color: '#e67e22', min: 30, max: 35 },
  obesidad2: { label: 'Obesidad II', color: '#ef4444', min: 35, max: 40 },
  obesidad3: { label: 'Obesidad III', color: '#dc2626', min: 40, max: 100 },
};

const TIPS: Record<BMICategory, string> = {
  bajo: 'Consulta con un nutricionista para aumentar tu peso de forma saludable. Prioriza alimentos ricos en nutrientes y proteinas.',
  normal: '¡Excelente! Manten una dieta equilibrada y haz ejercicio regularmente para conservar tu peso saludable.',
  sobrepeso: 'Considera adoptar habitos mas saludables: camina 30 minutos al dia, reduce azucares y aumenta frutas y verduras.',
  obesidad1: 'Es recomendable consultar con un profesional de la salud. Pequenos cambios en la dieta y ejercicio pueden marcar la diferencia.',
  obesidad2: 'Busca asesoramiento medico. Un plan estructurado de alimentacion y actividad fisica es importante para tu salud.',
  obesidad3: 'Es importante que consultes con un medico lo antes posible para recibir un plan de tratamiento adecuado.',
};

export default function BMI() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const result: BMIResult | null = useMemo(() => {
    const h = parseFloat(height) / 100; // cm to m
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const bmi = w / (h * h);
    let category: BMICategory = 'normal';
    if (bmi < 18.5) category = 'bajo';
    else if (bmi < 25) category = 'normal';
    else if (bmi < 30) category = 'sobrepeso';
    else if (bmi < 35) category = 'obesidad1';
    else if (bmi < 40) category = 'obesidad2';
    else category = 'obesidad3';
    const cat = CATEGORIES[category];
    return { value: bmi, category, label: cat.label, color: cat.color, tip: TIPS[category] };
  }, [height, weight]);

  // Gauge position (0-100%)
  const gaugePosition = useMemo(() => {
    if (!result) return 0;
    // Map BMI 15-45 to 0-100%
    const pct = ((result.value - 15) / (45 - 15)) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [result]);

  return (
    <div className="flex flex-col items-center h-full w-full overflow-auto py-8 px-4" style={{ background: '#0a1628', color: '#fff' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.15)' }}>
        <Activity size={18} color="#22c55e" />
      </div>
      <h2 className="text-lg font-bold mb-1">Calculadora IMC</h2>
      <p className="text-xs mb-6 text-center" style={{ color: '#6b7280' }}>Indice de Masa Corporal</p>

      {/* Inputs */}
      <div className="w-full max-w-xs space-y-4 mb-6">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9ca3af' }}>Altura (cm)</label>
          <input
            type="number"
            value={height}
            onChange={e => setHeight(e.target.value)}
            placeholder="Ej: 175"
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#9ca3af' }}>Peso (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            placeholder="Ej: 70"
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="w-full max-w-xs space-y-4">
          {/* BMI Value */}
          <div className="rounded-xl p-4 text-center" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: result.color }}>{result.value.toFixed(1)}</div>
            <div className="text-sm font-medium" style={{ color: result.color }}>{result.label}</div>
          </div>

          {/* Gauge */}
          <div className="rounded-xl p-4" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="relative h-3 rounded-full mb-2" style={{ background: '#1a2744' }}>
              {/* Colored segments */}
              <div className="absolute inset-0 rounded-full flex overflow-hidden">
                <div className="h-full" style={{ width: '15%', background: '#3b82f6' }} />
                <div className="h-full" style={{ width: '25%', background: '#22c55e' }} />
                <div className="h-full" style={{ width: '16.7%', background: '#f59e0b' }} />
                <div className="h-full" style={{ width: '16.7%', background: '#e67e22' }} />
                <div className="h-full" style={{ width: '16.7%', background: '#ef4444' }} />
                <div className="h-full flex-1" style={{ background: '#dc2626' }} />
              </div>
              {/* Indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all"
                style={{ left: `${gaugePosition}%`, transform: `translate(-50%, -50%)`, background: result.color }}
              />
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: '#4b5563' }}>
              <span>15</span>
              <span>18.5</span>
              <span>25</span>
              <span>30</span>
              <span>35</span>
              <span>40</span>
              <span>45</span>
            </div>
          </div>

          {/* Health tip */}
          <div className="rounded-xl p-4 flex gap-3" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <Info size={16} color="#22c55e" className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{result.tip}</p>
          </div>
        </div>
      )}

      {/* Categories reference */}
      <div className="w-full max-w-xs mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>Clasificacion</h3>
        <div className="space-y-1.5">
          {(Object.entries(CATEGORIES) as [BMICategory, typeof CATEGORIES[BMICategory]][]).map(([key, cat]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
              <span className="flex-1" style={{ color: '#d1d5db' }}>{cat.label}</span>
              <span style={{ color: '#4b5563' }}>{cat.min} - {cat.max === 100 ? '+' : cat.max}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div className="w-full max-w-xs mt-4 rounded-lg p-3 text-center" style={{ background: '#111d32' }}>
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Formula</div>
        <div className="text-xs font-mono" style={{ color: '#9ca3af' }}>IMC = peso (kg) / altura (m)²</div>
      </div>
    </div>
  );
}

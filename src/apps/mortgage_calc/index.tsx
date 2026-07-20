import { useState, useMemo, useCallback } from 'react';
import { Calculator, Save, Trash2, TrendingUp } from 'lucide-react';

interface MortgageResult {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  capital: number;
  months: number;
  taeg: number;
}

interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  capital: number;
  remaining: number;
}

interface SavedScenario {
  id: string;
  name: string;
  price: number;
  downPayment: number;
  rate: number;
  years: number;
  type: string;
  result: MortgageResult;
}

function calculateMortgage(price: number, downPayment: number, annualRate: number, years: number): { result: MortgageResult; schedule: AmortizationRow[] } {
  const capital = price - downPayment;
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;

  if (capital <= 0 || annualRate <= 0) {
    return {
      result: { monthlyPayment: capital / months, totalInterest: 0, totalCost: capital, capital, months, taeg: annualRate },
      schedule: Array.from({ length: months }, (_, i) => ({ month: i + 1, payment: capital / months, interest: 0, capital: capital / months, remaining: capital - (capital / months) * (i + 1) })),
    };
  }

  const monthlyPayment = capital * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const totalCost = monthlyPayment * months;
  const totalInterest = totalCost - capital;

  // Amortization schedule
  const schedule: AmortizationRow[] = [];
  let remaining = capital;
  for (let m = 1; m <= months; m++) {
    const interestPayment = remaining * monthlyRate;
    const capitalPayment = monthlyPayment - interestPayment;
    remaining -= capitalPayment;
    if (remaining < 0.01) remaining = 0;
    schedule.push({
      month: m,
      payment: monthlyPayment,
      interest: interestPayment,
      capital: capitalPayment,
      remaining,
    });
  }

  const taeg = annualRate + 0.2; // Simplified TAE calculation

  return {
    result: { monthlyPayment, totalInterest, totalCost, capital, months, taeg },
    schedule,
  };
}

function formatCurrency(val: number): string {
  return val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac';
}

function getSavedScenarios(): SavedScenario[] {
  try { const d = localStorage.getItem('promurciaos_mortgage_scenarios'); return d ? JSON.parse(d) : []; }
  catch { return []; }
}
function saveScenarios(scenarios: SavedScenario[]) {
  try { localStorage.setItem('promurciaos_mortgage_scenarios', JSON.stringify(scenarios)); } catch {}
}

export default function MortgageCalc() {
  const [price, setPrice] = useState(285000);
  const [downPayment, setDownPayment] = useState(57000);
  const [rate, setRate] = useState(3.25);
  const [years, setYears] = useState(30);
  const [mortgageType, setMortgageType] = useState('fija');
  const [showTable, setShowTable] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(getSavedScenarios);
  const [compareMode, setCompareMode] = useState(false);

  const { result, schedule } = useMemo(() => calculateMortgage(price, downPayment, rate, years), [price, downPayment, rate, years]);

  const yearlyData = useMemo(() => {
    const data: { year: number; interest: number; capital: number }[] = [];
    for (let y = 1; y <= years; y++) {
      const startMonth = (y - 1) * 12;
      const endMonth = y * 12;
      const yearRows = schedule.slice(startMonth, endMonth);
      data.push({
        year: y,
        interest: yearRows.reduce((s, r) => s + r.interest, 0),
        capital: yearRows.reduce((s, r) => s + r.capital, 0),
      });
    }
    return data;
  }, [schedule, years]);

  const maxBarVal = useMemo(() => {
    return Math.max(...yearlyData.map(d => d.interest + d.capital));
  }, [yearlyData]);

  const handleSaveScenario = useCallback(() => {
    const scenario: SavedScenario = {
      id: Date.now().toString(),
      name: `Escenario ${savedScenarios.length + 1}`,
      price, downPayment, rate, years, type: mortgageType, result,
    };
    const updated = [...savedScenarios, scenario].slice(0, 3);
    setSavedScenarios(updated);
    saveScenarios(updated);
  }, [price, downPayment, rate, years, mortgageType, result, savedScenarios]);

  const handleDeleteScenario = (id: string) => {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    saveScenarios(updated);
  };

  const chartHeight = 120;

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0a1628' }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Calculator size={16} style={{ color: '#d4a853' }} />
        <span className="text-sm font-medium text-white">Calculadora Hipotecaria</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Input + Results Row */}
        <div className="flex gap-4">
          {/* Inputs */}
          <div className="flex-1 flex flex-col gap-3 p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Datos de entrada</h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Precio del inmueble</label>
              <div className="flex items-center rounded-md overflow-hidden" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none" />
                <span className="px-3 text-xs" style={{ color: '#6b7280' }}>\u20ac</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Ahorro aportado</label>
              <div className="flex items-center rounded-md overflow-hidden" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none" />
                <span className="px-3 text-xs" style={{ color: '#6b7280' }}>\u20ac</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Tipo de interes (TIN) %</label>
              <div className="flex items-center rounded-md overflow-hidden" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input type="number" step="0.01" value={rate} onChange={e => setRate(Number(e.target.value))} className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none" />
                <span className="px-3 text-xs" style={{ color: '#6b7280' }}>%</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: '#9ca3af' }}>Plazo (años)</label>
              <input type="range" min="5" max="40" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full" style={{ accentColor: '#d4a853' }} />
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#6b7280' }}>{years} años</span>
                <span className="text-xs" style={{ color: '#6b7280' }}>{years * 12} meses</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setMortgageType('fija')} className="flex-1 py-1 rounded text-xs transition-all" style={{ background: mortgageType === 'fija' ? 'rgba(212,168,83,0.2)' : '#1a2744', color: mortgageType === 'fija' ? '#d4a853' : '#9ca3af' }}>Fija</button>
              <button onClick={() => setMortgageType('variable')} className="flex-1 py-1 rounded text-xs transition-all" style={{ background: mortgageType === 'variable' ? 'rgba(212,168,83,0.2)' : '#1a2744', color: mortgageType === 'variable' ? '#d4a853' : '#9ca3af' }}>Variable</button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 flex flex-col gap-3 p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Resultado</h3>

            <div className="text-center py-3">
              <p className="text-xs mb-1" style={{ color: '#6b7280' }}>Cuota mensual estimada</p>
              <p className="text-3xl font-extrabold" style={{ color: '#d4a853' }}>{formatCurrency(result.monthlyPayment)}</p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { label: 'Total intereses', value: result.totalInterest, color: '#f59e0b' },
                { label: 'Coste total', value: result.totalCost, color: '#ef4444' },
                { label: 'Capital financiado', value: result.capital, color: '#3b82f6' },
                { label: 'TAE', value: result.taeg.toFixed(2) + '%', color: '#9ca3af', isText: true },
                { label: 'Duracion', value: result.months + ' meses', color: '#9ca3af', isText: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md" style={{ background: '#0a1628' }}>
                  <span className="text-xs" style={{ color: '#6b7280' }}>{item.label}</span>
                  <span className="text-sm font-semibold" style={{ color: item.color }}>{item.isText ? item.value : formatCurrency(item.value as number)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveScenario} className="flex items-center justify-center gap-1 flex-1 py-2 rounded-md text-xs font-medium transition-all" style={{ background: '#d4a853', color: '#0a1628' }}>
                <Save size={12} /> Guardar
              </button>
              <button onClick={() => setCompareMode(!compareMode)} className="flex items-center justify-center gap-1 flex-1 py-2 rounded-md text-xs font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                <TrendingUp size={12} /> Comparar
              </button>
            </div>
          </div>
        </div>

        {/* Comparison */}
        {compareMode && savedScenarios.length > 0 && (
          <div className="p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>Comparacion de escenarios</h3>
            <div className="flex gap-3 overflow-auto">
              {savedScenarios.map(s => (
                <div key={s.id} className="flex-shrink-0 p-3 rounded-md" style={{ background: '#0a1628', border: '1px solid rgba(255,255,255,0.06)', width: 180 }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white">{s.name}</span>
                    <button onClick={() => handleDeleteScenario(s.id)} className="transition-all" style={{ color: '#6b7280' }}><Trash2 size={10} /></button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs" style={{ color: '#6b7280' }}>Precio: {formatCurrency(s.price)}</span>
                    <span className="text-xs" style={{ color: '#6b7280' }}>Entrada: {formatCurrency(s.downPayment)}</span>
                    <span className="text-xs" style={{ color: '#6b7280' }}>Interes: {s.rate}%</span>
                    <span className="text-xs" style={{ color: '#6b7280' }}>Plazo: {s.years} años</span>
                    <span className="text-sm font-semibold mt-1" style={{ color: '#d4a853' }}>Cuota: {formatCurrency(s.result.monthlyPayment)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>Grafico de amortizacion (Capital vs Intereses / año)</h3>
          <div className="flex items-end gap-1" style={{ height: chartHeight + 30 }}>
            {yearlyData.slice(0, Math.min(years, 30)).map((d, i) => {
              const h = maxBarVal > 0 ? (d.capital + d.interest) / maxBarVal * chartHeight : 0;
              const capH = maxBarVal > 0 ? d.capital / (d.capital + d.interest) * h : 0;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className="flex flex-col w-full" style={{ height: h }}>
                    <div style={{ height: h - capH, background: '#1a2744', borderRadius: '2px 2px 0 0' }} />
                    <div style={{ height: capH, background: '#d4a853', borderRadius: '0 0 2px 2px' }} />
                  </div>
                  {i % 5 === 0 && <span className="text-[9px] mt-1" style={{ color: '#6b7280' }}>{d.year}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1"><div style={{ width: 10, height: 10, background: '#d4a853', borderRadius: 2 }} /><span className="text-xs" style={{ color: '#6b7280' }}>Capital</span></div>
            <div className="flex items-center gap-1"><div style={{ width: 10, height: 10, background: '#1a2744', borderRadius: 2 }} /><span className="text-xs" style={{ color: '#6b7280' }}>Intereses</span></div>
          </div>
        </div>

        {/* Amortization table toggle */}
        <button
          onClick={() => setShowTable(!showTable)}
          className="w-full py-2 rounded-md text-xs font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
        >
          {showTable ? 'Ocultar' : 'Ver'} tabla de amortizacion ({schedule.length} meses)
        </button>

        {showTable && (
          <div className="rounded-lg overflow-hidden" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)', maxHeight: 400, overflowY: 'auto' }}>
            <table className="w-full text-xs">
              <thead style={{ background: '#1a2744', position: 'sticky', top: 0 }}>
                <tr>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#6b7280' }}>Mes</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Cuota</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Intereses</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Capital</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Pendiente</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                    <td className="px-3 py-1.5 text-white">{row.month}</td>
                    <td className="px-3 py-1.5 text-right text-white">{formatCurrency(row.payment)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#f59e0b' }}>{formatCurrency(row.interest)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#22c55e' }}>{formatCurrency(row.capital)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#3b82f6' }}>{formatCurrency(row.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

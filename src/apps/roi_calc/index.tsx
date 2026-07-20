import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

interface ROIDetails {
  grossYield: number;
  netYield: number;
  cashOnCash: number;
  monthlyCashflow: number;
  paybackYears: number;
  annualIncome: number;
  annualExpenses: number;
  roi5: number;
  roi10: number;
  roi15: number;
  roi20: number;
}

interface YearProjection {
  year: number;
  income: number;
  expenses: number;
  netCashflow: number;
  cumulativeROI: number;
  propertyValue: number;
}

function formatCurrency(val: number): string {
  return val.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20ac';
}

function formatPercent(val: number): string {
  return val.toFixed(2) + '%';
}

export default function ROICalc() {
  const [purchasePrice, setPurchasePrice] = useState(150000);
  const [renovationCost, setRenovationCost] = useState(5000);
  const [purchaseExpenses, setPurchaseExpenses] = useState(15000);
  const [monthlyRent, setMonthlyRent] = useState(900);
  const [monthlyExpenses, setMonthlyExpenses] = useState(250);
  const [vacancyRate, setVacancyRate] = useState(5);
  const [taxRate] = useState(19);
  const [appreciationRate, setAppreciationRate] = useState(3);
  const [financed, setFinanced] = useState(false);
  const [downPayment, setDownPayment] = useState(30000);
  const [monthlyMortgage, setMonthlyMortgage] = useState(450);

  const totalInvestment = purchasePrice + renovationCost + purchaseExpenses;
  const cashInvested = financed ? downPayment + renovationCost + purchaseExpenses : totalInvestment;

  const results: ROIDetails = useMemo(() => {
    const annualRent = monthlyRent * 12;
    const effectiveRent = annualRent * (1 - vacancyRate / 100);
    const annualExp = monthlyExpenses * 12;
    const annualMortgage = financed ? monthlyMortgage * 12 : 0;
    const taxableIncome = effectiveRent - annualExp - annualMortgage;
    const taxes = Math.max(0, taxableIncome * (taxRate / 100));
    const netIncome = effectiveRent - annualExp - annualMortgage - taxes;
    const monthlyCashflow = netIncome / 12;

    const grossYield = (effectiveRent / totalInvestment) * 100;
    const netYield = totalInvestment > 0 ? (netIncome / totalInvestment) * 100 : 0;
    const cashOnCash = cashInvested > 0 ? (netIncome / cashInvested) * 100 : 0;
    const paybackYears = netIncome > 0 ? cashInvested / netIncome : 0;

    const roi5 = cashInvested > 0 ? (((purchasePrice * Math.pow(1 + appreciationRate / 100, 5)) - purchasePrice + netIncome * 5) / cashInvested) * 100 : 0;
    const roi10 = cashInvested > 0 ? (((purchasePrice * Math.pow(1 + appreciationRate / 100, 10)) - purchasePrice + netIncome * 10) / cashInvested) * 100 : 0;
    const roi15 = cashInvested > 0 ? (((purchasePrice * Math.pow(1 + appreciationRate / 100, 15)) - purchasePrice + netIncome * 15) / cashInvested) * 100 : 0;
    const roi20 = cashInvested > 0 ? (((purchasePrice * Math.pow(1 + appreciationRate / 100, 20)) - purchasePrice + netIncome * 20) / cashInvested) * 100 : 0;

    return {
      grossYield, netYield, cashOnCash, monthlyCashflow,
      paybackYears, annualIncome: effectiveRent, annualExpenses: annualExp + annualMortgage + taxes,
      roi5, roi10, roi15, roi20,
    };
  }, [purchasePrice, renovationCost, purchaseExpenses, monthlyRent, monthlyExpenses, vacancyRate, taxRate, appreciationRate, financed, downPayment, monthlyMortgage, totalInvestment, cashInvested]);

  const projections: YearProjection[] = useMemo(() => {
    const list: YearProjection[] = [];
    let cumulativeCF = 0;
    for (let y = 1; y <= 20; y++) {
      const income = monthlyRent * 12 * Math.pow(1 + appreciationRate / 100 * 0.3, y - 1) * (1 - vacancyRate / 100);
      const expenses = monthlyExpenses * 12 * Math.pow(1.02, y - 1) + (financed ? monthlyMortgage * 12 : 0);
      const netCF = income - expenses - Math.max(0, (income - expenses) * (taxRate / 100));
      cumulativeCF += netCF;
      const propVal = purchasePrice * Math.pow(1 + appreciationRate / 100, y);
      list.push({ year: y, income, expenses, netCashflow: netCF, cumulativeROI: (cumulativeCF / cashInvested) * 100, propertyValue: propVal });
    }
    return list;
  }, [purchasePrice, monthlyRent, monthlyExpenses, vacancyRate, taxRate, appreciationRate, financed, monthlyMortgage, cashInvested]);

  const maxProjVal = Math.max(...projections.map(p => Math.max(p.cumulativeROI, (p.propertyValue - purchasePrice) / purchasePrice * 100)));

  const gaugePosition = Math.min(100, (results.netYield / 15) * 100);

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#0a1628' }}>
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <TrendingUp size={16} style={{ color: '#d4a853' }} />
        <span className="text-sm font-medium text-white">Calculadora ROI Inmobiliario</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-4">
          {/* Inputs */}
          <div className="flex-1 flex flex-col gap-3 p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Datos de la inversion</h3>
            {[
              { label: 'Precio de compra', value: purchasePrice, setter: setPurchasePrice, unit: '\u20ac' },
              { label: 'Reforma', value: renovationCost, setter: setRenovationCost, unit: '\u20ac' },
              { label: 'Gastos de compra', value: purchaseExpenses, setter: setPurchaseExpenses, unit: '\u20ac', hint: `((${(purchaseExpenses / purchasePrice * 100).toFixed(0)}%)` },
              { label: 'Alquiler mensual', value: monthlyRent, setter: setMonthlyRent, unit: '\u20ac/mes' },
              { label: 'Gastos mensuales', value: monthlyExpenses, setter: setMonthlyExpenses, unit: '\u20ac/mes' },
            ].map((field, i) => (
              <div key={i} className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#9ca3af' }}>{field.label} {field.hint && <span style={{ color: '#6b7280' }}>{field.hint}</span>}</label>
                <div className="flex items-center rounded-md overflow-hidden" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input type="number" value={field.value} onChange={e => field.setter(Number(e.target.value))} className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none" />
                  <span className="px-3 text-xs" style={{ color: '#6b7280' }}>{field.unit}</span>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#9ca3af' }}>Vacancia %</label>
                <input type="number" value={vacancyRate} onChange={e => setVacancyRate(Number(e.target.value))} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs" style={{ color: '#9ca3af' }}>Revalorizacion %</label>
                <input type="number" value={appreciationRate} onChange={e => setAppreciationRate(Number(e.target.value))} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFinanced(!financed)} className="flex items-center gap-1 px-3 py-1 rounded text-xs transition-all" style={{ background: financed ? 'rgba(212,168,83,0.2)' : '#1a2744', color: financed ? '#d4a853' : '#9ca3af' }}>
                Hipoteca: {financed ? 'Si' : 'No'}
              </button>
            </div>
            {financed && (
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#9ca3af' }}>Entrada</label>
                  <input type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#9ca3af' }}>Cuota hipoteca</label>
                  <input type="number" value={monthlyMortgage} onChange={e => setMonthlyMortgage(Number(e.target.value))} className="rounded-md text-white text-sm px-3 py-2 outline-none" style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 flex flex-col gap-3 p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: '#6b7280' }}>Resultados</h3>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Rentabilidad bruta', value: formatPercent(results.grossYield), color: '#d4a853' },
                { label: 'Rentabilidad neta', value: formatPercent(results.netYield), color: '#22c55e' },
                { label: 'Cash-on-cash', value: formatPercent(results.cashOnCash), color: '#06b6d4' },
                { label: 'Cashflow mensual', value: formatCurrency(results.monthlyCashflow), color: results.monthlyCashflow >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Payback (anos)', value: results.paybackYears.toFixed(1), color: '#3b82f6' },
                { label: 'Inversion total', value: formatCurrency(totalInvestment), color: '#9ca3af' },
              ].map((item, i) => (
                <div key={i} className="p-2 rounded-md" style={{ background: '#0a1628' }}>
                  <p className="text-[10px] uppercase" style={{ color: '#6b7280' }}>{item.label}</p>
                  <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* ROI Scale */}
            <div className="mt-2">
              <p className="text-[10px] uppercase mb-1" style={{ color: '#6b7280' }}>Escala de rentabilidad</p>
              <div className="relative" style={{ height: 14, background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #d4a853)', borderRadius: 7 }}>
                <div className="absolute" style={{ left: `${gaugePosition}%`, top: -3, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #fff' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: '#6b7280' }}>0%</span>
                <span className="text-[9px]" style={{ color: '#6b7280' }}>7.5%</span>
                <span className="text-[9px]" style={{ color: '#6b7280' }}>15%+</span>
              </div>
            </div>

            {/* ROI projections */}
            <div className="flex flex-col gap-1 mt-2">
              <p className="text-[10px] uppercase" style={{ color: '#6b7280' }}>ROI a largo plazo</p>
              {[
                { label: '5 anos', value: results.roi5 },
                { label: '10 anos', value: results.roi10 },
                { label: '15 anos', value: results.roi15 },
                { label: '20 anos', value: results.roi20 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#9ca3af' }}>{item.label}</span>
                  <span className="text-xs font-semibold" style={{ color: '#d4a853' }}>{formatPercent(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 20-year projection chart */}
        <div className="p-4 rounded-lg" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>Proyeccion a 20 anos</h3>
          <svg viewBox="0 0 600 150" className="w-full" style={{ height: 150 }}>
            {/* Grid lines */}
            {[0, 50, 100, 150].map(y => (
              <line key={y} x1="0" y1={150 - y} x2="600" y2={150 - y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
            {/* Cumulative ROI line */}
            <polyline
              fill="none"
              stroke="#d4a853"
              strokeWidth="2"
              points={projections.map((p, i) => `${(i / 19) * 580 + 10},${150 - (p.cumulativeROI / Math.max(maxProjVal, 100)) * 140}`).join(' ')}
            />
            {/* Property appreciation line */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={projections.map((p, i) => `${(i / 19) * 580 + 10},${150 - ((p.propertyValue - purchasePrice) / purchasePrice * 100 / Math.max(maxProjVal, 100)) * 140}`).join(' ')}
            />
            {/* Year labels */}
            {[0, 5, 10, 15, 19].map(i => (
              <text key={i} x={(i / 19) * 580 + 10} y="148" textAnchor="middle" fill="#6b7280" fontSize="8">{projections[i]?.year}</text>
            ))}
          </svg>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1"><div style={{ width: 12, height: 3, background: '#d4a853', borderRadius: 1 }} /><span className="text-[10px]" style={{ color: '#6b7280' }}>ROI acumulado</span></div>
            <div className="flex items-center gap-1"><div style={{ width: 12, height: 3, background: '#3b82f6', borderRadius: 1 }} /><span className="text-[10px]" style={{ color: '#6b7280' }}>Revalorizacion</span></div>
          </div>
        </div>

        {/* 10-year table */}
        <div className="rounded-lg overflow-hidden" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="overflow-auto" style={{ maxHeight: 300 }}>
            <table className="w-full text-xs">
              <thead style={{ background: '#1a2744', position: 'sticky', top: 0 }}>
                <tr>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#6b7280' }}>Ano</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Ingresos</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Gastos</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Flujo neto</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>ROI acum.</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: '#6b7280' }}>Valor prop.</th>
                </tr>
              </thead>
              <tbody>
                {projections.slice(0, 10).map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                    <td className="px-3 py-1.5 text-white">{p.year}</td>
                    <td className="px-3 py-1.5 text-right text-white">{formatCurrency(p.income)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#ef4444' }}>{formatCurrency(p.expenses)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: p.netCashflow >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(p.netCashflow)}</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#d4a853' }}>{p.cumulativeROI.toFixed(1)}%</td>
                    <td className="px-3 py-1.5 text-right" style={{ color: '#3b82f6' }}>{formatCurrency(p.propertyValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

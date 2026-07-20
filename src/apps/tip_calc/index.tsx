import { Banknote } from 'lucide-react';

export default function TipCalc() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: '#0a1628', minHeight: 300 }}>
      <div
        className="flex items-center justify-center rounded-2xl mb-4"
        style={{ width: 80, height: 80, background: 'rgba(34, 197, 94, 0.15)' }}
      >
        <Banknote size={40} color="Banknote_COLOR" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Calculadora de Propinas</h2>
      <p className="text-sm text-gray-400 text-center max-w-sm">
        Calculo de propinas
      </p>
      <div className="mt-4 px-4 py-2 rounded-full text-xs" style={{ background: 'rgba(212,168,83,0.1)', color: '#d4a853' }}>
        En construccion
      </div>
    </div>
  );
}

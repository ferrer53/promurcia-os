import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Delete, RotateCcw } from 'lucide-react';

interface HistoryItem {
  expression: string;
  result: string;
}

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [previous, setPrevious] = useState('');
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [scientificMode, setScientificMode] = useState(false);
  const [memory, setMemory] = useState(0);
  const displayRef = useRef<HTMLDivElement>(null);

  const formatNumber = (num: number): string => {
    if (isNaN(num) || !isFinite(num)) return 'Error';
    if (Math.abs(num) > 1e15) return num.toExponential(10);
    const str = num.toLocaleString('es-ES', { maximumFractionDigits: 10 });
    return str;
  };

  const calculate = (left: number, right: number, op: string): number => {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '×': return left * right;
      case '÷': return right === 0 ? NaN : left / right;
      case '^': return Math.pow(left, right);
      default: return right;
    }
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display.replace(/\./g, '').replace(',', '.'));
    if (previous === '') {
      setPrevious(display);
      setOperator(nextOperator);
      setWaitingForOperand(true);
      return;
    }
    const prevValue = parseFloat(previous.replace(/\./g, '').replace(',', '.'));
    const result = calculate(prevValue, inputValue, operator || '+');
    const formatted = formatNumber(result);
    setHistory(h => [{ expression: `${previous} ${operator} ${display}`, result: formatted }, ...h].slice(0, 20));
    setDisplay(formatted);
    setPrevious(formatted);
    setOperator(nextOperator);
    setWaitingForOperand(true);
  };

  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0,');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(',')) {
      setDisplay(display + ',');
    }
  };

  const handleEquals = () => {
    if (!operator || previous === '') return;
    const inputValue = parseFloat(display.replace(/\./g, '').replace(',', '.'));
    const prevValue = parseFloat(previous.replace(/\./g, '').replace(',', '.'));
    const result = calculate(prevValue, inputValue, operator);
    const formatted = formatNumber(result);
    setHistory(h => [{ expression: `${previous} ${operator} ${display}`, result: formatted }, ...h].slice(0, 20));
    setDisplay(formatted);
    setPrevious('');
    setOperator(null);
    setWaitingForOperand(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevious('');
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleClearEntry = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const handlePercent = () => {
    const value = parseFloat(display.replace(/\./g, '').replace(',', '.'));
    setDisplay(formatNumber(value / 100));
  };

  const handleToggleSign = () => {
    const value = parseFloat(display.replace(/\./g, '').replace(',', '.'));
    setDisplay(formatNumber(-value));
  };

  const handleScientific = (fn: string) => {
    const value = parseFloat(display.replace(/\./g, '').replace(',', '.'));
    let result = 0;
    switch (fn) {
      case 'sin': result = Math.sin(value); break;
      case 'cos': result = Math.cos(value); break;
      case 'tan': result = Math.tan(value); break;
      case 'log': result = Math.log10(value); break;
      case 'ln': result = Math.log(value); break;
      case 'sqrt': result = Math.sqrt(value); break;
      case 'square': result = value * value; break;
      case '1/x': result = 1 / value; break;
      case 'pi': setDisplay(formatNumber(Math.PI)); setWaitingForOperand(false); return;
      case 'e': setDisplay(formatNumber(Math.E)); setWaitingForOperand(false); return;
      case 'fact':
        result = 1;
        for (let i = 2; i <= Math.floor(value); i++) result *= i;
        break;
      default: return;
    }
    setDisplay(formatNumber(result));
    setWaitingForOperand(true);
  };

  const handleMemory = (action: string) => {
    const value = parseFloat(display.replace(/\./g, '').replace(',', '.'));
    switch (action) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplay(formatNumber(memory)); setWaitingForOperand(true); break;
      case 'M+': setMemory(memory + value); break;
      case 'M-': setMemory(memory - value); break;
      case 'MS': setMemory(value); break;
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
    else if (e.key === '.') handleDecimal();
    else if (e.key === ',') handleDecimal();
    else if (e.key === '+') performOperation('+');
    else if (e.key === '-') performOperation('-');
    else if (e.key === '*') performOperation('×');
    else if (e.key === '/') { e.preventDefault(); performOperation('÷'); }
    else if (e.key === 'Enter' || e.key === '=') handleEquals();
    else if (e.key === 'Escape') handleClear();
    else if (e.key === 'Backspace') handleBackspace();
    else if (e.key === '%') handlePercent();
    else if (e.key === '(') { setDisplay(display === '0' ? '(' : display + '('); setWaitingForOperand(false); }
    else if (e.key === ')') { setDisplay(display + ')'); setWaitingForOperand(false); }
  }, [display, waitingForOperand, operator, previous]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const btnBase = 'flex items-center justify-center rounded-lg text-lg font-medium select-none transition-all duration-100 active:scale-95';
  const numStyle = `${btnBase} bg-[#1a2744] text-white hover:brightness-125`;
  const opStyle = `${btnBase} bg-[#111d32] text-[#d4a853] hover:brightness-125`;
  const fnStyle = `${btnBase} bg-[#111d32] text-gray-400 hover:brightness-125`;
  const eqStyle = `${btnBase} bg-[#d4a853] text-[#0a1628] font-bold hover:brightness-110`;
  const sciStyle = `${btnBase} bg-[#1a2744] text-gray-300 text-xs hover:brightness-125`;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a1628' }}>
      {/* Display */}
      <div className="shrink-0 p-4 pb-2" style={{ background: '#0d1b2a' }}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setScientificMode(!scientificMode)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-[#d4a853] hover:bg-[#1a2744] transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${scientificMode ? 'rotate-180' : ''}`} />
            {scientificMode ? 'Estandar' : 'Cientifica'}
          </button>
          <span className="text-xs text-gray-500">{memory !== 0 ? `M: ${formatNumber(memory)}` : ''}</span>
        </div>
        <div ref={displayRef} className="text-right mb-1" style={{ minHeight: 24 }}>
          <span className="text-sm text-gray-500">
            {previous} {operator}
          </span>
        </div>
        <div className="text-right text-white text-4xl font-light tracking-tight" style={{ fontSize: 42 }}>
          {display}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="shrink-0 px-4 py-2 overflow-y-auto" style={{ maxHeight: 80, background: '#0d1b2a', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {history.slice(0, 5).map((h, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-500 mb-0.5">
              <span className="truncate mr-2">{h.expression} =</span>
              <span className="text-[#d4a853] shrink-0">{h.result}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scientific Buttons */}
      {scientificMode && (
        <div className="shrink-0 px-2 pt-2">
          <div className="grid grid-cols-5 gap-1 mb-1">
            {['sin', 'cos', 'tan', 'log', 'ln'].map(fn => (
              <button key={fn} onClick={() => handleScientific(fn)} className={sciStyle} style={{ height: 36 }}>
                {fn}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 mb-1">
            {[
              { label: 'x²', fn: 'square' },
              { label: '√x', fn: 'sqrt' },
              { label: '1/x', fn: '1/x' },
              { label: 'n!', fn: 'fact' },
              { label: 'x^y', fn: '^' },
            ].map(item => (
              <button key={item.label} onClick={() => item.fn === '^' ? performOperation('^') : handleScientific(item.fn)} className={sciStyle} style={{ height: 36 }}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 mb-1">
            {['(', ')', 'π', 'e', 'MC'].map(label => (
              <button key={label} onClick={() => {
                if (label === 'MC') handleMemory('MC');
                else if (label === 'π') handleScientific('pi');
                else if (label === 'e') handleScientific('e');
                else if (label === '(') { setDisplay(display === '0' ? '(' : display + '('); setWaitingForOperand(false); }
                else if (label === ')') { setDisplay(display + ')'); setWaitingForOperand(false); }
              }} className={sciStyle} style={{ height: 36 }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Memory row */}
      <div className="shrink-0 px-2 pt-1">
        <div className="grid grid-cols-5 gap-1">
          {['MC', 'MR', 'M+', 'M-', 'MS'].map(m => (
            <button key={m} onClick={() => handleMemory(m)} className={`${btnBase} text-xs text-gray-500 hover:text-gray-300 hover:bg-[#1a2744]`} style={{ height: 28 }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Main keypad */}
      <div className="flex-1 p-2">
        <div className="grid grid-cols-4 gap-1 h-full">
          <button onClick={handlePercent} className={fnStyle}>%</button>
          <button onClick={handleClearEntry} className={fnStyle}>CE</button>
          <button onClick={handleClear} className={fnStyle}><RotateCcw size={16} /></button>
          <button onClick={handleBackspace} className={fnStyle}><Delete size={16} /></button>

          <button onClick={() => handleScientific('1/x')} className={fnStyle}>1/x</button>
          <button onClick={() => handleScientific('square')} className={fnStyle}>x²</button>
          <button onClick={() => handleScientific('sqrt')} className={fnStyle}>√x</button>
          <button onClick={() => performOperation('÷')} className={opStyle}>÷</button>

          <button onClick={() => handleNumber('7')} className={numStyle}>7</button>
          <button onClick={() => handleNumber('8')} className={numStyle}>8</button>
          <button onClick={() => handleNumber('9')} className={numStyle}>9</button>
          <button onClick={() => performOperation('×')} className={opStyle}>×</button>

          <button onClick={() => handleNumber('4')} className={numStyle}>4</button>
          <button onClick={() => handleNumber('5')} className={numStyle}>5</button>
          <button onClick={() => handleNumber('6')} className={numStyle}>6</button>
          <button onClick={() => performOperation('-')} className={opStyle}>−</button>

          <button onClick={() => handleNumber('1')} className={numStyle}>1</button>
          <button onClick={() => handleNumber('2')} className={numStyle}>2</button>
          <button onClick={() => handleNumber('3')} className={numStyle}>3</button>
          <button onClick={() => performOperation('+')} className={opStyle}>+</button>

          <button onClick={handleToggleSign} className={numStyle}>±</button>
          <button onClick={() => handleNumber('0')} className={numStyle}>0</button>
          <button onClick={handleDecimal} className={numStyle}>,</button>
          <button onClick={handleEquals} className={eqStyle}>=</button>
        </div>
      </div>
    </div>
  );
}

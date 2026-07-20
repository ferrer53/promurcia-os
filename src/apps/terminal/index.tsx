import { useState, useEffect, useRef, useCallback } from 'react';
import { VirtualFileSystem } from './virtualFS';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  text: string;
}

const COMMANDS = [
  'help', 'ls', 'cd', 'pwd', 'mkdir', 'touch', 'cat', 'echo', 'clear',
  'whoami', 'date', 'calc', 'neofetch', 'weather', 'fortune', 'banner', 'rm', 'rmdir', 'matrix'
];

const SPANISH_QUOTES = [
  'El que no arriesga, no gana.',
  'No hay mal que por bien no venga.',
  'Poco a poco, se anda lejos.',
  'El conocimiento es poder.',
  'A quien madruga, Dios le ayuda.',
  'No dejes para manana lo que puedas hacer hoy.',
  'El que persevera, alcanza.',
  'Mas vale prevenir que lamentar.',
  'En la variedad esta el gusto.',
  'Quien mucho abarca, poco aprieta.',
  'La practica hace al maestro.',
  'Dime con quien andas y te dire quien eres.',
  'Cada loco con su tema.',
  'No hay peor ciego que el que no quiere ver.',
  'Al mal tiempo, buena cara.',
  'En casa del herrero, cuchillo de palo.',
  'El mundo es un panuelo.',
  'Cría fama y échate a dormir.',
];

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [matrixMode, setMatrixMode] = useState(false);
  const vfsRef = useRef(new VirtualFileSystem());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { type, text }]);
  }, []);

  useEffect(() => {
    if (lines.length === 0) {
      addLine('info', 'PromurciaOS Terminal v2.0');
      addLine('info', 'Escribe "help" para ver los comandos disponibles.');
      addLine('output', '');
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  const prompt = `usuario@promurcia-os:${vfsRef.current.getPath()}$`;

  const handleCommand = useCallback((cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    addLine('input', `${prompt} ${trimmed}`);
    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help': {
        addLine('info', 'Comandos disponibles:');
        addLine('output', '  help          - Muestra esta ayuda');
        addLine('output', '  ls [dir]      - Lista archivos y carpetas');
        addLine('output', '  cd <dir>      - Cambia de directorio');
        addLine('output', '  pwd           - Muestra directorio actual');
        addLine('output', '  mkdir <name>  - Crea una carpeta');
        addLine('output', '  touch <name>  - Crea un archivo vacio');
        addLine('output', '  cat <file>    - Muestra contenido de archivo');
        addLine('output', '  echo <text>   - Imprime texto');
        addLine('output', '  rm <file>     - Elimina un archivo');
        addLine('output', '  rmdir <dir>   - Elimina una carpeta vacia');
        addLine('output', '  clear         - Limpia la pantalla');
        addLine('output', '  whoami        - Muestra usuario actual');
        addLine('output', '  date          - Muestra fecha y hora');
        addLine('output', '  calc <expr>   - Calculadora (ej: 2+2)');
        addLine('output', '  neofetch      - Informacion del sistema');
        addLine('output', '  weather       - Clima (simulado)');
        addLine('output', '  fortune       - Cita aleatoria en espanol');
        addLine('output', '  banner        - Banner ASCII de Promurcia');
        addLine('output', '  matrix        - Activa modo matrix');
        break;
      }
      case 'ls': {
        const target = args[0] || '.';
        const items = vfsRef.current.ls(target);
        if (items === null) {
          addLine('error', `ls: no se puede acceder a '${target}': No existe el archivo o directorio`);
        } else if (items.length === 0) {
          addLine('output', '(vacío)');
        } else {
          const dirs = items.filter(i => i.type === 'directory').map(i => i.name + '/');
          const files = items.filter(i => i.type === 'file').map(i => i.name);
          dirs.sort(); files.sort();
          dirs.forEach(d => addLine('success', d));
          files.forEach(f => addLine('output', f));
        }
        break;
      }
      case 'cd': {
        if (!args[0]) {
          vfsRef.current.cd('/home/usuario');
        } else if (!vfsRef.current.cd(args.join(' '))) {
          addLine('error', `cd: no es un directorio: ${args[0]}`);
        }
        break;
      }
      case 'pwd': {
        addLine('success', vfsRef.current.pwd());
        break;
      }
      case 'mkdir': {
        if (!args[0]) {
          addLine('error', 'mkdir: falta un argumento');
        } else if (!vfsRef.current.mkdir(args[0])) {
          addLine('error', `mkdir: no se pudo crear '${args[0]}'`);
        } else {
          addLine('success', `Directorio '${args[0]}' creado.`);
        }
        break;
      }
      case 'touch': {
        if (!args[0]) {
          addLine('error', 'touch: falta un argumento');
        } else if (!vfsRef.current.touch(args[0])) {
          addLine('error', `touch: no se pudo crear '${args[0]}'`);
        }
        break;
      }
      case 'cat': {
        if (!args[0]) {
          addLine('error', 'cat: falta un argumento');
        } else {
          const content = vfsRef.current.cat(args[0]);
          if (content === null) {
            addLine('error', `cat: '${args[0]}' no existe`);
          } else {
            content.split('\n').forEach(l => addLine('output', l));
          }
        }
        break;
      }
      case 'echo': {
        addLine('output', args.join(' '));
        break;
      }
      case 'clear': {
        setLines([]);
        break;
      }
      case 'whoami': {
        addLine('success', 'usuario');
        break;
      }
      case 'date': {
        addLine('success', new Date().toLocaleString('es-ES'));
        break;
      }
      case 'calc': {
        if (!args[0]) {
          addLine('error', 'calc: falta expresion');
        } else {
          try {
            const expr = args.join('').replace(/[^0-9+\-*/().\s]/g, '');
            // eslint-disable-next-line no-eval
            const result = eval(expr);
            addLine('success', `${result}`);
          } catch {
            addLine('error', 'calc: expresion invalida');
          }
        }
        break;
      }
      case 'neofetch': {
        addLine('success', '   ____                                   ____  _____ ');
        addLine('success', '  |  _ \\ _ __ ___  _ __ ___  _   _ ___  / ___|| ____|');
        addLine('success', "  | |_) | | '__/ _ \\| '_ ` _ \\| | | / __| \\___ \\|  _|  ");
        addLine('success', '  |  __/| | | | (_) | | | | | | |_| \\__ \\ ___) | |___ ');
        addLine('success', '  |_|   |_|_|  \\___/|_| |_| |_|\\__,_|___/|____/|_____|');
        addLine('output', '');
        addLine('info', '  OS: PromurciaOS v2.0');
        addLine('info', '  Kernel: web-kernel-5.0');
        addLine('info', '  Shell: promurcia-sh');
        addLine('info', '  WM: Promurcia Window Manager');
        addLine('info', '  Uptime: 2h 34m');
        addLine('info', '  Memory: 4.2 GB / 16 GB');
        addLine('info', '  CPU: WebEngine x64 @ 3.2GHz');
        addLine('info', '  Resolution: 1920x1080');
        addLine('info', '  Theme: Promurcia Dark');
        break;
      }
      case 'weather': {
        addLine('info', '☀  Murcia, Espana');
        addLine('success', '  Temperatura: 24°C');
        addLine('output', '  Condicion: Soleado');
        addLine('output', '  Humedad: 45%');
        addLine('output', '  Viento: 12 km/h NO');
        addLine('output', '  Max: 28°C | Min: 16°C');
        break;
      }
      case 'fortune': {
        const quote = SPANISH_QUOTES[Math.floor(Math.random() * SPANISH_QUOTES.length)];
        addLine('success', `  "${quote}"`);
        break;
      }
      case 'banner': {
        addLine('success', '  ╔═══════════════════════════════════════╗');
        addLine('success', '  ║       P R O M U R C I A O S         ║');
        addLine('success', '  ║         v2.0 - by Promurcia.com      ║');
        addLine('success', '  ╚═══════════════════════════════════════╝');
        break;
      }
      case 'rm': {
        if (!args[0]) {
          addLine('error', 'rm: falta un argumento');
        } else if (!vfsRef.current.rm(args[0])) {
          addLine('error', `rm: no se pudo eliminar '${args[0]}'`);
        }
        break;
      }
      case 'rmdir': {
        if (!args[0]) {
          addLine('error', 'rmdir: falta un argumento');
        } else if (!vfsRef.current.rmdir(args[0])) {
          addLine('error', `rmdir: no se pudo eliminar '${args[0]}' (¿no está vacío?)`);
        }
        break;
      }
      case 'matrix': {
        setMatrixMode(prev => !prev);
        addLine('success', matrixMode ? 'Modo matrix desactivado.' : 'Modo matrix activado. Escribe "matrix" de nuevo para salir.');
        break;
      }
      default: {
        addLine('error', `${cmd}: comando no encontrado. Escribe 'help' para ver los comandos disponibles.`);
      }
    }
  }, [addLine, matrixMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const matches = COMMANDS.filter(c => c.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      }
    }
  }, [input, handleCommand, history, historyIndex]);

  useEffect(() => {
    const handleGlobalKey = () => {
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        background: matrixMode ? '#000' : '#0c0c0c',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 14,
      }}
    >
      {/* Matrix rain overlay */}
      {matrixMode && <MatrixRain />}

      {/* Terminal output */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3" style={{ color: matrixMode ? '#0f0' : '#e0e0e0' }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            color: line.type === 'input' ? (matrixMode ? '#0f0' : '#22c55e') :
                   line.type === 'error' ? '#ef4444' :
                   line.type === 'success' ? (matrixMode ? '#0f0' : '#22c55e') :
                   line.type === 'info' ? '#3b82f6' : '#e0e0e0',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {line.type === 'input' ? line.text : line.text}
          </div>
        ))}
        {/* Input line */}
        <div className="flex items-center" style={{ color: matrixMode ? '#0f0' : '#22c55e' }}>
          <span className="shrink-0">{prompt}&nbsp;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none"
            style={{
              color: matrixMode ? '#0f0' : '#e0e0e0',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 14,
              caretColor: matrixMode ? '#0f0' : '#d4a853',
            }}
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth ?? 800;
      canvas.height = canvas.parentElement?.clientHeight ?? 600;
    };
    resize();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    let animId: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, opacity: 0.3, pointerEvents: 'none' }}
    />
  );
}

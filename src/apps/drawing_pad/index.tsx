import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pencil, Minus, Square, Circle, Eraser, PaintBucket, Type,
  Undo2, Redo2, Trash2, Download, MousePointer
} from 'lucide-react';

type Tool = 'pencil' | 'line' | 'rect' | 'circle' | 'eraser' | 'fill' | 'text';

interface DrawAction {
  tool: Tool;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  text?: string;
}

const TOOLS: { id: Tool; label: string; icon: typeof Pencil }[] = [
  { id: 'pencil', label: 'Lapiz', icon: Pencil },
  { id: 'line', label: 'Linea', icon: Minus },
  { id: 'rect', label: 'Rectangulo', icon: Square },
  { id: 'circle', label: 'Circulo', icon: Circle },
  { id: 'eraser', label: 'Borrador', icon: Eraser },
  { id: 'fill', label: 'Rellenar', icon: PaintBucket },
  { id: 'text', label: 'Texto', icon: Type },
];

const PALETTE = ['#000000', '#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#d4a853', '#6b7280'];

export default function DrawingPad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#d4a853');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const currentAction = useRef<DrawAction | null>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all actions
    for (const action of actions) {
      drawAction(ctx, action);
    }
  }, [actions]);

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.color;
    ctx.fillStyle = action.color;
    ctx.lineWidth = action.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (action.tool === 'pencil' || action.tool === 'eraser') {
      ctx.strokeStyle = action.tool === 'eraser' ? '#ffffff' : action.color;
      ctx.beginPath();
      for (let i = 0; i < action.points.length; i++) {
        const p = action.points[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    } else if (action.tool === 'line' && action.points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      ctx.lineTo(action.points[action.points.length - 1].x, action.points[action.points.length - 1].y);
      ctx.stroke();
    } else if (action.tool === 'rect' && action.points.length >= 2) {
      const p1 = action.points[0];
      const p2 = action.points[action.points.length - 1];
      ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    } else if (action.tool === 'circle' && action.points.length >= 2) {
      const p1 = action.points[0];
      const p2 = action.points[action.points.length - 1];
      const radius = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (action.tool === 'text' && action.text) {
      ctx.font = `${action.width * 5 + 10}px Inter, sans-serif`;
      ctx.fillStyle = action.color;
      ctx.fillText(action.text, action.points[0].x, action.points[0].y);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    startPos.current = coords;

    if (tool === 'text') {
      setTextPos(coords);
      return;
    }

    if (tool === 'fill') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setActions(prev => [...prev, { tool: 'fill', points: [coords], color, width: strokeWidth }]);
      setRedoStack([]);
      setIsDrawing(false);
      return;
    }

    currentAction.current = {
      tool,
      points: [coords],
      color,
      width: strokeWidth,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction.current) return;
    const coords = getCanvasCoords(e);

    if (tool === 'pencil' || tool === 'eraser') {
      currentAction.current.points.push(coords);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      const pts = currentAction.current.points;
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    } else {
      currentAction.current.points = [startPos.current, coords];
      // Preview by redrawing
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const action of actions) drawAction(ctx, action);
      drawAction(ctx, currentAction.current);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentAction.current && currentAction.current.points.length > 0) {
      setActions(prev => [...prev, currentAction.current!]);
      setRedoStack([]);
    }
    currentAction.current = null;
  };

  const handleUndo = () => {
    setActions(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setActions(a => [...a, last]);
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setActions([]);
    setRedoStack([]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'dibujo_promurcia.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleTextSubmit = () => {
    if (textInput && textPos) {
      setActions(prev => [...prev, { tool: 'text', points: [textPos], color, width: strokeWidth, text: textInput }]);
      setRedoStack([]);
      setTextInput('');
      setTextPos(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        {/* Tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className="p-2 rounded-lg transition-all"
                title={t.label}
                style={{
                  background: tool === t.id ? 'rgba(212,168,83,0.15)' : 'transparent',
                  color: tool === t.id ? '#d4a853' : '#9ca3af',
                  border: tool === t.id ? '1px solid rgba(212,168,83,0.3)' : '1px solid transparent',
                }}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>

        <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full border-2 transition-all"
              style={{
                background: c,
                borderColor: color === c ? '#fff' : 'transparent',
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
            style={{ background: 'transparent', border: 'none' }}
          />
        </div>

        <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Width */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>Grosor</span>
          <input
            type="range"
            min={1}
            max={50}
            value={strokeWidth}
            onChange={e => setStrokeWidth(Number(e.target.value))}
            className="w-20"
            style={{ accentColor: '#d4a853' }}
          />
          <span className="text-xs w-6" style={{ color: '#9ca3af' }}>{strokeWidth}</span>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} className="p-2 rounded hover:bg-white/5" title="Deshacer (Ctrl+Z)"><Undo2 size={16} color="#9ca3af" /></button>
          <button onClick={handleRedo} className="p-2 rounded hover:bg-white/5" title="Rehacer"><Redo2 size={16} color="#9ca3af" /></button>
          <button onClick={handleClear} className="p-2 rounded hover:bg-red-500/20" title="Limpiar"><Trash2 size={16} color="#ef4444" /></button>
          <button onClick={handleSave} className="p-2 rounded hover:bg-white/5" title="Guardar PNG"><Download size={16} color="#22c55e" /></button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-auto flex items-center justify-center p-4" style={{ background: '#0f1a2b' }}>
        {/* Checkerboard pattern bg */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }} />
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative shadow-2xl cursor-crosshair"
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
        {/* Text input overlay */}
        {textPos && (
          <div
            className="absolute z-10 flex gap-1"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Escribe texto..."
              className="px-2 py-1 rounded text-sm outline-none"
              style={{ background: '#1a2744', border: '1px solid #d4a853', color: '#fff' }}
              autoFocus
            />
            <button onClick={handleTextSubmit} className="px-2 py-1 rounded text-xs" style={{ background: '#d4a853', color: '#0a1628' }}>OK</button>
            <button onClick={() => { setTextPos(null); setTextInput(''); }} className="px-2 py-1 rounded text-xs" style={{ background: '#ef4444', color: '#fff' }}>X</button>
          </div>
        )}
      </div>
    </div>
  );
}

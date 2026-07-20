import { useState, useEffect, useCallback, useRef } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

// Tetromino definitions
const TETROMINOES = {
  I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#06b6d4' },
  O: { shape: [[1,1],[1,1]], color: '#f59e0b' },
  T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#8b5cf6' },
  S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#22c55e' },
  Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#ef4444' },
  J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#3b82f6' },
  L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#f97316' },
};

const PIECE_NAMES = Object.keys(TETROMINOES) as (keyof typeof TETROMINOES)[];
const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const INITIAL_SPEED = 800;

interface Piece {
  name: keyof typeof TETROMINOES;
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

function createPiece(name: keyof typeof TETROMINOES): Piece {
  const t = TETROMINOES[name];
  return { name, shape: t.shape.map(r => [...r]), color: t.color, x: Math.floor(BOARD_COLS / 2) - Math.floor(t.shape[0].length / 2), y: 0 };
}

function randomPiece(): Piece {
  return createPiece(PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)]);
}

function rotatePiece(piece: Piece): Piece {
  const N = piece.shape.length;
  const rotated = Array.from({ length: N }, () => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      rotated[x][N - 1 - y] = piece.shape[y][x];
    }
  }
  return { ...piece, shape: rotated };
}

function getHighScore(): number {
  try { const d = localStorage.getItem('promurciaos_highscore_tetris'); return d ? JSON.parse(d).score : 0; }
  catch { return 0; }
}
function saveHighScore(score: number) {
  try { localStorage.setItem('promurciaos_highscore_tetris', JSON.stringify({ score, date: new Date().toISOString() })); } catch {}
}

export default function Tetris() {
  const [board, setBoard] = useState<(string | null)[][]>(() =>
    Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece>(() => randomPiece());
  const [nextPiece, setNextPiece] = useState<Piece>(() => randomPiece());
  const [holdPiece, setHoldPiece] = useState<Piece | null>(null);
  const [canHold, setCanHold] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(getHighScore);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const boardRef = useRef(board);
  const pieceRef = useRef(currentPiece);
  const pausedRef = useRef(paused);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const isValidPosition = useCallback((piece: Piece, newX?: number, newY?: number, newShape?: number[][]) => {
    const shape = newShape || piece.shape;
    const x = newX !== undefined ? newX : piece.x;
    const y = newY !== undefined ? newY : piece.y;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const nx = x + col;
          const ny = y + row;
          if (nx < 0 || nx >= BOARD_COLS || ny >= BOARD_ROWS) return false;
          if (ny >= 0 && boardRef.current[ny][nx] !== null) return false;
        }
      }
    }
    return true;
  }, []);

  const lockPiece = useCallback(() => {
    const piece = pieceRef.current;
    const newBoard = boardRef.current.map(r => [...r]);
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (piece.shape[row][col]) {
          const ny = piece.y + row;
          const nx = piece.x + col;
          if (ny >= 0) newBoard[ny][nx] = piece.color;
        }
      }
    }

    // Clear lines
    let linesCleared = 0;
    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      if (newBoard[row].every(c => c !== null)) {
        newBoard.splice(row, 1);
        newBoard.unshift(Array(BOARD_COLS).fill(null));
        linesCleared++;
        row++;
      }
    }

    if (linesCleared > 0) {
      const lineScores = [0, 100, 300, 500, 800];
      const newScore = score + lineScores[linesCleared] * level;
      setScore(newScore);
      if (newScore > highScore) { setHighScore(newScore); saveHighScore(newScore); }
      const newLines = lines + linesCleared;
      setLines(newLines);
      setLevel(Math.floor(newLines / 10) + 1);
    }

    setBoard(newBoard);
    const next = nextPiece;
    setCurrentPiece({ ...next, x: Math.floor(BOARD_COLS / 2) - Math.floor(next.shape[0].length / 2), y: 0 });
    pieceRef.current = { ...next, x: Math.floor(BOARD_COLS / 2) - Math.floor(next.shape[0].length / 2), y: 0 };
    setNextPiece(randomPiece());
    setCanHold(true);

    // Check game over
    if (!isValidPosition({ ...next, x: Math.floor(BOARD_COLS / 2) - Math.floor(next.shape[0].length / 2), y: 0 })) {
      setGameOver(true);
      gameOverRef.current = true;
    }
  }, [nextPiece, score, lines, level, highScore, isValidPosition]);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (pausedRef.current || gameOverRef.current) return;
    const piece = pieceRef.current;
    if (isValidPosition(piece, piece.x + dx, piece.y + dy)) {
      const newPiece = { ...piece, x: piece.x + dx, y: piece.y + dy };
      setCurrentPiece(newPiece);
      pieceRef.current = newPiece;
      return true;
    }
    if (dy > 0) {
      lockPiece();
    }
    return false;
  }, [isValidPosition, lockPiece]);

  const hardDrop = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    let dropDistance = 0;
    const piece = pieceRef.current;
    while (isValidPosition(piece, piece.x, piece.y + dropDistance + 1)) {
      dropDistance++;
    }
    if (dropDistance > 0) {
      const newPiece = { ...piece, y: piece.y + dropDistance };
      setCurrentPiece(newPiece);
      pieceRef.current = newPiece;
    }
    lockPiece();
  }, [isValidPosition, lockPiece]);

  const rotate = useCallback(() => {
    if (pausedRef.current || gameOverRef.current) return;
    const piece = pieceRef.current;
    const rotated = rotatePiece(piece);
    if (isValidPosition(rotated)) {
      setCurrentPiece(rotated);
      pieceRef.current = rotated;
    } else {
      // Wall kick
      for (const offset of [-1, 1, -2, 2]) {
        if (isValidPosition(rotated, rotated.x + offset, rotated.y)) {
          const kicked = { ...rotated, x: rotated.x + offset };
          setCurrentPiece(kicked);
          pieceRef.current = kicked;
          return;
        }
      }
    }
  }, [isValidPosition]);

  const hold = useCallback(() => {
    if (pausedRef.current || gameOverRef.current || !canHold) return;
    const piece = pieceRef.current;
    if (holdPiece) {
      const newCurrent = { ...holdPiece, x: Math.floor(BOARD_COLS / 2) - Math.floor(holdPiece.shape[0].length / 2), y: 0 };
      setCurrentPiece(newCurrent);
      pieceRef.current = newCurrent;
      setHoldPiece(createPiece(piece.name));
    } else {
      const next = nextPiece;
      setCurrentPiece({ ...next, x: Math.floor(BOARD_COLS / 2) - Math.floor(next.shape[0].length / 2), y: 0 });
      pieceRef.current = { ...next, x: Math.floor(BOARD_COLS / 2) - Math.floor(next.shape[0].length / 2), y: 0 };
      setNextPiece(randomPiece());
      setHoldPiece(createPiece(piece.name));
    }
    setCanHold(false);
  }, [canHold, holdPiece, nextPiece]);

  // Game tick
  useEffect(() => {
    const speed = Math.max(100, INITIAL_SPEED - (level - 1) * 60);
    const interval = setInterval(() => {
      movePiece(0, 1);
    }, speed);
    return () => clearInterval(interval);
  }, [movePiece, level]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setPaused(p => !p); return;
      }
      if (gameOverRef.current) {
        if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          resetGame();
        }
        return;
      }
      if (pausedRef.current) return;
      switch (e.key) {
        case 'ArrowLeft': movePiece(-1, 0); break;
        case 'ArrowRight': movePiece(1, 0); break;
        case 'ArrowDown': movePiece(0, 1); break;
        case 'ArrowUp': case 'x': case 'X': rotate(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
        case 'c': case 'C': hold(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePiece, rotate, hardDrop, hold]);

  const resetGame = useCallback(() => {
    const empty = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    setBoard(empty);
    boardRef.current = empty;
    const rp = randomPiece();
    setCurrentPiece(rp);
    pieceRef.current = rp;
    setNextPiece(randomPiece());
    setHoldPiece(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    gameOverRef.current = false;
    setPaused(false);
  }, []);

  // Render board with piece
  const renderBoard = () => {
    const display = board.map(r => [...r]);
    if (!gameOver) {
      for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
          if (currentPiece.shape[row][col]) {
            const ny = currentPiece.y + row;
            const nx = currentPiece.x + col;
            if (ny >= 0 && ny < BOARD_ROWS && nx >= 0 && nx < BOARD_COLS) {
              display[ny][nx] = currentPiece.color;
            }
          }
        }
      }
    }
    return display;
  };

  const display = renderBoard();

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white">Puntos: <span style={{ color: '#d4a853' }}>{score}</span></span>
          <span className="text-xs" style={{ color: '#6b7280' }}>Nivel: {level}</span>
          <span className="text-xs" style={{ color: '#6b7280' }}>Lineas: {lines}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused(p => !p)} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <button onClick={resetGame} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-4 p-4">
        {/* Left: Hold piece */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>HOLD (C)</span>
          <div className="flex items-center justify-center" style={{ width: 80, height: 80, background: '#111d32', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            {holdPiece && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${holdPiece.shape.length}, 12px)`, gap: 1 }}>
                {holdPiece.shape.flat().map((cell, i) => (
                  <div key={i} style={{ width: 12, height: 12, background: cell ? holdPiece.color : 'transparent', borderRadius: 2 }} />
                ))}
              </div>
            )}
          </div>
          <span className="text-xs" style={{ color: '#6b7280' }}>Record: {highScore}</span>
        </div>

        {/* Game board */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_COLS}, 22px)`, gridTemplateRows: `repeat(${BOARD_ROWS}, 22px)`, gap: 1, background: '#111d32', padding: 4, borderRadius: 8, border: '2px solid #d4a853' }}>
          {display.flat().map((cell, i) => (
            <div key={i} style={{ width: 22, height: 22, background: cell || '#0a1628', borderRadius: 2, boxShadow: cell ? `0 0 4px ${cell}40` : 'none' }} />
          ))}
        </div>

        {/* Right: Next piece */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>SIGUIENTE</span>
          <div className="flex items-center justify-center" style={{ width: 80, height: 80, background: '#111d32', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${nextPiece.shape.length}, 12px)`, gap: 1 }}>
              {nextPiece.shape.flat().map((cell, i) => (
                <div key={i} style={{ width: 12, height: 12, background: cell ? nextPiece.color : 'transparent', borderRadius: 2 }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs" style={{ color: '#6b7280' }}>
            <span>&#8592; &#8594; Mover</span>
            <span>&#8593; Rotar</span>
            <span>&#8595; Bajar</span>
            <span>Espacio: Caida</span>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {(gameOver || paused) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: gameOver ? 'rgba(10,22,40,0.85)' : 'rgba(10,22,40,0.7)' }}>
          {gameOver ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Juego Terminado</h2>
              <p className="text-lg mb-1" style={{ color: '#d4a853' }}>Puntuacion: {score}</p>
              {score >= highScore && score > 0 && <p className="text-sm mb-3" style={{ color: '#22c55e' }}>Nuevo Record!</p>}
              <button onClick={resetGame} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Reintentar</button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-4">Pausa</h2>
              <button onClick={() => setPaused(false)} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Continuar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

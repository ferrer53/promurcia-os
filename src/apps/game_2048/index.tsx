import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Undo2, Trophy } from 'lucide-react';

const GRID_SIZE = 4;

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: '#1a2744', text: '#e2e8f0' },
  4: { bg: '#1e3a5f', text: '#e2e8f0' },
  8: { bg: '#92400e', text: '#fff' },
  16: { bg: '#b45309', text: '#fff' },
  32: { bg: '#d97706', text: '#fff' },
  64: { bg: '#f59e0b', text: '#fff' },
  128: { bg: '#d4a853', text: '#0a1628' },
  256: { bg: '#c9a84c', text: '#0a1628' },
  512: { bg: '#e4c47a', text: '#0a1628' },
  1024: { bg: '#f0d78c', text: '#0a1628' },
  2048: { bg: '#ffd700', text: '#0a1628' },
};

function getDefaultColor(val: number) {
  return val > 2048 ? { bg: '#ef4444', text: '#fff' } : (TILE_COLORS[val] || { bg: '#1a2744', text: '#e2e8f0' });
}

function getHighScore(): number {
  try { const d = localStorage.getItem('promurciaos_highscore_2048'); return d ? JSON.parse(d).score : 0; }
  catch { return 0; }
}
function saveHighScore(score: number) {
  try { localStorage.setItem('promurciaos_highscore_2048', JSON.stringify({ score, date: new Date().toISOString() })); } catch {}
}

function addRandomTile(board: (number | null)[][]): (number | null)[][] {
  const empty: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === null) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function createBoard(): (number | null)[][] {
  const board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null) as (number | null)[]);
  return addRandomTile(addRandomTile(board));
}

function slideRowLeft(row: (number | null)[]): { row: (number | null)[]; score: number; moved: boolean } {
  let filtered = row.filter(v => v !== null) as number[];
  let score = 0;
  let moved = false;

  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      score += filtered[i];
      filtered[i + 1] = null as unknown as number;
      i++;
    }
  }

  filtered = filtered.filter(v => v !== null) as number[];
  while (filtered.length < GRID_SIZE) filtered.push(null as unknown as number);

  for (let i = 0; i < GRID_SIZE; i++) {
    if (row[i] !== filtered[i]) moved = true;
  }

  return { row: filtered as (number | null)[], score, moved };
}

function moveBoard(board: (number | null)[][], direction: 'left' | 'right' | 'up' | 'down') {
  let newBoard = board.map(r => [...r]);
  let totalScore = 0;
  let moved = false;

  if (direction === 'left') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const result = slideRowLeft(newBoard[r]);
      newBoard[r] = result.row;
      totalScore += result.score;
      if (result.moved) moved = true;
    }
  } else if (direction === 'right') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const reversed = [...newBoard[r]].reverse();
      const result = slideRowLeft(reversed);
      newBoard[r] = result.row.reverse();
      totalScore += result.score;
      if (result.moved) moved = true;
    }
  } else if (direction === 'up') {
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = Array.from({ length: GRID_SIZE }, (_, r) => newBoard[r][c]);
      const result = slideRowLeft(col);
      for (let r = 0; r < GRID_SIZE; r++) newBoard[r][c] = result.row[r];
      totalScore += result.score;
      if (result.moved) moved = true;
    }
  } else if (direction === 'down') {
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = Array.from({ length: GRID_SIZE }, (_, r) => newBoard[r][c]).reverse();
      const result = slideRowLeft(col);
      const reversed = result.row.reverse();
      for (let r = 0; r < GRID_SIZE; r++) newBoard[r][c] = reversed[r];
      totalScore += result.score;
      if (result.moved) moved = true;
    }
  }

  if (moved) {
    newBoard = addRandomTile(newBoard);
  }

  return { board: newBoard, score: totalScore, moved };
}

function canMove(board: (number | null)[][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === null) return true;
      if (c < GRID_SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < GRID_SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

export default function Game2048() {
  const [board, setBoard] = useState<(number | null)[][]>(createBoard);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(getHighScore);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [continuePlaying, setContinuePlaying] = useState(false);
  const [previousState, setPreviousState] = useState<{ board: (number | null)[][]; score: number } | null>(null);

  const handleMove = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver && !continuePlaying) return;
    setPreviousState({ board: board.map(r => [...r]), score });
    const result = moveBoard(board, direction);
    if (result.moved) {
      setBoard(result.board);
      const newScore = score + result.score;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        saveHighScore(newScore);
      }
      if (!continuePlaying && result.board.some(row => row.some(cell => cell === 2048))) {
        setWon(true);
      }
      if (!canMove(result.board)) {
        setGameOver(true);
      }
    }
  }, [board, score, gameOver, continuePlaying, highScore]);

  const resetGame = useCallback(() => {
    const newBoard = createBoard();
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setContinuePlaying(false);
    setPreviousState(null);
  }, []);

  const undo = useCallback(() => {
    if (previousState) {
      setBoard(previousState.board);
      setScore(previousState.score);
      setGameOver(false);
      setPreviousState(null);
    }
  }, [previousState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') { resetGame(); return; }
      if (e.key === 'z' || e.key === 'Z') { undo(); return; }
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); handleMove('left'); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); handleMove('right'); break;
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); handleMove('up'); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); handleMove('down'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, resetGame, undo]);

  // Touch support
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold" style={{ color: '#d4a853' }}>2048</h1>
          <span className="text-sm font-medium text-white">Puntos: <span style={{ color: '#d4a853' }}>{score}</span></span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#6b7280' }}>
            <Trophy size={12} /> Record: {highScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
            <Undo2 size={12} /> Deshacer (Z)
          </button>
          <button onClick={resetGame} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
            <RotateCcw size={12} /> Reiniciar
          </button>
        </div>
      </div>

      {/* Game board */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 90px)',
            gridTemplateRows: 'repeat(4, 90px)',
            gap: 10,
            background: '#111d32',
            padding: 10,
            borderRadius: 10,
          }}
        >
          {board.flat().map((cell, i) => {
            const colors = cell ? getDefaultColor(cell) : { bg: 'rgba(255,255,255,0.03)', text: '#fff' };
            return (
              <div
                key={i}
                className="flex items-center justify-center font-bold transition-all"
                style={{
                  width: 90,
                  height: 90,
                  background: colors.bg,
                  color: colors.text,
                  borderRadius: 8,
                  fontSize: cell && cell >= 1024 ? 24 : cell && cell >= 100 ? 28 : 32,
                  boxShadow: cell ? `0 0 8px ${colors.bg}40` : 'none',
                }}
              >
                {cell || ''}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: '#6b7280' }}>Flechas/WASD para mover | Z para deshacer | Une numeros iguales para llegar a 2048</p>
      </div>

      {/* Won overlay */}
      {won && !continuePlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.85)' }}>
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#ffd700' }}>Has ganado!</h2>
          <p className="text-lg mb-4" style={{ color: '#d4a853' }}>Puntuacion: {score}</p>
          <div className="flex gap-3">
            <button onClick={() => setContinuePlaying(true)} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Continuar</button>
            <button onClick={resetGame} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>Nuevo Juego</button>
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.85)' }}>
          <h2 className="text-2xl font-bold text-white mb-2">Juego Terminado</h2>
          <p className="text-lg mb-1" style={{ color: '#d4a853' }}>Puntuacion: {score}</p>
          {score >= highScore && score > 0 && <p className="text-sm mb-3" style={{ color: '#22c55e' }}>Nuevo Record!</p>}
          <button onClick={resetGame} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Reintentar</button>
        </div>
      )}
    </div>
  );
}

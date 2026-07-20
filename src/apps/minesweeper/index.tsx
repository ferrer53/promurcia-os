import { useState, useEffect, useCallback } from 'react';
import { Smile, Frown, Meh } from 'lucide-react';

type CellState = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

type Difficulty = { rows: number; cols: number; mines: number };

const DIFFICULTIES: Record<string, Difficulty> = {
  facil: { rows: 8, cols: 8, mines: 10 },
  medio: { rows: 16, cols: 16, mines: 40 },
  dificil: { rows: 16, cols: 30, mines: 99 },
};

function createBoard(diff: Difficulty): CellState[][] {
  const board: CellState[][] = Array.from({ length: diff.rows }, () =>
    Array.from({ length: diff.cols }, () => ({ isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0 }))
  );

  // Place mines
  let minesPlaced = 0;
  while (minesPlaced < diff.mines) {
    const r = Math.floor(Math.random() * diff.rows);
    const c = Math.floor(Math.random() * diff.cols);
    if (!board[r][c].isMine) {
      board[r][c].isMine = true;
      minesPlaced++;
    }
  }

  // Calculate adjacent mines
  for (let r = 0; r < diff.rows; r++) {
    for (let c = 0; c < diff.cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < diff.rows && nc >= 0 && nc < diff.cols && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].adjacentMines = count;
    }
  }

  return board;
}

const NUMBER_COLORS = ['transparent', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#b91c1c', '#06b6d4', '#111827', '#6b7280'];

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState('facil');
  const diff = DIFFICULTIES[difficulty];
  const [board, setBoard] = useState<CellState[][]>(() => createBoard(DIFFICULTIES['facil']));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [timer, setTimer] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const [flagCount, setFlagCount] = useState(0);
  const [face, setFace] = useState<'smile' | 'frown' | 'sunglasses' | 'meh'>('smile');

  const resetGame = useCallback((diffKey?: string) => {
    const d = DIFFICULTIES[diffKey || difficulty];
    setBoard(createBoard(d));
    setGameOver(false);
    setWon(false);
    setTimer(0);
    setFirstClick(true);
    setFlagCount(0);
    setFace('smile');
  }, [difficulty]);

  // Timer
  useEffect(() => {
    if (gameOver || firstClick) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameOver, firstClick]);

  const revealCell = (r: number, c: number, currentBoard?: CellState[][]) => {
    const b = currentBoard || board;
    if (r < 0 || r >= diff.rows || c < 0 || c >= diff.cols) return b;
    if (b[r][c].isRevealed || b[r][c].isFlagged) return b;

    b[r][c].isRevealed = true;

    if (b[r][c].adjacentMines === 0 && !b[r][c].isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          revealCell(r + dr, c + dc, b);
        }
      }
    }
    return b;
  };

  const checkWin = (b: CellState[][]) => {
    const allNonMinesRevealed = b.every(row => row.every(cell => cell.isMine || cell.isRevealed));
    if (allNonMinesRevealed) {
      setWon(true);
      setGameOver(true);
      setFace('sunglasses');
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || board[r][c].isRevealed || board[r][c].isFlagged) return;

    let newBoard = board.map(row => row.map(cell => ({ ...cell })));

    if (firstClick) {
      setFirstClick(false);
      // Ensure first click is safe
      if (newBoard[r][c].isMine) {
        // Move mine
        newBoard[r][c].isMine = false;
        let placed = false;
        while (!placed) {
          const nr = Math.floor(Math.random() * diff.rows);
          const nc = Math.floor(Math.random() * diff.cols);
          if (!newBoard[nr][nc].isMine && !(nr === r && nc === c)) {
            newBoard[nr][nc].isMine = true;
            placed = true;
          }
        }
        // Recalculate adjacent mines
        for (let row = 0; row < diff.rows; row++) {
          for (let col = 0; col < diff.cols; col++) {
            if (newBoard[row][col].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr2 = row + dr;
                const nc2 = col + dc;
                if (nr2 >= 0 && nr2 < diff.rows && nc2 >= 0 && nc2 < diff.cols && newBoard[nr2][nc2].isMine) count++;
              }
            }
            newBoard[row][col].adjacentMines = count;
          }
        }
      }
    }

    if (newBoard[r][c].isMine) {
      // Reveal all mines
      newBoard.forEach(row => row.forEach(cell => { if (cell.isMine) cell.isRevealed = true; }));
      setBoard(newBoard);
      setGameOver(true);
      setFace('frown');
      return;
    }

    newBoard = revealCell(r, c, newBoard);
    setBoard(newBoard.map(row => [...row]));
    checkWin(newBoard);
  };

  const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameOver || board[r][c].isRevealed) return;

    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    if (newBoard[r][c].isFlagged) {
      newBoard[r][c].isFlagged = false;
      setFlagCount(f => f - 1);
    } else {
      newBoard[r][c].isFlagged = true;
      setFlagCount(f => f + 1);
    }
    setBoard(newBoard);
  };

  const minesLeft = diff.mines - flagCount;

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">Minas: <span style={{ color: '#ef4444' }}>{minesLeft}</span></span>
          <span className="text-sm font-medium" style={{ color: '#d4a853' }}>{String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</span>
        </div>
        <button
          onClick={() => resetGame()}
          className="flex items-center justify-center rounded-md transition-all hover:scale-110"
          style={{ width: 36, height: 36, background: '#1a2744' }}
        >
          {face === 'smile' && <Smile size={20} color="#f59e0b" />}
          {face === 'frown' && <Frown size={20} color="#ef4444" />}
          {face === 'sunglasses' && <Smile size={20} color="#22c55e" />}
          {face === 'meh' && <Meh size={20} color="#f59e0b" />}
        </button>
        <div className="flex items-center gap-2">
          {Object.keys(DIFFICULTIES).map(d => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); resetGame(d); }}
              className="px-2 py-1 rounded text-xs font-medium capitalize transition-all"
              style={{
                background: difficulty === d ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)',
                color: difficulty === d ? '#d4a853' : '#9ca3af',
              }}
            >
              {d === 'facil' ? 'Facil' : d === 'medio' ? 'Medio' : 'Dificil'}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${diff.cols}, 28px)`, gap: 1 }}>
          {board.map((row, ri) => row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              onClick={() => handleCellClick(ri, ci)}
              onContextMenu={(e) => handleRightClick(e, ri, ci)}
              onMouseDown={() => !gameOver && !cell.isRevealed && setFace('meh')}
              onMouseUp={() => !gameOver && setFace(won ? 'sunglasses' : 'smile')}
              className="flex items-center justify-center text-sm font-bold cursor-pointer transition-all"
              style={{
                width: 28,
                height: 28,
                background: cell.isRevealed
                  ? cell.isMine ? '#ef4444' : '#0d1b2a'
                  : '#1a2744',
                border: cell.isRevealed
                  ? '1px solid rgba(255,255,255,0.05)'
                  : '2px solid rgba(255,255,255,0.15)',
                borderTopColor: cell.isRevealed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.25)',
                borderLeftColor: cell.isRevealed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.25)',
                color: cell.isRevealed && !cell.isMine ? NUMBER_COLORS[cell.adjacentMines] : '#fff',
                fontSize: cell.isFlagged ? 14 : 13,
              }}
            >
              {cell.isFlagged && !cell.isRevealed && '🚩'}
              {cell.isRevealed && cell.isMine && '💣'}
              {cell.isRevealed && !cell.isMine && cell.adjacentMines > 0 && cell.adjacentMines}
            </div>
          )))}
        </div>
      </div>

      <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: '#6b7280' }}>Click izquierdo: revelar | Click derecho: bandera</p>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.85)' }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: won ? '#22c55e' : '#ef4444' }}>{won ? 'Victoria!' : 'Boom!'}</h2>
          <p className="text-sm mb-4" style={{ color: '#d4a853' }}>Tiempo: {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</p>
          <button onClick={() => resetGame()} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Reintentar</button>
        </div>
      )}
    </div>
  );
}

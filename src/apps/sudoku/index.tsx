import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Lightbulb, CheckCircle, Eraser } from 'lucide-react';

// Pre-generated Sudoku puzzles (0 = empty)
function generatePuzzle(difficulty: string): { puzzle: number[][]; solution: number[][] } {
  // Start with a valid solved board
  const base = [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9],
  ];

  // Shuffle rows within bands
  for (let band = 0; band < 3; band++) {
    const rows = [band * 3, band * 3 + 1, band * 3 + 2];
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [base[rows[i]], base[rows[j]]] = [base[rows[j]], base[rows[i]]];
    }
  }
  // Shuffle cols within stacks
  for (let stack = 0; stack < 3; stack++) {
    const cols = [stack * 3, stack * 3 + 1, stack * 3 + 2];
    for (let i = cols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      for (let row = 0; row < 9; row++) {
        [base[row][cols[i]], base[row][cols[j]]] = [base[row][cols[j]], base[row][cols[i]]];
      }
    }
  }

  const solution = base.map(r => [...r]);
  const puzzle = base.map(r => [...r]);

  // Remove cells based on difficulty
  const cellsToRemove = difficulty === 'facil' ? 38 : difficulty === 'medio' ? 48 : 56;
  const positions = Array.from({ length: 81 }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (let i = 0; i < cellsToRemove; i++) {
    const pos = positions[i];
    puzzle[Math.floor(pos / 9)][pos % 9] = 0;
  }

  return { puzzle, solution };
}

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState('facil');
  const [grid, setGrid] = useState<number[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [original, setOriginal] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [puzzleKey, setPuzzleKey] = useState(0);

  const initGame = useCallback((diff: string, key?: number) => {
    const { puzzle, solution: sol } = generatePuzzle(diff);
    setGrid(puzzle.map(r => [...r]));
    setSolution(sol);
    setOriginal(puzzle.map(r => r.map(c => c !== 0)));
    setSelectedCell(null);
    setConflicts(new Set());
    setTimer(0);
    setGameComplete(false);
    if (key !== undefined) setPuzzleKey(key);
  }, []);

  useEffect(() => {
    initGame('facil', 0);
  }, [initGame]);

  // Timer
  useEffect(() => {
    if (gameComplete) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameComplete]);

  const findConflicts = useCallback((g: number[][]) => {
    const newConflicts = new Set<string>();
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const val = g[row][col];
        if (val === 0) continue;
        // Check row
        for (let c = 0; c < 9; c++) {
          if (c !== col && g[row][c] === val) {
            newConflicts.add(`${row},${col}`);
            newConflicts.add(`${row},${c}`);
          }
        }
        // Check col
        for (let r = 0; r < 9; r++) {
          if (r !== row && g[r][col] === val) {
            newConflicts.add(`${row},${col}`);
            newConflicts.add(`${r},${col}`);
          }
        }
        // Check box
        const boxR = Math.floor(row / 3) * 3;
        const boxC = Math.floor(col / 3) * 3;
        for (let r = boxR; r < boxR + 3; r++) {
          for (let c = boxC; c < boxC + 3; c++) {
            if ((r !== row || c !== col) && g[r][c] === val) {
              newConflicts.add(`${row},${col}`);
              newConflicts.add(`${r},${c}`);
            }
          }
        }
      }
    }
    return newConflicts;
  }, []);

  const handleCellClick = (row: number, col: number) => {
    if (original[row]?.[col] || gameComplete) return;
    setSelectedCell([row, col]);
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || gameComplete) return;
    const [row, col] = selectedCell;
    if (original[row]?.[col]) return;
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = newGrid[row][col] === num ? 0 : num;
    setGrid(newGrid);
    setConflicts(findConflicts(newGrid));

    // Check completion
    const isFull = newGrid.every(r => r.every(c => c !== 0));
    if (isFull && findConflicts(newGrid).size === 0) {
      setGameComplete(true);
    }
  };

  const handleHint = () => {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) emptyCells.push([r, c]);
      }
    }
    if (emptyCells.length === 0) return;
    const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = solution[row][col];
    setGrid(newGrid);
    setSelectedCell([row, col]);
    setConflicts(findConflicts(newGrid));

    const isFull = newGrid.every(r => r.every(c => c !== 0));
    if (isFull && findConflicts(newGrid).size === 0) {
      setGameComplete(true);
    }
  };

  const handleSolve = () => {
    setGrid(solution.map(r => [...r]));
    setConflicts(new Set());
    setGameComplete(true);
  };

  const handleClear = () => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (original[row]?.[col]) return;
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = 0;
    setGrid(newGrid);
    setConflicts(findConflicts(newGrid));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameComplete) return;
    if (e.key >= '1' && e.key <= '9') {
      handleNumberInput(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      handleClear();
    } else if (e.key === 'h' || e.key === 'H') {
      handleHint();
    }
  }, [selectedCell, grid, gameComplete]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          {['facil', 'medio', 'dificil'].map(d => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); initGame(d, puzzleKey + 1); }}
              className="px-3 py-1 rounded-md text-xs font-medium capitalize transition-all"
              style={{
                background: difficulty === d ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)',
                color: difficulty === d ? '#d4a853' : '#9ca3af',
                border: difficulty === d ? '1px solid rgba(212,168,83,0.3)' : '1px solid transparent',
              }}
            >
              {d === 'facil' ? 'Facil' : d === 'medio' ? 'Medio' : 'Dificil'}
            </button>
          ))}
        </div>
        <span className="text-sm font-medium" style={{ color: '#d4a853' }}>{formatTime(timer)}</span>
      </div>

      <div className="flex-1 flex items-center justify-center gap-6 p-4">
        {/* Sudoku grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 40px)', gap: 0, border: '2px solid #fff', borderRadius: 4 }}>
          {grid.map((row, ri) => row.map((cell, ci) => {
            const isOriginal = original[ri]?.[ci];
            const isSelected = selectedCell?.[0] === ri && selectedCell?.[1] === ci;
            const isRelated = selectedCell && (selectedCell[0] === ri || selectedCell[1] === ci || (Math.floor(selectedCell[0]/3) === Math.floor(ri/3) && Math.floor(selectedCell[1]/3) === Math.floor(ci/3)));
            const hasConflict = conflicts.has(`${ri},${ci}`);
            const isSameNumber = selectedCell && cell !== 0 && grid[selectedCell[0]]?.[selectedCell[1]] === cell;

            const thickRight = (ci + 1) % 3 === 0 && ci !== 8;
            const thickBottom = (ri + 1) % 3 === 0 && ri !== 8;

            return (
              <div
                key={`${ri}-${ci}`}
                onClick={() => handleCellClick(ri, ci)}
                className="flex items-center justify-center text-lg font-semibold cursor-pointer transition-colors"
                style={{
                  width: 40,
                  height: 40,
                  background: isSelected ? 'rgba(212,168,83,0.2)' : isSameNumber ? 'rgba(212,168,83,0.1)' : isRelated ? 'rgba(255,255,255,0.03)' : 'transparent',
                  borderRight: thickRight ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                  borderBottom: thickBottom ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                  color: hasConflict ? '#ef4444' : isOriginal ? '#fff' : '#d4a853',
                  fontWeight: isOriginal ? 600 : 500,
                }}
              >
                {cell !== 0 ? cell : ''}
              </div>
            );
          }))}
        </div>

        {/* Number pad + controls */}
        <div className="flex flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gap: 4 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button
                key={n}
                onClick={() => handleNumberInput(n)}
                className="flex items-center justify-center rounded-md text-sm font-medium transition-all hover:scale-105"
                style={{ width: 40, height: 40, background: '#1a2744', color: '#d4a853', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <button onClick={handleHint} className="flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-all" style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>
              <Lightbulb size={14} /> Pista (H)
            </button>
            <button onClick={handleClear} className="flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
              <Eraser size={14} /> Borrar
            </button>
            <button onClick={handleSolve} className="flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
              <CheckCircle size={14} /> Resolver
            </button>
            <button onClick={() => initGame(difficulty, puzzleKey + 1)} className="flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
              <RotateCcw size={14} /> Nuevo
            </button>
          </div>
        </div>
      </div>

      {gameComplete && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.85)' }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#22c55e' }}>Completado!</h2>
          <p className="text-lg mb-4" style={{ color: '#d4a853' }}>Tiempo: {formatTime(timer)}</p>
          <button onClick={() => initGame(difficulty, puzzleKey + 1)} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Nuevo Juego</button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Bot, Users } from 'lucide-react';

type CellValue = 'X' | 'O' | null;
type GameMode = 'pvp' | 'ai';

function checkWinner(board: CellValue[]): { winner: CellValue; line: number[] } | null {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // cols
    [0,4,8], [2,4,6], // diagonals
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function minimax(board: CellValue[], depth: number, isMaximizing: boolean, aiPlayer: CellValue, humanPlayer: CellValue): number {
  const result = checkWinner(board);
  if (result?.winner === aiPlayer) return 10 - depth;
  if (result?.winner === humanPlayer) return depth - 10;
  if (board.every(c => c !== null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = aiPlayer;
        best = Math.max(best, minimax(board, depth + 1, false, aiPlayer, humanPlayer));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = humanPlayer;
        best = Math.min(best, minimax(board, depth + 1, true, aiPlayer, humanPlayer));
        board[i] = null;
      }
    }
    return best;
  }
}

function getBestMove(board: CellValue[], aiPlayer: CellValue, humanPlayer: CellValue): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  // Add some randomness for first moves
  const emptyCount = board.filter(c => c === null).length;
  if (emptyCount >= 8) {
    const corners = [0, 2, 6, 8].filter(i => board[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  }
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = aiPlayer;
      const score = minimax(board, 0, false, aiPlayer, humanPlayer);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

function getHighScore() {
  try { const d = localStorage.getItem('promurciaos_highscore_tictactoe'); return d ? JSON.parse(d) : { xWins: 0, oWins: 0, draws: 0 }; }
  catch { return { xWins: 0, oWins: 0, draws: 0 }; }
}
function saveHighScore(scores: { xWins: number; oWins: number; draws: number }) {
  try { localStorage.setItem('promurciaos_highscore_tictactoe', JSON.stringify(scores)); } catch {}
}

export default function TicTacToe() {
  const [board, setBoard] = useState<CellValue[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [winner, setWinner] = useState<{ winner: CellValue; line: number[] } | null>(null);
  const [draw, setDraw] = useState(false);
  const [scores, setScores] = useState(getHighScore);
  const [winningLine, setWinningLine] = useState<number[]>([]);

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setDraw(false);
    setWinningLine([]);
  }, []);

  const handleCellClick = useCallback((index: number) => {
    if (board[index] || winner || draw) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result);
      setWinningLine(result.line);
      const newScores = { ...scores };
      if (result.winner === 'X') newScores.xWins++;
      else newScores.oWins++;
      setScores(newScores);
      saveHighScore(newScores);
      return;
    }

    if (newBoard.every(c => c !== null)) {
      setDraw(true);
      const newScores = { ...scores, draws: scores.draws + 1 };
      setScores(newScores);
      saveHighScore(newScores);
      return;
    }

    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
  }, [board, currentPlayer, winner, draw, scores]);

  // AI move
  useEffect(() => {
    if (gameMode !== 'ai' || currentPlayer !== 'O' || winner || draw) return;
    const timer = setTimeout(() => {
      const move = getBestMove([...board], 'O', 'X');
      if (move !== -1) handleCellClick(move);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentPlayer, gameMode, winner, draw, board, handleCellClick]);

  const getLineStyle = () => {
    if (winningLine.length !== 3) return {};
    const [a, b] = winningLine;
    const rowA = Math.floor(a / 3);
    const colA = a % 3;
    const rowB = Math.floor(b / 3);
    const colB = b % 3;

    if (rowA === rowB) {
      return { top: `${rowA * 33.33 + 16.67}%`, left: '5%', width: '90%', height: 4 };
    }
    if (colA === colB) {
      return { left: `${colA * 33.33 + 16.67}%`, top: '5%', width: 4, height: '90%' };
    }
    if ((a === 0 && b === 8) || (a === 8 && b === 0)) {
      return { top: '50%', left: '5%', width: '127%', height: 4, transform: 'rotate(45deg)', transformOrigin: 'left center' };
    }
    return { top: '50%', right: '5%', width: '127%', height: 4, transform: 'rotate(-45deg)', transformOrigin: 'right center' };
  };

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setGameMode('pvp'); resetGame(); }}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all"
            style={{ background: gameMode === 'pvp' ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)', color: gameMode === 'pvp' ? '#d4a853' : '#9ca3af' }}
          >
            <Users size={12} /> PvP
          </button>
          <button
            onClick={() => { setGameMode('ai'); resetGame(); }}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all"
            style={{ background: gameMode === 'ai' ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)', color: gameMode === 'ai' ? '#d4a853' : '#9ca3af' }}
          >
            <Bot size={12} /> vs IA
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
          <span style={{ color: '#d4a853' }}>X: {scores.xWins}</span>
          <span>Empates: {scores.draws}</span>
          <span style={{ color: '#fff' }}>O: {scores.oWins}</span>
        </div>
        <button onClick={resetGame} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4">
        <span className="text-sm font-medium" style={{ color: currentPlayer === 'X' ? '#d4a853' : '#fff' }}>
          Turno de {currentPlayer === 'X' ? 'X' : 'O'}
        </span>

        <div className="relative" style={{ width: 300, height: 300 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, width: 300, height: 300 }}>
            {board.map((cell, i) => (
              <div
                key={i}
                onClick={() => handleCellClick(i)}
                className="flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
                style={{
                  background: '#1a2744',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {cell === 'X' && (
                  <svg width="60" height="60" viewBox="0 0 60 60">
                    <line x1="12" y1="12" x2="48" y2="48" stroke="#d4a853" strokeWidth="6" strokeLinecap="round" />
                    <line x1="48" y1="12" x2="12" y2="48" stroke="#d4a853" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                )}
                {cell === 'O' && (
                  <svg width="60" height="60" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="20" stroke="#fff" strokeWidth="6" fill="none" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* Winning line */}
          {winningLine.length === 3 && (
            <div
              className="absolute pointer-events-none"
              style={{
                ...getLineStyle(),
                background: '#d4a853',
                borderRadius: 2,
                position: 'absolute',
                zIndex: 10,
              }}
            />
          )}
        </div>
      </div>

      {(winner || draw) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.85)' }}>
          {winner ? (
            <>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#d4a853' }}>Ganador: {winner.winner}!</h2>
            </>
          ) : (
            <h2 className="text-2xl font-bold text-white mb-2">Empate!</h2>
          )}
          <button onClick={resetGame} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Nueva Partida</button>
        </div>
      )}
    </div>
  );
}

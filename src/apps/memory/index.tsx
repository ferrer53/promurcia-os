import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Clock, MousePointerClick, Brain } from 'lucide-react';

// Lucide icon names mapped to components - we'll use emoji pairs for memory cards
const CARD_EMOJIS = ['\ud83c\udfe0', '\ud83c\udfe2', '\ud83d\udd11', '\ud83d\udeaa', '\ud83d\udecf\ufe0f', '\ud83d\udebf', '\ud83c\udf33', '\ud83d\ude97', '\u2b50', '\ud83d\udc8e', '\u2764\ufe0f', '\ud83d\udc9b', '\ud83d\udc99', '\ud83d\udc9a', '\ud83d\udc9c', '\ud83c\udf0e', '\u2600\ufe0f', '\ud83c\udf19'];

const GRID_SIZES: Record<string, { rows: number; cols: number; pairs: number }> = {
  facil: { rows: 4, cols: 4, pairs: 8 },
  medio: { rows: 4, cols: 5, pairs: 10 },
  dificil: { rows: 6, cols: 6, pairs: 18 },
};

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createCards(pairCount: number): Card[] {
  const selected = CARD_EMOJIS.slice(0, pairCount);
  const pairs = shuffle([...selected, ...selected]);
  return pairs.map((emoji, i) => ({ id: i, emoji, isFlipped: false, isMatched: false }));
}

function getHighScore() {
  try { const d = localStorage.getItem('promurciaos_highscore_memory'); return d ? JSON.parse(d) : { bestMoves: Infinity, bestTime: Infinity }; }
  catch { return { bestMoves: Infinity, bestTime: Infinity }; }
}
function saveHighScore(score: { bestMoves: number; bestTime: number }) {
  try { localStorage.setItem('promurciaos_highscore_memory', JSON.stringify(score)); } catch {}
}

export default function Memory() {
  const [difficulty, setDifficulty] = useState('facil');
  const grid = GRID_SIZES[difficulty];
  const [cards, setCards] = useState<Card[]>(() => createCards(grid.pairs));
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [bestScore, setBestScore] = useState(getHighScore);
  const [isChecking, setIsChecking] = useState(false);

  const resetGame = useCallback((diff?: string) => {
    const g = GRID_SIZES[diff || difficulty];
    setCards(createCards(g.pairs));
    setFlippedCards([]);
    setMoves(0);
    setTimer(0);
    setGameComplete(false);
    setIsChecking(false);
  }, [difficulty]);

  // Timer
  useEffect(() => {
    if (gameComplete) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameComplete]);

  const handleCardClick = useCallback((index: number) => {
    if (isChecking || cards[index].isFlipped || cards[index].isMatched || flippedCards.length >= 2) return;

    const newCards = [...cards];
    newCards[index] = { ...newCards[index], isFlipped: true };
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsChecking(true);

      const [first, second] = newFlipped;
      if (newCards[first].emoji === newCards[second].emoji) {
        // Match!
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[first] = { ...updated[first], isMatched: true };
            updated[second] = { ...updated[second], isMatched: true };
            // Check win
            if (updated.every(c => c.isMatched)) {
              setGameComplete(true);
              const currentMoves = moves + 1;
              const newBest = {
                bestMoves: Math.min(bestScore.bestMoves, currentMoves),
                bestTime: Math.min(bestScore.bestTime, timer),
              };
              setBestScore(newBest);
              saveHighScore(newBest);
            }
            return updated;
          });
          setFlippedCards([]);
          setIsChecking(false);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[first] = { ...updated[first], isFlipped: false };
            updated[second] = { ...updated[second], isFlipped: false };
            return updated;
          });
          setFlippedCards([]);
          setIsChecking(false);
        }, 800);
      }
    }
  }, [cards, flippedCards, isChecking, moves, timer, bestScore]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-white"><MousePointerClick size={14} style={{ color: '#d4a853' }} /> {moves}</span>
          <span className="flex items-center gap-1 text-sm" style={{ color: '#6b7280' }}><Clock size={14} /> {formatTime(timer)}</span>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(GRID_SIZES).map(d => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); resetGame(d); }}
              className="px-2 py-1 rounded text-xs capitalize transition-all"
              style={{ background: difficulty === d ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.05)', color: difficulty === d ? '#d4a853' : '#9ca3af' }}
            >
              {d === 'facil' ? 'Facil' : d === 'medio' ? 'Medio' : 'Dificil'}
            </button>
          ))}
          <button onClick={() => resetGame()} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${grid.cols}, ${grid.cols > 4 ? 60 : 80}px)`,
          gridTemplateRows: `repeat(${grid.rows}, ${grid.cols > 4 ? 60 : 80}px)`,
          gap: 8,
        }}>
          {cards.map((card, i) => (
            <div
              key={card.id}
              onClick={() => handleCardClick(i)}
              className="flex items-center justify-center cursor-pointer transition-all duration-300"
              style={{
                width: grid.cols > 4 ? 60 : 80,
                height: grid.cols > 4 ? 60 : 80,
                background: card.isMatched ? 'rgba(34,197,94,0.2)' : card.isFlipped ? '#1a2744' : '#111d32',
                borderRadius: 8,
                border: card.isMatched ? '2px solid #22c55e' : card.isFlipped ? '2px solid #d4a853' : '2px solid rgba(255,255,255,0.1)',
                transform: card.isFlipped || card.isMatched ? 'rotateY(0deg)' : 'rotateY(180deg)',
                fontSize: grid.cols > 4 ? 24 : 32,
                backfaceVisibility: 'hidden',
                opacity: card.isMatched ? 0.8 : 1,
              }}
            >
              {card.isFlipped || card.isMatched ? card.emoji : (
                <Brain size={grid.cols > 4 ? 24 : 32} style={{ color: '#d4a853' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {bestScore.bestMoves < Infinity && (
        <div className="px-4 py-1 text-center">
          <p className="text-xs" style={{ color: '#6b7280' }}>Mejor: {bestScore.bestMoves} movimientos | {formatTime(bestScore.bestTime)}</p>
        </div>
      )}

      {gameComplete && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: 'rgba(10,22,40,0.85)' }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#22c55e' }}>Completado!</h2>
          <p className="text-sm mb-1" style={{ color: '#d4a853' }}>Movimientos: {moves}</p>
          <p className="text-sm mb-4" style={{ color: '#d4a853' }}>Tiempo: {formatTime(timer)}</p>
          <button onClick={() => resetGame()} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Nuevo Juego</button>
        </div>
      )}
    </div>
  );
}

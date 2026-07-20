import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';

const CANVAS_W = 380;
const CANVAS_H = 520;
const GRAVITY = 0.4;
const JUMP_FORCE = -7;
const PIPE_W = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 2.5;

function getHighScore() {
  try { const d = localStorage.getItem('promurciaos_highscore_flappy'); return d ? JSON.parse(d).score : 0; }
  catch { return 0; }
}
function saveHighScore(score: number) {
  try { localStorage.setItem('promurciaos_highscore_flappy', JSON.stringify({ score, date: new Date().toISOString() })); } catch {}
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(getHighScore);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    birdY: CANVAS_H / 2,
    birdVy: 0,
    pipes: [] as Pipe[],
    frameCount: 0,
    score: 0,
    gameOver: false,
    gameStarted: false,
  });

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.birdY = CANVAS_H / 2;
    s.birdVy = 0;
    s.pipes = [];
    s.frameCount = 0;
    s.score = 0;
    s.gameOver = false;
    s.gameStarted = false;
    setScore(0);
    setGameOver(false);
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver) {
      resetGame();
      return;
    }
    if (!s.gameStarted) {
      s.gameStarted = true;
      
    }
    s.birdVy = JUMP_FORCE;
  }, [resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const s = stateRef.current;

    const gameLoop = () => {
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw stars
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 30; i++) {
        const x = (i * 47 + 13) % CANVAS_W;
        const y = (i * 31 + 7) % (CANVAS_H - 60);
        ctx.fillRect(x, y, 1, 1);
      }

      // Ground
      ctx.fillStyle = '#111d32';
      ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);
      ctx.fillStyle = '#d4a853';
      ctx.fillRect(0, CANVAS_H - 42, CANVAS_W, 2);

      if (!s.gameStarted) {
        // Draw bird
        ctx.fillStyle = '#d4a853';
        ctx.beginPath();
        ctx.arc(CANVAS_W / 4, s.birdY, 10, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(CANVAS_W / 4 + 4, s.birdY - 3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a1628';
        ctx.beginPath();
        ctx.arc(CANVAS_W / 4 + 5, s.birdY - 3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pulsa ESPACIO o CLICK para comenzar', CANVAS_W / 2, CANVAS_H / 2 + 60);

        animId = requestAnimationFrame(gameLoop);
        return;
      }

      if (!s.gameOver) {
        s.frameCount++;

        // Update bird
        s.birdVy += GRAVITY;
        s.birdY += s.birdVy;

        // Ceiling/floor collision
        if (s.birdY < 10) { s.birdY = 10; s.birdVy = 0; }
        if (s.birdY > CANVAS_H - 50) {
          s.gameOver = true;
          setGameOver(true);
        }

        // Spawn pipes
        if (s.frameCount % 100 === 0) {
          const minGap = 80;
          const maxGap = CANVAS_H - 40 - PIPE_GAP - 80;
          s.pipes.push({
            x: CANVAS_W,
            gapY: minGap + Math.random() * (maxGap - minGap),
            passed: false,
          });
        }

        // Update pipes
        for (let i = s.pipes.length - 1; i >= 0; i--) {
          const p = s.pipes[i];
          p.x -= PIPE_SPEED;

          // Score
          if (!p.passed && p.x + PIPE_W < CANVAS_W / 4) {
            p.passed = true;
            s.score++;
            setScore(s.score);
            if (s.score > highScore) {
              setHighScore(s.score);
              saveHighScore(s.score);
            }
          }

          // Remove off-screen
          if (p.x + PIPE_W < 0) {
            s.pipes.splice(i, 1);
            continue;
          }

          // Collision
          const birdX = CANVAS_W / 4;
          const birdR = 10;
          if (birdX + birdR > p.x && birdX - birdR < p.x + PIPE_W) {
            if (s.birdY - birdR < p.gapY || s.birdY + birdR > p.gapY + PIPE_GAP) {
              s.gameOver = true;
              setGameOver(true);
            }
          }
        }
      }

      // Draw pipes
      for (const p of s.pipes) {
        ctx.fillStyle = '#22c55e';
        // Top pipe
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(p.x - 3, p.gapY - 18, PIPE_W + 6, 18);
        // Bottom pipe
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_W, CANVAS_H - p.gapY - PIPE_GAP);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(p.x - 3, p.gapY + PIPE_GAP, PIPE_W + 6, 18);
      }

      // Draw bird
      const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (s.birdVy * 0.08)));
      ctx.save();
      ctx.translate(CANVAS_W / 4, s.birdY);
      ctx.rotate(rotation);
      ctx.fillStyle = '#d4a853';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      // Wing
      ctx.fillStyle = '#b08d3f';
      ctx.beginPath();
      ctx.ellipse(-3, 3, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(CANVAS_W / 4 + 4, s.birdY - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a1628';
      ctx.beginPath();
      ctx.arc(CANVAS_W / 4 + 5, s.birdY - 3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Score
      ctx.fillStyle = '#d4a853';
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.score}`, CANVAS_W / 2, 60);

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">Puntos: <span style={{ color: '#d4a853' }}>{score}</span></span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#6b7280' }}>
            <Trophy size={12} /> Record: {highScore}
          </span>
        </div>
        <button onClick={resetGame} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={jump}
          style={{ border: '2px solid #d4a853', borderRadius: 8, cursor: 'pointer' }}
        />
      </div>

      <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: '#6b7280' }}>Espacio o Click para volar | Evita los tubos</p>
      </div>

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

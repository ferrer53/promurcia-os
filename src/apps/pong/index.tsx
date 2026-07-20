import { useState, useEffect, useCallback, useRef } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

const CANVAS_W = 600;
const CANVAS_H = 400;
const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_R = 8;
const WIN_SCORE = 10;
const INITIAL_BALL_SPEED = 5;

interface Ball {
  x: number; y: number; vx: number; vy: number;
}

function getHighScore() {
  try { const d = localStorage.getItem('promurciaos_highscore_pong'); return d ? JSON.parse(d).score : 0; }
  catch { return 0; }
}
function saveHighScore(score: number) {
  try { localStorage.setItem('promurciaos_highscore_pong', JSON.stringify({ score, date: new Date().toISOString() })); } catch {}
}

export default function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [highScore, setHighScore] = useState(getHighScore);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const stateRef = useRef({
    playerY: CANVAS_H / 2 - PADDLE_H / 2,
    aiY: CANVAS_H / 2 - PADDLE_H / 2,
    ball: { x: CANVAS_W / 2, y: CANVAS_H / 2, vx: INITIAL_BALL_SPEED, vy: 3 } as Ball,
    playerScore: 0,
    aiScore: 0,
    ballSpeed: INITIAL_BALL_SPEED,
    paused: false,
    gameOver: false,
    gameStarted: false,
    keys: {} as Record<string, boolean>,
  });

  const resetBall = useCallback((direction: number) => {
    const s = stateRef.current;
    s.ball = {
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      vx: INITIAL_BALL_SPEED * direction,
      vy: (Math.random() * 4 - 2),
    };
    s.ballSpeed = INITIAL_BALL_SPEED;
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.playerY = CANVAS_H / 2 - PADDLE_H / 2;
    s.aiY = CANVAS_H / 2 - PADDLE_H / 2;
    s.playerScore = 0;
    s.aiScore = 0;
    s.ballSpeed = INITIAL_BALL_SPEED;
    s.paused = false;
    s.gameOver = false;
    s.gameStarted = false;
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    setPaused(false);
    setWinner(null);
    resetBall(1);
  }, [resetBall]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const s = stateRef.current;

    const gameLoop = () => {
      if (!s.gameStarted) {
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2, 0);
        ctx.lineTo(CANVAS_W / 2, CANVAS_H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw paddles and ball
        ctx.fillStyle = '#fff';
        ctx.fillRect(20, s.playerY, PADDLE_W, PADDLE_H);
        ctx.fillRect(CANVAS_W - 20 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);

        ctx.fillStyle = '#d4a853';
        ctx.beginPath();
        ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#d4a853';

        ctx.fillStyle = '#fff';
        ctx.font = '48px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${s.playerScore}  ${s.aiScore}`, CANVAS_W / 2, 50);

        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('Pulsa ESPACIO para comenzar', CANVAS_W / 2, CANVAS_H / 2);

        animId = requestAnimationFrame(gameLoop);
        return;
      }

      if (!s.paused && !s.gameOver) {
        // Player movement
        if (s.keys['ArrowUp'] || s.keys['w'] || s.keys['W']) {
          s.playerY = Math.max(0, s.playerY - 6);
        }
        if (s.keys['ArrowDown'] || s.keys['s'] || s.keys['S']) {
          s.playerY = Math.min(CANVAS_H - PADDLE_H, s.playerY + 6);
        }

        // AI movement
        const aiCenter = s.aiY + PADDLE_H / 2;
        const targetY = s.ball.y;
        const aiSpeed = 4.5;
        if (aiCenter < targetY - 10) {
          s.aiY = Math.min(CANVAS_H - PADDLE_H, s.aiY + aiSpeed);
        } else if (aiCenter > targetY + 10) {
          s.aiY = Math.max(0, s.aiY - aiSpeed);
        }

        // Ball movement
        s.ball.x += s.ball.vx;
        s.ball.y += s.ball.vy;

        // Wall collision
        if (s.ball.y - BALL_R <= 0 || s.ball.y + BALL_R >= CANVAS_H) {
          s.ball.vy *= -1;
        }

        // Paddle collisions
        // Player paddle
        if (s.ball.x - BALL_R <= 20 + PADDLE_W && s.ball.x > 20 &&
            s.ball.y >= s.playerY && s.ball.y <= s.playerY + PADDLE_H && s.ball.vx < 0) {
          s.ball.vx *= -1;
          s.ballSpeed = Math.min(s.ballSpeed + 0.3, 12);
          s.ball.vx = s.ballSpeed;
          const hitPos = (s.ball.y - s.playerY) / PADDLE_H - 0.5;
          s.ball.vy = hitPos * 6;
        }

        // AI paddle
        if (s.ball.x + BALL_R >= CANVAS_W - 20 - PADDLE_W && s.ball.x < CANVAS_W - 20 &&
            s.ball.y >= s.aiY && s.ball.y <= s.aiY + PADDLE_H && s.ball.vx > 0) {
          s.ball.vx *= -1;
          s.ballSpeed = Math.min(s.ballSpeed + 0.3, 12);
          s.ball.vx = -s.ballSpeed;
          const hitPos = (s.ball.y - s.aiY) / PADDLE_H - 0.5;
          s.ball.vy = hitPos * 6;
        }

        // Score
        if (s.ball.x < 0) {
          s.aiScore++;
          setAiScore(s.aiScore);
          if (s.aiScore >= WIN_SCORE) {
            s.gameOver = true;
            setGameOver(true);
            setWinner('AI');
          } else {
            resetBall(1);
          }
        }
        if (s.ball.x > CANVAS_W) {
          s.playerScore++;
          setPlayerScore(s.playerScore);
          const newBest = Math.max(s.playerScore, highScore);
          if (newBest > highScore) {
            setHighScore(newBest);
            saveHighScore(newBest);
          }
          if (s.playerScore >= WIN_SCORE) {
            s.gameOver = true;
            setGameOver(true);
            setWinner('Jugador');
          } else {
            resetBall(-1);
          }
        }
      }

      // Render
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Center line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(20, s.playerY, PADDLE_W, PADDLE_H);
      ctx.fillRect(CANVAS_W - 20 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);

      // Ball
      ctx.fillStyle = '#d4a853';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#d4a853';
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Score
      ctx.fillStyle = '#fff';
      ctx.font = '48px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.playerScore}  ${s.aiScore}`, CANVAS_W / 2, 50);

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [resetBall, highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      s.keys[e.key] = true;

      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (!s.gameStarted) {
          s.gameStarted = true;
    
          return;
        }
        s.paused = !s.paused;
        setPaused(s.paused);
      }

      if (s.gameOver && (e.key === 'Enter' || e.key === 'r' || e.key === 'R')) {
        resetGame();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetGame]);

  return (
    <div className="flex flex-col items-center h-full select-none" style={{ background: '#0a1628' }}>
      <div className="flex items-center justify-between w-full px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white">Jugador: <span style={{ color: '#d4a853' }}>{playerScore}</span></span>
          <span className="text-sm font-medium text-white">IA: <span style={{ color: '#ef4444' }}>{aiScore}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6b7280' }}>Record: {highScore}</span>
          <button onClick={() => { stateRef.current.paused = !stateRef.current.paused; setPaused(stateRef.current.paused); }} className="px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <button onClick={resetGame} className="px-3 py-1 rounded-md text-xs transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ border: '2px solid #d4a853', borderRadius: 8 }} />
      </div>

      <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs" style={{ color: '#6b7280' }}>Flechas/WASD para mover | Espacio para servir/pausar | Primero en 10 puntos gana</p>
      </div>

      {(gameOver || paused) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ background: gameOver ? 'rgba(10,22,40,0.85)' : 'rgba(10,22,40,0.7)' }}>
          {gameOver ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">{winner === 'Jugador' ? 'Victoria!' : 'Derrota'}</h2>
              <p className="text-lg mb-1" style={{ color: '#d4a853' }}>Resultado: {playerScore} - {aiScore}</p>
              <button onClick={resetGame} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Reintentar</button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-4">Pausa</h2>
              <button onClick={() => { stateRef.current.paused = false; setPaused(false); }} className="px-6 py-2 rounded-md font-medium transition-all hover:scale-105" style={{ background: '#d4a853', color: '#0a1628' }}>Continuar</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

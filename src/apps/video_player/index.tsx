import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward,
  Settings, Film
} from 'lucide-react';

interface Video {
  id: number;
  title: string;
  duration: number; // seconds
  color: string;
}

const VIDEOS: Video[] = [
  { id: 1, title: 'Tour virtual - Chalet La Manga', duration: 245, color: '#1a2744' },
  { id: 2, title: 'Presentacion Promurcia 2026', duration: 182, color: '#111d32' },
  { id: 3, title: 'Guia de compra inmobiliaria', duration: 320, color: '#0f1a2b' },
  { id: 4, title: 'Visita propiedad Centro Murcia', duration: 156, color: '#1e3a5f' },
  { id: 5, title: 'Tutorial CRM Cerebro', duration: 480, color: '#2d1b4e' },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer() {
  const [currentVideo, setCurrentVideo] = useState<Video>(VIDEOS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= currentVideo.duration) {
            setIsPlaying(false);
            return 0;
          }
          setProgress((prev + 1) / currentVideo.duration * 100);
          return prev + 1;
        });
      }, 1000);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying, currentVideo]);

  useEffect(() => {
    setCurrentTime(0);
    setProgress(0);
    setIsPlaying(false);
  }, [currentVideo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.code === 'ArrowLeft') setCurrentTime(p => Math.max(0, p - 10));
      if (e.code === 'ArrowRight') setCurrentTime(p => Math.min(currentVideo.duration, p + 10));
      if (e.code === 'KeyM') setIsMuted(m => !m);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideo.duration]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setProgress(pct * 100);
    setCurrentTime(pct * currentVideo.duration);
  }, [currentVideo.duration]);

  return (
    <div className="flex h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Main player */}
      <div className="flex-1 flex flex-col">
        {/* Video area */}
        <div className="flex-1 relative flex items-center justify-center" style={{ background: '#000' }}>
          {/* Animated placeholder */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-all duration-1000"
            style={{
              background: isPlaying
                ? `radial-gradient(circle at 50% 50%, ${currentVideo.color}, #000)`
                : `linear-gradient(135deg, ${currentVideo.color}, #0a1628)`,
            }}
          >
            {/* Animated particles when playing */}
            {isPlaying && (
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: 2 + Math.random() * 4,
                      height: 2 + Math.random() * 4,
                      background: '#d4a853',
                      opacity: 0.3 + Math.random() * 0.5,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
                      animationDelay: `${Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>
            )}
            {!isPlaying && (
              <div className="flex flex-col items-center gap-3 z-10">
                <Film size={64} color="#d4a853" opacity={0.5} />
                <span className="text-sm" style={{ color: '#6b7280' }}>{currentVideo.title}</span>
              </div>
            )}
          </div>

          {/* Play overlay button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: 'rgba(212,168,83,0.2)', border: '2px solid rgba(212,168,83,0.5)' }}
          >
            {isPlaying ? <Pause size={28} color="#d4a853" /> : <Play size={28} color="#d4a853" fill="#d4a853" />}
          </button>
        </div>

        {/* Controls */}
        <div className="px-4 py-3" style={{ background: '#111d32', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full cursor-pointer mb-3"
            style={{ background: '#1a2744' }}
            onClick={handleProgressClick}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: '#d4a853' }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 rounded hover:bg-white/5">
              {isPlaying ? <Pause size={18} color="#d4a853" /> : <Play size={18} color="#d4a853" />}
            </button>
            <button onClick={() => setCurrentTime(0)} className="p-1.5 rounded hover:bg-white/5">
              <SkipBack size={16} color="#9ca3af" />
            </button>
            <button onClick={() => setCurrentTime(p => Math.min(currentVideo.duration, p + 30))} className="p-1.5 rounded hover:bg-white/5">
              <SkipForward size={16} color="#9ca3af" />
            </button>
            <span className="text-xs font-mono" style={{ color: '#9ca3af' }}>
              {formatTime(currentTime)} / {formatTime(currentVideo.duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded hover:bg-white/5">
                {isMuted || volume === 0 ? <VolumeX size={16} color="#9ca3af" /> : <Volume2 size={16} color="#9ca3af" />}
              </button>
              {showVolumeSlider && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 px-2 py-3 rounded-lg" style={{ background: '#1a2744' }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={e => { setVolume(Number(e.target.value)); setIsMuted(false); }}
                    className="w-20"
                    style={{ accentColor: '#d4a853' }}
                  />
                </div>
              )}
            </div>

            <button className="p-1.5 rounded hover:bg-white/5">
              <Settings size={16} color="#9ca3af" />
            </button>
            <button className="p-1.5 rounded hover:bg-white/5">
              <Maximize size={16} color="#9ca3af" />
            </button>
          </div>
        </div>
      </div>

      {/* Playlist sidebar */}
      <div className="w-56 shrink-0 border-l overflow-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        <div className="p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#6b7280' }}>Lista de reproduccion</h3>
          <div className="space-y-2">
            {VIDEOS.map(video => (
              <button
                key={video.id}
                onClick={() => setCurrentVideo(video)}
                className="w-full text-left rounded-lg p-2 transition-all"
                style={{
                  background: currentVideo.id === video.id ? 'rgba(212,168,83,0.1)' : 'transparent',
                  border: currentVideo.id === video.id ? '1px solid rgba(212,168,83,0.2)' : '1px solid transparent',
                }}
              >
                <div className="flex gap-2">
                  <div className="w-16 h-10 rounded flex items-center justify-center shrink-0" style={{ background: video.color }}>
                    <Film size={14} color="#d4a853" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs truncate ${currentVideo.id === video.id ? 'font-medium text-[#d4a853]' : ''}`} style={{ color: '#d1d5db' }}>
                      {video.title}
                    </div>
                    <div className="text-[10px]" style={{ color: '#4b5563' }}>{formatTime(video.duration)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOSStore } from '@/stores/osStore';
import { useAuth, ROLE_LABELS } from '@/hooks/useAuth';
import { WindowManager } from './WindowManager';
import { Taskbar } from './Taskbar';
import { AppLauncher } from './AppLauncher';
import { NotificationPanel } from './NotificationPanel';
import { DesktopIcon } from './DesktopIcon';
import Login from '@/pages/Login';
import { Loader2 } from 'lucide-react';

export function Desktop() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const wallpaper = useOSStore((s) => s.wallpaper);
  const desktopIcons = useOSStore((s) => s.desktopIcons);
  const showLauncher = useOSStore((s) => s.showLauncher);
  const parallaxRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const wallpaperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Subtle parallax effect on mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    parallaxRef.current.targetX = ((e.clientX - centerX) / centerX) * -3;
    parallaxRef.current.targetY = ((e.clientY - centerY) / centerY) * -3;
  }, []);

  useEffect(() => {
    const animate = () => {
      const p = parallaxRef.current;
      p.x += (p.targetX - p.x) * 0.1;
      p.y += (p.targetY - p.y) * 0.1;
      if (wallpaperRef.current) {
        wallpaperRef.current.style.transform = `translate(${p.x}px, ${p.y}px) scale(1.02)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0a1628' }}>
        <div className="text-center">
          <Loader2 size={40} color="#d4a853" className="animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: '#6b7280' }}>Cargando PromurciaOS...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Authenticated desktop
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#0a1628' }}>
      {/* Wallpaper Layer */}
      <div
        ref={wallpaperRef}
        className="fixed inset-[-10px] z-0"
        style={{
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          willChange: 'transform',
        }}
      />

      {/* Desktop Layer */}
      <div
        className="relative z-10"
        style={{
          width: '100vw',
          height: 'calc(100dvh - 52px)',
        }}
      >
        {/* Desktop Icons */}
        {desktopIcons.map((icon) => (
          <DesktopIcon key={icon.id} icon={icon} />
        ))}

        {/* Window Manager */}
        <WindowManager />
      </div>

      {/* Taskbar */}
      <Taskbar userName={user?.name} userRole={user?.role ? ROLE_LABELS[user.role] : undefined} />

      {/* App Launcher Overlay */}
      {showLauncher && <AppLauncher />}

      {/* Notification Panel */}
      <NotificationPanel />
    </div>
  );
}

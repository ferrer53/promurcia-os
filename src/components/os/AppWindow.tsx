import { useRef, useCallback, useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Minus, Square, X, SquareIcon, ArrowLeft } from 'lucide-react';
import { useOSStore } from '@/stores/osStore';
import type { OSWindow } from '@/stores/osStore';
import { getAppById } from '@/stores/appRegistry';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface AppWindowProps {
  window: OSWindow;
}

export function AppWindow({ window: w }: AppWindowProps) {
  const focusWindow = useOSStore((s) => s.focusWindow);
  const closeWindow = useOSStore((s) => s.closeWindow);
  const minimizeWindow = useOSStore((s) => s.minimizeWindow);
  const maximizeWindow = useOSStore((s) => s.maximizeWindow);
  const restoreWindow = useOSStore((s) => s.restoreWindow);
  const updateWindowPosition = useOSStore((s) => s.updateWindowPosition);
  const updateWindowSize = useOSStore((s) => s.updateWindowSize);
  const focusedWindowId = useOSStore((s) => s.focusedWindowId);

  const isFocused = focusedWindowId === w.id;
  const app = getAppById(w.appId);

  const headerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  const IconComp = app ? (Icons[app.icon as keyof typeof Icons] as LucideIcon) : null;

  // Handle window focus
  const handleWindowClick = useCallback(() => {
    if (!isFocused) {
      focusWindow(w.id);
    }
  }, [isFocused, focusWindow, w.id]);

  // Dragging
  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (w.maximized) return;
      if ((e.target as HTMLElement).closest('.window-control-btn')) return;

      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        winX: w.x,
        winY: w.y,
      };
      focusWindow(w.id);
    },
    [w.x, w.y, w.maximized, focusWindow, w.id]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      let newX = dragStartRef.current.winX + dx;
      let newY = dragStartRef.current.winY + dy;

      // Keep at least 100px visible
      const maxX = window.innerWidth - 100;
      const maxY = window.innerHeight - 100;
      newX = Math.max(-w.width + 100, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      updateWindowPosition(w.id, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, w.id, w.width, updateWindowPosition]);

  // Double-click header to maximize
  const handleHeaderDoubleClick = useCallback(() => {
    if (w.maximized) {
      restoreWindow(w.id);
    } else {
      maximizeWindow(w.id);
    }
  }, [w.maximized, maximizeWindow, restoreWindow, w.id]);

  // Resizing from bottom-right corner
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: w.width,
        height: w.height,
      };
    },
    [w.width, w.height]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;
      const newWidth = Math.max(app?.minWidth ?? 400, resizeStartRef.current.width + dx);
      const newHeight = Math.max(app?.minHeight ?? 300, resizeStartRef.current.height + dy);
      updateWindowSize(w.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, w.id, app, updateWindowSize]);

  // Compute window position/size
  const winStyle = w.maximized
    ? {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight - 52,
      }
    : {
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
      };

  return (
    <motion.div
      ref={windowRef}
      layout
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{
        opacity: w.minimized ? 0 : 1,
        scale: w.minimized ? 0 : 1,
        x: winStyle.x,
        y: winStyle.y,
        width: winStyle.width,
        height: winStyle.height,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: easeOutExpo }}
      className="app-window absolute flex flex-col window-chrome"
      style={{
        zIndex: w.zIndex,
        cursor: isDragging ? 'grabbing' : 'default',
        pointerEvents: w.minimized ? 'none' : 'auto',
        borderRadius: w.maximized ? 0 : 16,
      }}
      onMouseDown={handleWindowClick}
    >
      {/* Window Border & Shadow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-200"
        style={{
          borderRadius: w.maximized ? 0 : 16,
          boxShadow: isFocused
            ? '0 0 0 1px rgba(212, 168, 83, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      />

      {/* Header Bar */}
      <div
        ref={headerRef}
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={handleHeaderDoubleClick}
        className="app-window-header relative flex items-center justify-between select-none shrink-0"
        style={{
          height: 40,
          background: isFocused ? '#111d32' : '#0f1a2b',
          borderRadius: w.maximized ? 0 : '16px 16px 0 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '0 12px',
          cursor: w.maximized ? 'default' : isDragging ? 'grabbing' : 'grab',
          zIndex: 2,
        }}
      >
        {/* Left: Back button (mobile) + Icon + Title */}
        <div className="flex items-center gap-2 overflow-hidden" style={{ maxWidth: '60%' }}>
          <button
            onClick={() => closeWindow(w.id)}
            className="window-control-btn md:hidden flex items-center justify-center rounded-md transition-all duration-150 mr-1"
            style={{ width: 32, height: 32 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212, 168, 83, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            title="Atras"
          >
            <ArrowLeft size={16} color={isFocused ? '#d4a853' : '#9ca3af'} />
          </button>
          <div className="hidden md:block">
            {IconComp && <IconComp size={16} color={isFocused ? '#d4a853' : '#6b7280'} />}
          </div>
          <span
            className="text-[13px] font-medium truncate"
            style={{ color: isFocused ? '#fff' : '#9ca3af' }}
          >
            {w.title}
          </span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1">
          <button
            className="window-control-btn flex items-center justify-center rounded-md transition-all duration-150"
            style={{ width: 32, height: 32 }}
            onClick={() => minimizeWindow(w.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212, 168, 83, 0.1)';
              (e.currentTarget.firstChild as HTMLElement)!.style.color = '#d4a853';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              (e.currentTarget.firstChild as HTMLElement)!.style.color = '#9ca3af';
            }}
            title="Minimizar"
          >
            <Minus size={14} color="#9ca3af" />
          </button>
          <button
            className="window-control-btn flex items-center justify-center rounded-md transition-all duration-150"
            style={{ width: 32, height: 32 }}
            onClick={() => {
              if (w.maximized) restoreWindow(w.id);
              else maximizeWindow(w.id);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212, 168, 83, 0.1)';
              (e.currentTarget.firstChild as HTMLElement)!.style.color = '#d4a853';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              (e.currentTarget.firstChild as HTMLElement)!.style.color = '#9ca3af';
            }}
            title={w.maximized ? 'Restaurar' : 'Maximizar'}
          >
            {w.maximized ? (
              <SquareIcon size={14} color="#9ca3af" />
            ) : (
              <Square size={14} color="#9ca3af" />
            )}
          </button>
          <button
            className="window-control-btn flex items-center justify-center rounded-md transition-all duration-150"
            style={{ width: 32, height: 32 }}
            onClick={() => closeWindow(w.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              (e.currentTarget.firstChild as HTMLElement)!.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              (e.currentTarget.firstChild as HTMLElement)!.style.color = '#9ca3af';
            }}
            title="Cerrar"
          >
            <X size={14} color="#9ca3af" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className="app-window-content relative flex-1 overflow-auto"
        style={{
          background: '#0a1628',
          borderRadius: w.maximized ? 0 : '0 0 16px 16px',
          zIndex: 1,
        }}
      >
        {app && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400 text-sm">Cargando...</div>
              </div>
            }
          >
            <app.component />
          </Suspense>
        )}
      </div>

      {/* Resize Handle (bottom-right corner) */}
      {!w.maximized && app?.resizable && (
        <div
          className="absolute z-10"
          style={{
            right: 0,
            bottom: 0,
            width: 16,
            height: 16,
            cursor: 'nwse-resize',
            background: 'transparent',
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </motion.div>
  );
}

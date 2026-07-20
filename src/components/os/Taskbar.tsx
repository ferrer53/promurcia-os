import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  Volume2,
  Wifi,
  Bell,
  LogOut,
  User,
} from 'lucide-react';
import { useOSStore } from '@/stores/osStore';
import { getAppById } from '@/stores/appRegistry';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

interface TaskbarProps {
  userName?: string;
  userRole?: string;
}

export function Taskbar({ userName, userRole }: TaskbarProps) {
  const windows = useOSStore((s) => s.windows);
  const focusedWindowId = useOSStore((s) => s.focusedWindowId);
  const toggleLauncher = useOSStore((s) => s.toggleLauncher);
  const focusWindow = useOSStore((s) => s.focusWindow);
  const minimizeWindow = useOSStore((s) => s.minimizeWindow);
  const toggleNotificationPanel = useOSStore((s) => s.toggleNotificationPanel);
  const notifications = useOSStore((s) => s.notifications);
  const logout = useOSStore((s) => s.logout);

  const [time, setTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleWindowClick = useCallback(
    (windowId: string) => {
      if (focusedWindowId === windowId) {
        minimizeWindow(windowId);
      } else {
        focusWindow(windowId);
      }
    },
    [focusedWindowId, focusWindow, minimizeWindow]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const timeStr = time.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dateStr = time.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ y: 60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.2 }}
      className="os-taskbar fixed bottom-0 left-0 right-0 z-[1000] flex items-center justify-between px-3"
      style={{
        height: 52,
        background: 'rgba(10, 22, 40, 0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(212, 168, 83, 0.15)',
      }}
    >
      {/* Left: App Launcher Button */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLauncher}
          className="os-taskbar-icon flex items-center justify-center rounded-[10px] transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            width: 40,
            height: 40,
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(212, 168, 83, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Aplicaciones"
        >
          <Home size={22} color="#d4a853" />
        </button>
      </div>

      {/* Center: Open Window Indicators */}
      <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        {windows.map((w) => {
          const app = getAppById(w.appId);
          const isFocused = focusedWindowId === w.id;
          const IconComp = app
            ? (Icons[app.icon as keyof typeof Icons] as LucideIcon)
            : null;

          return (
            <button
              key={w.id}
              onClick={() => handleWindowClick(w.id)}
              className="os-taskbar-icon relative flex items-center justify-center rounded-[10px] transition-all duration-200"
              style={{
                width: 44,
                height: 44,
                background: isFocused
                  ? 'rgba(212, 168, 83, 0.1)'
                  : 'transparent',
                opacity: w.minimized ? 0.6 : 1,
                filter: w.minimized ? 'grayscale(0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isFocused) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isFocused
                  ? 'rgba(212, 168, 83, 0.1)'
                  : 'transparent';
              }}
              title={w.title}
            >
              {IconComp && <IconComp size={20} color={isFocused ? '#d4a853' : '#9ca3af'} />}
              {/* Focus indicator */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-200"
                style={{
                  width: isFocused ? 24 : 16,
                  height: 2,
                  background: isFocused ? '#d4a853' : 'rgba(255,255,255,0.1)',
                  boxShadow: isFocused ? '0 0 8px rgba(212,168,83,0.3)' : 'none',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Right: System Tray */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <button
          onClick={toggleNotificationPanel}
          className="os-taskbar-icon relative flex items-center justify-center rounded-[10px] transition-all duration-200 hover:bg-white/[0.06]"
          style={{ width: 36, height: 36 }}
        >
          <Bell size={18} color="#9ca3af" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 rounded-full bg-red-500"
              style={{ width: 8, height: 8 }}
            />
          )}
        </button>

        {/* Volume - desktop only */}
        <button
          className="os-taskbar-sys flex items-center justify-center rounded-[10px] transition-all duration-200 hover:bg-white/[0.06]"
          style={{ width: 36, height: 36 }}
        >
          <Volume2 size={18} color="#9ca3af" />
        </button>

        {/* Network - desktop only */}
        <button
          className="os-taskbar-sys flex items-center justify-center rounded-[10px] transition-all duration-200 hover:bg-white/[0.06]"
          style={{ width: 36, height: 36 }}
        >
          <Wifi size={18} color="#9ca3af" />
        </button>

        {/* User info */}
        <div
          ref={userMenuRef}
          className="os-taskbar-user relative"
        >
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-md px-2 py-1 transition-all duration-200 hover:bg-white/[0.04]"
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 28,
                height: 28,
                background: 'rgba(212,168,83,0.2)',
              }}
            >
              <User size={14} color="#d4a853" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-medium text-white leading-tight">
                {userName || 'Usuario'}
              </span>
              {userRole && (
                <span className="text-[9px] leading-tight" style={{ color: '#d4a853' }}>
                  {userRole}
                </span>
              )}
            </div>
          </button>

          {/* User dropdown menu */}
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-full right-0 mb-2 rounded-xl overflow-hidden"
              style={{
                width: 180,
                background: 'rgba(10,22,40,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(212,168,83,0.15)',
              }}
            >
              <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-medium text-white">{userName || 'Usuario'}</p>
                <p className="text-[10px]" style={{ color: '#d4a853' }}>{userRole || ''}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-all duration-150 hover:bg-red-500/10 text-red-400"
              >
                <LogOut size={14} />
                Cerrar sesion
              </button>
            </motion.div>
          )}
        </div>

        {/* Clock */}
        <div
          className="os-taskbar-time flex flex-col items-end rounded-md px-2 py-1 transition-all duration-200 hover:bg-white/[0.04] cursor-pointer"
        >
          <span className="text-[13px] font-medium text-white leading-tight">
            {timeStr}
          </span>
          <span className="text-[10px] text-gray-400 leading-tight">
            {dateStr}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';
import { useOSStore } from '@/stores/osStore';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const typeColors = {
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

export function NotificationPanel() {
  const notifications = useOSStore((s) => s.notifications);
  const showNotificationPanel = useOSStore((s) => s.showNotificationPanel);
  const toggleNotificationPanel = useOSStore((s) => s.toggleNotificationPanel);
  const removeNotification = useOSStore((s) => s.removeNotification);
  const markNotificationRead = useOSStore((s) => s.markNotificationRead);

  // Auto-dismiss individual toasts after 4s
  useEffect(() => {
    const timers = notifications
      .filter((n) => !n.read)
      .map((n) =>
        setTimeout(() => {
          removeNotification(n.id);
        }, 4000)
      );
    return () => timers.forEach(clearTimeout);
  }, [notifications, removeNotification]);

  return (
    <>
      {/* Toast Stack - Top Right */}
      <div
        className="fixed z-[1040] flex flex-col gap-2"
        style={{ top: 16, right: 16, maxWidth: 360 }}
      >
        <AnimatePresence>
          {notifications.slice(0, 5).map((n) => (
            <motion.div
              key={n.id}
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 120, opacity: 0 }}
              transition={{ duration: 0.4, ease: easeOutExpo }}
              className="relative rounded-md p-4"
              style={{
                background: '#111d32',
                borderLeft: `3px solid ${typeColors[n.type]}`,
                minWidth: 280,
              }}
            >
              <button
                onClick={() => removeNotification(n.id)}
                className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
              <h4 className="text-[13px] font-medium text-white pr-5">{n.title}</h4>
              <p className="text-[11px] text-gray-400 mt-1">{n.message}</p>
              <span className="text-[10px] text-gray-600 mt-2 block">
                {new Date(n.timestamp).toLocaleTimeString('es-ES')}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Notification Panel - Slide up from taskbar */}
      <AnimatePresence>
        {showNotificationPanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: easeOutExpo }}
            className="fixed z-[1011] glass-heavy"
            style={{
              bottom: 52,
              right: 12,
              width: 380,
              height: 480,
              borderRadius: '16px 16px 0 0',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold text-white">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      notifications.forEach((n) => {
                        if (!n.read) markNotificationRead(n.id);
                      });
                    }}
                    className="text-[11px] text-gray-400 hover:text-[#d4a853] transition-colors"
                  >
                    Marcar todas como leidas
                  </button>
                )}
                <button
                  onClick={toggleNotificationPanel}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Bell size={32} className="mb-2 opacity-30" />
                  <span className="text-sm">No hay notificaciones</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="relative rounded-lg p-3 transition-colors hover:bg-white/[0.02] cursor-pointer"
                    style={{
                      borderLeft: n.read
                        ? '2px solid transparent'
                        : `2px solid ${typeColors[n.type]}`,
                      background: n.read ? 'transparent' : 'rgba(212,168,83,0.03)',
                    }}
                    onClick={() => markNotificationRead(n.id)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      className="absolute top-2 right-2 text-gray-600 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                    <h4 className="text-[13px] font-medium text-white pr-5">{n.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-gray-600 mt-1 block">
                      {new Date(n.timestamp).toLocaleTimeString('es-ES')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

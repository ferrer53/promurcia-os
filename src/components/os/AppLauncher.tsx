import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useOSStore } from '@/stores/osStore';
import {
  appRegistry,
  categoryLabels,
  categoryColors,
  getAppsByCategory,
  searchApps,
} from '@/stores/appRegistry';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];
const categories = ['todas', 'crm', 'productividad', 'utilidades', 'multimedia', 'herramientas', 'juegos'] as const;

export function AppLauncher() {
  const toggleLauncher = useOSStore((s) => s.toggleLauncher);
  const openWindow = useOSStore((s) => s.openWindow);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todas');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search on mount
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleLauncher();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLauncher]);

  const filteredApps = useMemo(() => {
    let apps = searchQuery.trim()
      ? searchApps(searchQuery)
      : getAppsByCategory(activeCategory as typeof categories[number]);
    if (searchQuery.trim()) {
      // When searching, don't filter by category
    } else if (activeCategory !== 'todas') {
      apps = getAppsByCategory(activeCategory as typeof categories[number]);
    }
    return apps;
  }, [searchQuery, activeCategory]);

  const handleAppClick = (appId: string, appName: string) => {
    const app = appRegistry.find((a) => a.id === appId);
    if (app) {
      openWindow(appId, appName, app.defaultWidth, app.defaultHeight);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[1010] flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={toggleLauncher}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.35, ease: easeOutExpo }}
        className="app-launcher-panel glass-heavy flex flex-col overflow-hidden"
        style={{
          width: 'min(900px, 90vw)',
          height: 'min(600px, 80vh)',
          borderRadius: 20,
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={18}
              color="#6b7280"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aplicaciones..."
              className="w-full rounded-full text-sm text-white placeholder-gray-500 outline-none transition-colors"
              style={{
                height: 44,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '0 40px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#d4a853';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            />
          </div>
          <button
            onClick={toggleLauncher}
            className="flex items-center justify-center rounded-md transition-all duration-150 hover:bg-white/[0.08]"
            style={{ width: 36, height: 36 }}
          >
            <X size={18} color="#9ca3af" />
          </button>
        </div>

        {/* Category Tabs */}
        {!searchQuery.trim() && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0"
                style={{
                  background: activeCategory === cat ? '#d4a853' : 'transparent',
                  color: activeCategory === cat ? '#0a1628' : '#9ca3af',
                }}
                onMouseEnter={(e) => {
                  if (activeCategory !== cat) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeCategory !== cat) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        )}

        {/* App Grid */}
        <div
          className="app-launcher-grid flex-1 overflow-y-auto grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            padding: '8px 0',
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredApps.map((app, index) => {
              const IconComp = (Icons[app.icon as keyof typeof Icons] as LucideIcon) ?? Icons.HelpCircle;
              const catColor = categoryColors[app.category];

              return (
                <motion.button
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.25,
                    delay: index * 0.02,
                    ease: easeOutExpo,
                  }}
                  onClick={() => handleAppClick(app.id, app.name)}
                  className="flex flex-col items-center gap-1.5 rounded-xl transition-all duration-150 p-2 group"
                  style={{ minHeight: 88 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 168, 83, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    className="flex items-center justify-center transition-all duration-150 group-hover:scale-110 group-hover:brightness-110"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${catColor}25`,
                      border: '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(212, 168, 83, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <IconComp size={24} color={catColor} />
                  </div>
                  <span
                    className="text-[11px] font-medium text-center leading-tight max-w-full truncate px-1 transition-colors duration-150 group-hover:text-white"
                    style={{ color: '#9ca3af' }}
                  >
                    {app.name}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>

          {filteredApps.length === 0 && (
            <div className="col-span-full flex items-center justify-center text-gray-500 text-sm py-12">
              No se encontraron aplicaciones
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

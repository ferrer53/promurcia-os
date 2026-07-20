import { create } from 'zustand';

export interface OSWindow {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  prevRect?: { x: number; y: number; width: number; height: number };
}

export interface OSNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  appId?: string;
  timestamp: number;
  read: boolean;
}

export interface DesktopIconItem {
  id: string;
  appId: string;
  label: string;
  x: number;
  y: number;
}

interface OSState {
  // Windows
  windows: OSWindow[];
  focusedWindowId: string | null;
  highestZIndex: number;

  // Launcher
  showLauncher: boolean;
  launcherSearch: string;
  launcherCategory: string;

  // Notifications
  notifications: OSNotification[];
  showNotificationPanel: boolean;

  // System
  wallpaper: string;
  theme: 'dark';
  user: { name: string; email: string; avatar?: string; role: string };

  // Desktop icons
  desktopIcons: DesktopIconItem[];

  // Actions
  openWindow: (appId: string, title: string, defaultWidth?: number, defaultHeight?: number) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, x: number, y: number) => void;
  updateWindowSize: (windowId: string, width: number, height: number) => void;
  toggleLauncher: () => void;
  setLauncherSearch: (query: string) => void;
  setLauncherCategory: (category: string) => void;
  setWallpaper: (wallpaper: string) => void;
  addNotification: (notification: Omit<OSNotification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  toggleNotificationPanel: () => void;
  minimizeAll: () => void;
}

const BASE_Z_INDEX = 100;
const MAX_Z_INDEX = 990;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export const useOSStore = create<OSState>((set, get) => ({
  // Initial state
  windows: [],
  focusedWindowId: null,
  highestZIndex: BASE_Z_INDEX,

  showLauncher: false,
  launcherSearch: '',
  launcherCategory: 'todas',

  notifications: [],
  showNotificationPanel: false,

  wallpaper: '/wallpaper-default.jpg',
  theme: 'dark',
  user: {
    name: 'Usuario',
    email: 'usuario@promurcia.com',
    role: 'Administrador',
  },

  desktopIcons: [
    { id: 'icon-1', appId: 'cerebro_crm', label: 'Cerebro Promurcia', x: 20, y: 20 },
    { id: 'icon-2', appId: 'filemanager', label: 'Archivos', x: 20, y: 110 },
    { id: 'icon-3', appId: 'browser', label: 'Navegador', x: 20, y: 200 },
    { id: 'icon-4', appId: 'settings', label: 'Ajustes', x: 20, y: 290 },
  ],

  // Actions
  openWindow: (appId, title, defaultWidth = 900, defaultHeight = 600) => {
    const state = get();
    // Check if single-instance app already open
    const existing = state.windows.find(w => w.appId === appId && !w.minimized);
    if (existing) {
      get().focusWindow(existing.id);
      return;
    }

    const id = generateId();
    const offset = state.windows.length * 20;
    const maxX = typeof window !== 'undefined' ? window.innerWidth - defaultWidth - 100 : 200;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - defaultHeight - 100 : 100;
    const x = Math.max(60, Math.min(120 + offset, maxX));
    const y = Math.max(40, Math.min(80 + offset, maxY));
    const newZIndex = Math.min(state.highestZIndex + 1, MAX_Z_INDEX);

    const newWindow: OSWindow = {
      id,
      appId,
      title,
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
      zIndex: newZIndex,
      minimized: false,
      maximized: false,
    };

    set({
      windows: [...state.windows, newWindow],
      focusedWindowId: id,
      highestZIndex: newZIndex,
      showLauncher: false,
    });
  },

  closeWindow: (windowId) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== windowId),
      focusedWindowId: state.focusedWindowId === windowId
        ? state.windows.filter((w) => w.id !== windowId && !w.minimized).slice(-1)[0]?.id ?? null
        : state.focusedWindowId,
    }));
  },

  minimizeWindow: (windowId) => {
    set((state) => {
      const updatedWindows = state.windows.map((w) =>
        w.id === windowId ? { ...w, minimized: true } : w
      );
      const remaining = updatedWindows.filter((w) => !w.minimized);
      return {
        windows: updatedWindows,
        focusedWindowId: state.focusedWindowId === windowId
          ? remaining.slice(-1)[0]?.id ?? null
          : state.focusedWindowId,
      };
    });
  },

  maximizeWindow: (windowId) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId
          ? { ...w, maximized: true, prevRect: { x: w.x, y: w.y, width: w.width, height: w.height } }
          : w
      ),
    }));
  },

  restoreWindow: (windowId) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id !== windowId) return w;
        if (w.maximized && w.prevRect) {
          return { ...w, maximized: false, x: w.prevRect.x, y: w.prevRect.y, width: w.prevRect.width, height: w.prevRect.height };
        }
        return { ...w, minimized: false };
      }),
      focusedWindowId: windowId,
    }));
  },

  focusWindow: (windowId) => {
    set((state) => {
      const newZIndex = Math.min(state.highestZIndex + 1, MAX_Z_INDEX);
      return {
        windows: state.windows.map((w) =>
          w.id === windowId ? { ...w, zIndex: newZIndex, minimized: false } : w
        ),
        focusedWindowId: windowId,
        highestZIndex: newZIndex,
      };
    });
  },

  updateWindowPosition: (windowId, x, y) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, x, y } : w
      ),
    }));
  },

  updateWindowSize: (windowId, width, height) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? { ...w, width, height } : w
      ),
    }));
  },

  toggleLauncher: () => set((state) => ({ showLauncher: !state.showLauncher })),
  setLauncherSearch: (query) => set({ launcherSearch: query }),
  setLauncherCategory: (category) => set({ launcherCategory: category }),
  setWallpaper: (wallpaper) => set({ wallpaper }),

  addNotification: (notification) => {
    const newNotification: OSNotification = {
      ...notification,
      id: generateId(),
      timestamp: Date.now(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50),
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  toggleNotificationPanel: () =>
    set((state) => ({ showNotificationPanel: !state.showNotificationPanel })),

  minimizeAll: () => {
    set((state) => ({
      windows: state.windows.map((w) => ({ ...w, minimized: true })),
      focusedWindowId: null,
    }));
  },

  logout: () => {
    localStorage.removeItem('promurcia_token');
    window.location.reload();
  },
}));

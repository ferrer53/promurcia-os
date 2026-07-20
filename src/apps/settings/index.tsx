import { useState, useEffect } from 'react';
import {
  Palette, Monitor, User, Globe, Bell, Info, Check, Moon, Sun
} from 'lucide-react';
import { useOSStore } from '@/stores/osStore';

type SettingsTab = 'personalizacion' | 'sistema' | 'cuenta' | 'idioma' | 'notificaciones' | 'acerca';

const TABS: { id: SettingsTab; label: string; icon: typeof Palette }[] = [
  { id: 'personalizacion', label: 'Personalizacion', icon: Palette },
  { id: 'sistema', label: 'Sistema', icon: Monitor },
  { id: 'cuenta', label: 'Cuenta', icon: User },
  { id: 'idioma', label: 'Idioma', icon: Globe },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'acerca', label: 'Acerca de', icon: Info },
];

const WALLPAPERS = [
  { id: '/wallpaper-default.jpg', name: 'Predeterminado', color: '#0a1628' },
  { id: '/wallpaper-alt-1.jpg', name: 'Alt-1', color: '#1a1a2e' },
  { id: '/wallpaper-alt-2.jpg', name: 'Alt-2', color: '#111827' },
];

const ACCENT_COLORS = [
  { name: 'Oro', value: '#d4a853' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Purpura', value: '#8b5cf6' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('personalizacion');
  const [wallpaper, setWallpaper] = useState('/wallpaper-default.jpg');
  const [accentColor, setAccentColor] = useState('#d4a853');
  const [transparency, setTransparency] = useState(true);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [uptime, setUptime] = useState(0);
  const [passwordModal, setPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Notifications
  const [sysNotifications, setSysNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  const osSetWallpaper = useOSStore(s => s.setWallpaper);

  useEffect(() => {
    const interval = setInterval(() => setUptime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWallpaperChange = (wp: string) => {
    setWallpaper(wp);
    osSetWallpaper(wp);
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handlePasswordChange = () => {
    if (oldPassword && newPassword) {
      setPasswordSuccess(true);
      setTimeout(() => {
        setPasswordModal(false);
        setPasswordSuccess(false);
        setOldPassword('');
        setNewPassword('');
      }, 1500);
    }
  };

  return (
    <div className="flex h-full w-full" style={{ background: '#0a1628', color: '#fff' }}>
      {/* Sidebar */}
      <div className="w-56 shrink-0 border-r flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111d32' }}>
        <div className="p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Configuracion</h2>
        </div>
        <nav className="flex-1 px-2 pb-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all mb-0.5"
                style={{
                  background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
                  color: isActive ? '#d4a853' : '#9ca3af',
                  borderLeft: isActive ? '2px solid #d4a853' : '2px solid transparent',
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'personalizacion' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Personalizacion</h3>

            {/* Wallpaper */}
            <div className="space-y-3">
              <label className="text-sm font-medium" style={{ color: '#9ca3af' }}>Fondo de pantalla</label>
              <div className="grid grid-cols-3 gap-3">
                {WALLPAPERS.map(wp => (
                  <button
                    key={wp.id}
                    onClick={() => handleWallpaperChange(wp.id)}
                    className="relative rounded-lg overflow-hidden border-2 transition-all"
                    style={{
                      borderColor: wallpaper === wp.id ? '#d4a853' : 'rgba(255,255,255,0.1)',
                      aspectRatio: '16/9',
                      background: wp.color,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium" style={{ color: '#d4a853' }}>{wp.name}</span>
                    </div>
                    {wallpaper === wp.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#d4a853' }}>
                        <Check size={12} color="#0a1628" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-3">
              <label className="text-sm font-medium" style={{ color: '#9ca3af' }}>Color de acento</label>
              <div className="flex gap-3">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setAccentColor(c.value)}
                    className="w-10 h-10 rounded-full border-2 transition-all"
                    style={{
                      background: c.value,
                      borderColor: accentColor === c.value ? '#fff' : 'transparent',
                      transform: accentColor === c.value ? 'scale(1.15)' : 'scale(1)',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <Moon size={18} color="#9ca3af" />
                <div>
                  <div className="text-sm font-medium">Modo oscuro</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>Tema oscuro del sistema</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setThemeMode('dark')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{ background: themeMode === 'dark' ? '#d4a853' : '#1a2744', color: themeMode === 'dark' ? '#0a1628' : '#9ca3af' }}
                >
                  <Moon size={14} /> Oscuro
                </button>
                <button
                  onClick={() => setThemeMode('light')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{ background: themeMode === 'light' ? '#d4a853' : '#1a2744', color: themeMode === 'light' ? '#0a1628' : '#9ca3af' }}
                >
                  <Sun size={14} /> Claro
                </button>
              </div>
            </div>

            {/* Transparency */}
            <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-sm font-medium">Transparencia</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>Efectos de transparencia en ventanas</div>
              </div>
              <button
                onClick={() => setTransparency(!transparency)}
                className="relative w-11 h-6 rounded-full transition-all"
                style={{ background: transparency ? '#d4a853' : '#4b5563' }}
              >
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: transparency ? 22 : 2 }} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'sistema' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Sistema</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2">
                <span className="text-sm" style={{ color: '#9ca3af' }}>Sistema operativo</span>
                <span className="text-sm font-medium">PromurciaOS v2.0</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm" style={{ color: '#9ca3af' }}>Kernel</span>
                <span className="text-sm font-medium">web-kernel-5.0</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm" style={{ color: '#9ca3af' }}>Build</span>
                <span className="text-sm font-medium">2026.02.13-release</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm" style={{ color: '#9ca3af' }}>Tiempo activo</span>
                <span className="text-sm font-medium" style={{ color: '#d4a853' }}>{formatUptime(uptime)}</span>
              </div>
            </div>

            {/* Storage bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>Almacenamiento</span>
                <span>128 GB / 256 GB</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a2744' }}>
                <div className="h-full rounded-full transition-all" style={{ width: '50%', background: '#d4a853' }} />
              </div>
            </div>

            {/* Memory bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>Memoria RAM</span>
                <span>8.2 GB / 16 GB</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a2744' }}>
                <div className="h-full rounded-full transition-all" style={{ width: '51%', background: '#3b82f6' }} />
              </div>
            </div>

            {/* CPU bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#9ca3af' }}>CPU</span>
                <span>WebEngine x64 @ 3.2GHz</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a2744' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${12 + Math.sin(uptime * 0.1) * 8}%`, background: '#22c55e' }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cuenta' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Cuenta</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: '#d4a853', color: '#0a1628' }}>
                U
              </div>
              <div>
                <div className="text-base font-semibold">Usuario</div>
                <div className="text-sm" style={{ color: '#9ca3af' }}>usuario@promurcia.com</div>
                <div className="text-xs px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: 'rgba(212,168,83,0.15)', color: '#d4a853' }}>superCEO</div>
              </div>
            </div>
            <button
              onClick={() => setPasswordModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#d4a853' }}
            >
              Cambiar contrasena
            </button>

            {passwordModal && (
              <div className="rounded-lg p-4 space-y-3" style={{ background: '#111d32', border: '1px solid rgba(212,168,83,0.15)' }}>
                {passwordSuccess ? (
                  <div className="text-sm font-medium" style={{ color: '#22c55e' }}>Contrasena actualizada correctamente</div>
                ) : (
                  <>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="Contrasena actual"
                      className="w-full px-3 py-2 rounded text-sm outline-none"
                      style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Nueva contrasena"
                      className="w-full px-3 py-2 rounded text-sm outline-none"
                      style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setPasswordModal(false)} className="px-3 py-1.5 text-xs rounded" style={{ color: '#9ca3af' }}>Cancelar</button>
                      <button onClick={handlePasswordChange} className="px-3 py-1.5 text-xs rounded font-medium" style={{ background: '#d4a853', color: '#0a1628' }}>Actualizar</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'idioma' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Idioma</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-sm font-medium">Idioma del sistema</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>Idioma de la interfaz</div>
                </div>
                <select
                  className="px-3 py-1.5 rounded text-sm outline-none"
                  style={{ background: '#1a2744', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  defaultValue="es"
                >
                  <option value="es">Espanol</option>
                  <option value="en" disabled>Ingles (no disponible)</option>
                  <option value="fr" disabled>Frances (no disponible)</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-sm font-medium">Formato de fecha</div>
                </div>
                <span className="text-sm" style={{ color: '#9ca3af' }}>DD/MM/YYYY</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-sm font-medium">Formato de hora</div>
                </div>
                <span className="text-sm" style={{ color: '#9ca3af' }}>24h</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">Zona horaria</div>
                </div>
                <span className="text-sm" style={{ color: '#9ca3af' }}>Europe/Madrid</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notificaciones' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Notificaciones</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-sm font-medium">Notificaciones del sistema</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>Mostrar notificaciones en el panel</div>
                </div>
                <button
                  onClick={() => setSysNotifications(!sysNotifications)}
                  className="relative w-11 h-6 rounded-full transition-all"
                  style={{ background: sysNotifications ? '#d4a853' : '#4b5563' }}
                >
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: sysNotifications ? 22 : 2 }} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-sm font-medium">Efectos de sonido</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>Sonidos al interactuar</div>
                </div>
                <button
                  onClick={() => setSoundEffects(!soundEffects)}
                  className="relative w-11 h-6 rounded-full transition-all"
                  style={{ background: soundEffects ? '#d4a853' : '#4b5563' }}
                >
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: soundEffects ? 22 : 2 }} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">No molestar</div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>Silenciar todas las notificaciones</div>
                </div>
                <button
                  onClick={() => setDoNotDisturb(!doNotDisturb)}
                  className="relative w-11 h-6 rounded-full transition-all"
                  style={{ background: doNotDisturb ? '#ef4444' : '#4b5563' }}
                >
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: doNotDisturb ? 22 : 2 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'acerca' && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold" style={{ background: '#d4a853', color: '#0a1628' }}>
                P
              </div>
              <h3 className="text-xl font-bold">PromurciaOS</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Version 2.0 (Build 2026.02.13)</p>
            </div>
            <p className="text-sm max-w-md mx-auto" style={{ color: '#6b7280' }}>
              Sistema operativo web desarrollado para Promurcia.com.
              Un entorno de escritorio completo basado en tecnologias web modernas.
            </p>
            <div className="rounded-lg p-4 text-left max-w-md mx-auto" style={{ background: '#111d32', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-xs space-y-2" style={{ color: '#6b7280' }}>
                <div className="flex justify-between"><span>React</span><span style={{ color: '#9ca3af' }}>19.0.0</span></div>
                <div className="flex justify-between"><span>TypeScript</span><span style={{ color: '#9ca3af' }}>5.7</span></div>
                <div className="flex justify-between"><span>Tailwind CSS</span><span style={{ color: '#9ca3af' }}>3.4.19</span></div>
                <div className="flex justify-between"><span>Vite</span><span style={{ color: '#9ca3af' }}>7.2.4</span></div>
              </div>
            </div>
            <p className="text-xs" style={{ color: '#4b5563' }}>© 2026 Promurcia.com. Todos los derechos reservados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

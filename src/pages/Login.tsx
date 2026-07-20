import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/hooks/useAuth';

const QUICK_ROLES = [
  { key: 'superCEO', label: ROLE_LABELS.superCEO, color: '#d4a853' },
  { key: 'admin', label: ROLE_LABELS.admin, color: '#3b82f6' },
  { key: 'operaciones', label: ROLE_LABELS.operaciones, color: '#22c55e' },
  { key: 'comercial', label: ROLE_LABELS.comercial, color: '#8b5cf6' },
  { key: 'solo_lectura', label: ROLE_LABELS.solo_lectura, color: '#6b7280' },
  { key: 'agente', label: ROLE_LABELS.agente, color: '#f59e0b' },
];

export default function Login() {
  const { login, loginAs } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!username.trim() || !password.trim()) {
      setError('Por favor introduce usuario y contrasena');
      setIsSubmitting(false);
      return;
    }

    const success = login(username.trim(), password.trim());
    if (success) {
      window.location.reload();
    } else {
      setError('Usuario o contrasena incorrectos');
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (role: string) => {
    loginAs(role);
    window.location.reload();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1001]"
      style={{ background: '#0a1628' }}
    >
      {/* Background image */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/wallpaper-default.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[380px] mx-4"
      >
        {/* Glassmorphism Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(212,168,83,0.15)' }}
            >
              <Shield size={32} color="#d4a853" />
            </div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: '#d4a853' }}
            >
              PROMURCIA
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              Cerebro Promurcia &mdash; Sistema Inmobiliario
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Introduce tu usuario"
                className="w-full rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                style={{
                  height: 44,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '0 14px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#d4a853';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce tu contrasena"
                  className="w-full rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                  style={{
                    height: 44,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0 44px 0 14px',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#d4a853';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                  style={{ width: 32, height: 32 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="#6b7280" />
                  ) : (
                    <Eye size={16} color="#6b7280" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 text-center"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{
                height: 46,
                background: '#d4a853',
                color: '#0a1628',
              }}
            >
              <LogIn size={16} />
              {isSubmitting ? 'Iniciando...' : 'Iniciar Sesion'}
            </button>
          </form>

          {/* Separator */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-[11px]" style={{ color: '#4b5563' }}>
              &mdash; o acceso rapido &mdash;
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Quick role buttons */}
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ROLES.map((role) => (
              <button
                key={role.key}
                onClick={() => handleQuickLogin(role.key)}
                className="flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  height: 38,
                  background: '#1a2744',
                  border: '1px solid rgba(212,168,83,0.2)',
                  color: '#9ca3af',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212,168,83,0.12)';
                  e.currentTarget.style.color = '#d4a853';
                  e.currentTarget.style.borderColor = 'rgba(212,168,83,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1a2744';
                  e.currentTarget.style.color = '#9ca3af';
                  e.currentTarget.style.borderColor = 'rgba(212,168,83,0.2)';
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: role.color }}
                />
                {role.label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="text-[10px] text-center mt-5" style={{ color: '#374151' }}>
            Sistema Promurcia Inmobiliaria &mdash; Acceso seguro
          </p>
        </div>
      </motion.div>
    </div>
  );
}

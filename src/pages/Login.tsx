import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!username.trim() || !password.trim()) {
      setError('Por favor introduce usuario y contraseña');
      setIsSubmitting(false);
      return;
    }

    const success = await login(username.trim(), password.trim());
    if (success) {
      window.location.href = '/';
    } else {
      setError('Usuario o contraseña incorrectos');
      setIsSubmitting(false);
    }
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
                Usuario o email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Introduce tu usuario o email"
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
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce tu contraseña"
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
              {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-[10px] text-center mt-5" style={{ color: '#374151' }}>
            Sistema Promurcia Inmobiliaria &mdash; Acceso seguro
          </p>
        </div>
      </motion.div>
    </div>
  );
}

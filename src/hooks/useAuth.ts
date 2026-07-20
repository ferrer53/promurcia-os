import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'superCEO' | 'admin' | 'operaciones' | 'comercial' | 'solo_lectura' | 'agente';
  avatar?: string;
}

export const DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  superceo: { password: 'promurcia2024', user: { id: 1, name: 'Nestor Fuentes', email: 'promurcia2017@gmail.com', role: 'superCEO' } },
  admin: { password: 'admin2024', user: { id: 2, name: 'Admin Promurcia', email: 'admin@promurcia.com', role: 'admin' } },
  operaciones: { password: 'ops2024', user: { id: 3, name: 'Operaciones', email: 'ops@promurcia.com', role: 'operaciones' } },
  comercial: { password: 'ventas2024', user: { id: 4, name: 'Comercial', email: 'ventas@promurcia.com', role: 'comercial' } },
  lectura: { password: 'lectura2024', user: { id: 5, name: 'Consultor', email: 'consulta@promurcia.com', role: 'solo_lectura' } },
  agente: { password: 'agente2024', user: { id: 6, name: 'Agente', email: 'agente@promurcia.com', role: 'agente' } },
};

export const ROLE_LABELS: Record<string, string> = {
  superCEO: 'Super CEO',
  admin: 'Administrador',
  operaciones: 'Operaciones',
  comercial: 'Comercial',
  solo_lectura: 'Solo Lectura',
  agente: 'Agente',
};

function generateToken(user: AuthUser): string {
  return btoa(JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
}

function parseToken(token: string): AuthUser | null {
  try {
    const data = JSON.parse(atob(token));
    if (data.exp && data.exp > Date.now()) return data as AuthUser;
    return null;
  } catch { return null; }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('promurcia_token');
    if (token) {
      const parsed = parseToken(token);
      if (parsed) setUser(parsed);
      else localStorage.removeItem('promurcia_token');
    }
    setIsLoading(false);

    // Listen for storage changes (sync across tabs/components)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'promurcia_token') {
        if (e.newValue) {
          const parsed = parseToken(e.newValue);
          if (parsed) setUser(parsed);
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const entry = DEMO_USERS[username.toLowerCase()];
    if (entry && entry.password === password) {
      const token = generateToken(entry.user);
      localStorage.setItem('promurcia_token', token);
      setUser(entry.user);
      return true;
    }
    return false;
  }, []);

  const loginAs = useCallback((role: string) => {
    const entry = Object.entries(DEMO_USERS).find(([, v]) => v.user.role === role);
    if (entry) {
      const token = generateToken(entry[1].user);
      localStorage.setItem('promurcia_token', token);
      setUser(entry[1].user);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('promurcia_token');
    setUser(null);
    window.location.reload();
  }, []);

  return { user, isAuthenticated: !!user, isLoading, login, loginAs, logout };
}

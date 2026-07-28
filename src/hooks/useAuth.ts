import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/providers/trpc';

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  role: 'superCEO' | 'admin' | 'operaciones' | 'comercial' | 'solo_lectura' | 'agente' | 'user';
  avatar?: string | null;
}

export const ROLE_LABELS: Record<string, string> = {
  superCEO: 'Super CEO',
  admin: 'Administrador',
  operaciones: 'Operaciones',
  comercial: 'Comercial',
  solo_lectura: 'Solo Lectura',
  agente: 'Agente',
  user: 'Usuario',
};

const TOKEN_KEY = 'promurcia_token';

function parseToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload as AuthUser;
  } catch { return null; }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const utils = trpc.useUtils();

  const { data: meData } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const parsed = parseToken(token);
      if (parsed) setUser(parsed);
      else localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  useEffect(() => {
    if (meData) {
      const u = meData as unknown as AuthUser;
      setUser(u);
    } else if (meData === null) {
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
    }
    setIsLoading(false);
  }, [meData]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      if (data.success && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user as unknown as AuthUser);
        utils.auth.me.invalidate();
      }
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      window.location.href = '/login';
    },
  });

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const result = await loginMutation.mutateAsync({ username, password });
      return result.success;
    } catch {
      return false;
    }
  }, [loginMutation]);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return { user, isAuthenticated: !!user, isLoading, login, logout };
}

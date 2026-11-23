import NetInfo from '@react-native-community/netinfo';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Login. Durante o desenvolvimento o usuário entra de forma anônima, sem tela
 * (spec seção 2). Antes de lançar, o anônimo será convertido em conta real
 * (e-mail, Google, Apple) sem perder os dados.
 *
 * O app funciona sem login: sem internet, tudo fica no celular e a
 * sincronização espera até existir uma sessão.
 */
type AuthState = {
  session: Session | null;
  userId: string | null;
  /** 'disabled' = Supabase não configurado */
  status: 'loading' | 'signed_in' | 'signed_out' | 'disabled';
  error: string | null;
};

const AuthContext = createContext<AuthState>({
  session: null,
  userId: null,
  status: 'loading',
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthState['status']>(supabase ? 'loading' : 'disabled');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let cancelled = false;
    let signingIn = false;

    async function ensureSession() {
      if (!client || signingIn) return;
      signingIn = true;
      try {
        const { data } = await client.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setSession(data.session);
          setStatus('signed_in');
          return;
        }
        const res = await client.auth.signInAnonymously();
        if (cancelled) return;
        if (res.error) {
          setError(res.error.message);
          setStatus('signed_out');
        } else {
          setError(null);
          setSession(res.data.session);
          setStatus('signed_in');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus('signed_out');
        }
      } finally {
        signingIn = false;
      }
    }

    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setStatus('signed_in');
    });

    void ensureSession();

    // Sem internet no primeiro acesso: tenta de novo quando a conexão voltar.
    const unsubNet = NetInfo.addEventListener((net) => {
      if (net.isConnected && net.isInternetReachable !== false) void ensureSession();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      unsubNet();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, userId: session?.user.id ?? null, status, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

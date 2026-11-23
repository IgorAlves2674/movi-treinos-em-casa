import NetInfo from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { onDataChange } from '@/db/events';
import { countPendingChanges } from '@/db/repository';
import { supabase } from '@/lib/supabase';

import { useAuth } from './AuthProvider';
import { syncAll } from './engine';

type SyncState = {
  status: 'idle' | 'running' | 'error' | 'disabled';
  lastSyncAt: Date | null;
  error: string | null;
  pendingCount: number;
  syncNow: () => Promise<void>;
};

const SyncContext = createContext<SyncState | null>(null);

/** Espera um pouco depois de uma gravação local, para juntar várias num envio só. */
const DEBOUNCE_MS = 2000;
/** Sincroniza de tempos em tempos enquanto o app está aberto. */
const INTERVAL_MS = 5 * 60 * 1000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { userId } = useAuth();
  const [status, setStatus] = useState<SyncState['status']>(supabase ? 'idle' : 'disabled');
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const running = useRef(false);
  const again = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPending = useCallback(
    () => countPendingChanges(db).then(setPendingCount),
    [db],
  );

  const syncNow = useCallback(async () => {
    if (!supabase || !userId) return;
    if (running.current) {
      again.current = true; // roda de novo ao terminar
      return;
    }
    running.current = true;
    setStatus('running');
    try {
      do {
        again.current = false;
        await syncAll(db, supabase, userId);
      } while (again.current);
      setLastSyncAt(new Date());
      setError(null);
      setStatus('idle');
    } catch (e) {
      // Sem internet ou servidor fora: os dados continuam seguros no celular.
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    } finally {
      running.current = false;
      await refreshPending();
    }
  }, [db, userId, refreshPending]);

  // Ao entrar (ou trocar de usuário): sincroniza.
  useEffect(() => {
    const t = setTimeout(() => {
      void refreshPending();
      if (userId) void syncNow();
    }, 0);
    return () => clearTimeout(t);
  }, [userId, syncNow, refreshPending]);

  // Gravação local → agenda envio.
  useEffect(
    () =>
      onDataChange((_tables, source) => {
        if (source !== 'local') return;
        void refreshPending();
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => void syncNow(), DEBOUNCE_MS);
      }),
    [syncNow, refreshPending],
  );

  // Internet voltou, app voltou para a frente, ou de tempos em tempos.
  useEffect(() => {
    let wasConnected: boolean | null = null;
    const unsubNet = NetInfo.addEventListener((net) => {
      const connected = !!net.isConnected && net.isInternetReachable !== false;
      if (connected && wasConnected === false) void syncNow();
      wasConnected = connected;
    });
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncNow();
    });
    const timer = setInterval(() => void syncNow(), INTERVAL_MS);
    return () => {
      unsubNet();
      appSub.remove();
      clearInterval(timer);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [syncNow]);

  return (
    <SyncContext.Provider value={{ status, lastSyncAt, error, pendingCount, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync precisa estar dentro de <SyncProvider>');
  return ctx;
}

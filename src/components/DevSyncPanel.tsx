import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { insertRow } from '@/db/repository';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { fmt, strings } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/sync/AuthProvider';
import { useSync } from '@/sync/SyncProvider';
import { colors, spacing } from '@/theme';

import { Card, SecondaryButton, T } from './ui';

/**
 * Painel de diagnóstico da etapa 1 (só aparece em desenvolvimento): mostra o
 * usuário anônimo, o estado da sincronização e permite gravar um peso de teste
 * para conferir SQLite → Supabase.
 */
export function DevSyncPanel() {
  const db = useSQLiteContext();
  const auth = useAuth();
  const sync = useSync();
  const s = strings.dev;
  const { rows } = useLiveQuery<{ n: number }>(
    'SELECT COUNT(*) AS n FROM body_logs WHERE deleted_at IS NULL',
    [],
    ['body_logs'],
  );

  const syncLabel =
    sync.status === 'running'
      ? s.syncRunning
      : sync.status === 'error'
        ? fmt(s.syncError, { message: sync.error ?? '' })
        : sync.status === 'disabled'
          ? s.supabaseMissing
          : s.syncIdle;

  async function addTestWeight() {
    const today = new Date();
    const loggedOn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await insertRow(db, 'body_logs', {
      logged_on: loggedOn,
      weight_kg: Math.round((70 + Math.random() * 10) * 10) / 10,
    });
  }

  return (
    <Card style={styles.card}>
      <T variant="label">{s.title}</T>
      <Row label={s.user} value={auth.userId ?? (supabase ? auth.error ?? s.noUser : s.supabaseMissing)} />
      <Row label={s.sync} value={syncLabel} />
      {sync.lastSyncAt && (
        <T variant="caption" color={colors.textSecondary}>
          {fmt(s.lastSync, { time: sync.lastSyncAt.toLocaleTimeString() })}
        </T>
      )}
      <T variant="caption" color={colors.textSecondary}>
        {fmt(s.pending, { count: sync.pendingCount })} · {fmt(s.localWeights, { count: rows[0]?.n ?? 0 })}
      </T>
      <View style={styles.buttons}>
        <SecondaryButton label={s.addTestWeight} onPress={addTestWeight} style={styles.flex} />
        <SecondaryButton
          label={s.syncNow}
          onPress={() => void sync.syncNow()}
          disabled={!auth.userId}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <T variant="caption" color={colors.textSecondary}>
        {label}
      </T>
      <T variant="body" selectable>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
});

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionCard } from '@/components/form';
import { Card, PrimaryButton, T } from '@/components/ui';
import { getExercicio } from '@/content/exercises';
import type { Feeling, WorkoutSessionRow } from '@/db/tables';
import { fmt, strings } from '@/i18n';
import { colors, fonts, spacing } from '@/theme';
import { recordsOf, setFeeling, type NewRecord } from '@/workout/session';

const s = strings.finish;
const FEELINGS: Feeling[] = ['facil', 'na_medida', 'pesado'];

type Summary = { minutes: number; sets: number; exercises: number; records: NewRecord[] };

/** Fim do treino (spec seção 3): resumo, recordes batidos e "Como foi?". */
export default function FinishScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [feeling, setFeelingState] = useState<Feeling | null>(null);

  useEffect(() => {
    const id = sessionId ?? '';
    (async () => {
      const session = await db.getFirstAsync<WorkoutSessionRow>('SELECT * FROM workout_sessions WHERE id = ?', [id]);
      const agg = await db.getFirstAsync<{ sets: number; exercises: number }>(
        `SELECT COUNT(*) AS sets, COUNT(DISTINCT exercise_id) AS exercises
         FROM set_logs WHERE deleted_at IS NULL AND session_id = ?`,
        [id],
      );
      setSummary({
        minutes: Math.max(1, Math.round((session?.duration_s ?? 0) / 60)),
        sets: agg?.sets ?? 0,
        exercises: agg?.exercises ?? 0,
        records: await recordsOf(db, id),
      });
    })();
  }, [db, sessionId]);

  async function close() {
    if (feeling && sessionId) await setFeeling(db, sessionId, feeling);
    router.dismissAll();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={styles.content}>
        <T variant="h1">{s.title}</T>

        {summary && (
          <View style={styles.stats}>
            <Stat label={s.duration} value={fmt(s.minutes, { n: summary.minutes })} />
            <Stat label={s.exercises} value={String(summary.exercises)} />
            <Stat label={s.sets} value={String(summary.sets)} />
          </View>
        )}

        {summary && summary.records.length > 0 && (
          <Card style={styles.records}>
            <T variant="title">🏆 {s.records}</T>
            {summary.records.map((r) => (
              <View key={r.exerciseId} style={{ gap: 2 }}>
                <T variant="label">{getExercicio(r.exerciseId)?.nome}</T>
                <T variant="body" color={colors.textSecondary}>
                  {fmt(r.kind === 'load' ? s.recordLoad : r.kind === 'seconds' ? s.recordSeconds : s.recordReps, {
                    value: r.value,
                    previous: r.previous,
                  })}
                </T>
              </View>
            ))}
          </Card>
        )}

        <View style={{ gap: spacing.sm }}>
          <T variant="title">{s.howWasIt}</T>
          <T variant="caption" color={colors.textSecondary}>
            {s.feelingHint}
          </T>
          {FEELINGS.map((f) => (
            <OptionCard key={f} label={s.feelings[f]} selected={feeling === f} onPress={() => setFeelingState(f)} />
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton label={s.close} onPress={close} />
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <T style={styles.statValue}>{value}</T>
      <T variant="caption" color={colors.textSecondary}>
        {label}
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, gap: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: spacing.sm },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  records: { gap: spacing.md, borderColor: '#F3D9B5', backgroundColor: '#FFF8EC' },
});

import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/form';
import { Card, PrimaryButton, Screen, T } from '@/components/ui';
import type { WorkoutSessionRow } from '@/db/tables';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { fmt, formatLongDate, strings } from '@/i18n';
import { useProfile } from '@/profile/useProfile';
import { colors, spacing } from '@/theme';
import { setDraft } from '@/workout/draft';
import { generatorProfile } from '@/workout/fromProfile';
import { generateWorkout, type GeneratorProfile } from '@/workout/generator';
import { prepareWorkout } from '@/workout/plan';
import { lastWorkoutExerciseIds } from '@/workout/session';

const s = strings.workouts;
const MINUTES: GeneratorProfile['minutes'][] = [15, 30, 45, 60];

/**
 * Treinos (spec seção 3): montar treino avulso + histórico (etapa 6).
 * Todo treino é de corpo inteiro; aqui só dá para escolher a duração do dia.
 */
export default function WorkoutsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const { rows: history } = useLiveQuery<HistoryRow>(
    `SELECT ws.*,
       (SELECT COUNT(DISTINCT sl.exercise_id) FROM set_logs sl
        WHERE sl.session_id = ws.id AND sl.deleted_at IS NULL) AS done_exercises
     FROM workout_sessions ws
     WHERE ws.deleted_at IS NULL AND ws.finished_at IS NOT NULL
     ORDER BY ws.finished_at DESC LIMIT 30`,
    [],
    ['workout_sessions', 'set_logs'],
  );
  // Começa com o tempo do perfil, mas o treino avulso pode ser mais curto ou mais longo.
  const [minutes, setMinutes] = useState<GeneratorProfile['minutes'] | null>(null);
  const chosen = minutes ?? profile?.minutes_per_session ?? 30;

  async function build() {
    if (!profile) return;
    // Evita repetir os exercícios do último treino feito (spec 7.2, passo 3).
    const avoidIds = await lastWorkoutExerciseIds(db);
    const gp = generatorProfile(profile);
    const workout = await prepareWorkout(db, generateWorkout({ ...gp, minutes: chosen }, { avoidIds }), gp);
    setDraft({ workout, minutes: chosen, kind: 'avulso' });
    router.push('/treino');
  }

  return (
    <Screen>
      <T variant="h1">{s.title}</T>
      <Card style={{ gap: spacing.md }}>
        <View style={{ gap: 2 }}>
          <T variant="title">{s.buildTitle}</T>
          <T variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
            {s.buildHint}
          </T>
        </View>
        <View style={{ gap: spacing.sm }}>
          <T variant="label">{s.duration}</T>
          <View style={styles.chips}>
            {MINUTES.map((m) => (
              <Chip
                key={m}
                label={fmt(strings.onboarding.routine.minutesValue, { n: m })}
                selected={chosen === m}
                onPress={() => setMinutes(m)}
              />
            ))}
          </View>
        </View>
        {profile && (
          <T variant="caption" color={colors.textSecondary}>
            {fmt(s.settingsLine, { level: s.levels[profile.level].toLowerCase() })}
          </T>
        )}
        <PrimaryButton label={s.build} onPress={build} disabled={!profile} />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <T variant="title">{s.history}</T>
        {history.length === 0 ? (
          <Card>
            <T variant="body" color={colors.textSecondary}>
              {s.historyEmpty}
            </T>
          </Card>
        ) : (
          history.map((h) => <HistoryItem key={h.id} session={h} />)
        )}
      </View>
    </Screen>
  );
}

type HistoryRow = WorkoutSessionRow & { done_exercises: number };

/** Um treino feito: data, duração, exercícios feitos e como foi. */
function HistoryItem({ session }: { session: HistoryRow }) {
  const count = session.done_exercises;
  const h = strings.history;
  const feeling = session.feeling ? strings.finish.feelings[session.feeling].toLowerCase() : null;
  return (
    <Card style={{ gap: 2 }}>
      <T variant="label">{formatLongDate(new Date(session.finished_at ?? session.started_at))}</T>
      <T variant="caption" color={colors.textSecondary}>
        {fmt(count === 1 ? h.itemOne : h.item, { minutes: Math.max(1, Math.round((session.duration_s ?? 0) / 60)), count })}
        {feeling ? ` · ${fmt(h.feeling, { feeling })}` : ''}
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

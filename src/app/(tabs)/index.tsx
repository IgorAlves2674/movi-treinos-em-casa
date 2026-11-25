import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckIcon, ChevronRightIcon, PlayIcon, PlusIcon } from '@/components/icons';
import { OptionsMenu } from '@/components/OptionsMenu';
import { Card, PrimaryButton, Screen, SecondaryButton, T } from '@/components/ui';
import { getExercicio } from '@/content/exercises';
import type { BodyLog, MonthlyTestRow, WeeklyPlanRow } from '@/db/tables';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { fmt, formatLongDate, strings } from '@/i18n';
import { formatDecimal, localDate, weekStart } from '@/lib/dates';
import { daysUntilNextTest, latestBeaten, progressByExercise, SET_LOGS_SQL, type LogLite } from '@/progress/stats';
import { useProfile } from '@/profile/useProfile';
import { colors, fonts, radius, spacing } from '@/theme';
import { setDraft } from '@/workout/draft';
import { generatorProfile } from '@/workout/fromProfile';
import { mainExerciseIds, type Workout } from '@/workout/generator';
import { ensureWeekPlan, parsePlan, PLAN_DONE_SQL, prepareWorkout, profileKey, WEEK_PLAN_SQL, weekStartIso } from '@/workout/plan';

const s = strings.home;

/** Início (spec seção 3): semana, treino de hoje do plano, treino avulso, peso, recorde e teste mensal. */
export default function HomeScreen() {
  const router = useRouter();
  const today = new Date();
  const { profile } = useProfile();
  const firstName = profile?.name.split(' ')[0];
  const weekIso = weekStartIso();

  const { rows: weights } = useLiveQuery<Pick<BodyLog, 'weight_kg'>>(
    `SELECT weight_kg FROM body_logs
     WHERE deleted_at IS NULL AND weight_kg IS NOT NULL
     ORDER BY logged_on DESC, updated_at DESC LIMIT 1`,
    [],
    ['body_logs'],
  );
  const lastWeight = weights[0]?.weight_kg;

  // Dias treinados nesta semana (qualquer treino).
  const { rows: weekSessions } = useLiveQuery<{ finished_at: string }>(
    `SELECT finished_at FROM workout_sessions WHERE deleted_at IS NULL AND finished_at IS NOT NULL AND finished_at >= ?`,
    [weekIso],
    ['workout_sessions'],
  );
  const trainedDays = useMemo(() => new Set(weekSessions.map((r) => localDate(new Date(r.finished_at)))), [weekSessions]);

  const { rows: logs } = useLiveQuery<LogLite>(SET_LOGS_SQL, [], ['workout_sessions', 'set_logs']);
  const lastRecord = useMemo(() => latestBeaten(progressByExercise(logs)), [logs]);

  const { rows: tests } = useLiveQuery<MonthlyTestRow>(
    'SELECT * FROM monthly_tests WHERE deleted_at IS NULL ORDER BY tested_on DESC LIMIT 1',
    [],
    ['monthly_tests'],
  );
  const testWait = daysUntilNextTest(tests[0]);

  return (
    <Screen>
      <View style={styles.topBar}>
        <T variant="logo" color={colors.primary}>
          movi<T variant="logo">.</T>
        </T>
        <OptionsMenu />
      </View>

      <View style={{ gap: spacing.xs }}>
        <T variant="h1">{firstName ? fmt(s.greeting, { name: firstName }) : s.greetingNoName}</T>
        <T variant="body" color={colors.textSecondary}>
          {formatLongDate(today)}
        </T>
      </View>

      <WeekStrip trained={trainedDays} />

      <TodayCard />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.navigate('/treinos')}
        style={({ pressed }) => [styles.customCard, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={styles.plusBox}>
          <PlusIcon />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title">{s.customWorkout}</T>
          <T variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
            {s.customWorkoutHint}
          </T>
        </View>
        <ChevronRightIcon />
      </Pressable>

      <View style={styles.statsRow}>
        <Pressable style={{ flex: 1 }} onPress={() => router.navigate('/evolucao')} accessibilityRole="button">
          <Card style={styles.statCard}>
            <T variant="caption" color={colors.textSecondary}>
              {s.weight}
            </T>
            <T variant="h2">{lastWeight != null ? `${formatDecimal(lastWeight)} kg` : s.noData}</T>
            {lastWeight == null && (
              <T variant="caption" color={colors.textSecondary}>
                {s.noWeightYet}
              </T>
            )}
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.navigate('/evolucao')} accessibilityRole="button">
          <Card style={styles.statCard}>
            <T variant="caption" color={colors.textSecondary}>
              {s.lastRecord}
            </T>
            {lastRecord ? (
              <>
                <T variant="label" numberOfLines={2}>
                  🏆 {getExercicio(lastRecord.exerciseId)?.nome}
                </T>
                <T variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
                  {fmt(
                    lastRecord.metric === 'load'
                      ? strings.progress.records.load
                      : lastRecord.metric === 'seconds'
                        ? strings.progress.records.seconds
                        : strings.progress.records.reps,
                    { value: lastRecord.metric === 'load' ? formatDecimal(lastRecord.beaten!.at.value) : lastRecord.beaten!.at.value },
                  )}
                </T>
              </>
            ) : (
              <>
                <T variant="h2">{s.noData}</T>
                <T variant="caption" color={colors.textSecondary}>
                  {logs.length > 0 ? s.noBeatenYet : s.noRecordYet}
                </T>
              </>
            )}
          </Card>
        </Pressable>
      </View>

      {testWait === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/teste-mensal')}
          style={({ pressed }) => [styles.customCard, { opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="title">📋 {s.testAvailable}</T>
            <T variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
              {s.testAvailableHint}
            </T>
          </View>
          <ChevronRightIcon />
        </Pressable>
      ) : (
        <T variant="caption" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {testWait === 1 ? s.testInOne : fmt(s.testIn, { n: testWait })}
        </T>
      )}
    </Screen>
  );
}

/** Card escuro "Treino de hoje": o próximo treino do plano da semana. */
function TodayCard() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const week = weekStart(localDate());
  const { rows: planRows, loading } = useLiveQuery<WeeklyPlanRow>(WEEK_PLAN_SQL, [week], ['weekly_plans']);
  const { rows: done } = useLiveQuery<{ finished_at: string }>(PLAN_DONE_SQL, [weekStartIso()], ['workout_sessions']);
  const [opening, setOpening] = useState(false);
  const ensuringRef = useRef(false);

  const planRow = planRows[0];
  const workouts = useMemo(() => parsePlan(planRow), [planRow]);
  const key = profile ? profileKey(profile) : null;

  // Monta o plano da semana se não existe (ou se o perfil mudou).
  useEffect(() => {
    if (!profile || loading || ensuringRef.current) return;
    if (planRow && planRow.profile_key === key && workouts.length > 0) return;
    ensuringRef.current = true;
    ensureWeekPlan(db, profile, generatorProfile(profile)).finally(() => {
      ensuringRef.current = false;
    });
  }, [db, profile, loading, planRow, key, workouts.length]);

  const total = workouts.length;
  const doneCount = Math.min(done.length, total);
  const doneToday = done.some((d) => localDate(new Date(d.finished_at)) === localDate());
  const next: Workout | undefined = workouts[doneCount];

  async function open() {
    if (!profile || !next || opening) return;
    setOpening(true);
    try {
      const gp = generatorProfile(profile);
      setDraft({
        workout: await prepareWorkout(db, next, gp),
        minutes: profile.minutes_per_session,
        kind: 'plano',
        plan: { n: doneCount + 1, total },
      });
      router.push('/treino');
    } finally {
      setOpening(false);
    }
  }

  let title: string = s.todayWorkout;
  let text: string = s.weeklyPlanEmpty;
  if (total > 0 && !next) {
    title = s.weekDone;
    text = fmt(s.weekDoneHint, { total });
  } else if (next && doneToday) {
    title = s.doneToday;
    text = fmt(s.doneTodayHint, { n: doneCount + 1, total });
  } else if (next) {
    const names = mainExerciseIds(next)
      .slice(0, 3)
      .map((id) => getExercicio(id)?.nome)
      .filter(Boolean)
      .join(' · ');
    text = `${fmt(s.planSummary, { minutes: next.estimatedMinutes, count: mainExerciseIds(next).length })}\n${names}…`;
  }

  return (
    <View style={styles.todayCard}>
      <View style={{ gap: 6 }}>
        <T variant="overline" color={colors.primaryOnDark}>
          {next ? `${s.weeklyPlan} · ${fmt(s.planWorkout, { n: doneCount + 1, total }).toUpperCase()}` : s.weeklyPlan}
        </T>
        <T variant="h2" color={colors.textOnDark}>
          {title}
        </T>
        <T variant="body" color={colors.textOnDarkSecondary} style={{ lineHeight: 20 }}>
          {text}
        </T>
      </View>
      {next && !doneToday && (
        <PrimaryButton label={s.startWorkout} icon={<PlayIcon />} onPress={open} disabled={opening} />
      )}
      {next && doneToday && (
        <SecondaryButton label={s.doAhead} onPress={open} disabled={opening} color={colors.primaryOnDark} />
      )}
    </View>
  );
}

/** Semana de segunda a domingo: hoje marcado e os dias treinados com ✓. */
function WeekStrip({ trained }: { trained: ReadonlySet<string> }) {
  const todayStr = localDate();
  const monday = weekStart(todayStr);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${monday}T12:00:00`);
    d.setDate(d.getDate() + i);
    return localDate(d);
  });
  return (
    <Card style={{ gap: spacing.md }}>
      <T variant="label">{s.thisWeek}</T>
      <View style={styles.weekRow}>
        {strings.dates.weekInitialsMonFirst.map((initial, i) => {
          const day = days[i];
          const isToday = day === todayStr;
          const did = trained.has(day);
          return (
            <View key={i} style={styles.dayCol}>
              <T variant="caption" color={colors.textSecondary}>
                {initial}
              </T>
              {did ? (
                <View style={[styles.dayDot, { backgroundColor: colors.primary }, isToday && styles.dayTodayDone]}>
                  <CheckIcon />
                </View>
              ) : isToday ? (
                <View style={[styles.dayDot, styles.dayToday]}>
                  <T variant="caption" color={colors.primary} style={styles.todayText}>
                    {strings.dates.today}
                  </T>
                </View>
              ) : (
                <View style={[styles.dayDot, { backgroundColor: colors.surfaceMuted }]} />
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 2, borderColor: colors.primary },
  dayTodayDone: { borderWidth: 2, borderColor: colors.primaryDark },
  todayText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  todayCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: 18,
    gap: 14,
  },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  plusBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, gap: spacing.xs, padding: 14 },
});

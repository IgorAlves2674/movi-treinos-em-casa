import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/form';
import { ChevronRightIcon } from '@/components/icons';
import { LineChart } from '@/components/LineChart';
import { Card, PrimaryButton, Screen, SecondaryButton, T } from '@/components/ui';
import { getExercicio } from '@/content/exercises';
import type { BodyLog, MonthlyTestRow } from '@/db/tables';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { fmt, formatLongDate, strings } from '@/i18n';
import { formatDecimal, localDate, mmss, parseLocalDate } from '@/lib/dates';
import {
  daysUntilNextTest,
  FINISHED_SQL,
  lastTwo,
  progressByExercise,
  SET_LOGS_SQL,
  streakOf,
  type ExerciseProgress,
  type LogLite,
  type Metric,
} from '@/progress/stats';
import { colors, fonts, spacing } from '@/theme';

const s = strings.progress;

/** "12/11" */
const shortDate = (isoOrDay: string) => {
  const d = isoOrDay.length > 10 ? new Date(isoOrDay) : parseLocalDate(isoOrDay);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const metricText = (m: Metric, v: number) =>
  fmt(m === 'load' ? s.records.load : m === 'seconds' ? s.records.seconds : s.records.reps, {
    value: m === 'load' ? formatDecimal(v) : v,
  });

/** Evolução (spec seção 3 e 8.3): sequência, teste mensal, peso, medidas, recordes e gráficos. */
export default function ProgressScreen() {
  const { rows: finished } = useLiveQuery<{ finished_at: string }>(FINISHED_SQL, [], ['workout_sessions']);
  const { rows: logs } = useLiveQuery<LogLite>(SET_LOGS_SQL, [], ['workout_sessions', 'set_logs']);
  const { rows: body } = useLiveQuery<BodyLog>(
    'SELECT * FROM body_logs WHERE deleted_at IS NULL ORDER BY logged_on, updated_at',
    [],
    ['body_logs'],
  );
  const { rows: tests } = useLiveQuery<MonthlyTestRow>(
    'SELECT * FROM monthly_tests WHERE deleted_at IS NULL ORDER BY tested_on DESC, created_at DESC',
    [],
    ['monthly_tests'],
  );

  const streak = useMemo(() => streakOf(finished.map((r) => localDate(new Date(r.finished_at)))), [finished]);
  const progress = useMemo(() => progressByExercise(logs), [logs]);

  return (
    <Screen>
      <T variant="h1">{s.title}</T>
      <StreakCard streak={streak} />
      <TestCard tests={tests} />
      <WeightCard body={body} />
      <MeasuresCard body={body} />
      <RecordsCard progress={progress} />
      {progress.some((p) => p.points.length > 0) && <ExerciseCard progress={progress} />}
    </Screen>
  );
}

function StreakCard({ streak }: { streak: ReturnType<typeof streakOf> }) {
  const st = s.streak;
  const weeks = streak.weeks === 0 ? st.weeksZero : streak.weeks === 1 ? st.weeksOne : fmt(st.weeks, { n: streak.weeks });
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <T variant="overline" color={colors.textSecondary}>
          {st.title.toUpperCase()}
        </T>
        <T variant="h2">🔥 {weeks}</T>
        {streak.days > 1 && (
          <T variant="caption" color={colors.textSecondary}>
            {fmt(st.days, { n: streak.days })}
          </T>
        )}
      </View>
      <View style={styles.stats}>
        <Stat label={st.thisWeek} value={String(streak.thisWeek)} />
        <Stat label={st.total} value={String(streak.total)} />
      </View>
      {streak.total === 0 && (
        <T variant="caption" color={colors.textSecondary}>
          {st.hint}
        </T>
      )}
    </Card>
  );
}

function TestCard({ tests }: { tests: MonthlyTestRow[] }) {
  const router = useRouter();
  const t = s.test;
  const last = tests[0];
  const wait = daysUntilNextTest(last);
  return (
    <Card style={{ gap: spacing.md }}>
      <T variant="title">{t.title}</T>
      {last ? (
        <>
          <T variant="caption" color={colors.textSecondary}>
            {fmt(t.last, { date: formatLongDate(parseLocalDate(last.tested_on)).toLowerCase() })}
          </T>
          <View style={styles.stats}>
            <Stat label={t.pushups} value={last.pushups === null ? '–' : String(last.pushups)} />
            <Stat label={t.squats} value={last.squats_1min === null ? '–' : String(last.squats_1min)} />
            <Stat label={t.plank} value={last.plank_s === null ? '–' : mmss(last.plank_s)} />
          </View>
        </>
      ) : (
        <T variant="body" color={colors.textSecondary}>
          {t.intro}
        </T>
      )}
      {wait === 0 ? (
        <PrimaryButton label={t.start} onPress={() => router.push('/teste-mensal')} />
      ) : (
        <T variant="label" color={colors.primary}>
          {wait === 1 ? t.nextOne : fmt(t.next, { n: wait })}
        </T>
      )}
    </Card>
  );
}

function WeightCard({ body }: { body: BodyLog[] }) {
  const router = useRouter();
  const w = s.weight;
  // Um ponto por dia (vale o registro mais recente; a lista vem por data e atualização).
  const byDay = new Map<string, number>();
  for (const b of body) if (b.weight_kg !== null) byDay.set(b.logged_on, b.weight_kg);
  const points = [...byDay].map(([day, value]) => ({ day, value }));
  const last = points[points.length - 1];
  const first = points[0];
  const diff = last && first ? Math.round((last.value - first.value) * 10) / 10 : 0;
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.titleRow}>
        <T variant="title">{w.title}</T>
        {last && <T style={styles.big}>{fmt(w.kg, { value: formatDecimal(last.value) })}</T>}
      </View>
      {!last ? (
        <T variant="body" color={colors.textSecondary}>
          {w.empty}
        </T>
      ) : points.length === 1 ? (
        <T variant="caption" color={colors.textSecondary}>
          {w.onePoint}
        </T>
      ) : (
        <>
          <T variant="caption" color={colors.textSecondary}>
            {diff === 0
              ? fmt(w.noChange, { date: shortDate(first.day) })
              : fmt(w.change, { sign: diff > 0 ? '+' : '−', value: formatDecimal(Math.abs(diff)), date: shortDate(first.day) })}
          </T>
          <LineChart points={points.map((p) => ({ label: shortDate(p.day), value: p.value }))} format={(n) => formatDecimal(n)} />
        </>
      )}
      <SecondaryButton label={w.add} onPress={() => router.push('/registrar-peso')} />
    </Card>
  );
}

function MeasuresCard({ body }: { body: BodyLog[] }) {
  const m = s.measures;
  const items = (
    [
      ['waist_cm', m.waist],
      ['hip_cm', m.hip],
      ['arm_cm', m.arm],
    ] as const
  )
    .map(([key, label]) => ({ label, v: lastTwo(body, key) }))
    .filter((x) => x.v !== null);
  if (items.length === 0) {
    return (
      <Card style={{ gap: spacing.xs }}>
        <T variant="title">{m.title}</T>
        <T variant="caption" color={colors.textSecondary}>
          {m.empty}
        </T>
      </Card>
    );
  }
  return (
    <Card style={{ gap: spacing.md }}>
      <T variant="title">{m.title}</T>
      <View style={styles.stats}>
        {items.map(({ label, v }) => {
          const d = v!.previous === null ? 0 : Math.round((v!.last - v!.previous) * 10) / 10;
          return (
            <Stat
              key={label}
              label={label}
              value={fmt(m.cm, { value: formatDecimal(v!.last) })}
              sub={d === 0 ? undefined : fmt(m.diff, { sign: d > 0 ? '+' : '−', value: formatDecimal(Math.abs(d)) })}
            />
          );
        })}
      </View>
    </Card>
  );
}

function RecordsCard({ progress }: { progress: ExerciseProgress[] }) {
  const r = s.records;
  const [all, setAll] = useState(false);
  const shown = all ? progress : progress.slice(0, 5);
  return (
    <Card style={{ gap: spacing.md }}>
      <T variant="title">🏆 {r.title}</T>
      {progress.length === 0 ? (
        <T variant="body" color={colors.textSecondary}>
          {r.empty}
        </T>
      ) : (
        shown.map((p) => (
          <View key={p.exerciseId} style={styles.recordRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label">{getExercicio(p.exerciseId)?.nome ?? p.exerciseId}</T>
              <T variant="caption" color={colors.textSecondary}>
                {shortDate(p.best.date)}
              </T>
            </View>
            <T variant="label" color={colors.primary}>
              {metricText(p.metric, p.best.value)}
            </T>
          </View>
        ))
      )}
      {progress.length > 5 && (
        <Pressable accessibilityRole="button" onPress={() => setAll(!all)} style={styles.more}>
          <T variant="label" color={colors.primary}>
            {all ? r.showLess : fmt(r.showAll, { n: progress.length })}
          </T>
          <ChevronRightIcon color={colors.primary} />
        </Pressable>
      )}
    </Card>
  );
}

function ExerciseCard({ progress }: { progress: ExerciseProgress[] }) {
  const e = s.exercise;
  const [selected, setSelected] = useState<string | null>(null);
  const current = progress.find((p) => p.exerciseId === selected) ?? progress[0];
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <T variant="title">{e.title}</T>
        <T variant="caption" color={colors.textSecondary}>
          {e.hint}
        </T>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {progress.map((p) => (
          <Chip
            key={p.exerciseId}
            label={getExercicio(p.exerciseId)?.nome ?? p.exerciseId}
            selected={p.exerciseId === current.exerciseId}
            onPress={() => setSelected(p.exerciseId)}
          />
        ))}
      </ScrollView>
      {current.points.length < 2 ? (
        <T variant="caption" color={colors.textSecondary}>
          {e.onePoint}
        </T>
      ) : (
        <LineChart
          points={current.points.map((p) => ({ label: shortDate(p.date), value: p.value }))}
          format={(n) => (current.metric === 'load' ? formatDecimal(n) : String(Math.round(n)))}
        />
      )}
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <T style={styles.statValue}>{value}</T>
      <T variant="caption" color={colors.textSecondary} style={{ textAlign: 'center' }}>
        {label}
      </T>
      {sub && (
        <T variant="caption" color={colors.primary}>
          {sub}
        </T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  big: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chips: { gap: spacing.sm },
});

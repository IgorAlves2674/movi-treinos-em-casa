import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FigureView } from '@/components/figure/FigureView';
import { ProgressBar } from '@/components/form';
import { Stepper } from '@/components/Stepper';
import { Card, PrimaryButton, SecondaryButton, T } from '@/components/ui';
import { animacaoDoBoneco, getExercicio } from '@/content/exercises';
import type { MonthlyTestRow } from '@/db/tables';
import { useNow } from '@/hooks/useNow';
import { fmt, formatLongDate, strings } from '@/i18n';
import { buzz } from '@/lib/buzz';
import { mmss, parseLocalDate } from '@/lib/dates';
import { saveMonthlyTest, type TestResult } from '@/progress/stats';
import { colors, fonts, spacing } from '@/theme';

const s = strings.monthlyTest;
const SQUAT_SECONDS = 60;
/** Exercício mostrado no boneco em cada teste. */
const FIGURES = ['flexao_padrao', 'agachamento_livre', 'prancha'] as const;

/** Teste mensal (spec 8.3): flexões máximas, agachamentos em 1 min e prancha até a falha. */
export default function MonthlyTestScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [stage, setStage] = useState(0); // 0..2 = testes, 3 = resultado
  const [result, setResult] = useState<TestResult>({ pushups: null, squats_1min: null, plank_s: null });
  const [previous, setPrevious] = useState<MonthlyTestRow | null | undefined>(undefined);
  const savingRef = useRef(false);

  // Teste anterior, para comparar no fim.
  useEffect(() => {
    db.getFirstAsync<MonthlyTestRow>(
      'SELECT * FROM monthly_tests WHERE deleted_at IS NULL ORDER BY tested_on DESC, created_at DESC LIMIT 1',
    ).then((r) => setPrevious(r ?? null));
  }, [db]);

  const set = (patch: Partial<TestResult>) => setResult((r) => ({ ...r, ...patch }));

  async function next(skip = false) {
    const key = (['pushups', 'squats_1min', 'plank_s'] as const)[stage];
    if (skip) set({ [key]: null });
    if (stage < 2) {
      setStage(stage + 1);
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    await saveMonthlyTest(db, skip ? { ...result, plank_s: null } : result);
    setStage(3);
  }

  const figure = stage < 3 ? getExercicio(FIGURES[stage]) : undefined;
  const anim = useMemo(() => (figure ? animacaoDoBoneco(figure) : null), [figure]);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: s.title, gestureEnabled: stage < 3, headerBackVisible: stage < 3 }} />
      {stage < 3 ? (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={{ gap: spacing.sm }}>
              <ProgressBar value={(stage + 1) / 3} />
              <T variant="caption" color={colors.textSecondary}>
                {fmt(s.stepOf, { n: stage + 1 })}
              </T>
            </View>
            {anim && <FigureView anim={anim} view={anim.views[0]} />}
            {stage === 0 && (
              <Pushups value={result.pushups} onChange={(n) => set({ pushups: n })} />
            )}
            {stage === 1 && <Squats value={result.squats_1min} onChange={(n) => set({ squats_1min: n })} />}
            {stage === 2 && <Plank value={result.plank_s} onChange={(n) => set({ plank_s: n })} />}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label={stage === 2 ? s.finish : s.next}
              onPress={() => next()}
              disabled={(stage === 0 ? result.pushups : stage === 1 ? result.squats_1min : result.plank_s) === null}
            />
            <SecondaryButton label={s.skip} onPress={() => next(true)} style={{ borderWidth: 0 }} />
          </View>
        </>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <T variant="h1">{s.resultTitle}</T>
            <T variant="body" color={colors.textSecondary}>
              {previous
                ? fmt(s.vsPrevious, { date: formatLongDate(parseLocalDate(previous.tested_on)).toLowerCase() })
                : s.firstTime}
            </T>
            <ResultRow label={strings.progress.test.pushups} now={result.pushups} before={previous?.pushups ?? null} />
            <ResultRow label={strings.progress.test.squats} now={result.squats_1min} before={previous?.squats_1min ?? null} />
            <ResultRow label={strings.progress.test.plank} now={result.plank_s} before={previous?.plank_s ?? null} time />
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton label={s.close} onPress={() => router.back()} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Intro({ name, how }: { name: string; how: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <T variant="h2">{name}</T>
      <T variant="body" color={colors.textSecondary}>
        {how}
      </T>
    </View>
  );
}

function Pushups({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <>
      <Intro name={s.pushups.name} how={s.pushups.how} />
      <Stepper label={s.pushups.count} value={value} onChange={onChange} min={0} max={200} step={1} emptyLabel="–" />
    </>
  );
}

function Squats({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const now = useNow();
  const left = endsAt === null ? SQUAT_SECONDS : Math.max(0, (endsAt - now) / 1000);
  const phase = endsAt === null ? 'idle' : left > 0 ? 'running' : 'done';
  const buzzedRef = useRef(false);
  useEffect(() => {
    if (phase === 'done' && !buzzedRef.current) {
      buzzedRef.current = true;
      buzz('done');
    }
  }, [phase]);
  return (
    <>
      <Intro name={s.squats.name} how={s.squats.how} />
      <Card style={styles.timer}>
        <T style={styles.clock}>{mmss(left)}</T>
        {phase === 'running' && (
          <T variant="label" color={colors.primary}>
            {s.squats.running}
          </T>
        )}
        {phase === 'idle' && (
          <PrimaryButton
            label={s.squats.start}
            onPress={() => {
              buzzedRef.current = false;
              setEndsAt(Date.now() + SQUAT_SECONDS * 1000);
            }}
            style={{ alignSelf: 'stretch' }}
          />
        )}
      </Card>
      {phase === 'done' && (
        <>
          <T variant="label">{s.squats.done}</T>
          <Stepper label={s.squats.count} value={value} onChange={onChange} min={0} max={150} step={1} emptyLabel="–" />
        </>
      )}
    </>
  );
}

function Plank({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useNow();
  const running = startedAt !== null;
  return (
    <>
      <Intro name={s.plank.name} how={s.plank.how} />
      <Card style={styles.timer}>
        <T style={styles.clock}>{mmss(running ? (now - startedAt) / 1000 : (value ?? 0))}</T>
        {running ? (
          <PrimaryButton
            label={s.plank.stop}
            onPress={() => {
              onChange(Math.floor((Date.now() - startedAt) / 1000));
              setStartedAt(null);
              buzz('done');
            }}
            style={{ alignSelf: 'stretch' }}
          />
        ) : value === null ? (
          <PrimaryButton label={s.plank.start} onPress={() => setStartedAt(Date.now())} style={{ alignSelf: 'stretch' }} />
        ) : (
          <>
            <T variant="label" color={colors.primary}>
              {fmt(s.plank.result, { time: mmss(value) })}
            </T>
            <SecondaryButton label={s.plank.again} onPress={() => setStartedAt(Date.now())} style={{ alignSelf: 'stretch' }} />
          </>
        )}
      </Card>
    </>
  );
}

function ResultRow({ label, now, before, time }: { label: string; now: number | null; before: number | null; time?: boolean }) {
  const show = (n: number | null) => (n === null ? strings.progress.test.skipped : time ? mmss(n) : String(n));
  const diff = now !== null && before !== null ? now - before : null;
  const diffText =
    diff === null ? null : diff === 0 ? s.same : diff > 0 ? fmt(s.better, { n: time ? `${diff} s` : diff }) : fmt(s.worse, { n: time ? `${diff} s` : diff });
  return (
    <Card style={styles.resultRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="label">{label}</T>
        {before !== null && (
          <T variant="caption" color={colors.textSecondary}>
            {show(before)} →
          </T>
        )}
      </View>
      <T style={styles.resultValue}>{show(now)}</T>
      {diffText && (
        <T variant="label" color={diff! > 0 ? colors.primary : diff! < 0 ? colors.danger : colors.textSecondary} style={{ minWidth: 52, textAlign: 'right' }}>
          {diffText}
        </T>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.xs },
  timer: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  clock: { fontFamily: fonts.bold, fontSize: 48, color: colors.text, fontVariant: ['tabular-nums'] },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resultValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
});

import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FigureView } from '@/components/figure/FigureView';
import { ViewSelector } from '@/components/figure/ViewSelector';
import { ProgressBar } from '@/components/form';
import { Card, PrimaryButton, SecondaryButton, T } from '@/components/ui';
import { animacaoDoBoneco, getExercicio } from '@/content/exercises';
import type { WorkoutSessionRow } from '@/db/tables';
import type { FigureView as View3D } from '@/figure/types';
import { fmt, strings } from '@/i18n';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Prescription, Workout } from '@/workout/generator';
import {
  buildSteps,
  finishSession,
  isLogged,
  lastLoad,
  logSet,
  nextBlockStart,
  usesLoad,
  workSecondsOf,
  type Step,
  type WorkStep,
} from '@/workout/session';

const s = strings.player;

/** Vibração curta; no navegador não existe e é ignorada. */
function buzz(kind: 'tick' | 'done' = 'done') {
  const p =
    kind === 'done'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p.catch(() => undefined);
}

/** Mantém a tela acesa durante o treino (só no celular; no navegador não há suporte). */
function useScreenAwake() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const tag = 'movi-player';
    activateKeepAwakeAsync(tag).catch(() => undefined);
    return () => {
      deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, []);
}

/** Relógio que atualiza a cada `ms` (para cronômetro e contagens). */
function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const mmss = (sec: number) => {
  const t = Math.max(0, Math.ceil(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

function targetText(p: Prescription) {
  const w = strings.workout;
  const base = p.kind === 'reps' ? fmt(w.reps, { min: p.min, max: p.max }) : fmt(w.seconds, { s: p.seconds });
  return p.perSide ? base + w.perSide : base;
}

/**
 * Player do treino (spec seção 3): boneco aberto, seletor de vista, cronômetro,
 * contagem do descanso, próximo exercício e registro das séries (alvo preenchido).
 */
export default function PlayerScreen() {
  useScreenAwake();
  const db = useSQLiteContext();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<{ startedAt: string; workout: Workout } | null | 'missing'>(null);

  useEffect(() => {
    db.getFirstAsync<WorkoutSessionRow>('SELECT * FROM workout_sessions WHERE id = ?', [sessionId ?? '']).then((row) =>
      setSession(row ? { startedAt: row.started_at, workout: JSON.parse(row.planned) as Workout } : 'missing'),
    );
  }, [db, sessionId]);

  if (session === null || session === 'missing') {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <T variant="body" color={colors.textSecondary} style={{ padding: spacing.xl }}>
          {session === null ? s.loading : s.notFound}
        </T>
      </SafeAreaView>
    );
  }
  return (
    <Player
      sessionId={sessionId!}
      startedAt={session.startedAt}
      workout={session.workout}
      onFinish={() => router.replace({ pathname: '/fim-treino', params: { sessionId: sessionId! } })}
    />
  );
}

function Player({
  sessionId,
  startedAt,
  workout,
  onFinish,
}: {
  sessionId: string;
  startedAt: string;
  workout: Workout;
  onFinish: () => void;
}) {
  const db = useSQLiteContext();
  const steps = useMemo(() => buildSteps(workout), [workout]);
  // Estado de cada passo, preparado ao entrar nele (ver `enter`).
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(() => initial(steps[0]).endsAt);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [reps, setReps] = useState(() => initial(steps[0]).reps);
  const [load, setLoad] = useState<number | null>(null);
  const [view, setView] = useState<View3D>(() => initial(steps[0]).view);
  const [confirmExit, setConfirmExit] = useState(false);
  const step = steps[index];
  const now = useNow();
  const firedRef = useRef(-1);
  const sideRef = useRef(-1);
  const busyRef = useRef(false);

  const total = step ? (step.kind === 'rest' ? step.seconds : workSecondsOf(step.prescription)) : 0;
  const remaining = endsAt !== null ? (endsAt - now) / 1000 : (pausedLeft ?? total);
  const running = endsAt !== null;

  /** Entra no passo `i`: metas preenchidas e contagem (que começa sozinha no descanso e no aquecimento/alongamento). */
  const enter = useCallback(
    (i: number) => {
      const init = initial(steps[i]);
      setIndex(i);
      setEndsAt(init.endsAt);
      setPausedLeft(null);
      setReps(init.reps);
      setView(init.view);
      setLoad(null);
    },
    [steps],
  );

  // Carga já preenchida com a última usada neste exercício.
  useEffect(() => {
    const st = steps[index];
    if (!st || !isLogged(st)) return;
    const e = getExercicio(st.exerciseId);
    if (!e || !usesLoad(e)) return;
    let cancelled = false;
    lastLoad(db, st.exerciseId).then((kg) => {
      if (!cancelled) setLoad(kg);
    });
    return () => {
      cancelled = true;
    };
  }, [db, steps, index]);

  const goTo = useCallback(
    async (next: number) => {
      if (next >= steps.length) {
        await finishSession(db, sessionId, startedAt);
        onFinish();
        return;
      }
      enter(next);
    },
    [db, sessionId, startedAt, onFinish, steps.length, enter],
  );

  /** Conclui o passo atual (registrando a série, se for da parte principal). */
  const complete = useCallback(
    async (secondsDone?: number) => {
      if (!step || busyRef.current) return;
      busyRef.current = true;
      try {
        if (isLogged(step)) {
          const p = step.prescription;
          await logSet(db, sessionId, step, {
            reps: p.kind === 'reps' ? reps : null,
            seconds: p.kind === 'time' ? Math.round(secondsDone ?? p.seconds) : null,
            loadKg: load,
          });
        }
        await goTo(index + 1);
      } finally {
        busyRef.current = false;
      }
    },
    [step, db, sessionId, reps, load, goTo, index],
  );

  // Fim da contagem: vibra e segue (descanso → próximo; exercício por tempo → registra).
  // Roda fora do efeito (setTimeout) para não atualizar estado durante a renderização.
  useEffect(() => {
    if (!step || endsAt === null || remaining > 0 || firedRef.current === index) return;
    firedRef.current = index;
    // Sem cancelar na limpeza: o efeito roda de novo a cada tique do relógio, e o
    // firedRef já garante que isto acontece uma vez só por passo.
    setTimeout(() => {
      buzz('done');
      if (step.kind === 'rest') void goTo(index + 1);
      else void complete(step.prescription.kind === 'time' ? step.prescription.seconds : undefined);
    }, 0);
  }, [remaining, endsAt, step, index, goTo, complete]);

  // Exercício por tempo "por lado": aviso na metade para trocar.
  const halfway = step?.kind === 'work' && step.prescription.kind === 'time' && step.prescription.perSide;
  const switchSide = halfway && running && remaining <= total / 2;
  useEffect(() => {
    if (switchSide && sideRef.current !== index) {
      sideRef.current = index;
      buzz('tick');
    }
  }, [switchSide, index]);

  if (!step) return null;

  const elapsed = (now - Date.parse(startedAt)) / 1000;
  const upcoming = steps.slice(index + 1).find((x): x is WorkStep => x.kind === 'work');
  const shownId = step.kind === 'rest' ? upcoming?.exerciseId : step.exerciseId;
  const shown = shownId ? getExercicio(shownId) : undefined;
  const blockKind = step.kind === 'work' ? step.blockKind : workout.blocks[step.blockIndex].kind;
  const canSkipBlock = blockKind === 'warmup' || blockKind === 'cooldown';

  const pause = () => {
    setPausedLeft(Math.max(0, remaining));
    setEndsAt(null);
  };
  const resume = () => setEndsAt(Date.now() + Math.max(0, remaining) * 1000);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => setConfirmExit(true)} hitSlop={10}>
          <T variant="label" color={colors.danger}>
            {s.exit}
          </T>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={index / steps.length} />
        </View>
        <T variant="label" style={{ fontVariant: ['tabular-nums'] }}>
          {mmss(elapsed)}
        </T>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {shown && (
          <View style={{ gap: spacing.sm }}>
            <FigureView anim={animacaoDoBoneco(shown)} view={shown.vistas.includes(view) ? view : shown.vistas[0]} />
            <ViewSelector views={shown.vistas} value={shown.vistas.includes(view) ? view : shown.vistas[0]} onChange={setView} />
          </View>
        )}

        {step.kind === 'rest' ? (
          <RestPanel
            step={step}
            remaining={remaining}
            nextName={shown?.nome}
            onSkip={() => void goTo(index + 1)}
            onAdd={() => setEndsAt((e) => (e ?? Date.now()) + 15000)}
          />
        ) : (
          <WorkPanel
            step={step}
            name={shown?.nome ?? ''}
            remaining={remaining}
            total={total}
            running={running}
            paused={pausedLeft !== null}
            switchSide={!!switchSide}
            reps={reps}
            setReps={setReps}
            load={shown && usesLoad(shown) && isLogged(step) ? load : undefined}
            setLoad={setLoad}
            onStart={() => setEndsAt(Date.now() + total * 1000)}
            onPause={pause}
            onResume={resume}
            onDone={() =>
              void complete(
                step.prescription.kind === 'time'
                  ? (total - Math.max(0, remaining)) / (step.prescription.perSide ? 2 : 1)
                  : undefined,
              )
            }
          />
        )}

        {step.kind === 'work' && upcoming && (
          <T variant="caption" color={colors.textSecondary} style={styles.center}>
            {s.next}:{' '}
            {upcoming.exerciseId === step.exerciseId && upcoming.blockKind === 'sets'
              ? fmt(s.setOf, { n: upcoming.round, total: upcoming.totalRounds }).toLowerCase()
              : getExercicio(upcoming.exerciseId)?.nome}
          </T>
        )}
        {canSkipBlock && (
          <SecondaryButton
            label={blockKind === 'warmup' ? s.skipWarmup : s.skipCooldown}
            onPress={() => void goTo(nextBlockStart(steps, index))}
          />
        )}
      </ScrollView>

      <Modal visible={confirmExit} transparent animationType="fade" onRequestClose={() => setConfirmExit(false)}>
        <View style={styles.backdrop}>
          <Card style={styles.dialog}>
            <T variant="h2">{s.exitTitle}</T>
            <T variant="body" color={colors.textSecondary}>
              {s.exitText}
            </T>
            <PrimaryButton
              label={s.exitConfirm}
              onPress={async () => {
                setConfirmExit(false);
                await finishSession(db, sessionId, startedAt);
                onFinish();
              }}
            />
            <SecondaryButton label={s.exitCancel} onPress={() => setConfirmExit(false)} />
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Valores iniciais de um passo. */
function initial(step: Step | undefined): { endsAt: number | null; reps: number; view: View3D } {
  if (!step) return { endsAt: null, reps: 0, view: 'lateral' };
  if (step.kind === 'rest') return { endsAt: Date.now() + step.seconds * 1000, reps: 0, view: 'lateral' };
  const p = step.prescription;
  const view = getExercicio(step.exerciseId)?.vistas[0] ?? 'lateral';
  // Aquecimento e alongamento começam sozinhos; na parte principal a pessoa toca em "Iniciar".
  const endsAt = p.kind === 'time' && !isLogged(step) ? Date.now() + workSecondsOf(p) * 1000 : null;
  return { endsAt, reps: p.kind === 'reps' ? p.max : 0, view };
}

function stepLabel(step: WorkStep): string {
  if (step.blockKind === 'warmup') return s.warmup;
  if (step.blockKind === 'cooldown') return s.cooldown;
  if (step.blockKind === 'sets') return fmt(s.setOf, { n: step.round, total: step.totalRounds });
  return fmt(s.roundOf, { n: step.round, total: step.totalRounds, pos: step.position, size: step.blockSize });
}

function WorkPanel(props: {
  step: WorkStep;
  name: string;
  remaining: number;
  total: number;
  running: boolean;
  paused: boolean;
  switchSide: boolean;
  reps: number;
  setReps: (n: number) => void;
  load: number | null | undefined;
  setLoad: (n: number | null) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onDone: () => void;
}) {
  const { step, name } = props;
  const p = step.prescription;
  const logged = isLogged(step);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <T variant="overline" color={colors.primary}>
          {stepLabel(step).toUpperCase()}
        </T>
        <T variant="h1">{name}</T>
        <T variant="body" color={colors.textSecondary}>
          {fmt(s.target, { target: targetText(p) })}
        </T>
      </View>

      {p.kind === 'time' ? (
        <View style={styles.timerBox}>
          <T style={styles.bigTimer}>{mmss(props.remaining)}</T>
          {props.switchSide && (
            <T variant="label" color={colors.primary}>
              {s.switchSide}
            </T>
          )}
        </View>
      ) : (
        <Stepper label={s.reps} value={props.reps} onChange={props.setReps} min={0} max={200} step={1} />
      )}
      {props.load !== undefined && (
        <Stepper
          label={s.load}
          value={props.load}
          onChange={props.setLoad}
          min={0}
          max={400}
          step={1}
          emptyLabel={s.noLoad}
        />
      )}

      {p.kind === 'time' && logged && !props.running && !props.paused ? (
        <PrimaryButton label={s.start} onPress={props.onStart} />
      ) : (
        <PrimaryButton label={p.kind === 'reps' ? (logged ? s.done : s.nextStep) : s.doneTimed} onPress={props.onDone} />
      )}
      {p.kind === 'time' && (props.running || props.paused) && (
        <SecondaryButton label={props.running ? s.pause : s.resume} onPress={props.running ? props.onPause : props.onResume} />
      )}
    </View>
  );
}

function RestPanel({
  step,
  remaining,
  nextName,
  onSkip,
  onAdd,
}: {
  step: Extract<Step, { kind: 'rest' }>;
  remaining: number;
  nextName?: string;
  onSkip: () => void;
  onAdd: () => void;
}) {
  const title = step.reason === 'sets' ? s.restBetweenSets : step.reason === 'round' ? s.restBetweenRounds : s.restBetweenExercises;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <T variant="overline" color={colors.primary}>
          {title.toUpperCase()}
        </T>
        {nextName && (
          <T variant="body" color={colors.textSecondary}>
            {s.upNext}: <T variant="label">{nextName}</T>
          </T>
        )}
      </View>
      <View style={styles.timerBox}>
        <T style={styles.bigTimer}>{mmss(remaining)}</T>
      </View>
      <View style={styles.row}>
        <SecondaryButton label={s.addRest} onPress={onAdd} style={{ flex: 1 }} />
        <PrimaryButton label={s.skipRest} onPress={onSkip} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

/** Campo com − e + (repetições, carga). */
function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step,
  emptyLabel,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  emptyLabel?: string;
}) {
  const v = value ?? 0;
  return (
    <View style={styles.stepper}>
      <T variant="label" style={{ flex: 1 }}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} −`}
        onPress={() => onChange(Math.max(min, v - step))}
        style={styles.stepBtn}
      >
        <T variant="h2" color={colors.primary}>
          −
        </T>
      </Pressable>
      <T style={styles.stepValue}>{value === null && emptyLabel ? emptyLabel : String(v)}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} +`}
        onPress={() => onChange(Math.min(max, v + step))}
        style={styles.stepBtn}
      >
        <T variant="h2" color={colors.primary}>
          +
        </T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  timerBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  bigTimer: { fontFamily: fonts.bold, fontSize: 56, color: colors.text, fontVariant: ['tabular-nums'] },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontFamily: fonts.bold, fontSize: 24, minWidth: 64, textAlign: 'center', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  dialog: { gap: spacing.md, padding: spacing.xl },
});

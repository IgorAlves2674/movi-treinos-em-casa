import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ExerciseInfoModal } from '@/components/ExerciseInfoModal';
import { FigureView } from '@/components/figure/FigureView';
import { InfoIcon, SwapIcon } from '@/components/icons';
import { Card, PrimaryButton, Screen, SecondaryButton, T } from '@/components/ui';
import { animacaoDoBoneco, getExercicio } from '@/content/exercises';
import { fmt, strings } from '@/i18n';
import { formatDecimal } from '@/lib/dates';
import { useProfile } from '@/profile/useProfile';
import { colors, fonts, radius, spacing } from '@/theme';
import { setDraft, useDraft } from '@/workout/draft';
import { prepareWorkout } from '@/workout/plan';
import { startSession } from '@/workout/session';
import { generatorProfile } from '@/workout/fromProfile';
import {
  blockSeconds,
  canSwap,
  generateWorkout,
  mainExerciseIds,
  setsOf,
  swapExercise,
  type WorkoutBlock,
  type WorkoutItem,
} from '@/workout/generator';

const s = strings.workout;

/** Lista do treino (spec seção 3): blocos, séries/tempo, descanso, informações e trocar. */
export default function WorkoutListScreen() {
  const draft = useDraft();
  const { profile } = useProfile();
  const db = useSQLiteContext();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [infoId, setInfoId] = useState<string | null>(null);
  const gp = useMemo(() => (profile ? generatorProfile(profile) : null), [profile]);

  if (!draft || !gp) {
    return (
      <Screen>
        <Stack.Screen options={{ title: s.title }} />
        <Card>
          <T variant="body" color={colors.textSecondary}>
            {s.empty}
          </T>
        </Card>
      </Screen>
    );
  }
  const { workout, minutes, kind, plan } = draft;
  const mainCount = workout.blocks
    .filter((b) => b.kind === 'sets' || b.kind === 'circuit')
    .reduce((n, b) => n + b.items.length, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: s.title }} />
      <View style={{ gap: 4 }}>
        <T variant="h2">{plan ? fmt(s.planHeading, plan) : s.heading}</T>
        <T variant="body" color={colors.textSecondary}>
          {fmt(s.summary, { minutes: workout.estimatedMinutes, count: mainCount })}
        </T>
      </View>

      {workout.warnings.map((w) => (
        <Card key={w} style={styles.warning}>
          <T variant="body" style={{ lineHeight: 20 }}>
            {s.warnings[w]}
          </T>
        </Card>
      ))}

      {workout.blocks.map((block, bi) => (
        <BlockCard
          key={bi}
          block={block}
          onInfo={setInfoId}
          onSwap={(ii) => setDraft({ ...draft, workout: swapExercise(workout, bi, ii, gp) })}
          swappable={(ii) => canSwap(workout, bi, ii, gp)}
        />
      ))}

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          label={s.start}
          disabled={starting}
          onPress={async () => {
            setStarting(true);
            try {
              const sessionId = await startSession(db, workout, kind);
              router.push({ pathname: '/player', params: { sessionId } });
            } finally {
              setStarting(false);
            }
          }}
        />
        {kind === 'avulso' && (
          <SecondaryButton
            label={s.regenerate}
            onPress={async () => {
              const fresh = generateWorkout({ ...gp, minutes }, { avoidIds: mainExerciseIds(workout) });
              setDraft({ ...draft, workout: await prepareWorkout(db, fresh, gp) });
            }}
          />
        )}
      </View>

      <ExerciseInfoModal exerciseId={infoId} onClose={() => setInfoId(null)} />
    </Screen>
  );
}

function blockHeader(b: WorkoutBlock): { title: string; hint: string } {
  switch (b.kind) {
    case 'warmup':
      return { title: s.warmup, hint: fmt(s.warmupHint, { minutes: Math.round(blockSeconds(b) / 60) }) };
    case 'cooldown':
      return { title: s.cooldown, hint: s.cooldownHint };
    case 'sets':
      return { title: s.sets, hint: fmt(s.setsHint, { sets: b.sets, rest: b.restBetweenSetsS }) };
    case 'circuit':
      return {
        title: s.circuit,
        hint: fmt(b.restBetweenExercisesS > 0 ? s.circuitHint : s.circuitHintNoRest, {
          rounds: b.rounds,
          restEx: b.restBetweenExercisesS,
          restRound: b.restBetweenRoundsS,
        }),
      };
  }
}

function prescriptionText(it: WorkoutItem, block: WorkoutBlock): string {
  const p = it.prescription;
  let text = p.kind === 'reps' ? fmt(s.reps, { min: p.min, max: p.max }) : fmt(s.seconds, { s: p.seconds });
  if (p.perSide) text += s.perSide;
  if (block.kind === 'sets' && it.extraSets) text += fmt(s.extraSets, { n: setsOf(block, it) });
  if (p.kind === 'reps' && p.loadKg) text += fmt(s.load, { kg: formatDecimal(p.loadKg) });
  return text;
}

function BlockCard({
  block,
  onInfo,
  onSwap,
  swappable,
}: {
  block: WorkoutBlock;
  onInfo: (id: string) => void;
  onSwap: (itemIndex: number) => void;
  swappable: (itemIndex: number) => boolean;
}) {
  const { title, hint } = blockHeader(block);
  const isMain = block.kind === 'sets' || block.kind === 'circuit';
  return (
    <Card style={{ gap: spacing.md, paddingHorizontal: spacing.md }}>
      <View style={{ gap: 2, paddingHorizontal: 4 }}>
        <T variant="title">{title}</T>
        <T variant="caption" color={colors.textSecondary}>
          {hint}
        </T>
      </View>
      {block.items.map((it, ii) => (
        <ExerciseRow
          key={`${it.exerciseId}-${ii}`}
          exerciseId={it.exerciseId}
          detail={prescriptionText(it, block)}
          note={it.progress ? s.progress[it.progress] : undefined}
          compact={!isMain}
          onInfo={() => onInfo(it.exerciseId)}
          onSwap={isMain && swappable(ii) ? () => onSwap(ii) : undefined}
        />
      ))}
    </Card>
  );
}

/** Linha de exercício: miniatura do boneco parado, nome, alvo e botões. */
const ExerciseRow = memo(function ExerciseRow({
  exerciseId,
  detail,
  note,
  compact,
  onInfo,
  onSwap,
}: {
  exerciseId: string;
  detail: string;
  note?: string;
  compact: boolean;
  onInfo: () => void;
  onSwap?: () => void;
}) {
  const e = getExercicio(exerciseId);
  const anim = useMemo(() => (e ? animacaoDoBoneco(e) : null), [e]);
  if (!e || !anim) return null;
  return (
    <View style={styles.row}>
      <Pressable onPress={onInfo} style={{ width: compact ? 56 : 76 }} accessibilityLabel={s.info}>
        <FigureView anim={anim} view={e.vistas[0]} frozenAt={0.4} style={{ borderRadius: radius.sm }} />
      </Pressable>
      <Pressable onPress={onInfo} style={{ flex: 1, gap: 2 }}>
        <T variant={compact ? 'body' : 'label'} numberOfLines={2}>
          {e.nome}
        </T>
        <T variant="caption" color={colors.textSecondary}>
          {detail}
        </T>
        {note && (
          <T variant="caption" color={colors.primary} style={{ fontFamily: fonts.semibold }}>
            {note}
          </T>
        )}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={s.info} onPress={onInfo} hitSlop={8} style={styles.iconBtn}>
        <InfoIcon />
      </Pressable>
      {onSwap && (
        <Pressable accessibilityRole="button" accessibilityLabel={s.swap} onPress={onSwap} hitSlop={8} style={styles.iconBtn}>
          <SwapIcon />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: { borderColor: '#F3D9B5', backgroundColor: '#FFF8EC' },
});

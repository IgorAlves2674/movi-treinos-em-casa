/**
 * Progressão automática (etapa 8, spec 8.1). Calculada a partir das séries
 * registradas, sem guardar estado: as metas do próximo treino partem das metas
 * do último treino de cada exercício.
 *
 * - Sobe um degrau quando bate o topo da faixa em todas as séries por 2 treinos
 *   seguidos (com as mesmas metas): variação mais difícil → mais carga → mais
 *   séries → mais repetições. Exercícios por tempo: variação mais difícil ou +5 s.
 * - Desce quando não chega no mínimo da faixa 2 treinos seguidos.
 * - "Como foi?" do último treino: Pesado tira uma série/volta; Fácil aumenta as metas.
 * - O plano sorteia exercícios toda semana; se a pessoa já subiu de variação numa
 *   família (ex.: flexão no joelho → flexão), o treino usa a variação em que ela está.
 */
import { getExercicio, type Exercicio } from '@/content/exercises';
import type { Feeling } from '@/db/tables';

import {
  estimateMinutes,
  isAllowed,
  prescriptionFor,
  type GeneratorProfile,
  type Prescription,
  type ProgressNote,
  type Workout,
  type WorkoutBlock,
  type WorkoutItem,
} from './generator';
import { usesLoad } from './loads';

/** Uma série registrada (o que importa para a progressão). */
export type LoggedSet = {
  round: number;
  reps: number | null;
  seconds: number | null;
  load_kg: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_seconds: number | null;
};
/** Séries de um exercício num treino. */
export type ExerciseSession = { exerciseId: string; finishedAt: string; sets: LoggedSet[] };
/** Histórico: por exercício, os treinos do mais novo para o mais antigo. */
export type History = Map<string, ExerciseSession[]>;

export const MAX_EXTRA_SETS = 2;
const MAX_REPS = 30;
const MIN_REPS = 4;
const MAX_SECONDS = 90;
const TIME_STEP = 5;
const REPS_STEP = 2;

// ---------------------------------------------------------------- leitura do histórico

const top = (s: LoggedSet) => s.target_reps_max;
const configOf = (x: ExerciseSession) => {
  const f = x.sets[0];
  return `${f?.target_reps_min}-${f?.target_reps_max}-${f?.target_seconds}-${setCount(x)}-${loadOf(x) ?? ''}`;
};
const setCount = (x: ExerciseSession) => Math.max(0, ...x.sets.map((s) => s.round));
const loadOf = (x: ExerciseSession): number | null => {
  const loads = x.sets.map((s) => s.load_kg).filter((n): n is number => n !== null && n > 0);
  return loads.length ? Math.max(...loads) : null;
};

/** Bateu a meta em todas as séries (topo da faixa ou o tempo todo). */
function allOnTarget(x: ExerciseSession): boolean {
  return (
    x.sets.length > 0 &&
    x.sets.every((s) =>
      s.target_seconds !== null ? (s.seconds ?? 0) >= s.target_seconds : top(s) !== null && (s.reps ?? 0) >= top(s)!,
    )
  );
}

/** Ficou abaixo do mínimo da faixa em mais da metade das séries. */
function belowMinimum(x: ExerciseSession): boolean {
  const reps = x.sets.filter((s) => s.target_reps_min !== null);
  if (reps.length === 0) return false;
  return reps.filter((s) => (s.reps ?? 0) < s.target_reps_min!).length * 2 > reps.length;
}

export type Verdict = 'up' | 'down' | 'keep';

/** Sobe, desce ou mantém, olhando os 2 últimos treinos do exercício. */
export function verdictOf(sessions: ExerciseSession[]): Verdict {
  const [last, before] = sessions;
  if (!last || !before) return 'keep';
  if (allOnTarget(last) && allOnTarget(before) && configOf(last) === configOf(before)) return 'up';
  if (belowMinimum(last) && belowMinimum(before)) return 'down';
  return 'keep';
}

// ---------------------------------------------------------------- variações

/** Variações ligadas a este exercício (mais fáceis e mais difíceis, em linha). */
function chainOf(e: Exercicio): string[] {
  const ids = [e.id];
  for (const dir of ['variacao_mais_facil', 'variacao_mais_dificil'] as const) {
    let cur: Exercicio | undefined = e;
    const seen = new Set(ids);
    while (cur?.[dir] && !seen.has(cur[dir]!)) {
      const next = getExercicio(cur[dir]!);
      if (!next) break;
      ids.push(next.id);
      seen.add(next.id);
      cur = next;
    }
  }
  return ids;
}

/** Na progressão vale subir além do nível do perfil; equipamento e restrições continuam valendo. */
const canUse = (e: Exercicio | undefined, p: GeneratorProfile): e is Exercicio =>
  !!e && isAllowed(e, { ...p, level: 'avancado' });

/** Variação em que a pessoa está nesta família (a mais recente feita), se for outra. */
function currentVariation(e: Exercicio, history: History, p: GeneratorProfile): Exercicio {
  let best: { e: Exercicio; at: string } | null = null;
  for (const id of chainOf(e)) {
    const at = history.get(id)?.[0]?.finishedAt;
    const x = getExercicio(id);
    if (at && canUse(x, p) && (!best || at > best.at)) best = { e: x, at };
  }
  return best?.e ?? e;
}

// ---------------------------------------------------------------- metas

const LOAD_STEP = (e: Exercicio) => (e.equipamentos.some((op) => op.includes('barra_anilhas')) ? 2.5 : 1);
function maxLoad(e: Exercicio, p: GeneratorProfile): number {
  const barbell = e.equipamentos.some((op) => op.includes('barra_anilhas'));
  const max = barbell ? p.barbellMaxKg : p.dumbbellMaxKg;
  return max && max > 0 ? max : Infinity;
}
const round1 = (n: number) => Math.round(n * 10) / 10;

type Planned = { exercise: Exercicio; prescription: Prescription; extraSets: number; progress?: ProgressNote };

/** Metas do último treino do exercício (ou as padrão, se nunca fez). */
function fromLast(e: Exercicio, base: Prescription, last: ExerciseSession | undefined, blockSets: number | null): Planned {
  const f = last?.sets[0];
  let prescription: Prescription = base;
  if (f && base.kind === 'reps' && f.target_reps_min !== null && f.target_reps_max !== null)
    prescription = { ...base, min: f.target_reps_min, max: f.target_reps_max };
  if (f && base.kind === 'time' && f.target_seconds !== null) prescription = { ...base, seconds: f.target_seconds };
  const load = last ? loadOf(last) : null;
  if (prescription.kind === 'reps' && load !== null && usesLoad(e)) prescription = { ...prescription, loadKg: load };
  const extraSets =
    blockSets !== null && last ? Math.min(MAX_EXTRA_SETS, Math.max(0, setCount(last) - blockSets)) : 0;
  return { exercise: e, prescription, extraSets };
}

/** Um degrau acima (spec 8.1). */
function stepUp(cur: Planned, p: GeneratorProfile, blockSets: number | null): Planned {
  const e = cur.exercise;
  const harder = getExercicio(e.variacao_mais_dificil ?? '');
  if (canUse(harder, p)) return { exercise: harder, prescription: prescriptionFor(harder, p), extraSets: 0, progress: 'harder' };
  const pr = cur.prescription;
  if (pr.kind === 'time') {
    if (pr.seconds + TIME_STEP <= MAX_SECONDS)
      return { ...cur, prescription: { ...pr, seconds: pr.seconds + TIME_STEP }, progress: 'moreTime' };
    return cur;
  }
  if (usesLoad(e) && pr.loadKg !== undefined) {
    const next = round1(pr.loadKg + LOAD_STEP(e));
    if (next <= maxLoad(e, p)) return { ...cur, prescription: { ...pr, loadKg: next }, progress: 'moreLoad' };
  }
  if (blockSets !== null && cur.extraSets < MAX_EXTRA_SETS)
    return { ...cur, extraSets: cur.extraSets + 1, progress: 'moreSets' };
  if (pr.max + REPS_STEP <= MAX_REPS)
    return { ...cur, prescription: { ...pr, min: pr.min + REPS_STEP, max: pr.max + REPS_STEP }, progress: 'moreReps' };
  return cur;
}

/** Um degrau abaixo. */
function stepDown(cur: Planned, p: GeneratorProfile): Planned {
  const e = cur.exercise;
  const easier = getExercicio(e.variacao_mais_facil ?? '');
  if (canUse(easier, p)) return { exercise: easier, prescription: prescriptionFor(easier, p), extraSets: 0, progress: 'easier' };
  const pr = cur.prescription;
  if (pr.kind === 'time') return cur;
  if (usesLoad(e) && pr.loadKg !== undefined && pr.loadKg - LOAD_STEP(e) > 0)
    return { ...cur, prescription: { ...pr, loadKg: round1(pr.loadKg - LOAD_STEP(e)) }, progress: 'lessLoad' };
  if (cur.extraSets > 0) return { ...cur, extraSets: cur.extraSets - 1, progress: 'lessSets' };
  if (pr.min - REPS_STEP >= MIN_REPS)
    return { ...cur, prescription: { ...pr, min: pr.min - REPS_STEP, max: pr.max - REPS_STEP }, progress: 'lessReps' };
  return cur;
}

/** Progressão de um exercício do treino. */
export function progressItem(item: WorkoutItem, blockSets: number | null, history: History, p: GeneratorProfile): WorkoutItem {
  const planned = getExercicio(item.exerciseId);
  if (!planned) return item;
  const e = currentVariation(planned, history, p);
  const sessions = history.get(e.id) ?? [];
  const base = e.id === planned.id ? item.prescription : prescriptionFor(e, p);
  const cur = fromLast(e, base, sessions[0], blockSets);
  const v = verdictOf(sessions);
  const next = v === 'up' ? stepUp(cur, p, blockSets) : v === 'down' ? stepDown(cur, p) : cur;
  return {
    slot: item.slot,
    exerciseId: next.exercise.id,
    prescription: next.prescription,
    ...(next.extraSets ? { extraSets: next.extraSets } : {}),
    ...(next.progress ? { progress: next.progress } : {}),
  };
}

/** "Como foi?" do último treino ajusta este (spec 8.1). */
function applyFeeling(blocks: WorkoutBlock[], feeling: Feeling | null): WorkoutBlock[] {
  if (feeling === 'pesado') {
    return blocks.map((b) =>
      b.kind === 'sets' && b.sets > 2
        ? { ...b, sets: b.sets - 1 }
        : b.kind === 'circuit' && b.rounds > 2
          ? { ...b, rounds: b.rounds - 1 }
          : b,
    );
  }
  if (feeling === 'facil') {
    const bump = (it: WorkoutItem): WorkoutItem => {
      if (it.progress) return it; // já mudou pela progressão
      const pr = it.prescription;
      if (pr.kind === 'time')
        return pr.seconds + TIME_STEP <= MAX_SECONDS ? { ...it, prescription: { ...pr, seconds: pr.seconds + TIME_STEP } } : it;
      return pr.max + REPS_STEP <= MAX_REPS
        ? { ...it, prescription: { ...pr, min: pr.min + REPS_STEP, max: pr.max + REPS_STEP } }
        : it;
    };
    return blocks.map((b) => (b.kind === 'sets' || b.kind === 'circuit' ? ({ ...b, items: b.items.map(bump) } as WorkoutBlock) : b));
  }
  return blocks;
}

/**
 * Aplica a progressão ao treino montado (plano ou avulso). Aquecimento e
 * alongamento não mudam. Se a troca de variação repetir um exercício que já está
 * no treino, mantém o original.
 */
export function applyProgression(
  workout: Workout,
  history: History,
  p: GeneratorProfile,
  lastFeeling: Feeling | null = null,
): Workout {
  const used = new Set<string>();
  let blocks = workout.blocks.map((b) => {
    if (b.kind !== 'sets' && b.kind !== 'circuit') return b;
    const items = b.items.map((it) => {
      const next = progressItem(it, b.kind === 'sets' ? b.sets : null, history, p);
      const chosen = used.has(next.exerciseId) ? it : next;
      used.add(chosen.exerciseId);
      return chosen;
    });
    return { ...b, items } as WorkoutBlock;
  });
  blocks = applyFeeling(blocks, lastFeeling);
  return { ...workout, blocks, estimatedMinutes: estimateMinutes(blocks) };
}

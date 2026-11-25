/**
 * Treino em andamento (etapa 6): transforma o treino montado numa sequência de
 * passos (exercício → descanso → …), grava o treino e as séries e calcula os
 * recordes no fim.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { getExercicio, type Exercicio } from '@/content/exercises';
import { insertRow, nowIso, updateRow } from '@/db/repository';
import type { Feeling, SetLogRow, WorkoutSessionRow } from '@/db/tables';

import type { Prescription, Workout, WorkoutBlock } from './generator';

export type WorkStep = {
  kind: 'work';
  blockIndex: number;
  blockKind: WorkoutBlock['kind'];
  exerciseId: string;
  prescription: Prescription;
  /** Série (em séries) ou volta (em circuito), começando em 1. */
  round: number;
  totalRounds: number;
  /** Posição do exercício no circuito (1..n). */
  position: number;
  blockSize: number;
};
export type RestStep = { kind: 'rest'; blockIndex: number; seconds: number; reason: 'sets' | 'exercise' | 'round' };
export type Step = WorkStep | RestStep;

/** Exercício principal (séries ou circuito): só esses registram série. */
export const isLogged = (s: Step): s is WorkStep => s.kind === 'work' && (s.blockKind === 'sets' || s.blockKind === 'circuit');

/** Sequência completa do treino, na ordem em que é feito. */
export function buildSteps(workout: Workout): Step[] {
  const steps: Step[] = [];
  const work = (blockIndex: number, b: WorkoutBlock, itemIndex: number, round: number, totalRounds: number): WorkStep => ({
    kind: 'work',
    blockIndex,
    blockKind: b.kind,
    exerciseId: b.items[itemIndex].exerciseId,
    prescription: b.items[itemIndex].prescription,
    round,
    totalRounds,
    position: itemIndex + 1,
    blockSize: b.items.length,
  });
  workout.blocks.forEach((b, bi) => {
    if (b.kind === 'warmup' || b.kind === 'cooldown') {
      b.items.forEach((_, ii) => steps.push(work(bi, b, ii, 1, 1)));
    } else if (b.kind === 'sets') {
      b.items.forEach((_, ii) => {
        for (let r = 1; r <= b.sets; r++) {
          steps.push(work(bi, b, ii, r, b.sets));
          // Descanso entre séries e também antes do próximo exercício.
          const isLastOfBlock = r === b.sets && ii === b.items.length - 1;
          if (!isLastOfBlock) steps.push({ kind: 'rest', blockIndex: bi, seconds: b.restBetweenSetsS, reason: 'sets' });
        }
      });
    } else {
      for (let r = 1; r <= b.rounds; r++) {
        b.items.forEach((_, ii) => {
          steps.push(work(bi, b, ii, r, b.rounds));
          const lastInRound = ii === b.items.length - 1;
          if (!lastInRound && b.restBetweenExercisesS > 0)
            steps.push({ kind: 'rest', blockIndex: bi, seconds: b.restBetweenExercisesS, reason: 'exercise' });
          if (lastInRound && r < b.rounds)
            steps.push({ kind: 'rest', blockIndex: bi, seconds: b.restBetweenRoundsS, reason: 'round' });
        });
      }
    }
  });
  // Descanso logo antes de outro descanso ou no fim de um bloco que vai para o alongamento não faz sentido.
  return steps.filter((s, i) => !(s.kind === 'rest' && steps[i + 1]?.kind === 'rest'));
}

/** Índice do primeiro passo do próximo bloco (botão "Pular aquecimento/alongamento"). */
export function nextBlockStart(steps: Step[], index: number): number {
  const block = steps[index]?.blockIndex;
  let i = index;
  while (i < steps.length && steps[i].blockIndex === block) i++;
  return i;
}

/** Segundos de trabalho de um passo por tempo (por lado = o dobro). */
export function workSecondsOf(p: Prescription): number {
  return p.kind === 'time' ? p.seconds * (p.perSide ? 2 : 1) : 0;
}

const LOAD_ITEMS = new Set(['halteres', 'barra_anilhas', 'kettlebell', 'caneleira']);
/** O exercício usa carga (halter, barra, kettlebell, caneleira)? Então pede o peso. */
export function usesLoad(e: Exercicio): boolean {
  return e.equipamentos.length > 0 && e.equipamentos.every((op) => op.some((i) => LOAD_ITEMS.has(i)));
}

// ------------------------------------------------------------------ gravação

export async function startSession(db: SQLiteDatabase, workout: Workout, kind: WorkoutSessionRow['kind']): Promise<string> {
  return insertRow(db, 'workout_sessions', { kind, started_at: nowIso(), planned: JSON.stringify(workout) });
}

export async function logSet(
  db: SQLiteDatabase,
  sessionId: string,
  step: WorkStep,
  done: { reps: number | null; seconds: number | null; loadKg: number | null },
): Promise<void> {
  const p = step.prescription;
  await insertRow(db, 'set_logs', {
    session_id: sessionId,
    exercise_id: step.exerciseId,
    block_kind: step.blockKind === 'circuit' ? 'circuit' : 'sets',
    round: step.round,
    target_reps_min: p.kind === 'reps' ? p.min : null,
    target_reps_max: p.kind === 'reps' ? p.max : null,
    target_seconds: p.kind === 'time' ? p.seconds : null,
    reps: done.reps,
    seconds: done.seconds,
    load_kg: done.loadKg,
    performed_at: nowIso(),
  });
}

export async function finishSession(db: SQLiteDatabase, sessionId: string, startedAt: string): Promise<void> {
  const now = nowIso();
  const duration = Math.max(0, Math.round((Date.parse(now) - Date.parse(startedAt)) / 1000));
  await updateRow(db, 'workout_sessions', sessionId, { finished_at: now, duration_s: duration });
}

export async function setFeeling(db: SQLiteDatabase, sessionId: string, feeling: Feeling): Promise<void> {
  await updateRow(db, 'workout_sessions', sessionId, { feeling });
}

/** Última carga usada no exercício (para já vir preenchida). */
export async function lastLoad(db: SQLiteDatabase, exerciseId: string): Promise<number | null> {
  const r = await db.getFirstAsync<{ load_kg: number | null }>(
    `SELECT load_kg FROM set_logs
     WHERE deleted_at IS NULL AND exercise_id = ? AND load_kg IS NOT NULL
     ORDER BY performed_at DESC LIMIT 1`,
    [exerciseId],
  );
  return r?.load_kg ?? null;
}

/** Exercícios do último treino concluído (o gerador evita repetir). */
export async function lastWorkoutExerciseIds(db: SQLiteDatabase): Promise<string[]> {
  const s = await db.getFirstAsync<{ planned: string }>(
    `SELECT planned FROM workout_sessions
     WHERE deleted_at IS NULL AND finished_at IS NOT NULL
     ORDER BY finished_at DESC LIMIT 1`,
  );
  if (!s) return [];
  try {
    const w = JSON.parse(s.planned) as Workout;
    return w.blocks.flatMap((b) => (b.kind === 'sets' || b.kind === 'circuit' ? b.items.map((i) => i.exerciseId) : []));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ recordes

export type RecordKind = 'reps' | 'seconds' | 'load';
export type NewRecord = { exerciseId: string; kind: RecordKind; value: number; previous: number };

/**
 * Recordes batidos no treino: melhor série deste treino maior que a melhor de antes.
 * Carga vale mais que repetições quando o exercício usa peso. A primeira vez que o
 * exercício é feito não conta como recorde (não há com o que comparar).
 */
export async function recordsOf(db: SQLiteDatabase, sessionId: string): Promise<NewRecord[]> {
  const rows = await db.getAllAsync<SetLogRow>(
    'SELECT * FROM set_logs WHERE deleted_at IS NULL AND session_id = ?',
    [sessionId],
  );
  const best = (logs: Pick<SetLogRow, 'reps' | 'seconds' | 'load_kg'>[], kind: RecordKind) =>
    Math.max(0, ...logs.map((l) => (kind === 'load' ? l.load_kg : kind === 'reps' ? l.reps : l.seconds) ?? 0));
  const out: NewRecord[] = [];
  for (const exerciseId of [...new Set(rows.map((r) => r.exercise_id))]) {
    const e = getExercicio(exerciseId);
    if (!e) continue;
    const mine = rows.filter((r) => r.exercise_id === exerciseId);
    const before = await db.getAllAsync<Pick<SetLogRow, 'reps' | 'seconds' | 'load_kg'>>(
      'SELECT reps, seconds, load_kg FROM set_logs WHERE deleted_at IS NULL AND exercise_id = ? AND session_id <> ?',
      [exerciseId, sessionId],
    );
    if (before.length === 0) continue;
    const kinds: RecordKind[] = usesLoad(e) ? ['load', 'reps'] : mine.some((m) => m.seconds) ? ['seconds'] : ['reps'];
    for (const kind of kinds) {
      const now = best(mine, kind);
      const prev = best(before, kind);
      if (now > 0 && now > prev) {
        out.push({ exerciseId, kind, value: now, previous: prev });
        break; // um recorde por exercício
      }
    }
  }
  return out;
}

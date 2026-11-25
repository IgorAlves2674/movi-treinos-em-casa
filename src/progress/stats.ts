/**
 * Evolução (etapa 7, spec 8.3): sequência, recordes e gráficos por exercício.
 * As funções puras (sem banco) ficam separadas para dar para testar.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { getExercicio } from '@/content/exercises';
import { insertRow, updateRow } from '@/db/repository';
import type { BodyLog, MonthlyTestRow, SetLogRow } from '@/db/tables';
import { daysBetween, localDate } from '@/lib/dates';
import { usesLoad } from '@/workout/session';

// ------------------------------------------------------------------ sequência

export { streakOf, type Streak } from './streak';

/** Treinos concluídos (para a sequência). */
export const FINISHED_SQL = `SELECT finished_at FROM workout_sessions WHERE deleted_at IS NULL AND finished_at IS NOT NULL`;

// ------------------------------------------------------------------ por exercício

/** O que conta como "melhor" num exercício: carga, tempo ou repetições. */
export type Metric = 'load' | 'seconds' | 'reps';

export type LogLite = Pick<SetLogRow, 'session_id' | 'exercise_id' | 'reps' | 'seconds' | 'load_kg' | 'performed_at'>;

export function metricOf(exerciseId: string, logs: LogLite[]): Metric {
  const e = getExercicio(exerciseId);
  if (e && usesLoad(e) && logs.some((l) => (l.load_kg ?? 0) > 0)) return 'load';
  return logs.some((l) => (l.seconds ?? 0) > 0) ? 'seconds' : 'reps';
}

const valueOf = (l: LogLite, m: Metric) => (m === 'load' ? l.load_kg : m === 'seconds' ? l.seconds : l.reps) ?? 0;

export type Point = { date: string; value: number };
export type ExerciseProgress = {
  exerciseId: string;
  metric: Metric;
  /** Melhor série de cada treino, do mais antigo ao mais novo. */
  points: Point[];
  best: Point;
  /** Último treino que bateu a melhor marca de antes (a primeira vez não conta). */
  beaten: { at: Point; previous: number } | null;
};

/** Agrupa as séries por exercício: melhor de cada treino + melhor de todas (recorde). */
export function progressByExercise(logs: LogLite[]): ExerciseProgress[] {
  const byExercise = new Map<string, LogLite[]>();
  for (const l of logs) {
    const list = byExercise.get(l.exercise_id) ?? [];
    list.push(l);
    byExercise.set(l.exercise_id, list);
  }
  const out: ExerciseProgress[] = [];
  for (const [exerciseId, list] of byExercise) {
    const metric = metricOf(exerciseId, list);
    const bySession = new Map<string, Point>();
    for (const l of list) {
      const v = valueOf(l, metric);
      const cur = bySession.get(l.session_id);
      if (!cur || v > cur.value) bySession.set(l.session_id, { date: l.performed_at, value: v });
    }
    const points = [...bySession.values()].filter((p) => p.value > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (points.length === 0) continue;
    // Recorde: o primeiro treino que chegou no maior valor.
    const best = points.reduce((a, b) => (b.value > a.value ? b : a));
    let beaten: ExerciseProgress['beaten'] = null;
    let top = points[0].value;
    for (const pt of points.slice(1)) {
      if (pt.value > top) beaten = { at: pt, previous: top };
      top = Math.max(top, pt.value);
    }
    out.push({ exerciseId, metric, points, best, beaten });
  }
  // Recordes mais recentes primeiro.
  return out.sort((a, b) => b.best.date.localeCompare(a.best.date));
}

/** Recorde batido mais recente (para o Início). */
export function latestBeaten(progress: ExerciseProgress[]): ExerciseProgress | undefined {
  return progress
    .filter((p) => p.beaten)
    .sort((a, b) => b.beaten!.at.date.localeCompare(a.beaten!.at.date))[0];
}

/** Séries dos treinos concluídos (recordes e gráficos por exercício). */
export const SET_LOGS_SQL = `SELECT sl.session_id, sl.exercise_id, sl.reps, sl.seconds, sl.load_kg, sl.performed_at
  FROM set_logs sl JOIN workout_sessions ws ON ws.id = sl.session_id
  WHERE sl.deleted_at IS NULL AND ws.deleted_at IS NULL AND ws.finished_at IS NOT NULL`;

// ------------------------------------------------------------------ peso e medidas

export type BodyInput = { weight_kg: number | null; waist_cm: number | null; hip_cm: number | null; arm_cm: number | null };

export const BODY_LIMITS = {
  weight_kg: [20, 400],
  waist_cm: [20, 300],
  hip_cm: [20, 300],
  arm_cm: [5, 150],
} as const satisfies Record<keyof BodyInput, readonly [number, number]>;

/** Grava peso e medidas do dia. Se já houver registro hoje, atualiza só o que foi preenchido. */
export async function saveBodyLog(db: SQLiteDatabase, input: BodyInput, day: string = localDate()): Promise<void> {
  const filled = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null)) as Partial<BodyInput>;
  if (Object.keys(filled).length === 0) return;
  const existing = await db.getFirstAsync<BodyLog>(
    'SELECT * FROM body_logs WHERE deleted_at IS NULL AND logged_on = ? ORDER BY updated_at DESC LIMIT 1',
    [day],
  );
  if (existing) await updateRow(db, 'body_logs', existing.id, filled);
  else await insertRow(db, 'body_logs', { logged_on: day, ...input });
}

/** Último valor e o anterior de uma medida (para mostrar a diferença). */
export function lastTwo(logs: BodyLog[], key: keyof BodyInput): { last: number; previous: number | null } | null {
  const values = logs.filter((l) => l[key] !== null).sort((a, b) => a.logged_on.localeCompare(b.logged_on));
  if (values.length === 0) return null;
  const last = values[values.length - 1][key] as number;
  const previous = values.length > 1 ? (values[values.length - 2][key] as number) : null;
  return { last, previous };
}

// ------------------------------------------------------------------ teste mensal

/** Intervalo mínimo entre testes (cerca de um mês). */
export const TEST_INTERVAL_DAYS = 28;

export type TestResult = Pick<MonthlyTestRow, 'pushups' | 'squats_1min' | 'plank_s'>;

/** Dias até poder fazer o próximo teste (0 = já pode). */
export function daysUntilNextTest(last: MonthlyTestRow | undefined, today: string = localDate()): number {
  if (!last) return 0;
  return Math.max(0, TEST_INTERVAL_DAYS - daysBetween(last.tested_on, today));
}

export async function saveMonthlyTest(db: SQLiteDatabase, r: TestResult): Promise<string> {
  return insertRow(db, 'monthly_tests', { tested_on: localDate(), ...r });
}

/**
 * Plano semanal (etapa 8, spec 7.1) e preparação do treino com a progressão.
 *
 * O plano tem um treino por dia de treino do perfil (ex.: 3 dias → treinos 1, 2 e 3).
 * Não fica preso a dias da semana: o "Treino de hoje" é sempre o próximo que falta,
 * e a semana recomeça na segunda.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { insertRow, updateRow } from '@/db/repository';
import type { Feeling, ProfileRow, WeeklyPlanRow } from '@/db/tables';
import { daysBetween, localDate, weekStart } from '@/lib/dates';

import { generateWeek, type GeneratorProfile, type Workout } from './generator';
import { applyProgression, type ExerciseSession, type History, type LoggedSet } from './progression';
import { lastWorkoutExerciseIds } from './session';

/** O que do perfil muda o plano. Se mudar, o plano da semana é refeito. */
export function profileKey(p: ProfileRow): string {
  return JSON.stringify([
    p.days_per_week,
    p.minutes_per_session,
    p.level,
    p.goal,
    p.equipment,
    p.avoid_jumps_noise,
    p.avoid_impact,
    p.rest_sets_s,
    p.rest_circuit_exercise_s,
    p.rest_circuit_round_s,
  ]);
}

/** Plano desta semana (o mais recente, se houver dois de celulares diferentes). */
export const WEEK_PLAN_SQL = `SELECT * FROM weekly_plans WHERE deleted_at IS NULL AND week_start = ?
  ORDER BY updated_at DESC LIMIT 1`;

/** Treinos do plano concluídos a partir de um dia (a semana). */
export const PLAN_DONE_SQL = `SELECT finished_at FROM workout_sessions
  WHERE deleted_at IS NULL AND kind = 'plano' AND finished_at IS NOT NULL AND finished_at >= ?`;

/** Início da semana (segunda, 00:00 local) em ISO, para comparar com `finished_at`. */
export function weekStartIso(day: string = localDate()): string {
  const [y, m, d] = weekStart(day).split('-').map(Number);
  return new Date(y, m - 1, d).toISOString();
}

export function parsePlan(row: WeeklyPlanRow | undefined): Workout[] {
  if (!row) return [];
  try {
    return JSON.parse(row.workouts) as Workout[];
  } catch {
    return [];
  }
}

/**
 * Garante o plano desta semana: monta se não existe ou se o perfil mudou.
 * Os treinos da semana evitam o último treino feito.
 */
export async function ensureWeekPlan(db: SQLiteDatabase, profile: ProfileRow, gp: GeneratorProfile): Promise<void> {
  const week = weekStart(localDate());
  const key = profileKey(profile);
  const existing = await db.getFirstAsync<WeeklyPlanRow>(WEEK_PLAN_SQL, [week]);
  if (existing && existing.profile_key === key && parsePlan(existing).length > 0) return;
  const days = Math.max(1, Math.min(7, profile.days_per_week));
  const workouts = generateWeek(gp, days, { avoidIds: await lastWorkoutExerciseIds(db) });
  const values = { week_start: week, profile_key: key, workouts: JSON.stringify(workouts) };
  if (existing) await updateRow(db, 'weekly_plans', existing.id, values);
  else await insertRow(db, 'weekly_plans', values);
}

// ---------------------------------------------------------------- progressão

/** Histórico das séries dos treinos concluídos, por exercício (mais novo primeiro). */
export async function loadHistory(db: SQLiteDatabase): Promise<History> {
  const rows = await db.getAllAsync<LoggedSet & { session_id: string; exercise_id: string; finished_at: string }>(
    `SELECT sl.session_id, sl.exercise_id, sl.round, sl.reps, sl.seconds, sl.load_kg,
            sl.target_reps_min, sl.target_reps_max, sl.target_seconds, ws.finished_at
     FROM set_logs sl JOIN workout_sessions ws ON ws.id = sl.session_id
     WHERE sl.deleted_at IS NULL AND ws.deleted_at IS NULL AND ws.finished_at IS NOT NULL
     ORDER BY ws.finished_at DESC, sl.round`,
  );
  const history: History = new Map();
  const bySession = new Map<string, ExerciseSession>();
  for (const r of rows) {
    const key = `${r.exercise_id}|${r.session_id}`;
    let s = bySession.get(key);
    if (!s) {
      s = { exerciseId: r.exercise_id, finishedAt: r.finished_at, sets: [] };
      bySession.set(key, s);
      history.set(r.exercise_id, [...(history.get(r.exercise_id) ?? []), s]);
    }
    s.sets.push(r);
  }
  return history;
}

/** "Como foi?" do último treino, se foi na última semana. */
async function lastFeeling(db: SQLiteDatabase): Promise<Feeling | null> {
  const r = await db.getFirstAsync<{ feeling: Feeling | null; finished_at: string }>(
    `SELECT feeling, finished_at FROM workout_sessions
     WHERE deleted_at IS NULL AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`,
  );
  if (!r?.feeling) return null;
  return daysBetween(localDate(new Date(r.finished_at)), localDate()) <= 7 ? r.feeling : null;
}

/** Treino pronto para começar: aplica a progressão e o "Como foi?" do último treino. */
export async function prepareWorkout(db: SQLiteDatabase, workout: Workout, gp: GeneratorProfile): Promise<Workout> {
  return applyProgression(workout, await loadHistory(db), gp, await lastFeeling(db));
}

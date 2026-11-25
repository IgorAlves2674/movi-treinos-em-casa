/**
 * Editar o perfil (etapa 9, spec seção 3). Cada parte do perfil é editada numa
 * tela, reaproveitando as perguntas do onboarding. Mudar o perfil refaz o plano
 * da semana (ver `profileKey`).
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Equipamento } from '@/content/exercises/types';
import { updateRow } from '@/db/repository';
import type { ProfileRow } from '@/db/tables';
import { REST, type RestTimes } from '@/workout/generator';

import { EMPTY_ANSWERS, inRange, isStepValid, LIMITS, parseNumber, type OnboardingAnswers } from './onboarding';

export const SECTIONS = ['data', 'goal', 'level', 'routine', 'restrictions', 'equipment', 'rest'] as const;
export type Section = (typeof SECTIONS)[number];
export const isSection = (x: unknown): x is Section => SECTIONS.includes(x as Section);

const numText = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

/** Respostas a partir do perfil salvo (o peso fica na Evolução, não aqui). */
export function answersFromProfile(p: ProfileRow): OnboardingAnswers {
  let equipment: Equipamento[] = [];
  try {
    equipment = JSON.parse(p.equipment) as Equipamento[];
  } catch {
    equipment = [];
  }
  return {
    ...EMPTY_ANSWERS,
    name: p.name,
    age: String(p.age),
    height: numText(p.height_cm),
    sex: p.sex,
    goal: p.goal,
    level: p.level,
    daysPerWeek: p.days_per_week,
    minutesPerSession: p.minutes_per_session,
    avoidJumpsNoise: p.avoid_jumps_noise === 1,
    avoidImpact: p.avoid_impact === 1,
    equipment,
    dumbbellMaxKg: numText(p.dumbbell_max_kg),
    barbellMaxKg: numText(p.barbell_max_kg),
  };
}

/** A parte pode ser salva? */
export function isSectionValid(section: Exclude<Section, 'rest'>, a: OnboardingAnswers): boolean {
  if (section === 'data') {
    const age = parseNumber(a.age);
    return (
      a.name.trim().length > 0 &&
      inRange(age, LIMITS.age) &&
      Number.isInteger(age) &&
      inRange(parseNumber(a.height), LIMITS.height)
    );
  }
  return isStepValid(section, a);
}

/** Campos do perfil que cada parte muda. */
function patchFor(section: Exclude<Section, 'rest'>, a: OnboardingAnswers): Record<string, string | number | null> {
  const kg = (text: string, item: Equipamento) => (a.equipment.includes(item) ? parseNumber(text) : null);
  switch (section) {
    case 'data':
      return { name: a.name.trim(), age: parseNumber(a.age)!, height_cm: parseNumber(a.height)!, sex: a.sex };
    case 'goal':
      return { goal: a.goal! };
    case 'level':
      return { level: a.level! };
    case 'routine':
      return { days_per_week: a.daysPerWeek, minutes_per_session: a.minutesPerSession };
    case 'restrictions':
      return { avoid_jumps_noise: a.avoidJumpsNoise ? 1 : 0, avoid_impact: a.avoidImpact ? 1 : 0 };
    case 'equipment':
      return {
        equipment: JSON.stringify(a.equipment),
        dumbbell_max_kg: kg(a.dumbbellMaxKg, 'halteres'),
        barbell_max_kg: kg(a.barbellMaxKg, 'barra_anilhas'),
      };
  }
}

export async function saveSection(
  db: SQLiteDatabase,
  profile: ProfileRow,
  section: Exclude<Section, 'rest'>,
  a: OnboardingAnswers,
): Promise<void> {
  if (!isSectionValid(section, a)) throw new Error('Dados inválidos');
  await updateRow(db, 'profiles', profile.id, patchFor(section, a));
}

// ---------------------------------------------------------------- descanso

/** Descanso que vale hoje (o escolhido ou o padrão do nível). */
export function restOf(p: ProfileRow): RestTimes {
  const d = REST[p.level];
  return {
    sets: p.rest_sets_s ?? d.sets,
    circuitExercise: p.rest_circuit_exercise_s ?? d.circuitExercise,
    circuitRound: p.rest_circuit_round_s ?? d.circuitRound,
  };
}

/** Grava o descanso. O que for igual ao padrão do nível fica vazio (acompanha se o nível mudar). */
export async function saveRest(db: SQLiteDatabase, p: ProfileRow, r: RestTimes): Promise<void> {
  const d = REST[p.level];
  await updateRow(db, 'profiles', p.id, {
    rest_sets_s: r.sets === d.sets ? null : r.sets,
    rest_circuit_exercise_s: r.circuitExercise === d.circuitExercise ? null : r.circuitExercise,
    rest_circuit_round_s: r.circuitRound === d.circuitRound ? null : r.circuitRound,
  });
}

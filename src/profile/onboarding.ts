import type { SQLiteDatabase } from 'expo-sqlite';

import type { Equipamento } from '@/content/exercises/types';
import { insertRow, nowIso } from '@/db/repository';
import type { Goal, Level, Sex } from '@/db/tables';

/**
 * Respostas do onboarding (spec seção 4). Ficam só na memória enquanto a pessoa
 * responde; são gravadas de uma vez no fim, depois do consentimento.
 * Os campos numéricos guardam o texto digitado (ex.: "72,5").
 */
export type OnboardingAnswers = {
  name: string;
  age: string;
  weight: string;
  height: string;
  sex: Sex | null;
  goal: Goal | null;
  level: Level | null;
  daysPerWeek: number;
  minutesPerSession: 15 | 30 | 45 | 60;
  avoidJumpsNoise: boolean;
  avoidImpact: boolean;
  equipment: Equipamento[];
  dumbbellMaxKg: string;
  barbellMaxKg: string;
  healthAck: boolean;
  healthDataConsent: boolean;
};

export const EMPTY_ANSWERS: OnboardingAnswers = {
  name: '',
  age: '',
  weight: '',
  height: '',
  sex: null,
  goal: null,
  level: null,
  daysPerWeek: 3,
  minutesPerSession: 30,
  avoidJumpsNoise: false,
  avoidImpact: false,
  equipment: [],
  dumbbellMaxKg: '',
  barbellMaxKg: '',
  healthAck: false,
  healthDataConsent: false,
};

export const MIN_AGE = 18;
export const LIMITS = {
  age: [MIN_AGE, 100],
  weight: [30, 300],
  height: [120, 230],
  dumbbell: [0.5, 100],
  barbell: [1, 400],
} as const;

/** Lê número digitado com vírgula ou ponto. Vazio ou inválido = null. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export const inRange = (n: number | null, [min, max]: readonly [number, number]) =>
  n !== null && n >= min && n <= max;

/** Idade digitada, mas abaixo do mínimo (para mostrar o aviso dos 18 anos). */
export function isUnderage(a: OnboardingAnswers): boolean {
  const n = parseNumber(a.age);
  return n !== null && n < MIN_AGE;
}

export const STEPS = ['name', 'data', 'goal', 'level', 'routine', 'restrictions', 'equipment', 'consent'] as const;
export type Step = (typeof STEPS)[number];

/** A tela pode avançar? */
export function isStepValid(step: Step, a: OnboardingAnswers): boolean {
  switch (step) {
    case 'name':
      return a.name.trim().length > 0;
    case 'data':
      return (
        inRange(parseNumber(a.age), LIMITS.age) &&
        Number.isInteger(parseNumber(a.age)) &&
        inRange(parseNumber(a.weight), LIMITS.weight) &&
        inRange(parseNumber(a.height), LIMITS.height)
      );
    case 'goal':
      return a.goal !== null;
    case 'level':
      return a.level !== null;
    case 'routine':
    case 'restrictions':
      return true;
    case 'equipment':
      return (
        (!a.equipment.includes('halteres') || inRange(parseNumber(a.dumbbellMaxKg), LIMITS.dumbbell)) &&
        (!a.equipment.includes('barra_anilhas') || inRange(parseNumber(a.barbellMaxKg), LIMITS.barbell))
      );
    case 'consent':
      return a.healthAck && a.healthDataConsent;
  }
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Grava o perfil e o primeiro peso. Só é chamado com todas as telas válidas,
 * inclusive o consentimento dos dados de saúde.
 */
export async function saveOnboarding(db: SQLiteDatabase, a: OnboardingAnswers): Promise<void> {
  if (!STEPS.every((s) => isStepValid(s, a))) throw new Error('Onboarding incompleto');
  const now = nowIso();
  const kg = (text: string, item: Equipamento) => (a.equipment.includes(item) ? parseNumber(text) : null);
  await db.withTransactionAsync(async () => {
    await insertRow(db, 'profiles', {
      name: a.name.trim(),
      age: parseNumber(a.age)!,
      height_cm: parseNumber(a.height)!,
      sex: a.sex,
      goal: a.goal!,
      level: a.level!,
      days_per_week: a.daysPerWeek,
      minutes_per_session: a.minutesPerSession,
      avoid_jumps_noise: a.avoidJumpsNoise ? 1 : 0,
      avoid_impact: a.avoidImpact ? 1 : 0,
      equipment: JSON.stringify(a.equipment),
      dumbbell_max_kg: kg(a.dumbbellMaxKg, 'halteres'),
      barbell_max_kg: kg(a.barbellMaxKg, 'barra_anilhas'),
      health_ack_at: now,
      health_data_consent_at: now,
      onboarding_completed_at: now,
    });
    await insertRow(db, 'body_logs', { logged_on: localDate(new Date()), weight_kg: parseNumber(a.weight)! });
  });
}

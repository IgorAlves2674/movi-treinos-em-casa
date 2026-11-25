import type { Equipamento } from '@/content/exercises/types';
import type { ProfileRow } from '@/db/tables';

import type { GeneratorProfile } from './generator';

/** Converte o perfil salvo (SQLite) no que o gerador precisa. */
export function generatorProfile(p: ProfileRow): GeneratorProfile {
  let equipment: Equipamento[] = [];
  try {
    equipment = JSON.parse(p.equipment) as Equipamento[];
  } catch {
    equipment = [];
  }
  return {
    level: p.level,
    goal: p.goal,
    minutes: p.minutes_per_session,
    equipment,
    avoidJumpsNoise: p.avoid_jumps_noise === 1,
    avoidImpact: p.avoid_impact === 1,
    dumbbellMaxKg: p.dumbbell_max_kg,
    barbellMaxKg: p.barbell_max_kg,
    rest: {
      ...(p.rest_sets_s != null ? { sets: p.rest_sets_s } : {}),
      ...(p.rest_circuit_exercise_s != null ? { circuitExercise: p.rest_circuit_exercise_s } : {}),
      ...(p.rest_circuit_round_s != null ? { circuitRound: p.rest_circuit_round_s } : {}),
    },
  };
}

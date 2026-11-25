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
  };
}

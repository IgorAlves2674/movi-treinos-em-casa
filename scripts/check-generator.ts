/// <reference types="node" />
/**
 * Confere o gerador de treino em muitas combinações de perfil e grupos.
 * Uso: npm run check:generator   (com "-- exemplo" imprime um treino de exemplo)
 */
import { getExercicio } from '../src/content/exercises';
import type { Equipamento } from '../src/content/exercises/types';
import type { Goal, Level } from '../src/db/tables';
import {
  FOCUS_GROUPS,
  generateWorkout,
  hasEquipment,
  respectsRestrictions,
  swapExercise,
  type FocusGroup,
  type GeneratorProfile,
  type Workout,
} from '../src/workout/generator';

/** Sorteio repetível (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEVELS: Level[] = ['iniciante', 'intermediario', 'avancado'];
const GOALS: Goal[] = ['emagrecer', 'forca', 'condicionamento', 'manter'];
const MINUTES = [15, 30, 45, 60] as const;
const KITS: Equipamento[][] = [[], ['halteres'], ['halteres', 'barra_fixa', 'elastico_alca'], ['barra_anilhas', 'kettlebell', 'corda', 'esteira']];
const FOCI: FocusGroup[][] = [...FOCUS_GROUPS.map((g) => [g]), ['peito', 'costas'], ['pernas', 'abdomen'], ['bracos', 'ombros', 'cardio']];

const erros: string[] = [];
let total = 0;
let curtos = 0;
const diffs: number[] = [];

function check(w: Workout, p: GeneratorProfile, label: string) {
  const err = (m: string) => erros.push(`${label}: ${m}`);
  const ids = w.blocks.flatMap((b) => b.items.map((i) => i.exerciseId));
  if (new Set(ids).size !== ids.length) err('exercício repetido no treino');
  for (const b of w.blocks) {
    for (const it of b.items) {
      const e = getExercicio(it.exerciseId);
      if (!e) return err(`exercício inexistente ${it.exerciseId}`);
      if (!hasEquipment(e, p.equipment)) err(`${e.id} sem equipamento`);
      if (!respectsRestrictions(e, p)) err(`${e.id} desrespeita restrição`);
    }
    if (b.kind === 'circuit' && (b.items.length < 2 || b.items.length > 5)) err(`circuito com ${b.items.length} exercícios`);
    if (b.kind === 'cooldown' && (b.items.length < 4 || b.items.length > 6)) err(`${b.items.length} alongamentos`);
    if (b.kind === 'warmup' && b.items.length < 3) err('aquecimento curto');
  }
  const mainCount = w.blocks.filter((b) => b.kind === 'sets' || b.kind === 'circuit').flatMap((b) => b.items).length;
  if (mainCount < 2) err(`só ${mainCount} exercícios na parte principal`);
  const diff = w.estimatedMinutes - p.minutes;
  diffs.push(diff);
  // Mais curto só é aceito com o aviso de poucos exercícios; mais longo, nunca.
  const tooShort = diff < -Math.max(6, p.minutes * 0.25) && !w.warnings.includes('poucosExercicios');
  if (tooShort || diff > Math.max(6, p.minutes * 0.25)) err(`duração ${w.estimatedMinutes} min para ${p.minutes} min`);
  if (w.warnings.includes('poucosExercicios')) curtos++;
}

let seed = 1;
for (const level of LEVELS)
  for (const goal of GOALS)
    for (const minutes of MINUTES)
      for (const equipment of KITS)
        for (const [avoidJumpsNoise, avoidImpact] of [
          [false, false],
          [true, true],
        ])
          for (const focus of FOCI) {
            const p: GeneratorProfile = { level, goal, minutes, equipment, avoidJumpsNoise, avoidImpact };
            const rng = seeded(seed++);
            const w = generateWorkout(focus, p, { rng });
            const label = `${level}/${goal}/${minutes}min/[${equipment.join(',')}]/${avoidJumpsNoise ? 'apto' : '-'}/${focus.join('+')}`;
            check(w, p, label);
            // Trocar não pode quebrar as regras.
            const bi = w.blocks.findIndex((b) => b.kind === 'sets' || b.kind === 'circuit');
            if (bi >= 0) check(swapExercise(w, bi, 0, p, rng), p, label + ' (trocado)');
            total++;
          }

if (process.argv.includes('exemplo')) {
  const p: GeneratorProfile = { level: 'intermediario', goal: 'forca', minutes: 45, equipment: ['halteres', 'elastico_alca'], avoidJumpsNoise: true, avoidImpact: false };
  const w = generateWorkout(['corpo_inteiro'], p, { rng: seeded(42) });
  console.log(`Exemplo (${w.estimatedMinutes} min):`);
  for (const b of w.blocks) {
    console.log(`  [${b.kind}${b.kind === 'sets' ? ` ${b.sets}x` : b.kind === 'circuit' ? ` ${b.rounds} voltas` : ''}]`);
    for (const it of b.items) console.log(`    ${getExercicio(it.exerciseId)!.nome} · ${JSON.stringify(it.prescription)}`);
  }
}

const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
const worst = Math.max(...diffs.map(Math.abs));
if (erros.length) {
  console.error(`✖ ${erros.length} problema(s) em ${total} treinos:`);
  for (const e of erros.slice(0, process.argv.includes("tudo") ? erros.length : 40)) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `✔ ${total} treinos gerados sem problema (duração: diferença média ${avg.toFixed(1)} min, pior ${worst} min; ${curtos} mais curtos por falta de exercícios, com aviso).`,
);

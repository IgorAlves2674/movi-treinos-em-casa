/**
 * Confere a progressão automática (spec 8.1) com situações de exemplo.
 * Roda com `npm run check:progression`.
 */
import type { GeneratorProfile, Workout, WorkoutItem } from '../src/workout/generator';
import { applyProgression, progressItem, verdictOf, type ExerciseSession, type History, type LoggedSet } from '../src/workout/progression';

const p: GeneratorProfile = {
  level: 'intermediario',
  goal: 'manter',
  minutes: 30,
  equipment: ['halteres'],
  avoidJumpsNoise: false,
  avoidImpact: false,
  dumbbellMaxKg: 12,
  barbellMaxKg: null,
};

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) {
    failures++;
    console.log(`✘ ${name}`, detail ?? '');
  } else console.log(`✔ ${name}`);
}

const reps = (n: number, min = 10, max = 12, load: number | null = null): LoggedSet[] =>
  [1, 2, 3].map((round) => ({
    round,
    reps: n,
    seconds: null,
    load_kg: load,
    target_reps_min: min,
    target_reps_max: max,
    target_seconds: null,
  }));
const timed = (sec: number, target: number): LoggedSet[] =>
  [1, 2, 3].map((round) => ({
    round,
    reps: null,
    seconds: sec,
    load_kg: null,
    target_reps_min: null,
    target_reps_max: null,
    target_seconds: target,
  }));
const sess = (exerciseId: string, day: number, sets: LoggedSet[]): ExerciseSession => ({
  exerciseId,
  finishedAt: `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`,
  sets,
});
const hist = (...s: ExerciseSession[]): History => {
  const h: History = new Map();
  for (const x of [...s].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))) {
    h.set(x.exerciseId, [...(h.get(x.exerciseId) ?? []), x]);
  }
  return h;
};
const item = (exerciseId: string, min = 10, max = 12): WorkoutItem => ({
  slot: 'empurrar',
  exerciseId,
  prescription: { kind: 'reps', min, max, perSide: false },
});

// Veredito
check('1 treino só: mantém', verdictOf([sess('flexao_joelhos', 20, reps(12))]) === 'keep');
check('topo 2x seguidas: sobe', verdictOf([sess('flexao_joelhos', 22, reps(12)), sess('flexao_joelhos', 20, reps(12))]) === 'up');
check('topo só no último: mantém', verdictOf([sess('flexao_joelhos', 22, reps(12)), sess('flexao_joelhos', 20, reps(11))]) === 'keep');
check('abaixo do mínimo 2x: desce', verdictOf([sess('flexao_joelhos', 22, reps(7)), sess('flexao_joelhos', 20, reps(8))]) === 'down');
check(
  'topo 2x mas metas diferentes: mantém',
  verdictOf([sess('flexao_joelhos', 22, reps(14, 12, 14)), sess('flexao_joelhos', 20, reps(12))]) === 'keep',
);

// Subir: variação mais difícil
let r = progressItem(item('flexao_joelhos'), 3, hist(sess('flexao_joelhos', 22, reps(12)), sess('flexao_joelhos', 20, reps(12))), p);
check('flexão no joelho → flexão', r.exerciseId === 'flexao_padrao' && r.progress === 'harder', r);

// Família: o plano sorteou a variação fácil, mas a pessoa já está na difícil
r = progressItem(item('flexao_joelhos'), 3, hist(sess('flexao_padrao', 22, reps(11)), sess('flexao_joelhos', 15, reps(12))), p);
check('usa a variação em que a pessoa está', r.exerciseId === 'flexao_padrao' && !r.progress, r);

// Descer: variação mais fácil
r = progressItem(item('flexao_padrao'), 3, hist(sess('flexao_padrao', 22, reps(6)), sess('flexao_padrao', 20, reps(7))), p);
check('flexão → no joelho', r.exerciseId === 'flexao_joelhos' && r.progress === 'easier', r);

// Carga: rosca concentrada não tem variação mais difícil; sobe 1 kg
r = progressItem(item('rosca_concentrada'), 3, hist(sess('rosca_concentrada', 22, reps(12, 10, 12, 8)), sess('rosca_concentrada', 20, reps(12, 10, 12, 8))), p);
check('mais carga (8 → 9 kg)', r.prescription.kind === 'reps' && r.prescription.loadKg === 9 && r.progress === 'moreLoad', r);

// Carga no máximo: mais séries
r = progressItem(item('rosca_concentrada'), 3, hist(sess('rosca_concentrada', 22, reps(12, 10, 12, 12)), sess('rosca_concentrada', 20, reps(12, 10, 12, 12))), p);
check('carga no máximo → +1 série', r.extraSets === 1 && r.progress === 'moreSets', r);

// No circuito (sem séries): mais repetições
r = progressItem(item('rosca_concentrada'), null, hist(sess('rosca_concentrada', 22, reps(12, 10, 12, 12)), sess('rosca_concentrada', 20, reps(12, 10, 12, 12))), p);
check('circuito → +2 repetições', r.prescription.kind === 'reps' && r.prescription.min === 12 && r.progress === 'moreReps', r);

// Mantém as metas do último treino (sem regredir para o padrão)
r = progressItem(item('rosca_concentrada'), 3, hist(sess('rosca_concentrada', 22, reps(11, 12, 14, 9))), p);
check(
  'mantém as metas e a carga do último treino',
  r.prescription.kind === 'reps' && r.prescription.min === 12 && r.prescription.loadKg === 9 && !r.progress,
  r,
);

// Tempo: prancha lateral não tem variação mais difícil → +5 s
const plank: WorkoutItem = { slot: 'core', exerciseId: 'prancha_lateral', prescription: { kind: 'time', seconds: 40, perSide: true } };
r = progressItem(plank, null, hist(sess('prancha_lateral', 22, timed(40, 40)), sess('prancha_lateral', 20, timed(40, 40))), p);
check('prancha lateral +5 s', r.prescription.kind === 'time' && r.prescription.seconds === 45 && r.progress === 'moreTime', r);

// Restrição: polichinelo sem salto → polichinelo não sobe para quem evita impacto
const noImpact = { ...p, avoidImpact: true, avoidJumpsNoise: true };
const jj: WorkoutItem = { slot: 'cardio', exerciseId: 'polichinelo_sem_salto', prescription: { kind: 'time', seconds: 40, perSide: false } };
r = progressItem(jj, null, hist(sess('polichinelo_sem_salto', 22, timed(40, 40)), sess('polichinelo_sem_salto', 20, timed(40, 40))), noImpact);
check('respeita "evitar impacto"', r.exerciseId === 'polichinelo_sem_salto' && r.progress === 'moreTime', r);

// "Como foi?"
const w: Workout = {
  blocks: [{ kind: 'sets', sets: 3, restBetweenSetsS: 60, items: [item('flexao_padrao')] }],
  estimatedMinutes: 5,
  warnings: [],
};
const heavy = applyProgression(w, new Map(), p, 'pesado');
check('Pesado: uma série a menos', heavy.blocks[0].kind === 'sets' && heavy.blocks[0].sets === 2);
const easy = applyProgression(w, new Map(), p, 'facil');
const easyPr = easy.blocks[0].items[0].prescription;
check('Fácil: metas +2', easyPr.kind === 'reps' && easyPr.min === 12 && easyPr.max === 14, easyPr);

if (failures > 0) {
  console.log(`\n${failures} problema(s).`);
  process.exit(1);
}
console.log('\n✔ Progressão conferida.');

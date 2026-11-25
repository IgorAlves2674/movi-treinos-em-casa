/**
 * Gerador de treino (spec seção 7), só com regras (sem IA). Todo treino é de
 * corpo inteiro (decisão de 25/11/2026): não existe escolha de grupo muscular.
 *
 * 1. Filtra os exercícios por equipamento, nível e restrições.
 * 2. Monta as vagas por padrão de movimento (pernas, empurrar, puxar, quadril, core,
 *    cardio + extras sorteados), variando de um treino para o outro.
 * 3. Sorteia um exercício por vaga, sem repetir e evitando o último treino.
 * 4. Define o formato (séries ou circuito) pelo objetivo e o descanso pelo nível.
 * 5. Acrescenta aquecimento e alongamento.
 * 6. Ajusta ao tempo disponível.
 * 7. Ordena por posição (em pé → sentado → chão) dentro de cada bloco.
 *
 * Funções puras: recebem um `rng` (0..1) para dar para testar com sorteio fixo.
 */
import {
  EQUIPAMENTOS_SEMPRE_DISPONIVEIS,
  EXERCICIOS,
  getExercicio,
  type Equipamento,
  type Exercicio,
  type Musculo,
  type Posicao,
} from '@/content/exercises';
import type { Goal, Level } from '@/db/tables';

/** O que o gerador precisa saber da pessoa (vem do perfil do onboarding). */
export type GeneratorProfile = {
  level: Level;
  goal: Goal;
  minutes: 15 | 30 | 45 | 60;
  equipment: Equipamento[];
  avoidJumpsNoise: boolean;
  avoidImpact: boolean;
};

export type Prescription =
  | { kind: 'reps'; min: number; max: number; perSide: boolean }
  | { kind: 'time'; seconds: number; perSide: boolean };

export type WorkoutItem = { slot: SlotId; exerciseId: string; prescription: Prescription };

export type WorkoutBlock =
  | { kind: 'warmup'; items: WorkoutItem[] }
  | { kind: 'sets'; sets: number; restBetweenSetsS: number; items: WorkoutItem[] }
  | { kind: 'circuit'; rounds: number; restBetweenExercisesS: number; restBetweenRoundsS: number; items: WorkoutItem[] }
  | { kind: 'cooldown'; items: WorkoutItem[] };

export type WorkoutWarning = 'semEquipamentoPuxar' | 'poucosExercicios';

export type Workout = {
  blocks: WorkoutBlock[];
  estimatedMinutes: number;
  warnings: WorkoutWarning[];
};

// ---------------------------------------------------------------- vagas

const main = (e: Exercicio) => e.padrao_movimento !== 'mobilidade' && e.padrao_movimento !== 'alongamento';
const principal = (...m: Musculo[]) => (e: Exercicio) => main(e) && m.includes(e.musculo_principal);

/** Cada vaga diz que exercícios podem ocupá-la. */
export const SLOTS = {
  /** Agachar ou avanço (sem os de panturrilha). */
  pernas: (e: Exercicio) =>
    (e.padrao_movimento === 'agachar' || e.padrao_movimento === 'avanco') && e.musculo_principal !== 'panturrilhas',
  agachar: (e: Exercicio) => e.padrao_movimento === 'agachar' && e.musculo_principal !== 'panturrilhas',
  empurrar: (e: Exercicio) => e.padrao_movimento === 'empurrar',
  puxar: (e: Exercicio) =>
    e.padrao_movimento === 'puxar' && ['dorsais', 'trapezio', 'deltoide_posterior'].includes(e.musculo_principal),
  /** Dobradiça de quadril ou glúteo. */
  quadril: (e: Exercicio) => e.padrao_movimento === 'dobradica_quadril' || principal('gluteos')(e),
  core: (e: Exercicio) => e.padrao_movimento === 'core',
  cardio: (e: Exercicio) => e.padrao_movimento === 'cardio',
  ombro: (e: Exercicio) =>
    main(e) && ['deltoide_anterior', 'deltoide_lateral', 'deltoide_posterior'].includes(e.musculo_principal),
  bracos: principal('biceps', 'triceps'),
  panturrilha: principal('panturrilhas'),
  // Sem equipamento para puxar (spec 5.3): fortalecer as costas pela lombar.
  costas_sem_equipamento: (e: Exercicio) => main(e) && e.musculo_principal === 'lombar',
} satisfies Record<string, (e: Exercicio) => boolean>;
export type SlotId = keyof typeof SLOTS | 'aquecimento' | 'alongamento';
type Slot = keyof typeof SLOTS;

/** Padrões que todo treino tenta cobrir (os treinos curtos sorteiam alguns deles). */
const BASE_SLOTS: Slot[] = ['pernas', 'empurrar', 'puxar', 'quadril', 'core', 'cardio'];
/** Vagas extras dos treinos mais longos, sorteadas a cada treino para variar. */
const EXTRA_SLOTS: Slot[] = ['pernas', 'empurrar', 'puxar', 'ombro', 'bracos', 'core', 'quadril', 'panturrilha', 'cardio'];

/** Quando a vaga não tem exercício disponível, tenta estas (na ordem). */
const SLOT_FALLBACK: Partial<Record<Slot, Slot[]>> = {
  pernas: ['quadril'],
  quadril: ['pernas', 'costas_sem_equipamento'],
  puxar: ['costas_sem_equipamento'],
  ombro: ['empurrar', 'puxar'],
  bracos: ['empurrar', 'puxar'],
  panturrilha: ['pernas'],
  cardio: ['pernas', 'core'],
  empurrar: ['ombro'],
};

/** Quantos exercícios na parte principal, pelo tempo do treino. */
const MAIN_COUNT: Record<GeneratorProfile['minutes'], number> = { 15: 3, 30: 5, 45: 7, 60: 9 };

// ---------------------------------------------------------------- filtros

const MAX_LEVEL: Record<Level, number> = { iniciante: 2, intermediario: 3, avancado: 5 };
const TARGET_LEVEL: Record<Level, number> = { iniciante: 1.3, intermediario: 2.5, avancado: 3.5 };

/** A pessoa tem o equipamento de pelo menos uma das opções do exercício? */
export function hasEquipment(e: Exercicio, equipment: readonly Equipamento[]): boolean {
  const have = new Set<Equipamento>([...equipment, ...EQUIPAMENTOS_SEMPRE_DISPONIVEIS]);
  return e.equipamentos.some((opcao) => opcao.every((item) => have.has(item)));
}

/** Respeita as restrições do onboarding (apartamento, impacto). */
export function respectsRestrictions(e: Exercicio, p: Pick<GeneratorProfile, 'avoidJumpsNoise' | 'avoidImpact'>): boolean {
  if (p.avoidJumpsNoise && (e.barulho !== 'baixo' || e.impacto === 'alto')) return false;
  if (p.avoidImpact && e.impacto !== 'baixo') return false;
  return true;
}

export function isAllowed(e: Exercicio, p: GeneratorProfile): boolean {
  return e.nivel <= MAX_LEVEL[p.level] && hasEquipment(e, p.equipment) && respectsRestrictions(e, p);
}

// ---------------------------------------------------------------- sorteio

type Rng = () => number;

function pickWeighted<T>(items: T[], weight: (t: T) => number, rng: Rng): T | undefined {
  const total = items.reduce((s, t) => s + weight(t), 0);
  if (items.length === 0 || total <= 0) return undefined;
  let x = rng() * total;
  for (const t of items) {
    x -= weight(t);
    if (x <= 0) return t;
  }
  return items[items.length - 1];
}

/**
 * Família de variações: todos os exercícios ligados por "mais fácil/mais difícil",
 * mesmo indiretamente (flexão na parede → inclinada → joelhos → flexão → declinada).
 */
const FAMILY = (() => {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const px = parent.get(x) ?? x;
    if (px === x) return x;
    const root = find(px);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  for (const e of EXERCICIOS) {
    if (e.variacao_mais_facil) union(e.id, e.variacao_mais_facil);
    if (e.variacao_mais_dificil) union(e.id, e.variacao_mais_dificil);
  }
  return (id: string) => find(id);
})();

/** Quantos dos já escolhidos são da mesma família de variações deste exercício. */
function familyCount(e: Exercicio, chosen: ReadonlySet<string>): number {
  const fam = FAMILY(e.id);
  let n = 0;
  for (const id of chosen) if (id !== e.id && FAMILY(id) === fam) n++;
  return n;
}
/** Já há 2 da mesma família no treino (ex.: duas flexões): uma terceira fica de fora. */
const isVariationOf = (e: Exercicio, chosen: ReadonlySet<string>) => familyCount(e, chosen) >= 2;

/** Só peso do corpo (ou cadeira/parede): usado no aquecimento. */
const isBodyweight = (e: Exercicio) =>
  e.equipamentos.some((op) => op.every((i) => (EQUIPAMENTOS_SEMPRE_DISPONIVEIS as readonly string[]).includes(i)));

/**
 * Peso no sorteio: nível perto do ideal; quem tem equipamento vê mais exercícios
 * com ele; variações de um exercício já escolhido quase não entram (evita três flexões).
 */
function weightFor(e: Exercicio, p: GeneratorProfile, avoid: ReadonlySet<string>, chosen: ReadonlySet<string> = new Set()): number {
  const d = e.nivel - TARGET_LEVEL[p.level];
  const levelFit = 1 / (1 + 1.5 * d * d);
  const usesEquipment = e.equipamentos.every((op) => op.some((i) => !EQUIPAMENTOS_SEMPRE_DISPONIVEIS.includes(i as never)));
  const equipBonus = usesEquipment && p.equipment.length > 0 ? 1.6 : 1;
  const repeatPenalty = avoid.has(e.id) ? 0.15 : 1; // evita o último treino, mas não proíbe
  // Uma variação do que já está no treino entra com menos chance; a terceira, quase nunca.
  const variationPenalty = [1, 0.12, 0.02][Math.min(familyCount(e, chosen), 2)];
  // Variedade: músculo principal que já apareceu no treino entra com menos chance.
  const sameMuscle = [...chosen].some((id) => getExercicio(id)?.musculo_principal === e.musculo_principal);
  return levelFit * equipBonus * repeatPenalty * variationPenalty * (sameMuscle ? 0.4 : 1);
}

function candidates(slot: Slot, p: GeneratorProfile, used: ReadonlySet<string>): Exercicio[] {
  return EXERCICIOS.filter((e) => SLOTS[slot](e) && isAllowed(e, p) && !used.has(e.id));
}

// ---------------------------------------------------------------- prescrição

const SETS: Record<Level, number> = { iniciante: 2, intermediario: 3, avancado: 4 };
const ROUNDS: Record<Level, number> = { iniciante: 3, intermediario: 3, avancado: 4 };
const WORK_SECONDS: Record<Level, number> = { iniciante: 30, intermediario: 40, avancado: 45 };
const REPS: Record<Goal, [number, number]> = {
  forca: [8, 12],
  emagrecer: [12, 15],
  condicionamento: [12, 15],
  manter: [10, 12],
};

/** Descanso padrão (spec 7.4). */
export const REST: Record<Level, { sets: number; circuitExercise: number; circuitRound: number }> = {
  iniciante: { sets: 75, circuitExercise: 15, circuitRound: 120 },
  intermediario: { sets: 60, circuitExercise: 10, circuitRound: 90 },
  avancado: { sets: 45, circuitExercise: 5, circuitRound: 60 },
};

export function prescriptionFor(e: Exercicio, p: GeneratorProfile): Prescription {
  const perSide = e.unilateral;
  if (e.unidade === 'tempo' || e.padrao_movimento === 'cardio') {
    return { kind: 'time', seconds: WORK_SECONDS[p.level], perSide };
  }
  const [min, max] = REPS[p.goal];
  return { kind: 'reps', min, max, perSide };
}

/** Segundos de trabalho de uma série (repetição ≈ 3 s). */
function workSeconds(pr: Prescription): number {
  const base = pr.kind === 'time' ? pr.seconds : ((pr.min + pr.max) / 2) * 3;
  return pr.perSide ? base * 2 : base;
}

const TRANSITION_S = 10; // trocar de exercício, pegar equipamento

export function blockSeconds(b: WorkoutBlock): number {
  switch (b.kind) {
    case 'warmup':
    case 'cooldown':
      return b.items.reduce((s, it) => s + workSeconds(it.prescription) + 5, 0);
    case 'sets':
      return b.items.reduce(
        (s, it) => s + b.sets * workSeconds(it.prescription) + (b.sets - 1) * b.restBetweenSetsS + TRANSITION_S,
        0,
      );
    case 'circuit': {
      const round =
        b.items.reduce((s, it) => s + workSeconds(it.prescription), 0) +
        (b.items.length - 1) * b.restBetweenExercisesS;
      return b.rounds * round + (b.rounds - 1) * b.restBetweenRoundsS + TRANSITION_S;
    }
  }
}

export function estimateMinutes(blocks: WorkoutBlock[]): number {
  return Math.round(blocks.reduce((s, b) => s + blockSeconds(b), 0) / 60);
}

// ---------------------------------------------------------------- ordem

const POSITION_ORDER: Record<Posicao, number> = { em_pe: 0, sentado: 1, apoio_chao: 2, deitado: 3 };
const byPosition = (a: WorkoutItem, b: WorkoutItem) =>
  POSITION_ORDER[getExercicio(a.exerciseId)!.posicao] - POSITION_ORDER[getExercicio(b.exerciseId)!.posicao];

// ---------------------------------------------------------------- aquecimento e alongamento

const WARMUP_BASE = ['marcha_estacionaria', 'rotacao_bracos', 'balanco_perna'];

function warmup(mainItems: WorkoutItem[], p: GeneratorProfile): WorkoutItem[] {
  const inMain = new Set(mainItems.map((i) => i.exerciseId));
  // Se a marcha já está na parte principal, o aquecimento usa o polichinelo sem salto.
  const base = WARMUP_BASE.map((id) => (inMain.has(id) && id === 'marcha_estacionaria' ? 'polichinelo_sem_salto' : id)).filter(
    (id) => !inMain.has(id),
  );
  const items: WorkoutItem[] = base.map((id) => ({
    slot: 'aquecimento',
    exerciseId: id,
    prescription: { kind: 'time', seconds: id === 'balanco_perna' || id === 'rotacao_bracos' || p.minutes <= 15 ? 40 : 60, perSide: false },
  }));
  // + 2 exercícios leves ligados às vagas do dia (o mais fácil disponível de cada vaga).
  const used = new Set<string>([...base, ...inMain]);
  // Treino de 15 min: aquecimento enxuto (só os básicos).
  const wanted = p.minutes <= 15 ? base.length : base.length + 2;
  // Vagas do dia primeiro; num treino só de cardio, usa agachar e empurrar.
  const slots = [
    ...mainItems.map((i) => i.slot).filter((sl) => sl !== 'cardio' && sl !== 'aquecimento' && sl !== 'alongamento'),
    'agachar',
    'empurrar',
  ] as Slot[];
  for (const slot of slots) {
    if (items.length >= wanted) break;
    const easy = EXERCICIOS.find(
      (e) => SLOTS[slot](e) && isAllowed(e, p) && e.nivel === 1 && isBodyweight(e) && !used.has(e.id),
    );
    if (!easy) continue;
    used.add(easy.id);
    items.push({ slot: 'aquecimento', exerciseId: easy.id, prescription: { kind: 'time', seconds: 30, perSide: false } });
  }
  return items;
}

const STRETCHES = () => EXERCICIOS.filter((e) => e.padrao_movimento === 'alongamento');

function cooldown(mainItems: WorkoutItem[], p: GeneratorProfile): WorkoutItem[] {
  // Músculos trabalhados: principal vale 2, secundários valem 1.
  const score = new Map<Musculo, number>();
  for (const it of mainItems) {
    const e = getExercicio(it.exerciseId)!;
    score.set(e.musculo_principal, (score.get(e.musculo_principal) ?? 0) + 2);
    for (const m of e.musculos_secundarios) score.set(m, (score.get(m) ?? 0) + 1);
  }
  const ranked = STRETCHES()
    .filter((e) => isAllowed(e, p))
    .map((e) => ({
      e,
      s: (score.get(e.musculo_principal) ?? 0) * 2 + e.musculos_secundarios.reduce((t, m) => t + (score.get(m) ?? 0), 0),
    }))
    .sort((a, b) => b.s - a.s);
  // 4 a 6 alongamentos (spec 7.5); os que não têm nada a ver com o treino só entram para completar 4.
  // Quantidade proporcional ao treino: 4 (até 30 min), 5 (45 min), 6 (60 min).
  const max = p.minutes <= 30 ? 4 : p.minutes <= 45 ? 5 : 6;
  const chosen = ranked.filter((x, i) => i < 4 || (x.s > 0 && i < max)).map((x) => x.e);
  return chosen.map((e) => ({
    slot: 'alongamento',
    exerciseId: e.id,
    prescription: { kind: 'time', seconds: 30, perSide: e.unilateral },
  }));
}

// ---------------------------------------------------------------- montagem

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ordem das vagas de um treino de corpo inteiro, sorteada uma vez por treino:
 * pernas e empurrar sempre primeiro, depois os outros padrões base e os extras.
 * Treino curto pega só o começo da lista; treino longo, mais extras.
 */
function slotOrder(rng: Rng): Slot[] {
  const [pernas, empurrar, ...rest] = BASE_SLOTS;
  return [pernas, empurrar, ...shuffle(rest, rng), ...shuffle(EXTRA_SLOTS, rng)];
}

function fillSlots(
  slots: Slot[],
  p: GeneratorProfile,
  avoid: ReadonlySet<string>,
  rng: Rng,
  warnings: Set<WorkoutWarning>,
  used = new Set<string>(),
): WorkoutItem[] {
  const items: WorkoutItem[] = [];
  for (let slot of slots) {
    let pool = candidates(slot, p, used);
    // Sem equipamento para puxar (spec 5.3): avisa e usa outra vaga.
    if (slot === 'puxar' && pool.length === 0 && !EXERCICIOS.some((e) => SLOTS.puxar(e) && isAllowed(e, p)))
      warnings.add('semEquipamentoPuxar');
    for (const alt of SLOT_FALLBACK[slot] ?? []) {
      if (pool.length > 0) break;
      slot = alt;
      pool = candidates(slot, p, used);
    }
    // Se só sobraram variações do que já foi escolhido, tenta uma vaga parecida com algo diferente.
    if (pool.length > 0 && pool.every((e) => isVariationOf(e, used))) {
      for (const alt of SLOT_FALLBACK[slot] ?? []) {
        const fresh = candidates(alt, p, used).filter((e) => !isVariationOf(e, used));
        if (fresh.length > 0) {
          slot = alt;
          pool = fresh;
          break;
        }
      }
      // Nada diferente: melhor um exercício a menos (o ajuste ao tempo põe mais séries).
      if (pool.every((e) => isVariationOf(e, used)) && items.length >= 3) continue;
    }
    const e = pickWeighted(pool, (x) => weightFor(x, p, avoid, used), rng);
    if (!e) continue;
    used.add(e.id);
    items.push({ slot, exerciseId: e.id, prescription: prescriptionFor(e, p) });
  }
  return items;
}

/** Divide a parte principal em séries e circuito, conforme o objetivo (spec 7.3). */
function shape(items: WorkoutItem[], p: GeneratorProfile): WorkoutBlock[] {
  const rest = REST[p.level];
  const sets = (its: WorkoutItem[]): WorkoutBlock => ({
    kind: 'sets',
    sets: SETS[p.level],
    restBetweenSetsS: rest.sets,
    items: its,
  });
  const circuits = (its: WorkoutItem[], rounds: number): WorkoutBlock[] => {
    // Blocos de 3 a 5 exercícios.
    const n = Math.ceil(its.length / 5);
    const size = Math.ceil(its.length / n);
    const out: WorkoutBlock[] = [];
    for (let i = 0; i < its.length; i += size)
      out.push({
        kind: 'circuit',
        rounds,
        restBetweenExercisesS: rest.circuitExercise,
        restBetweenRoundsS: rest.circuitRound,
        items: its.slice(i, i + size),
      });
    return out;
  };
  const n = items.length;
  if (n === 0) return [];
  // Treino de 15 min: tudo em circuito, que rende mais exercícios no pouco tempo.
  if (p.minutes <= 15) return circuits(items, ROUNDS[p.level]);
  let nSets: number;
  if (p.goal === 'forca') nSets = n <= 3 ? n : n - Math.min(3, Math.max(2, Math.round(n * 0.3)));
  else if (p.goal === 'manter') nSets = Math.ceil(n / 2);
  else nSets = n <= 3 ? 1 : Math.min(2, n - 3);
  // Circuito precisa de pelo menos 2 exercícios; um só vai para as séries.
  if (n - nSets === 1) nSets = n;
  const blocks: WorkoutBlock[] = [];
  if (nSets > 0) blocks.push(sets(items.slice(0, nSets)));
  if (n > nSets) {
    // Força: circuito curto no fim (5 a 8 min), com 2 voltas.
    const rounds = p.goal === 'forca' ? 2 : ROUNDS[p.level];
    blocks.push(...circuits(items.slice(nSets), rounds));
  }
  return blocks;
}

function sortBlocks(blocks: WorkoutBlock[]): WorkoutBlock[] {
  return blocks.map((b) => ({ ...b, items: [...b.items].sort(byPosition) }) as WorkoutBlock);
}

function assemble(mainItems: WorkoutItem[], p: GeneratorProfile, warnings: Set<WorkoutWarning>) {
  const blocks: WorkoutBlock[] = sortBlocks([
    { kind: 'warmup', items: warmup(mainItems, p) },
    ...shape(mainItems, p),
    { kind: 'cooldown', items: cooldown(mainItems, p) },
  ]);
  return { blocks, estimatedMinutes: estimateMinutes(blocks), warnings: [...warnings] } satisfies Workout;
}

/**
 * Ajuste fino ao tempo: muda séries e voltas (mínimo 2, máximo 6) até chegar perto
 * do tempo escolhido. Usado quando os exercícios disponíveis são poucos ou demais.
 */
function fitToTime(blocks: WorkoutBlock[], target: number): WorkoutBlock[] {
  let out = blocks;
  const tol = Math.max(3, target * 0.1);
  for (let i = 0; i < 16; i++) {
    const diff = estimateMinutes(out) - target;
    if (Math.abs(diff) <= tol) break;
    const step = diff < 0 ? 1 : -1;
    // Mexe no bloco principal com menos (ou mais) séries/voltas.
    const main = out
      .map((b, idx) => ({ b, idx, n: b.kind === 'sets' ? b.sets : b.kind === 'circuit' ? b.rounds : -1 }))
      .filter((x) => x.n >= 0 && x.n + step >= 2 && x.n + step <= 6)
      .sort((a, c) => (step > 0 ? a.n - c.n : c.n - a.n))[0];
    if (!main) break;
    const changed = out.map((b, idx) =>
      idx !== main.idx ? b : b.kind === 'sets' ? { ...b, sets: b.sets + step } : b.kind === 'circuit' ? { ...b, rounds: b.rounds + step } : b,
    );
    // Não passa do ponto: só aceita se ficar mais perto do alvo.
    if (Math.abs(estimateMinutes(changed) - target) >= Math.abs(diff)) break;
    out = changed;
  }
  return out;
}

/**
 * Monta um treino de corpo inteiro com o tempo de `p.minutes` (o treino avulso pode
 * passar um tempo diferente do perfil).
 * @param avoidIds exercícios do último treino (sorteados com menos chance).
 */
export function generateWorkout(p: GeneratorProfile, opts: { avoidIds?: readonly string[]; rng?: Rng } = {}): Workout {
  const rng = opts.rng ?? Math.random;
  const avoid = new Set(opts.avoidIds ?? []);
  const warnings = new Set<WorkoutWarning>();
  const order = slotOrder(rng);

  // Ajuste ao tempo (spec 7.2, passo 6): começa pelo número padrão e tira/põe exercícios.
  const target = p.minutes;
  let count = MAIN_COUNT[p.minutes];
  let best: Workout | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const w = new Set<WorkoutWarning>();
    const mainItems = fillSlots(order.slice(0, count), p, avoid, rng, w);
    const workout = assemble(mainItems, p, w);
    if (!best || Math.abs(workout.estimatedMinutes - target) < Math.abs(best.estimatedMinutes - target)) best = workout;
    const diff = workout.estimatedMinutes - target;
    if (Math.abs(diff) <= Math.max(3, target * 0.12)) break;
    const next = diff > 0 ? count - 1 : count + 1;
    if (next < 2 || next > order.length) break;
    count = next;
  }
  for (const wn of best!.warnings) warnings.add(wn);
  const blocks = fitToTime(best!.blocks, target);
  const estimatedMinutes = estimateMinutes(blocks);
  // Poucos exercícios possíveis para os grupos e equipamentos: o treino fica mais curto.
  if (estimatedMinutes < target - Math.max(6, target * 0.25)) warnings.add('poucosExercicios');
  return { ...best!, blocks, estimatedMinutes, warnings: [...warnings] };
}

/**
 * Botão "trocar" (spec 7.2, passo 8): sorteia outro exercício da mesma vaga, sem
 * repetir nenhum que já está no treino. Devolve o treino igual se não houver outro.
 */
export function swapExercise(
  workout: Workout,
  blockIndex: number,
  itemIndex: number,
  p: GeneratorProfile,
  rng: Rng = Math.random,
): Workout {
  const block = workout.blocks[blockIndex];
  const item = block?.items[itemIndex];
  if (!item || item.slot === 'aquecimento' || item.slot === 'alongamento') return workout;
  const used = new Set(workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)));
  const pool = candidates(item.slot, p, used);
  const others = new Set([...used].filter((id) => id !== item.exerciseId));
  const e = pickWeighted(pool, (x) => weightFor(x, p, new Set(), others), rng);
  if (!e) return workout;
  const blocks = workout.blocks.map((b, bi) =>
    bi !== blockIndex
      ? b
      : ({
          ...b,
          items: b.items.map((it, ii) =>
            ii === itemIndex ? { slot: it.slot, exerciseId: e.id, prescription: prescriptionFor(e, p) } : it,
          ),
        } as WorkoutBlock),
  );
  return { ...workout, blocks, estimatedMinutes: estimateMinutes(blocks) };
}

/** Há outro exercício possível para trocar este? (para desabilitar o botão) */
export function canSwap(workout: Workout, blockIndex: number, itemIndex: number, p: GeneratorProfile): boolean {
  const item = workout.blocks[blockIndex]?.items[itemIndex];
  if (!item || item.slot === 'aquecimento' || item.slot === 'alongamento') return false;
  const used = new Set(workout.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)));
  return candidates(item.slot, p, used).length > 0;
}

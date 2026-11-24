import { ease, ik2, lerp } from './math';
import type { ContinuousMotionId, FigureMotion, LimbAngles, LimbKey, Pose } from './types';

const LIMB_KEYS: LimbKey[] = ['thigh', 'shin', 'foot', 'arm', 'fore', 'armAbd', 'foreAbd', 'legAbd'];

/** Parte de cada trecho entre poses gasta em movimento; o resto é pausa na pose. */
const MOVE_FRACTION = 0.8;

function mixSide(a: Pose, b: Pose, side: 'right' | 'left', u: number): Partial<LimbAngles> | undefined {
  const sa = a[side];
  const sb = b[side];
  if (!sa && !sb) return undefined;
  const o: Partial<LimbAngles> = {};
  for (const k of LIMB_KEYS) {
    if (sa?.[k] === undefined && sb?.[k] === undefined) continue;
    o[k] = lerp(sa?.[k] ?? a[k] ?? 0, sb?.[k] ?? b[k] ?? 0, u);
  }
  return o;
}

function mix(a: Pose, b: Pose, u: number): Pose {
  const o = {
    torso: lerp(a.torso, b.torso, u),
    roll: lerp(a.roll ?? 0, b.roll ?? 0, u),
    twist: lerp(a.twist ?? 0, b.twist ?? 0, u),
    shrug: lerp(a.shrug ?? 0, b.shrug ?? 0, u),
    an: { pt: a.an.pt, side: a.an.side, x: lerp(a.an.x, b.an.x, u), y: lerp(a.an.y, b.an.y, u) },
    right: mixSide(a, b, 'right', u),
    left: mixSide(a, b, 'left', u),
  } as Pose;
  for (const k of LIMB_KEYS) o[k] = lerp(a[k] ?? 0, b[k] ?? 0, u);
  return o;
}

/**
 * Pose no instante `t` (0 a 1) do ciclo. Com 2 poses fica igual ao protótipo:
 * A→B em 40%, pausa 10%, B→A em 40%, pausa 10%.
 */
export function poseAt(motion: FigureMotion, t: number): Pose {
  if (motion.type === 'continuous') return CONTINUOUS[motion.id](t);
  const poses = motion.poses;
  const n = poses.length;
  if (n === 1) return poses[0];
  const seg = Math.min(Math.floor(t * n), n - 1);
  const local = t * n - seg; // 0..1 dentro do trecho
  const u = local < MOVE_FRACTION ? ease(local / MOVE_FRACTION) : 1;
  return mix(poses[seg], poses[(seg + 1) % n], u);
}

/** Escalador: mãos presas, cada pé vai e volta pelo chão, levantando um pouco ao avançar. */
function climberLeg(phase: number): Partial<LimbAngles> {
  const hip: [number, number] = [-101.3, 111.7]; // com mãos em (0, 8) e tronco a 86°
  const w = 2 * Math.PI * phase;
  // 0 = pé atrás, 1 = joelho no peito; passa mais tempo nas pontas (troca rápida das pernas)
  const s = 0.5 - (0.5 * Math.tanh(2.5 * Math.cos(w))) / Math.tanh(2.5);
  const lift = Math.max(0, Math.sin(w)) * 22;
  const foot: [number, number] = [lerp(-267, -62, s), 30 + lift];
  const [thigh, shinW] = ik2(hip, foot, 95, 90, 1);
  return { thigh, shin: shinW - thigh, foot: 80 - shinW };
}

/** Pular corda com os dois pés: `height` = altura do pulo, `turns` = giros da corda por pulo. */
function jumpRope(t: number, height: number, turns: number): Pose {
  const air = t >= 0.25 && t < 0.75;
  let lift = 0;
  let bend = 0;
  if (air) lift = Math.sin((Math.PI * (t - 0.25)) / 0.5);
  else bend = Math.sin((Math.PI * ((t + 0.25) % 1)) / 0.5);
  const thigh = -12 * bend - 3 * lift;
  const shinW = 12 * bend + 4 * lift;
  const footW = 24 * lift;
  return {
    torso: 3,
    thigh,
    shin: shinW - thigh,
    foot: footW - shinW,
    arm: 15,
    fore: -55,
    armAbd: 14,
    foreAbd: 22,
    legAbd: 3,
    an: { pt: 'ankle', x: 0, y: 10 + height * lift },
    ropeAngle: 2 * Math.PI * t * turns,
  };
}

/** Altura do piso da esteira (topo da lona). */
export const TREADMILL_DECK = 14;

/** Andar ou correr no lugar (esteira): pernas em oposição, quadril na altura do pé de apoio. */
function gait(t: number, run: boolean): Pose {
  const w = 2 * Math.PI * t;
  const legAt = (phase: number) => {
    const thigh = -(run ? 38 : 24) * Math.sin(phase);
    // Joelho dobra mais quando a perna volta para a frente (balanço).
    const swing = Math.max(0, Math.sin(phase + (run ? 0.9 : 1.2)));
    const shin = (run ? 18 : 4) + (run ? 95 : 42) * swing;
    const shinW = thigh + shin;
    return { thigh, shin, foot: -shinW * (run ? 0.6 : 0.9) };
  };
  const R = legAt(w);
  const L = legAt(w + Math.PI);
  const drop = (l: { thigh: number; shin: number }) =>
    95 * Math.cos((l.thigh * Math.PI) / 180) + 90 * Math.cos(((l.thigh + l.shin) * Math.PI) / 180);
  const bounce = run ? 10 * Math.abs(Math.sin(w)) : 0;
  const armSwing = run ? 40 : 22;
  return {
    torso: run ? 10 : 3,
    thigh: 0,
    shin: 0,
    foot: 0,
    arm: 0,
    fore: run ? -95 : -25,
    armAbd: 6,
    foreAbd: 6,
    legAbd: 3,
    right: { ...R, arm: armSwing * Math.sin(w) },
    left: { ...L, arm: armSwing * Math.sin(w + Math.PI) },
    an: { pt: 'hip', x: 0, y: TREADMILL_DECK + 10 + Math.max(drop(R), drop(L)) + bounce },
  };
}

/** Bicicleta ergométrica: posições fixas do selim (quadril), pedivela e guidão. */
export const BIKE = {
  hip: [-35, 188] as [number, number],
  crank: [25, 55] as [number, number],
  crankR: 28,
  handle: [88, 236] as [number, number],
};

/** Perna seguindo o pedal (ângulo `phase`) a partir do quadril. */
function pedalLeg(hip: [number, number], crank: [number, number], rad: number, phase: number, footW: number) {
  const f: [number, number] = [crank[0] + rad * Math.cos(phase), crank[1] + rad * Math.sin(phase)];
  const [thigh, shinW] = ik2(hip, f, 95, 90, 1);
  return { thigh, shin: shinW - thigh, foot: footW - shinW };
}

/** Elíptico: quadril fixo, pés numa elipse, mãos indo e voltando nos braços do aparelho. */
export const ELLIPTICAL = {
  hip: [-15, 212] as [number, number],
  center: [0, 38] as [number, number],
  rx: 36,
  ry: 14,
  pivot: [104, 150] as [number, number],
};
export const ellipticalFoot = (phase: number): [number, number] => [
  ELLIPTICAL.center[0] + ELLIPTICAL.rx * Math.cos(phase),
  ELLIPTICAL.center[1] + ELLIPTICAL.ry * Math.sin(phase),
];
export const ellipticalHand = (phase: number): [number, number] => [62 - 24 * Math.cos(phase), 255];

const CONTINUOUS: Record<ContinuousMotionId, (t: number) => Pose> = {
  // Pulo com a corda passando por baixo dos pés no alto do pulo.
  pular_corda: (t) => jumpRope(t, 26, 1),
  // Dois giros da corda por pulo, pulo mais alto.
  corda_dupla: (t) => jumpRope(t, 46, 2),
  // Um pé de cada vez, como uma corridinha no lugar: dois giros da corda por ciclo.
  corda_alternada: (t) => {
    const half = t < 0.5 ? 0 : 1;
    const u = (t * 2) % 1;
    const lift = Math.max(0, Math.sin(Math.PI * u)) * 10;
    const free = { thigh: -14, shin: 62, foot: 12 };
    const support = { thigh: 0, shin: 0, foot: 18 };
    return {
      torso: 3,
      thigh: 0,
      shin: 0,
      foot: 0,
      arm: 15,
      fore: -55,
      armAbd: 14,
      foreAbd: 22,
      legAbd: 3,
      right: half === 0 ? free : support,
      left: half === 0 ? support : free,
      an: { pt: 'hip', x: 0, y: 199 + lift },
      ropeAngle: 4 * Math.PI * t,
    };
  },
  caminhada_esteira: (t) => gait(t, false),
  corrida_esteira: (t) => gait(t, true),
  bicicleta: (t) => {
    const w = 2 * Math.PI * t;
    const torso = 25;
    const S: [number, number] = [BIKE.hip[0] + 100 * Math.sin((torso * Math.PI) / 180), BIKE.hip[1] + 100 * Math.cos((torso * Math.PI) / 180)];
    const [armW, foreW] = ik2(S, BIKE.handle, 55, 56, -1);
    return {
      torso,
      thigh: 0,
      shin: 0,
      foot: 0,
      arm: armW - torso,
      fore: foreW - armW,
      armAbd: 10,
      foreAbd: 4,
      legAbd: 4,
      right: pedalLeg(BIKE.hip, BIKE.crank, BIKE.crankR, w, 0),
      left: pedalLeg(BIKE.hip, BIKE.crank, BIKE.crankR, w + Math.PI, 0),
      an: { pt: 'hip', x: BIKE.hip[0], y: BIKE.hip[1] },
    };
  },
  eliptico: (t) => {
    const w = 2 * Math.PI * t;
    const torso = 5;
    const S: [number, number] = [ELLIPTICAL.hip[0] + 100 * Math.sin((torso * Math.PI) / 180), ELLIPTICAL.hip[1] + 100 * Math.cos((torso * Math.PI) / 180)];
    const arm = (phase: number) => {
      const [aW, fW] = ik2(S, ellipticalHand(phase), 55, 56, -1);
      return { arm: aW - torso, fore: fW - aW };
    };
    const leg = (phase: number) => {
      const f = ellipticalFoot(phase);
      const [thigh, shinW] = ik2(ELLIPTICAL.hip, f, 95, 90, 1);
      return { thigh, shin: shinW - thigh, foot: -shinW };
    };
    return {
      torso,
      thigh: 0,
      shin: 0,
      foot: 0,
      arm: 0,
      fore: 0,
      armAbd: 8,
      foreAbd: 4,
      legAbd: 4,
      right: { ...leg(w), ...arm(w) },
      left: { ...leg(w + Math.PI), ...arm(w + Math.PI) },
      an: { pt: 'hip', x: ELLIPTICAL.hip[0], y: ELLIPTICAL.hip[1] },
    };
  },
  escalador: (t) => ({
    torso: 86,
    thigh: 0,
    shin: 0,
    foot: 0,
    arm: -86,
    fore: -1.5,
    armAbd: 6,
    foreAbd: 0,
    legAbd: 3,
    right: climberLeg(t),
    left: climberLeg(t + 0.5),
    an: { pt: 'hand', x: 0, y: 8 },
  }),
  // Braços abertos desenhando círculos (frente → cima → trás → baixo).
  circulos_braco: (t) => ({
    torso: 0,
    thigh: 0,
    shin: 0,
    foot: 0,
    arm: -90 - 360 * t,
    fore: 0,
    armAbd: 74,
    foreAbd: 74,
    legAbd: 4,
    an: { pt: 'ankle', x: 0, y: 10 },
  }),
};

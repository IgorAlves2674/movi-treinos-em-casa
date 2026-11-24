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

const CONTINUOUS: Record<ContinuousMotionId, (t: number) => Pose> = {
  // Pulo com a corda passando por baixo dos pés no alto do pulo.
  pular_corda: (t) => {
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
      an: { pt: 'ankle', x: 0, y: 10 + 26 * lift },
      ropeAngle: 2 * Math.PI * t,
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

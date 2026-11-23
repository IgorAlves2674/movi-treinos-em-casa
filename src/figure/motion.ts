import { ease, lerp } from './math';
import type { ContinuousMotionId, FigureMotion, Pose } from './types';

const ANGLE_KEYS = ['torso', 'thigh', 'shin', 'foot', 'arm', 'fore', 'armAbd', 'foreAbd', 'legAbd'] as const;

/** Parte de cada trecho entre poses gasta em movimento; o resto é pausa na pose. */
const MOVE_FRACTION = 0.8;

function mix(a: Pose, b: Pose, u: number): Pose {
  const o = { an: { pt: a.an.pt, x: lerp(a.an.x, b.an.x, u), y: lerp(a.an.y, b.an.y, u) } } as Pose;
  for (const k of ANGLE_KEYS) o[k] = lerp(a[k] ?? 0, b[k] ?? 0, u);
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
};

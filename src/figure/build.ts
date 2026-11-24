/**
 * Monta o desenho do boneco para um instante e uma vista.
 * Porte de `movi_spec/prototipos/boneco_4_exercicios_vistas.html`:
 * esqueleto 3D → âncora → projeção na vista → formas (cápsulas, bolas, blocos)
 * → ordenação por profundidade (pintor).
 */
import {
  add,
  circlePoints,
  closedPath,
  convexHull,
  cross,
  dot,
  normalize,
  openPath,
  perpForward,
  rotate,
  scale,
  segmentDir,
  sub,
  sum,
  type Projected,
  type Vec2,
  type Vec3,
} from './math';
import { poseAt } from './motion';
import type { DrawItem, FigureAnimation, FigureMuscle, FigureView, LimbKey, Pose, ViewBox } from './types';

export const FIGURE_COLORS = {
  body: '#6b6866',
  bodyBack: '#4f4c4a', // membros do lado de trás, na vista lateral
  muscle: '#1D9E75',
  muscleBack: '#167a5b',
  outline: '#FFFFFF',
  stage: '#101010', // fundo da área da animação
  floor: '#333333',
  mat: '#1f3a33',
  chair: '#3a3a3a',
  chairOutline: '#8a8a8a',
  weight: '#2e2e2e',
  weightOutline: '#cfcfcf',
  rope: '#f0b440',
} as const;

const C = FIGURE_COLORS;

type Side = 1 | -1;
type Limbs = {
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
  footDir: Vec3;
  footNormal: Vec3;
  thighW: number;
  shinW: number;
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  hand: Vec3;
  armW: number;
  foreDir: Vec3;
};
type Skeleton = {
  P: Vec3; // centro do quadril (raiz)
  up: Vec3; // eixo do tronco
  fwd: Vec3; // frente da parte de cima (tórax)
  right: Vec3; // lateral da parte de cima (+z sem rotação)
  fwdL: Vec3; // frente da parte de baixo (pelve)
  rightL: Vec3;
  /** Gira uma direção calculada no plano lateral para a parte de baixo / de cima. */
  dirL: (v: Vec3) => Vec3;
  dirU: (v: Vec3) => Vec3;
  head: Vec3;
  sides: Record<Side, Limbs>;
};

// Medidas do boneco (unidades do mundo; altura em pé ≈ 360)
const BODY = {
  hipHalfWidth: 13,
  thigh: 95,
  shin: 90,
  shoulderHeight: 100,
  shoulderHalfWidth: 26,
  upperArm: 55,
  forearmToWrist: 48,
  forearmToHand: 56,
  headHeight: 147,
};

function skeleton(p: Pose, P: Vec3): Skeleton {
  const t = p.torso;
  const D = Math.PI / 180;
  const up: Vec3 = [Math.sin(t * D), Math.cos(t * D), 0];
  const roll = p.roll ?? 0;
  const twist = p.twist ?? 0;
  const dirL = (v: Vec3) => rotate(v, up, roll);
  const dirU = (v: Vec3) => rotate(v, up, roll + twist);
  const fwd0: Vec3 = [Math.cos(t * D), -Math.sin(t * D), 0];
  const right0: Vec3 = [0, 0, 1];
  const fwdL = dirL(fwd0);
  const rightL = dirL(right0);
  const fwd = dirU(fwd0);
  const right = dirU(right0);
  const sides = {} as Record<Side, Limbs>;
  for (const side of [1, -1] as Side[]) {
    // Ângulo do membro deste lado: o valor próprio do lado (right/left) ou o comum.
    const own = side === 1 ? p.right : p.left;
    const g = (k: LimbKey) => own?.[k] ?? p[k] ?? 0;
    const hip = add(P, scale(rightL, BODY.hipHalfWidth * side));
    const thighW = g('thigh');
    const shinW = thighW + g('shin');
    const footW = shinW + g('foot');
    const la = g('legAbd');
    const knee = add(hip, scale(dirL(segmentDir(thighW, la, side)), BODY.thigh));
    const ankle = add(knee, scale(dirL(segmentDir(shinW, la, side)), BODY.shin));
    const footDir = dirL([Math.cos(footW * D), -Math.sin(footW * D), 0]);
    const footNormal = dirL([-Math.sin(footW * D), -Math.cos(footW * D), 0]);
    const shoulder = sum(P, scale(up, BODY.shoulderHeight + (p.shrug ?? 0)), scale(right, BODY.shoulderHalfWidth * side));
    const armW = t + g('arm');
    const foreW = armW + g('fore');
    const elbow = add(shoulder, scale(dirU(segmentDir(armW, g('armAbd'), side)), BODY.upperArm));
    const foreDir = dirU(segmentDir(foreW, g('foreAbd'), side));
    const wrist = add(elbow, scale(foreDir, BODY.forearmToWrist));
    const hand = add(elbow, scale(foreDir, BODY.forearmToHand));
    sides[side] = { hip, knee, ankle, footDir, footNormal, thighW, shinW, shoulder, elbow, wrist, hand, armW, foreDir };
  }
  const head = sum(P, scale(up, BODY.headHeight), scale(fwd, 5));
  return { P, up, fwd, right, fwdL, rightL, dirL, dirU, head, sides };
}

function anchorPoint(S: Skeleton, an: Pose['an']): Vec3 {
  return an.pt === 'hip' ? S.P : S.sides[an.side === 'left' ? -1 : 1][an.pt];
}

// Projeções: [x tela, y tela (para baixo), profundidade (+ = perto da câmera)]
const PROJECT: Record<FigureView, (v: Vec3) => Projected> = {
  lateral: (v) => [v[0], -v[1], v[2]],
  frente: (v) => [-v[2], -v[1], v[0]],
  costas: (v) => [v[2], -v[1], -v[0]],
};
const CAMERA: Record<FigureView, Vec3> = {
  lateral: [0, 0, 1],
  frente: [1, 0, 0],
  costas: [-1, 0, 0],
};

/** Esqueleto já posicionado pela âncora (para ferramentas de criação de poses). */
export function placedSkeleton(p: Pose) {
  const first = skeleton(p, [0, 0, 0]);
  const a = anchorPoint(first, p.an);
  return skeleton(p, [p.an.x - a[0], p.an.y - a[1], 0]);
}

export type FigureFrame = { items: DrawItem[]; points: Vec2[] };

/** Monta o quadro do instante `t` (0 a 1) na vista escolhida. */
export function buildFrame(anim: FigureAnimation, t: number, view: FigureView): FigureFrame {
  const pr = PROJECT[view];
  const cam = CAMERA[view];
  const hl = (m: FigureMuscle) => anim.highlight.includes(m);
  const p = poseAt(anim.motion, t);

  // Posiciona o esqueleto para que o ponto preso fique onde a pose manda.
  const S = placedSkeleton(p);

  const items: DrawItem[] = [];
  const points: Vec2[] = [];
  const depthOf = (v: Vec3) => pr(v)[2];
  const push = (item: DrawItem, pts?: Vec2[]) => {
    items.push(item);
    if (pts) points.push(...pts);
  };
  // Na lateral, o que está do lado de trás fica um pouco mais escuro.
  const fillFor = (d: number, isHl: boolean) =>
    isHl ? (d < -12 ? C.muscleBack : C.muscle) : d < -12 ? C.bodyBack : C.body;

  const capsule = (A: Vec3, B: Vec3, r1: number, r2: number, bias: number, isHl: boolean, depthOverride?: number) => {
    const a2 = pr(A);
    const b2 = pr(B);
    const pts = convexHull(circlePoints(a2, r1).concat(circlePoints(b2, r2)));
    const d = (depthOverride ?? (a2[2] + b2[2]) / 2) + bias;
    push({ depth: d, path: closedPath(pts), fill: fillFor(d - bias, isHl) }, pts);
  };
  const ball = (Cn: Vec3, r: number, bias: number, isHl: boolean, depthPoint?: Vec3) => {
    const c2 = pr(Cn);
    const pts = circlePoints(c2, r, 18);
    const d = (depthPoint ? depthOf(depthPoint) : c2[2]) + bias;
    push({ depth: d, path: closedPath(pts), fill: fillFor(d - bias, isHl) }, pts);
  };
  const blob = (pts3: Vec3[], bias: number, fill?: string, stroke?: string): number => {
    const pts = convexHull(pts3.map((q) => [pr(q)[0], pr(q)[1]] as Vec2));
    const c = scale(sum(...pts3), 1 / pts3.length);
    const d = depthOf(c) + bias;
    push({ depth: d, path: closedPath(pts), fill: fill ?? fillFor(d - bias, false), stroke }, pts);
    return d;
  };
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, fill: string) => {
    const corners: Vec3[] = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) corners.push([x, y, z]);
    blob(corners, 0, fill, C.chairOutline);
  };

  const { P, up, fwd, right, fwdL, rightL } = S;

  // --- Tronco: pelve e tórax como "anéis" envolvidos por um fecho convexo
  const ring = (h: number, w: number, dpt: number, cf: number, f: Vec3, r: Vec3): Vec3[] => {
    const o: Vec3[] = [];
    for (let i = 0; i < 14; i++) {
      const ph = (i / 14) * 2 * Math.PI;
      o.push(sum(P, scale(up, h), scale(f, cf + dpt * Math.sin(ph)), scale(r, w * Math.cos(ph))));
    }
    return o;
  };
  const lo = [fwdL, rightL] as const;
  const hi = [fwd, right] as const;
  const pelvis = [...ring(50, 20, 15, 2, ...lo), ...ring(12, 25, 16, 0, ...lo), ...ring(-10, 21, 13, -1, ...lo)];
  const chest = [
    ...ring(112, 22, 13, 0, ...hi),
    ...ring(98, 31, 18, 4, ...hi),
    ...ring(75, 27, 19, 6, ...hi),
    ...ring(48, 21, 15, 3, ...hi),
  ];
  const pelvisDepth = blob(pelvis, 0);
  // Detalhes do tronco ficam por cima da pelve e do tórax (o que estiver mais perto).
  const torsoTop = Math.max(pelvisDepth, blob(chest, 0.1));

  // --- Detalhes do tronco: frente (peitoral, abdômen) ou costas (dorsais, trapézio, lombar)
  /** Ponto na superfície do tronco: a = lateral, b = altura, c = frente(+)/trás(−) */
  const surf = (aa: number, bb: number, cc: number) => sum(P, scale(right, aa), scale(up, bb), scale(fwd, cc));
  const mirror = (poly: [number, number][]) =>
    [1, -1].map((s) => poly.map(([aa, bb]) => [aa * s, bb] as [number, number]));
  const muscleBlob = (poly: [number, number][], cc: number, offset: number) => {
    const pts = convexHull(poly.map(([aa, bb]) => pr(surf(aa, bb, cc))).map((q) => [q[0], q[1]] as Vec2));
    push({ depth: torsoTop + offset, path: closedPath(pts), fill: C.muscle });
  };
  const detailLine = (poly: [number, number][], cc: number) => {
    const pts = poly.map(([aa, bb]) => pr(surf(aa, bb, cc))).map((q) => [q[0], q[1]] as Vec2);
    push({ depth: torsoTop + 0.3, path: openPath(pts), fill: 'none', strokeWidth: 1.6 });
  };

  const facing = dot(fwd, cam);
  if (facing > 0.35) {
    const FRONT = 21;
    const pec: [number, number][] = [[2, 100], [16, 102], [27, 92], [25, 78], [12, 72], [2, 76]];
    const abs: [number, number][] = [[-11, 70], [11, 70], [11, 34], [-11, 34]];
    if (hl('peitoral')) for (const half of mirror(pec)) muscleBlob(half, FRONT, 0.2);
    if (hl('abdomen')) muscleBlob(abs, FRONT, 0.2);
    for (const half of mirror(pec)) detailLine(half, FRONT);
    detailLine([[0, 70], [0, 36]], FRONT);
    for (const b of [62, 52, 42]) detailLine([[-10, b], [10, b]], FRONT);
  } else if (facing < -0.35) {
    const BACK = -15;
    const lat: [number, number][] = [[4, 100], [20, 96], [26, 80], [18, 58], [6, 46]];
    const trapFill: [number, number][] = [[0, 118], [10, 116], [24, 104], [12, 96], [0, 92]];
    const lumbar: [number, number][] = [[-9, 46], [9, 46], [9, 22], [-9, 22]];
    if (hl('dorsais')) for (const half of mirror(lat)) muscleBlob(half, BACK, 0.2);
    if (hl('trapezio')) for (const half of mirror(trapFill)) muscleBlob(half, BACK, 0.2);
    if (hl('lombar')) muscleBlob(lumbar, BACK, 0.2);
    detailLine([[0, 104], [0, 20]], BACK);
    for (const half of mirror(lat)) detailLine(half, BACK);
    for (const half of mirror([[6, 112], [24, 104]])) detailLine(half, BACK);
  } else {
    // De perfil: músculos do tronco como faixas na frente (peito, abdômen) ou nas costas.
    const band = (b1: number, b2: number, c1: number, c2: number, r1: number, r2: number) => {
      const p1 = pr(surf(0, b1, c1));
      const p2 = pr(surf(0, b2, c2));
      const pts = convexHull(circlePoints(p1, r1).concat(circlePoints(p2, r2)));
      push({ depth: torsoTop + 0.2, path: closedPath(pts), fill: C.muscle });
    };
    if (hl('peitoral')) band(84, 96, 17, 16, 6, 6);
    if (hl('abdomen')) band(40, 70, 12, 16, 5, 5);
    if (hl('dorsais')) band(58, 94, -8, -8, 5, 5);
    if (hl('trapezio')) band(104, 116, -6, -5, 5, 5);
    if (hl('lombar')) band(24, 48, -8, -8, 5, 5);
  }

  // --- Pescoço e cabeça
  capsule(add(P, scale(up, 106)), add(P, scale(up, 128)), 8, 7, 0.5, false);
  ball(S.head, 17, 1, false);

  // --- Membros
  for (const side of [1, -1] as Side[]) {
    const L = S.sides[side];
    const gluteCenter = sum(P, scale(rightL, 12 * side), scale(fwdL, -10), scale(up, -4));
    ball(gluteCenter, 15, 0.2, hl('gluteos'), add(gluteCenter, scale(fwdL, -20)));

    capsule(L.hip, L.knee, 15, 10, 10, false);
    const qf = S.dirL(perpForward(L.thighW));
    const thighVec = sub(L.knee, L.hip);
    const q1 = sum(L.hip, scale(thighVec, 0.18), scale(qf, 6));
    const q2 = sum(L.hip, scale(thighVec, 0.85), scale(qf, 4));
    capsule(q1, q2, 8, 6, 10.5, hl('quadriceps'), (depthOf(add(q1, scale(qf, 15))) + depthOf(add(q2, scale(qf, 15)))) / 2);

    // Posteriores da coxa: atrás da coxa, só aparecem quando destacados
    if (hl('posteriores_coxa')) {
      const h1 = sum(L.hip, scale(thighVec, 0.2), scale(qf, -6));
      const h2 = sum(L.hip, scale(thighVec, 0.85), scale(qf, -4));
      capsule(h1, h2, 8, 6, 10.5, true, (depthOf(add(h1, scale(qf, -15))) + depthOf(add(h2, scale(qf, -15)))) / 2);
    }

    capsule(L.knee, L.ankle, 10, 6, 10, false);
    const cb = scale(S.dirL(perpForward(L.shinW)), -1);
    const shinVec = sub(L.ankle, L.knee);
    const c1 = sum(L.knee, scale(shinVec, 0.12), scale(cb, 4));
    const c2 = sum(L.knee, scale(shinVec, 0.62), scale(cb, 3));
    capsule(c1, c2, 8, 5, 10.5, hl('panturrilhas'), (depthOf(add(c1, scale(cb, 15))) + depthOf(add(c2, scale(cb, 15)))) / 2);

    capsule(
      sum(L.ankle, scale(L.footDir, -8), scale(L.footNormal, 4)),
      sum(L.ankle, scale(L.footDir, 28), scale(L.footNormal, 6)),
      6,
      4,
      10.2,
      false,
    );

    capsule(L.shoulder, L.elbow, 9, 7, 10, false);
    const bf = S.dirU(perpForward(L.armW));
    const armVec = sub(L.elbow, L.shoulder);
    for (const [muscle, sgn, rr] of [
      ['biceps', 1, 6],
      ['triceps', -1, 6.5],
    ] as const) {
      const n = scale(bf, sgn);
      const m1 = sum(L.shoulder, scale(armVec, 0.2), scale(n, 3.5));
      const m2 = sum(L.shoulder, scale(armVec, 0.8), scale(n, 3.5));
      capsule(m1, m2, rr, 5, 10.5, hl(muscle), (depthOf(add(m1, scale(n, 15))) + depthOf(add(m2, scale(n, 15)))) / 2);
    }
    ball(add(L.shoulder, scale(right, 3 * side)), 11, 10.6, hl('deltoides'));
    capsule(L.elbow, L.wrist, 7, 5, 10, false);
    ball(L.hand, 7, 10.3, false);
  }

  // --- Equipamentos
  const disk = (c: Vec3, axisIn: Vec3, rad: number, bias: number) => {
    const axis = normalize(axisIn);
    const ref: Vec3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const b1 = normalize(cross(axis, ref));
    const b2 = cross(axis, b1);
    const pts: Vec3[] = [];
    for (const off of [-2.5, 2.5])
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * 2 * Math.PI;
        pts.push(sum(c, scale(axis, off), scale(b1, rad * Math.cos(ang)), scale(b2, rad * Math.sin(ang))));
      }
    blob(pts, bias, C.weight, C.weightOutline);
  };
  const dumbbell = (c: Vec3, axisIn: Vec3, bias: number) => {
    const axis = normalize(axisIn);
    capsule(add(c, scale(axis, -12)), add(c, scale(axis, 12)), 2.6, 2.6, bias, false);
    disk(add(c, scale(axis, -12)), axis, 11, bias + 0.1);
    disk(add(c, scale(axis, 12)), axis, 11, bias + 0.1);
  };
  const props = anim.props ?? {};
  if (props.dumbbell === 'two' || props.dumbbell === 'right') {
    // Pegada: 'z' = barra do halter de um lado ao outro (rosca); 'x' = da frente para trás (pegada neutra)
    const axis: Vec3 = props.dumbbellAxis === 'x' ? [1, 0, 0] : [0, 0, 1];
    const sides: Side[] = props.dumbbell === 'two' ? [1, -1] : [1];
    for (const side of sides) dumbbell(S.sides[side].hand, axis, 10.4);
  }
  if (props.dumbbell === 'one') {
    const R = S.sides[1];
    const Lf = S.sides[-1];
    const mid = scale(add(R.hand, Lf.hand), 0.5);
    if (props.dumbbellAxis === 'z') dumbbell(mid, [0, 0, 1], 10.4);
    else dumbbell(add(mid, scale(R.foreDir, 12)), R.foreDir, 10.4);
  }

  if (props.rope && p.ropeAngle !== undefined) {
    // A corda gira numa elipse e passa por baixo dos pés no alto do pulo.
    const hL = S.sides[-1].hand;
    const hR = S.sides[1].hand;
    const cx = (hL[0] + hR[0]) / 2 - 8;
    const top = 376;
    const bot = -2;
    const cy = (top + bot) / 2;
    const ry = (top - bot) / 2;
    const rx = 88;
    const A = p.ropeAngle;
    const ropePoint: Vec3 = [cx + rx * Math.sin(A), cy + ry * Math.cos(A), 0];
    const ctrl = sub(scale(ropePoint, 2), scale(add(hL, hR), 0.5));
    const pts: Vec2[] = [];
    for (let i = 0; i <= 20; i++) {
      const s = i / 20;
      const q = sum(scale(hL, (1 - s) * (1 - s)), scale(ctrl, 2 * s * (1 - s)), scale(hR, s * s));
      const q2 = pr(q);
      pts.push([q2[0], q2[1]]);
    }
    push({ depth: depthOf(ropePoint), path: openPath(pts), fill: 'none', stroke: C.rope, strokeWidth: 3.5 }, pts);
  }

  if (props.chair) {
    const o = props.chair === true ? {} : props.chair;
    const ox = o.x ?? 0;
    const fx = (x: number) => (o.flip ? 4 - x : x) + ox; // espelha em volta do centro do assento
    const cbox = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
      const a = fx(x0);
      const b = fx(x1);
      box(Math.min(a, b), Math.max(a, b), y0, y1, z0, z1, C.chair);
    };
    cbox(-42, 50, 75, 84, -30, 30); // assento
    for (const x of [-38, 46]) for (const z of [-27, 27]) cbox(x - 2, x + 2, 0, 75, z - 2, z + 2); // pés
    cbox(-44, -36, 84, 165, -30, 30); // encosto
  }

  if (props.wall !== undefined) {
    const x = props.wall;
    const x2 = x + (x > 0 ? 14 : -14);
    // De lado aparece inteira; de frente/costas só se estiver atrás do boneco (fundo).
    const behind = view === 'lateral' || (view === 'frente' ? x < 0 : x > 0);
    if (behind) {
      const pts: Vec2[] = [];
      for (const xx of [x, x2]) for (const y of [0, 400]) for (const z of [-70, 70]) pts.push([pr([xx, y, z])[0], pr([xx, y, z])[1]]);
      const h = convexHull(pts);
      push({ depth: view === 'lateral' ? -70 : -1e8, path: closedPath(h), fill: C.chair, stroke: 'none' });
    }
  }

  if (props.mat) {
    const m: Vec2[] = [];
    for (const x of [-215, 30])
      for (const z of [-38, 38])
        for (const y of [0, 3]) {
          const q = pr([x, y, z]);
          m.push([q[0], q[1]]);
        }
    const h = convexHull(m);
    push({ depth: -1e9, path: closedPath(h), fill: C.mat, stroke: 'none' }, h);
  }

  items.sort((x, y) => x.depth - y.depth);
  return { items, points };
}

/** Enquadramento que cabe o ciclo inteiro (amostra 24 quadros), proporção 13:10. */
export function frameBox(anim: FigureAnimation, view: FigureView, aspect = 1.3): ViewBox {
  let x0 = 1e9;
  let x1 = -1e9;
  let y0 = 1e9;
  let y1 = -1e9;
  for (let i = 0; i < 24; i++) {
    for (const q of buildFrame(anim, i / 24, view).points) {
      x0 = Math.min(x0, q[0]);
      x1 = Math.max(x1, q[0]);
      y0 = Math.min(y0, q[1]);
      y1 = Math.max(y1, q[1]);
    }
  }
  y1 = Math.max(y1, 0);
  const pad = 24;
  x0 -= pad;
  x1 += pad;
  y0 -= pad;
  y1 += pad * 0.6;
  let w = Math.max(x1 - x0, 280);
  let h = y1 - y0;
  const cx = (x0 + x1) / 2;
  if (w / h < aspect) w = h * aspect;
  else {
    h = w / aspect;
    y0 = y1 - h;
  }
  return { x: cx - w / 2, y: y0, w, h };
}

// Vetores 3D e 2D usados pelo boneco. Funções pequenas e sem alocação extra além do resultado.

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
/** Ponto projetado: [x, y na tela, profundidade (maior = mais perto da câmera)] */
export type Projected = [number, number, number];

export const DEG = Math.PI / 180;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return scale(a, 1 / l);
};
/** Soma de vários vetores. */
export const sum = (...vs: Vec3[]): Vec3 => {
  const o: Vec3 = [0, 0, 0];
  for (const v of vs) {
    o[0] += v[0];
    o[1] += v[1];
    o[2] += v[2];
  }
  return o;
};

export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
/** Suavização (ease-in-out quadrática), igual à do protótipo. */
export const ease = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/**
 * Direção de um segmento a partir do ângulo no plano sagital (`theta`, 0 = para
 * baixo, positivo = para a frente) e da abdução (`abd`, abre para o lado).
 * `side` = 1 (lado direito, +z) ou -1 (esquerdo).
 */
export const segmentDir = (theta: number, abd: number, side: number): Vec3 => {
  const c = Math.cos(abd * DEG);
  return [-Math.sin(theta * DEG) * c, -Math.cos(theta * DEG) * c, side * Math.sin(abd * DEG)];
};

/** Vetor perpendicular (para a frente) de um segmento com ângulo sagital `theta`. */
export const perpForward = (theta: number): Vec3 => [Math.cos(theta * DEG), -Math.sin(theta * DEG), 0];

/** Fecho convexo 2D (monotone chain). */
export function convexHull(points: Vec2[]): Vec2[] {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cr = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  const upper: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Pontos de um círculo 2D. */
export function circlePoints(c: Vec2 | Projected, r: number, n = 14): Vec2[] {
  const o: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    o.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return o;
}

const f1 = (n: number) => n.toFixed(1);

/** Polígono fechado em SVG path. */
export const closedPath = (pts: Vec2[]): string =>
  pts.length ? 'M' + pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join('L') + 'Z' : '';

/** Linha aberta em SVG path. */
export const openPath = (pts: Vec2[]): string =>
  pts.length ? 'M' + pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join('L') : '';

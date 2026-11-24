/// <reference types="node" />
// Ajudas para criar poses: cinemática inversa, posições das juntas e JSON no formato do banco.
import { placedSkeleton } from '../../src/figure/build';
import type { Pose } from '../../src/figure/types';

export type P2 = [number, number];
const DEG = 180 / Math.PI;
export const r = (n: number) => Math.round(n * 10) / 10;
export const ang = (dx: number, dy: number) => Math.atan2(-dx, -dy) * DEG;
export const dir = (deg: number): P2 => [-Math.sin(deg / DEG), -Math.cos(deg / DEG)];
export const upv = (t: number): P2 => [Math.sin(t / DEG), Math.cos(t / DEG)];
export const addv = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];

export function ik(root: P2, target: P2, l1: number, l2: number, bend: 1 | -1 | 'up' | 'down') {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const ux = dx / d,
    uy = dy / d;
  let px = -uy,
    py = ux;
  const wrong = bend === 'up' ? py < 0 : bend === 'down' ? py > 0 : Math.sign(px || 1) !== bend;
  if (wrong) {
    px = -px;
    py = -py;
  }
  const j: P2 = [root[0] + ux * a + px * h, root[1] + uy * a + py * h];
  return { joint: j, a1: ang(j[0] - root[0], j[1] - root[1]), a2: ang(target[0] - j[0], target[1] - j[1]) };
}

/** Perna do quadril até o tornozelo; footW = ângulo do pé no mundo (0 = plano). */
export function legTo(hip: P2, ankle: P2, bend: 1 | -1 | 'up' | 'down' = 1, footW = 0) {
  const s = ik(hip, ankle, 95, 90, bend);
  return { thigh: r(s.a1), shin: r(s.a2 - s.a1), foot: r(footW - s.a2) };
}
/** Braço do ombro até a mão (centro da mão), com o tronco em `torso`. */
export function armTo(shoulder: P2, hand: P2, torso: number, bend: 1 | -1 | 'up' | 'down' = 'down') {
  const s = ik(shoulder, hand, 55, 56, bend);
  return { arm: r(s.a1 - torso), fore: r(s.a2 - s.a1) };
}
export const shoulderOf = (hip: P2, t: number): P2 => addv(hip, upv(t), 100);

/** Posições do esqueleto já ancorado (para conferir pés e mãos). */
export function joints(p: Pose) {
  const S = placedSkeleton(p);
  const f = (v: number[]) => [r(v[0]), r(v[1]), r(v[2])];
  const side = (k: 1 | -1) => {
    const L = S.sides[k];
    return { hip: f(L.hip), knee: f(L.knee), ankle: f(L.ankle), shoulder: f(L.shoulder), elbow: f(L.elbow), hand: f(L.hand) };
  };
  return { P: f(S.P), head: f(S.head), R: side(1), L: side(-1) };
}

/** Bisseção: acha x em [lo, hi] com f(x) = 0. */
export function solve(f: (x: number) => number, lo: number, hi: number) {
  let flo = f(lo);
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    const fm = f(m);
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = m;
      flo = fm;
    } else hi = m;
  }
  return (lo + hi) / 2;
}

/** JSON no estilo do banco: poses e listas curtas numa linha só. */
export function toJson(v: unknown): string {
  const inline = (x: unknown): string => {
    if (Array.isArray(x)) return '[' + x.map(inline).join(', ') + ']';
    if (x && typeof x === 'object')
      return '{ ' + Object.entries(x).map(([k, val]) => `${JSON.stringify(k)}: ${inline(val)}`).join(', ') + ' }';
    return JSON.stringify(x);
  };
  const go = (x: unknown, ind: string, key: string): string => {
    const one = inline(x);
    if (key === 'pose' || ind.length + one.length < 100 || x === null || typeof x !== 'object') return one;
    const nxt = ind + '  ';
    if (Array.isArray(x)) {
      const childKey = key === 'poses' ? 'pose' : '';
      return '[\n' + x.map((i) => nxt + go(i, nxt, childKey)).join(',\n') + '\n' + ind + ']';
    }
    return (
      '{\n' +
      Object.entries(x as Record<string, unknown>)
        .map(([k, val]) => `${nxt}${JSON.stringify(k)}: ${go(val, nxt, k)}`)
        .join(',\n') +
      '\n' + ind + '}'
    );
  };
  return go(v, '', '') + '\n';
}

/** Ordem dos campos de um exercício (igual ao tipo Exercicio). */
const ORDEM = ['id', 'nome', 'apelidos', 'musculo_principal', 'musculos_secundarios', 'padrao_movimento', 'equipamentos', 'nivel', 'unidade', 'variacao_mais_facil', 'variacao_mais_dificil', 'impacto', 'barulho', 'unilateral', 'posicao', 'vistas', 'animacao', 'passo_a_passo', 'erros_comuns'];
export function ordered(e: Record<string, unknown>) {
  const extra = Object.keys(e).filter((k) => !ORDEM.includes(k));
  if (extra.length) throw new Error(`${e.id}: campos desconhecidos ${extra}`);
  return Object.fromEntries(ORDEM.map((k) => [k, e[k]]));
}

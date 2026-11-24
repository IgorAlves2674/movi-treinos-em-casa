/// <reference types="node" />
/**
 * Gera uma página HTML com as poses-chave de cada exercício (todas as vistas),
 * para conferir sem abrir o app.
 * Uso: npx tsx scripts/preview-poses.ts <saida.html> [id1,id2,...] [largura]
 */
import { writeFileSync } from 'node:fs';

import { animacaoDoBoneco, EXERCICIOS } from '../src/content/exercises';
import { buildFrame, FIGURE_COLORS, frameBox } from '../src/figure/build';
import type { FigureAnimation, FigureView } from '../src/figure/types';

const [out = 'poses.html', idsArg, larguraArg] = process.argv.slice(2);
const largura = Number(larguraArg) || 182;
const ids = idsArg ? idsArg.split(',') : null;
const lista = ids ? EXERCICIOS.filter((e) => ids.includes(e.id)) : EXERCICIOS;

function svg(anim: FigureAnimation, t: number, view: FigureView) {
  const box = frameBox(anim, view);
  const { items } = buildFrame(anim, t, view);
  const paths = items
    .map(
      (it) =>
        `<path d="${it.path}" fill="${it.fill}" stroke="${it.stroke ?? FIGURE_COLORS.outline}" stroke-width="${it.strokeWidth ?? 2.2}"/>`,
    )
    .join('');
  return `<svg viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${largura}" height="${Math.round(largura / 1.3)}" style="background:${FIGURE_COLORS.stage};border-radius:8px" stroke-linejoin="round" stroke-linecap="round"><line x1="${box.x}" x2="${box.x + box.w}" y1="1" y2="1" stroke="${FIGURE_COLORS.floor}" stroke-width="2"/>${paths}</svg>`;
}

const blocos = lista.map((e) => {
  const anim = animacaoDoBoneco(e);
  const mov = anim.motion;
  const ts = mov.type === 'keyframes' ? mov.poses.map((_, i) => i / mov.poses.length) : [0, 0.25, 0.5, 0.75];
  const linhas = `<div class="row">${anim.views
    .map((v) => `<span>${v}</span>${ts.map((t) => svg(anim, t, v)).join('')}`)
    .join('')}</div>`;
  return `<section><h3>${e.nome} <small>${e.id}</small></h3>${linhas}</section>`;
});

writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><style>body{font-family:sans-serif;background:#eee;margin:12px}section{margin-bottom:6px}h3{margin:2px 0;font-size:13px}small{color:#888;font-weight:normal}.row{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.row span{font-size:11px;writing-mode:vertical-rl}</style>${blocos.join('')}`,
);
console.log(`${lista.length} exercícios → ${out}`);

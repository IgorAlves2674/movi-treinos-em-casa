import { buildFrame } from '@/figure/build';
import type { FigureAnimation, FigureMuscle } from '@/figure/types';

import alongamentos from './alongamentos.json';
import data from './exercicios.json';
import barraKettlebellElastico from './barra_kettlebell_elastico.json';
import cardioEquipamento from './cardio_equipamento.json';
import halteres from './halteres.json';
import pesoCorporal from './peso_corporal.json';
import {
  EQUIPAMENTOS,
  EQUIPAMENTOS_SEMPRE_DISPONIVEIS,
  MUSCULOS,
  PADROES_MOVIMENTO,
  type ArquivoExercicios,
  type Exercicio,
  type Musculo,
} from './types';

export * from './types';

// O banco é dividido em arquivos por tipo; todos têm a mesma versão.
const arquivos = [data, pesoCorporal, halteres, barraKettlebellElastico, cardioEquipamento, alongamentos] as unknown as ArquivoExercicios[];

export const VERSAO_EXERCICIOS = arquivos[0].versao;
export const EXERCICIOS: readonly Exercicio[] = arquivos.flatMap((a) => a.exercicios);

const porId = new Map(EXERCICIOS.map((e) => [e.id, e]));

export function getExercicio(id: string): Exercicio | undefined {
  return porId.get(id);
}

/** Músculo do banco → parte que o boneco sabe pintar de verde. */
const MUSCULO_NO_BONECO: Partial<Record<Musculo, FigureMuscle>> = {
  peitoral: 'peitoral',
  deltoide_anterior: 'deltoides',
  deltoide_lateral: 'deltoides',
  deltoide_posterior: 'deltoides',
  biceps: 'biceps',
  triceps: 'triceps',
  dorsais: 'dorsais',
  trapezio: 'trapezio',
  lombar: 'lombar',
  abdomen: 'abdomen',
  obliquos: 'abdomen',
  gluteos: 'gluteos',
  quadriceps: 'quadriceps',
  posteriores_coxa: 'posteriores_coxa',
  panturrilhas: 'panturrilhas',
};

const animCache = new WeakMap<Exercicio, FigureAnimation>();

/**
 * Converte o exercício na animação que o boneco entende. Devolve sempre o mesmo
 * objeto para o mesmo exercício, senão a animação recomeça a cada nova renderização.
 */
export function animacaoDoBoneco(e: Exercicio): FigureAnimation {
  const cached = animCache.get(e);
  if (cached) return cached;
  const principal = MUSCULO_NO_BONECO[e.musculo_principal];
  const anim: FigureAnimation = {
    durationMs: e.animacao.duracao_ms,
    views: e.vistas,
    highlight: e.animacao.destaque ?? (principal ? [principal] : []),
    props: e.animacao.props,
    motion: e.animacao.movimento,
  };
  animCache.set(e, anim);
  return anim;
}

/**
 * Confere o banco de exercícios. Devolve a lista de problemas (vazia = tudo certo).
 * Roda com `npm run check:content`.
 */
export function validarExercicios(lista: readonly Exercicio[] = EXERCICIOS): string[] {
  const erros: string[] = [];
  const ids = new Set<string>();
  const equipValidos = new Set<string>([...EQUIPAMENTOS, ...EQUIPAMENTOS_SEMPRE_DISPONIVEIS]);
  const musculos = new Set<string>(MUSCULOS);

  for (const e of lista) {
    const err = (msg: string) => erros.push(`${e.id}: ${msg}`);
    if (!/^[a-z0-9_]+$/.test(e.id)) err('id deve ter só letras minúsculas, números e _');
    if (ids.has(e.id)) err('id repetido');
    ids.add(e.id);
    if (!e.nome.trim()) err('sem nome');
    if (!musculos.has(e.musculo_principal)) err(`músculo principal inválido: ${e.musculo_principal}`);
    for (const m of e.musculos_secundarios) if (!musculos.has(m)) err(`músculo secundário inválido: ${m}`);
    if (!PADROES_MOVIMENTO.includes(e.padrao_movimento)) err(`padrão de movimento inválido: ${e.padrao_movimento}`);
    if (e.equipamentos.length === 0) err('equipamentos vazio (use [[]] para "sem equipamento")');
    for (const opcao of e.equipamentos)
      for (const item of opcao) if (!equipValidos.has(item)) err(`equipamento inválido: ${item}`);
    if (!(e.nivel >= 1 && e.nivel <= 5)) err('nível deve ser de 1 a 5');
    if (e.vistas.length === 0) err('sem vistas');
    if ((e.posicao === 'deitado' || e.posicao === 'apoio_chao') && e.vistas.some((v) => v !== 'lateral'))
      err('exercício deitado/no chão deve ter só a vista lateral');
    if (e.passo_a_passo.length < 2) err('passo a passo muito curto');
    if (e.erros_comuns.length < 1) err('sem erros comuns');

    const mov = e.animacao.movimento;
    if (mov.type === 'keyframes' && (mov.poses.length < 2 || mov.poses.length > 4))
      err('animação deve ter de 2 a 4 poses-chave');
    if (mov.type === 'keyframes' && new Set(mov.poses.map((p) => p.an.pt)).size > 1)
      err('todas as poses devem usar o mesmo ponto preso (an.pt)');

    // Geometria: nenhuma parte atravessa o chão; algo encosta no chão em algum momento.
    const anim = animacaoDoBoneco(e);
    let maisBaixo = -Infinity; // em coordenadas de tela, y maior = mais baixo
    let tocouChao = false;
    for (let i = 0; i < 24; i++) {
      const { points } = buildFrame(anim, i / 24, 'lateral');
      const y = Math.max(...points.map((p) => p[1]));
      maisBaixo = Math.max(maisBaixo, y);
      if (y > -8) tocouChao = true;
    }
    if (maisBaixo > 6) err(`o boneco atravessa o chão (${maisBaixo.toFixed(1)} abaixo)`);
    // Pendurado na barra fixa (barra alta) é o único caso em que o boneco pode não tocar o chão.
    const pendurado = e.animacao.props?.bar && !e.animacao.props.bar.posts;
    if (!tocouChao && !pendurado) err('o boneco nunca encosta no chão');
  }

  for (const e of lista) {
    for (const ref of [e.variacao_mais_facil, e.variacao_mais_dificil])
      if (ref && !ids.has(ref)) erros.push(`${e.id}: variação inexistente: ${ref}`);
  }
  return erros;
}

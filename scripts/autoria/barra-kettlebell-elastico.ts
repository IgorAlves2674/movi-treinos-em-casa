/// <reference types="node" />
/**
 * Gera o arquivo de exercícios deste lote (poses calculadas + textos):
 * barra com anilhas, kettlebell, elástico, miniband e barra fixa.
 * Uso (na pasta movi-app): npx tsx scripts/autoria/barra-kettlebell-elastico.ts
 * Edite aqui e rode de novo em vez de mexer no JSON à mão.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { addv, ik, legTo, ordered, r, toJson, upv, type P2 } from './lib';

const DIR = 'src/content/exercises/';
const OUT = DIR + 'barra_kettlebell_elastico.json';
type Any = Record<string, any>;
const banco: Any[] = ['exercicios.json', 'peso_corporal.json', 'halteres.json'].flatMap(
  (f) => JSON.parse(readFileSync(DIR + f, 'utf-8')).exercicios,
);
const poses = (id: string): Any[] => banco.find((e) => e.id === id)!.animacao.movimento.poses;

const ex: Any[] = [];
const kf = (...p: Any[]) => ({ type: 'keyframes', poses: p });
const ANK = (x = 0, y = 10) => ({ pt: 'ankle', x: r(x), y: r(y) });
const STAND = { torso: 0, thigh: 0, shin: 0, foot: 0, arm: 0, fore: -10, armAbd: 6, foreAbd: 6, legAbd: 3 };
const CLASP = { arm: -20, fore: -140, armAbd: 0, foreAbd: -21 };
function add(e: Any) {
  ex.push({
    apelidos: [],
    musculos_secundarios: [],
    unidade: 'repeticoes',
    variacao_mais_facil: null,
    variacao_mais_dificil: null,
    impacto: 'baixo',
    barulho: 'baixo',
    unilateral: false,
    ...e,
  });
}
const anim = (duracao_ms: number, props: Any, movimento: Any, destaque?: string[]) => ({
  tipo: 'boneco',
  duracao_ms,
  props,
  ...(destaque ? { destaque } : {}),
  movimento,
});
/** Copia poses trocando braços (inclusive os valores próprios de cada lado). */
const withArms = (ps: Any[], arms: Any) =>
  ps.map((p) => {
    const o: Any = { ...p, ...arms };
    for (const side of ['right', 'left'])
      if (p[side]) {
        const s = { ...p[side] };
        for (const k of ['arm', 'fore', 'armAbd', 'foreAbd']) delete s[k];
        o[side] = s;
      }
    return o;
  });
const BARRA = [['barra_anilhas']];
const KB = [['kettlebell']];
const ELASTICO = [['elastico_alca']];

// ======================= BARRA COM ANILHAS =======================
{
  // Barra nas costas: mãos ao lado dos ombros, cotovelos para baixo e para trás.
  const back = { arm: 35, fore: -150, armAbd: 55, foreAbd: -40 };
  add({
    id: 'agachamento_barra',
    nome: 'Agachamento com barra',
    apelidos: ['agachamento livre com barra', 'back squat'],
    musculo_principal: 'quadriceps',
    musculos_secundarios: ['gluteos', 'posteriores_coxa', 'lombar'],
    padrao_movimento: 'agachar',
    equipamentos: BARRA,
    nivel: 3,
    variacao_mais_facil: 'agachamento_goblet',
    posicao: 'em_pe',
    vistas: ['lateral', 'frente', 'costas'],
    animacao: anim(3000, { barbell: 'back' }, kf(...withArms(poses('agachamento_livre'), back))),
    passo_a_passo: [
      'Apoie a barra nas costas, logo abaixo da nuca, segurando com as mãos um pouco mais abertas que os ombros.',
      'Afaste os pés na largura dos ombros, pontas levemente para fora.',
      'Leve o quadril para trás e para baixo até as coxas ficarem perto da horizontal.',
      'Empurre o chão e suba, mantendo o peito aberto.',
    ],
    erros_comuns: ['Arredondar as costas na descida.', 'Tirar os calcanhares do chão.', 'Deixar os joelhos caírem para dentro.'],
  });
}

{
  // Terra: barra no chão (anilhas encostando), mãos na frente das canelas.
  const t = 65;
  const S: P2 = [30, 151];
  const H = addv(S, upv(t), -100);
  const bottom = { ...STAND, torso: t, ...legTo(H, [0, 10], 1, 0), arm: -t, fore: 0, armAbd: 6, foreAbd: 6, an: ANK() };
  add({
    id: 'levantamento_terra',
    nome: 'Levantamento terra',
    apelidos: ['terra', 'deadlift'],
    musculo_principal: 'posteriores_coxa',
    musculos_secundarios: ['gluteos', 'lombar', 'quadriceps', 'trapezio'],
    padrao_movimento: 'dobradica_quadril',
    equipamentos: BARRA,
    nivel: 3,
    variacao_mais_facil: 'terra_romeno_barra',
    posicao: 'em_pe',
    vistas: ['lateral', 'frente'],
    animacao: anim(3200, { barbell: 'hands' }, kf(bottom, { ...STAND, arm: 0, fore: 0, an: ANK() }), ['posteriores_coxa', 'gluteos', 'lombar']),
    passo_a_passo: [
      'Fique com o meio dos pés embaixo da barra e segure-a com as mãos na largura dos ombros.',
      'Dobre os joelhos até as canelas encostarem na barra, com as costas retas e o peito aberto.',
      'Empurre o chão com os pés e suba a barra rente às pernas até ficar em pé.',
      'Desça levando o quadril para trás, com a barra perto do corpo, até encostá-la no chão.',
    ],
    erros_comuns: ['Arredondar as costas.', 'Afastar a barra do corpo.', 'Subir o quadril antes do peito.'],
  });
}

add({
  id: 'terra_romeno_barra',
  nome: 'Terra romeno com barra',
  apelidos: ['stiff com barra', 'romanian deadlift'],
  musculo_principal: 'posteriores_coxa',
  musculos_secundarios: ['gluteos', 'lombar'],
  padrao_movimento: 'dobradica_quadril',
  equipamentos: BARRA,
  nivel: 3,
  variacao_mais_facil: 'stiff_halteres',
  variacao_mais_dificil: 'levantamento_terra',
  posicao: 'em_pe',
  vistas: ['lateral'],
  animacao: anim(
    3000,
    { barbell: 'hands' },
    kf({ ...STAND, arm: 0, fore: 0, an: ANK() }, { ...STAND, torso: 75, thigh: -15, shin: 23, foot: -8, arm: -75, fore: 0, an: ANK() }),
    ['posteriores_coxa', 'gluteos'],
  ),
  passo_a_passo: [
    'Em pé, segure a barra na frente das coxas, mãos na largura dos ombros.',
    'Com os joelhos levemente dobrados, leve o quadril para trás e desça a barra rente às pernas.',
    'Desça até sentir a parte de trás das coxas alongar, com as costas retas.',
    'Suba empurrando o quadril para a frente.',
  ],
  erros_comuns: ['Arredondar as costas.', 'Dobrar demais os joelhos, virando um agachamento.'],
});

add({
  id: 'remada_curvada_barra',
  nome: 'Remada curvada com barra',
  apelidos: ['remada com barra'],
  musculo_principal: 'dorsais',
  musculos_secundarios: ['biceps', 'trapezio', 'deltoide_posterior', 'lombar'],
  padrao_movimento: 'puxar',
  equipamentos: BARRA,
  nivel: 3,
  variacao_mais_facil: 'remada_curvada_halteres',
  posicao: 'em_pe',
  vistas: ['lateral', 'costas'],
  animacao: anim(2600, { barbell: 'hands' }, kf(...poses('remada_curvada_halteres').map((p) => ({ ...p, armAbd: 4, foreAbd: 4 }))), ['dorsais', 'biceps']),
  passo_a_passo: [
    'Segure a barra com as mãos um pouco mais abertas que os ombros.',
    'Dobre levemente os joelhos e incline o tronco à frente, costas retas.',
    'Puxe a barra em direção ao umbigo, levando os cotovelos para trás.',
    'Desça devagar até esticar os braços.',
  ],
  erros_comuns: ['Levantar o tronco para ajudar a puxar.', 'Arredondar as costas.'],
});

add({
  id: 'desenvolvimento_barra',
  nome: 'Desenvolvimento com barra em pé',
  apelidos: ['desenvolvimento militar', 'overhead press'],
  musculo_principal: 'deltoide_anterior',
  musculos_secundarios: ['deltoide_lateral', 'triceps', 'trapezio'],
  padrao_movimento: 'empurrar',
  equipamentos: BARRA,
  nivel: 3,
  variacao_mais_facil: 'desenvolvimento_halteres',
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: anim(
    2600,
    { barbell: 'hands' },
    kf({ ...STAND, arm: -25, fore: -145, armAbd: 30, foreAbd: 5, an: ANK() }, { ...STAND, arm: -180, fore: 0, armAbd: 10, foreAbd: 8, an: ANK() }),
    ['deltoides', 'triceps'],
  ),
  passo_a_passo: [
    'Em pé, apoie a barra na frente dos ombros, mãos um pouco mais abertas que eles.',
    'Contraia o abdômen e os glúteos.',
    'Empurre a barra para cima, passando perto do rosto, até esticar os braços.',
    'Desça devagar até a frente dos ombros.',
  ],
  erros_comuns: ['Arquear a lombar.', 'Empurrar a barra para a frente em vez de para cima.'],
});

add({
  id: 'supino_chao_barra',
  nome: 'Supino no chão com barra',
  apelidos: ['floor press com barra'],
  musculo_principal: 'peitoral',
  musculos_secundarios: ['triceps', 'deltoide_anterior'],
  padrao_movimento: 'empurrar',
  equipamentos: BARRA,
  nivel: 3,
  variacao_mais_facil: 'supino_chao_halteres',
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: anim(2600, { mat: true, barbell: 'hands' }, kf(...poses('supino_chao_halteres'))),
  passo_a_passo: [
    'Deite de barriga para cima com os joelhos dobrados, segurando a barra acima do peito, braços esticados.',
    'Desça a barra até os cotovelos encostarem de leve no chão.',
    'Empurre a barra de volta até esticar os braços.',
  ],
  erros_comuns: ['Bater os cotovelos com força no chão.', 'Deixar a barra descer perto do pescoço.'],
});

add({
  id: 'rosca_direta_barra',
  nome: 'Rosca direta com barra',
  apelidos: ['rosca com barra'],
  musculo_principal: 'biceps',
  musculos_secundarios: ['antebraco'],
  padrao_movimento: 'puxar',
  equipamentos: BARRA,
  nivel: 2,
  variacao_mais_facil: 'rosca_biceps',
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: anim(2400, { barbell: 'hands' }, kf(...poses('rosca_biceps').map((p) => ({ ...p, armAbd: 8, foreAbd: 6 })))),
  passo_a_passo: [
    'Em pé, segure a barra com as palmas para a frente, mãos na largura dos ombros.',
    'Com os cotovelos colados ao corpo, suba a barra em direção ao peito.',
    'Desça devagar até esticar os braços.',
  ],
  erros_comuns: ['Balançar o tronco para subir a barra.', 'Afastar os cotovelos do corpo.'],
});

add({
  id: 'elevacao_pelvica_barra',
  nome: 'Elevação pélvica com barra',
  apelidos: ['hip thrust no chão', 'ponte com barra'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['posteriores_coxa', 'lombar'],
  padrao_movimento: 'dobradica_quadril',
  equipamentos: BARRA,
  nivel: 3,
  variacao_mais_facil: 'ponte_halter',
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: anim(2800, { mat: true, barbell: 'hands' }, kf(...poses('ponte_halter').map((p) => ({ ...p, armAbd: 20, foreAbd: 10 })))),
  passo_a_passo: [
    'Deite de barriga para cima com os joelhos dobrados e role a barra até em cima do quadril (use uma toalha para proteger).',
    'Segure a barra com as duas mãos.',
    'Empurre o chão com os calcanhares e suba o quadril até alinhar joelhos, quadril e ombros.',
    'Desça devagar.',
  ],
  erros_comuns: ['Arquear a lombar no alto.', 'Empurrar com a ponta dos pés.'],
});

// ======================= KETTLEBELL =======================
const HINGE = { torso: 70, thigh: -20, shin: 25, foot: -5, legAbd: 8, an: ANK() };
add({
  id: 'swing_kettlebell',
  nome: 'Swing com kettlebell',
  apelidos: ['kettlebell swing', 'balanço'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['posteriores_coxa', 'lombar', 'deltoide_anterior'],
  padrao_movimento: 'dobradica_quadril',
  equipamentos: KB,
  nivel: 3,
  variacao_mais_facil: 'terra_sumo_kettlebell',
  variacao_mais_dificil: 'swing_uma_mao',
  posicao: 'em_pe',
  vistas: ['lateral'],
  animacao: anim(
    1600,
    { kettlebell: 'both' },
    kf({ ...HINGE, arm: -50, fore: 0, armAbd: 0, foreAbd: -8 }, { ...STAND, legAbd: 8, arm: -90, fore: 0, armAbd: 0, foreAbd: -8, an: ANK() }),
    ['gluteos', 'posteriores_coxa'],
  ),
  passo_a_passo: [
    'Com os pés um pouco mais afastados que os ombros, segure o kettlebell com as duas mãos.',
    'Leve o quadril para trás, deixando o kettlebell passar entre as pernas.',
    'Empurre o quadril para a frente com força, fazendo o kettlebell subir até a altura do peito.',
    'Deixe ele descer e já emende o próximo balanço.',
  ],
  erros_comuns: ['Agachar em vez de levar o quadril para trás.', 'Levantar o peso com os braços.', 'Arredondar as costas.'],
});

add({
  id: 'swing_uma_mao',
  nome: 'Swing com uma mão',
  apelidos: ['swing unilateral'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['posteriores_coxa', 'lombar', 'obliquos'],
  padrao_movimento: 'dobradica_quadril',
  equipamentos: KB,
  nivel: 4,
  variacao_mais_facil: 'swing_kettlebell',
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: anim(
    1600,
    { kettlebell: 'right' },
    kf(
      { ...HINGE, arm: -50, fore: 0, armAbd: 0, foreAbd: -4, left: { arm: -30, armAbd: 30, fore: -10, foreAbd: 30 } },
      { ...STAND, legAbd: 8, arm: -90, fore: 0, armAbd: 0, foreAbd: -4, left: { arm: 0, armAbd: 30, fore: -10, foreAbd: 30 }, an: ANK() },
    ),
    ['gluteos', 'posteriores_coxa'],
  ),
  passo_a_passo: [
    'Segure o kettlebell com uma mão, pés um pouco mais afastados que os ombros.',
    'Leve o quadril para trás, deixando o kettlebell passar entre as pernas.',
    'Empurre o quadril para a frente e deixe o kettlebell subir até a altura do peito.',
    'Mantenha os ombros retos, sem girar o tronco. Faça as repetições e troque de mão.',
  ],
  erros_comuns: ['Girar o tronco para o lado do peso.', 'Puxar o kettlebell com o braço.'],
});

add({
  id: 'terra_sumo_kettlebell',
  nome: 'Terra sumô com kettlebell',
  apelidos: ['levantamento sumô'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['quadriceps', 'adutores', 'posteriores_coxa'],
  padrao_movimento: 'dobradica_quadril',
  equipamentos: [['kettlebell'], ['halteres']],
  nivel: 2,
  variacao_mais_dificil: 'swing_kettlebell',
  posicao: 'em_pe',
  vistas: ['frente', 'lateral'],
  animacao: anim(
    2800,
    { kettlebell: 'both', kettlebellHang: 'down' },
    kf(
      { ...STAND, torso: 45, thigh: -58, shin: 78, foot: -20, legAbd: 22, arm: -45, fore: 0, armAbd: 0, foreAbd: -8, an: ANK() },
      { ...STAND, legAbd: 18, arm: 0, fore: 0, armAbd: 0, foreAbd: -8, an: ANK() },
    ),
    ['gluteos', 'quadriceps'],
  ),
  passo_a_passo: [
    'Afaste bem os pés, com as pontas para fora, e deixe o kettlebell no chão entre eles.',
    'Agache com as costas retas e segure a alça com as duas mãos.',
    'Suba empurrando o chão até ficar em pé, com os braços esticados.',
    'Desça devagar até encostar o kettlebell no chão.',
  ],
  erros_comuns: ['Arredondar as costas para pegar o peso.', 'Deixar os joelhos caírem para dentro.'],
});

{
  const leftFree = { arm: 0, fore: -10, armAbd: 25, foreAbd: 25 };
  const low = { ...STAND, torso: 55, thigh: -40, shin: 55, foot: -15, legAbd: 8, right: { arm: -55, fore: 0, armAbd: 0, foreAbd: -4 }, left: leftFree, an: ANK() };
  const rack = { ...STAND, legAbd: 8, right: { arm: -15, fore: -150, armAbd: 10, foreAbd: 0 }, left: leftFree, an: ANK() };
  const press = { ...STAND, legAbd: 8, right: { arm: -180, fore: 0, armAbd: 8, foreAbd: 6 }, left: leftFree, an: ANK() };
  add({
    id: 'clean_press_kettlebell',
    nome: 'Clean com desenvolvimento',
    apelidos: ['clean and press', 'arranque e desenvolvimento'],
    musculo_principal: 'corpo_inteiro',
    musculos_secundarios: ['gluteos', 'deltoide_anterior', 'triceps', 'posteriores_coxa'],
    padrao_movimento: 'empurrar',
    equipamentos: KB,
    nivel: 4,
    unilateral: true,
    posicao: 'em_pe',
    vistas: ['lateral', 'frente'],
    animacao: anim(4000, { kettlebell: 'right' }, kf(low, rack, press, rack), ['gluteos', 'deltoides']),
    passo_a_passo: [
      'Com o kettlebell no chão entre os pés, leve o quadril para trás e segure a alça com uma mão.',
      'Suba com força e traga o kettlebell até a frente do ombro, girando a mão por baixo da alça.',
      'Empurre o kettlebell acima da cabeça até esticar o braço.',
      'Volte à frente do ombro e desça até o chão. Faça as repetições e troque de mão.',
    ],
    erros_comuns: ['Deixar o kettlebell bater no antebraço.', 'Arquear a lombar no desenvolvimento.'],
  });
}

{
  const front = { arm: -40, fore: -115, armAbd: 0, foreAbd: -20 };
  const back = { arm: -170, fore: -120, armAbd: 30, foreAbd: -40 };
  const side = (s: 'right' | 'left') => ({
    [s]: { arm: -150, fore: -60, armAbd: 60, foreAbd: 0 },
    [s === 'right' ? 'left' : 'right']: { arm: -140, fore: -110, armAbd: 5, foreAbd: 60 },
  });
  const st = { ...STAND, legAbd: 6, an: ANK() };
  add({
    id: 'halo_kettlebell',
    nome: 'Halo com kettlebell',
    apelidos: ['halo', 'volta na cabeça'],
    musculo_principal: 'deltoide_anterior',
    musculos_secundarios: ['trapezio', 'triceps', 'abdomen'],
    padrao_movimento: 'mobilidade',
    equipamentos: [['kettlebell'], ['halteres']],
    nivel: 2,
    posicao: 'em_pe',
    vistas: ['frente', 'lateral'],
    animacao: anim(3200, { kettlebell: 'both', kettlebellHang: 'up' }, kf({ ...st, ...front }, { ...st, ...side('left') }, { ...st, ...back }, { ...st, ...side('right') }), ['deltoides']),
    passo_a_passo: [
      'Em pé, segure o kettlebell de cabeça para baixo pelas laterais da alça, na frente do peito.',
      'Passe o kettlebell em volta da cabeça, bem perto dela, até voltar à frente.',
      'Mantenha o abdômen firme e o tronco parado.',
      'Alterne o sentido a cada volta.',
    ],
    erros_comuns: ['Inclinar o tronco ou a cabeça para abrir espaço.', 'Fazer círculos largos, longe da cabeça.'],
  });
}

add({
  id: 'agachamento_rack_kettlebell',
  nome: 'Agachamento com kettlebell no ombro',
  apelidos: ['agachamento rack', 'agachamento frontal com kettlebell'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['gluteos', 'obliquos', 'abdomen'],
  padrao_movimento: 'agachar',
  equipamentos: KB,
  nivel: 3,
  variacao_mais_facil: 'agachamento_goblet',
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente', 'costas'],
  animacao: anim(
    3000,
    { kettlebell: 'right' },
    kf(...withArms(poses('agachamento_livre'), {}).map((p) => ({ ...p, right: { arm: -15, fore: -150, armAbd: 10, foreAbd: 0 }, left: { arm: p.torso ? -80 : -40, fore: 0, armAbd: 10, foreAbd: 10 } }))),
  ),
  passo_a_passo: [
    'Segure o kettlebell na frente de um ombro, com o cotovelo junto ao corpo.',
    'Estique o outro braço à frente ou para o lado para equilibrar.',
    'Agache até as coxas ficarem perto da horizontal, sem deixar o tronco tombar para o lado do peso.',
    'Suba. Faça as repetições e troque de lado.',
  ],
  erros_comuns: ['Inclinar o tronco para o lado do kettlebell.', 'Deixar o cotovelo abrir e o peso cair para a frente.'],
});

// ======================= ELÁSTICO =======================
{
  const HIP = { pt: 'hip', x: 0, y: 27 };
  const seat = { torso: 0, thigh: -90, shin: 0, foot: 0, legAbd: 4, armAbd: 6, foreAbd: 6, an: HIP };
  add({
    id: 'remada_elastico',
    nome: 'Remada sentado com elástico',
    apelidos: ['remada com elástico', 'remada baixa'],
    musculo_principal: 'dorsais',
    musculos_secundarios: ['biceps', 'trapezio', 'deltoide_posterior'],
    padrao_movimento: 'puxar',
    equipamentos: ELASTICO,
    nivel: 1,
    posicao: 'sentado',
    vistas: ['lateral'],
    animacao: anim(2600, { mat: true, band: 'feet' }, kf({ ...seat, arm: -90, fore: 0 }, { ...seat, arm: 40, fore: -130 }), ['dorsais', 'biceps']),
    passo_a_passo: [
      'Sente no chão com as pernas esticadas e passe o elástico pela sola dos pés.',
      'Segure as alças com os braços esticados e o tronco reto.',
      'Puxe as alças em direção à barriga, levando os cotovelos para trás e juntando as escápulas.',
      'Volte devagar até esticar os braços.',
    ],
    erros_comuns: ['Jogar o tronco para trás para puxar.', 'Subir os ombros em direção às orelhas.'],
  });
}

add({
  id: 'abertura_elastico',
  nome: 'Abertura de braços com elástico',
  apelidos: ['pull-apart', 'crucifixo inverso com elástico'],
  musculo_principal: 'deltoide_posterior',
  musculos_secundarios: ['trapezio', 'dorsais'],
  padrao_movimento: 'puxar',
  equipamentos: ELASTICO,
  nivel: 1,
  posicao: 'em_pe',
  vistas: ['frente', 'lateral', 'costas'],
  animacao: anim(
    2200,
    { band: 'hands' },
    kf({ ...STAND, arm: -90, fore: 0, armAbd: 8, foreAbd: 8, an: ANK() }, { ...STAND, arm: -90, fore: 0, armAbd: 84, foreAbd: 84, an: ANK() }),
    ['deltoides', 'trapezio'],
  ),
  passo_a_passo: [
    'Em pé, segure o elástico com as duas mãos à frente do peito, braços esticados.',
    'Abra os braços para os lados, esticando o elástico até ele encostar no peito.',
    'Aperte as escápulas no fim do movimento.',
    'Volte devagar.',
  ],
  erros_comuns: ['Dobrar os cotovelos.', 'Arquear a lombar para abrir mais.'],
});

add({
  id: 'rosca_elastico',
  nome: 'Rosca com elástico',
  apelidos: ['rosca bíceps com elástico'],
  musculo_principal: 'biceps',
  musculos_secundarios: ['antebraco'],
  padrao_movimento: 'puxar',
  equipamentos: ELASTICO,
  nivel: 1,
  variacao_mais_dificil: 'rosca_biceps',
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: anim(2400, { band: 'feet' }, kf(...poses('rosca_biceps'))),
  passo_a_passo: [
    'Pise no meio do elástico com os pés na largura do quadril e segure as alças.',
    'Com os cotovelos colados ao corpo, dobre os braços e suba as mãos até os ombros.',
    'Desça devagar, controlando o elástico.',
  ],
  erros_comuns: ['Afastar os cotovelos do corpo.', 'Deixar o elástico puxar os braços de volta de uma vez.'],
});

add({
  id: 'triceps_elastico',
  nome: 'Tríceps com elástico na porta',
  apelidos: ['tríceps pulley com elástico', 'tríceps corda com elástico'],
  musculo_principal: 'triceps',
  padrao_movimento: 'empurrar',
  equipamentos: ELASTICO,
  nivel: 1,
  posicao: 'em_pe',
  vistas: ['lateral'],
  animacao: anim(
    2200,
    { band: { x: 80, y: 345 } },
    kf({ ...STAND, torso: 10, arm: -12, fore: -110, armAbd: 4, foreAbd: 4, an: ANK() }, { ...STAND, torso: 10, arm: -12, fore: 0, armAbd: 4, foreAbd: 4, an: ANK() }),
  ),
  passo_a_passo: [
    'Prenda o elástico no alto da porta (use a âncora de porta do elástico) e fique de frente para ela.',
    'Segure as alças com os cotovelos colados ao lado do corpo.',
    'Estique os cotovelos empurrando as mãos para baixo.',
    'Volte devagar até os antebraços ficarem na horizontal.',
  ],
  erros_comuns: ['Mexer os ombros e os cotovelos junto.', 'Inclinar demais o tronco sobre as mãos.'],
});

add({
  id: 'desenvolvimento_elastico',
  nome: 'Desenvolvimento com elástico',
  apelidos: ['elevação acima da cabeça com elástico'],
  musculo_principal: 'deltoide_anterior',
  musculos_secundarios: ['deltoide_lateral', 'triceps'],
  padrao_movimento: 'empurrar',
  equipamentos: ELASTICO,
  nivel: 1,
  variacao_mais_dificil: 'desenvolvimento_halteres',
  posicao: 'em_pe',
  vistas: ['frente', 'lateral'],
  animacao: anim(2600, { band: 'feet' }, kf(...poses('desenvolvimento_halteres'))),
  passo_a_passo: [
    'Pise no meio do elástico e segure as alças na altura dos ombros.',
    'Empurre as mãos para cima até esticar os braços.',
    'Desça devagar até a altura dos ombros.',
  ],
  erros_comuns: ['Arquear a lombar.', 'Deixar os cotovelos irem muito para a frente.'],
});

// ======================= MINIBAND =======================
{
  const AN = { pt: 'ankle', side: 'left', x: 0, y: 10 };
  const half = { ...STAND, torso: 22, thigh: -38, shin: 55, foot: -17, legAbd: 7, ...CLASP, an: AN };
  add({
    id: 'caminhada_lateral_miniband',
    nome: 'Caminhada lateral com miniband',
    apelidos: ['passo lateral com elástico', 'monster walk lateral'],
    musculo_principal: 'gluteos',
    musculos_secundarios: ['quadriceps'],
    padrao_movimento: 'agachar',
    equipamentos: [['miniband']],
    nivel: 1,
    posicao: 'em_pe',
    vistas: ['frente', 'costas', 'lateral'],
    animacao: anim(1800, { miniband: 'knees' }, kf(half, { ...half, right: { legAbd: 20 } })),
    passo_a_passo: [
      'Coloque a miniband logo acima dos joelhos e fique em meio agachamento.',
      'Dê um passo para o lado, mantendo a tensão no elástico.',
      'Traga o outro pé até a largura do quadril, sem juntar os pés.',
      'Ande alguns passos para um lado e volte para o outro.',
    ],
    erros_comuns: ['Subir o corpo entre os passos.', 'Deixar os joelhos caírem para dentro.'],
  });
}

{
  const lie = { torso: 90, roll: -90, thigh: 45, shin: 90, foot: -45, arm: 0, fore: 0, armAbd: 6, legAbd: 3, left: { arm: -180, armAbd: 0 }, an: { pt: 'hip', x: 0, y: 36 } };
  add({
    id: 'concha_miniband',
    nome: 'Concha com miniband',
    apelidos: ['clamshell', 'abertura de joelhos deitado'],
    musculo_principal: 'gluteos',
    padrao_movimento: 'core',
    equipamentos: [['miniband']],
    nivel: 1,
    variacao_mais_facil: 'abducao_deitado',
    unilateral: true,
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: anim(2200, { mat: true, miniband: 'knees' }, kf(lie, { ...lie, right: { legAbd: 34 } })),
    passo_a_passo: [
      'Coloque a miniband acima dos joelhos e deite de lado, com os joelhos dobrados e os pés juntos.',
      'Apoie a cabeça no braço de baixo.',
      'Mantendo os pés encostados, abra o joelho de cima o máximo que conseguir sem girar o quadril.',
      'Feche devagar. Faça as repetições e troque de lado.',
    ],
    erros_comuns: ['Girar o quadril para trás ao abrir.', 'Separar os pés.'],
  });
}

{
  const [down, up] = poses('ponte_gluteo');
  add({
    id: 'ponte_abducao_miniband',
    nome: 'Ponte com abertura e miniband',
    apelidos: ['ponte com elástico'],
    musculo_principal: 'gluteos',
    musculos_secundarios: ['posteriores_coxa'],
    padrao_movimento: 'dobradica_quadril',
    equipamentos: [['miniband']],
    nivel: 2,
    variacao_mais_facil: 'ponte_gluteo',
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: anim(3600, { mat: true, miniband: 'knees' }, kf(down, up, { ...up, legAbd: 16 }, up)),
    passo_a_passo: [
      'Coloque a miniband acima dos joelhos e deite de barriga para cima, joelhos dobrados.',
      'Suba o quadril até alinhar joelhos, quadril e ombros.',
      'Lá em cima, abra os joelhos contra o elástico e feche de novo.',
      'Desça devagar e repita.',
    ],
    erros_comuns: ['Deixar o quadril cair ao abrir os joelhos.', 'Arquear a lombar.'],
  });
}

// ======================= BARRA FIXA =======================
const BAR_Y = 420;
const HANG = { pt: 'hand', x: 0, y: BAR_Y };
const LEGS_HANG = { thigh: 8, shin: 45, foot: 25, legAbd: 4 };
function hangPose(abd: number, shoulderY: number, torso: number) {
  // Braço e antebraço no plano lateral ficam mais curtos quando abertos (abd).
  const c = Math.cos((abd * Math.PI) / 180);
  const S: P2 = [-4, shoulderY];
  const s = ik(S, [0, BAR_Y], 55 * c, 56 * c, 1);
  return { torso, ...LEGS_HANG, arm: r(s.a1 - torso), fore: r(s.a2 - s.a1), armAbd: abd, foreAbd: abd, an: HANG };
}
const pullBottom = (abd: number) => hangPose(abd, BAR_Y - 111 * Math.cos((abd * Math.PI) / 180) + 1, 0);
const pullTop = (abd: number) => hangPose(abd, BAR_Y - 28, -8);
const BARRA_FIXA = [['barra_fixa']];

add({
  id: 'barra_fixa',
  nome: 'Barra fixa',
  apelidos: ['pull-up', 'barra pronada'],
  musculo_principal: 'dorsais',
  musculos_secundarios: ['biceps', 'trapezio', 'deltoide_posterior'],
  padrao_movimento: 'puxar',
  equipamentos: BARRA_FIXA,
  nivel: 4,
  variacao_mais_facil: 'barra_negativa',
  posicao: 'em_pe',
  vistas: ['lateral', 'costas', 'frente'],
  animacao: anim(2800, { bar: { x: 0, y: BAR_Y } }, kf(pullBottom(22), pullTop(22)), ['dorsais', 'biceps']),
  passo_a_passo: [
    'Segure a barra com as palmas viradas para a frente, mãos um pouco mais abertas que os ombros.',
    'Pendure-se com os braços esticados e os ombros firmes.',
    'Puxe o corpo para cima até o queixo passar da barra, levando os cotovelos para baixo.',
    'Desça devagar até esticar os braços.',
  ],
  erros_comuns: ['Balançar o corpo para pegar impulso.', 'Subir só até a metade.'],
});

add({
  id: 'barra_supinada',
  nome: 'Barra fixa supinada',
  apelidos: ['chin-up', 'barra com palmas para você'],
  musculo_principal: 'dorsais',
  musculos_secundarios: ['biceps', 'trapezio'],
  padrao_movimento: 'puxar',
  equipamentos: BARRA_FIXA,
  nivel: 4,
  variacao_mais_facil: 'barra_negativa',
  posicao: 'em_pe',
  vistas: ['lateral', 'costas', 'frente'],
  animacao: anim(2800, { bar: { x: 0, y: BAR_Y } }, kf(pullBottom(8), pullTop(8)), ['dorsais', 'biceps']),
  passo_a_passo: [
    'Segure a barra com as palmas viradas para você, mãos na largura dos ombros.',
    'Pendure-se com os braços esticados.',
    'Puxe o corpo para cima até o queixo passar da barra.',
    'Desça devagar até esticar os braços.',
  ],
  erros_comuns: ['Balançar as pernas para subir.', 'Soltar o corpo de uma vez na descida.'],
});

add({
  id: 'barra_negativa',
  nome: 'Barra fixa negativa',
  apelidos: ['descida lenta na barra', 'negativa'],
  musculo_principal: 'dorsais',
  musculos_secundarios: ['biceps', 'trapezio'],
  padrao_movimento: 'puxar',
  equipamentos: BARRA_FIXA,
  nivel: 3,
  variacao_mais_facil: 'barra_australiana',
  variacao_mais_dificil: 'barra_fixa',
  posicao: 'em_pe',
  vistas: ['lateral', 'costas'],
  animacao: anim(4500, { bar: { x: 0, y: BAR_Y } }, kf(pullTop(22), pullBottom(22)), ['dorsais', 'biceps']),
  passo_a_passo: [
    'Suba numa cadeira firme e segure a barra já com o queixo acima dela.',
    'Tire os pés da cadeira e segure a posição no alto.',
    'Desça o mais devagar que conseguir, contando de 3 a 5 segundos, até esticar os braços.',
    'Apoie os pés de novo na cadeira para voltar ao alto e repita.',
  ],
  erros_comuns: ['Cair rápido no fim da descida.', 'Pular da cadeira em vez de começar parado no alto.'],
});

add({
  id: 'elevacao_joelhos_barra',
  nome: 'Elevação de joelhos pendurado',
  apelidos: ['abdominal na barra', 'knee raise'],
  musculo_principal: 'abdomen',
  musculos_secundarios: ['obliquos', 'antebraco'],
  padrao_movimento: 'core',
  equipamentos: BARRA_FIXA,
  nivel: 3,
  variacao_mais_facil: 'elevacao_pernas',
  posicao: 'em_pe',
  vistas: ['lateral'],
  animacao: anim(
    2600,
    { bar: { x: 0, y: BAR_Y } },
    kf(
      { ...pullBottom(16), thigh: 0, shin: 0, foot: 20 },
      { ...pullBottom(16), torso: -10, arm: r(pullBottom(16).arm + 10), thigh: -100, shin: 95, foot: 5 },
    ),
  ),
  passo_a_passo: [
    'Pendure-se na barra com os braços esticados e as pernas juntas.',
    'Suba os joelhos em direção ao peito, sem balançar o corpo.',
    'Desça as pernas devagar até esticar.',
  ],
  erros_comuns: ['Balançar o corpo para pegar impulso.', 'Soltar as pernas de uma vez.'],
});

{
  // Barra baixa: corpo reto deitado embaixo dela, calcanhares no chão.
  const bar: P2 = [0, 180];
  const SB: P2 = [-6, 145];
  const aB = Math.asin((SB[1] - 10) / 285);
  const ankle: P2 = [SB[0] + 285 * Math.cos(aB), 10];
  const pose = (shoulderY: number) => {
    const a = Math.asin((shoulderY - 10) / 285);
    const S: P2 = [ankle[0] - 285 * Math.cos(a), shoulderY];
    const torso = -90 + (a * 180) / Math.PI;
    const s = ik(S, bar, 55, 56, 1);
    return {
      torso: r(torso),
      thigh: r(torso),
      shin: 0,
      foot: r(-90 - torso),
      arm: r(s.a1 - torso),
      fore: r(s.a2 - s.a1),
      armAbd: 10,
      foreAbd: 6,
      legAbd: 4,
      an: { pt: 'hand', x: bar[0], y: bar[1] },
    };
  };
  add({
    id: 'barra_australiana',
    nome: 'Barra australiana',
    apelidos: ['remada invertida', 'australian pull-up'],
    musculo_principal: 'dorsais',
    musculos_secundarios: ['biceps', 'trapezio', 'deltoide_posterior', 'abdomen'],
    padrao_movimento: 'puxar',
    equipamentos: BARRA_FIXA,
    nivel: 2,
    variacao_mais_dificil: 'barra_negativa',
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: anim(2600, { bar: { x: bar[0], y: bar[1], posts: true } }, kf(pose(70), pose(SB[1])), ['dorsais', 'biceps']),
    passo_a_passo: [
      'Coloque a barra baixa, na altura da cintura, num suporte firme, e deite embaixo dela.',
      'Segure a barra com as mãos um pouco mais abertas que os ombros, calcanhares no chão e corpo reto.',
      'Puxe o peito até perto da barra, juntando as escápulas.',
      'Desça devagar até esticar os braços.',
    ],
    erros_comuns: ['Deixar o quadril cair.', 'Puxar com o pescoço esticado em direção à barra.'],
  });
}

writeFileSync(OUT, toJson({ versao: 1, exercicios: ex.map(ordered) }));
console.log(ex.length, 'exercícios');

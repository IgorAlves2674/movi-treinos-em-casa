/// <reference types="node" />
/**
 * Gera o arquivo de exercícios deste lote (poses calculadas + textos).
 * Uso (na pasta movi-app): npx tsx scripts/autoria/peso-corporal.ts
 * Edite aqui e rode de novo em vez de mexer no JSON à mão.
 */
import { writeFileSync } from 'node:fs';

import { ordered, toJson, ik, addv, armTo, dir, joints, legTo, r, shoulderOf, solve, upv, type P2 } from './lib';

const OUT = 'src/content/exercises/peso_corporal.json';

type Any = Record<string, any>;
const ex: Any[] = [];
const debug: Record<string, unknown> = {};

const STAND = { torso: 0, thigh: 0, shin: 0, foot: 0, arm: 0, fore: -10, armAbd: 6, foreAbd: 6, legAbd: 3 };
const CLASP = { arm: -20, fore: -140, armAbd: 0, foreAbd: -21 }; // mãos juntas no peito
const ANK = (x = 0, y = 10) => ({ pt: 'ankle', x: r(x), y: r(y) });
const kf = (...poses: Any[]) => ({ type: 'keyframes', poses });

function add(e: Any) {
  ex.push({
    id: e.id,
    nome: e.nome,
    apelidos: [],
    musculos_secundarios: [],
    equipamentos: [[]],
    unidade: 'repeticoes',
    variacao_mais_facil: null,
    variacao_mais_dificil: null,
    impacto: 'baixo',
    barulho: 'baixo',
    unilateral: false,
    ...e,
  });
}
const ALL = ['lateral', 'frente', 'costas'];

// ============ PERNAS E GLÚTEOS ============

add({
  id: 'agachamento_sumo',
  nome: 'Agachamento sumô',
  apelidos: ['sumô', 'agachamento aberto'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['adutores', 'gluteos'],
  variacao_mais_dificil: 'agachamento_sumo_halter',
  padrao_movimento: 'agachar',
  nivel: 2,
  variacao_mais_facil: 'agachamento_livre',
  posicao: 'em_pe',
  vistas: ['frente', 'lateral', 'costas'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 2800,
    destaque: ['quadriceps', 'gluteos'],
    movimento: kf(
      { ...STAND, torso: 5, ...CLASP, legAbd: 18, an: ANK() },
      { ...STAND, torso: 22, thigh: -70, shin: 100, foot: -30, ...CLASP, legAbd: 26, an: ANK() },
    ),
  },
  passo_a_passo: [
    'Afaste bem os pés, mais que a largura dos ombros, com as pontas viradas para fora.',
    'Junte as mãos à frente do peito e mantenha o tronco alto.',
    'Desça levando os joelhos para fora, na direção das pontas dos pés.',
    'Empurre o chão e suba até ficar em pé.',
  ],
  erros_comuns: ['Deixar os joelhos caírem para dentro.', 'Inclinar demais o tronco para a frente.'],
});

{
  // Pé de trás no assento da cadeira; pé da frente preso em (0,10).
  const R: P2 = [-150, 96];
  const top: P2 = [-55, 182];
  const bot: P2 = [-78, 112];
  const pose = (H: P2, torso: number) => ({
    ...STAND,
    torso,
    arm: -4,
    fore: -10,
    armAbd: 8,
    foreAbd: 8,
    right: legTo(H, [0, 10], 1, 0),
    left: legTo(H, R, 'down', 180),
    an: ANK(),
  });
  add({
    id: 'agachamento_bulgaro',
    nome: 'Agachamento búlgaro',
    apelidos: ['búlgaro', 'afundo com pé na cadeira'],
    musculo_principal: 'quadriceps',
    musculos_secundarios: ['gluteos', 'posteriores_coxa'],
    variacao_mais_dificil: 'bulgaro_halteres',
  padrao_movimento: 'avanco',
    equipamentos: [['cadeira']],
    nivel: 3,
    variacao_mais_facil: 'afundo',
    unilateral: true,
    posicao: 'em_pe',
    vistas: ['lateral', 'frente'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 3000,
      destaque: ['quadriceps', 'gluteos'],
      props: { chair: { x: -178 } },
      movimento: kf(pose(top, 8), pose(bot, 14)),
    },
    passo_a_passo: [
      'Fique de costas para a cadeira, a um passo grande dela, e apoie o peito de um pé no assento.',
      'Mantenha o tronco firme e as mãos na cintura ou ao lado do corpo.',
      'Desça dobrando a perna da frente até a coxa ficar quase na horizontal.',
      'Empurre o chão com o pé da frente para subir. Faça todas as repetições e troque de perna.',
    ],
    erros_comuns: [
      'Ficar perto demais da cadeira, com o joelho da frente passando muito da ponta do pé.',
      'Empurrar com a perna de trás em vez da perna da frente.',
    ],
  });
}

add({
  id: 'afundo_reverso',
  nome: 'Afundo reverso',
  apelidos: ['passada para trás', 'lunge reverso'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['gluteos', 'posteriores_coxa'],
  padrao_movimento: 'avanco',
  nivel: 2,
  variacao_mais_facil: 'agachamento_livre',
  variacao_mais_dificil: 'afundo',
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente', 'costas'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 3000,
    movimento: kf(
      { ...STAND, armAbd: 8, foreAbd: 8, an: ANK() },
      {
        ...STAND,
        torso: 4,
        arm: -4,
        armAbd: 8,
        foreAbd: 8,
        right: { thigh: -82.5, shin: 88.3, foot: -5.9 },
        left: { thigh: 0.6, shin: 97.7, foot: -38.3 },
        an: ANK(),
      },
    ),
  },
  passo_a_passo: [
    'Fique em pé com os pés na largura do quadril.',
    'Dê um passo grande para trás e desça até o joelho de trás quase encostar no chão.',
    'Mantenha o tronco reto e o peso no pé da frente.',
    'Empurre com o pé da frente e volte à posição inicial. Alterne as pernas ou faça um lado de cada vez.',
  ],
  erros_comuns: ['Dar um passo curto demais.', 'Bater o joelho de trás no chão.', 'Inclinar o tronco para a frente.'],
});

{
  // Afundo lateral: perna direita esticada para o lado, esquerda dobra. Pé esquerdo no chão.
  const make = (k: number) => ({
    ...STAND,
    torso: 35,
    ...CLASP,
    right: { legAbd: 35 },
    left: { thigh: r(-k), shin: r(1.45 * k), foot: r(-0.45 * k), legAbd: 0 },
    an: ANK(),
  });
  const k = solve((kk) => joints(make(kk) as never).L.ankle[1] - 10, 5, 90);
  const B = make(k);
  debug.afundo_lateral = joints(B as never).L.ankle;
  add({
    id: 'afundo_lateral',
    nome: 'Afundo lateral',
    apelidos: ['agachamento lateral', 'passada lateral'],
    musculo_principal: 'quadriceps',
    musculos_secundarios: ['adutores', 'gluteos'],
    padrao_movimento: 'avanco',
    nivel: 2,
    unilateral: true,
    posicao: 'em_pe',
    vistas: ['frente', 'costas', 'lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 3000,
      destaque: ['quadriceps', 'gluteos'],
      movimento: kf({ ...STAND, ...CLASP, legAbd: 3, an: ANK() }, B),
    },
    passo_a_passo: [
      'Fique em pé com os pés bem afastados para os lados.',
      'Leve o quadril para trás e dobre um joelho, deixando a outra perna esticada.',
      'Desça até a coxa da perna dobrada ficar quase na horizontal, com o pé inteiro no chão.',
      'Empurre o chão e volte ao centro. Alterne os lados.',
    ],
    erros_comuns: ['Tirar o calcanhar da perna dobrada do chão.', 'Deixar o joelho passar para dentro do pé.'],
  });
}

{
  // Subida na cadeira: pé direito no assento (topo em y = 84).
  const F: P2 = [78, 94];
  const A: P2 = [28, 188];
  const B: P2 = [76, 278];
  add({
    id: 'subida_cadeira',
    nome: 'Subida na cadeira',
    apelidos: ['step-up', 'subida no banco'],
    musculo_principal: 'quadriceps',
    musculos_secundarios: ['gluteos', 'posteriores_coxa'],
    padrao_movimento: 'avanco',
    equipamentos: [['cadeira'], ['step']],
    nivel: 2,
    variacao_mais_facil: 'agachamento_cadeira',
    unilateral: true,
    posicao: 'em_pe',
    vistas: ['lateral', 'costas'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 3000,
      destaque: ['quadriceps', 'gluteos'],
      props: { chair: { x: 92, flip: true } },
      movimento: kf(
        { ...STAND, torso: 12, arm: -20, fore: -20, right: legTo(A, F, 1), left: legTo(A, [2, 10], 1), an: ANK(F[0], F[1]) },
        { ...STAND, torso: 3, arm: -4, fore: -10, right: legTo(B, F, 1), left: legTo(B, [70, 94], 1), an: ANK(F[0], F[1]) },
      ),
    },
    passo_a_passo: [
      'Use uma cadeira firme, encostada na parede para não escorregar.',
      'Apoie o pé inteiro no assento e incline o tronco um pouco para a frente.',
      'Empurre com o pé que está na cadeira até ficar em pé sobre ela, juntando o outro pé.',
      'Desça devagar com o mesmo pé que subiu por último. Faça todas as repetições e troque de perna.',
    ],
    erros_comuns: ['Pegar impulso com o pé que está no chão.', 'Usar cadeira com rodinhas ou instável.'],
  });
}

add({
  id: 'agachamento_parede',
  nome: 'Agachamento isométrico na parede',
  apelidos: ['cadeirinha', 'wall sit'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['gluteos'],
  padrao_movimento: 'agachar',
  equipamentos: [['parede']],
  nivel: 2,
  unidade: 'tempo',
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 3000,
    props: { wall: -121 },
    movimento: kf(
      { ...STAND, thigh: -90, shin: 90, arm: -90, fore: 0, an: ANK() },
      { ...STAND, thigh: -88, shin: 88, arm: -86, fore: 0, an: ANK() },
    ),
  },
  passo_a_passo: [
    'Encoste as costas na parede e afaste os pés dela uns dois palmos.',
    'Deslize as costas para baixo até os joelhos formarem um ângulo reto.',
    'Mantenha as costas na parede e os joelhos em cima dos tornozelos.',
    'Segure pelo tempo indicado, respirando normalmente.',
  ],
  erros_comuns: ['Ficar com os pés perto demais da parede.', 'Apoiar as mãos nas coxas para aliviar.'],
});

add({
  id: 'ponte_unilateral',
  nome: 'Ponte de glúteo com uma perna',
  apelidos: ['ponte unilateral', 'elevação de quadril com uma perna'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['posteriores_coxa', 'lombar'],
  padrao_movimento: 'dobradica_quadril',
  nivel: 2,
  variacao_mais_facil: 'ponte_gluteo',
  unilateral: true,
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 2800,
    props: { mat: true },
    movimento: kf(
      { torso: -90, thigh: -135, shin: 160.6, foot: -25.6, arm: 0, fore: 0, armAbd: 8, legAbd: 4, left: { thigh: -135, shin: 0, foot: 45 }, an: ANK() },
      { torso: -105, thigh: -105, shin: 149.2, foot: -44.2, arm: 15, fore: 0, armAbd: 8, legAbd: 4, left: { thigh: -105, shin: 0, foot: 15 }, an: ANK() },
    ),
  },
  passo_a_passo: [
    'Deite de barriga para cima, com um pé no chão e a outra perna esticada para o alto.',
    'Deixe os braços ao lado do corpo.',
    'Empurre o chão com o calcanhar e suba o quadril até alinhar joelho, quadril e ombros.',
    'Desça devagar. Faça todas as repetições e troque de perna.',
  ],
  erros_comuns: ['Deixar o quadril cair para o lado da perna levantada.', 'Arquear a lombar no alto.'],
});

// Quatro apoios: quadril preso; tronco quase horizontal.
const QUAD = { torso: 84, thigh: 0, shin: 90, foot: 90, arm: -84, fore: 0, armAbd: 4, foreAbd: 4, legAbd: 3 };
const QUAD_AN = { pt: 'hip', x: 0, y: 107 };
debug.quatro_apoios = joints({ ...QUAD, an: QUAD_AN } as never);

add({
  id: 'coice_gluteo',
  nome: 'Coice de glúteo',
  apelidos: ['glúteo quatro apoios', 'donkey kick'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['posteriores_coxa', 'lombar'],
  padrao_movimento: 'dobradica_quadril',
  nivel: 1,
  unilateral: true,
  posicao: 'apoio_chao',
  vistas: ['lateral'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 2400,
    props: { mat: true },
    movimento: kf({ ...QUAD, an: QUAD_AN }, { ...QUAD, right: { thigh: 95, shin: 85, foot: 0 }, an: QUAD_AN }),
  },
  passo_a_passo: [
    'Fique de quatro, com as mãos embaixo dos ombros e os joelhos embaixo do quadril.',
    'Mantendo o joelho dobrado, leve uma perna para trás e para cima, com a sola do pé virada para o teto.',
    'Suba até a coxa ficar alinhada com o tronco, apertando o glúteo.',
    'Volte devagar sem encostar o joelho no chão. Faça todas as repetições e troque de perna.',
  ],
  erros_comuns: ['Arquear a lombar para subir mais a perna.', 'Girar o quadril para o lado.'],
});

add({
  id: 'abducao_deitado',
  nome: 'Abdução de perna deitado de lado',
  apelidos: ['elevação lateral de perna', 'abdução lateral'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['obliquos'],
  variacao_mais_dificil: 'concha_miniband',
  padrao_movimento: 'core',
  nivel: 1,
  unilateral: true,
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 2400,
    props: { mat: true },
    movimento: kf(
      { torso: 90, roll: -90, thigh: 90, shin: 0, foot: 0, arm: 0, fore: 0, armAbd: 6, legAbd: 3, left: { arm: -180, armAbd: 0 }, an: { pt: 'hip', x: 0, y: 36 } },
      { torso: 90, roll: -90, thigh: 90, shin: 0, foot: 0, arm: 0, fore: 0, armAbd: 6, legAbd: 3, left: { arm: -180, armAbd: 0 }, right: { legAbd: 40 }, an: { pt: 'hip', x: 0, y: 36 } },
    ),
  },
  passo_a_passo: [
    'Deite de lado com as pernas esticadas, uma em cima da outra, e apoie a cabeça no braço de baixo.',
    'Mantenha o quadril parado, sem girar para trás.',
    'Suba a perna de cima, com a ponta do pé virada para a frente.',
    'Desça devagar. Faça todas as repetições e troque de lado.',
  ],
  erros_comuns: ['Virar a ponta do pé para o teto.', 'Subir a perna rápido, balançando o corpo.'],
});

add({
  id: 'agachamento_salto',
  nome: 'Agachamento com salto',
  apelidos: ['jump squat', 'agachamento saltado'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['gluteos', 'panturrilhas'],
  padrao_movimento: 'agachar',
  nivel: 3,
  variacao_mais_facil: 'agachamento_livre',
  impacto: 'alto',
  barulho: 'alto',
  posicao: 'em_pe',
  vistas: ['lateral', 'frente', 'costas'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 1500,
    movimento: kf(
      { ...STAND, torso: 40, thigh: -80, shin: 125, foot: -45, arm: 45, fore: -10, an: ANK() },
      { ...STAND, foot: 35, arm: -165, fore: 0, armAbd: 18, foreAbd: 18, an: ANK(8.5, 60) },
    ),
  },
  passo_a_passo: [
    'Fique com os pés na largura dos ombros.',
    'Agache levando os braços para trás.',
    'Salte com força para cima, jogando os braços para o alto.',
    'Aterrisse suave, com os joelhos dobrados, e já desça para o próximo salto.',
  ],
  erros_comuns: ['Aterrissar com as pernas esticadas.', 'Deixar os joelhos caírem para dentro na aterrissagem.'],
});

// ============ EMPURRAR ============

{
  // Flexão na parede: tornozelo preso; mãos fixas na parede na altura dos ombros.
  const hipOf = (t: number): P2 => addv([0, 10], dir(t), -185);
  const SA = shoulderOf(hipOf(20), 20);
  // Mãos um pouco abaixo dos ombros, braços quase esticados no início.
  const hand: P2 = [r(SA[0] + Math.sqrt(108 ** 2 - 28 ** 2)), r(SA[1] - 28)];
  // Na descida os cotovelos abrem para os lados (abd), e o antebraço volta para a mão.
  const pose = (t: number, abd: number) => {
    const c = Math.cos((abd * Math.PI) / 180);
    const s = ik(shoulderOf(hipOf(t), t), hand, 55 * c, 56 * c, 'down');
    return {
      ...STAND,
      torso: t,
      thigh: t,
      shin: 0,
      foot: -t,
      arm: r(s.a1 - t),
      fore: r(s.a2 - s.a1),
      armAbd: abd,
      foreAbd: -abd + 6,
      an: ANK(),
    };
  };
  add({
    id: 'flexao_parede',
    nome: 'Flexão na parede',
    apelidos: ['apoio na parede'],
    musculo_principal: 'peitoral',
    musculos_secundarios: ['triceps', 'deltoide_anterior'],
    padrao_movimento: 'empurrar',
    equipamentos: [['parede']],
    nivel: 1,
    variacao_mais_dificil: 'flexao_inclinada',
    posicao: 'em_pe',
    vistas: ['lateral', 'costas'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2400,
      props: { wall: r(hand[0] + 8) },
      movimento: kf(pose(20, 6), pose(32, 45)),
    },
    passo_a_passo: [
      'Fique de frente para a parede, a um passo grande dela.',
      'Apoie as mãos na parede na altura dos ombros, um pouco mais abertas que eles.',
      'Com o corpo reto, dobre os cotovelos e aproxime o peito da parede.',
      'Empurre a parede até esticar os braços.',
    ],
    erros_comuns: ['Dobrar o quadril em vez de manter o corpo reto.', 'Abrir demais os cotovelos para os lados.'],
  });
}

/** Corpo reto girando em volta do tornozelo; mãos presas em `hand`. */
function plankPose(shoulderY: number, pivot: P2, hand: P2, len = 285, footW = 80, bend: 1 | -1 | 'up' = 'up') {
  const dy = shoulderY - pivot[1];
  const tilt = Math.asin(dy / len);
  const S: P2 = [pivot[0] + len * Math.cos(tilt), shoulderY];
  const torso = 90 - (tilt * 180) / Math.PI;
  return {
    torso: r(torso),
    thigh: r(torso),
    shin: 0,
    foot: r(footW - torso),
    ...armTo(S, hand, torso, bend),
    armAbd: 6,
    foreAbd: 0,
    legAbd: 3,
    an: { pt: 'hand', x: hand[0], y: hand[1] },
  };
}

{
  const hand: P2 = [0, 92];
  const pivot: P2 = [-Math.sqrt(285 ** 2 - (203 - 30) ** 2), 30];
  add({
    id: 'flexao_inclinada',
    nome: 'Flexão inclinada',
    apelidos: ['flexão com mãos na cadeira'],
    musculo_principal: 'peitoral',
    musculos_secundarios: ['triceps', 'deltoide_anterior', 'abdomen'],
    padrao_movimento: 'empurrar',
    equipamentos: [['cadeira']],
    nivel: 1,
    variacao_mais_facil: 'flexao_parede',
    variacao_mais_dificil: 'flexao_joelhos',
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2400,
      props: { chair: { x: 36, flip: true } },
      movimento: kf(plankPose(203, pivot, hand), plankPose(124, pivot, hand)),
    },
    passo_a_passo: [
      'Encoste a cadeira na parede para não escorregar e apoie as mãos na beirada do assento.',
      'Leve os pés para trás até o corpo ficar reto, da cabeça aos calcanhares.',
      'Dobre os cotovelos e aproxime o peito do assento.',
      'Empurre até esticar os braços.',
    ],
    erros_comuns: ['Deixar o quadril cair.', 'Descer só a cabeça em vez do corpo todo.'],
  });
}

{
  const hand: P2 = [0, 8];
  const pivot: P2 = [-Math.sqrt(285 ** 2 - 5 ** 2), 114];
  add({
    id: 'flexao_declinada',
    nome: 'Flexão declinada',
    apelidos: ['flexão com pés na cadeira'],
    musculo_principal: 'peitoral',
    musculos_secundarios: ['deltoide_anterior', 'triceps', 'abdomen'],
    padrao_movimento: 'empurrar',
    equipamentos: [['cadeira']],
    nivel: 3,
    variacao_mais_facil: 'flexao_padrao',
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2400,
      props: { chair: { x: -300 } },
      movimento: kf(plankPose(119, pivot, hand), plankPose(44, pivot, hand, 285, 80, -1)),
    },
    passo_a_passo: [
      'Apoie as pontas dos pés no assento da cadeira e as mãos no chão, um pouco mais abertas que os ombros.',
      'Deixe o corpo reto, da cabeça aos calcanhares.',
      'Dobre os cotovelos e desça o peito até perto do chão.',
      'Empurre até esticar os braços.',
    ],
    erros_comuns: ['Deixar o quadril cair ou subir demais.', 'Usar uma cadeira que escorrega.'],
  });
}

add({
  id: 'flexao_diamante',
  nome: 'Flexão diamante',
  apelidos: ['flexão fechada', 'flexão de tríceps'],
  musculo_principal: 'triceps',
  musculos_secundarios: ['peitoral', 'deltoide_anterior'],
  padrao_movimento: 'empurrar',
  nivel: 3,
  variacao_mais_facil: 'flexao_padrao',
  posicao: 'apoio_chao',
  vistas: ['lateral'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 2400,
    destaque: ['triceps', 'peitoral'],
    movimento: kf(
      { torso: 71.8, thigh: 71.8, shin: 0, foot: 8.2, arm: -71, fore: -1.5, armAbd: 0, foreAbd: -6, legAbd: 3, an: { pt: 'hand', x: 0, y: 8 } },
      { torso: 88.8, thigh: 88.8, shin: 0, foot: -8.8, arm: 13.4, fore: -147.2, armAbd: 0, foreAbd: -6, legAbd: 3, an: { pt: 'hand', x: 0, y: 8 } },
    ),
  },
  passo_a_passo: [
    'Fique em posição de flexão com as mãos juntas embaixo do peito, formando um losango com os dedos.',
    'Mantenha o corpo reto, da cabeça aos calcanhares.',
    'Desça dobrando os cotovelos rente ao corpo.',
    'Empurre até esticar os braços.',
  ],
  erros_comuns: ['Abrir os cotovelos para os lados.', 'Deixar o quadril cair.'],
});

{
  // Flexão pike: mãos presas em (0,8), quadril alto, pés fixos.
  const hand: P2 = [0, 8];
  const A = (() => {
    const t = 140;
    const S = addv(hand, upv(t), -111);
    const H = addv(S, upv(t), -100);
    return { t, S, H, F: addv(H, dir(40), 185) };
  })();
  const pose = (t: number, legW: number) => {
    const H = addv(A.F, dir(legW), -185);
    const S = shoulderOf(H, t);
    return {
      torso: t,
      thigh: legW,
      shin: 0,
      foot: r(60 - legW),
      ...armTo(S, hand, t, -1),
      armAbd: 6,
      foreAbd: 0,
      legAbd: 4,
      an: { pt: 'hand', x: 0, y: 8 },
    };
  };
  debug.pike = A;
  add({
    id: 'flexao_pike',
    nome: 'Flexão pike',
    apelidos: ['flexão em V invertido', 'pike push-up'],
    musculo_principal: 'deltoide_anterior',
    musculos_secundarios: ['triceps', 'trapezio'],
    padrao_movimento: 'empurrar',
    nivel: 3,
    variacao_mais_facil: 'flexao_padrao',
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2600,
      destaque: ['deltoides', 'triceps'],
      movimento: kf(pose(140, 40), pose(156, 47)),
    },
    passo_a_passo: [
      'Fique em posição de flexão e leve o quadril para o alto, formando um V de cabeça para baixo.',
      'Deixe as mãos na largura dos ombros e a cabeça entre os braços.',
      'Dobre os cotovelos e leve o topo da cabeça na direção do chão, entre as mãos.',
      'Empurre até esticar os braços.',
    ],
    erros_comuns: ['Abaixar o quadril durante a descida.', 'Abrir os cotovelos para os lados.'],
  });
}

{
  // Mergulho: mãos na beirada do assento (x = 45), pés à frente no chão.
  const hand: P2 = [45, 92];
  const feet: P2 = [225, 10];
  const S1 = addv(hand, dir(20), -111);
  const H1: P2 = [S1[0], S1[1] - 100];
  const S2: P2 = [80, 140];
  const t2 = 6;
  const H2 = addv(S2, upv(t2), -100);
  add({
    id: 'mergulho_cadeira',
    nome: 'Mergulho na cadeira',
    apelidos: ['tríceps no banco', 'paralela na cadeira'],
    musculo_principal: 'triceps',
    musculos_secundarios: ['peitoral', 'deltoide_anterior'],
    padrao_movimento: 'empurrar',
    equipamentos: [['cadeira']],
    nivel: 2,
    posicao: 'sentado',
    vistas: ['lateral', 'frente'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2400,
      props: { chair: true },
      movimento: kf(
        { torso: 0, ...legTo(H1, feet, 'up'), arm: 20, fore: 0, armAbd: 8, foreAbd: 0, legAbd: 5, an: { pt: 'hand', x: hand[0], y: hand[1] } },
        { torso: t2, ...legTo(H2, feet, 'up'), ...armTo(S2, hand, t2, -1), armAbd: 8, foreAbd: 0, legAbd: 5, an: { pt: 'hand', x: hand[0], y: hand[1] } },
      ),
    },
    passo_a_passo: [
      'Sente na beirada de uma cadeira firme e apoie as mãos no assento, ao lado do quadril.',
      'Tire o quadril da cadeira e leve os pés para a frente, com os joelhos dobrados.',
      'Dobre os cotovelos para trás e desça o quadril.',
      'Empurre com as mãos até esticar os braços.',
    ],
    erros_comuns: ['Abrir os cotovelos para os lados.', 'Descer demais e forçar os ombros.', 'Afastar o quadril da cadeira.'],
  });
}

// ============ ABDÔMEN E LOMBAR ============

{
  // Prancha lateral: deitado sobre o lado esquerdo, de frente para a câmera.
  const make = (t: number) => ({
    torso: r(t),
    roll: -90,
    thigh: r(t),
    shin: 0,
    foot: -90,
    arm: 0,
    fore: -90,
    armAbd: 90,
    foreAbd: 0,
    legAbd: 2,
    right: { arm: 0, fore: 0, armAbd: 90, foreAbd: 90 },
    an: { pt: 'elbow', side: 'left', x: 0, y: 10 },
  });
  const t = solve((tt) => joints(make(tt) as never).L.ankle[1] - 12, 40, 89);
  debug.prancha_lateral = joints(make(t) as never);
  add({
    id: 'prancha_lateral',
    nome: 'Prancha lateral',
    apelidos: ['prancha de lado'],
    musculo_principal: 'obliquos',
    musculos_secundarios: ['abdomen', 'gluteos'],
    padrao_movimento: 'core',
    nivel: 2,
    unidade: 'tempo',
    unilateral: true,
    variacao_mais_facil: 'prancha',
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 3000,
      props: { mat: true },
      destaque: ['abdomen'],
      movimento: kf(make(t), { ...make(t), right: { arm: 0, fore: 0, armAbd: 84, foreAbd: 84 } }),
    },
    passo_a_passo: [
      'Deite de lado e apoie o antebraço no chão, com o cotovelo embaixo do ombro.',
      'Estique as pernas, uma em cima da outra.',
      'Suba o quadril até o corpo ficar reto, da cabeça aos pés.',
      'Segure pelo tempo indicado e troque de lado.',
    ],
    erros_comuns: ['Deixar o quadril cair.', 'Apoiar o cotovelo longe do ombro.'],
  });
}

{
  // Prancha alta (pés presos) tocando o ombro com uma mão de cada vez.
  const top = { torso: 71.8, thigh: 71.8, shin: 0, foot: 8.2, arm: -71, fore: -1.5, armAbd: 6, foreAbd: 0, legAbd: 7, an: { pt: 'hand', x: 0, y: 8 } };
  const ankle = joints(top as never).R.ankle;
  const base = { ...top, an: ANK(ankle[0], ankle[1]) };
  const touch = { arm: -50, fore: -125, armAbd: -10, foreAbd: -55 };
  add({
    id: 'prancha_toque_ombro',
    nome: 'Prancha com toque no ombro',
    apelidos: ['shoulder tap'],
    musculo_principal: 'abdomen',
    musculos_secundarios: ['obliquos', 'deltoide_anterior', 'triceps'],
    padrao_movimento: 'core',
    nivel: 2,
    variacao_mais_facil: 'prancha',
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2800,
      props: { mat: true },
      movimento: kf(base, { ...base, right: touch }, base, { ...base, left: touch }),
    },
    passo_a_passo: [
      'Fique em posição de flexão, com os braços esticados e os pés um pouco afastados.',
      'Tire uma mão do chão e toque o ombro oposto.',
      'Volte a mão para o chão e repita com a outra.',
      'Mantenha o quadril parado o tempo todo.',
    ],
    erros_comuns: ['Balançar o quadril de um lado para o outro.', 'Fazer rápido demais e perder a posição.'],
  });
}

{
  const HIP = { pt: 'hip', x: 0, y: 27 };
  const base = { torso: -90, thigh: -180, shin: 90, foot: 0, arm: -90, fore: 0, armAbd: 8, foreAbd: 0, legAbd: 6, an: HIP };
  const armOut = { arm: -188 };
  const legOut = { thigh: -100, shin: 0, foot: 10 };
  add({
    id: 'dead_bug',
    nome: 'Dead bug',
    apelidos: ['inseto morto'],
    musculo_principal: 'abdomen',
    musculos_secundarios: ['obliquos'],
    padrao_movimento: 'core',
    nivel: 1,
    variacao_mais_dificil: 'hollow_hold',
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 4000,
      props: { mat: true },
      movimento: kf(base, { ...base, right: armOut, left: legOut }, base, { ...base, left: armOut, right: legOut }),
    },
    passo_a_passo: [
      'Deite de barriga para cima com os braços esticados para o teto e os joelhos dobrados no alto.',
      'Encoste a lombar no chão.',
      'Estique uma perna e leve o braço oposto para trás da cabeça, sem encostar no chão.',
      'Volte ao centro e troque os lados.',
    ],
    erros_comuns: ['Tirar a lombar do chão.', 'Mexer o braço e a perna do mesmo lado.'],
  });
}

{
  const HIP = { pt: 'hip', x: 0, y: 27 };
  const arms = { arm: 180, fore: 0, armAbd: 80, foreAbd: -45 }; // mãos atrás da cabeça, cotovelos abertos
  const kneeIn = { thigh: -150, shin: 120, foot: 0 };
  const legOut = { thigh: -112, shin: 8, foot: 0 };
  add({
    id: 'abdominal_bicicleta',
    nome: 'Abdominal bicicleta',
    apelidos: ['bicicleta', 'abdominal cruzado'],
    musculo_principal: 'abdomen',
    musculos_secundarios: ['obliquos'],
    variacao_mais_dificil: 'abdominal_russo',
  padrao_movimento: 'core',
    nivel: 2,
    variacao_mais_facil: 'abdominal_crunch',
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2000,
      props: { mat: true },
      movimento: kf(
        { torso: -62, twist: 35, ...arms, legAbd: 4, left: kneeIn, right: legOut, an: HIP },
        { torso: -62, twist: -35, ...arms, legAbd: 4, right: kneeIn, left: legOut, an: HIP },
      ),
    },
    passo_a_passo: [
      'Deite de barriga para cima com as mãos atrás da cabeça e os pés fora do chão.',
      'Tire os ombros do chão.',
      'Leve um joelho em direção ao peito e gire o tronco, aproximando o cotovelo oposto dele.',
      'Troque os lados, esticando a perna que estava dobrada, como se pedalasse.',
    ],
    erros_comuns: ['Puxar a cabeça com as mãos.', 'Fazer rápido demais, sem girar o tronco.'],
  });
}

add({
  id: 'elevacao_pernas',
  nome: 'Elevação de pernas',
  apelidos: ['abdominal infra', 'elevação de pernas deitado'],
  musculo_principal: 'abdomen',
  musculos_secundarios: ['obliquos'],
  variacao_mais_dificil: 'elevacao_joelhos_barra',
  padrao_movimento: 'core',
  nivel: 2,
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 2800,
    props: { mat: true },
    movimento: kf(
      { torso: -90, thigh: -100, shin: 0, foot: 0, arm: 0, fore: 0, armAbd: 12, foreAbd: 0, legAbd: 3, an: { pt: 'hip', x: 0, y: 27 } },
      { torso: -90, thigh: -178, shin: 0, foot: 0, arm: 0, fore: 0, armAbd: 12, foreAbd: 0, legAbd: 3, an: { pt: 'hip', x: 0, y: 27 } },
    ),
  },
  passo_a_passo: [
    'Deite de barriga para cima com as pernas esticadas e os braços ao lado do corpo.',
    'Encoste a lombar no chão.',
    'Suba as pernas juntas até apontarem para o teto.',
    'Desça devagar, parando antes de encostar os pés no chão.',
  ],
  erros_comuns: ['Arquear a lombar na descida.', 'Deixar as pernas caírem rápido.'],
});

{
  const armFwd = { arm: -174, fore: 0 };
  const legBack = { thigh: 92, shin: 0, foot: 90 };
  const base = { ...QUAD, an: QUAD_AN };
  add({
    id: 'bird_dog',
    nome: 'Bird dog',
    apelidos: ['perdigueiro', 'quatro apoios alternado'],
    musculo_principal: 'lombar',
    musculos_secundarios: ['gluteos', 'abdomen'],
    padrao_movimento: 'core',
    nivel: 1,
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 4400,
      props: { mat: true },
      destaque: ['lombar', 'gluteos'],
      movimento: kf(base, { ...base, right: armFwd, left: legBack }, base, { ...base, left: armFwd, right: legBack }),
    },
    passo_a_passo: [
      'Fique de quatro, com as mãos embaixo dos ombros e os joelhos embaixo do quadril.',
      'Estique um braço para a frente e a perna oposta para trás, até ficarem alinhados com o tronco.',
      'Segure um segundo, sem girar o quadril.',
      'Volte e troque os lados.',
    ],
    erros_comuns: ['Arquear a lombar ao subir a perna.', 'Levantar o braço e a perna do mesmo lado.'],
  });
}

add({
  id: 'hollow_hold',
  nome: 'Canoa',
  apelidos: ['hollow hold', 'prancha invertida em canoa'],
  musculo_principal: 'abdomen',
  musculos_secundarios: ['obliquos'],
  padrao_movimento: 'core',
  nivel: 3,
  unidade: 'tempo',
  variacao_mais_facil: 'dead_bug',
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 3000,
    props: { mat: true },
    movimento: kf(
      { torso: -74, thigh: -105, shin: 0, foot: 0, arm: 172, fore: 0, armAbd: 6, foreAbd: 0, legAbd: 3, an: { pt: 'hip', x: 0, y: 24 } },
      { torso: -72, thigh: -107, shin: 0, foot: 0, arm: 170, fore: 0, armAbd: 6, foreAbd: 0, legAbd: 3, an: { pt: 'hip', x: 0, y: 24 } },
    ),
  },
  passo_a_passo: [
    'Deite de barriga para cima com os braços esticados para trás da cabeça.',
    'Encoste bem a lombar no chão.',
    'Tire ombros e pernas do chão ao mesmo tempo, formando uma canoa.',
    'Segure pelo tempo indicado. Se a lombar sair do chão, suba mais as pernas.',
  ],
  erros_comuns: ['Deixar a lombar sair do chão.', 'Prender a respiração.'],
});

add({
  id: 'abdominal_remador',
  nome: 'Abdominal remador',
  apelidos: ['remador', 'canivete grupado'],
  musculo_principal: 'abdomen',
  musculos_secundarios: ['obliquos'],
  padrao_movimento: 'core',
  nivel: 2,
  variacao_mais_facil: 'abdominal_crunch',
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 2400,
    props: { mat: true },
    movimento: kf(
      { torso: -90, thigh: -90, shin: 0, foot: 0, arm: -185, fore: 0, armAbd: 8, foreAbd: 0, legAbd: 3, an: { pt: 'hip', x: 0, y: 27 } },
      { torso: -28, thigh: -145, shin: 140, foot: 5, arm: -62, fore: 0, armAbd: 8, foreAbd: 0, legAbd: 3, an: { pt: 'hip', x: 0, y: 27 } },
    ),
  },
  passo_a_passo: [
    'Deite de barriga para cima com braços e pernas esticados.',
    'Ao mesmo tempo, suba o tronco e dobre os joelhos em direção ao peito.',
    'Leve os braços para a frente, ao lado das pernas.',
    'Volte devagar até deitar de novo.',
  ],
  erros_comuns: ['Pegar impulso jogando os braços.', 'Cair de uma vez ao voltar.'],
});

// ============ CARDIO ============

{
  // Burpee: tornozelo preso, que vai para trás na prancha.
  // Âncora nas mãos: elas ficam paradas entre o agachamento e a prancha.
  const HAND = (p: Any) => p;
  const squat = { ...STAND, torso: 50, thigh: -72, shin: 117, foot: -45, an: ANK() };
  const sh = joints({ ...squat } as never).R.shoulder;
  const hand: P2 = [r(sh[0] + 18), 8];
  const squatHands = HAND({ ...squat, ...armTo([sh[0], sh[1]], hand, 50, 'up'), armAbd: 8, foreAbd: 4 });
  const plank = plankPose(119, [hand[0] - Math.sqrt(285 ** 2 - 89 ** 2), 30], hand);
  const pa = joints(plank as never).R.ankle;
  const plankA = { ...plank, an: ANK(pa[0], pa[1] + 3) };
  const jump = { ...STAND, foot: 35, arm: -170, fore: 0, armAbd: 15, foreAbd: 15, an: ANK(8.5, 55) };
  const stand = { ...STAND, an: ANK() };
  debug.burpee = { hand, pa };
  add({
    id: 'burpee',
    nome: 'Burpee',
    apelidos: ['burpi'],
    musculo_principal: 'corpo_inteiro',
    musculos_secundarios: ['quadriceps', 'peitoral', 'abdomen'],
    padrao_movimento: 'cardio',
    nivel: 4,
    variacao_mais_facil: 'burpee_sem_salto',
    impacto: 'alto',
    barulho: 'alto',
    posicao: 'em_pe',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 3600,
      destaque: ['quadriceps', 'peitoral'],
      movimento: kf(jump, squatHands, plankA, squatHands),
    },
    passo_a_passo: [
      'Fique em pé, agache e apoie as mãos no chão à frente dos pés.',
      'Jogue os pés para trás e fique em posição de prancha.',
      'Traga os pés de volta para perto das mãos.',
      'Salte para cima com os braços esticados e já comece o próximo.',
    ],
    erros_comuns: ['Deixar o quadril cair na prancha.', 'Aterrissar com as pernas esticadas.'],
  });
  add({
    id: 'burpee_sem_salto',
    nome: 'Burpee sem salto',
    apelidos: ['burpee de apartamento', 'burpee caminhado'],
    musculo_principal: 'corpo_inteiro',
    musculos_secundarios: ['quadriceps', 'peitoral', 'abdomen'],
    padrao_movimento: 'cardio',
    nivel: 2,
    variacao_mais_dificil: 'burpee',
    impacto: 'baixo',
    barulho: 'baixo',
    posicao: 'em_pe',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 4400,
      destaque: ['quadriceps', 'peitoral'],
      movimento: kf(stand, squatHands, plankA, squatHands),
    },
    passo_a_passo: [
      'Fique em pé, agache e apoie as mãos no chão à frente dos pés.',
      'Leve um pé de cada vez para trás até ficar em posição de prancha.',
      'Volte um pé de cada vez para perto das mãos.',
      'Fique em pé, sem saltar, e repita.',
    ],
    erros_comuns: ['Deixar o quadril cair na prancha.', 'Arredondar as costas ao agachar.'],
  });
}

{
  const HIP = { pt: 'hip', x: 0, y: 200 };
  const up = { thigh: -88, shin: 92, foot: 10 };
  const sup = { thigh: 0, shin: 0, foot: 18 };
  const mid = { thigh: -25, shin: 50, foot: 10 };
  add({
    id: 'joelho_alto',
    nome: 'Corrida com joelho alto',
    apelidos: ['skipping', 'joelho alto'],
    musculo_principal: 'corpo_inteiro',
    musculos_secundarios: ['quadriceps', 'abdomen', 'panturrilhas'],
    padrao_movimento: 'cardio',
    nivel: 2,
    unidade: 'tempo',
    variacao_mais_facil: 'marcha_estacionaria',
    impacto: 'alto',
    barulho: 'medio',
    posicao: 'em_pe',
    vistas: ['lateral', 'frente'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 1000,
      destaque: ['quadriceps', 'abdomen'],
      movimento: kf(
        { ...STAND, arm: 0, fore: -80, armAbd: 6, right: { ...up, arm: 35, fore: -80 }, left: { ...sup, arm: -55, fore: -80 }, an: HIP },
        { ...STAND, ...mid, fore: -80, an: { ...HIP, y: 205 } },
        { ...STAND, arm: 0, fore: -80, armAbd: 6, left: { ...up, arm: 35, fore: -80 }, right: { ...sup, arm: -55, fore: -80 }, an: HIP },
        { ...STAND, ...mid, fore: -80, an: { ...HIP, y: 205 } },
      ),
    },
    passo_a_passo: [
      'Corra no lugar subindo bem os joelhos, até a altura do quadril.',
      'Pise com a ponta dos pés.',
      'Balance os braços junto, como numa corrida.',
      'Mantenha o tronco reto e o ritmo pelo tempo indicado.',
    ],
    erros_comuns: ['Inclinar o tronco para trás.', 'Subir pouco os joelhos.'],
  });
  }

{
  add({
    id: 'escalador',
    nome: 'Escalador',
    apelidos: ['mountain climber', 'alpinista'],
    musculo_principal: 'abdomen',
    musculos_secundarios: ['quadriceps', 'deltoide_anterior'],
    padrao_movimento: 'cardio',
    nivel: 2,
    unidade: 'tempo',
    variacao_mais_facil: 'prancha',
    impacto: 'medio',
    barulho: 'baixo',
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 1000,
      destaque: ['abdomen', 'quadriceps'],
      movimento: { type: 'continuous', id: 'escalador' },
    },
    passo_a_passo: [
      'Fique em posição de flexão, com os braços esticados.',
      'Traga um joelho em direção ao peito.',
      'Volte a perna e traga a outra, alternando rápido.',
      'Mantenha o quadril baixo e os ombros em cima das mãos.',
    ],
    erros_comuns: ['Subir o quadril.', 'Deixar os ombros passarem muito à frente das mãos.'],
  });
}

{
  const HIP = { pt: 'hip', x: 0, y: 195 };
  const armsUp = { arm: 0, fore: 0, armAbd: 160, foreAbd: 168 };
  const base = { ...STAND, arm: 0, fore: 0, armAbd: 8, foreAbd: 8, an: HIP };
  add({
    id: 'polichinelo_sem_salto',
    nome: 'Polichinelo sem salto',
    apelidos: ['polichinelo alternado', 'step jack'],
    musculo_principal: 'corpo_inteiro',
    musculos_secundarios: ['deltoide_lateral', 'panturrilhas'],
    padrao_movimento: 'cardio',
    nivel: 1,
    unidade: 'tempo',
    variacao_mais_dificil: 'polichinelo',
    posicao: 'em_pe',
    vistas: ['frente', 'lateral', 'costas'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 2000,
      destaque: ['deltoides', 'panturrilhas'],
      movimento: kf(
        base,
        { ...base, ...armsUp, right: { legAbd: 14, foot: 15 } },
        base,
        { ...base, ...armsUp, left: { legAbd: 14, foot: 15 } },
      ),
    },
    passo_a_passo: [
      'Fique em pé com os braços ao lado do corpo.',
      'Leve um pé para o lado e, ao mesmo tempo, suba os braços acima da cabeça.',
      'Volte ao centro e repita para o outro lado.',
      'Mantenha um ritmo constante, sem saltar.',
    ],
    erros_comuns: ['Dobrar demais os cotovelos.', 'Perder o ritmo entre os lados.'],
  });
}

{
  // Patinador: pouso numa perna, a outra cruza atrás. Quadril preso, altura ajustada ao pé de apoio.
  const make = (sup: 'right' | 'left', y: number) => {
    const other = sup === 'right' ? 'left' : 'right';
    return {
      ...STAND,
      torso: 32,
      [sup]: { thigh: -38, shin: 62, foot: -24, legAbd: 20, arm: 45, fore: -20, armAbd: 10 },
      [other]: { thigh: 28, shin: 70, foot: 0, legAbd: -18, arm: -70, fore: -20, armAbd: -25 },
      an: { pt: 'hip', x: 0, y: r(y) },
    };
  };
  const fit = (sup: 'right' | 'left') => {
    const y = solve((yy) => joints(make(sup, yy) as never)[sup === 'right' ? 'R' : 'L'].ankle[1] - 10, 100, 250);
    return make(sup, y);
  };
  // No ar: meio do caminho entre os dois pousos, quadril mais alto.
  const air = (a: Any, b: Any) => ({
    ...STAND,
    torso: 26,
    thigh: -15,
    shin: 45,
    foot: 10,
    legAbd: 4,
    arm: -10,
    fore: -20,
    an: { pt: 'hip', x: 0, y: r((a.an.y + b.an.y) / 2 + 45) },
  });
  add({
    id: 'patinador',
    nome: 'Patinador',
    apelidos: ['skater', 'salto lateral'],
    musculo_principal: 'quadriceps',
    musculos_secundarios: ['gluteos', 'panturrilhas'],
    padrao_movimento: 'cardio',
    nivel: 3,
    unidade: 'tempo',
    impacto: 'alto',
    barulho: 'medio',
    posicao: 'em_pe',
    vistas: ['frente', 'costas', 'lateral'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 1600,
      destaque: ['quadriceps', 'gluteos'],
      movimento: kf(fit('right'), air(fit('right'), fit('left')), fit('left'), air(fit('left'), fit('right'))),
    },
    passo_a_passo: [
      'Fique apoiado em uma perna, com o joelho dobrado e o tronco inclinado à frente.',
      'Salte para o lado e caia na outra perna.',
      'Cruze a perna livre por trás e balance os braços para ajudar.',
      'Continue saltando de um lado para o outro.',
    ],
    erros_comuns: ['Cair com o joelho esticado.', 'Deixar o joelho de apoio cair para dentro.'],
  });
}

{
  const HIP = { pt: 'hip', x: 0, y: 184 };
  const H: P2 = [0, 184];
  const legs = { right: legTo(H, [-40, 10], 1), left: legTo(H, [42, 10], 1) };
  const punch = { arm: -96, fore: 0, armAbd: 4, foreAbd: 0 };
  const guard = { arm: -25, fore: -135, armAbd: 4, foreAbd: -8 };
  const pose = (tw: number, r1: Any, l1: Any) => ({
    ...STAND,
    torso: 8,
    twist: tw,
    legAbd: 6,
    right: { ...legs.right, ...r1 },
    left: { ...legs.left, ...l1 },
    an: HIP,
  });
  add({
    id: 'sombra_boxe',
    nome: 'Sombra de boxe',
    apelidos: ['socos no ar', 'shadow boxing'],
    musculo_principal: 'deltoide_anterior',
    musculos_secundarios: ['abdomen', 'obliquos', 'triceps'],
    padrao_movimento: 'cardio',
    nivel: 1,
    unidade: 'tempo',
    posicao: 'em_pe',
    vistas: ['lateral', 'frente'],
    animacao: {
      tipo: 'boneco',
      duracao_ms: 1600,
      destaque: ['deltoides', 'abdomen'],
      movimento: kf(pose(18, punch, guard), pose(0, guard, guard), pose(-18, guard, punch), pose(0, guard, guard)),
    },
    passo_a_passo: [
      'Fique com um pé à frente do outro, joelhos levemente dobrados e as mãos protegendo o rosto.',
      'Soque o ar à frente com uma mão, girando o tronco, e volte à guarda.',
      'Alterne as mãos num ritmo constante.',
      'Mantenha o abdômen firme e não estique o cotovelo com tranco.',
    ],
    erros_comuns: ['Baixar a guarda entre os socos.', 'Travar o cotovelo com força no fim do soco.'],
  });
}

// ============ MOBILIDADE ============

add({
  id: 'rotacao_bracos',
  nome: 'Rotação de braços',
  apelidos: ['círculos com os braços'],
  musculo_principal: 'deltoide_lateral',
  musculos_secundarios: ['trapezio'],
  padrao_movimento: 'mobilidade',
  nivel: 1,
  unidade: 'tempo',
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: { tipo: 'boneco', duracao_ms: 1800, destaque: ['deltoides'], movimento: { type: 'continuous', id: 'circulos_braco' } },
  passo_a_passo: [
    'Fique em pé e abra os braços para os lados, na altura dos ombros.',
    'Faça círculos com os braços esticados, começando pequenos e aumentando.',
    'Depois de metade do tempo, inverta o sentido.',
  ],
  erros_comuns: ['Subir os ombros em direção às orelhas.', 'Fazer movimentos bruscos.'],
});

add({
  id: 'balanco_perna',
  nome: 'Balanço de perna',
  apelidos: ['pêndulo de perna', 'leg swing'],
  musculo_principal: 'posteriores_coxa',
  musculos_secundarios: ['gluteos', 'quadriceps'],
  padrao_movimento: 'mobilidade',
  nivel: 1,
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: {
    tipo: 'boneco',
    duracao_ms: 1800,
    destaque: ['posteriores_coxa', 'gluteos'],
    movimento: kf(
      { ...STAND, arm: 0, fore: 0, armAbd: 60, foreAbd: 60, right: { thigh: -55, shin: 8, foot: -10 }, an: { pt: 'ankle', side: 'left', x: 0, y: 10 } },
      { ...STAND, arm: 0, fore: 0, armAbd: 60, foreAbd: 60, right: { thigh: 32, shin: 10, foot: 10 }, an: { pt: 'ankle', side: 'left', x: 0, y: 10 } },
    ),
  },
  passo_a_passo: [
    'Fique em pé ao lado de uma parede e apoie uma mão nela, se precisar de equilíbrio.',
    'Balance uma perna para a frente e para trás, com o joelho quase esticado.',
    'Aumente a amplitude aos poucos, sem forçar.',
    'Faça o tempo indicado e troque de perna.',
  ],
  erros_comuns: ['Balançar o tronco junto com a perna.', 'Forçar a amplitude logo no começo.'],
});

writeFileSync(OUT, toJson({ versao: 1, exercicios: ex.map(ordered) }));
console.log(ex.length, 'exercícios');
if (process.argv[2] === 'debug') console.log(JSON.stringify(debug));

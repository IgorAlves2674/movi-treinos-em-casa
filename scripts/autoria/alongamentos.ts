/// <reference types="node" />
/**
 * Gera os alongamentos do fim do treino (spec 7.5): parados, 30 s cada.
 * Uso (na pasta movi-app): npx tsx scripts/autoria/alongamentos.ts
 */
import { writeFileSync } from 'node:fs';

import { addv, ang, armTo, dir, joints, legTo, ordered, r, toJson, upv, type P2 } from './lib';

const OUT = 'src/content/exercises/alongamentos.json';
type Any = Record<string, any>;
const ex: Any[] = [];
const ANK = (x = 0, y = 10) => ({ pt: 'ankle', x: r(x), y: r(y) });
const STAND = { torso: 0, thigh: 0, shin: 0, foot: 0, arm: 0, fore: -10, armAbd: 6, foreAbd: 6, legAbd: 3 };

/** Alongamento é parado: a segunda pose só "respira" um pouco (tronco 2° a mais). */
const hold = (p: Any, extra: Any = { torso: (p.torso ?? 0) + 2 }) => ({ type: 'keyframes', poses: [p, { ...p, ...extra }] });

function add(e: Any) {
  ex.push({
    apelidos: [],
    musculos_secundarios: [],
    padrao_movimento: 'alongamento',
    equipamentos: [[]],
    nivel: 1,
    unidade: 'tempo',
    variacao_mais_facil: null,
    variacao_mais_dificil: null,
    impacto: 'baixo',
    barulho: 'baixo',
    unilateral: false,
    ...e,
    animacao: { tipo: 'boneco', duracao_ms: 4000, ...e.animacao },
  });
}

// 1. Quadríceps em pé: segura o pé atrás, apoiado na perna esquerda.
{
  const base = {
    ...STAND,
    right: { thigh: 14, shin: 150, foot: 40 },
    left: { arm: -15, fore: -10, armAbd: 55, foreAbd: 55 },
    an: { pt: 'ankle', side: 'left', x: 0, y: 10 },
  };
  const j = joints(base as never);
  const grab = armTo([j.R.shoulder[0], j.R.shoulder[1]], [j.R.ankle[0] + 4, j.R.ankle[1]], 0, -1);
  const pose = { ...base, right: { ...base.right, ...grab, armAbd: 4, foreAbd: 4 } };
  add({
    id: 'alongamento_quadriceps',
    nome: 'Alongamento de quadríceps em pé',
    apelidos: ['alongamento da coxa'],
    musculo_principal: 'quadriceps',
    unilateral: true,
    posicao: 'em_pe',
    vistas: ['lateral', 'frente'],
    animacao: { destaque: ['quadriceps'], movimento: hold(pose, { torso: 2 }) },
    passo_a_passo: [
      'Em pé, apoie uma mão na parede se precisar de equilíbrio.',
      'Dobre um joelho e segure o pé atrás, puxando o calcanhar em direção ao glúteo.',
      'Mantenha os joelhos alinhados e o quadril encaixado.',
      'Segure e troque de perna.',
    ],
    erros_comuns: ['Abrir o joelho para o lado.', 'Arquear a lombar.'],
  });
}

// 2. Posteriores sentado: pernas esticadas, tronco à frente.
add({
  id: 'alongamento_posteriores',
  nome: 'Alongamento de posteriores sentado',
  apelidos: ['alcançar os pés'],
  musculo_principal: 'posteriores_coxa',
  musculos_secundarios: ['lombar', 'panturrilhas'],
  posicao: 'sentado',
  vistas: ['lateral'],
  animacao: {
    destaque: ['posteriores_coxa'],
    props: { mat: true },
    movimento: hold({ torso: 48, thigh: -90, shin: 0, foot: 0, arm: -118, fore: 0, armAbd: 6, foreAbd: 0, legAbd: 4, an: { pt: 'hip', x: 0, y: 27 } }),
  },
  passo_a_passo: [
    'Sente no chão com as pernas esticadas à frente.',
    'Incline o tronco à frente a partir do quadril, levando as mãos em direção aos pés.',
    'Vá até sentir alongar a parte de trás das coxas, sem forçar.',
    'Segure respirando devagar.',
  ],
  erros_comuns: ['Arredondar muito as costas para alcançar mais longe.', 'Dobrar os joelhos.'],
});

// 3. Joelho ao peito (glúteo e lombar): deitado, abraça um joelho.
{
  const pose = { torso: -80, thigh: -90, shin: 0, foot: 0, legAbd: 4, right: { thigh: -195, shin: 150, foot: 0 }, an: { pt: 'hip', x: 0, y: 27 } };
  const j = joints(pose as never);
  const knee: P2 = [j.R.knee[0], j.R.knee[1]];
  const arms = armTo([j.R.shoulder[0], j.R.shoulder[1]], addv(knee, [0, 4]), -80, 'up');
  add({
    id: 'alongamento_gluteo',
    nome: 'Joelho ao peito',
    apelidos: ['alongamento de glúteo deitado'],
    musculo_principal: 'gluteos',
    musculos_secundarios: ['lombar'],
    unilateral: true,
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: { destaque: ['gluteos'], props: { mat: true }, movimento: hold({ ...pose, ...arms, armAbd: 10, foreAbd: -10 }, { torso: -82 }) },
    passo_a_passo: [
      'Deite de barriga para cima com as pernas esticadas.',
      'Abrace um joelho e puxe em direção ao peito.',
      'Mantenha a outra perna esticada no chão e os ombros relaxados.',
      'Segure e troque de lado.',
    ],
    erros_comuns: ['Tirar a cabeça do chão com força.', 'Prender a respiração.'],
  });
}

// 4. Peitoral: mãos entrelaçadas atrás das costas, peito aberto.
add({
  id: 'alongamento_peitoral',
  nome: 'Alongamento de peitoral',
  apelidos: ['abertura de peito'],
  musculo_principal: 'peitoral',
  musculos_secundarios: ['deltoide_anterior'],
  posicao: 'em_pe',
  vistas: ['lateral', 'costas'],
  animacao: {
    destaque: ['peitoral', 'deltoides'],
    movimento: hold({ ...STAND, torso: -3, arm: 38, fore: -4, armAbd: 4, foreAbd: -16, an: ANK() }, { arm: 44 }),
  },
  passo_a_passo: [
    'Em pé, entrelace as mãos atrás das costas.',
    'Estique os braços e afaste as mãos do corpo, abrindo o peito.',
    'Leve os ombros para trás e para baixo.',
    'Segure respirando devagar.',
  ],
  erros_comuns: ['Inclinar o tronco à frente.', 'Subir os ombros.'],
});

// 5. Ombro: braço cruzado na frente do peito.
add({
  id: 'alongamento_ombro',
  nome: 'Alongamento de ombro cruzado',
  apelidos: ['braço cruzado'],
  musculo_principal: 'deltoide_posterior',
  musculos_secundarios: ['trapezio', 'dorsais'],
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['frente', 'lateral'],
  animacao: {
    destaque: ['deltoides'],
    movimento: hold({
      ...STAND,
      right: { arm: -90, fore: 0, armAbd: -58, foreAbd: -58 },
      left: { arm: -55, fore: -100, armAbd: 0, foreAbd: -45 },
      an: ANK(),
    }),
  },
  passo_a_passo: [
    'Em pé, leve um braço esticado na frente do peito.',
    'Com a outra mão, puxe esse braço para perto do corpo, segurando acima do cotovelo.',
    'Mantenha o ombro baixo, longe da orelha.',
    'Segure e troque de braço.',
  ],
  erros_comuns: ['Girar o tronco junto com o braço.', 'Puxar pelo cotovelo com força.'],
});

// 6. Tríceps: mão atrás da cabeça, a outra empurra o cotovelo.
add({
  id: 'alongamento_triceps',
  nome: 'Alongamento de tríceps',
  apelidos: ['mão nas costas por cima'],
  musculo_principal: 'triceps',
  musculos_secundarios: ['dorsais'],
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['frente', 'lateral', 'costas'],
  animacao: {
    destaque: ['triceps'],
    movimento: hold({
      ...STAND,
      right: { arm: -172, fore: -150, armAbd: 14, foreAbd: -35 },
      left: { arm: -150, fore: -95, armAbd: 20, foreAbd: -55 },
      an: ANK(),
    }),
  },
  passo_a_passo: [
    'Em pé, leve um braço para cima e dobre o cotovelo, deixando a mão atrás da cabeça.',
    'Com a outra mão, empurre de leve o cotovelo para trás.',
    'Mantenha o tronco reto, sem arquear a lombar.',
    'Segure e troque de braço.',
  ],
  erros_comuns: ['Inclinar a cabeça para a frente.', 'Arquear a lombar.'],
});

// 7. Panturrilha na parede: perna de trás esticada, calcanhar no chão.
{
  const hip: P2 = [-38, 172];
  const t = 24;
  const S = addv(hip, upv(t), 100);
  const hand: P2 = [r(S[0] + 100), r(S[1] - 18)];
  const pose = {
    torso: t,
    right: legTo(hip, [0, 10], 1, 0),
    left: legTo(hip, [-138, 10], 1, 0),
    thigh: 0,
    shin: 0,
    foot: 0,
    legAbd: 4,
    ...armTo(S, hand, t, 'down'),
    armAbd: 8,
    foreAbd: 8,
    an: ANK(),
  };
  add({
    id: 'alongamento_panturrilha',
    nome: 'Alongamento de panturrilha na parede',
    apelidos: ['panturrilha na parede'],
    musculo_principal: 'panturrilhas',
    equipamentos: [['parede']],
    unilateral: true,
    posicao: 'em_pe',
    vistas: ['lateral', 'costas'],
    animacao: { destaque: ['panturrilhas'], props: { wall: r(hand[0] + 8) }, movimento: hold(pose, { torso: t }) },
    passo_a_passo: [
      'De frente para a parede, apoie as mãos nela na altura do peito.',
      'Dê um passo grande para trás com uma perna, deixando-a esticada e o calcanhar no chão.',
      'Dobre a perna da frente e leve o quadril em direção à parede até sentir a panturrilha de trás.',
      'Segure e troque de perna.',
    ],
    erros_comuns: ['Tirar o calcanhar de trás do chão.', 'Virar o pé de trás para fora.'],
  });
}

// 8. Postura da criança: ajoelhado, sentado nos calcanhares, braços à frente no chão.
{
  const knee: P2 = [0, 12];
  const hip: P2 = [-75, 70];
  const ankle: P2 = [-90, 12];
  const thigh = ang(knee[0] - hip[0], knee[1] - hip[1]);
  const shinW = ang(ankle[0] - knee[0], ankle[1] - knee[1]);
  const t = 100;
  const S = addv(hip, upv(t), 100);
  const pose = {
    torso: t,
    thigh: r(thigh),
    shin: r(shinW - thigh),
    foot: r(180 - shinW),
    legAbd: 6,
    ...armTo(S, [S[0] + 108, 9], t, 'up'),
    armAbd: 10,
    foreAbd: 10,
    an: { pt: 'knee', x: knee[0], y: knee[1] },
  };
  void dir;
  add({
    id: 'alongamento_lombar',
    nome: 'Postura da criança',
    apelidos: ['alongamento de lombar ajoelhado'],
    musculo_principal: 'lombar',
    musculos_secundarios: ['dorsais', 'gluteos'],
    posicao: 'apoio_chao',
    vistas: ['lateral'],
    animacao: { destaque: ['lombar', 'dorsais'], props: { mat: true }, movimento: hold(pose, { torso: t + 1 }) },
    passo_a_passo: [
      'Ajoelhe no chão e sente sobre os calcanhares.',
      'Incline o tronco à frente e estique os braços no chão, à frente da cabeça.',
      'Deixe a testa perto do chão e relaxe os ombros.',
      'Segure respirando fundo, soltando as costas a cada expiração.',
    ],
    erros_comuns: ['Tirar o quadril dos calcanhares.', 'Tensionar os ombros.'],
  });
}

// 9. Cobra (abdômen): deitado de bruços, tronco levantado com os braços.
{
  const t = 42;
  const hip: P2 = [0, 24];
  const S = addv(hip, upv(t), 100);
  const pose = {
    torso: t,
    thigh: 90,
    shin: 0,
    foot: 90,
    legAbd: 4,
    ...armTo(S, [S[0] - 4, 8], t, -1),
    armAbd: 10,
    foreAbd: 10,
    an: { pt: 'hip', x: hip[0], y: hip[1] },
  };
  add({
    id: 'alongamento_abdomen',
    nome: 'Cobra',
    apelidos: ['alongamento de abdômen'],
    musculo_principal: 'abdomen',
    musculos_secundarios: ['peitoral'],
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: { destaque: ['abdomen'], props: { mat: true }, movimento: hold(pose, { torso: t - 2 }) },
    passo_a_passo: [
      'Deite de barriga para baixo com as mãos no chão, ao lado do peito.',
      'Empurre o chão e levante o tronco, deixando o quadril encostado.',
      'Suba só até onde for confortável para a lombar.',
      'Segure respirando devagar.',
    ],
    erros_comuns: ['Tirar o quadril do chão.', 'Subir os ombros em direção às orelhas.'],
  });
}

writeFileSync(OUT, toJson({ versao: 1, exercicios: ex.map(ordered) }));
console.log(ex.length, 'alongamentos');

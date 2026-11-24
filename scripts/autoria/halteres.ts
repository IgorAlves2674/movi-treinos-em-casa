/// <reference types="node" />
/**
 * Gera o arquivo de exercícios deste lote (poses calculadas + textos).
 * Uso (na pasta movi-app): npx tsx scripts/autoria/halteres.ts
 * Edite aqui e rode de novo em vez de mexer no JSON à mão.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { ordered, armTo, joints, legTo, r, toJson, type P2 } from './lib';

const DIR = 'src/content/exercises/';
const OUT = DIR + 'halteres.json';
type Any = Record<string, any>;
const banco: Any[] = [
  ...JSON.parse(readFileSync(DIR + 'exercicios.json', 'utf-8')).exercicios,
  ...JSON.parse(readFileSync(DIR + 'peso_corporal.json', 'utf-8')).exercicios,
];
const poses = (id: string): Any[] => banco.find((e) => e.id === id)!.animacao.movimento.poses;

const ex: Any[] = [];
const kf = (...p: Any[]) => ({ type: 'keyframes', poses: p });
const ANK = (x = 0, y = 10) => ({ pt: 'ankle', x: r(x), y: r(y) });
const STAND = { torso: 0, thigh: 0, shin: 0, foot: 0, arm: 0, fore: -10, armAbd: 6, foreAbd: 6, legAbd: 3 };
const HALTER = [['halteres']];
const HALTER_KB = [['halteres'], ['kettlebell']];
function add(e: Any) {
  ex.push({
    id: e.id,
    nome: e.nome,
    apelidos: [],
    musculos_secundarios: [],
    equipamentos: HALTER,
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
/** Copia poses de outro exercício trocando alguns campos. */
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

// Deitado de barriga para cima com joelhos dobrados (pés presos), como na ponte.
const SUPINE = { torso: -90, thigh: -135, shin: 160.6, foot: -25.6, legAbd: 4, an: ANK() };
// Tronco inclinado com joelhos levemente dobrados, como na remada curvada.
const BENT = (torso: number) => ({ torso, thigh: -20, shin: 30, foot: -10, legAbd: 4, an: ANK() });

// ============ PEITO ============
add({
  id: 'supino_chao_halteres',
  nome: 'Supino no chão com halteres',
  apelidos: ['floor press', 'supino deitado no chão'],
  musculo_principal: 'peitoral',
  musculos_secundarios: ['triceps', 'deltoide_anterior'],
  padrao_movimento: 'empurrar',
  nivel: 2,
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: anim(
    2600,
    { mat: true, dumbbell: 'two' },
    kf(
      { ...SUPINE, arm: -90, fore: 0, armAbd: 8, foreAbd: 8 },
      { ...SUPINE, arm: 0, fore: -90, armAbd: 75, foreAbd: 0 },
    ),
  ),
  passo_a_passo: [
    'Deite de barriga para cima com os joelhos dobrados e um halter em cada mão.',
    'Comece com os braços esticados para o teto, na linha do peito.',
    'Desça os halteres até os cotovelos encostarem de leve no chão, abertos uns 45° do corpo.',
    'Empurre de volta até esticar os braços.',
  ],
  erros_comuns: ['Bater os cotovelos com força no chão.', 'Abrir os cotovelos na linha dos ombros.'],
});

add({
  id: 'crucifixo_chao',
  nome: 'Crucifixo no chão',
  apelidos: ['crucifixo deitado', 'fly'],
  musculo_principal: 'peitoral',
  musculos_secundarios: ['deltoide_anterior'],
  padrao_movimento: 'empurrar',
  nivel: 2,
  variacao_mais_facil: 'supino_chao_halteres',
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: anim(
    2800,
    { mat: true, dumbbell: 'two', dumbbellAxis: 'x' },
    kf(
      { ...SUPINE, arm: -90, fore: -8, armAbd: 8, foreAbd: 8 },
      { ...SUPINE, arm: -90, fore: -12, armAbd: 76, foreAbd: 76 },
    ),
  ),
  passo_a_passo: [
    'Deite de barriga para cima com os joelhos dobrados e os halteres acima do peito, palmas uma de frente para a outra.',
    'Com os cotovelos levemente dobrados, abra os braços para os lados.',
    'Desça até os braços ficarem perto do chão, sentindo o peito alongar.',
    'Feche os braços como num abraço, voltando ao início.',
  ],
  erros_comuns: ['Esticar totalmente os cotovelos.', 'Usar peso demais e perder o controle na descida.'],
});

add({
  id: 'pullover_halter',
  nome: 'Pullover com halter',
  apelidos: ['pullover'],
  musculo_principal: 'dorsais',
  musculos_secundarios: ['peitoral', 'triceps'],
  padrao_movimento: 'puxar',
  nivel: 2,
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: anim(
    3000,
    { mat: true, dumbbell: 'one' },
    kf({ ...SUPINE, arm: -90, fore: -10, armAbd: 0, foreAbd: -21 }, { ...SUPINE, arm: -172, fore: -10, armAbd: 0, foreAbd: -21 }),
    ['dorsais', 'peitoral'],
  ),
  passo_a_passo: [
    'Deite de barriga para cima com os joelhos dobrados, segurando um halter com as duas mãos acima do peito.',
    'Com os cotovelos levemente dobrados, leve o halter para trás da cabeça.',
    'Desça até sentir alongar as costas, sem encostar no chão.',
    'Traga o halter de volta para cima do peito.',
  ],
  erros_comuns: ['Arquear a lombar ao levar o peso para trás.', 'Dobrar demais os cotovelos.'],
});

// ============ COSTAS ============
{
  // Remada serrote: mão esquerda apoiada na cadeira à frente, halter na mão direita.
  const base = BENT(75);
  const j = joints({ ...base, ...STAND, torso: 75, thigh: -20, shin: 30, foot: -10, an: ANK() } as never);
  const shL: P2 = [j.L.shoulder[0], j.L.shoulder[1]];
  const hand: P2 = [r(shL[0] + 30), 92];
  const support = armTo(shL, hand, 75, 'down');
  const ox = r(hand[0] + 31);
  const pose = (right: Any) => ({ ...base, arm: 0, fore: 0, armAbd: 4, foreAbd: 4, left: support, right });
  add({
    id: 'remada_serrote',
    nome: 'Remada serrote',
    apelidos: ['remada unilateral', 'serrote'],
    musculo_principal: 'dorsais',
    musculos_secundarios: ['biceps', 'deltoide_posterior', 'trapezio'],
    padrao_movimento: 'puxar',
    equipamentos: [['halteres', 'cadeira'], ['kettlebell', 'cadeira']],
    nivel: 2,
    unilateral: true,
    posicao: 'em_pe',
    vistas: ['lateral', 'costas'],
    animacao: anim(
      2600,
      { dumbbell: 'right', dumbbellAxis: 'x', chair: { x: ox, flip: true } },
      kf(pose({ arm: -80, fore: 0 }), pose({ arm: 25, fore: -100 })),
      ['dorsais', 'biceps'],
    ),
    passo_a_passo: [
      'Apoie uma mão no assento de uma cadeira firme e incline o tronco até ficar quase paralelo ao chão.',
      'Segure o halter com a outra mão, braço esticado para baixo.',
      'Puxe o halter em direção ao quadril, levando o cotovelo para trás e para cima.',
      'Desça devagar. Faça todas as repetições e troque de lado.',
    ],
    erros_comuns: ['Girar o tronco para subir o peso.', 'Puxar com o braço em direção ao peito em vez do quadril.'],
  });
}

add({
  id: 'crucifixo_inverso',
  nome: 'Crucifixo inverso com halteres',
  apelidos: ['voador invertido', 'abertura para trás'],
  musculo_principal: 'deltoide_posterior',
  musculos_secundarios: ['trapezio', 'dorsais'],
  padrao_movimento: 'puxar',
  nivel: 2,
  posicao: 'em_pe',
  vistas: ['costas', 'lateral', 'frente'],
  animacao: anim(
    2600,
    { dumbbell: 'two', dumbbellAxis: 'x' },
    kf({ ...BENT(70), arm: -70, fore: -8, armAbd: 6, foreAbd: 6 }, { ...BENT(70), arm: -70, fore: -8, armAbd: 80, foreAbd: 80 }),
    ['deltoides', 'trapezio'],
  ),
  passo_a_passo: [
    'Com um halter em cada mão, dobre levemente os joelhos e incline o tronco à frente, costas retas.',
    'Deixe os braços pendurados, com os cotovelos um pouco dobrados.',
    'Abra os braços para os lados até a altura dos ombros, apertando as escápulas.',
    'Desça devagar.',
  ],
  erros_comuns: ['Arredondar as costas.', 'Balançar o tronco para subir o peso.'],
});

// ============ OMBROS E BRAÇOS ============
{
  const front = { arm: -30, fore: -150, armAbd: 0, foreAbd: -6 };
  const side = { arm: -180, fore: 0, armAbd: 85, foreAbd: 0 };
  const top = { arm: -180, fore: 0, armAbd: 12, foreAbd: -2 };
  const st = { ...STAND, an: ANK() };
  add({
    id: 'desenvolvimento_arnold',
    nome: 'Desenvolvimento Arnold',
    apelidos: ['arnold press'],
    musculo_principal: 'deltoide_anterior',
    musculos_secundarios: ['deltoide_lateral', 'triceps'],
    padrao_movimento: 'empurrar',
    nivel: 3,
    variacao_mais_facil: 'desenvolvimento_halteres',
    posicao: 'em_pe',
    vistas: ['frente', 'lateral', 'costas'],
    animacao: anim(3600, { dumbbell: 'two', dumbbellAxis: 'x' }, kf({ ...st, ...front }, { ...st, ...side }, { ...st, ...top }, { ...st, ...side })),
    passo_a_passo: [
      'Em pé, segure os halteres na frente dos ombros, com as palmas viradas para você.',
      'Ao subir, abra os cotovelos para os lados, girando as palmas para a frente.',
      'Termine com os braços esticados acima da cabeça.',
      'Desça fazendo o caminho inverso.',
    ],
    erros_comuns: ['Arquear a lombar para empurrar.', 'Fazer o giro rápido demais, sem controle.'],
  });
}

add({
  id: 'elevacao_frontal',
  nome: 'Elevação frontal',
  apelidos: ['elevação frontal com halteres'],
  musculo_principal: 'deltoide_anterior',
  musculos_secundarios: ['trapezio'],
  padrao_movimento: 'empurrar',
  nivel: 1,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: anim(2600, { dumbbell: 'two' }, kf({ ...STAND, arm: 0, fore: -6, an: ANK() }, { ...STAND, arm: -90, fore: -6, an: ANK() }), ['deltoides']),
  passo_a_passo: [
    'Em pé, com um halter em cada mão na frente das coxas.',
    'Suba os braços esticados à frente até a altura dos ombros.',
    'Segure um instante e desça devagar.',
  ],
  erros_comuns: ['Balançar o corpo para subir.', 'Subir acima da altura dos ombros.'],
});

add({
  id: 'encolhimento_halteres',
  nome: 'Encolhimento de ombros',
  apelidos: ['encolhimento', 'shrug'],
  musculo_principal: 'trapezio',
  musculos_secundarios: ['antebraco'],
  padrao_movimento: 'puxar',
  nivel: 1,
  posicao: 'em_pe',
  vistas: ['frente', 'lateral', 'costas'],
  animacao: anim(
    2000,
    { dumbbell: 'two', dumbbellAxis: 'x' },
    kf({ ...STAND, arm: 0, fore: 0, armAbd: 8, foreAbd: 8, an: ANK() }, { ...STAND, arm: 0, fore: 0, armAbd: 8, foreAbd: 8, shrug: 14, an: ANK() }),
  ),
  passo_a_passo: [
    'Em pé, com um halter em cada mão ao lado do corpo.',
    'Suba os ombros em direção às orelhas, sem dobrar os cotovelos.',
    'Segure um segundo no alto e desça devagar.',
  ],
  erros_comuns: ['Girar os ombros em círculo.', 'Dobrar os cotovelos para ajudar.'],
});

add({
  id: 'rosca_martelo',
  nome: 'Rosca martelo',
  apelidos: ['rosca neutra'],
  musculo_principal: 'biceps',
  musculos_secundarios: ['antebraco'],
  padrao_movimento: 'puxar',
  nivel: 1,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: anim(2400, { dumbbell: 'two', dumbbellAxis: 'x' }, kf(...poses('rosca_biceps'))),
  passo_a_passo: [
    'Em pé, com um halter em cada mão e as palmas viradas para o corpo.',
    'Mantenha os cotovelos colados ao lado do corpo.',
    'Dobre os cotovelos e suba os halteres sem girar os punhos.',
    'Desça devagar até esticar os braços.',
  ],
  erros_comuns: ['Afastar os cotovelos do corpo.', 'Balançar o tronco.'],
});

{
  const SEAT = { torso: 32, thigh: -90, shin: 90, foot: 0, legAbd: 14, an: { pt: 'hip', x: 0, y: 100 } };
  const leftArm = { arm: -50, fore: -30, armAbd: 10, foreAbd: 10 };
  add({
    id: 'rosca_concentrada',
    nome: 'Rosca concentrada',
    apelidos: ['rosca sentado'],
    musculo_principal: 'biceps',
    musculos_secundarios: ['antebraco'],
    padrao_movimento: 'puxar',
    equipamentos: [['halteres', 'cadeira']],
    nivel: 2,
    variacao_mais_facil: 'rosca_biceps',
    unilateral: true,
    posicao: 'sentado',
    vistas: ['lateral', 'frente'],
    animacao: anim(
      2400,
      { chair: true, dumbbell: 'right' },
      kf(
        { ...SEAT, arm: -37, fore: 0, armAbd: -6, foreAbd: -6, left: leftArm },
        { ...SEAT, arm: -37, fore: -135, armAbd: -6, foreAbd: -6, left: leftArm },
      ),
    ),
    passo_a_passo: [
      'Sente na ponta da cadeira com as pernas afastadas e incline o tronco à frente.',
      'Apoie o cotovelo do braço com o halter na parte de dentro da coxa.',
      'Dobre o cotovelo e suba o halter em direção ao ombro.',
      'Desça devagar. Faça todas as repetições e troque de braço.',
    ],
    erros_comuns: ['Tirar o cotovelo da coxa.', 'Usar o tronco para ajudar a subir.'],
  });
}

add({
  id: 'triceps_coice',
  nome: 'Tríceps coice',
  apelidos: ['tríceps kickback', 'coice com halter'],
  musculo_principal: 'triceps',
  padrao_movimento: 'empurrar',
  nivel: 2,
  posicao: 'em_pe',
  vistas: ['lateral'],
  animacao: anim(
    2400,
    { dumbbell: 'two', dumbbellAxis: 'x' },
    kf({ ...BENT(60), arm: 0, fore: -60, armAbd: 4, foreAbd: 4 }, { ...BENT(60), arm: 0, fore: 0, armAbd: 4, foreAbd: 4 }),
  ),
  passo_a_passo: [
    'Com um halter em cada mão, dobre os joelhos e incline o tronco à frente, costas retas.',
    'Suba os cotovelos até os braços ficarem colados ao lado do corpo.',
    'Estique os cotovelos levando os halteres para trás.',
    'Volte devagar até os antebraços ficarem pendurados.',
  ],
  erros_comuns: ['Deixar o cotovelo cair durante o movimento.', 'Balançar o braço inteiro.'],
});

// ============ PERNAS ============
add({
  id: 'afundo_halteres',
  nome: 'Afundo com halteres',
  apelidos: ['passada com halteres'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['gluteos', 'posteriores_coxa'],
  padrao_movimento: 'avanco',
  equipamentos: HALTER_KB,
  nivel: 3,
  variacao_mais_facil: 'afundo',
  variacao_mais_dificil: 'bulgaro_halteres',
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente', 'costas'],
  animacao: anim(3000, { dumbbell: 'two', dumbbellAxis: 'x' }, kf(...withArms(poses('afundo'), { arm: -3, fore: 0, armAbd: 6, foreAbd: 6 }))),
  passo_a_passo: [
    'Em pé, com um halter em cada mão ao lado do corpo, dê um passo grande à frente.',
    'Desça até o joelho de trás quase encostar no chão.',
    'Mantenha o tronco reto e os braços esticados.',
    'Empurre com o pé da frente para subir. Faça todas as repetições e troque de perna.',
  ],
  erros_comuns: ['Inclinar o tronco para a frente.', 'Deixar o joelho da frente cair para dentro.'],
});

add({
  id: 'bulgaro_halteres',
  nome: 'Agachamento búlgaro com halteres',
  apelidos: ['búlgaro com peso'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['gluteos', 'posteriores_coxa'],
  padrao_movimento: 'avanco',
  equipamentos: [['halteres', 'cadeira'], ['kettlebell', 'cadeira']],
  nivel: 4,
  variacao_mais_facil: 'agachamento_bulgaro',
  unilateral: true,
  posicao: 'em_pe',
  vistas: ['lateral', 'frente'],
  animacao: anim(
    3000,
    { chair: { x: -178 }, dumbbell: 'two', dumbbellAxis: 'x' },
    kf(...withArms(poses('agachamento_bulgaro'), { arm: -6, fore: 0, armAbd: 6, foreAbd: 6 })),
    ['quadriceps', 'gluteos'],
  ),
  passo_a_passo: [
    'Fique de costas para a cadeira, com o peito de um pé apoiado no assento e um halter em cada mão.',
    'Mantenha o tronco firme e os braços esticados ao lado do corpo.',
    'Desça dobrando a perna da frente até a coxa ficar quase na horizontal.',
    'Suba empurrando com o pé da frente. Faça todas as repetições e troque de perna.',
  ],
  erros_comuns: ['Ficar perto demais da cadeira.', 'Inclinar o tronco para a frente com o peso.'],
});

{
  const sumo = poses('agachamento_sumo');
  add({
    id: 'agachamento_sumo_halter',
    nome: 'Agachamento sumô com halter',
    apelidos: ['sumô com peso'],
    musculo_principal: 'quadriceps',
    musculos_secundarios: ['adutores', 'gluteos'],
    padrao_movimento: 'agachar',
    equipamentos: HALTER_KB,
    nivel: 2,
    variacao_mais_facil: 'agachamento_sumo',
    posicao: 'em_pe',
    vistas: ['frente', 'lateral', 'costas'],
    animacao: anim(
      2800,
      { dumbbell: 'one' },
      kf(...sumo.map((p) => ({ ...p, arm: -p.torso, fore: 0, armAbd: 0, foreAbd: -9 }))),
      ['quadriceps', 'gluteos'],
    ),
    passo_a_passo: [
      'Afaste bem os pés, com as pontas viradas para fora, e segure um halter com as duas mãos entre as pernas.',
      'Mantenha os braços esticados e o tronco alto.',
      'Desça levando os joelhos para fora até as coxas ficarem perto da horizontal.',
      'Empurre o chão e suba.',
    ],
    erros_comuns: ['Deixar os joelhos caírem para dentro.', 'Curvar as costas para pegar o peso.'],
  });
}

add({
  id: 'ponte_halter',
  nome: 'Ponte de glúteo com halter',
  apelidos: ['elevação de quadril com peso'],
  musculo_principal: 'gluteos',
  musculos_secundarios: ['posteriores_coxa', 'lombar'],
  padrao_movimento: 'dobradica_quadril',
  equipamentos: HALTER_KB,
  nivel: 2,
  variacao_mais_facil: 'ponte_gluteo',
  posicao: 'deitado',
  vistas: ['lateral'],
  animacao: anim(
    2800,
    { mat: true, dumbbell: 'one', dumbbellAxis: 'z' },
    kf(...poses('ponte_gluteo').map((p) => ({ ...p, arm: -12, fore: 0, armAbd: 6, foreAbd: -6 }))),
  ),
  passo_a_passo: [
    'Deite de barriga para cima com os joelhos dobrados e apoie o halter em cima do quadril, segurando com as duas mãos.',
    'Empurre o chão com os calcanhares e suba o quadril até alinhar joelhos, quadril e ombros.',
    'Aperte os glúteos no alto por um segundo.',
    'Desça devagar.',
  ],
  erros_comuns: ['Arquear a lombar no alto.', 'Empurrar com a ponta dos pés.'],
});

{
  const rack = { arm: -180, fore: 0, armAbd: 80, foreAbd: 0 };
  const top = { arm: -180, fore: 0, armAbd: 12, foreAbd: -2 };
  add({
    id: 'thruster_halteres',
    nome: 'Thruster com halteres',
    apelidos: ['agachamento com desenvolvimento'],
    musculo_principal: 'quadriceps',
    musculos_secundarios: ['gluteos', 'deltoide_anterior', 'triceps'],
    padrao_movimento: 'agachar',
    nivel: 3,
    variacao_mais_facil: 'agachamento_goblet',
    posicao: 'em_pe',
    vistas: ['lateral', 'frente', 'costas'],
    animacao: anim(
      2600,
      { dumbbell: 'two' },
      kf(
        { ...STAND, torso: 38, thigh: -80, shin: 125, foot: -45, legAbd: 8, ...rack, an: ANK() },
        { ...STAND, ...top, an: ANK() },
      ),
      ['quadriceps', 'deltoides'],
    ),
    passo_a_passo: [
      'Segure os halteres na altura dos ombros e afaste os pés na largura dos ombros.',
      'Agache até as coxas ficarem perto da horizontal.',
      'Suba com força e, no mesmo movimento, empurre os halteres acima da cabeça.',
      'Traga os halteres de volta aos ombros enquanto desce para o próximo agachamento.',
    ],
    erros_comuns: ['Separar o agachamento do empurrão, perdendo o impulso.', 'Arquear a lombar no alto.'],
  });
}

add({
  id: 'panturrilha_halteres',
  nome: 'Elevação de panturrilha com halteres',
  apelidos: ['panturrilha com peso'],
  musculo_principal: 'panturrilhas',
  padrao_movimento: 'agachar',
  equipamentos: HALTER_KB,
  nivel: 2,
  variacao_mais_facil: 'elevacao_panturrilha',
  posicao: 'em_pe',
  vistas: ['lateral', 'frente', 'costas'],
  animacao: anim(2000, { dumbbell: 'two', dumbbellAxis: 'x' }, kf(...withArms(poses('elevacao_panturrilha'), { arm: 0, fore: 0, armAbd: 6, foreAbd: 6 }))),
  passo_a_passo: [
    'Em pé, com um halter em cada mão ao lado do corpo.',
    'Suba na ponta dos pés o mais alto que conseguir.',
    'Segure um segundo no alto.',
    'Desça devagar até os calcanhares encostarem no chão.',
  ],
  erros_comuns: ['Dobrar os joelhos para ajudar.', 'Descer rápido demais.'],
});

// ============ ABDÔMEN ============
{
  const HIP = { pt: 'hip', x: 0, y: 27 };
  const legs = legTo([0, 27], [118, 12], 'up', 0);
  const arms = { arm: -38, fore: -55, armAbd: 0, foreAbd: -14 };
  const pose = (tw: number) => ({ torso: -45, twist: tw, ...legs, legAbd: 6, ...arms, an: HIP });
  add({
    id: 'abdominal_russo',
    nome: 'Abdominal russo com halter',
    apelidos: ['russian twist', 'rotação sentado'],
    musculo_principal: 'obliquos',
    musculos_secundarios: ['abdomen'],
    padrao_movimento: 'core',
    equipamentos: HALTER_KB,
    nivel: 2,
    variacao_mais_facil: 'abdominal_bicicleta',
    posicao: 'deitado',
    vistas: ['lateral'],
    animacao: anim(2000, { mat: true, dumbbell: 'one', dumbbellAxis: 'z' }, kf(pose(40), pose(-40)), ['abdomen']),
    passo_a_passo: [
      'Sente no chão com os joelhos dobrados e incline o tronco para trás, costas retas.',
      'Segure o halter com as duas mãos na frente do peito.',
      'Gire o tronco para um lado, levando o halter perto do quadril.',
      'Gire para o outro lado, num ritmo controlado.',
    ],
    erros_comuns: ['Arredondar as costas.', 'Mexer só os braços, sem girar o tronco.'],
  });
}

writeFileSync(OUT, toJson({ versao: 1, exercicios: ex.map(ordered) }));
console.log(ex.length, 'exercícios');

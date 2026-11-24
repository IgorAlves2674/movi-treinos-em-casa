/// <reference types="node" />
/**
 * Gera o arquivo de exercícios deste lote: cardio com equipamento (corda, esteira,
 * bicicleta e elíptico). Os movimentos são contínuos (funções em src/figure/motion.ts).
 * Uso (na pasta movi-app): npx tsx scripts/autoria/cardio-equipamento.ts
 */
import { writeFileSync } from 'node:fs';

import { ordered, toJson } from './lib';

const OUT = 'src/content/exercises/cardio_equipamento.json';
type Any = Record<string, any>;
const ex: Any[] = [];
function add(e: Any) {
  ex.push({
    apelidos: [],
    musculos_secundarios: [],
    padrao_movimento: 'cardio',
    unidade: 'tempo',
    variacao_mais_facil: null,
    variacao_mais_dificil: null,
    impacto: 'baixo',
    barulho: 'baixo',
    unilateral: false,
    posicao: 'em_pe',
    ...e,
  });
}
const anim = (duracao_ms: number, props: Any, id: string, destaque: string[]) => ({
  tipo: 'boneco',
  duracao_ms,
  props,
  destaque,
  movimento: { type: 'continuous', id },
});

add({
  id: 'corda_alternada',
  nome: 'Pular corda alternando os pés',
  apelidos: ['corda corridinha', 'pular corda alternado'],
  musculo_principal: 'panturrilhas',
  musculos_secundarios: ['quadriceps', 'deltoide_anterior'],
  equipamentos: [['corda']],
  nivel: 2,
  variacao_mais_facil: 'pular_corda',
  variacao_mais_dificil: 'corda_dupla',
  impacto: 'medio',
  barulho: 'medio',
  vistas: ['lateral', 'frente'],
  animacao: anim(900, { rope: true }, 'corda_alternada', ['panturrilhas', 'quadriceps']),
  passo_a_passo: [
    'Segure as pontas da corda com os cotovelos perto do corpo.',
    'Gire a corda com os punhos e, a cada volta, passe por cima dela com um pé de cada vez.',
    'Mantenha os saltos baixos, na ponta dos pés, como uma corridinha no lugar.',
    'Siga num ritmo constante pelo tempo indicado.',
  ],
  erros_comuns: ['Girar a corda com os braços inteiros em vez dos punhos.', 'Levantar demais os joelhos.'],
});

add({
  id: 'corda_dupla',
  nome: 'Corda dupla',
  apelidos: ['double under', 'pular corda duplo'],
  musculo_principal: 'panturrilhas',
  musculos_secundarios: ['quadriceps', 'deltoide_anterior', 'antebraco'],
  equipamentos: [['corda']],
  nivel: 5,
  variacao_mais_facil: 'corda_alternada',
  impacto: 'alto',
  barulho: 'alto',
  vistas: ['lateral', 'frente'],
  animacao: anim(760, { rope: true }, 'corda_dupla', ['panturrilhas', 'quadriceps']),
  passo_a_passo: [
    'Comece pulando corda normal para pegar o ritmo.',
    'Dê um pulo mais alto e gire a corda mais rápido, para ela passar duas vezes embaixo dos pés.',
    'Aterrisse na ponta dos pés, com os joelhos levemente dobrados.',
    'Intercale pulos simples se precisar recuperar o ritmo.',
  ],
  erros_comuns: ['Dobrar os joelhos para a frente em vez de pular mais alto.', 'Abrir os braços, perdendo velocidade na corda.'],
});

add({
  id: 'caminhada_esteira',
  nome: 'Caminhada na esteira',
  apelidos: ['caminhada inclinada', 'esteira caminhando'],
  musculo_principal: 'corpo_inteiro',
  musculos_secundarios: ['quadriceps', 'gluteos', 'panturrilhas'],
  equipamentos: [['esteira']],
  nivel: 1,
  variacao_mais_dificil: 'corrida_esteira',
  vistas: ['lateral', 'costas'],
  animacao: anim(1400, { treadmill: true }, 'caminhada_esteira', ['quadriceps', 'gluteos']),
  passo_a_passo: [
    'Suba na esteira parada, segure no apoio e comece numa velocidade baixa.',
    'Aumente a velocidade até uma caminhada firme, em que dá para conversar com algum esforço.',
    'Para deixar mais puxado, aumente a inclinação em vez da velocidade.',
    'Solte as mãos do apoio e balance os braços naturalmente.',
  ],
  erros_comuns: ['Ficar segurando no apoio o tempo todo.', 'Caminhar na beirada da lona.'],
});

add({
  id: 'corrida_esteira',
  nome: 'Corrida na esteira',
  apelidos: ['esteira correndo', 'trote na esteira'],
  musculo_principal: 'corpo_inteiro',
  musculos_secundarios: ['quadriceps', 'posteriores_coxa', 'panturrilhas'],
  equipamentos: [['esteira']],
  nivel: 3,
  variacao_mais_facil: 'caminhada_esteira',
  impacto: 'alto',
  barulho: 'medio',
  vistas: ['lateral', 'costas'],
  animacao: anim(760, { treadmill: true }, 'corrida_esteira', ['quadriceps', 'posteriores_coxa']),
  passo_a_passo: [
    'Aqueça caminhando por alguns minutos.',
    'Aumente a velocidade aos poucos até um trote confortável.',
    'Pise embaixo do corpo, com passos curtos, e mantenha o tronco levemente inclinado à frente.',
    'No fim, diminua a velocidade e caminhe antes de parar.',
  ],
  erros_comuns: ['Dar passadas longas, pisando com o calcanhar muito à frente.', 'Olhar para os pés.'],
});

add({
  id: 'bicicleta_ergometrica',
  nome: 'Bicicleta ergométrica',
  apelidos: ['bike', 'bicicleta'],
  musculo_principal: 'quadriceps',
  musculos_secundarios: ['gluteos', 'panturrilhas', 'posteriores_coxa'],
  equipamentos: [['bicicleta']],
  nivel: 1,
  posicao: 'sentado',
  vistas: ['lateral', 'costas'],
  animacao: anim(1100, { bike: true }, 'bicicleta', ['quadriceps', 'gluteos']),
  passo_a_passo: [
    'Ajuste o banco: com o pedal embaixo, o joelho fica quase esticado.',
    'Segure o guidão sem travar os cotovelos e mantenha as costas retas.',
    'Pedale num ritmo constante, ajustando a carga para manter o esforço indicado.',
    'Nos tiros, aumente a carga ou a velocidade e depois volte ao ritmo leve.',
  ],
  erros_comuns: ['Banco baixo demais, forçando os joelhos.', 'Balançar o quadril no banco.'],
});

add({
  id: 'eliptico',
  nome: 'Elíptico',
  apelidos: ['transport', 'elíptica'],
  musculo_principal: 'corpo_inteiro',
  musculos_secundarios: ['quadriceps', 'gluteos', 'dorsais', 'peitoral'],
  equipamentos: [['eliptico']],
  nivel: 1,
  vistas: ['lateral', 'costas'],
  animacao: anim(1300, { elliptical: true }, 'eliptico', ['quadriceps', 'gluteos']),
  passo_a_passo: [
    'Suba nos pedais segurando nos braços móveis do aparelho.',
    'Faça o movimento empurrando e puxando os braços junto com as pernas.',
    'Mantenha o tronco reto e o peso distribuído no pé inteiro.',
    'Ajuste a carga para manter o esforço indicado.',
  ],
  erros_comuns: ['Inclinar o tronco sobre o painel.', 'Ficar na ponta dos pés.'],
});

writeFileSync(OUT, toJson({ versao: 1, exercicios: ex.map(ordered) }));
console.log(ex.length, 'exercícios');

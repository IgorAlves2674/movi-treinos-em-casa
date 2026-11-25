import type { FigureMotion, FigureMuscle, FigureProps, FigureView } from '@/figure/types';

/**
 * Estrutura de um exercício (spec seção 5.2). O banco de exercícios é conteúdo
 * do app: fica em `exercicios.json`, versionado no repositório, separado dos
 * dados do usuário.
 */

export const MUSCULOS = [
  'peitoral',
  'deltoide_anterior',
  'deltoide_lateral',
  'deltoide_posterior',
  'biceps',
  'triceps',
  'antebraco',
  'dorsais',
  'trapezio',
  'lombar',
  'abdomen',
  'obliquos',
  'gluteos',
  'quadriceps',
  'posteriores_coxa',
  'adutores',
  'panturrilhas',
  'corpo_inteiro',
] as const;
export type Musculo = (typeof MUSCULOS)[number];

export const PADROES_MOVIMENTO = [
  'empurrar',
  'puxar',
  'agachar',
  'dobradica_quadril',
  'avanco',
  'core',
  'cardio',
  'mobilidade',
  /** Alongamentos do fim do treino (spec 7.5). */
  'alongamento',
] as const;
export type PadraoMovimento = (typeof PADROES_MOVIMENTO)[number];

/** Equipamentos que a pessoa marca no onboarding (spec seção 4). */
export const EQUIPAMENTOS = [
  'halteres',
  'barra_anilhas',
  'kettlebell',
  'caneleira',
  'barra_fixa',
  'step',
  'elastico_alca',
  'miniband',
  'corda',
  'esteira',
  'bicicleta',
  'eliptico',
] as const;
/** Sempre disponíveis, sem perguntar: peso corporal, chão/tapete, parede, cadeira. */
export const EQUIPAMENTOS_SEMPRE_DISPONIVEIS = ['cadeira', 'parede'] as const;
export type Equipamento = (typeof EQUIPAMENTOS)[number] | (typeof EQUIPAMENTOS_SEMPRE_DISPONIVEIS)[number];

export type Unidade = 'repeticoes' | 'tempo' | 'distancia';
export type Intensidade = 'baixo' | 'medio' | 'alto';
export type Posicao = 'em_pe' | 'sentado' | 'deitado' | 'apoio_chao';

/** Animação do boneco. `tipo` permite trocar no futuro por animações 3D licenciadas (spec 6.3). */
export type AnimacaoExercicio = {
  tipo: 'boneco';
  duracao_ms: number;
  props?: FigureProps;
  /** Músculos em verde. Se omitido, usa o músculo principal. */
  destaque?: FigureMuscle[];
  movimento: FigureMotion;
};

export type Exercicio = {
  id: string;
  nome: string;
  apelidos: string[];
  musculo_principal: Musculo;
  musculos_secundarios: Musculo[];
  padrao_movimento: PadraoMovimento;
  /**
   * Opções de equipamento; cada opção é a lista de itens necessários.
   * `[[]]` = sem equipamento. `[["halteres"], ["kettlebell"]]` = halter OU kettlebell.
   */
  equipamentos: Equipamento[][];
  nivel: 1 | 2 | 3 | 4 | 5;
  unidade: Unidade;
  variacao_mais_facil: string | null;
  variacao_mais_dificil: string | null;
  impacto: Intensidade;
  barulho: Intensidade;
  unilateral: boolean;
  posicao: Posicao;
  /** A primeira vista é a padrão. Deitado/apoio no chão: só ['lateral']. */
  vistas: FigureView[];
  animacao: AnimacaoExercicio;
  passo_a_passo: string[];
  erros_comuns: string[];
};

export type ArquivoExercicios = {
  versao: number;
  exercicios: Exercicio[];
};

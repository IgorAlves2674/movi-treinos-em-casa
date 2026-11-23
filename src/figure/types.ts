/**
 * Tipos da animação do boneco (spec seção 6).
 *
 * Ângulos em graus. Convenções (vista lateral, boneco olhando para a direita):
 *  - `torso`: inclinação do tronco (0 = em pé, -90 = deitado de barriga para cima).
 *  - `thigh`: coxa em relação à vertical (0 = para baixo, negativo = para a frente).
 *  - `shin`, `foot`: relativos ao segmento anterior.
 *  - `arm`: braço relativo ao tronco; `fore`: antebraço relativo ao braço.
 *  - `armAbd`, `foreAbd`, `legAbd`: abertura para o lado (abdução).
 *  - `an`: ponto preso (âncora) e a posição dele no mundo (y para cima, chão em y = 0).
 */

export type FigureView = 'lateral' | 'frente' | 'costas';

/** Músculos que o boneco sabe destacar em verde. */
export type FigureMuscle =
  | 'peitoral'
  | 'abdomen'
  | 'deltoides'
  | 'biceps'
  | 'triceps'
  | 'dorsais'
  | 'trapezio'
  | 'lombar'
  | 'gluteos'
  | 'quadriceps'
  | 'panturrilhas';

export type AnchorPoint = 'hip' | 'knee' | 'ankle' | 'elbow' | 'hand';

export type Pose = {
  torso: number;
  thigh: number;
  shin: number;
  foot: number;
  arm: number;
  fore: number;
  armAbd?: number;
  foreAbd?: number;
  legAbd?: number;
  an: { pt: AnchorPoint; x: number; y: number };
  /** Ângulo da corda (radianos), só para exercícios com corda. */
  ropeAngle?: number;
};

/** Funções de movimento contínuo (ex.: pular corda), que não cabem em poses-chave. */
export type ContinuousMotionId = 'pular_corda';

export type FigureMotion =
  /** 2 a 4 poses-chave, interpoladas em loop: cada pose → próxima → … → primeira. */
  | { type: 'keyframes'; poses: Pose[] }
  | { type: 'continuous'; id: ContinuousMotionId };

export type FigureProps = {
  mat?: boolean;
  chair?: boolean;
  /** 'one' = um halter segurado com as duas mãos; 'two' = um em cada mão */
  dumbbell?: 'one' | 'two';
  rope?: boolean;
};

export type FigureAnimation = {
  /** Duração de um ciclo, em ms */
  durationMs: number;
  /** Vistas disponíveis. Exercícios deitados: só ['lateral'] */
  views: FigureView[];
  highlight: FigureMuscle[];
  props?: FigureProps;
  motion: FigureMotion;
};

/** Uma forma pronta para desenhar, já ordenada por profundidade. */
export type DrawItem = {
  depth: number;
  path: string;
  fill: string; // 'none' para linhas
  stroke?: string; // padrão: contorno branco
  strokeWidth?: number; // padrão: 2.2
};

export type ViewBox = { x: number; y: number; w: number; h: number };

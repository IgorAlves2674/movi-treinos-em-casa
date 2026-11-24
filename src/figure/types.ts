/**
 * Tipos da animação do boneco (spec seção 6).
 *
 * Ângulos em graus. Convenções (vista lateral, boneco olhando para a direita):
 *  - `torso`: inclinação do tronco (0 = em pé, positivo = inclina para a frente,
 *    90 = deitado de bruços, -90 = deitado de barriga para cima).
 *  - `thigh`: coxa em relação à vertical do mundo (0 = para baixo, negativo = para a frente).
 *  - `shin`, `foot`: relativos ao segmento anterior.
 *  - `arm`: braço relativo ao tronco; `fore`: antebraço relativo ao braço.
 *  - `armAbd`, `foreAbd`, `legAbd`: abertura para o lado (abdução).
 *  - `roll`: gira o corpo inteiro em volta do eixo do tronco (deitar de lado).
 *    Com o tronco deitado de bruços (90), roll = -90 deixa o lado esquerdo no chão,
 *    de frente para a câmera na vista lateral.
 *  - `twist`: gira só a parte de cima (ombros, braços, cabeça) em volta do eixo do
 *    tronco (positivo = ombro direito vai para a frente).
 *  - `shrug`: sobe os ombros (encolhimento), em unidades do mundo.
 *  - `an`: ponto preso (âncora) e a posição dele no mundo (y para cima, chão em y = 0).
 *    `side: 'left'` prende o ponto do lado esquerdo (padrão: direito).
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
  | 'posteriores_coxa'
  | 'panturrilhas';

export type AnchorPoint = 'hip' | 'knee' | 'ankle' | 'elbow' | 'hand';

/** Ângulos de um lado do corpo (pernas e braços). */
export type LimbAngles = {
  thigh: number;
  shin: number;
  foot: number;
  arm: number;
  fore: number;
  armAbd?: number;
  foreAbd?: number;
  legAbd?: number;
};
export type LimbKey = keyof LimbAngles;

export type Pose = LimbAngles & {
  torso: number;
  /**
   * Valores só do lado direito / esquerdo (movimentos assimétricos, ex.: afundo).
   * O lado direito fica perto da câmera na vista lateral e é o lado da âncora.
   */
  right?: Partial<LimbAngles>;
  left?: Partial<LimbAngles>;
  roll?: number;
  twist?: number;
  /** Sobe os dois ombros (encolhimento), em unidades do mundo. */
  shrug?: number;
  an: { pt: AnchorPoint; x: number; y: number; side?: 'left' };
  /** Ângulo da corda (radianos), só para exercícios com corda. */
  ropeAngle?: number;
};

/** Funções de movimento contínuo (ex.: pular corda), que não cabem em poses-chave. */
export type ContinuousMotionId =
  | 'pular_corda'
  | 'corda_alternada'
  | 'corda_dupla'
  | 'circulos_braco'
  | 'escalador'
  | 'caminhada_esteira'
  | 'corrida_esteira'
  | 'bicicleta'
  | 'eliptico';

export type FigureMotion =
  /** 2 a 4 poses-chave, interpoladas em loop: cada pose → próxima → … → primeira. */
  | { type: 'keyframes'; poses: Pose[] }
  | { type: 'continuous'; id: ContinuousMotionId };

export type FigureProps = {
  mat?: boolean;
  /**
   * Cadeira. `true` = atrás do boneco, como para sentar. Com objeto: `x` desloca a
   * cadeira e `flip` vira o encosto para o outro lado (ex.: cadeira à frente para subir).
   */
  chair?: boolean | { x?: number; flip?: boolean };
  /** Parede vertical na posição x (superfície virada para o boneco). Só aparece de lado. */
  wall?: number;
  /**
   * 'one' = um halter segurado com as duas mãos; 'two' = um em cada mão;
   * 'right' = um halter só na mão direita (exercícios de um braço).
   */
  dumbbell?: 'one' | 'two' | 'right';
  /**
   * Direção da barra do halter. Com 'two'/'right': 'z' (padrão) = atravessado, como na
   * rosca; 'x' = pegada neutra. Com 'one': padrão = na direção do antebraço; 'z' = deitado
   * de um lado ao outro (ex.: apoiado no quadril).
   */
  dumbbellAxis?: 'x' | 'z';
  rope?: boolean;
  /** Barra com anilhas: nas mãos ('hands') ou apoiada nas costas ('back', agachamento). */
  barbell?: 'hands' | 'back';
  /** Kettlebell nas duas mãos juntas ('both') ou só na direita ('right'). */
  kettlebell?: 'both' | 'right';
  /**
   * Para onde fica o corpo do kettlebell em relação à mão: 'arm' (padrão) = na direção do
   * antebraço (balanço, acima da cabeça); 'down' = pendurado para baixo; 'up' = de cabeça
   * para baixo, acima das mãos (halo).
   */
  kettlebellHang?: 'arm' | 'down' | 'up';
  /**
   * Elástico com alças: das mãos até embaixo dos pés ('feet'), entre as duas mãos ('hands')
   * ou até um ponto fixo {x, y}, por exemplo preso no alto da porta.
   */
  band?: 'feet' | 'hands' | { x: number; y: number };
  /** Miniband em volta dos joelhos ou dos tornozelos. */
  miniband?: 'knees' | 'ankles';
  /**
   * Barra fixa na posição {x, y} do mundo (eixo de um lado ao outro). `posts` desenha
   * dois apoios até o chão (barra baixa, para a barra australiana).
   */
  bar?: { x: number; y: number; posts?: boolean };
  /** Aparelhos de cardio (posições fixas, combinando com os movimentos contínuos). */
  treadmill?: boolean;
  bike?: boolean;
  elliptical?: boolean;
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

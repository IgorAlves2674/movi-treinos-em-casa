import type { FigureAnimation } from './types';

/**
 * Os 4 exercícios do protótipo, usados para validar o boneco (etapa 2).
 * Na etapa 3 essas definições passam para o banco de exercícios.
 */
export const DEMO_ANIMATIONS: { id: string; name: string; info: string; anim: FigureAnimation }[] = [
  {
    id: 'ponte_gluteo',
    name: 'Ponte de glúteo',
    info: 'Deitado · peso corporal',
    anim: {
      durationMs: 2800,
      views: ['lateral'],
      highlight: ['gluteos'],
      props: { mat: true },
      motion: {
        type: 'keyframes',
        poses: [
          { torso: -90, thigh: -135, shin: 160.6, foot: -25.6, arm: 0, fore: 0, armAbd: 8, legAbd: 4, an: { pt: 'ankle', x: 0, y: 10 } },
          { torso: -105, thigh: -105, shin: 149.2, foot: -44.2, arm: 15, fore: 0, armAbd: 8, legAbd: 4, an: { pt: 'ankle', x: 0, y: 10 } },
        ],
      },
    },
  },
  {
    id: 'triceps_frances_sentado',
    name: 'Tríceps francês sentado',
    info: 'Sentado · halter + cadeira',
    anim: {
      durationMs: 2600,
      views: ['lateral', 'frente', 'costas'],
      highlight: ['triceps'],
      props: { chair: true, dumbbell: 'one' },
      motion: {
        type: 'keyframes',
        poses: [
          { torso: 0, thigh: -90, shin: 90, foot: 0, arm: 188, fore: -150, armAbd: -9, foreAbd: -12, legAbd: 3, an: { pt: 'hip', x: 0, y: 100 } },
          { torso: 0, thigh: -90, shin: 90, foot: 0, arm: 188, fore: 0, armAbd: -9, foreAbd: -12, legAbd: 3, an: { pt: 'hip', x: 0, y: 100 } },
        ],
      },
    },
  },
  {
    id: 'rosca_biceps',
    name: 'Rosca bíceps',
    info: 'Em pé · halteres',
    anim: {
      durationMs: 2400,
      views: ['lateral', 'frente', 'costas'],
      highlight: ['biceps'],
      props: { dumbbell: 'two' },
      motion: {
        type: 'keyframes',
        poses: [
          { torso: 0, thigh: 0, shin: 0, foot: 0, arm: -4, fore: 0, armAbd: 5, foreAbd: 5, legAbd: 3, an: { pt: 'ankle', x: 0, y: 10 } },
          { torso: 0, thigh: 0, shin: 0, foot: 0, arm: -4, fore: -140, armAbd: 5, foreAbd: 5, legAbd: 3, an: { pt: 'ankle', x: 0, y: 10 } },
        ],
      },
    },
  },
  {
    id: 'pular_corda',
    name: 'Pular corda',
    info: 'Pulando · corda',
    anim: {
      durationMs: 620,
      views: ['lateral', 'frente', 'costas'],
      highlight: ['panturrilhas'],
      props: { rope: true },
      motion: { type: 'continuous', id: 'pular_corda' },
    },
  },
];

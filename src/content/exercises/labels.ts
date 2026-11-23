import { strings } from '@/i18n';

import type { Exercicio } from './types';

/** "Halteres ou Kettlebell", "Halteres + Cadeira", "Peso corporal" */
export function rotuloEquipamentos(e: Exercicio): string {
  const s = strings.exercise;
  return e.equipamentos
    .map((opcao) => (opcao.length === 0 ? s.bodyweight : opcao.map((i) => s.equipment[i]).join(' + ')))
    .join(s.or);
}

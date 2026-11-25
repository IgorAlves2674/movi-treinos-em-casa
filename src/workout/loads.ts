import type { Exercicio } from '@/content/exercises';

const LOAD_ITEMS = new Set(['halteres', 'barra_anilhas', 'kettlebell', 'caneleira']);

/** O exercício usa carga (halter, barra, kettlebell, caneleira)? Então pede o peso. */
export function usesLoad(e: Exercicio): boolean {
  return e.equipamentos.length > 0 && e.equipamentos.every((op) => op.some((i) => LOAD_ITEMS.has(i)));
}

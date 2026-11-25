import { useSyncExternalStore } from 'react';

import type { GeneratorProfile, Workout } from './generator';

/**
 * Treino montado e ainda não começado (fica só na memória). O player e o
 * histórico (etapa 6) vão gravar o treino feito no banco.
 */
export type Draft = { workout: Workout; minutes: GeneratorProfile['minutes'] };
let current: Draft | null = null;
const listeners = new Set<() => void>();

export function setDraft(draft: Draft) {
  current = draft;
  for (const l of listeners) l();
}

export function useDraft(): Draft | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

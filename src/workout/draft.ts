import { useSyncExternalStore } from 'react';

import type { FocusGroup, Workout } from './generator';

/**
 * Treino montado e ainda não começado (fica só na memória). O player e o
 * histórico (etapa 6) vão gravar o treino feito no banco.
 */
let current: { workout: Workout; focus: FocusGroup[] } | null = null;
const listeners = new Set<() => void>();

export function setDraft(workout: Workout, focus: FocusGroup[]) {
  current = { workout, focus };
  for (const l of listeners) l();
}

export function useDraft() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}

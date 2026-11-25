import * as Haptics from 'expo-haptics';

/** Vibração curta: 'done' no fim de uma contagem, 'tick' nos toques. No navegador não faz nada. */
export function buzz(kind: 'tick' | 'done' = 'done'): void {
  const p =
    kind === 'done'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p.catch(() => undefined);
}

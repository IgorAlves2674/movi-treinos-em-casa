/** Sequência de treinos (spec 8.3). Sem banco, para dar para testar. */
import { addDays, localDate, weekStart } from '@/lib/dates';

export type Streak = { days: number; weeks: number; thisWeek: number; total: number };

/**
 * Sequência a partir dos dias treinados (AAAA-MM-DD, pode repetir).
 * Dias: seguidos até hoje (ou até ontem, se hoje ainda não treinou).
 * Semanas: seguidas com pelo menos um treino, até esta (ou a anterior, se esta ainda está vazia).
 */
export function streakOf(trainedDays: string[], today: string = localDate()): Streak {
  const days = new Set(trainedDays);
  const weeks = new Set(trainedDays.map(weekStart));

  let d = days.has(today) ? today : addDays(today, -1);
  let dayCount = 0;
  while (days.has(d)) {
    dayCount++;
    d = addDays(d, -1);
  }

  const thisWeekStart = weekStart(today);
  let w = weeks.has(thisWeekStart) ? thisWeekStart : addDays(thisWeekStart, -7);
  let weekCount = 0;
  while (weeks.has(w)) {
    weekCount++;
    w = addDays(w, -7);
  }

  const thisWeek = [...days].filter((x) => weekStart(x) === thisWeekStart).length;
  return { days: dayCount, weeks: weekCount, thisWeek, total: trainedDays.length };
}

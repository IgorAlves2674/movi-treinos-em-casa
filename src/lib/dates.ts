/** Data local no formato AAAA-MM-DD (dia do celular, não UTC). */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Converte AAAA-MM-DD em Date ao meio-dia local (evita pular de dia por fuso). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Dias inteiros de `a` até `b` (datas AAAA-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86_400_000);
}

/** Soma dias a uma data AAAA-MM-DD. */
export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** Segunda-feira da semana da data (AAAA-MM-DD). */
export function weekStart(s: string): string {
  const d = parseLocalDate(s);
  return addDays(s, -((d.getDay() + 6) % 7));
}

/** "1:05" a partir de segundos. */
export function mmss(sec: number): string {
  const t = Math.max(0, Math.ceil(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** Número decimal digitado ("72,5" ou "72.5"); null se vazio ou inválido. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** "72,5" (vírgula, até 1 casa). */
export function formatDecimal(n: number, digits = 1): string {
  return (Math.round(n * 10 ** digits) / 10 ** digits).toString().replace('.', ',');
}

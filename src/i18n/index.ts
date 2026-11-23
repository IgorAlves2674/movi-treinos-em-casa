import { ptBR } from './pt-BR';

export const strings = ptBR;

/** Troca {chave} pelos valores. Ex.: fmt(strings.home.greeting, { name: 'Igor' }) */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}

/** "Segunda, 23 de novembro" */
export function formatLongDate(date: Date): string {
  const d = strings.dates;
  return `${d.weekdays[date.getDay()]}, ${date.getDate()} de ${d.months[date.getMonth()]}`;
}

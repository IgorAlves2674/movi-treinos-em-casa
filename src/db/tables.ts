/**
 * Tabelas de dados do usuário que são sincronizadas com o Supabase.
 *
 * Toda tabela aqui tem as colunas-base (id UUID, user_id, created_at,
 * updated_at, deleted_at). No celular existe ainda a coluna `_dirty`
 * (1 = alteração ainda não enviada). No Supabase existe a coluna `synced_at`,
 * preenchida pelo servidor e usada como cursor para baixar alterações.
 *
 * Para criar uma tabela nova:
 *  1. adicionar uma migração local em `migrations.ts`;
 *  2. adicionar uma migração SQL em `supabase/migrations/`;
 *  3. registrar a tabela aqui.
 */
export type SyncedTable = {
  name: string;
  /** Colunas próprias da tabela (sem as colunas-base). */
  columns: readonly string[];
  /** Colunas guardadas como texto JSON no SQLite e como jsonb no Postgres. */
  jsonColumns?: readonly string[];
  /** Colunas guardadas como 0/1 no SQLite e como boolean no Postgres. */
  boolColumns?: readonly string[];
};

export const BASE_COLUMNS = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at'] as const;

export const SYNCED_TABLES = [
  {
    // Peso e medidas opcionais (spec 8.2)
    name: 'body_logs',
    columns: ['logged_on', 'weight_kg', 'waist_cm', 'hip_cm', 'arm_cm'],
  },
] as const satisfies readonly SyncedTable[];

export type SyncedTableName = (typeof SYNCED_TABLES)[number]['name'];

export function getTable(name: SyncedTableName): SyncedTable {
  const t = SYNCED_TABLES.find((x) => x.name === name);
  if (!t) throw new Error(`Tabela desconhecida: ${name}`);
  return t;
}

export function allColumns(table: SyncedTable): string[] {
  return [...BASE_COLUMNS, ...table.columns];
}

/** Linha base, como fica no celular. */
export type BaseRow = {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BodyLog = BaseRow & {
  logged_on: string; // AAAA-MM-DD
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
};

import { randomUUID } from 'expo-crypto';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { emitDataChange } from './events';
import { getTable, SYNCED_TABLES, type BaseRow, type SyncedTableName } from './tables';

/**
 * Gravações nas tabelas sincronizadas. Sempre usar estas funções (e não SQL
 * solto) para que `updated_at` e `_dirty` fiquem corretos.
 */

type Values = Record<string, SQLiteBindValue>;

function assertColumns(tableName: SyncedTableName, values: Values) {
  const allowed = new Set<string>(getTable(tableName).columns);
  for (const key of Object.keys(values)) {
    if (!allowed.has(key)) throw new Error(`Coluna inválida em ${tableName}: ${key}`);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function insertRow(
  db: SQLiteDatabase,
  tableName: SyncedTableName,
  values: Values,
): Promise<string> {
  assertColumns(tableName, values);
  const id = randomUUID();
  const now = nowIso();
  const row: Values = { ...values, id, created_at: now, updated_at: now, _dirty: 1 };
  const cols = Object.keys(row);
  await db.runAsync(
    `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map((c) => row[c]),
  );
  emitDataChange([tableName], 'local');
  return id;
}

export async function updateRow(
  db: SQLiteDatabase,
  tableName: SyncedTableName,
  id: string,
  patch: Values,
): Promise<void> {
  assertColumns(tableName, patch);
  const row: Values = { ...patch, updated_at: nowIso(), _dirty: 1 };
  const cols = Object.keys(row);
  await db.runAsync(
    `UPDATE ${tableName} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    [...cols.map((c) => row[c]), id],
  );
  emitDataChange([tableName], 'local');
}

/** Exclusão lógica: a linha continua existindo com `deleted_at` preenchido. */
export async function softDeleteRow(
  db: SQLiteDatabase,
  tableName: SyncedTableName,
  id: string,
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE ${tableName} SET deleted_at = ?, updated_at = ?, _dirty = 1 WHERE id = ?`,
    [now, now, id],
  );
  emitDataChange([tableName], 'local');
}

/** Lista as linhas não excluídas. `where` e `orderBy` são SQL fixo do app, nunca entrada do usuário. */
export async function listRows<T extends BaseRow>(
  db: SQLiteDatabase,
  tableName: SyncedTableName,
  opts: { where?: string; params?: SQLiteBindValue[]; orderBy?: string } = {},
): Promise<T[]> {
  const where = opts.where ? `AND (${opts.where})` : '';
  const order = opts.orderBy ? `ORDER BY ${opts.orderBy}` : '';
  return db.getAllAsync<T>(
    `SELECT * FROM ${tableName} WHERE deleted_at IS NULL ${where} ${order}`,
    opts.params ?? [],
  );
}

export async function countPendingChanges(db: SQLiteDatabase): Promise<number> {
  let total = 0;
  for (const t of SYNCED_TABLES) {
    const r = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${t.name} WHERE _dirty = 1`,
    );
    total += r?.n ?? 0;
  }
  return total;
}

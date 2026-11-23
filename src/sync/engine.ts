import type { SupabaseClient } from '@supabase/supabase-js';
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { emitDataChange } from '@/db/events';
import { allColumns, SYNCED_TABLES, type SyncedTable } from '@/db/tables';

/**
 * Sincronização offline-first.
 *
 * - **Enviar:** linhas com `_dirty = 1` vão para o Supabase por upsert. O dono
 *   (`user_id`) é sempre o usuário logado. Se a linha não mudou durante o envio,
 *   ela volta a `_dirty = 0`.
 * - **Baixar:** busca o que mudou no servidor desde o último cursor
 *   (`synced_at`, preenchido pelo servidor). Vale a última alteração
 *   (`updated_at` mais recente); uma alteração local ainda não enviada e mais
 *   nova que a do servidor é mantida.
 * - O servidor também ignora atualizações mais antigas que a que ele já tem
 *   (gatilho em `supabase/migrations`).
 */

const PUSH_BATCH = 200;
const PULL_PAGE = 500;

type LocalRow = Record<string, SQLiteBindValue> & { id: string; updated_at: string };
type RemoteRow = Record<string, unknown> & { id: string; updated_at: string; synced_at: string };

export type SyncResult = { pushed: number; pulled: number };

export async function syncAll(
  db: SQLiteDatabase,
  client: SupabaseClient,
  userId: string,
): Promise<SyncResult> {
  let pushed = 0;
  let pulled = 0;
  for (const table of SYNCED_TABLES) {
    pushed += await pushTable(db, client, table, userId);
  }
  for (const table of SYNCED_TABLES) {
    pulled += await pullTable(db, client, table);
  }
  return { pushed, pulled };
}

function toRemote(table: SyncedTable, row: LocalRow, userId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of allColumns(table)) {
    let v: unknown = row[col];
    if (v != null && table.jsonColumns?.includes(col)) v = JSON.parse(String(v));
    if (v != null && table.boolColumns?.includes(col)) v = v === 1 || v === true;
    out[col] = v ?? null;
  }
  out.user_id = userId;
  return out;
}

function toLocal(table: SyncedTable, row: RemoteRow): Record<string, SQLiteBindValue> {
  const out: Record<string, SQLiteBindValue> = {};
  for (const col of allColumns(table)) {
    let v: unknown = row[col];
    if (v != null && table.jsonColumns?.includes(col)) v = JSON.stringify(v);
    if (v != null && table.boolColumns?.includes(col)) v = v ? 1 : 0;
    // Datas do Postgres ("...+00:00", microssegundos) viram ISO do JS, igual às locais
    if (typeof v === 'string' && col.endsWith('_at')) {
      v = new Date(v).toISOString();
    }
    out[col] = (v ?? null) as SQLiteBindValue;
  }
  return out;
}

async function pushTable(
  db: SQLiteDatabase,
  client: SupabaseClient,
  table: SyncedTable,
  userId: string,
): Promise<number> {
  let total = 0;
  // Repete até não sobrar nada pendente (em lotes).
  for (;;) {
    const rows = await db.getAllAsync<LocalRow>(
      `SELECT * FROM ${table.name} WHERE _dirty = 1 LIMIT ?`,
      [PUSH_BATCH],
    );
    if (rows.length === 0) return total;

    const { error } = await client
      .from(table.name)
      .upsert(rows.map((r) => toRemote(table, r, userId)), { onConflict: 'id' });
    if (error) throw new Error(`Envio de ${table.name}: ${error.message}`);

    await db.withTransactionAsync(async () => {
      for (const r of rows) {
        // Só limpa se a linha não foi alterada enquanto enviávamos.
        await db.runAsync(
          `UPDATE ${table.name} SET _dirty = 0, user_id = ? WHERE id = ? AND updated_at = ?`,
          [userId, r.id, r.updated_at],
        );
      }
    });
    total += rows.length;
    if (rows.length < PUSH_BATCH) return total;
  }
}

async function pullTable(
  db: SQLiteDatabase,
  client: SupabaseClient,
  table: SyncedTable,
): Promise<number> {
  const state = await db.getFirstAsync<{ last_pulled_at: string | null }>(
    'SELECT last_pulled_at FROM sync_state WHERE table_name = ?',
    [table.name],
  );
  let cursor = state?.last_pulled_at ?? null;
  let total = 0;
  const cols = allColumns(table);

  for (;;) {
    let query = client
      .from(table.name)
      .select([...cols, 'synced_at'].join(','))
      .order('synced_at', { ascending: true })
      .limit(PULL_PAGE);
    if (cursor) query = query.gt('synced_at', cursor);

    const { data, error } = await query;
    if (error) throw new Error(`Download de ${table.name}: ${error.message}`);
    const rows = (data ?? []) as unknown as RemoteRow[];
    if (rows.length === 0) break;

    await db.withTransactionAsync(async () => {
      for (const remote of rows) {
        const local = await db.getFirstAsync<{ updated_at: string; _dirty: number }>(
          `SELECT updated_at, _dirty FROM ${table.name} WHERE id = ?`,
          [remote.id],
        );
        const keepLocal =
          local != null &&
          local._dirty === 1 &&
          Date.parse(local.updated_at) > Date.parse(remote.updated_at);
        if (keepLocal) continue;

        const values = toLocal(table, remote);
        const names = [...cols, '_dirty'];
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table.name} (${names.join(', ')})
           VALUES (${names.map(() => '?').join(', ')})`,
          [...cols.map((c) => values[c]), 0],
        );
      }
      // O cursor guarda o texto exato do servidor (com microssegundos).
      cursor = rows[rows.length - 1].synced_at;
      await db.runAsync(
        `INSERT INTO sync_state (table_name, last_pulled_at) VALUES (?, ?)
         ON CONFLICT (table_name) DO UPDATE SET last_pulled_at = excluded.last_pulled_at`,
        [table.name, cursor],
      );
    });
    total += rows.length;
    if (rows.length < PULL_PAGE) break;
  }

  if (total > 0) emitDataChange([table.name], 'sync');
  return total;
}

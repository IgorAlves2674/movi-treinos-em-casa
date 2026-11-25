/**
 * Excluir conta (obrigatório nas lojas, spec seção 3 e 10).
 *
 * 1. No servidor: apaga o usuário (função `delete_my_account`); todos os dados
 *    vão junto (on delete cascade). Precisa de internet: sem isso, nada é apagado,
 *    para não sobrar dado no servidor sem a pessoa saber.
 * 2. No celular: apaga todas as tabelas e o cursor da sincronização.
 * 3. Sai da conta e começa do zero (onboarding).
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { emitDataChange } from '@/db/events';
import { SYNCED_TABLES } from '@/db/tables';
import { supabase } from '@/lib/supabase';

export type DeleteResult = 'ok' | 'error';

export async function deleteAccount(db: SQLiteDatabase): Promise<DeleteResult> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) return 'error';
      } catch {
        return 'error';
      }
    }
  }

  const names = SYNCED_TABLES.map((t) => t.name);
  await db.withTransactionAsync(async () => {
    for (const name of names) await db.runAsync(`DELETE FROM ${name}`);
    await db.runAsync('DELETE FROM sync_state');
  });
  emitDataChange(names, 'local');

  if (supabase) {
    // O usuário já não existe no servidor: sai só neste celular e entra de novo do zero.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    await supabase.auth.signInAnonymously().catch(() => undefined);
  }
  return 'ok';
}

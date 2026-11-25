import type { SQLiteDatabase } from 'expo-sqlite';

import { softDeleteRow } from '@/db/repository';
import type { ProfileRow } from '@/db/tables';
import { useLiveQuery } from '@/hooks/useLiveQuery';

const CURRENT_PROFILE_SQL = `
  SELECT * FROM profiles
  WHERE deleted_at IS NULL AND onboarding_completed_at IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 1`;

/**
 * Perfil atual (o mais recente com onboarding concluído). `profile` é null
 * enquanto a pessoa não terminou o onboarding.
 */
export function useProfile(): { profile: ProfileRow | null; loading: boolean } {
  const { rows, loading } = useLiveQuery<ProfileRow>(CURRENT_PROFILE_SQL, [], ['profiles']);
  return { profile: rows[0] ?? null, loading };
}

/** Só para testes em desenvolvimento: apaga (logicamente) o perfil para refazer o onboarding. */
export async function resetProfileForTesting(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM profiles WHERE deleted_at IS NULL');
  for (const r of rows) await softDeleteRow(db, 'profiles', r.id);
}

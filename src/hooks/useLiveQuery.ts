import { useSQLiteContext, type SQLiteBindValue } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { onDataChange } from '@/db/events';

/**
 * Executa uma consulta no SQLite e repete quando alguma das tabelas mudar
 * (gravação local ou sincronização).
 */
export function useLiveQuery<T>(
  sql: string,
  params: SQLiteBindValue[],
  tables: readonly string[],
): { rows: T[]; loading: boolean } {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const paramsKey = JSON.stringify(params);
  const tablesKey = tables.join(',');

  useEffect(() => {
    let cancelled = false;
    const params = JSON.parse(paramsKey) as SQLiteBindValue[];
    const run = () =>
      db.getAllAsync<T>(sql, params).then((result) => {
        if (cancelled) return;
        setRows(result);
        setLoading(false);
      });

    void run();
    const watched = tablesKey.split(',');
    const unsubscribe = onDataChange((changed) => {
      if (changed.some((t) => watched.includes(t))) void run();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, sql, paramsKey, tablesKey]);

  return { rows, loading };
}

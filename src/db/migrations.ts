import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migrações do banco local (SQLite). Cada item é aplicado uma única vez, na
 * ordem, e a versão fica em PRAGMA user_version. Nunca edite uma migração já
 * publicada: crie uma nova no fim da lista.
 */
const MIGRATIONS: string[] = [
  // 1: estado da sincronização + peso e medidas
  `
  CREATE TABLE IF NOT EXISTS sync_state (
    table_name TEXT PRIMARY KEY NOT NULL,
    last_pulled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS body_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    logged_on TEXT NOT NULL,
    weight_kg REAL,
    waist_cm REAL,
    hip_cm REAL,
    arm_cm REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS body_logs_dirty ON body_logs (_dirty);
  CREATE INDEX IF NOT EXISTS body_logs_logged_on ON body_logs (logged_on);
  `,
  // 2: perfil (respostas do onboarding)
  `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    height_cm REAL NOT NULL,
    sex TEXT,
    goal TEXT NOT NULL,
    level TEXT NOT NULL,
    days_per_week INTEGER NOT NULL,
    minutes_per_session INTEGER NOT NULL,
    avoid_jumps_noise INTEGER NOT NULL DEFAULT 0,
    avoid_impact INTEGER NOT NULL DEFAULT 0,
    equipment TEXT NOT NULL DEFAULT '[]',
    dumbbell_max_kg REAL,
    barbell_max_kg REAL,
    health_ack_at TEXT,
    health_data_consent_at TEXT,
    onboarding_completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS profiles_dirty ON profiles (_dirty);
  `,
];

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}

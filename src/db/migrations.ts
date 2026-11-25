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
  // 3: treinos feitos e séries registradas (etapa 6)
  `
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    kind TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_s INTEGER,
    planned TEXT NOT NULL,
    feeling TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS workout_sessions_dirty ON workout_sessions (_dirty);
  CREATE INDEX IF NOT EXISTS workout_sessions_finished ON workout_sessions (finished_at);

  CREATE TABLE IF NOT EXISTS set_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    block_kind TEXT NOT NULL,
    round INTEGER NOT NULL,
    target_reps_min INTEGER,
    target_reps_max INTEGER,
    target_seconds INTEGER,
    reps INTEGER,
    seconds INTEGER,
    load_kg REAL,
    performed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS set_logs_dirty ON set_logs (_dirty);
  CREATE INDEX IF NOT EXISTS set_logs_session ON set_logs (session_id);
  CREATE INDEX IF NOT EXISTS set_logs_exercise ON set_logs (exercise_id);
  `,
  // 4: teste mensal (spec 8.3)
  `
  CREATE TABLE IF NOT EXISTS monthly_tests (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    tested_on TEXT NOT NULL,
    pushups INTEGER,
    squats_1min INTEGER,
    plank_s INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS monthly_tests_dirty ON monthly_tests (_dirty);
  CREATE INDEX IF NOT EXISTS monthly_tests_tested_on ON monthly_tests (tested_on);
  `,
  // 5: plano semanal (spec 7.1)
  `
  CREATE TABLE IF NOT EXISTS weekly_plans (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    week_start TEXT NOT NULL,
    profile_key TEXT NOT NULL,
    workouts TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    _dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS weekly_plans_dirty ON weekly_plans (_dirty);
  CREATE INDEX IF NOT EXISTS weekly_plans_week ON weekly_plans (week_start);
  `,
  // 6: descanso escolhido no Perfil (spec 7.4); vazio = padrão do nível
  `
  ALTER TABLE profiles ADD COLUMN rest_sets_s INTEGER;
  ALTER TABLE profiles ADD COLUMN rest_circuit_exercise_s INTEGER;
  ALTER TABLE profiles ADD COLUMN rest_circuit_round_s INTEGER;
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

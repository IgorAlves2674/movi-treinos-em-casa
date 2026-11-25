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
  {
    // Perfil: respostas do onboarding (spec seção 4). Uma linha por usuário;
    // se houver mais de uma (ex.: dois celulares offline), vale a mais recente.
    name: 'profiles',
    columns: [
      'name',
      'age',
      'height_cm',
      'sex',
      'goal',
      'level',
      'days_per_week',
      'minutes_per_session',
      'avoid_jumps_noise',
      'avoid_impact',
      'equipment',
      'dumbbell_max_kg',
      'barbell_max_kg',
      'health_ack_at',
      'health_data_consent_at',
      'onboarding_completed_at',
    ],
    jsonColumns: ['equipment'],
    boolColumns: ['avoid_jumps_noise', 'avoid_impact'],
  },
  {
    // Treino feito (spec 8.2): o plano montado fica em `planned` (JSON do Workout).
    name: 'workout_sessions',
    columns: ['kind', 'started_at', 'finished_at', 'duration_s', 'planned', 'feeling'],
    jsonColumns: ['planned'],
  },
  {
    // Série registrada (spec 8.2): alvo e o que foi feito (repetições, tempo, carga).
    // Vem depois de workout_sessions para o treino chegar ao servidor antes das séries.
    name: 'set_logs',
    columns: [
      'session_id',
      'exercise_id',
      'block_kind',
      'round',
      'target_reps_min',
      'target_reps_max',
      'target_seconds',
      'reps',
      'seconds',
      'load_kg',
      'performed_at',
    ],
  },
  {
    // Teste mensal (spec 8.3): flexões máximas, agachamentos em 1 min e prancha até a falha.
    // Cada teste pode ficar vazio (a pessoa pulou).
    name: 'monthly_tests',
    columns: ['tested_on', 'pushups', 'squats_1min', 'plank_s'],
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

export type Goal = 'emagrecer' | 'forca' | 'condicionamento' | 'manter';
export type Level = 'iniciante' | 'intermediario' | 'avancado';
export type Sex = 'feminino' | 'masculino' | 'nao_informado';

/** Perfil como fica no SQLite (booleanos 0/1, `equipment` em texto JSON). */
export type ProfileRow = BaseRow & {
  name: string;
  age: number;
  height_cm: number;
  sex: Sex | null;
  goal: Goal;
  level: Level;
  days_per_week: number;
  minutes_per_session: 15 | 30 | 45 | 60;
  avoid_jumps_noise: 0 | 1;
  avoid_impact: 0 | 1;
  equipment: string;
  dumbbell_max_kg: number | null;
  barbell_max_kg: number | null;
  health_ack_at: string | null;
  health_data_consent_at: string | null;
  onboarding_completed_at: string | null;
};

export type Feeling = 'facil' | 'na_medida' | 'pesado';

export type WorkoutSessionRow = BaseRow & {
  kind: 'avulso' | 'plano';
  started_at: string;
  finished_at: string | null;
  duration_s: number | null;
  planned: string; // JSON do Workout
  feeling: Feeling | null;
};

export type SetLogRow = BaseRow & {
  session_id: string;
  exercise_id: string;
  block_kind: 'sets' | 'circuit';
  round: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_seconds: number | null;
  reps: number | null;
  seconds: number | null;
  load_kg: number | null;
  performed_at: string;
};

export type BodyLog = BaseRow & {
  logged_on: string; // AAAA-MM-DD
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  arm_cm: number | null;
};

export type MonthlyTestRow = BaseRow & {
  tested_on: string;
  pushups: number | null;
  squats_1min: number | null;
  plank_s: number | null;
};

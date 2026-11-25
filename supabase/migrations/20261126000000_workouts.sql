-- Movi · treinos feitos e séries registradas (etapa 6, spec 8.2)
-- Rodar no Supabase (SQL Editor) depois das migrações anteriores.

-- Treino feito ---------------------------------------------------------------
create table if not exists public.workout_sessions (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('avulso', 'plano')),
  started_at   timestamptz not null,
  finished_at  timestamptz,
  duration_s   integer check (duration_s is null or duration_s between 0 and 86400),
  planned      jsonb not null,
  feeling      text check (feeling in ('facil', 'na_medida', 'pesado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz not null default clock_timestamp()
);

create index if not exists workout_sessions_user_synced on public.workout_sessions (user_id, synced_at);

create trigger workout_sessions_before_write
  before insert or update on public.workout_sessions
  for each row execute function public.movi_before_write();

alter table public.workout_sessions enable row level security;
grant select, insert, update on public.workout_sessions to authenticated;

create policy "workout_sessions: ler os próprios"
  on public.workout_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "workout_sessions: criar os próprios"
  on public.workout_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "workout_sessions: alterar os próprios"
  on public.workout_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Série registrada -----------------------------------------------------------
-- Sem chave estrangeira para workout_sessions: as tabelas sincronizam separadas
-- (offline-first) e a ordem de chegada não é garantida.
create table if not exists public.set_logs (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id       uuid not null,
  exercise_id      text not null check (char_length(exercise_id) between 1 and 80),
  block_kind       text not null check (block_kind in ('sets', 'circuit')),
  round            smallint not null check (round between 1 and 20),
  target_reps_min  smallint,
  target_reps_max  smallint,
  target_seconds   smallint,
  reps             smallint check (reps is null or reps between 0 and 500),
  seconds          integer check (seconds is null or seconds between 0 and 3600),
  load_kg          numeric(5, 1) check (load_kg is null or load_kg between 0 and 500),
  performed_at     timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  synced_at        timestamptz not null default clock_timestamp()
);

create index if not exists set_logs_user_synced on public.set_logs (user_id, synced_at);
create index if not exists set_logs_user_exercise on public.set_logs (user_id, exercise_id);

create trigger set_logs_before_write
  before insert or update on public.set_logs
  for each row execute function public.movi_before_write();

alter table public.set_logs enable row level security;
grant select, insert, update on public.set_logs to authenticated;

create policy "set_logs: ler os próprios"
  on public.set_logs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "set_logs: criar os próprios"
  on public.set_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "set_logs: alterar os próprios"
  on public.set_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sem política de DELETE: exclusão lógica (deleted_at), como nas outras tabelas.

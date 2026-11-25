-- Movi · teste mensal (etapa 7, spec 8.3)
-- Rodar no Supabase (SQL Editor) depois das migrações anteriores.

create table if not exists public.monthly_tests (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tested_on    date not null,
  pushups      smallint check (pushups is null or pushups between 0 and 500),
  squats_1min  smallint check (squats_1min is null or squats_1min between 0 and 300),
  plank_s      integer check (plank_s is null or plank_s between 0 and 3600),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz not null default clock_timestamp()
);

create index if not exists monthly_tests_user_synced on public.monthly_tests (user_id, synced_at);

create trigger monthly_tests_before_write
  before insert or update on public.monthly_tests
  for each row execute function public.movi_before_write();

alter table public.monthly_tests enable row level security;
grant select, insert, update on public.monthly_tests to authenticated;

create policy "monthly_tests: ler os próprios"
  on public.monthly_tests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "monthly_tests: criar os próprios"
  on public.monthly_tests for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "monthly_tests: alterar os próprios"
  on public.monthly_tests for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sem política de DELETE: exclusão lógica (deleted_at), como nas outras tabelas.

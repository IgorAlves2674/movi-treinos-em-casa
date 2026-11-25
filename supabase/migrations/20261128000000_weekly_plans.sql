-- Movi · plano semanal (etapa 8, spec 7.1)
-- Rodar no Supabase (SQL Editor) depois das migrações anteriores.

create table if not exists public.weekly_plans (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start   date not null,
  profile_key  text not null check (char_length(profile_key) <= 2000),
  workouts     jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz not null default clock_timestamp()
);

create index if not exists weekly_plans_user_synced on public.weekly_plans (user_id, synced_at);

create trigger weekly_plans_before_write
  before insert or update on public.weekly_plans
  for each row execute function public.movi_before_write();

alter table public.weekly_plans enable row level security;
grant select, insert, update on public.weekly_plans to authenticated;

create policy "weekly_plans: ler os próprios"
  on public.weekly_plans for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "weekly_plans: criar os próprios"
  on public.weekly_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "weekly_plans: alterar os próprios"
  on public.weekly_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sem política de DELETE: exclusão lógica (deleted_at), como nas outras tabelas.

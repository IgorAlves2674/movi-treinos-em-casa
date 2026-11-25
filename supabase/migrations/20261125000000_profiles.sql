-- Movi · perfil (respostas do onboarding, spec seção 4)
-- Rodar no Supabase (SQL Editor) depois da migração base.

create table if not exists public.profiles (
  id                       uuid primary key,
  user_id                  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                     text not null check (char_length(name) between 1 and 40),
  age                      smallint not null check (age between 18 and 100),
  height_cm                numeric(4, 1) not null check (height_cm between 120 and 230),
  sex                      text check (sex in ('feminino', 'masculino', 'nao_informado')),
  goal                     text not null check (goal in ('emagrecer', 'forca', 'condicionamento', 'manter')),
  level                    text not null check (level in ('iniciante', 'intermediario', 'avancado')),
  days_per_week            smallint not null check (days_per_week between 1 and 7),
  minutes_per_session      smallint not null check (minutes_per_session in (15, 30, 45, 60)),
  avoid_jumps_noise        boolean not null default false,
  avoid_impact             boolean not null default false,
  equipment                jsonb not null default '[]'::jsonb check (jsonb_typeof(equipment) = 'array'),
  dumbbell_max_kg          numeric(5, 1) check (dumbbell_max_kg is null or dumbbell_max_kg between 0.5 and 100),
  barbell_max_kg           numeric(5, 1) check (barbell_max_kg is null or barbell_max_kg between 1 and 400),
  -- Ciência do aviso de saúde e consentimento dos dados de saúde (LGPD), com a data do aceite.
  health_ack_at            timestamptz,
  health_data_consent_at   timestamptz,
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz,
  synced_at                timestamptz not null default clock_timestamp()
);

create index if not exists profiles_user_synced on public.profiles (user_id, synced_at);

create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.movi_before_write();

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

create policy "profiles: ler os próprios"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles: criar os próprios"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "profiles: alterar os próprios"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sem política de DELETE: exclusão lógica (deleted_at), como nas outras tabelas.

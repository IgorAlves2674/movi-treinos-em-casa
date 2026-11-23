-- Movi · migração base
-- Rodar no Supabase (SQL Editor, ou `supabase db push` com a CLI).
--
-- Regras (spec seção 2):
--  * toda tabela de dados do usuário tem user_id + RLS (cada um só vê os próprios dados);
--  * IDs UUID (gerados no celular), created_at, updated_at e exclusão lógica (deleted_at);
--  * synced_at é preenchido pelo servidor e serve de cursor para o app baixar alterações.

-- Gatilho comum das tabelas sincronizadas -----------------------------------
create or replace function public.movi_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Vale a última alteração: um envio atrasado (offline) mais antigo é ignorado.
    if new.updated_at < old.updated_at then
      return old;
    end if;
    -- Dono e data de criação não mudam.
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

-- Peso e medidas (spec 8.2) -------------------------------------------------
create table if not exists public.body_logs (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on   date not null,
  weight_kg   numeric(5, 2) check (weight_kg is null or weight_kg between 20 and 400),
  waist_cm    numeric(5, 1) check (waist_cm is null or waist_cm between 20 and 300),
  hip_cm      numeric(5, 1) check (hip_cm is null or hip_cm between 20 and 300),
  arm_cm      numeric(5, 1) check (arm_cm is null or arm_cm between 5 and 150),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  synced_at   timestamptz not null default clock_timestamp()
);

create index if not exists body_logs_user_synced on public.body_logs (user_id, synced_at);

create trigger body_logs_before_write
  before insert or update on public.body_logs
  for each row execute function public.movi_before_write();

alter table public.body_logs enable row level security;

-- Acesso pela API (Data API). Explícito para não depender da opção
-- "Grant API access to new tables automatically" do painel. Sem DELETE.
grant select, insert, update on public.body_logs to authenticated;

create policy "body_logs: ler os próprios"
  on public.body_logs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "body_logs: criar os próprios"
  on public.body_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "body_logs: alterar os próprios"
  on public.body_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sem política de DELETE: o app usa exclusão lógica (deleted_at).
-- A exclusão da conta (etapa 9) apaga o usuário em auth.users e o "on delete cascade" remove tudo.

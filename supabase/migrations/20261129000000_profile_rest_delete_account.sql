-- Movi · descanso no Perfil e exclusão de conta (etapa 9, spec seções 3 e 7.4)
-- Rodar no Supabase (SQL Editor) depois das migrações anteriores.

-- Descanso escolhido no Perfil (segundos). Vazio = padrão do nível ------------
alter table public.profiles
  add column if not exists rest_sets_s integer
    check (rest_sets_s is null or rest_sets_s between 0 and 600),
  add column if not exists rest_circuit_exercise_s integer
    check (rest_circuit_exercise_s is null or rest_circuit_exercise_s between 0 and 600),
  add column if not exists rest_circuit_round_s integer
    check (rest_circuit_round_s is null or rest_circuit_round_s between 0 and 600);

-- Excluir conta (obrigatório nas lojas) ----------------------------------------
-- Apaga o próprio usuário. Todas as tabelas do app têm
-- "references auth.users (id) on delete cascade", então os dados vão junto.
-- security definer: roda com permissão para apagar em auth.users, mas só
-- apaga quem chamou (auth.uid()).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sem login';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

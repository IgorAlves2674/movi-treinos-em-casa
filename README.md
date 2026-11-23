# Movi: Treinos em Casa (app)

React Native + Expo (SDK 58, TypeScript, Expo Router). Especificação completa: [`../movi_spec/SPEC.md`](../movi_spec/SPEC.md).

## Rodar

```bash
npm install
npm run web        # teste rápido no navegador
npm start          # Expo (Android/iOS: development build ou Expo Go do SDK 58)
npm run typecheck
npm run lint
```

## Configurar o Supabase (login anônimo + sincronização)

Sem configurar, o app funciona só com os dados no celular (offline).

1. Crie um projeto em supabase.com.
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins**: ligar.
3. **SQL Editor**: rode `supabase/migrations/20261123000000_base.sql`.
4. Copie `.env.example` para `.env.local` e preencha `EXPO_PUBLIC_SUPABASE_URL` e
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). Nunca use a `service_role`.
5. Reinicie o Expo (`npx expo start --clear`). Em **Perfil → Diagnóstico** aparece o ID do
   usuário anônimo; "Registrar peso de teste" deve aparecer na tabela `body_logs` em segundos.

## Estrutura

```
src/
  app/            rotas (Expo Router): (tabs)/ Início, Treinos, Evolução, Perfil + telas do menu ⋮
  components/     componentes visuais (ui, ícones, menu ⋮)
  db/             SQLite local: migrações, tabelas sincronizadas, gravações (repository)
  sync/           login anônimo (AuthProvider) e sincronização (engine + SyncProvider)
  hooks/          useLiveQuery: consulta que se atualiza quando os dados mudam
  i18n/           todos os textos do app (pt-BR)
  theme/          cores, fontes (Inter), espaçamentos
supabase/migrations/  SQL do servidor (tabelas + RLS)
```

## Dados e sincronização (offline-first)

- Tudo é gravado primeiro no SQLite (`src/db/repository.ts`), marcado com `_dirty = 1`.
- O `SyncProvider` envia o que está pendente e baixa o que mudou no servidor: 2 s depois de
  cada gravação, ao abrir o app, quando a internet volta e a cada 5 min.
- Conflitos: vale o `updated_at` mais recente (no app e no gatilho do servidor).
- Exclusão sempre lógica (`deleted_at`).

**Nova tabela de dados do usuário:** migração local em `src/db/migrations.ts` (nova entrada
no fim da lista) + migração SQL em `supabase/migrations/` (copiar o padrão de `body_logs`:
gatilho `movi_before_write`, RLS e políticas) + registro em `src/db/tables.ts`.

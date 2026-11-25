# Movi: Treinos em Casa (app)

React Native + Expo (SDK 58, TypeScript, Expo Router). Especificação completa: [`../movi_spec/SPEC.md`](../movi_spec/SPEC.md).

## Rodar

```bash
npm install
npm run web        # teste rápido no navegador
npm start          # Expo (Android/iOS: development build ou Expo Go do SDK 58)
npm run typecheck
npm run lint
npm run check:content   # confere o banco de exercícios (campos, variações, boneco no chão)
npm run check:generator # gera milhares de treinos e confere as regras (equipamento, restrições, tempo)
```

## Configurar o Supabase (login anônimo + sincronização)

Sem configurar, o app funciona só com os dados no celular (offline).

1. Crie um projeto em supabase.com.
2. **Authentication → Sign In / Providers → Allow anonymous sign-ins**: ligar.
3. **SQL Editor**: rode os arquivos de `supabase/migrations/` na ordem do nome
   (`20261123000000_base.sql`, depois `20261125000000_profiles.sql`).
4. Copie `.env.example` para `.env.local` e preencha `EXPO_PUBLIC_SUPABASE_URL` e
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). Nunca use a `service_role`.
5. Reinicie o Expo (`npx expo start --clear`). Em **Perfil → Diagnóstico** aparece o ID do
   usuário anônimo; "Registrar peso de teste" deve aparecer na tabela `body_logs` em segundos.

## Estrutura

```
src/
  app/            rotas (Expo Router): (tabs)/ Início, Treinos, Evolução, Perfil + telas do menu ⋮
  components/     componentes visuais (ui, ícones, menu ⋮, boneco)
  content/        conteúdo do app: banco de exercícios (exercicios.json)
  figure/         motor do boneco: esqueleto 3D, poses, projeção nas vistas
  db/             SQLite local: migrações, tabelas sincronizadas, gravações (repository)
  sync/           login anônimo (AuthProvider) e sincronização (engine + SyncProvider)
  profile/        onboarding (respostas, validação, gravação) e perfil atual (useProfile)
  workout/        gerador de treino (regras da spec 7), treino montado em memória (draft)
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

## Banco de exercícios e boneco

- Os exercícios ficam em `src/content/exercises/` (campos da spec, seção 5.2), divididos em
  arquivos JSON (`exercicios.json` com os 20 primeiros, `peso_corporal.json`, …) que o
  `index.ts` junta. Cada um traz a animação do boneco: 2 a 4 poses-chave com os ângulos das
  articulações e o ponto preso no chão (convenções em `src/figure/types.ts`: inclui `roll`
  para deitar de lado e `twist` para girar o tronco). Movimentos que não cabem em poses-chave
  (pular corda, escalador, círculos com os braços, esteira, bicicleta, elíptico) são funções em `src/figure/motion.ts`.
- Equipamentos desenhados: colchonete, cadeira (pode mudar de lugar e virar), parede, halteres
  corda, halteres (um em cada mão, só na direita ou um segurado com as duas), barra com
  anilhas, kettlebell, elástico com alças, miniband, barra fixa (alta ou baixa, com apoios),
  esteira, bicicleta ergométrica e elíptico.
- `npm run check:content` confere ids, variações, equipamentos, vistas e se o boneco não
  atravessa o chão.
- Os arquivos `peso_corporal.json`, `halteres.json`, `barra_kettlebell_elastico.json` e `cardio_equipamento.json` são gerados por `scripts/autoria/*.ts`
  (poses calculadas com cinemática inversa + textos). Edite o script e rode de novo
  (`npx tsx scripts/autoria/halteres.ts`) em vez de mexer no JSON à mão.
- `npx tsx scripts/preview-poses.ts poses.html id1,id2` gera uma página com as poses-chave de
  cada exercício em todas as vistas, para conferir sem abrir o app.
- `scripts/pose-lab.ts` ajuda a calcular ângulos quando mãos e pés precisam ficar presos
  (cinemática inversa), por exemplo na flexão e no afundo.
- Em desenvolvimento: **Perfil → Ver todos os exercícios** mostra o banco com o boneco.
  No navegador, `/boneco-teste?t=0.45&ids=flexao_padrao,afundo` congela a pose e filtra.

## Onboarding (spec seção 4)

- `src/app/onboarding.tsx`: 8 telas, uma pergunta por tela, com barra de progresso.
- Enquanto não houver perfil concluído, as abas redirecionam para o onboarding.
- Nada é gravado antes da última tela. No fim, grava na tabela `profiles` (com a data da
  ciência e do consentimento dos dados de saúde) e o peso informado vira o primeiro registro
  em `body_logs`.
- Em desenvolvimento: **Perfil → Refazer o onboarding** apaga o perfil (exclusão lógica) para
  testar de novo.

## Gerador de treino avulso (spec seção 7)

- `src/workout/generator.ts`: funções puras. Filtra por equipamento, nível e restrições;
  monta vagas por grupo (padrões de movimento); sorteia com peso (nível perto do ideal,
  menos chance para o último treino e para variações do mesmo exercício); separa em séries
  e circuito pelo objetivo; descanso pelo nível (7.4); aquecimento e 4 a 6 alongamentos
  (7.5); ajusta ao tempo com número de exercícios, séries e voltas; ordena por posição.
- Sem equipamento para puxar, o treino avisa e usa exercícios de lombar (spec 5.3).
- Telas: **Treinos** (escolher grupos) → **Seu treino** (`src/app/treino.tsx`: lista,
  janela de informações e botão trocar). O treino montado fica só na memória até a etapa 6.
- Alongamentos: `alongamentos.json`, gerado por `scripts/autoria/alongamentos.ts`.

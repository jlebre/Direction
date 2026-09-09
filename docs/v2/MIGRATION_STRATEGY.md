# MIGRATION STRATEGY — CAMTIL Finance V2

Status: **PROPOSED.** Nenhuma migration da V2 foi executada. Este documento é o plano; a Fase 2 em diante é que o executa, passo a passo, com revisão humana entre fases.

## Princípio

**Expand → Migrate → Verify → Switch reads → Switch writes → Archive legacy → Contract.** Nunca começar por `DROP`. Preferir migrations reversíveis; onde não for possível (ex. renomear uma coluna usada por RLS), documentar o rollback manual explicitamente na própria migration.

## Pré-requisito para qualquer fase abaixo

Um backup íntegro e validado tem de existir e estar acessível **antes** de correr a primeira migration da V2 — é exatamente o que a Fase 0.5 já produziu e validou (ver Parte A do relatório de execução). Repetir o backup (`npm run backup`) imediatamente antes de cada fase que toque em schema é recomendado e barato (o script já existe).

## Fases

### Fase 2 — Segurança & Autenticação

**Estado real (atualizado durante a execução):**
- **Expand — feito:** `profiles` (038), `profiles.email` (040), `camp_memberships` + funções auxiliares (039), `campos.legacy_anon_access` + `has_legacy_anon_access()` (041) — todos em produção.
- **RLS restritiva (2.4, primeira vaga) — feito, com transição por campo (042):** `campos`/`despesas`/`despesa_linhas`/`devolucoes`/`regularizacoes_nif`/`liquidacoes_nif` já não têm `USING(true)`. Os 11 campos reais estão todos marcados `legacy_anon_access = true` (decisão explícita de José) — comportamento observável inalterado para eles; fechar cada um é uma UPDATE de uma linha, sem nova migration.
- **Storage (2.5) — deliberadamente não feito.** Bucket `faturas` é `public: true`, o que serve ficheiros sem passar pela RLS — não há meio-termo por campo enquanto isso for verdade. Decisão de José: manter público por agora (Opção A), para não arriscar o fluxo ativo de upload/edição de faturas. Migrar para signed URLs (pré-requisito para privar o bucket) é trabalho futuro, tocando em 6 pontos do código incl. um Client Component (`EditarDevolucaoClient.tsx`) a reestruturar.
- **Migrate memberships — em curso, manual por natureza:** popular `camp_memberships` para os 11 campos reais exige saber quem são os adjuntos ainda ativos. Ferramenta pronta em `/admin/memberships`.
- **Verify — parcial:** login OTP confirmado ponta-a-ponta com uma conta real (admin); anon confirmado a continuar a funcionar para o campo com atividade real (Tremelgas II) depois da migration 042. Falta confirmar por adjunto real.
- **Switch writes (2.6) — feito para despesas, devoluções e regularização NIF.** `src/actions/despesas.ts`, `devolucoes.ts`, `regularizacoes.ts` (Server Actions, validação Zod, `createSessionServerClient()`) substituem os inserts/updates/deletes diretos do browser em `NovaDespesaClient`/`EditarDespesaClient`/`DespesaActions`/`NovaDevolucaoClient`/`EditarDevolucaoClient`/`DevolucaoActions`/`RegularizarClient`. Upload/remoção de fotos continua no cliente (decisão 2.5). Confirmado manualmente por José no browser real (criar/editar/apagar uma despesa de teste). **Ainda por migrar:** a "Danger Zone" de `SetupForm.tsx` (apaga despesas/devoluções/regularizações/liquidações em massa por `campo_id`) continua a escrever diretamente do cliente — não estava no âmbito pedido para este incremento, fica identificado para uma ronda futura.
- **Archive legacy — não feito.** `campos.pin` continua a existir (coluna), mas já não é a fronteira de segurança real nas 6 tabelas core.
- **Rollback:** SQL documentado em `supabase/rollbacks/` (041, 042) — restaura literalmente as policies `USING(true)` originais.

**Porque a ordem "Expand primeiro, Switch depois" importa aqui mais do que nas outras fases:** ao contrário de uma tabela nova sem utilizadores, `campos`/`despesas` têm utilização real e ativa (confirmado: despesas criadas horas antes da migration 042). A transição por campo (em vez de um corte único) foi a forma de fechar a RLS sem esperar que todos os campos tivessem memberships — mas só foi possível porque a exceção é sempre explícita, nunca um `OR true` global.

### Fase 3 — Mamãs / Legacy cleanup
- Seguir exatamente o plano já detalhado na auditoria (Secção 7): dividir `types/shared.ts` primeiro, remover código Mamãs, **arquivar** (não `DROP`) as colunas/tabelas Mamãs — mover para um schema `mamas_archive` ou apenas deixar de ser referenciadas, mantendo os dados de 2026 consultáveis por SQL direto se algum dia forem precisos.
- **Rollback:** como não há `DROP`, reverter é só reintroduzir o código removido a partir do controlo de versões.

### Fase 4 — Financial Foundation
- **Expand:** criar `camp_slots`, `locations` (estendida), `camps` (nova, a par de `campos`), `budgets`/`budget_lines`, `products`, `suppliers`, `price_observations`.
- **Migrate:** copiar `campos` → `camps`+`camp_slots`+`locations` (script, não manual — os dados já existem e são regulares); copiar `campo_precos`/`precos` relevantes → `price_observations` com proveniência marcada como `source='community'` (dados antigos, não ligados a uma `expense_line`).
- **Dual-read/dual-write:** durante a transição, `expenses`/`expense_lines` continuam a apontar para `campos.id` (FK antiga) enquanto se confirma que `camps.id` tem correspondência 1:1 — só depois se migra a FK.
- **Verify:** contagens e totais financeiros por campo têm de bater certo com o backup da Fase 0.5 (é exatamente para isto que ele serve).
- **Contract:** só depois de tudo validado, `DROP` das tabelas antigas de preço sobrepostas (`campo_precos`, `precos`) — nunca antes.

### Fase 5–9 (Treasury Dashboard, AI Pipeline, Products/Suppliers/Price History, Budget Model Research, Budget Engine + Backtesting)
- Aditivas por natureza (novas tabelas: `invoice_documents`, `invoice_extractions`, `budget_models`, `budget_model_versions`, `budget_predictions`) — baixo risco de regressão nos dados existentes, cada uma com o seu backup de checkpoint antes de começar.

## Regra geral de rollback

Qualquer fase que:
- adicione tabelas/colunas → rollback = `DROP` do que foi adicionado, dados antigos intocados;
- copie dados para um novo modelo → rollback = simplesmente não fazer switch de leitura/escrita, tabela nova fica órfã mas inofensiva;
- mude uma FK existente → só acontece depois de "Verify" confirmar 1:1, e a migration documenta explicitamente o `ALTER TABLE ... DROP CONSTRAINT` + `ADD CONSTRAINT` inverso.

Nunca há uma fase que dependa de apagar dados de produção para poder recuar.

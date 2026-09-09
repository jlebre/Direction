# MIGRATION STRATEGY — CAMTIL Finance V2

Status: **PROPOSED.** Nenhuma migration da V2 foi executada. Este documento é o plano; a Fase 2 em diante é que o executa, passo a passo, com revisão humana entre fases.

## Princípio

**Expand → Migrate → Verify → Switch reads → Switch writes → Archive legacy → Contract.** Nunca começar por `DROP`. Preferir migrations reversíveis; onde não for possível (ex. renomear uma coluna usada por RLS), documentar o rollback manual explicitamente na própria migration.

## Pré-requisito para qualquer fase abaixo

Um backup íntegro e validado tem de existir e estar acessível **antes** de correr a primeira migration da V2 — é exatamente o que a Fase 0.5 já produziu e validou (ver Parte A do relatório de execução). Repetir o backup (`npm run backup`) imediatamente antes de cada fase que toque em schema é recomendado e barato (o script já existe).

## Fases

### Fase 2 — Segurança & Autenticação

**Estado real (atualizado durante a execução):**
- **Expand — feito:** `profiles` (038), `profiles.email` (040), `camp_memberships` + funções auxiliares (039) criados em produção, a par das tabelas existentes.
- **Migrate — em curso, manual por natureza:** popular `camp_memberships` para os 11 campos reais exige saber quem são os adjuntos ainda ativos — a app nunca registou essa associação, e não se deve inferir emails. Ferramenta pronta em `/admin/memberships` (Server Actions `inviteUserToCamp`/`revokeMembership`/etc.) para o admin fazer isto assim que tiver os emails.
- **Verify — parcial:** login OTP confirmado ponta-a-ponta com uma conta real (admin). Falta confirmar por adjunto real.
- **Switch reads/writes — não feito ainda para as tabelas financeiras.** `/tesouraria/*` (rota nova, sem dados ainda) já lê/escreve só com sessão real; `/campo/*` continua 100% legacy.
- **Archive legacy — não feito.** `campos.pin` continua a ser a única forma de acesso real aos 11 campos.
- **Rollback:** SQL de rollback documentado por migration em `supabase/rollbacks/`. Manter o PIN a funcionar em paralelo até o critério de fecho (ver `docs/v2/AUTHORIZATION.md` § Fase de compatibilidade — Gate A/B) estar satisfeito; só aí a subfase 2.4 (RLS restritiva) avança.

**Porque a ordem "Expand primeiro, Switch depois" importa aqui mais do que nas outras fases:** ao contrário de uma tabela nova sem utilizadores, `campos`/`despesas` têm utilização real e ativa (confirmado: despesas criadas horas antes desta escrita). Fechar RLS sem memberships reais bloquearia essa utilização imediatamente — daí a fase de compatibilidade explícita antes da subfase 2.4.

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

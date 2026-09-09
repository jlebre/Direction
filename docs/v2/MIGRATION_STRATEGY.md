# MIGRATION STRATEGY — CAMTIL Finance V2

Status: **PROPOSED.** Nenhuma migration da V2 foi executada. Este documento é o plano; a Fase 2 em diante é que o executa, passo a passo, com revisão humana entre fases.

## Princípio

**Expand → Migrate → Verify → Switch reads → Switch writes → Archive legacy → Contract.** Nunca começar por `DROP`. Preferir migrations reversíveis; onde não for possível (ex. renomear uma coluna usada por RLS), documentar o rollback manual explicitamente na própria migration.

## Pré-requisito para qualquer fase abaixo

Um backup íntegro e validado tem de existir e estar acessível **antes** de correr a primeira migration da V2 — é exatamente o que a Fase 0.5 já produziu e validou (ver Parte A do relatório de execução). Repetir o backup (`npm run backup`) imediatamente antes de cada fase que toque em schema é recomendado e barato (o script já existe).

## Fases

### Fase 2 — Segurança & Autenticação
- **Expand:** criar `profiles`, `field_memberships` a par das tabelas existentes (`campos` continua a existir e a ser a fonte de dados enquanto isto acontece).
- **Migrate:** popular `field_memberships` manualmente para os campos de 2026 (11 campos, dados já no backup) com base em quem foi Adjunto de cada um — trabalho humano, não automatizável (a app de hoje não regista essa associação em lado nenhum).
- **Verify:** confirmar com cada Adjunto que consegue autenticar-se e vê exatamente o(s) seu(s) campo(s), nada mais.
- **Switch reads:** páginas passam a usar Server Components com sessão real.
- **Switch writes:** Server Actions substituem os inserts diretos do browser.
- **Archive legacy:** `campos.pin` deixa de ser lido pela app (mas a coluna não é apagada nesta fase — ver Fase 4/Contract).
- **Rollback:** manter o PIN a funcionar em paralelo até o Gate A estar confirmado em produção com utilizadores reais; só desligar o caminho antigo depois de pelo menos um campo completo (dados reais) ter corrido só com Auth real.

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

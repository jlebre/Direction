# MIGRATION STRATEGY — CAMTIL Finance V2

Status: **PROPOSED.** Nenhuma migration da V2 foi executada. Este documento é o plano; a Fase 2 em diante é que o executa, passo a passo, com revisão humana entre fases.

## Princípio

**Expand → Migrate → Verify → Switch reads → Switch writes → Archive legacy → Contract.** Nunca começar por `DROP`. Preferir migrations reversíveis; onde não for possível (ex. renomear uma coluna usada por RLS), documentar o rollback manual explicitamente na própria migration.

## Pré-requisito para qualquer fase abaixo

Um backup íntegro e validado tem de existir e estar acessível **antes** de correr a primeira migration da V2 — é exatamente o que a Fase 0.5 já produziu e validou (ver Parte A do relatório de execução). Repetir o backup (`npm run backup`) imediatamente antes de cada fase que toque em schema é recomendado e barato (o script já existe).

## Fases

### Fase 2 — Segurança & Autenticação

**Estado: PARTIAL — subfase 2.9 (Camp Access Links) adicionada depois do fecho 2.8.** Auth, RLS core, Server Boundary de escrita, Danger Zone, leituras session-aware, Storage isolado por campo (2.8) — todos feitos. 2.9 substitui, a prazo, `camp_membership`/OTP para o Adjunto por um link único por campo (sem conta Supabase Auth) — ver `docs/v2/adr/ADR-camp-access-links.md` e `docs/v2/PHASE_2_CAMP_ACCESS_LINKS_REPORT.md`. Implementado e testado (120/120 Vitest, 32/32 Playwright) só para **despesas**; devoluções/regularização/Danger Zone via link ficam para a ronda seguinte. `legacy_anon_access` continua `true` nos 11 campos reais — não removido (exige entregar os links reais aos Adjuntos, passo operacional) e, para Storage, continua tecnicamente necessário até se resolver a limitação documentada no ADR (sem `service_role`/JWT assinado, uma sessão de camp_access não consegue ler/enviar fotos sem ele).

**Estado real (atualizado durante a execução):**
- **Expand — feito:** `profiles` (038), `profiles.email` (040), `camp_memberships` + funções auxiliares (039), `campos.legacy_anon_access` + `has_legacy_anon_access()` (041) — todos em produção.
- **RLS restritiva (2.4, primeira vaga) — feito, com transição por campo (042):** `campos`/`despesas`/`despesa_linhas`/`devolucoes`/`regularizacoes_nif`/`liquidacoes_nif` já não têm `USING(true)`. Os 11 campos reais estão todos marcados `legacy_anon_access = true` (decisão explícita de José) — comportamento observável inalterado para eles; fechar cada um é uma UPDATE de uma linha, sem nova migration.
- **Storage (2.5 → fechado na 2.8) — feito.** Migration 044: bucket `faturas` passou a `public: false`; `campos.storage_slug` + `storage_object_campo_id()` resolvem o `campo_id` a partir do path existente (Opção A — sem mover nenhum dos 387 ficheiros); policies `faturas_select/insert/update/delete` camp-scoped, mesma condição das tabelas financeiras. `getSignedPhotoUrl()` (signed URL gerada no servidor, respeita RLS) substitui `getPublicUrl()` nos 4 pontos que mostravam fotos; `export-zip.ts` (Exportar + backup) passa a usar a Storage API autenticada (`.download()`). Verificado ao vivo contra os 11 campos reais: fotos continuam a mostrar-se, `npm run backup` continua PASS com 387/387 objectos.
- **Session-aware reads (2.8.1) — feito.** As 12 páginas de `/campo/[id]/adjuntos/*` + dashboard + setup trocaram `src/lib/supabase/server.ts` (anon simples) por `createSessionServerClient()`. Mudança puramente aditiva — comportamento idêntico para quem usa só a exceção legacy (todos os 11 campos reais hoje), mas agora uma `camp_membership` real também tem efeito. `tests/e2e/session-aware-reads.spec.ts` confirma a matriz completa por role contra campos `[TEST]` sem legacy.
- **Migrate memberships — em curso, manual por natureza (continua a ser o item que falta para os 11 campos reais deixarem de depender de `legacy_anon_access`).** Popular `camp_memberships` exige saber quem são os adjuntos ainda ativos. Ferramenta pronta em `/admin/memberships`. Enquanto isto não acontecer campo a campo, `legacy_anon_access` continua necessário — não é um código por fazer, é um passo operacional (convidar as pessoas certas).
- **Verify — parcial:** login OTP confirmado ponta-a-ponta com uma conta real (admin); anon confirmado a continuar a funcionar para o campo com atividade real (Tremelgas II) depois da migration 042 e de novo depois da 044. Falta confirmar por adjunto real com `camp_membership` (depende do item acima).
- **Switch writes (2.6) — feito para despesas, devoluções, regularização NIF e a Danger Zone.** `src/actions/despesas.ts`, `devolucoes.ts`, `regularizacoes.ts`, `dangerZone.ts` (Server Actions, validação Zod, `createSessionServerClient()`) substituem os inserts/updates/deletes diretos do browser. Upload/remoção de fotos continua no cliente (decisão 2.5). Cobertura: automatizada ponta-a-ponta (Playwright, `tests/e2e/*`, contra a app deployada) — ver `docs/v2/TESTING_STRATEGY.md` para a política de testes ("não pedir testes manuais de algo automatizável").
  - **Danger Zone (`SetupForm.tsx`) — resolvida.** Era o achado de segurança sinalizado: apagava despesas/devoluções/regularizações/liquidações direto do cliente, sem transação (4 DELETEs sequenciais, 2 sem verificação de erro), e sem exigir PIN quando o campo não tinha PIN configurado. Migration 043 (`danger_zone_clear_financials`, RPC `SECURITY INVOKER`, uma única transação para a parte de BD; Storage continua não-transacional por natureza, removido só depois do commit da BD) + `src/actions/dangerZone.ts` (revalida o PIN no servidor, nunca confia no cliente) + a UI fica desativada por completo sem PIN configurado. Testada em `tests/e2e/danger-zone.spec.ts` — só contra um campo `[TEST]` dedicado, nunca um real; confirma também que um segundo campo `[TEST]` de controlo fica intacto (nunca cross-camp).
- **Archive legacy — não feito.** `campos.pin` continua a existir (coluna), mas já não é a fronteira de segurança real nas 6 tabelas core.
- **Regressão (2.7 + 2.8.3) — feita.** `npm run typecheck` (0 erros), `npx vitest run` (109/109), `npm run test:e2e` (25/25, contra a app deployada), `npm run test:e2e:cleanup` (0 resíduos), `npm run build` (limpo). `npm run backup` corrido antes de cada migration sensível (043, 044) e no fecho final — `PASS` em todas, contagens de BD/Storage idênticas (387 objectos, 385 despesas, 13 devoluções, sempre).
- **Rollback:** SQL documentado em `supabase/rollbacks/` (041, 042, 043, 044) — restaura literalmente as policies `USING(true)`/bucket público originais (041/042/044) ou remove só a função RPC sem tocar em dados (043).

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

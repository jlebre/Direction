# TESTING STRATEGY — CAMTIL Finance V2

Status: **IMPLEMENTADO (subfases 2.1–2.6 da Fase 2).**
- `npm test` (Vitest) — `tests/unit/` (helpers puros) + `tests/security/*` (matriz RLS, baseline anon, transição legacy, profiles, camp_memberships), todos a correr contra produção com fixtures `[TEST]`/`.invalid` sintéticas (nunca Docker/projeto dedicado — decisão revista: produção com fixtures claramente marcadas é o alvo sancionado, ver `tests/security/fixtures.ts`). 33/33 a passar na última corrida.
- `npm run test:e2e` (Playwright) — `tests/e2e/*`, contra a app **deployada** (nunca localhost). Cobre devoluções (CRUD + foto + cross-camp), regularização NIF (com despesa fixture dedicada) e a Danger Zone (`/campo/[id]/setup`). Ver "Política de testes" abaixo.
- `npm run typecheck` / `npm run build` — verificados a cada incremento.
- Zero lint configurado ainda (Next 16 removeu `next lint` — ver auditoria, Secção 9).

## Política de testes (regra do utilizador, vinculativa)
**Não se pede a um humano para testar manualmente algo que pode ser testado automaticamente.** Testes manuais ficam reservados só para o que é genuinamente impossível ou insensato de automatizar: confirmar a receção real de um email OTP, avaliação subjetiva de UX, comportamento físico de câmara/telemóvel sem alternativa razoável. CRUD, autorização, uploads, edição, eliminação, navegação e regressão são sempre automatizados antes de uma subfase ser considerada concluída.

**Sessões de teste E2E:** o fluxo real de Adjunto hoje em produção não usa sessão Supabase Auth — usa PIN de campo + a exceção `legacy_anon_access` (decisão "todos os 11 campos, por agora"). Os fixtures E2E de Adjunto (`tests/e2e/lib/e2e-fixtures.ts`) replicam exactamente esse mecanismo (campos `[TEST] E2E Camp A/B` com `legacy_anon_access=true`), em vez de simular uma sessão autenticada que a app ainda não usa nesse caminho. Para os papéis já autenticados (admin/treasurer/viewer/field_viewer via `camp_memberships`), a infraestrutura para injetar uma sessão real como cookie `@supabase/ssr` (via `signInWithPassword`, nunca `service_role`, nunca no browser) já existe em `tests/e2e/lib/session-cookies.ts`, pronta para a próxima ronda de cobertura por papel.

**Guardrails técnicos** (não só comentários) — `tests/e2e/lib/guardrails.ts`: confirma o project ref autorizado antes de qualquer coisa; recusa qualquer `camp_id` que corresponda a um dos 11 campos reais (carregados da BD, nunca de uma lista estática); recusa qualquer `camp_id` cujo nome na BD não comece por `[TEST]`, revalidado no momento, nunca só confiado de uma fixture criada minutos antes.

**Limpeza garantida** — `global-teardown.ts` apaga campos de teste (cascata cobre despesas/devoluções/regularizações/liquidações) e ficheiros de Storage sob os seus slugs, e falha alto se sobrar alguma coisa. Rede de segurança independente: `npm run test:e2e:cleanup` varre por padrão `[TEST]`/`test-*` (nunca por ID de uma corrida), para o caso de uma suite morrer antes do seu próprio teardown.

**Separação de CI:** `npm test`/`typecheck`/`build` podem correr em qualquer push (não usam nada que um contribuidor sem acesso a produção devesse ter). `npm run test:e2e` usa `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` de produção para autenticar fixtures via `supabase db query --linked` — nunca deve correr automaticamente em cada push; fica reservado a execução manual ou a um futuro `workflow_dispatch` dedicado com os seus próprios secrets.

## Unit
**Alvo:** cálculos financeiros puros, parsers, normalização.
- Fórmula de saldo disponível (`opening_balance + receitas - despesas + devoluções`) — hoje só existe implementada dentro de `export-excel.ts`, sem teste; é a primeira candidata.
- `expense_lines`/`price_observations` — normalização de unidades/quantidades.
- O futuro parser/mapeador de `invoice_extractions.extracted_fields` → `expense_lines`.
- Ferramenta: Vitest (leve, rápido, boa integração com TS/ESM — sem necessidade de configurar Babel).

## Integration
**Alvo:** queries reais contra uma BD de teste (Supabase local via CLI, ou um projeto Supabase dedicado a testes — nunca o de produção), Server Actions, migrations.
- Cada Server Action de escrita testada com um utilizador `adjunto` autenticado do campo certo (deve passar) e de outro campo (deve falhar).
- Migrations: correr a sequência completa contra uma BD vazia como parte do CI, falhar o build se alguma migration não aplicar de forma limpa (hoje não há CI nenhum a validar isto).

## RLS / Segurança
**Alvo direto dos achados CRITICAL/HIGH da auditoria** — este é o conjunto de testes mais importante de todo o documento, porque é o que garante que a Fase 2 não reintroduz o problema atual por acidente.
- Adjunto do Campo A não consegue `SELECT`/`INSERT`/`UPDATE`/`DELETE` em dados do Campo B (via chave anon + sessão de A).
- Um pedido com a chave `anon` **sem sessão** não consegue escrever em nenhuma tabela financeira.
- Tesoureiro vê todos os campos; Admin administra; Direção só lê, nunca escreve.
- Storage: mesmas fronteiras — um `adjunto` não lista/descarrega objetos fora do prefixo do seu campo.
- Corre-se estes testes contra as policies reais (não mocks) — é o único jeito de confiar neles.

## E2E
**Alvo:** fluxos completos, um browser real (Playwright).
- Nova despesa (com foto → extração → confirmação → gravação).
- Upload de fatura falha/timeout → cai para preenchimento manual sem bloquear.
- Criar/aprovar orçamento (`draft`→`proposed`→`approved`).
- Devolução ligada a uma despesa existente.
- Exportação (Excel/ZIP por campo, exportação cross-campo da Tesouraria).
- Login (Magic Link) end-to-end, incluindo o caso "link expirado".

## Financial invariants
**Alvo:** propriedades que têm de ser sempre verdadeiras, não comportamento de uma função isolada.
- Soma de `expense_lines.total_price` de uma despesa nunca excede `expenses.amount` além de uma tolerância configurável (hoje não há nenhuma verificação disto).
- `budgets` com `status='approved'` é único por campo em cada momento (constraint de BD, mas testado também a nível de aplicação para a mensagem de erro ser útil).
- Histórico nunca é reescrito: uma vez `expenses.created_at` gravado, um teste de regressão garante que nenhuma migration futura faz `UPDATE` em massa sobre despesas fechadas sem passar por `audit_log`.
- Reconciliação: total de despesas por campo no dashboard de Tesouraria bate certo com a soma direta na BD (testa a camada de agregação, não só a fonte).

## O que NÃO se testa já no início
Cobertura de UI pixel-perfect, testes de todos os componentes Radix/shadcn (são bibliotecas já testadas a montante), performance sob carga (a escala do CAMTIL — dezenas de campos, centenas de despesas por época — não justifica isso ainda).

## CI mínimo viável
Um único workflow que corre, nesta ordem, e falha o PR se algum passo falhar: `tsc --noEmit` → `eslint` (a reintroduzir, ver auditoria) → `vitest run` (unit + integration) → suite de RLS. E2E corre à parte (mais lento), pelo menos antes de cada release para produção.

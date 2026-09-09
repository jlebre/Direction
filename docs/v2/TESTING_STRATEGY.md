# TESTING STRATEGY — CAMTIL Finance V2

Status: **PROPOSED.** Hoje: zero testes automatizados, zero lint configurado (e o Next 16 removeu `next lint` — ver auditoria, Secção 9). Esta estratégia parte de zero deliberadamente pequena e sustentável, não de uma pirâmide de testes ambiciosa que ninguém vai manter.

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

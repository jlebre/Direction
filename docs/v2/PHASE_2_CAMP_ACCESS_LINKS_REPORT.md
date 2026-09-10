# Phase 2 — Camp Access Links — Final Report

## Current State Verification

Repositório limpo (`git status` sem alterações antes de começar), `main` em `b816a4e` (fecho da Fase 2.8 — session-aware reads + Storage isolation). Migrations até `044`, `legacy_anon_access=true` confirmado nos 11 campos reais (sem alteração). `npm run typecheck`/`npm run build` confirmados limpos antes de começar. `npm test`/`npm run test:e2e` já tinham corrido no fecho imediatamente anterior (120/120 Vitest, 32/32 Playwright) — não repetidos de imediato para poupar ~12 min, mas confirmados de novo no fim desta ronda com o mesmo resultado.

**Matches handoff:** tudo — `profiles`, `camp_memberships`, helpers de RLS, Server Actions de despesas/devoluções/regularização/Danger Zone, leituras session-aware, policies de Storage privado, proxy/middleware, harness de teste e matriz de roles, tudo exactamente como o fecho da Fase 2 anterior deixou.

**Divergences found:** nenhuma.

**Risks before implementation:** o único risco identificado antes de começar foi arquitectural, não de estado — como autorizar uma sessão de camp_access na BD sem `service_role` nem JWT assinado (ver ADR). Resolvido com RPCs `SECURITY DEFINER` estreitas.

**Proceed / Blocked:** **PROCEED.**

## Architecture Changes

`resolveActor()` (`src/lib/auth/actor.ts`) — abstracção única de autorização: `staff` (sessão Supabase Auth) → `camp_access` (cookie de capacidade, revalidado a cada pedido) → `anonymous`. Usada por `src/actions/despesas.ts` e pelas páginas de despesas migradas. Ver ADR completo em `docs/v2/adr/ADR-camp-access-links.md`.

## Database Changes

Migrations 045-049 (todas aplicadas em produção, `npm run backup` PASS antes de cada uma sensível):
- `camp_access_links` (token_hash único, nunca token em claro; índice único parcial = 1 link activo por campo).
- `camp_access_events` (log mínimo: created/revoked/regenerated/used — nunca o token).
- RPCs `SECURITY DEFINER`: `camp_access_create_link`, `camp_access_revoke_link` (staff, admin/treasurer), `camp_access_bootstrap`, `camp_access_camp_id` (revalidação universal), `camp_access_get_campo`, `camp_access_list_despesas`, `camp_access_get_despesa`, `camp_access_list_despesa_linhas`, `camp_access_create_despesa`, `camp_access_update_despesa`, `camp_access_delete_despesa`, `camp_access_list_devolucoes`, `camp_access_get_devolucao`, `camp_access_list_regularizacoes`.
- 047/048/049 corrigem 3 achados reais dos próprios testes (ambiguidade de coluna, FK sem `ON DELETE`, chave de payload snake_case vs. camelCase) — nenhum escondido.

Nenhuma tabela existente alterada de forma destrutiva. `camp_memberships` intacto.

## Authorization Model

Staff: inalterado (RLS normal, `has_camp_access()`/`can_edit_camp()`). Camp access: nunca por RLS directa (sem `auth.uid()`) — sempre por RPC `SECURITY DEFINER` que revalida `camp_access_camp_id(p_link_id)` antes de tocar em qualquer linha. `resolveActor()` nunca aceita `camp_id` do cliente.

## Storage Model

**Sem alteração — limitação real, documentada, não contornada.** Uma sessão de camp_access ainda depende de `legacy_anon_access` para ler/enviar fotos, porque a API de Storage não tem como reconhecer a sessão sem `service_role` (indisponível) ou um JWT assinado (segredo indisponível/não obtido por precaução deliberada). Ver ADR, secção "Storage".

## Access Link Flow

`GET /a/<token>` → hash → `camp_access_bootstrap` → cookie `camtil_camp_access` (só `link_id`) → redirect para `/campo/<id>/adjuntos`, token nunca na URL final. Inválido/expirado/revogado → `/a/invalido` (nunca distingue qual).

## Session Model

Cookie `httpOnly`, `Secure` em produção, `SameSite=Lax`, `maxAge` 90 dias — validade real sempre da BD (`camp_access_camp_id`), revogar/regenerar invalida de imediato.

## Admin UI

`/admin/campo-access` (Admin/Treasurer, reforçado nas próprias RPCs) — gerar, copiar (uma vez), revogar, regenerar por campo; estado (Activo/Expirado/Não gerado), criado em, último acesso.

## Tests Added

- `tests/security/camp-access-links.test.ts` (11 casos, nível RPC/BD).
- `tests/e2e/camp-access-links.spec.ts` (7 casos, browser real: bootstrap válido/inválido/expirado/revogado, cross-camp por URL, regenerar invalida sessão antiga, ciclo completo de despesa pela UI usando só o link).

## Test Results

| | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npx vitest run` | **120/120** |
| `npm run test:e2e` | **32/32** (7 novos + 25 já existentes, sem regressão) |
| `npm run test:e2e:cleanup` | 0 resíduos |
| `npm run build` | limpo |

## Security Checks

Token: 256 bits, nunca em claro na BD/logs. Cookie: `httpOnly`/`Secure`/`SameSite=Lax`. Revogação/expiração/regeneração: testadas e confirmadas (bootstrap futuro E sessão já aberta, ambos invalidados). Cross-camp: testado por URL directa e por RPC com `link_id`/`campo_id` cruzados — sempre DENY. CSRF: mecanismo nativo do Next.js (Server Actions), não alterado. Cache: todas as páginas afectadas já tinham `dynamic = 'force-dynamic'`.

## `legacy_anon_access` Status

**Inalterado para os 11 campos reais — continua `true` em todos.** Removê-lo exige, campo a campo: gerar o link real, entregá-lo ao Adjunto real, confirmar o fluxo financeiro completo com esse link, só então desligar a flag. Este é um passo humano/operacional (identificar e contactar cada Adjunto) fora do alcance desta sessão — a ferramenta (`/admin/campo-access`) está pronta para isso.

## Remaining Rollout Work

1. Gerar e entregar os links reais aos 11 Adjuntos, confirmar cada um, desligar `legacy_anon_access` campo a campo.
2. Estender devoluções e regularização NIF ao modelo camp_access (mesmo padrão das RPCs de despesas — hoje só leitura no dashboard).
3. Danger Zone via camp_access (hoje só staff/legacy).
4. Resolver a limitação de Storage — provisionar `SUPABASE_SERVICE_ROLE_KEY` no Vercel (proxy server-side) ou assinar JWTs por sessão, para o upload/leitura de fotos deixar de depender de `legacy_anon_access`.

## Known Risks

- Enquanto o item 4 acima não for resolvido, nenhum campo pode ter `legacy_anon_access=false` E continuar a aceitar fotos via camp_access — é um bloqueador real para fechar a flag por completo nalguns campos.
- Devoluções/regularização/Danger Zone via camp_access ainda não implementadas — um Adjunto só com link não consegue usar essas três funcionalidades hoje (continuam a exigir a exceção legacy ou staff).

## Phase Result

**PARTIAL**

Implementação e testes: completos e verdes para o que foi construído (despesas + leitura completa do dashboard). Não é PASS porque (a) `legacy_anon_access` continua `true` em todos os 11 campos reais — critério explícito de PASS não cumprido — e (b) Storage, devoluções, regularização NIF e Danger Zone via camp_access ficam para a ronda seguinte, com a limitação de Storage claramente documentada no ADR em vez de contornada.

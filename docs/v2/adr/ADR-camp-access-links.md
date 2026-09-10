# ADR — Camp Access Links

Status: **IMPLEMENTADO (parcial — ver "Âmbito desta ronda").**

## Contexto

Cada campo tem um único Adjunto financeiro operacional. Exigir-lhe uma conta Supabase Auth (OTP, sessão, `camp_membership`) é fricção desproporcional para uma tarefa: registar despesas/devoluções do seu campo. O PIN legacy (`campos.pin` + `legacy_anon_access`) resolve a fricção mas é o achado CRITICAL original — sem isolamento por campo real (qualquer PIN, uma vez conhecido, é uma chave partilhada e não expira nem é auditável).

## Decisão

Um link único por campo (`https://.../a/<token>`), gerado por Admin/Treasurer, sem conta Supabase Auth. Abrir o link cria uma **sessão de capacidade** (cookie `httpOnly`) restrita a esse campo. `camp_memberships` mantém-se (staff, compatibilidade, testes) — não é removido.

## Threat model

- **Guessing/enumeração do token:** 256 bits aleatórios (`crypto.randomBytes(32)`), impraticável de adivinhar.
- **Roubo do token em trânsito/logs:** nunca persistido em claro, nunca logado; só existe no ecrã de "copiar" (uma vez) e no pedido de bootstrap.
- **Reutilização depois de revogado:** `camp_access_camp_id()` (SECURITY DEFINER) revalida `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())` a CADA pedido — nunca só no bootstrap.
- **Cross-camp por manipulação de URL/payload:** `resolveActor()` nunca aceita `camp_id` do cliente — o `campId` de uma sessão de capacidade vem sempre da BD, resolvido a partir do `link_id` do cookie.
- **CSRF:** cookie `SameSite=Lax` + Server Actions do Next.js já validam a origem do pedido (mecanismo nativo do framework, não alterado aqui).
- **Cache de páginas sensíveis:** todas as páginas afectadas já tinham `export const dynamic = 'force-dynamic'`.

## Geração e hashing do token

`crypto.randomBytes(32)` → base64url (texto do link) → SHA-256 (`token_hash`, única coisa persistida). Gerado sempre em `src/lib/camp-access/token.ts`, chamado só a partir do Server Action `generateCampAccessLink` (nunca no browser).

## Modelo de BD (migrations 045-048)

`camp_access_links` (id, camp_id, token_hash, created_at, created_by_user_id, expires_at, revoked_at, last_used_at) — índice único parcial garante **um link activo por campo**; regenerar revoga o anterior explicitamente (`camp_access_create_link`) antes de criar o novo. `camp_access_events` — log mínimo (created/revoked/regenerated/used), nunca o token em claro; este projecto não tinha nenhuma framework de audit log implementada, por isso o âmbito ficou deliberadamente pequeno (secção 21 do pedido).

## Autorização — sem `service_role`

Toda a leitura/escrita de uma sessão de capacidade passa por **funções SQL `SECURITY DEFINER` estreitas** (`camp_access_get_campo`, `camp_access_list_despesas`, `camp_access_create_despesa`, etc.) — nunca por RLS directa (uma sessão de capacidade não tem `auth.uid()`, não há como a RLS normal a reconhecer sem inventar um mecanismo de claims JWT à parte). Cada função revalida o link internamente (`camp_access_camp_id(p_link_id)`) antes de tocar em qualquer linha — a presença do cookie sozinha nunca é suficiente. Mesmo padrão já usado em `has_camp_access()`/`danger_zone_clear_financials()` deste projecto — não um mecanismo novo.

**Porque não signed JWTs / `service_role`:** um JWT assinado com claims customizadas resolveria a leitura/escrita via RLS normal sem RPCs dedicadas — mas exige o segredo de assinatura JWT do projecto Supabase, tão sensível quanto `service_role` (e tal como esse, indisponível/não obtido neste ambiente por precaução deliberada, ver histórico do projecto). `service_role` está confirmado indisponível/não configurado. Dado isto, RPCs `SECURITY DEFINER` são a via correcta e segura disponível — mais verbosa, mas auditável função a função.

## Sessão de capacidade (cookie)

`camtil_camp_access` = `link_id` (UUID, 122 bits) — nunca o token do bootstrap. `httpOnly`, `Secure` em produção, `SameSite=Lax`, `maxAge` 90 dias — a validade REAL vem sempre da BD (`camp_access_camp_id`), não do cookie; revogar invalida de imediato, independentemente de quanto tempo falta para o cookie expirar sozinho.

## `resolveActor()` — abstração única

`src/lib/auth/actor.ts`: `staff` (sessão Supabase Auth real) → `camp_access` (cookie válido, revalidado) → `anonymous`. Usado por todas as páginas/Server Actions migradas nesta ronda — nunca duplica a lógica de decisão.

## Storage — limitação real, não simulada

**O bucket `faturas` continua a depender de `legacy_anon_access` para uma sessão de camp_access conseguir ler/enviar fotos.** Storage RLS (migration 044) avalia o mesmo `auth.uid()` que a BD — sem JWT assinado (ver acima), não há forma de uma função `SECURITY DEFINER` "emprestar" privilégio a uma operação de Storage (upload/download são pedidos HTTP à API de Storage, não SQL — uma função de BD não os pode executar). **Não escondido: enquanto isto for verdade, remover `legacy_anon_access` de um campo real quebra o upload/leitura de fotos para quem só tem link de acesso.** Resolve-se com uma de duas coisas, nenhuma incluída nesta ronda: (a) provisionar `SUPABASE_SERVICE_ROLE_KEY` no Vercel para um proxy de Storage 100% server-side, ou (b) assinar JWTs por sessão de capacidade (exige o segredo de assinatura).

## `camp_memberships` — coexistência

Não removido. Continua a servir staff, testes (`tests/security/fixtures.ts`), e qualquer utilizador local autenticado. Camp Access Links é um mecanismo PARALELO para o caso de uso específico "Adjunto operacional sem conta", não uma substituição do modelo `camp_memberships`.

## Âmbito desta ronda (implementado vs. por fazer)

**Implementado e testado:** geração/revogação/regeneração de link (staff), bootstrap real (válido/inválido/expirado/revogado), sessão de capacidade com revalidação a cada pedido, `resolveActor()`, negação cross-camp (leitura e escrita, incl. manipulação de URL e de `camp_id` em payload), ciclo completo de **despesas** (criar/ler/editar/apagar) via link, dashboard completo (despesas+devoluções+regularizações de leitura), UI de administração (`/admin/campo-access`).

**Não incluído nesta ronda (âmbito seguinte, mesmo padrão incremental "só despesas primeiro" já usado na subfase 2.6):** devoluções e regularização NIF por camp_access (só leitura no dashboard; escrita continua staff/legacy); Danger Zone por camp_access; upload/leitura de fotos sem depender de `legacy_anon_access` (ver secção Storage acima); `legacy_anon_access=false` para os 11 campos reais (depende de gerar e entregar os links reais aos Adjuntos, um passo humano/operacional fora do alcance desta sessão).

## Rollout

Por campo: gerar o link em `/admin/campo-access` → entregar ao Adjunto → confirmar o fluxo financeiro completo com esse link → só então `UPDATE campos SET legacy_anon_access = false WHERE id = ...` → regressão. Nunca em massa.

## Rollback

`supabase/rollbacks/045..048_*.sql` remove só as tabelas/funções novas — nunca toca em `campos`, `despesas`, `devolucoes`, `camp_memberships` nem em nenhum dado histórico. Reverter é seguro a qualquer momento.

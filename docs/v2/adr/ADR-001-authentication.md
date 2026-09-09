# ADR-001 — Authentication

**Status:** **ACCEPTED** (Gate A fechado no arranque da Fase 2 — ver [AUTHORIZATION.md](../AUTHORIZATION.md#gate-a--decisão-fechada))

## Context
Hoje não existe autenticação real (auditoria, Secção 5): a app usa só a chave anon do Supabase, e o "acesso" é um PIN de 4 dígitos por campo, guardado em texto simples e legível via API direta. Isto é o achado CRITICAL mais importante do sistema atual.

## Options considered
1. **Magic Link (Supabase Auth, email)** — sem password, um clique.
2. **Email OTP (Supabase Auth, email)** — sem password, código de uso único.
3. **Email + Password** — modelo clássico.
4. **OTP por SMS** — código por mensagem.
5. **Manter PIN, só reforçado** (ex. hash em vez de texto simples) — mitigação parcial, não resolve a falta de identidade por utilizador.

## Decision (ACCEPTED)
**Email OTP** via Supabase Auth, sem password, como método principal — identidade individual por pessoa, sem contas partilhadas por campo. `camps.pin` deixa de autenticar/autorizar (pode continuar no schema só por compatibilidade histórica, nunca a proteger dados). Magic Link fica disponível como extensão futura sem impacto no modelo de autorização (mesma tabela `profiles`/sessão). Ver comparação completa em [AUTHORIZATION.md](../AUTHORIZATION.md#authentication-design).

## Benefits
- Elimina passwords para gerir/esquecer numa base de utilizadores sazonal.
- Identidade real por pessoa (pré-requisito de auditabilidade e RLS por utilizador).
- Familiar para pessoas não-técnicas ("carrega no link do email").

## Costs
- Depende de o adjunto ter acesso fiável a email no telemóvel durante o campo.
- Convites/gestão de utilizadores passam a exigir um passo de admin (deixa de ser "abre a URL e usa").

## Risks
- Cobertura de rede fraca em locais de campo pode atrasar o primeiro login — mitigado por sessão longa (30 dias) para não exigir re-autenticação frequente.
- Se o email de um adjunto for comprometido, o acesso ao campo também fica comprometido — mitigado por revogação rápida de `field_memberships` em `/admin`.

## Open questions (resolvidas pelo Gate A)
- ~~Os adjuntos têm todos email pessoal fiável?~~ — assumido que sim, para efeitos de arranque da Fase 2; a implementação real (subfases 2.2+) fica bloqueada por falta de ambiente de teste seguro (ver relatório de execução da Fase 2), não por esta questão.
- ~~Precisa de self-service já na V2?~~ — não; convite manual pelo Admin/Treasurer via `camp_memberships` (`status='invited'`), sem signup público.

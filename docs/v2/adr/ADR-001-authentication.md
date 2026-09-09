# ADR-001 — Authentication

**Status:** PROPOSED (depende do Gate A — ver [ARCHITECTURE.md §19](../ARCHITECTURE.md#19-human-decision-gates))

## Context
Hoje não existe autenticação real (auditoria, Secção 5): a app usa só a chave anon do Supabase, e o "acesso" é um PIN de 4 dígitos por campo, guardado em texto simples e legível via API direta. Isto é o achado CRITICAL mais importante do sistema atual.

## Options considered
1. **Magic Link (Supabase Auth, email)** — sem password, um clique.
2. **Email + Password** — modelo clássico.
3. **OTP por SMS** — código por mensagem.
4. **Manter PIN, só reforçado** (ex. hash em vez de texto simples) — mitigação parcial, não resolve a falta de identidade por utilizador.

## Proposed decision
Magic Link como método principal, com um mecanismo de link de acesso temporário assinado (gerado por Admin/Tesoureiro) como plano B para adjuntos sem email de confiança. Ver comparação completa em [AUTHORIZATION.md](../AUTHORIZATION.md#authentication-design).

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

## Open questions
- Os adjuntos têm todos email pessoal fiável? (pergunta do Gate A)
- Precisa de self-service já na V2, ou convite manual pelo Admin chega para o primeiro ano?

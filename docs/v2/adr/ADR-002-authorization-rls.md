# ADR-002 — Authorization and RLS

**Status:** **ACCEPTED (modelo/naming, Gate A)** — as policies concretas descritas abaixo continuam **PROPOSED**; implementação (subfase 2.4) bloqueada por falta de ambiente de teste seguro (ver relatório de execução da Fase 2).

## Context
Hoje, 36/36 tabelas e 2 buckets de Storage têm RLS `USING (true) WITH CHECK (true)` — acesso total com a chave anon pública (auditoria, achado CRITICAL). Não existe conceito de "este utilizador pertence a este campo" em lado nenhum do código ou da BD.

## Options considered
1. **`profiles` + `camp_memberships` + policies por `camp_id`** (aceite).
2. **Roles como tabela separada** (`roles` genérica, N:N com profiles) em vez de coluna `global_role` fixa.
3. **Autorização só na aplicação**, RLS a continuar permissivo — descartado imediatamente: é exatamente o problema atual, e a chave anon está sempre exposta ao cliente por definição.

## Decision (ACCEPTED — modelo/naming)
`profiles.global_role` (enum fixo: `admin`/`treasurer`/`viewer`/null) + `camp_memberships` (role de campo: `adjunto`/`field_viewer`, status `invited`/`active`/`revoked`) + RLS por tabela conforme a matriz em [AUTHORIZATION.md](../AUTHORIZATION.md#policies-conceptuais-rls). Roles como enum fixo em vez de tabela `roles` genérica — poucos valores, mudança de role é uma decisão arquitetural rara, não justifica a indireção de uma tabela extra. Funções helper SQL propostas para as policies (não implementadas): `is_admin()`, `is_treasurer()`, `is_viewer()`, `has_camp_access(camp_id)`, `can_edit_camp(camp_id)` — a implementar com `SECURITY DEFINER` e `search_path` fixo explícito, para nunca introduzir um bypass acidental de RLS.

## Benefits
- Fecha o achado CRITICAL de forma estrutural, não só cosmética.
- `field_memberships` com `revoked_at` soft preserva histórico de "quem teve acesso quando" — útil por si só para auditoria.
- Simples de raciocinar: qualquer policy nova responde só a "que `global_role` tenho?" + "sou membro deste `camp_id`?".

## Costs
- Todo o código de leitura/escrita existente precisa de passar a correr com sessão de utilizador, não com o cliente anon direto — reescrita de todos os Server/Client Components que hoje leem/escrevem diretamente.

## Risks
- Policies mal escritas podem bloquear operações legítimas (já aconteceu duas vezes no schema atual — migrations 014→015 e 030, sempre por policy scoped só a `authenticated` numa app que não autenticava). Mitigação: suite de testes de RLS dedicada (ver [TESTING_STRATEGY.md](../TESTING_STRATEGY.md)) antes de qualquer policy ir para produção.

## Open questions
- Direção (read-only) é mesmo necessária como role própria já na V2, ou pode esperar? (relacionado ao Gate C)

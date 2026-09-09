# ADR-009 — Audit logging

**Status:** PROPOSED

## Context
Hoje não existe nenhum registo de "quem fez o quê" — nem sequer `created_by` em `despesas`. Combinado com a ausência de autenticação (auditoria, Secção 5), é literalmente impossível hoje explicar depois de quem alterou um valor financeiro.

## Options considered
1. **Tabela `audit_log` genérica, escrita explícita dentro de cada Server Action** (proposto).
2. **Triggers de BD em cada tabela sensível**, gravando automaticamente `before`/`after` — mais consistente (impossível esquecer), mas menos flexível para incluir `reason`/contexto de negócio.
3. **Combinação:** triggers para as tabelas mais sensíveis (`expenses`, `budgets`) como rede de segurança, mais escrita explícita nas Server Actions onde o contexto (`reason`) importa.

## Proposed decision
Deixado deliberadamente em aberto entre as opções 1 e 3 nesta fase — a estrutura da tabela `audit_log` (ver [ERD.md](../ERD.md#audit_log)) é a mesma nos dois casos; a decisão de "trigger vs. explícito" é de implementação, não de arquitetura, e pode ser revisitada sem qualquer migração de dados.

## Benefits
- Resolve diretamente a falta de proveniência identificada na auditoria.
- Suporta os eventos pedidos (`expense.created/updated/deleted`, `budget.approved`, `user.role_changed`, `camp.closed`, `invoice.extraction_confirmed`, `product.merged`/`supplier.merged`) sem precisar de uma tabela por tipo de evento.

## Costs
- Disciplina de engenharia: qualquer Server Action nova que altere dados financeiros tem de lembrar-se de escrever em `audit_log` (se a opção final não incluir triggers automáticos como rede de segurança).

## Risks
- Se a opção escolhida for só "escrita explícita" (1) sem triggers, uma Server Action esquecida no futuro cria um buraco silencioso no histórico — argumento a favor de pelo menos os triggers de segurança da opção 3 nas tabelas mais sensíveis.

## Open questions
Nenhuma bloqueante — decisão de implementação, não de design, pode ser resolvida na Fase 4.

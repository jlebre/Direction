# ADR-003 — Server/client trust boundary

**Status:** PROPOSED

## Context
Hoje toda a escrita financeira (`NovaDespesaClient.tsx` e equivalentes) chama `supabase.from(...).insert/update()` diretamente do browser com a chave anon (auditoria, achado HIGH). Não existe nenhuma Server Action ou Route Handler no caminho de escrita — só duas Server Actions em todo o projeto, nenhuma delas para dados financeiros.

## Options considered
1. **Server Actions como único caminho de escrita financeira** (proposto).
2. **Manter escrita direta do cliente, confiar só na RLS** — descartado: RLS é a última linha de defesa, não deve ser a única (mensagens de erro pobres, mais difícil de auditar "porque falhou", sem espaço para lógica de validação de negócio antes do insert).
3. **Route Handlers (`app/api/**`) para tudo** — descartado como padrão geral: Server Actions integram-se melhor com formulários/Server Components no App Router; Route Handlers ficam reservados para casos que não são pedidos-resposta simples (ex. webhooks de IA).

## Proposed decision
Ver a tabela completa em [AUTHORIZATION.md](../AUTHORIZATION.md#fronteira-de-confiança-server-components--server-actions--route-handlers--client--service_role). Resumo: Server Components só leem (com sessão do utilizador); Server Actions são o único caminho de escrita para dados financeiros, e validam explicitamente `camp_id` vs. membership antes de qualquer operação; `service_role` nunca chega ao browser.

## Benefits
- Duas camadas de defesa (validação explícita + RLS), não uma.
- Mensagens de erro úteis ao utilizador em vez de uma rejeição genérica de RLS.
- Abre caminho natural para `audit_log` (a Server Action é o ponto certo para gravar o evento).

## Costs
- Reescrita de todos os formulários de escrita existentes (`NovaDespesaClient`, `EditarDespesaClient`, etc.) para chamar Server Actions em vez de `supabase.from()` diretamente.

## Risks
- Se uma Server Action nova esquecer a validação explícita de `camp_id`, a RLS ainda protege — mas só se a RLS estiver mesmo bem escrita (depende do ADR-002 estar implementado corretamente primeiro).

## Open questions
Nenhuma pendente — esta é uma decisão relativamente mecânica uma vez que o ADR-001/002 estejam decididos.

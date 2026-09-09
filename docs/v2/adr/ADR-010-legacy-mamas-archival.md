# ADR-010 — Legacy/Mamãs archival

**Status:** PROPOSED

## Context
A área Mamãs teve pouca utilização e será removida na V2 (decisão já tomada pelo utilizador, fora deste ADR). A auditoria (Secção 7) mapeou o acoplamento: código quase todo isolado, exceto `types/shared.ts` (mistura campos financeiros e Mamãs no mesmo `Campo`), e a tabela `campos` (mesma mistura ao nível de colunas).

## Options considered
1. **`DROP TABLE`/`DROP COLUMN` imediato das tabelas e colunas Mamãs** — descartado: viola a regra explícita "os dados de 2026 não podem ser perdidos" e o princípio de Histórico imutável; também não há ainda garantia de que nenhuma análise futura vai querer cruzar dados (ex. "o campo tinha X animados" pode interessar ao motor de orçamento como proxy de escala, mesmo sem o resto do módulo Mamãs).
2. **Arquivar sem apagar** (proposto) — tabelas/colunas deixam de ser lidas pelo código, mas continuam na BD, consultáveis por SQL direto se precisas.
3. **Mover para um schema Postgres separado (`mamas_archive`)** — variante mais limpa de (2), separa fisicamente o que é "vivo" do que é "arquivo", sem apagar nada.

## Proposed decision
Opção 2/3 combinadas: primeiro dividir `types/shared.ts` (mecânico, ver auditoria Secção 7), remover código Mamãs (`components/mamas/**`, `lib/mamas/**`, rotas), e só depois — como passo separado e opcional, não urgente — mover as tabelas/colunas Mamãs para um schema `mamas_archive` quando/se fizer sentido. Nunca `DROP` enquanto 2026 for o único ano com dados completos.

## Benefits
- Zero risco de perda de dados de 2026.
- Remoção de código pode acontecer imediatamente (baixo acoplamento já confirmado) sem esperar por uma decisão de arquivamento de BD mais lenta.

## Costs
- A BD mantém-se "maior" do que estritamente necessário por mais tempo — custo de armazenamento desprezável face ao risco evitado.

## Risks
- Colunas órfãs em `campos` (`orcamento_*`, `num_animados`, etc.) podem confundir quem olhar para o schema sem contexto — mitigado por documentação clara no próprio schema/README e por este ADR.

## Open questions
Nenhuma bloqueante — a remoção de código (Fase 3) pode avançar independentemente da decisão final sobre arquivamento físico da BD.

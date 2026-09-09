# ADR-004 — Financial data model

**Status:** PROPOSED

## Context
O modelo atual (`campos`, `despesas`, `despesa_linhas`, `devolucoes`) mistura identidade do campo com configuração anual e com campos exclusivos das Mamãs na mesma tabela `campos` (auditoria, Secções 4 e 7). Não distingue "identidade do campo" (a série que se repete todos os anos) de "edição anual".

## Options considered
1. **`camp_slots` + `locations` + `camps`** (proposto) — três entidades separadas.
2. **Manter uma tabela `camps` única**, com um campo de texto livre para "série" — descartado: não permite comparação estruturada entre anos (JOIN limpo), que é um requisito explícito da Tesouraria.
3. **Modelar "série" e "edição" na mesma tabela com uma FK para si própria** (self-referencing) — descartado: mais confuso do que três tabelas simples, sem benefício real.

## Proposed decision
Ver [ERD.md](../ERD.md#camps-como-entidade-histórica--resumo-7). `camp_slots` = identidade (escalão + ordem); `locations` = local reutilizável, agora com distâncias explícitas (casa de apoio, centro urbano) para o motor de orçamento; `camps` = edição anual concreta.

## Benefits
- Comparação ano a ano de "Aranhiços I" torna-se um JOIN simples por `camp_slot_id`, não uma comparação de texto frágil.
- `locations` reutilizável entre anos sem duplicar dados de distância/morada.
- Prepara diretamente os fatores pedidos para o motor de orçamento (§10 do pedido de Fase 1) que hoje não têm onde viver no schema.

## Costs
- Uma migration de dados mais elaborada do que um simples rename (Fase 4, [MIGRATION_STRATEGY.md](../MIGRATION_STRATEGY.md)) — tem de inferir `camp_slots` a partir de `escalao`+contagem de repetição no nome (`I`/`II`/`III`) dos 11 campos de 2026 existentes.

## Risks
- Se a inferência de `camp_slots` a partir dos dados de 2026 falhar para algum campo com naming inconsistente, precisa de correção manual — baixo risco dado que só há 11 campos a migrar (confirmado no backup da Fase 0.5).

## Open questions
Nenhuma bloqueante — mecânico depois do modelo aprovado.

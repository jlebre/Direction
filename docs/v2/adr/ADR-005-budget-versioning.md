# ADR-005 — Budget versioning

**Status:** PROPOSED (depende do Gate B — ver [ARCHITECTURE.md §19](../ARCHITECTURE.md#19-human-decision-gates))

## Context
Hoje o "orçamento" é `campos.saldo_inicial` (um número, sobrescrito silenciosamente se alguém o editar) mais `valores_referencia` (referência por código, também sem histórico de alterações). Não há forma de saber, depois de um campo fechado, qual era exatamente o orçamento em vigor quando uma despesa foi lançada.

## Options considered
1. **`budgets`/`budget_lines` versionados, com `superseded_by`** (proposto).
2. **Um único `budgets` por campo, com `UPDATE` em vigor** — descartado: viola diretamente o princípio de Histórico imutável ([ARCHITECTURE.md §2](../ARCHITECTURE.md#2-princípios)).
3. **Guardar snapshots em JSONB dentro de `camps`** — descartado: dificulta queries/joins para a Tesouraria, e reintroduz o padrão "campo de configuração genérico" que a auditoria já identifica como fonte de fragilidade analítica.

## Proposed decision
Ver [ERD.md](../ERD.md#budgets--budget_lines-novo--resolve-8). Estados `draft`→`proposed`→`approved`→`closed`; `superseded_by` liga uma versão à que a substituiu; nunca `UPDATE` sobre uma versão já `approved`.

## Benefits
- Um orçamento "aprovado" é sempre um facto histórico consultável, mesmo anos depois.
- Suporta diretamente o backtesting (§11/§Fase 9): comparar o orçamento realmente aprovado nesse ano vs. o que o motor teria produzido.

## Costs
- Mais uma tabela e mais um fluxo de aprovação para desenhar na UI, em vez de um número editável direto.

## Risks
- Se o fluxo de aprovação for demasiado pesado para o uso real (equipas pequenas, pouco tempo), pode ser ignorado na prática — mitigado deixando `draft` livre para os Adjuntos trabalharem sem fricção, só `approved` exige o passo formal.

## Open questions
- Existe hoje um processo formal de aprovação de orçamento por campo, ou é sempre um valor de referência fixo por escalão? (pergunta do Gate B, decide se o estado `proposed` é sequer necessário no primeiro ano)

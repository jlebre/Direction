# ADR-008 — Budget engine architecture

**Status:** PROPOSED (depende do Gate F — ver [ARCHITECTURE.md §19](../ARCHITECTURE.md#19-human-decision-gates))

## Context
A V2 quer um motor capaz de estimar orçamento a partir de participantes, duração, localização, distância, escalão, época, ordem do campo no verão, histórico do local e preços históricos, com backtesting sobre 2026. Hoje, 2026 é o único ano com dados completos (confirmado no backup da Fase 0.5: 11 campos, 384 despesas, 151 linhas de produto).

## Options considered
1. **Regras/heurísticas explícitas** (ex. média histórica ajustada por participantes/escalão), explicáveis por construção.
2. **Modelo estatístico** (regressão, por exemplo) sobre features estruturadas.
3. **Machine learning** (modelo treinado) — maior potencial a prazo, maior risco de sobreajuste com um único ano de dados de qualidade completa.

## Proposed decision
Começar por (1) regras/heurísticas explícitas, com a arquitetura em camadas de [ARCHITECTURE.md §11](../ARCHITECTURE.md#11-arquitetura-do-motor-de-orçamento) desenhada para admitir (2)/(3) mais tarde sem reescrever `budget_predictions`/`budget_model_versions` — só a implementação do "engine" em si muda.

## Benefits
- Explicabilidade por construção (princípio arquitetural, [ARCHITECTURE.md §2](../ARCHITECTURE.md#2-princípios)) — uma heurística explícita é trivial de justificar a um Tesoureiro; um modelo estatístico já exige mais trabalho de explicação; ML exige o mais.
- Baixo risco de sobreajuste no primeiro ano, quando só há 2026 como dado completo.
- `budget_predictions` nunca escreve sobre dados reais — o motor pode evoluir de metodologia sem qualquer migração de dados financeiros.

## Costs
- Uma heurística simples pode não capturar bem casos atípicos (campo num local novo, sem histórico) — aceitável no primeiro ano, a resolver quando houver mais dados.

## Risks
- Se o Gate F escolher ML prematuramente, o risco de sobreajuste é real e pode gerar previsões pouco confiáveis logo no primeiro backtesting — é precisamente por isto que a recomendação é começar simples.

## Open questions
- Que grau de "confiar num número que o sistema calculou sozinho" a Tesouraria está confortável em aceitar no primeiro ano? (Gate F)

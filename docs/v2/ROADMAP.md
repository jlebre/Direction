# ROADMAP — CAMTIL Finance V2

| # | Fase | Estado |
|---|---|---|
| 0 | Auditoria | **DONE** |
| 0.5 | Backup integral | **DONE — validado (PASS)**, ver relatório de execução |
| 1 | Architecture Design | **DONE — este documento e os que lhe são anexos** (para revisão humana) |
| 2 | Security & Authentication | a fazer |
| 3 | Mamãs / Legacy cleanup | a fazer |
| 4 | Financial Foundation | a fazer |
| 5 | Treasury Dashboard | a fazer |
| 6 | AI Invoice Pipeline | a fazer |
| 7 | Products / Suppliers / Price History | a fazer |
| 8 | Budget Model Research | a fazer |
| 9 | Budget Engine + Backtesting | a fazer |
| 10 | Autonomy / Operations | a fazer |
| 11 | Pilot | a fazer |
| 12 | Production V2 | a fazer |

## Sem mudanças à ordem proposta pelo pedido original — com uma nota

A ordem pedida (0→12) faz sentido tal como está e **não a alterámos**. Uma única observação técnica, não uma mudança silenciosa: a Fase 3 (Mamãs/Legacy cleanup) está desenhada, na auditoria (Secção 7), para ser puramente uma remoção de código com baixo acoplamento — pode correr **em paralelo** com o início da Fase 2 (Security), já que não partilham ficheiros críticos além de `types/shared.ts` (que a Fase 3 já resolve sozinha). Não é uma reordenação, é uma nota de que 2 e 3 não precisam de ser estritamente sequenciais se houver capacidade para trabalhar nas duas — a decisão de as paralelizar ou não fica para quem planeia o trabalho, não é assumida aqui.

Todas as restantes fases (4 em diante) dependem de 2 estar concluída (autenticação real é pré-requisito arquitetural, não só de segurança — ver [ARCHITECTURE.md](./ARCHITECTURE.md) §2 "Segurança real").

## Marcos de decisão humana ao longo do roadmap

| Fase | Gate(s) que têm de estar resolvidos antes de avançar |
|---|---|
| 2 | Gate A (Auth) |
| 4 | Gate B (Modelo financeiro/orçamento) |
| 5 | Gate C (Dashboard Tesouraria) |
| 6 | Gate D (Estratégia IA) |
| 7 | Gate E (Normalização de produtos) |
| 8–9 | Gate F (Metodologia do motor) |
| 10 | Gate G (Autonomia administrativa) |

Ver [ARCHITECTURE.md §19](./ARCHITECTURE.md#19-human-decision-gates) para o detalhe de cada gate.

# CAMTIL Finance V2 — Fase 1: Architecture Design

**Status geral: PROPOSED.** Documentação para revisão humana — nada foi implementado (sem migrations, sem Auth, sem remoção de Mamãs, sem alteração de RLS).

## Índice

- [ARCHITECTURE.md](./ARCHITECTURE.md) — objetivos, princípios, personas, resumo de auth/authorization, IA para faturas, motor de orçamento, audit log, administração autónoma, e a secção mais importante: **Human Decision Gates**.
- [ERD.md](./ERD.md) — modelo de dados completo (entidades, responsabilidades, campo como entidade histórica, modelo de orçamento versionado, produtos/fornecedores/preços).
- [AUTHORIZATION.md](./AUTHORIZATION.md) — comparação de métodos de autenticação, policies de RLS conceptuais por tabela/operação, fronteira de confiança servidor/cliente.
- [ROUTES.md](./ROUTES.md) — estrutura de rotas proposta para a V2.
- [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) — expand → migrate → verify → switch → archive → contract, fase a fase.
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) — unit, integration, RLS/segurança, E2E, invariantes financeiros.
- [OPERATIONS.md](./OPERATIONS.md) — backups, restore, monitoring, secrets, deploy, ambientes.
- [ROADMAP.md](./ROADMAP.md) — as 12 fases, estado atual, gates por fase.
- [adr/](./adr/) — 10 Architecture Decision Records, todos `PROPOSED`.

## Como ler isto

Comece por [ARCHITECTURE.md](./ARCHITECTURE.md) — tem o resumo dos objetivos e, no fim, a lista de **Human Decision Gates** (A–G), que são as decisões que precisam de resposta de José/Tesouraria antes de a implementação poder avançar fase a fase.

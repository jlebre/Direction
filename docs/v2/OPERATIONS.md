# OPERATIONS — CAMTIL Finance V2

Status: **PROPOSED.** Objetivo explícito: uma pessoa diferente do programador original consegue manter o sistema seguindo só esta documentação.

## Backups
- **Base:** `npm run backup` (Fase 0.5) já existe, corre localmente, produz um ZIP validado com checksum. Recomendado: correr antes de qualquer migration e semanalmente durante a época de campos.
- **Confirmado em produção (fecho da Fase 2):** corrido imediatamente antes da migration 043 (Danger Zone) e de novo no fecho da Fase 2 — `overall_validation: PASS` nas duas vezes, contagens de BD e Storage idênticas entre corridas (nenhum dado real alterado pelo trabalho da Fase 2).
- **Evolução natural (não implementar agora):** agendar via GitHub Actions/cron gerido, a escrever para um destino fora do portátil de quem o corre (ex. bucket privado dedicado, não o `faturas`) — o backup de hoje já resolve "existe uma cópia", falta "a cópia não depende de um portátil específico".
- Reter pelo menos: o backup de fim de cada campo, e um backup mensal durante a época.

## Testes automatizados (Fase 2)
- `npm run test` (Vitest) e `npm run test:e2e` (Playwright, contra a app deployada) — ver [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) para a política completa e a matriz de roles/Storage.
- `npm run test:e2e:cleanup` é a rede de segurança independente: corre sempre que uma suite E2E possa ter morrido antes do seu próprio teardown, varre por padrão `[TEST]`/`test-*` (nunca por ID de uma corrida) e reporta explicitamente se sobrou alguma coisa.
- `npm run test:e2e` usa credenciais de produção (via `supabase db query --linked`) para autenticar fixtures — nunca deve correr automaticamente em CI normal; fica reservado a execução manual ou a um futuro `workflow_dispatch` dedicado.

## Restore
- Documentar (na Fase 2, junto com as migrations reais) um script `restore-from-backup.ts` irmão do `run-backup.ts`, capaz de:
  1. Recriar linhas a partir de `raw/*.json` numa BD vazia/de teste (nunca diretamente sobre produção sem confirmação explícita).
  2. Reenviar fotografias de `raw/storage/faturas/` para o bucket.
  3. Validar contagens pós-restore contra o `manifest.json` original.
- Testar este restore pelo menos uma vez contra um projeto Supabase de staging antes de precisar dele a sério.

## Monitoring & Logging
- Erros de Server Actions (ex. falha de extração de IA, falha de upload) — reportados para um serviço de erro (a escolher; nada instalado hoje).
- `audit_log` funciona também como log de negócio — consultável em `/admin/auditoria`.
- Sem dependência de logs só na consola do Vercel/host — qualquer evento que importe para reconstruir "o que aconteceu" fica em `audit_log`, que sobrevive a rotação de logs de infraestrutura.

## Alertas
- Falhas de backup (o script termina com `overall_validation !== 'PASS'`).
- Orçamento de um campo a aproximar-se de 100% de execução (útil para Adjuntos e Tesouraria).
- Falhas de extração de IA acima de um limiar (sinal de que o motor/fornecedor mudou de comportamento).

## Gestão de secrets
- Hoje: `.env.local` local, sem rotação, PIN em texto simples na BD. V2: `service_role` só em variáveis de ambiente do servidor (nunca `NEXT_PUBLIC_*`), chave de API do fornecedor de IA idem, gerido pelo provedor de hosting (ex. Vercel env vars) — nunca commitado, nunca num backup (ver README.txt gerado pela Fase 0.5, que já exclui isto explicitamente).
- Rotação: documentar o procedimento de rotação da `service_role` key e da chave de IA como parte da Fase 2 (não é preciso decidir a cadência agora, só garantir que o procedimento existe e está escrito).

## Migrations
- Continuar com o padrão já usado (migrations SQL numeradas, idempotentes onde possível) — funciona bem, o problema identificado na auditoria foi só disciplina (números duplicados, `schema.sql` desatualizado), não a abordagem em si.
- **Corrigir para a V2:** manter `schema.sql` sempre regenerado a partir do estado real (`supabase db dump` ou equivalente) depois de cada migration, para nunca mais ficar desatualizado como está hoje.

## Atualização de dependências
- Sem processo hoje (confirmado pela auditoria: `next lint` foi removido na versão instalada e ninguém reagiu). V2: Dependabot/Renovate mínimo, com o CI da [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) como rede de segurança antes de qualquer merge automático.

## Documentação
- Este próprio `docs/v2/` é o ponto de partida — mantido junto ao código, não num Google Doc separado que fica desatualizado.
- Cada ADR (`docs/v2/adr/`) regista o porquê de uma decisão — quando uma decisão precisar de ser revisitada, o contexto original está lá.

## Deploy
- Ambientes **Development** (Supabase local ou projeto de staging + `next dev`) e **Production** (projeto Supabase de produção + host escolhido) claramente separados — hoje só existe um ambiente, o que torna qualquer migration arriscada por definição.
- Nenhuma migration corre diretamente em produção sem primeiro correr em staging com dados de teste (ou uma cópia restaurada do backup da Fase 0.5, anonimizada se for partilhada com mais gente).

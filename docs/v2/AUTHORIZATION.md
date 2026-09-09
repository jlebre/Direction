# AUTHORIZATION — Authentication, Roles & RLS

Status: **Gate A — ACCEPTED e IMPLEMENTADO em produção.** `profiles`, `camp_memberships`, funções auxiliares (`is_admin()`, `has_camp_access()`, etc.) e o login real (Email OTP) existem e foram testados com um login humano real. A RLS restritiva das tabelas financeiras core (`campos`/`despesas`/`despesa_linhas`/`devolucoes`/`regularizacoes_nif`/`liquidacoes_nif`) **já está aplicada** (migration 042) — mas com uma exceção explícita, por campo, para os 11 campos reais (ver "Transição por campo" abaixo). Storage (`faturas`) continua deliberadamente fora deste mecanismo — ver a nota no fim desta secção.

## Transição por campo (mecanismo ativo — não é mais "tudo ou nada")

Desde a migration 041/042, cada campo tem uma coluna `campos.legacy_anon_access` (boolean, default `false`). As policies de RLS das 6 tabelas financeiras core passaram de `USING (true)` (sem exceção, aberto a qualquer pessoa) para:

```
USING ( has_camp_access(campo_id)  -- authenticated access, real
        OR has_legacy_anon_access(campo_id) )  -- exceção explícita, por campo
```

**Nunca um `OR true` global.** A exceção é sempre avaliada campo a campo, contra a linha real de `campos`.

**Estado atual (decisão explícita de José):** os 11 campos reais de 2026 têm todos `legacy_anon_access = true` — nenhum fechou ainda. Qualquer campo novo (incluindo os `[TEST] Camp A/B` do harness) nasce com `false`. Fechar um campo específico é uma única `UPDATE campos SET legacy_anon_access = false WHERE id = ...` — sem nova migration, reversível instantaneamente.

**Critério para fechar cada campo (Gate A/B, por campo):**
- **Gate A:** o campo tem pelo menos uma `camp_memberships` `adjunto` `active` e não expirada (ver `/admin/memberships`); **ou**
- **Gate B:** José confirma explicitamente que aquele campo específico está fechado/inativo.

**Critério para remover o mecanismo por completo (contract, ver MIGRATION_STRATEGY.md):** quando todos os 11 campos reais tiverem `legacy_anon_access = false`, a coluna, a função `has_legacy_anon_access()` e o ramo `OR has_legacy_anon_access(...)` de cada policy são removidos numa migration de limpeza — nunca fica como arquitetura permanente.

## PIN legacy (continua a existir, sem crescer)

`campos.pin` e o cookie `admin_auth` continuam a existir (`src/actions/validatePin.ts`, `src/app/admin/actions.ts`/`layout.tsx`, marcados `LEGACY ACCESS` no código) — mas **já não são a fronteira de segurança real**: são só um gate de UI. A fronteira real é agora a RLS (com ou sem a exceção por campo). **Regra explícita:** não se adicionam novos usos do PIN; só se documentam/isolam os que já existem, até deixarem de ser precisos.

## Storage (`faturas`) — deliberadamente fora deste mecanismo por agora

O bucket `faturas` está marcado `public: true` no Supabase — esse flag serve qualquer ficheiro por URL pública **sem passar pela RLS**, seja qual for a policy. Não há meio-termo "público para uns campos, privado para outros" enquanto o flag for `true` a nível de bucket. Decisão explícita (José): manter público por agora — zero isolamento por campo no Storage nesta fase, para não arriscar o fluxo ativo (upload/edição de faturas) de quem ainda está a trabalhar. Migrar para signed URLs (pré-requisito para tornar o bucket privado) fica para uma iteração futura, fora desta ronda da subfase 2.5 — ver MIGRATION_STRATEGY.md.

## Gate A — decisão fechada

| | Decisão fechada | Nota |
|---|---|---|
| Identidade | Conta individual por pessoa; sem contas partilhadas por campo | `campos.pin` deixa de autenticar/autorizar — pode continuar no schema só por compatibilidade histórica |
| Autenticação | **Supabase Auth — Email OTP**, sem password | Magic Link fica como extensão futura possível, sem alterar o modelo de autorização (ver nota abaixo) |
| Roles globais | `admin` \| `treasurer` \| `viewer` | Substituem `admin`/`tesoureiro`/`direcao` do rascunho original — mesmo conceito, naming inglês consistente |
| Memberships | Tabela `camp_memberships` (não `field_memberships`) | Ver estrutura completa abaixo |
| Roles locais (por campo) | `adjunto` \| `field_viewer` | `field_viewer` é novo — leitura de um campo específico, sem role global |
| Estados de membership | `invited` \| `active` \| `revoked` | — |

**Alterações face ao rascunho da Fase 1 (documentadas, como pedido):**
- `field_memberships` → **`camp_memberships`** (naming consistente em inglês, aprovado).
- Role global `direcao` → **`viewer`** (mesmo papel: leitura transversal, sem escrita).
- Magic Link → **Email OTP** como método principal (ambos resolvem o mesmo problema de "sem password"; OTP foi a escolha fechada — boa UX mobile, sessão persistente, simples para utilizadores temporários, e não fecha a porta a Magic Link mais tarde porque ambos passam pela mesma tabela `profiles`/sessão Supabase Auth, sem qualquer impacto no modelo de autorização).
- Novo role local `field_viewer` (não existia no rascunho da Fase 1) — leitura de um campo específico sem ser Adjunto.

### `camp_memberships` — estrutura fechada

```
id
camp_id      → camps
user_id      → profiles (auth.users)
role         adjunto | field_viewer
status       invited | active | revoked
created_at
created_by   → profiles
expires_at   nullable — Adjuntos são frequentemente temporários (só um verão)
```

Constraint: no máximo uma membership `active`/`invited` por `(camp_id, user_id)` em simultâneo (uma `revoked` não conta para a constraint — permite reconvite depois de revogação).

---

## Authentication Design

### Opções comparadas

| Opção | Fricção mobile | Adjuntos temporários (só 1 verão) | Recuperação de acesso | Segurança | Pessoas não-técnicas |
|---|---|---|---|---|---|
| **Magic Link (email)** | Baixa — um toque no email | Boa — convite por email, expira sozinho se não usado | Reenviar link | Boa (sem password para esquecer/reutilizar) | Boa — "carrega no link" é familiar |
| **Email + Password** | Média — escrever password no telemóvel | Má — mais uma password para gerir/esquecer por época | Reset de password (fricção extra) | Depende do utilizador (passwords fracas/reutilizadas) | Média |
| **OTP por SMS** | Média — depender de rede/SMS chegar | Boa | Reenviar código | Boa, mas custo por SMS e depende de operadora | Boa |
| **PIN por campo (atual)** | Muito baixa | Boa | N/A — PIN é partilhado | **Má** — é o achado CRITICAL da auditoria | Muito boa |

### Recomendação (Gate A)

**Magic Link como método principal**, via Supabase Auth, com estas decisões de apoio:
- Convite por email feito por um Admin/Tesoureiro em `/admin` (cria a `profile` + `field_membership` antes do adjunto sequer entrar) — nada de self-signup público, que reintroduziria o problema de "qualquer pessoa com a URL entra".
- Sessão longa (ex. 30 dias) para minimizar re-autenticações durante um campo de uma semana sem rede fiável.
- **Plano B operacional**, não removido de vez: para um adjunto sem email de confiança (raro, mas a auditoria mostra que a app foi desenhada para ser acessível a não-técnicos), permitir que um Tesoureiro/Admin gere um **link de acesso temporário assinado** (token de uso único, com validade curta) a partir do `/admin` — resolve o mesmo problema que o PIN resolvia, mas de forma auditável, revogável, e não reutilizável indefinidamente como um PIN estático.
- OTP por SMS fica descartado por agora (custo operacional, dependência de operadora) — pode voltar a ser avaliado se o Magic Link se revelar insuficiente em campo com fraca cobertura de rede/email.

---

## Personas (recap — naming fechado no Gate A)

| Role | Âmbito | Onde vive |
|---|---|---|
| `adjunto` | por campo | `camp_memberships.role = 'adjunto'`, `status = 'active'` |
| `field_viewer` | por campo, só leitura | `camp_memberships.role = 'field_viewer'`, `status = 'active'` |
| `treasurer` | global | `profiles.global_role = 'treasurer'` |
| `admin` | global | `profiles.global_role = 'admin'` |
| `viewer` (Direção, read-only) | global | `profiles.global_role = 'viewer'` |

Um utilizador pode ter um `global_role` **e** memberships de campo simultaneamente (ex.: Treasurer que também é Adjunto pontual de um campo específico). Um Adjunto normal não precisa de `global_role` nenhum — o acesso vem só da membership.

---

## Policies conceptuais (RLS)

Notação: `auth.uid()` = utilizador autenticado atual. Todas as policies assumem que `profiles`/`field_memberships` só podem ser escritas por Admin (nunca pelo próprio utilizador a subir de role).

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `expenses`, `expense_lines`, `refunds` | membro (`adjunto` ou `field_viewer`) do `camp_id` OU `global_role IN ('treasurer','admin','viewer')` | membro `adjunto` (ativo) do `camp_id` OU `admin` | idem SELECT restrito a `adjunto`/`admin`/`treasurer`, e nunca depois de `camps.status = 'closed'` sem passar por `treasurer`/`admin` | **nunca** por `adjunto` além de uma janela curta (ex. 24h) após criação — depois disso, só `treasurer`/`admin`, e sempre gerando `audit_log` |
| `budgets`, `budget_lines` | membro do campo (leitura) OU global read | `adjunto` cria `draft`; só `treasurer`/`admin` avança para `proposed`→`approved` | mesmas regras de transição de estado | só antes de `approved` |
| `camps` | membro do campo (`adjunto`/`field_viewer`) OU global read | só `admin` | `admin` (config geral); `adjunto` só campos próprios como `saldo`/config operacional, nunca datas/local depois de `approved` | só `admin` |
| `invoice_documents`, `invoice_extractions` | membro do campo OU global read | `adjunto` do campo (via Server Action — nunca insert direto do browser, ver secção seguinte) | confirmação de extração pelo `adjunto`/`treasurer` do campo | não aplicável (histórico imutável) |
| `products`, `suppliers`, `product_aliases` | qualquer autenticado | `adjunto`/`treasurer` sugerem; `treasurer`/`admin` confirmam merges | só `treasurer`/`admin` | só `admin`, e sempre com `audit_log` |
| `price_observations` | qualquer autenticado | gerado a partir de `expense_lines` confirmadas (processo de servidor, não input direto do utilizador) | só `treasurer`/`admin` (correções pontuais) | só `admin` |
| `budget_models`, `budget_model_versions`, `budget_predictions` | `treasurer`/`admin`/`viewer` | só `admin`/`treasurer` | previsões são imutáveis — nunca UPDATE, só INSERT de nova previsão | só `admin` |
| `audit_log` | `treasurer`/`admin` | só server-side (nunca client insert) | **nunca** | **nunca** |
| `profiles`, `camp_memberships` | o próprio (linha própria) + `admin` vê tudo | só `admin`/`treasurer` (convites) | só `admin` (mudança de role gera `audit_log: user.role_changed`) | só `admin` (soft — `status='revoked'`, nunca hard delete) |

**Storage (`faturas` e futuro bucket de documentos):** políticas por prefixo de caminho — um `adjunto` só lê/escreve objetos sob o prefixo do(s) seu(s) campo(s) (`<camp_id>/...`); `field_viewer` só lê o prefixo do seu campo; `treasurer`/`admin`/`viewer` leem tudo; **ninguém** faz upload direto sem passar primeiro por um Server Action que valida o `camp_id` contra `camp_memberships` — corrige diretamente o achado HIGH "bucket público sem isolamento por campo".

---

## Fronteira de confiança: Server Components / Server Actions / Route Handlers / Client / `service_role`

| Camada | Pode ler dados sensíveis? | Pode escrever? | Regra |
|---|---|---|---|
| **Server Components** | Sim, mas só o que a RLS da sessão do utilizador permite | Não (não escrevem) | Usam sempre o cliente Supabase **com a sessão do utilizador** (cookie), nunca `service_role` |
| **Server Actions** | Sim | Sim — é aqui que TODAS as escritas financeiras devem acontecer | Validam explicitamente `camp_id` contra `camp_memberships` (status `active`) do utilizador autenticado **antes** de qualquer insert/update — mesmo que a RLS já bloqueie, a validação explícita dá mensagens de erro úteis e uma segunda camada de defesa |
| **Route Handlers** (`app/api/**`, hoje inexistentes) | Sim | Sim | Só para casos que Server Actions não cobrem bem (ex. webhook de um extractor de IA assíncrono, endpoint chamado por um cron de manutenção) |
| **Supabase Client (browser)** | Só o que a RLS permite à sessão do utilizador | Só onde a RLS explicitamente permite (ex. leituras diretas de listagens já hoje feitas assim) — **escritas financeiras deixam de ser diretas do browser** | É a mudança mais importante face a hoje: corrige o achado HIGH "todas as escritas saem do browser sem validação de servidor" |
| **`service_role`** | Tudo, sempre | Tudo, sempre — por isso **nunca chega ao browser** | Só usado em contexto 100% servidor (ex. o script de backup da Fase 0.5, ou uma futura tarefa administrativa em batch) e nunca através de uma variável `NEXT_PUBLIC_*` |

Esta tabela é a resposta direta ao pedido: hoje **não existe** nenhuma destas camadas de escrita — tudo é Supabase Client direto do browser com a chave anon. A V2 introduz Server Actions como o único caminho de escrita para dados financeiros.

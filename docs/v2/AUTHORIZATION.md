# AUTHORIZATION — Authentication, Roles & RLS

Status: **PROPOSED.** Nenhuma policy, migration ou configuração de Auth foi criada. Corrige diretamente os achados CRITICAL/HIGH da auditoria (RLS `USING(true)` em 36/36 tabelas, PIN cosmético, sem verificação de posse por campo).

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

## Personas (recap)

| Role | Âmbito | Onde vive |
|---|---|---|
| `adjunto` | por campo | `field_memberships.role = 'adjunto'` |
| `tesoureiro` | global | `profiles.global_role = 'tesoureiro'` |
| `admin` | global | `profiles.global_role = 'admin'` |
| `direcao` (read-only) | global | `profiles.global_role = 'direcao'` |

Um utilizador pode ter um `global_role` **e** memberships de campo simultaneamente (ex.: Tesoureiro que também é Adjunto pontual de um campo específico).

---

## Policies conceptuais (RLS)

Notação: `auth.uid()` = utilizador autenticado atual. Todas as policies assumem que `profiles`/`field_memberships` só podem ser escritas por Admin (nunca pelo próprio utilizador a subir de role).

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `expenses`, `expense_lines`, `refunds` | membro do `camp_id` OU `global_role IN ('tesoureiro','admin','direcao')` | membro `adjunto` do `camp_id` OU `admin` | idem SELECT, e nunca depois de `camps.status = 'closed'` sem passar por `tesoureiro`/`admin` | **nunca** por `adjunto` além de uma janela curta (ex. 24h) após criação — depois disso, só `tesoureiro`/`admin`, e sempre gerando `audit_log` |
| `budgets`, `budget_lines` | membro do campo (leitura) OU global read | `adjunto` cria `draft`; só `tesoureiro`/`admin` avança para `proposed`→`approved` | mesmas regras de transição de estado | só antes de `approved` |
| `camps` | membro do campo OU global read | só `admin` | `admin` (config geral); `adjunto` só campos próprios como `saldo`/config operacional, nunca datas/local depois de `approved` | só `admin` |
| `invoice_documents`, `invoice_extractions` | membro do campo OU global read | `adjunto` do campo (via Server Action — nunca insert direto do browser, ver secção seguinte) | confirmação de extração pelo `adjunto`/`tesoureiro` do campo | não aplicável (histórico imutável) |
| `products`, `suppliers`, `product_aliases` | qualquer autenticado | `adjunto`/`tesoureiro` sugerem; `tesoureiro`/`admin` confirmam merges | só `tesoureiro`/`admin` | só `admin`, e sempre com `audit_log` |
| `price_observations` | qualquer autenticado | gerado a partir de `expense_lines` confirmadas (processo de servidor, não input direto do utilizador) | só `tesoureiro`/`admin` (correções pontuais) | só `admin` |
| `budget_models`, `budget_model_versions`, `budget_predictions` | `tesoureiro`/`admin`/`direcao` | só `admin`/`tesoureiro` | previsões são imutáveis — nunca UPDATE, só INSERT de nova previsão | só `admin` |
| `audit_log` | `tesoureiro`/`admin` | só server-side (nunca client insert) | **nunca** | **nunca** |
| `profiles`, `field_memberships` | o próprio (linha própria) + `admin` vê tudo | só `admin` | só `admin` (mudança de role gera `audit_log: user.role_changed`) | só `admin` (soft — `revoked_at`, nunca hard delete) |

**Storage (`faturas` e futuro bucket de documentos):** políticas por prefixo de caminho — um `adjunto` só lê/escreve objetos sob o prefixo do(s) seu(s) campo(s) (`<camp_id>/...`); `tesoureiro`/`admin`/`direcao` leem tudo; **ninguém** faz upload direto sem passar primeiro por um Server Action que valida o `camp_id` contra `field_memberships` — corrige diretamente o achado HIGH "bucket público sem isolamento por campo".

---

## Fronteira de confiança: Server Components / Server Actions / Route Handlers / Client / `service_role`

| Camada | Pode ler dados sensíveis? | Pode escrever? | Regra |
|---|---|---|---|
| **Server Components** | Sim, mas só o que a RLS da sessão do utilizador permite | Não (não escrevem) | Usam sempre o cliente Supabase **com a sessão do utilizador** (cookie), nunca `service_role` |
| **Server Actions** | Sim | Sim — é aqui que TODAS as escritas financeiras devem acontecer | Validam explicitamente `camp_id` contra a membership do utilizador autenticado **antes** de qualquer insert/update — mesmo que a RLS já bloqueie, a validação explícita dá mensagens de erro úteis e uma segunda camada de defesa |
| **Route Handlers** (`app/api/**`, hoje inexistentes) | Sim | Sim | Só para casos que Server Actions não cobrem bem (ex. webhook de um extractor de IA assíncrono, endpoint chamado por um cron de manutenção) |
| **Supabase Client (browser)** | Só o que a RLS permite à sessão do utilizador | Só onde a RLS explicitamente permite (ex. leituras diretas de listagens já hoje feitas assim) — **escritas financeiras deixam de ser diretas do browser** | É a mudança mais importante face a hoje: corrige o achado HIGH "todas as escritas saem do browser sem validação de servidor" |
| **`service_role`** | Tudo, sempre | Tudo, sempre — por isso **nunca chega ao browser** | Só usado em contexto 100% servidor (ex. o script de backup da Fase 0.5, ou uma futura tarefa administrativa em batch) e nunca através de uma variável `NEXT_PUBLIC_*` |

Esta tabela é a resposta direta ao pedido: hoje **não existe** nenhuma destas camadas de escrita — tudo é Supabase Client direto do browser com a chave anon. A V2 introduz Server Actions como o único caminho de escrita para dados financeiros.

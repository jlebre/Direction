# AUTHORIZATION — Authentication, Roles & RLS

Status: **Gate A — ACCEPTED**, e parcialmente **IMPLEMENTADO em produção**: `profiles`, `camp_memberships`, funções auxiliares (`is_admin()` etc.) e o login real (Email OTP) já existem e foram testados com um login humano real. A RLS restritiva das tabelas financeiras core (`campos`/`despesas`/`despesa_linhas`/`devolucoes`/`regularizacoes_nif`/`liquidacoes_nif`) **ainda não foi aplicada** — ver a secção seguinte, "Fase de compatibilidade", para o porquê e o critério exato de quando isso pode avançar.

## Fase de compatibilidade (transitória — Fase 2)

Enquanto esta secção existir, **dois mecanismos de acesso coexistem deliberadamente**:

| | Legacy access | Authenticated access |
|---|---|---|
| Mecanismo | PIN por campo (`campos.pin`, texto simples) + cookie `admin_auth` para `/admin` | Supabase Auth (Email OTP) + `camp_memberships`/`profiles.global_role` |
| Onde ainda vive | `src/actions/validatePin.ts`, `src/app/admin/actions.ts`/`layout.tsx` — marcados `LEGACY ACCESS` no código | `src/lib/supabase/session-*.ts`, `src/proxy.ts`, `/login`, `/admin/memberships` |
| Protege hoje | Todos os campos reais (nenhum tem membership real ainda) | Só `/tesouraria/*` (rota nova, sem utilizadores reais nela ainda) |
| RLS por baixo | `USING (true)` — totalmente aberta nas tabelas financeiras core | Restritiva em `profiles`/`camp_memberships` (migrations 038-040), ainda não nas restantes |

**Regra explícita:** esta fase não deve crescer — não se adicionam novos usos do PIN legacy, só se documentam/isolam os que já existem, até deixarem de ser precisos.

### Critério para fechar a RLS restritiva (subfase 2.4)

A vaga restritiva só avança quando **uma** destas condições se verificar:

- **Gate A (readiness):** todos os campos ainda ativos (ver `/admin/memberships` — coluna "Estado de migração") têm pelo menos uma membership `adjunto` `active` e não expirada; **ou**
- **Gate B (fecho explícito):** José confirma explicitamente que os campos restantes sem membership estão fechados/inativos e podem perder o acesso legacy sem impacto real.

Estado ao vivo consultável em `/admin/memberships` (coluna READY/NOT READY por campo — construído a partir de `camp_memberships` + atividade recente em `despesas`/`devolucoes`).

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

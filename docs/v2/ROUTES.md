# ROUTES — CAMTIL Finance V2

Status: **PROPOSED.** Nenhuma rota foi criada/alterada. Convenção: **SC** = Server Component, **CC** = Client Component, **SA** = Server Action, **RH** = Route Handler.

```
/login                              SC + CC — pedido de Magic Link / link temporário
/auth/callback                      RH — troca de token do Supabase Auth

/campo/[campId]                     SC — hub do campo (Operação de Campo · domínio A)
/campo/[campId]/orcamento           SC + CC — orçamento (ver estado draft/proposed/approved)
/campo/[campId]/despesas            SC — lista de despesas
/campo/[campId]/despesas/nova       CC — captura de foto → IA/OCR → confirmação   [SA: createExpense]
/campo/[campId]/despesas/[id]       SC — detalhe                                  [SA: updateExpense, deleteExpense*]
/campo/[campId]/devolucoes/...      espelha despesas                              [SA equivalentes]
/campo/[campId]/execucao            SC — saldo disponível, execução vs. orçamento

/tesouraria                         SC — dashboard cross-campo (domínio B)         [role: tesoureiro/admin/direcao]
/tesouraria/campos                  SC + CC — comparação entre campos, filtros
/tesouraria/categorias              SC — custo por categoria, cross-campo
/tesouraria/anos                    SC + CC — comparação entre anos
/tesouraria/exportar                CC                                            [SA: exportAssembleia]

/inteligencia/precos                SC + CC — histórico de preços (domínio C)      [role: tesoureiro/admin/direcao]
/inteligencia/fornecedores          SC — fornecedores e preços por fornecedor
/inteligencia/produtos              SC + CC — normalização de produtos            [SA: mergeProducts]
/inteligencia/orcamentacao          SC + CC — motor de orçamento (previsões)      [fase tardia, ver ROADMAP]
/inteligencia/backtesting           SC — comparação orçamento vs. previsão vs. real [fase tardia]

/admin                              SC — dashboard admin (domínio D)               [role: admin]
/admin/utilizadores                 SC + CC — profiles, convites, revogação        [SA: inviteUser, revokeAccess]
/admin/campos                       SC + CC — CRUD camp_slots/camps/locations      [SA: createCamp, closeCamp]
/admin/categorias                   SC + CC — expense_codes                        [SA: upsertCode]
/admin/valores-referencia           SC + CC — igual ao de hoje, mas por camp_slot/ano
/admin/auditoria                    SC — consulta a audit_log

app/api/invoices/extract            RH — chamado pelo processamento server-side do extractor de IA (§10)
app/api/webhooks/...                RH — reservado para integrações futuras (ex. callback assíncrono de um extractor)
```

## Notas de desenho

- **Todas as páginas sob `/campo/[campId]`, `/tesouraria`, `/inteligencia`, `/admin` são Server Components que fazem o primeiro fetch já filtrado pela sessão/RLS** — nunca buscam dados "de todos os campos" e filtram no cliente.
- **Toda a escrita financeira passa por uma Server Action nomeada** (não handlers genéricos) — cada uma valida explicitamente a membership do utilizador no `camp_id` alvo antes de tocar na BD, como segunda camada de defesa além da RLS (ver [AUTHORIZATION.md](./AUTHORIZATION.md)).
- `deleteExpense` fica marcado com `*`: só permitido numa janela curta após criação para `adjunto`; fora dessa janela exige `tesoureiro`/`admin` e gera `audit_log` (ver [AUTHORIZATION.md](./AUTHORIZATION.md)).
- `app/api/**` só existe onde uma Server Action não serve — hoje a app não tem nenhuma rota de API; a V2 introduz o mínimo necessário para o pipeline de IA (que pode precisar de correr como um job assíncrono, não uma chamada request/response direta).
- Mantemos a forma geral `/campo/[id]/...` que já existe e as pessoas já conhecem — a V2 não muda a URL para quem já usa a app, só acrescenta `/tesouraria`, `/inteligencia` e estende `/admin` (ver [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) para redirects a preservar).

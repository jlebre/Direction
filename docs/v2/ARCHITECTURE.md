# CAMTIL Finance V2 — Architecture

Status: **PROPOSED — para revisão humana.** Nada aqui foi implementado. Nenhuma migration, RLS, autenticação ou remoção de código foi executada como parte deste documento.

Ver também: [ERD.md](./ERD.md) · [AUTHORIZATION.md](./AUTHORIZATION.md) · [ROUTES.md](./ROUTES.md) · [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) · [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) · [OPERATIONS.md](./OPERATIONS.md) · [ROADMAP.md](./ROADMAP.md) · [adr/](./adr/)

---

## 1. Objetivos arquiteturais

A V2 deve tornar-se uma plataforma financeira sustentável para o CAMTIL, capaz de funcionar **sem depender permanentemente do programador original**. Quatro domínios:

| Domínio | Para quem | Capacidades |
|---|---|---|
| **A. Operação de Campo** | Adjuntos | orçamento, despesas, faturas, devoluções, saldo, execução |
| **B. Tesouraria** | Tesoureiros | visão cross-campo, comparações, orçamento vs. real, relatórios, preços, fornecedores |
| **C. Inteligência Financeira** | Tesouraria + Direção | histórico de preços, produtos, fornecedores, previsões, motor de orçamento, backtesting |
| **D. Administração** | Admin | utilizadores, permissões, anos, campos, locais, categorias, parâmetros — sem código |

## 2. Princípios

1. **Segurança real** — nunca confiar na UI para autorização; a autorização vive na BD (RLS) e é reforçada no servidor.
2. **Least privilege** — cada utilizador só vê o que precisa; nada de "acesso total por omissão" como hoje.
3. **Auditabilidade** — uma alteração financeira relevante tem de poder ser explicada depois: quem, quando, o quê, porquê.
4. **Histórico imutável** — nunca sobrescrever informação histórica; versionar em vez de substituir.
5. **Configuração > hardcode** — regras que mudam entre anos (valores de referência, escalões, categorias) vivem na BD/admin, não espalhadas pelo código.
6. **Human-in-the-loop** — IA sugere e extrai; nunca altera dados contabilísticos sem confirmação humana.
7. **Explicabilidade** — um orçamento previsto tem de poder mostrar de onde veio cada valor.
8. **Portabilidade** — evitar processos manuais secretos ou dependência de uma pessoa específica; tudo documentado em [OPERATIONS.md](./OPERATIONS.md).

Estes princípios derivam diretamente dos achados **CRITICAL/HIGH** da auditoria técnica (RLS aberto, sem autenticação, PIN cosmético, escrita sem validação de servidor) — a V2 é, em boa parte, a correção estrutural desses achados.

---

## 3. Personas e roles

| Persona | Âmbito | Acesso |
|---|---|---|
| **Adjunto** | Só os campos aos quais está associado (`field_memberships`) | Ler/escrever despesas, devoluções, faturas, orçamento do(s) seu(s) campo(s) |
| **Tesoureiro** | Transversal a todos os campos | Ler tudo; escrever aprovações de orçamento, reconciliações, normalização de produtos/fornecedores; não edita despesas de outros campos diretamente (ver §5) |
| **Admin** | Plataforma | Utilizadores, memberships, campos, locais, categorias, parâmetros, versões de modelo |
| **Direção (read-only)** | Transversal, só leitura | Relatórios e dashboards, sem qualquer capacidade de escrita — faz sentido como role própria porque hoje não existe nenhuma forma de dar visibilidade sem dar também capacidade de edição |

Um utilizador pode acumular roles (ex.: Tesoureiro que também é Adjunto de um campo específico esse ano) — o modelo de autorização tem de suportar isso desde o início (ver [AUTHORIZATION.md](./AUTHORIZATION.md)).

## 4. Authentication — resumo

Ver [AUTHORIZATION.md §Authentication](./AUTHORIZATION.md#authentication-design) para a comparação completa de opções e a recomendação fundamentada (Magic Link como método principal, com PIN/OTP como plano B operacional para adjuntos sem hábito de email). **Gate A** decide isto — ver §19.

## 5. Authorization / RLS — resumo

Ver [AUTHORIZATION.md](./AUTHORIZATION.md) para o modelo completo (`profiles` / `field_memberships` / policies conceptuais por tabela/operação) e o papel de Server Components, Server Actions, Route Handlers, Supabase Client e `service_role`. Regra inegociável: **a `service_role` nunca chega ao browser.**

## 6–9. Modelo de dados

Ver [ERD.md](./ERD.md) para o desenho completo: entidades, campo como entidade histórica (§7 do pedido), modelo de orçamento versionado (§8), e o modelo canónico de produtos/fornecedores/preços que substitui as três tabelas sobrepostas de hoje (§9).

---

## 10. Arquitetura de IA para faturas

Não escolhemos fornecedor/modelo nesta fase. Desenhamos a **interface abstrata** para que trocar OpenAI/Anthropic/Google/outro nunca implique reescrever o módulo financeiro.

```
foto (capturada/carregada)
  → upload para Storage (server-side, autenticado)
  → invoice_documents (linha criada: status='uploaded')
  → processamento server-side (Route Handler / background job)
      → chama o "extractor" ativo através de uma interface comum:
            extractInvoice(imageUrl) → { merchant, date, total, nif, lines[], confidence, raw }
      → grava em invoice_extractions:
            extractor_version, model_used, confidence, raw_response,
            extracted_fields, duration_ms, cost_usd, status, error
  → validações automáticas (total = soma das linhas ± tolerância; NIF válido;
    data plausível; deteção de duplicados por hash da imagem + total + data)
  → revisão humana (UI equivalente ao OcrResultCard.tsx de hoje — mantém-se)
  → confirmação → persistência em expenses / expense_lines
```

**Contrato da interface** (não implementar agora, só o desenho):

```ts
interface InvoiceExtractor {
  readonly id: string          // 'tesseract-v1' | 'gpt-4o-vision' | 'claude-vision' | ...
  readonly version: string
  extract(input: { imageUrl: string }): Promise<{
    merchant: string | null
    date: string | null
    total: number | null
    nif: string | null
    lines: Array<{ description: string; quantity: number | null; unit: string | null; unitPrice: number | null; totalPrice: number | null }>
    confidence: 'alta' | 'media' | 'baixa'
    rawResponse: unknown
    durationMs: number
    costUsd: number | null
  }>
}
```

Cada extrator regista-se com um `id`+`version` próprios; `invoice_extractions.extractor_version` fica gravado por linha, para nunca perder a proveniência mesmo depois de trocar de motor. **Retry e fallback**: se o extrator ativo falhar (erro, timeout, resposta malformada), cair para um extrator secundário configurado em admin (ex.: Tesseract local como fallback de um modelo multimodal pago) ou, no limite, para preenchimento manual — nunca bloquear o registo da despesa. **Deteção de duplicados**: hash SHA-256 da imagem + (merchant, total, date) aproximado, avisando o utilizador antes de gravar uma segunda vez a mesma fatura.

Isto reaproveita diretamente os achados da Secção 8 da auditoria: o modelo de dados, a UI de validação e o pipeline de captura/storage já estão desenhados para tratar tudo como sugestão — só a chamada ao motor (hoje `useOcr.ts`) e o parsing (`ocr-parser.ts`) são substituídos, e passam a correr no servidor.

---

## 11. Arquitetura do motor de orçamento

Não construir ainda. Separar claramente em camadas independentes:

```
Dados históricos          → expenses, expense_lines, price_observations, camps (fechados)
Feature generation        → função pura: camp params → vetor de features
                             (participantes, duração, localização, distância a
                             casa de apoio/centro urbano, escalão, época,
                             ordem no verão, histórico do local, preços recentes)
Budget engine              → função pura: features + budget_model_version → previsão
Model / version             → budget_models, budget_model_versions (parâmetros/pesos
                             versionados, nunca sobrescritos)
Prediction                  → budget_predictions — entidade própria, nunca escreve
                             em budgets/expenses
Explanation                  → cada predição grava que fatores pesaram e quanto
                             (obrigatório pelo princípio de Explicabilidade)
Backtesting                  → corre o motor sobre camps já fechados e compara
                             prediction vs. budget aprovado vs. despesa real
```

**Regra inegociável:** o motor de orçamento nunca escreve nem apaga despesas reais. Uma previsão é sempre um registo novo e imutável em `budget_predictions`, nunca uma alteração a `budgets`/`expenses`. **Gate F** (§19) decide a metodologia (regras/heurísticas vs. modelo estatístico vs. ML) — está deliberadamente em aberto nesta fase.

---

## 12. Audit Log

Tabela `audit_log` (ver [ERD.md](./ERD.md#audit_log)) grava eventos como:

```
expense.created / expense.updated / expense.deleted
budget.created / budget.approved
user.role_changed
camp.closed
invoice.extraction_confirmed
product.merged / supplier.merged
```

Cada evento: `actor_id`, `timestamp`, `entity_type` + `entity_id`, `before`/`after` (JSONB, quando aplicável), `reason` (texto livre opcional), `metadata` (JSONB livre). Escrita feita **sempre no servidor** (nunca confiada ao cliente) — ou por trigger de BD nas tabelas mais sensíveis (`expenses`, `budgets`), ou explicitamente dentro de cada Server Action, a decidir em implementação (ADR-009 mantém-se `PROPOSED` quanto a este detalhe).

## 13. Administração autónoma — o que passa a ser configuração

| Hoje (hardcoded) | Passa a viver em | Porquê |
|---|---|---|
| `VALORES_REF_VERAO` (`lib/adjuntos/valores-referencia.ts`) | `valores_referencia` (tabela já existe, subutilizada) | Muda todos os anos, é o exemplo mais claro do problema atual |
| `CODE_CATEGORIES` (códigos de despesa) | tabela `expense_codes` | Categorias podem mudar/ser renomeadas entre anos sem deploy |
| Lista de retalhistas do parser OCR | não aplicável — obsoleto com IA multimodal (§10) | — |
| Escalões, PREFIXES de campo | tabela `escaloes` (ou reaproveitar `camp_slots`, ver ERD) | Necessário para o motor de orçamento distinguir por escalão |
| `campos-seed.ts` (criação manual de campos por ficheiro) | UI de admin sobre `camps`/`camp_slots` | É literalmente o que `/admin` já faz para `locais`/`valores_referencia` — falta para campos |
| Utilizadores/PINs | `profiles` + `field_memberships` via `/admin` | Pré-requisito da Fase 2 |
| Versões do motor de orçamento | `budget_models`/`budget_model_versions` via `/admin` (fase tardia) | Só depois do motor existir |

**Fronteira deliberada — o que NÃO se transforma em configuração:**
- Fórmulas de cálculo (saldo disponível, desvio orçamental) — ficam em código, testadas (ver [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)); tornar isto configurável introduz risco financeiro sem benefício real.
- A estrutura das tabelas em si (schema) — muda por migration, não por admin.
- O modelo de permissões (roles fixos: Adjunto/Tesoureiro/Admin/Direção) — adicionar roles novos é uma decisão arquitetural, não um formulário de admin.

---

## 19. HUMAN DECISION GATES

Estas são as decisões que **não devem ser tomadas automaticamente**. Cada uma bloqueia trabalho de implementação a jusante até ter resposta humana — ver [ROADMAP.md](./ROADMAP.md) para onde cada gate se encaixa.

### Gate A — Auth / Roles
**Decisão:** método de autenticação e modelo de roles inicial.
**Opções:** Magic Link · Email+Password · OTP por SMS · combinação.
**Recomendação:** Magic Link como principal (ver [AUTHORIZATION.md](./AUTHORIZATION.md)), com plano B para adjuntos sem email de confiança.
**Consequências:** define todo o Gate B para a frente — nada de RLS real avança sem isto.
**Perguntas para José/Tesouraria:** Os adjuntos têm todos email pessoal fiável? Há apetite para gerir uma lista de utilizadores manualmente no primeiro ano, ou precisa de self-service já na V2?

### Gate B — Modelo financeiro e orçamento
**Decisão:** estados do ciclo de vida do orçamento (`draft/proposed/approved/closed`) e quem aprova.
**Opções:** aprovação só por Tesoureiro · aprovação por Direção · sem aprovação formal (orçamento é só um valor de referência).
**Recomendação:** aprovação por Tesoureiro, com Direção a poder ver mas não aprovar — mantém o fluxo leve.
**Consequências:** afeta o desenho de `budgets`/`budget_lines` e a UI de Tesouraria.
**Perguntas:** Existe hoje um processo formal de aprovação de orçamento por campo, ou é sempre um valor de referência fixo por escalão?

### Gate C — Dashboard / métricas de Tesouraria
**Decisão:** que métricas e comparações são realmente prioritárias no primeiro lançamento.
**Opções:** ver a lista completa pedida (comparar campos, orçamento vs. gasto, desvios, custo/categoria, custo/participante, custo/dia, gráficos, filtros, comparação entre anos, exportação para Assembleia) — construir tudo de uma vez vs. faseado.
**Recomendação:** começar por orçamento vs. gasto + desvio por categoria + exportação para Assembleia (são os que já têm dados fiáveis, ver auditoria Secção 9); custo por participante/produto ficam para depois de resolver a cobertura de `expense_lines`.
**Perguntas:** Qual relatório é usado today na Assembleia? Em que formato tem de sair?

### Gate D — Estratégia IA / fornecedor / privacidade / custo
**Decisão:** que modelo multimodal usar para OCR de faturas, e como equilibrar custo vs. qualidade.
**Opções:** OpenAI · Anthropic · Google · manter Tesseract melhorado como baseline gratuita.
**Recomendação:** nenhuma nesta fase — depende de orçamento disponível e de um piloto com faturas reais de 2026 (o backup da Fase 0.5 serve exatamente para este teste, sem tocar em produção).
**Perguntas:** Há orçamento recorrente para chamadas de API por fatura? Fotos de faturas (com NIF) podem ser enviadas para um fornecedor de IA externo, ou há uma restrição de privacidade a impor primeiro?

### Gate E — Normalização de produtos
**Decisão:** quem e como decide que "Leite Mimosa 1L" e "Leite mimosa 1lt" são o mesmo produto.
**Opções:** automático por IA/similaridade de texto · manual por Tesoureiro · híbrido (IA sugere, humano confirma).
**Recomendação:** híbrido — é a mesma filosofia human-in-the-loop já usada no OCR.
**Perguntas:** Quem, na Tesouraria, teria tempo/vontade de fazer esta curadoria continuamente?

### Gate F — Metodologia do motor de orçamento
**Decisão:** regras/heurísticas explícitas vs. modelo estatístico vs. machine learning.
**Opções:** ver acima.
**Recomendação:** começar por regras/heurísticas explicáveis (ex.: média histórica ajustada por participantes e escalão) — só evoluir para ML se o backtesting mostrar que compensa; com um único ano de dados completos (2026), ML teria alto risco de sobreajuste.
**Perguntas:** Que grau de "confiar num número que o sistema calculou sozinho" a Tesouraria está confortável em aceitar no primeiro ano?

### Gate G — Autonomia administrativa
**Decisão:** até onde vai o `/admin` sem depender do programador (ver §13).
**Opções:** ver tabela de fronteiras acima.
**Recomendação:** a fronteira proposta em §13.
**Perguntas:** Quem, na equipa, vai efetivamente usar o `/admin` no dia a dia — um Tesoureiro só, ou vários?

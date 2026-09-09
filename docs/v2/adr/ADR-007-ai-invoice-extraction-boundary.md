# ADR-007 — AI invoice extraction boundary

**Status:** PROPOSED (depende do Gate D — ver [ARCHITECTURE.md §19](../ARCHITECTURE.md#19-human-decision-gates))

## Context
O pipeline atual (Tesseract.js + regex, 100% client-side — auditoria, Secção 8) tem um modelo de dados e uma UI de validação reutilizáveis, mas o motor em si é frágil e está tecnicamente acoplado ao Tesseract (`useOcr.ts`, `ocr-parser.ts`). Não escolhemos ainda o fornecedor de IA multimodal — essa é uma decisão de custo/privacidade, não de arquitetura.

## Options considered
1. **Interface `InvoiceExtractor` abstrata, implementações plugáveis** (proposto) — ver [ARCHITECTURE.md §10](../ARCHITECTURE.md#10-arquitetura-de-ia-para-faturas).
2. **Acoplar diretamente a um fornecedor específico** — descartado: contraria o pedido explícito de poder trocar OpenAI/Anthropic/Google/etc. sem reescrever o módulo financeiro.
3. **Extração 100% no cliente, como hoje** — descartado: qualquer modelo multimodal pago exige uma chave de API que não pode ir ao browser (ver ADR-003).

## Proposed decision
Extração corre sempre no servidor, atrás da interface `InvoiceExtractor`; cada tentativa fica registada em `invoice_extractions` com `extractor_id`+`version`, `confidence`, `raw_response`, custo e duração; nunca escreve diretamente em `expenses`/`expense_lines` sem confirmação humana.

## Benefits
- Trocar de fornecedor é trocar uma implementação da interface, não reescrever o fluxo.
- Custo e duração ficam registados por chamada — dado necessário para decidir o Gate D com informação real, não estimativas.
- Fallback e retry ficam desenhados desde o início (motor secundário configurável), não um remendo tardio.

## Costs
- Mais uma camada de abstração antes de sequer ter um fornecedor escolhido — algum esforço "especulativo", mitigado por manter a interface pequena e sem tentar prever necessidades que ainda não existem.

## Risks
- Sem decisão do Gate D, este ADR não avança para implementação — está corretamente `PROPOSED`, não bloqueia o resto da Fase 1.

## Open questions
- Há orçamento recorrente para chamadas de API por fatura? (Gate D)
- Fotos de faturas com NIF podem ser enviadas para um fornecedor externo, ou há uma restrição de privacidade a impor primeiro (ex. mascarar NIF antes de enviar)? (Gate D)

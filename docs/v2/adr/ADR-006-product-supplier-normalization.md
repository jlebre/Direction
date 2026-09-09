# ADR-006 — Product/supplier normalization

**Status:** PROPOSED (depende do Gate E — ver [ARCHITECTURE.md §19](../ARCHITECTURE.md#19-human-decision-gates))

## Context
Hoje existem três tabelas de "preço" sobrepostas (`campo_precos`, `precos`, `valores_referencia`) e nenhuma tabela de fornecedores — só texto livre (`despesas.ocr_fornecedor`, `campo_precos.fornecedor`). A auditoria classifica isto como bloqueador direto do objetivo de histórico de preços estruturado.

## Options considered
1. **`products`/`suppliers`/`price_observations` canónicos, com `product_aliases` para variantes de texto** (proposto).
2. **Deduplicação automática só por similaridade de texto (fuzzy matching), sem revisão humana** — descartado: risco de fundir por engano dois produtos diferentes ("Leite Mimosa 1L" vs. "Leite Mimosa Meio-Gordo 1L"), sem forma fácil de reverter no dia a dia.
3. **Sem normalização — manter texto livre indefinidamente** — descartado: é exactamente o estado atual que impede a pergunta "a que preços comprou este produto ao longo do tempo".

## Proposed decision
Modelo canónico `products`/`suppliers`/`product_aliases`/`price_observations` (ver [ERD.md](../ERD.md)), com fusão de aliases **híbrida**: sugestão automática (por similaridade de texto ou, mais tarde, por IA) sempre confirmada por um humano (`tesoureiro`/`admin`) antes de ser aplicada — nunca automática e silenciosa, seguindo o princípio Human-in-the-loop.

## Benefits
- Histórico de preços por produto real, não por string de texto livre.
- `product.merged`/`supplier.merged` ficam em `audit_log` — uma fusão errada é sempre reversível de forma rastreável.

## Costs
- Trabalho de curadoria contínuo (alguém tem de rever e confirmar as sugestões de fusão).

## Risks
- Sem uma pessoa dedicada a esta curadoria, `products`/`suppliers` degradam-se para o mesmo problema de texto livre disperso que existe hoje — mitigação depende diretamente da resposta ao Gate E.

## Open questions
- Quem, na Tesouraria, teria tempo/vontade de fazer esta curadoria continuamente? (pergunta do Gate E — sem resposta, este ADR fica bloqueado antes de ir para implementação)

-- seed_escalao_fatores.sql
-- Fatores de quantidade por escalão × tipo de produto.
-- Requer migration 012 já aplicada.
-- Base de comparação: melgas = 1.00 para todos os tipos.
-- Idempotente via ON CONFLICT DO UPDATE (permite ajuste futuro).
--
-- Tipos de produto:
--   massa    → massa, esparguete, fusilli, penne, couscous
--   arroz    → arroz (qualquer variedade)
--   carne    → frango, porco, vaca, chouriço, fiambre, bacon, etc.
--   atum     → atum em lata, sardinha (peixe enlatado proteico)
--   pao      → pão, pão-de-forma, cachorros
--   sopa     → caldo, cubo caldo — ingredientes de base de sopa
--   bolachas → bolachas maria, filipinos, biscoitos
--   outro    → tudo o resto (legumes, lacticínios, temperos, etc.)
--
-- escalao usa os valores do enum seccao_tipo:
--   'mosquitos', 'aranhicos', 'melgas', 'tremelgas', 'camaleoes'
--   + 'animadores' (fora do enum, para uso futuro / planeamento)

INSERT INTO escalao_fatores_quantidade
  (escalao, tipo_produto, fator, quantidade_referencia, unidade_referencia, notas)
VALUES
  -- MOSQUITOS (base = Melgas)
  ('mosquitos','massa',    0.40, 3.0, 'kg',     'Mosquitos comem muito menos massa que Melgas'),
  ('mosquitos','arroz',    0.36, 2.5, 'kg',     NULL),
  ('mosquitos','carne',    0.70, 4.0, 'kg',     NULL),
  ('mosquitos','atum',     0.31, 2.0, 'kg',     NULL),
  ('mosquitos','pao',      0.77, 100, 'un',     '100 pãezinhos para ~58 pax'),
  ('mosquitos','sopa',     0.70, 8.0, 'L',      NULL),
  ('mosquitos','bolachas', 0.65, 26,  'pacote', '~26 pacotes 800g para o campo todo'),
  ('mosquitos','outro',    1.00, NULL, NULL,    'Fallback — mesmo que Melgas'),

  -- ARANHIÇOS
  ('aranhicos','massa',    0.55, 3.5, 'kg',     NULL),
  ('aranhicos','arroz',    0.52, 3.0, 'kg',     NULL),
  ('aranhicos','carne',    1.00, 5.0, 'kg',     'Carne igual a Melgas'),
  ('aranhicos','atum',     1.00, 4.0, 'kg',     NULL),
  ('aranhicos','pao',      0.77, 100, 'un',     NULL),
  ('aranhicos','sopa',     0.70, 8.0, 'L',      NULL),
  ('aranhicos','bolachas', 0.65, 26,  'pacote', NULL),
  ('aranhicos','outro',    1.00, NULL, NULL,    NULL),

  -- MELGAS (referência base = 1.00)
  ('melgas','massa',    1.00, 5.0, 'kg',     'Referência base para todos os cálculos'),
  ('melgas','arroz',    1.00, 4.5, 'kg',     NULL),
  ('melgas','carne',    1.00, 5.0, 'kg',     NULL),
  ('melgas','atum',     1.00, 4.0, 'kg',     NULL),
  ('melgas','pao',      1.00, 120, 'un',     '120 pãezinhos para ~58 pax'),
  ('melgas','sopa',     1.00, 10, 'L',       NULL),
  ('melgas','bolachas', 1.00, 40,  'pacote', '40 pacotes para o campo todo (~10 dias)'),
  ('melgas','outro',    1.00, NULL, NULL,    NULL),

  -- TREMELGAS
  ('tremelgas','massa',    1.30, 6.0, 'kg', NULL),
  ('tremelgas','arroz',    1.16, 5.0, 'kg', NULL),
  ('tremelgas','carne',    1.30, 6.0, 'kg', NULL),
  ('tremelgas','atum',     1.00, 4.0, 'kg', NULL),
  ('tremelgas','pao',      1.00, 120, 'un', NULL),
  ('tremelgas','sopa',     1.30, 12,  'L',  NULL),
  ('tremelgas','bolachas', 1.00, 40,  'pacote', NULL),
  ('tremelgas','outro',    1.00, NULL, NULL, NULL),

  -- CAMALEÕES (mesmo que Tremelgas)
  ('camaleoes','massa',    1.30, 6.0, 'kg', 'Igual a Tremelgas'),
  ('camaleoes','arroz',    1.16, 5.0, 'kg', NULL),
  ('camaleoes','carne',    1.30, 6.0, 'kg', NULL),
  ('camaleoes','atum',     1.00, 4.0, 'kg', NULL),
  ('camaleoes','pao',      1.00, 120, 'un', NULL),
  ('camaleoes','sopa',     1.30, 12,  'L',  NULL),
  ('camaleoes','bolachas', 1.00, 40,  'pacote', NULL),
  ('camaleoes','outro',    1.00, NULL, NULL, NULL),

  -- ANIMADORES (mesmo que Tremelgas — fora do enum seccao_tipo mas útil para planeamento)
  ('animadores','massa',    1.30, NULL, 'kg', NULL),
  ('animadores','arroz',    1.16, NULL, 'kg', NULL),
  ('animadores','carne',    1.30, NULL, 'kg', NULL),
  ('animadores','atum',     1.00, NULL, 'kg', NULL),
  ('animadores','pao',      1.00, NULL, 'un', NULL),
  ('animadores','sopa',     1.30, NULL, 'L',  NULL),
  ('animadores','bolachas', 1.00, NULL, 'pacote', NULL),
  ('animadores','outro',    1.00, NULL, NULL, NULL)

ON CONFLICT (escalao, tipo_produto)
DO UPDATE SET
  fator                 = EXCLUDED.fator,
  quantidade_referencia = EXCLUDED.quantidade_referencia,
  unidade_referencia    = EXCLUDED.unidade_referencia,
  notas                 = EXCLUDED.notas,
  updated_at            = now();


-- ── Mapear ingredientes existentes para tipo_produto ──────────────────────────
-- Idempotente: só actualiza se ainda estiver em 'outro' (default).
-- Ordem importa: do mais específico para o mais geral.

-- MASSA (pasta, esparguete, couscous)
UPDATE ingredientes SET tipo_produto = 'massa'
WHERE tipo_produto = 'outro' AND (
  nome ILIKE '%massa%' OR nome ILIKE '%esparguete%' OR nome ILIKE '%penne%'
  OR nome ILIKE '%fusilli%' OR nome ILIKE '%macarr%' OR nome ILIKE '%couscous%'
  OR nome ILIKE '%lasanha%' OR nome ILIKE '%farfalle%' OR nome ILIKE '%tagliatelle%'
  OR nome ILIKE '%espirais%' OR nome ILIKE '%massa para canja%'
);

-- ARROZ
UPDATE ingredientes SET tipo_produto = 'arroz'
WHERE tipo_produto = 'outro' AND (
  nome ILIKE 'arroz%' OR nome ILIKE '%arroz %' OR nome ILIKE '% arroz'
  OR nome ILIKE '%esparguete de arroz%'
);

-- CARNE (frango, porco, vaca, aves, embutidos)
UPDATE ingredientes SET tipo_produto = 'carne'
WHERE tipo_produto = 'outro' AND (
  nome ILIKE '%frango%' OR nome ILIKE '%carne%' OR nome ILIKE '%bife%'
  OR nome ILIKE '%bifes%' OR nome ILIKE '%peru%' OR nome ILIKE '%porco%'
  OR nome ILIKE '%vaca%' OR nome ILIKE '%chouriço%' OR nome ILIKE '%linguiça%'
  OR nome ILIKE '%farinheira%' OR nome ILIKE '%morcela%' OR nome ILIKE '%fiambre%'
  OR nome ILIKE '%presunto%' OR nome ILIKE '%bacon%' OR nome ILIKE '%salsicha%'
  OR nome ILIKE '%entrecosto%' OR nome ILIKE '%rojão%' OR nome ILIKE '%rojoes%'
  OR nome ILIKE '%cordeiro%' OR nome ILIKE '%borrego%' OR nome ILIKE '%hambúrguer%'
  OR nome ILIKE '%hamburger%'
);

-- ATUM (peixe enlatado proteico)
UPDATE ingredientes SET tipo_produto = 'atum'
WHERE tipo_produto = 'outro' AND (
  nome ILIKE '%atum%' OR nome ILIKE '%sardinha%' OR nome ILIKE '%cavala%'
);

-- PÃO
UPDATE ingredientes SET tipo_produto = 'pao'
WHERE tipo_produto = 'outro' AND (
  nome ILIKE 'pão%' OR nome ILIKE 'pao%'
  OR nome ILIKE '%pão-de-forma%' OR nome ILIKE '%pao de forma%'
  OR nome ILIKE '%pão de cachorro%' OR nome ILIKE '%cachorro%'
  OR nome ILIKE '%pão bimbo%'
);

-- SOPA (caldos, bases de sopa)
UPDATE ingredientes SET tipo_produto = 'sopa'
WHERE tipo_produto = 'outro' AND (
  nome ILIKE '%caldo%' OR nome ILIKE '%knorr%'
  OR (nome ILIKE '%sopa%' AND nome NOT ILIKE '%massa para canja%')
);

-- BOLACHAS (biscoitos, bolachas)
UPDATE ingredientes SET tipo_produto = 'bolachas'
WHERE tipo_produto = 'outro' AND (
  nome ILIKE '%bolacha%' OR nome ILIKE '%biscoito%' OR nome ILIKE '%filipinos%'
  OR nome ILIKE '%oreo%' OR nome ILIKE '%tostada%' OR nome ILIKE '%palmier%'
);

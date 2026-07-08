-- seed_pa_bolachas_default.sql
-- Receitas base para Pequeno-almoço e Lanche (Bolachas).
-- Requer migration 012 já aplicada (coluna tipo_produto em ingredientes).
-- Idempotente via índice único receitas_nome_is_oficial_idx.
--
-- Quantidades para 58 pessoas (escalão Melgas — base).
-- O sistema de fatores em escalao_fatores_quantidade ajusta para cada escalão
-- ao gerar a lista de compras.

CREATE UNIQUE INDEX IF NOT EXISTS receitas_nome_is_oficial_idx
  ON receitas(nome) WHERE is_oficial = true;

DO $$
DECLARE
  r_id UUID;
  i_id UUID;
BEGIN

-- ============================================================
-- 1. PEQUENO-ALMOÇO (PA)
-- ============================================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Pequeno-almoço', 'pequeno_almoco',
  'Pequeno-almoço completo de campo: pão fresco, manteiga, marmelada, leite com chocolate e chá.',
  E'1. Ir buscar o pão cedo (antes das 9h).\n'
  '2. Aquecer ~10 L de leite num tacho grande.\n'
  '3. Dissolver o chocolate em pó no leite quente.\n'
  '4. Separar 2-4 L de leite frio para quem preferir.\n'
  '5. Dispor manteiga, marmelada e pão na mesa.\n'
  '6. Preparar chá (tília ou camomila) para quem quiser.\n'
  '7. Fazer café nas cafeteiras — 1 pacote a cada 2 dias.',
  'Ir buscar o pão mesmo cedo! O café fica num termo para não arrefecer. '
  'Não esquecer o leite frio para quem não gosta de leite quente.',
  58, true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;
IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Pequeno-almoço' AND is_oficial = true;
END IF;

-- Ingredientes do PA (quantidade_aranh_melgas = base para 58 pax Melgas)
INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Pão fresco', 'padaria', 'un', 'despensa', 'pao') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Pão fresco';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 96, 125, 125, 'un', '120-130 pãezinhos') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Manteiga', 'lacticinios', 'un', 'fresco_diario', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Manteiga';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 1.5, 2, 2, 'pacote 250g', '1,5 a 2 pacotes de 250g') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Marmelada', 'mercearia', 'un', 'despensa', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Marmelada';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 1.5, 2, 2, 'frasco 900g', '1,5 a 2 frascos') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Leite', 'lacticinios', 'L', 'despensa', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Leite';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 10, 12, 14, 'L', '10-12 L quente + 2-4 L frio') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Chocolate em pó', 'mercearia', 'un', 'despensa', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Chocolate em pó';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 0.5, 1, 1, 'pacote 125g', 'Nesquik ou similar') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Chá (saquetas)', 'mercearia', 'un', 'despensa', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Chá (saquetas)';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 4, 4, 6, 'un', 'Opcional — tília ou camomila, 4 saquetas para 9 L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Café moído', 'mercearia', 'un', 'despensa', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Café moído';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 0.5, 0.5, 0.5, 'pacote 250g', '1 pacote a cada 2 dias — para animadores') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Açúcar', 'mercearia', 'kg', 'despensa', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Açúcar';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 1, 1, 1, 'kg', NULL) ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================================
-- 2. LANCHE — BOLACHAS
-- ============================================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Bolachas', 'lanche',
  'Lanche de campo: bolachas Maria com sumo ou água. Simples e prático.',
  E'1. Distribuir 1 pacote de bolachas Maria por equipa de 4 animados.\n'
  '2. Adicionar fruta (sobras do almoço) se houver.\n'
  '3. Preparar sumo concentrado diluído ou água.',
  '2 pacotes por equipa é a regra base. Ter sempre 2-4 pacotes de reserva. '
  'Aproveitar fruta do almoço para o lanche.',
  58, true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;
IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Bolachas' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Bolacha Maria', 'mercearia', 'pacote', 'despensa', 'bolachas') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Bolacha Maria';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 9, 14, 14, 'pacote 800g', '~2 pacotes por equipa de 4; 9 pac Mosq, 14 pac Melgas+') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento, tipo_produto)
VALUES ('Sumo concentrado', 'mercearia', 'L', 'despensa', 'outro') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Sumo concentrado';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 2, 3, 3, 'L', 'Diluir 1:5 com água') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

END $$;

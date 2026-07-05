-- ============================================
-- seed_receitas_2026.sql — 11 Receitas Oficiais CAMTIL 2026
-- Corre no Supabase SQL Editor.
-- Idempotente: ingredientes com ON CONFLICT (nome) DO NOTHING.
-- Receitas inseridas apenas se não existirem (ON CONFLICT DO NOTHING).
-- ============================================

-- Unique index para receitas (idempotência)
CREATE UNIQUE INDEX IF NOT EXISTS receitas_nome_is_oficial_idx ON receitas(nome) WHERE is_oficial = true;

DO $$
DECLARE
  r_id UUID;
  i_id UUID;
BEGIN

-- ============================================
-- 1. PAD THAI
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Pad Thai',
  'outro',
  'Esparguete de arroz salteado com frango, ovo e legumes em molho de soja. Surpreende sempre!',
  E'1. Demolha o esparguete de arroz em água fria 30 min.\n2. Corta o frango em tiras, salteía com alho e azeite.\n3. Junta a cenoura e o alho-francês em juliana.\n4. Junta o esparguete escorrido e o molho de soja.\n5. Faz espaço na frigideira, mexe o ovo batido e incorpora.\n6. Serve com amendoim picado por cima.',
  'O esparguete de arroz coze quase instantaneamente — cuidado para não passar. Num campo grande usa 2 ou 3 panelas grandes em simultâneo.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Pad Thai' AND is_oficial = true;
END IF;

-- Ingredientes Pad Thai
INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Esparguete de arroz', 'massas_arroz', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Esparguete de arroz';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 4.5, 4.5, 4.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Peito de frango', 'talho', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Peito de frango';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 8, 7, 9, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Ovo', 'lacticinios', 'un', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Ovo';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 60, 55, 65, 'un') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Alho-francês', 'frutas_legumes', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Alho-francês';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 3, 3, 3, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Cenoura', 'frutas_legumes', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cenoura';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Molho de soja', 'temperos', 'L', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Molho de soja';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.5, 0.5, 0.5, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Azeite', 'temperos', 'L', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Azeite';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.3, 0.3, 0.3, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Amendoim', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Amendoim';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.5, 0.5, 0.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 2. COUSCOUS COM LEGUMES
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Couscous com Legumes',
  'outro',
  'Couscous leve com legumes salteados, grão e especiarias. Rápido, nutritivo e diferente.',
  E'1. Ferve água com sal e azeite (1.5x o volume de couscous).\n2. Apaga o lume, deita o couscous, tapa e espera 5 min.\n3. Salteía cebola, pimento, cenoura e curgete com azeite.\n4. Junta o tomate e o grão escorrido, tempera.\n5. Mistura os legumes no couscous, solta com um garfo.\n6. Serve quente ou morno.',
  'Couscous é imbatível em campos sem forno — só precisa de água a ferver. Faz os legumes numa frigideira grande ou caldeirão. Podes fazer a 2 tempos: legumes no dia, couscous 10 min antes de servir.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Couscous com Legumes' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Couscous', 'massas_arroz', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Couscous';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 4.5, 4, 5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Grão de bico (lata)', 'enlatados', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Grão de bico (lata)';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.5, 1.5, 1.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Curgete', 'frutas_legumes', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Curgete';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Pimento', 'frutas_legumes', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Pimento';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Cebola', 'frutas_legumes', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cebola';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.5, 1.5, 1.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Passata de tomate', 'enlatados', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Passata de tomate';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1, 1, 1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cenoura';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Azeite';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.3, 0.3, 0.3, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 3. OVOS ROTOS
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Ovos Rotos',
  'outro',
  'Batatas fritas em azeite, com fiambre e ovo estrelado por cima. Clássico espanhol que conquista toda a gente.',
  E'1. Descasca e corta as batatas em palitos grossos.\n2. Frita em óleo abundante até dourar, escorre bem.\n3. Numa frigideira salteía o fiambre em tiras.\n4. Estrela os ovos (ou mexe-os levemente).\n5. Serve as batatas numa travessa, cobre com fiambre e ovos.\n6. Rompe os ovos na mesa — daí o nome!',
  'Num campo grande, usa a fritadeira industrial se houver. Se não, divide em grupos e faz em caldeirões com óleo. As batatas podem ser congeladas pré-fritas — corta tempo e facilita. Faz contas de 2 ovos por pessoa.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Ovos Rotos' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Batata', 'frutas_legumes', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Batata';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 10, 9, 11, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Ovo';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 120, 110, 130, 'un') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Fiambre', 'charcutaria', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Fiambre';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 3, 2.5, 3.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Óleo vegetal', 'temperos', 'L', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Óleo vegetal';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Sal', 'temperos', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Sal';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.1, 0.1, 0.1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 4. MASSA PESTO COM FRANGO
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Massa Pesto com Frango',
  'massa',
  'Esparguete al dente com molho pesto de frasco e frango grelhado em tiras. Rápido e adorado por todos.',
  E'1. Coze a massa em água abundante com sal — al dente.\n2. Grelha ou salteía o peito de frango em tiras com azeite e alho.\n3. Escorre a massa, reserva 1 chávena da água de cozedura.\n4. Mistura o pesto com a massa, junta um pouco da água para soltar.\n5. Incorpora o frango, finaliza com parmesão ralado.\n6. Serve imediatamente.',
  'O pesto de frasco funciona muito bem — compra o da Barilla ou similar. A massa "agarra" melhor se misturares com o pesto ainda quente. O parmesão é opcional mas transforma a receita.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Massa Pesto com Frango' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Esparguete', 'massas_arroz', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Esparguete';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 5, 4.5, 5.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Peito de frango';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 9, 8, 10, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Molho pesto', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Molho pesto';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.2, 1, 1.4, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Queijo parmesão', 'lacticinios', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Queijo parmesão';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.8, 0.6, 0.8, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Alho', 'frutas_legumes', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Alho';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.1, 0.1, 0.1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Azeite';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.3, 0.3, 0.3, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 5. MASSA PIZZA
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Massa Pizza',
  'massa',
  'Esparguete com molho de tomate, fiambre, cogumelos e queijo derretido. O "prato favorito" garantido.',
  E'1. Coze a massa em água com sal — al dente.\n2. Prepara o molho: refoga cebola e alho, junta o tomate, tempera com orégãos.\n3. Escorre a massa, mistura com o molho.\n4. Junta o fiambre em tirinhas e os cogumelos.\n5. Por cima, deita o queijo ralado generosamente.\n6. Leva ao forno 10 min a 200°C ou cobre e deixa derreter no vapor.',
  'Se não tiveres forno, cobre a travessa com papel de alumínio — o vapor derrete o queijo. O ketchup é o segredo de muitas mamãs — junta uma colher no molho para adocicar.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Massa Pizza' AND is_oficial = true;
END IF;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Esparguete';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 5, 4.5, 5.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Fiambre';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 1.8, 2.2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Cogumelos', 'frutas_legumes', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cogumelos';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.5, 1.5, 1.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Queijo ralado', 'lacticinios', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Queijo ralado';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.5, 1.2, 1.8, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Passata de tomate';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.5, 1.5, 1.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cebola';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1, 1, 1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Oregãos', 'temperos', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Oregãos';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 0.05, 0.05, 0.05, 'kg', 'ou a gosto') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 6. TORTILHA
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Tortilha',
  'outro',
  'Omelete espessa de batata e cebola, servida em fatias. Boa quente ou fria, perfeita para caminhadas.',
  E'1. Descasca e farta as batatas em rodelas finas.\n2. Frita as batatas em azeite abundante até amolecerem (não dourar).\n3. Tira as batatas, escorre o excesso de azeite.\n4. Bate os ovos com sal, mistura as batatas e a cebola frita.\n5. Volta à frigideira, cozinha em lume médio-baixo.\n6. Quando solidificar nos bordos, vira com um prato — cozinha do outro lado.\n7. Serve em fatias.',
  'Num campo grande, faz várias tortilhas de 20 ovos cada — mais fácil de virar. A tortilha fria é ótima para caminhadas — aguenta bem sem refrigeração 4–5 horas. Cebola caramelizada faz toda a diferença.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Tortilha' AND is_oficial = true;
END IF;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Ovo';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 150, 130, 160, 'un') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Batata';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 12, 10, 13, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cebola';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Azeite';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1, 1, 1, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Sal';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.1, 0.1, 0.1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 7. ATUM À ESPANHOLA
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Atum à Espanhola',
  'atum',
  'Arroz com atum em lata, tomate, ovo cozido e azeitona. Económico, fácil e saboroso.',
  E'1. Coze o arroz em água com sal e fio de azeite.\n2. Num tacho, refoga cebola e alho, junta o tomate e o pimento.\n3. Adiciona o atum escorrido, mistura bem.\n4. Incorpora o arroz cozido, mistura tudo.\n5. Decora com ovo cozido em quartos e azeitona.\n6. Serve quente.',
  'As latas grandes de atum são mais baratas por kg — compra as de 1.8 kg se encontrares. O arroz pode ser de véspera — na verdade fica melhor. Ovo cozido é opcional mas dá um toque especial.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Atum à Espanhola' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Atum em lata', 'enlatados', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Atum em lata';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 5, 4.5, 5.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Arroz', 'massas_arroz', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Arroz';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 4, 3.5, 4.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Ovo';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 30, 25, 30, 'un', 'cozidos, para decorar') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Tomate pelado (lata)', 'enlatados', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Tomate pelado (lata)';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cebola';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.5, 1.5, 1.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Pimento';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1, 1, 1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Azeitona preta', 'enlatados', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Azeitona preta';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 0.5, 0.5, 0.5, 'kg', 'para decorar') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 8. DOCE DOS GORDOS
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Doce dos Gordos',
  'doce',
  'Sobremesa de bolacha com leite condensado e natas batidas. O clássico das mamãs de campo que ninguém resiste.',
  E'1. Tritura as bolachas até ficarem migalhas finas.\n2. Mistura com manteiga amolecida — fica uma massa grumosa.\n3. Bate as natas até ficarem firmes.\n4. Mistura o leite condensado nas natas batidas.\n5. Num tabuleiro grande: camada de bolacha, camada de creme, repete.\n6. Termina com bolacha por cima.\n7. Leva ao frio pelo menos 2 horas antes de servir.',
  'Faz na véspera — fica muito melhor. Num campo sem frigorífico, usa uma arca de frio. A versão com café é para adultos — para miúdos usa bolacha simples. Um segredo: uma pitada de sal realça o doce.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Doce dos Gordos' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Leite condensado', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Leite condensado';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 5, 4.5, 5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Natas', 'lacticinios', 'L', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Natas';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Bolacha Maria', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Bolacha Maria';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 2, 2, 2, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Manteiga', 'lacticinios', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Manteiga';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.5, 0.4, 0.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 9. MCFLURRY CASEIRO
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'McFlurry Caseiro',
  'doce',
  'Gelado de baunilha batido com leite e coberto de Oreo ou M&M triturados. Sucesso garantido com os mais novos.',
  E'1. Tira o gelado do congelador 10 min antes para amolecer.\n2. Por cada porção: 2 bolas de gelado + 2 colheres de leite.\n3. Bate na batedeira ou mexe bem com uma colher grande.\n4. Serve em copos, cobre com Oreo triturado ou M&M.\n5. Come imediatamente!',
  'Faz em grandes doses numa batedeira industrial se houver. Se não, faz por grupos de 10 em tigelas — vai rodando. Serve em copos de plástico descartáveis para facilitar. Tens de ter o gelado em arca de frio até ao momento de servir.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'McFlurry Caseiro' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Gelado de baunilha', 'congelados', 'L', 'casa_apoio') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Gelado de baunilha';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 8, 7, 8, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Leite', 'bebidas_leite', 'L', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Leite';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 3, 2.5, 3, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Bolacha Oreo', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Bolacha Oreo';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1, 1, 1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('M&M''s', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'M&M''s';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 0.5, 0.5, 0.5, 'kg', 'alternativa ao Oreo') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 10. CACHORROS
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Cachorros',
  'lanche',
  'Pão de cachorro com salsicha grelhada, ketchup e mostarda. Jantar ou lanche rápido que toda a gente ama.',
  E'1. Grelha ou coze as salsichas em água a ferver 5–8 min.\n2. Aquece os pães (grelha, forno ou vapor).\n3. Coloca uma salsicha em cada pão.\n4. Serve com ketchup e mostarda à discrição.\n5. Opcional: cebola frita, queijo derretido, chili.',
  'Grelhar as salsichas dá mais sabor do que cozer — se tiveres grelha, usa. Compra pão de cachorro e salsichas em separado — mais barato que os packs. Uma salsicha por pessoa é suficiente, mas compra extra para os mais famintos.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Cachorros' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Pão de cachorro', 'padaria', 'un', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Pão de cachorro';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 65, 60, 70, 'un') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Salsichas', 'talho', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Salsichas';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 8, 7, 9, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Ketchup', 'temperos', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Ketchup';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1, 1, 1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Mostarda', 'temperos', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Mostarda';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.5, 0.5, 0.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;


-- ============================================
-- 11. ALHO FRANCÊS À BRÁS
-- ============================================
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial)
VALUES (
  'Alho Francês à Brás',
  'outro',
  'Versão vegetariana do clássico Bacalhau à Brás — alho-francês salteado com batata palha e ovo mexido. Surpreende pela simplicidade.',
  E'1. Limpa e corta o alho-francês em rodelas finas.\n2. Refoga cebola e alho em azeite até amolecer.\n3. Junta o alho-francês, salteia até murchar bem.\n4. Adiciona a batata palha, mistura.\n5. Bate os ovos com sal e pimenta, deita na frigideira.\n6. Mexe suavemente em lume médio até o ovo estar cremoso.\n7. Decora com azeitona preta e salsa picada.',
  'A chave é não cozer demais o ovo — tem de ficar cremoso. A batata palha de pacote é ideal para campo. Serve imediatamente ou resseca. Podes juntar queijo ralado no final para uma versão mais rica.',
  58,
  true
)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING
RETURNING id INTO r_id;

IF r_id IS NULL THEN
  SELECT id INTO r_id FROM receitas WHERE nome = 'Alho Francês à Brás' AND is_oficial = true;
END IF;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Batata palha', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Batata palha';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 5, 4.5, 5.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Alho-francês';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 6, 5.5, 7, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Ovo';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 100, 90, 110, 'un') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Cebola';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 1.5, 1.5, 1.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Azeite';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
VALUES (r_id, i_id, 0.5, 0.4, 0.5, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

SELECT id INTO i_id FROM ingredientes WHERE nome = 'Azeitona preta';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 0.5, 0.4, 0.5, 'kg', 'para decorar') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento) VALUES ('Salsa', 'frutas_legumes', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
SELECT id INTO i_id FROM ingredientes WHERE nome = 'Salsa';
INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
VALUES (r_id, i_id, 0.1, 0.1, 0.1, 'kg', 'para decorar') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

END $$;

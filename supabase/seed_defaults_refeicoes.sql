-- seed_defaults_refeicoes.sql
-- Receitas default de pequeno-almoço e lanche.
-- SEGURO: idempotente — ON CONFLICT DO NOTHING.
-- Corre no Supabase SQL Editor (depois do seed_receitas_2026.sql).
-- Não apaga nem altera dados existentes.

-- Garante índice para idempotência
CREATE UNIQUE INDEX IF NOT EXISTS receitas_nome_is_oficial_idx ON receitas(nome) WHERE is_oficial = true;

-- ── Pequeno-almoço ────────────────────────────────────────────────────────────

INSERT INTO receitas (nome, categoria, descricao, pessoas_base, is_oficial)
VALUES ('Pão com manteiga', 'pequeno_almoco', 'Pão simples com manteiga — base do pequeno-almoço CAMTIL.', 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING;

INSERT INTO receitas (nome, categoria, descricao, pessoas_base, is_oficial)
VALUES ('Pão com marmelada', 'pequeno_almoco', 'Pão com marmelada — alternativa doce ao pequeno-almoço.', 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING;

INSERT INTO receitas (nome, categoria, descricao, pessoas_base, is_oficial)
VALUES ('Leite com chocolate', 'pequeno_almoco', 'Leite achocolatado — indispensável no pequeno-almoço do campo.', 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING;

INSERT INTO receitas (nome, categoria, descricao, pessoas_base, is_oficial)
VALUES ('Leite natural', 'pequeno_almoco', 'Leite simples para quem prefere sem chocolate.', 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING;

INSERT INTO receitas (nome, categoria, descricao, pessoas_base, is_oficial)
VALUES ('Chá', 'pequeno_almoco', 'Chá de ervas — opcional no pequeno-almoço.', 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING;

-- ── Lanche ────────────────────────────────────────────────────────────────────

INSERT INTO receitas (nome, categoria, descricao, pessoas_base, is_oficial)
VALUES ('Bolachas', 'lanche', 'Bolachas Maria ou similares — lanche clássico de campo.', 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING;

INSERT INTO receitas (nome, categoria, descricao, pessoas_base, is_oficial)
VALUES ('Fruta da época', 'lanche', 'Fruta fresca da época — lanche saudável e simples.', 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING;

-- ── Ingredientes base para PA ─────────────────────────────────────────────────

DO $$
DECLARE
  r_id UUID; i_id UUID;
BEGIN

-- Pão com manteiga
SELECT id INTO r_id FROM receitas WHERE nome = 'Pão com manteiga' AND is_oficial = true;
IF r_id IS NOT NULL THEN
  INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento)
  VALUES ('Pão (carcaça/broa)', 'padaria', 'un', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO i_id FROM ingredientes WHERE nome = 'Pão (carcaça/broa)';
  INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
  VALUES (r_id, i_id, 70, 70, 80, 'un') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;

  INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento)
  VALUES ('Manteiga', 'lacticinios', 'kg', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO i_id FROM ingredientes WHERE nome = 'Manteiga';
  INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
  VALUES (r_id, i_id, 0.8, 0.8, 1, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;
END IF;

-- Pão com marmelada
SELECT id INTO r_id FROM receitas WHERE nome = 'Pão com marmelada' AND is_oficial = true;
IF r_id IS NOT NULL THEN
  INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento)
  VALUES ('Marmelada', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO i_id FROM ingredientes WHERE nome = 'Marmelada';
  INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
  VALUES (r_id, i_id, 2, 2, 2.5, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;
END IF;

-- Leite com chocolate
SELECT id INTO r_id FROM receitas WHERE nome = 'Leite com chocolate' AND is_oficial = true;
IF r_id IS NOT NULL THEN
  INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento)
  VALUES ('Leite achocolatado', 'bebidas_leite', 'L', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO i_id FROM ingredientes WHERE nome = 'Leite achocolatado';
  INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
  VALUES (r_id, i_id, 15, 15, 18, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;
END IF;

-- Leite natural
SELECT id INTO r_id FROM receitas WHERE nome = 'Leite natural' AND is_oficial = true;
IF r_id IS NOT NULL THEN
  INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento)
  VALUES ('Leite meio-gordo', 'bebidas_leite', 'L', 'fresco_diario') ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO i_id FROM ingredientes WHERE nome = 'Leite meio-gordo';
  INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
  VALUES (r_id, i_id, 8, 8, 10, 'L') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;
END IF;

-- Bolachas
SELECT id INTO r_id FROM receitas WHERE nome = 'Bolachas' AND is_oficial = true;
IF r_id IS NOT NULL THEN
  INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento)
  VALUES ('Bolachas Maria', 'mercearia', 'kg', 'despensa') ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO i_id FROM ingredientes WHERE nome = 'Bolachas Maria';
  INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade)
  VALUES (r_id, i_id, 3, 3, 4, 'kg') ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;
END IF;

END $$;

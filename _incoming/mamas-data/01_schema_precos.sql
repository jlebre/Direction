-- ============================================
-- 01_schema_precos.sql
-- Sistema de Preços Comunitários — Schema
-- Corre PRIMEIRO no Supabase SQL Editor
-- ============================================

-- Limpeza: remover sistema de preços antigo da UI
-- (a tabela campo_precos pode ser apagada se já não for usada)
-- DROP TABLE IF EXISTS campo_precos; -- descomenta se quiseres apagar de vez

-- ============================================
-- SUPERMERCADOS
-- ============================================
CREATE TABLE IF NOT EXISTS supermercados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,        -- "Continente Guarda"
  cadeia TEXT NOT NULL,             -- "Continente", "Pingo Doce", "Lidl", ...
  localidade TEXT,                  -- "Guarda", "Abrantes", "Tomar"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PREÇOS COMUNITÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto TEXT NOT NULL,                          -- "Arroz Caçarola 1kg"
  categoria TEXT NOT NULL DEFAULT 'outro',        -- ver lista abaixo
  preco DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  unidade TEXT NOT NULL DEFAULT 'un',             -- "kg", "L", "un", "pacote", "lata", "dúzia", "embalagem"
  supermercado_id UUID REFERENCES supermercados(id) ON DELETE SET NULL,
  criado_por TEXT NOT NULL DEFAULT 'Anónimo',     -- nome livre (sem auth)
  data_registo DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,                                     -- "Promoção", "Marca branca"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias válidas (documentação — enforçar na UI, não na BD):
-- mercearia | talho | peixaria | padaria | frutas_legumes | lacticinios
-- enlatados | bebidas | limpeza | temperos | congelados | charcutaria | outro

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_precos_produto_trgm
  ON precos USING gin (produto gin_trgm_ops); -- requer extensão pg_trgm

-- Se a extensão pg_trgm não estiver ativa, ativar primeiro:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- (No Supabase: Database > Extensions > pg_trgm > enable)
-- Alternativa sem extensão (pesquisa full-text):
-- CREATE INDEX IF NOT EXISTS idx_precos_produto_fts
--   ON precos USING gin(to_tsvector('portuguese', produto));

CREATE INDEX IF NOT EXISTS idx_precos_categoria ON precos(categoria);
CREATE INDEX IF NOT EXISTS idx_precos_supermercado ON precos(supermercado_id);
CREATE INDEX IF NOT EXISTS idx_precos_criado_por ON precos(criado_por);
CREATE INDEX IF NOT EXISTS idx_precos_data ON precos(data_registo DESC);

-- ============================================
-- TRIGGER updated_at
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_precos_updated_at ON precos;
CREATE TRIGGER trg_precos_updated_at
  BEFORE UPDATE ON precos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- RLS PÚBLICA (app sem auth)
-- ============================================
ALTER TABLE supermercados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all supermercados" ON supermercados;
CREATE POLICY "Public all supermercados" ON supermercados
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE precos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public all precos" ON precos;
CREATE POLICY "Public all precos" ON precos
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VIEW: preços agrupados por produto
-- (facilita a UI de agrupamento)
-- ============================================
CREATE OR REPLACE VIEW precos_agrupados AS
SELECT
  LOWER(TRIM(produto)) AS produto_key,
  MIN(produto) AS produto,
  MIN(categoria) AS categoria,
  COUNT(*) AS num_precos,
  MIN(preco) AS preco_min,
  MAX(preco) AS preco_max,
  MAX(data_registo) AS ultima_atualizacao
FROM precos
GROUP BY LOWER(TRIM(produto));

-- ============================================
-- 010_schema_precos.sql
-- Sistema de Preços Comunitários — Schema
-- SEGURO: apenas CREATE IF NOT EXISTS, sem DROP TABLE
-- ============================================

-- Extensão necessária para pesquisa fuzzy (ativar se ainda não estiver ativa)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- SUPERMERCADOS
-- ============================================
CREATE TABLE IF NOT EXISTS supermercados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cadeia TEXT NOT NULL,
  localidade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PREÇOS COMUNITÁRIOS
-- ============================================
CREATE TABLE IF NOT EXISTS precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outro',
  preco DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  unidade TEXT NOT NULL DEFAULT 'un',
  supermercado_id UUID REFERENCES supermercados(id) ON DELETE SET NULL,
  criado_por TEXT NOT NULL DEFAULT 'Anónimo',
  data_registo DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias válidas (enforçar na UI, não na BD):
-- mercearia | talho | peixaria | padaria | frutas_legumes | lacticinios
-- enlatados | bebidas | limpeza | temperos | congelados | charcutaria | outro

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_precos_produto_trgm
  ON precos USING gin (produto gin_trgm_ops);

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

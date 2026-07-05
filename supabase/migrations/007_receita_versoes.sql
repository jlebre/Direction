-- 007_receita_versoes.sql
-- Adiciona sistema de versões às receitas.
-- SEGURO: apenas CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, e seed.
-- Nenhuma tabela/coluna existente é alterada. Dados existentes ficam intactos.
--
-- APLICAR NO SUPABASE DASHBOARD (SQL Editor) antes de fazer deploy.

-- ── Tabela de versões ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receita_versoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receita_id  uuid NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
  nome_versao text NOT NULL DEFAULT 'Default',
  is_default  boolean NOT NULL DEFAULT false,
  campo_id    uuid REFERENCES campos(id) ON DELETE SET NULL,
  criada_por  text,
  notas       text,
  preparacao  text,
  estado      text NOT NULL DEFAULT 'completa' CHECK (estado IN ('rascunho', 'completa')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receita_versoes_receita_id_idx ON receita_versoes(receita_id);
CREATE INDEX IF NOT EXISTS receita_versoes_campo_id_idx ON receita_versoes(campo_id);

-- Garantir apenas uma versão default por receita
CREATE UNIQUE INDEX IF NOT EXISTS receita_versoes_default_unique_idx
  ON receita_versoes(receita_id) WHERE is_default = true;

-- ── Coluna nova na ementa (nullable — backward compat) ───────────────────────
ALTER TABLE ementa
  ADD COLUMN IF NOT EXISTS receita_versao_id uuid
    REFERENCES receita_versoes(id) ON DELETE SET NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE receita_versoes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "public_all" ON receita_versoes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Seed: versão Default para receitas existentes (idempotente) ──────────────
INSERT INTO receita_versoes (receita_id, nome_versao, is_default, estado)
SELECT id, 'Default', true, 'completa'
FROM receitas r
WHERE NOT EXISTS (
  SELECT 1 FROM receita_versoes rv
  WHERE rv.receita_id = r.id AND rv.is_default = true
);

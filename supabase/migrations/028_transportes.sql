CREATE TABLE IF NOT EXISTS transportes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_id         UUID NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  sentido          TEXT NOT NULL DEFAULT 'ida'
                   CHECK (sentido IN ('ida', 'volta', 'ida_volta')),
  origem           TEXT NOT NULL,
  destino          TEXT NOT NULL,
  tipo_transporte  TEXT NOT NULL DEFAULT 'autocarro'
                   CHECK (tipo_transporte IN ('autocarro', 'comboio', 'aviao', 'barco', 'outro')),
  data             DATE,
  hora_partida     TIME,
  hora_chegada     TIME,
  empresa          TEXT,
  numero_referencia TEXT,
  preco            NUMERIC(10,2),
  observacoes      TEXT,
  estado           TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (estado IN ('pendente', 'confirmado', 'cancelado')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transportes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transportes_all" ON transportes;
CREATE POLICY "transportes_all" ON transportes
  FOR ALL USING (true) WITH CHECK (true);

-- Bucket privado para PDFs de transportes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transportes',
  'transportes',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage (acesso por anon key — app sem auth)
DROP POLICY IF EXISTS "transportes_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "transportes_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "transportes_storage_delete" ON storage.objects;

CREATE POLICY "transportes_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'transportes');
CREATE POLICY "transportes_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'transportes');
CREATE POLICY "transportes_storage_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'transportes');

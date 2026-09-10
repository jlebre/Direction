-- ROLLBACK de 044_storage_isolation.sql
--
-- Restaura literalmente as 3 policies abertas anteriores e o bucket público
-- — comportamento observável idêntico ao que existia antes desta migration
-- para todos os 11 campos reais (todos com legacy_anon_access=true, que
-- continua a existir e a não ser alterado por este rollback).
--
-- Não apaga `storage_slug` nem as funções auxiliares (campo_storage_slug,
-- storage_object_campo_id, set_campo_storage_slug/trigger) — são aditivas e
-- inofensivas de deixar para trás; só a lógica de autorização é revertida.

UPDATE storage.buckets SET public = true WHERE id = 'faturas';

DROP POLICY IF EXISTS "faturas_select" ON storage.objects;
DROP POLICY IF EXISTS "faturas_insert" ON storage.objects;
DROP POLICY IF EXISTS "faturas_update" ON storage.objects;
DROP POLICY IF EXISTS "faturas_delete" ON storage.objects;

CREATE POLICY "faturas_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'faturas');

CREATE POLICY "faturas_public_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'faturas');

CREATE POLICY "faturas_public_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'faturas');

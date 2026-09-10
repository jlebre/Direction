-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2.8 (V2 Security & Auth) — isolamento de Storage por campo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Achado do fecho da Fase 2: o bucket `faturas` não segmentava por campo em
-- NENHUMA operação (leitura ou escrita) — confirmado por introspecção direta
-- de pg_policies (`bucket_id = 'faturas'` para `{public}`, sem predicado de
-- caminho) e pela suite `tests/security/storage-matrix.test.ts` (it.fails).
--
-- Estratégia (Opção A do pedido — sem mover os 387 objetos existentes):
-- os paths já seguem `<slug-do-campo>/<ficheiro>` (confirmado por inventário
-- direto do bucket) e o slug é 1:1 derivável do `nome` do campo pela mesma
-- função já usada no código (`getCampoSlug`, src/lib/adjuntos/supabase-storage.ts).
-- Em vez de recalcular o slug em SQL (haveria risco de deriva face à versão
-- TS), guarda-se o valor numa coluna estável `campos.storage_slug`,
-- preenchida automaticamente na criação de um campo (trigger BEFORE INSERT)
-- e nunca recalculada sozinha num UPDATE de `nome` — renomear um campo não
-- pode silenciosamente orfanar ficheiros já lá existentes.
--
-- FORWARD:      este ficheiro.
-- ROLLBACK:     supabase/rollbacks/044_storage_isolation_rollback.sql
-- VERIFICATION: tests/security/storage-matrix.test.ts (sem it.fails — passa
--               a testar o comportamento real, não a documentar o gap).

-- ── 1. campos.storage_slug ──────────────────────────────────────────────────
ALTER TABLE campos ADD COLUMN IF NOT EXISTS storage_slug text;

COMMENT ON COLUMN campos.storage_slug IS
  'Fase 2.8 V2. Primeiro segmento de path no bucket faturas (ex. "aranhicos-i"). '
  'Preenchido automaticamente na criação (trigger), nunca recalculado sozinho '
  'num UPDATE de nome — evita orfanar ficheiros já existentes ao renomear um campo.';

-- Réplica em SQL de getCampoSlug() (src/lib/adjuntos/supabase-storage.ts):
-- minúsculas, diacríticos portugueses removidos via translate() (sem
-- depender da extensão unaccent, que não está instalada), espaços -> hífen,
-- tudo fora de [a-z0-9-] removido. Verificado a produzir exactamente os
-- mesmos 11 slugs que a versão TS para os 11 campos reais antes de aplicar
-- esta migration.
CREATE OR REPLACE FUNCTION public.campo_storage_slug(nome text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT regexp_replace(
    regexp_replace(
      translate(
        lower(nome),
        'àáâãäåèéêëìíîïòóôõöùúûüçñýÿ',
        'aaaaaaeeeeiiiiooooouuuucnyy'
      ),
      '\s+', '-', 'g'
    ),
    '[^a-z0-9-]', '', 'g'
  );
$$;

-- Backfill dos campos já existentes (reais + [TEST] se algum estiver a
-- correr neste momento) que ainda não têm storage_slug.
UPDATE campos SET storage_slug = campo_storage_slug(nome) WHERE storage_slug IS NULL;

-- Futuras criações: preenche automaticamente se não vier explícito — nunca
-- reage a um UPDATE de nome (só INSERT), de propósito.
CREATE OR REPLACE FUNCTION public.set_campo_storage_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.storage_slug IS NULL THEN
    NEW.storage_slug := public.campo_storage_slug(NEW.nome);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campos_set_storage_slug ON campos;
CREATE TRIGGER campos_set_storage_slug
  BEFORE INSERT ON campos
  FOR EACH ROW EXECUTE FUNCTION public.set_campo_storage_slug();

-- ── 2. Resolver um objeto de Storage para o seu campo_id ────────────────────
-- SECURITY DEFINER: chamada de dentro de uma policy de storage.objects, onde
-- o autor do pedido pode ainda não ter nenhum acesso de leitura a `campos`
-- (é precisamente essa leitura que decide se tem acesso) — sem isto haveria
-- recursão/bloqueio de RLS, mesmo racional que has_camp_access() etc.
-- (migration 039).
CREATE OR REPLACE FUNCTION public.storage_object_campo_id(object_name text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.campos WHERE storage_slug = split_part(object_name, '/', 1) LIMIT 1;
$$;

-- ── 3. Policies de storage.objects para o bucket faturas ────────────────────
-- Substituem as 3 policies totalmente abertas (`faturas_public_*`,
-- `bucket_id = 'faturas'` para {public}, sem predicado de caminho).
DROP POLICY IF EXISTS "faturas_public_read" ON storage.objects;
DROP POLICY IF EXISTS "faturas_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "faturas_public_delete" ON storage.objects;

-- SELECT: mesma condição de has_camp_access() — inclui has_global_read()
-- (admin/treasurer/viewer), membership local (adjunto/field_viewer) activa,
-- OU a excepção legacy por campo.
CREATE POLICY "faturas_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'faturas' AND (
      public.has_camp_access(public.storage_object_campo_id(name))
      OR public.has_legacy_anon_access(public.storage_object_campo_id(name))
    )
  );

-- INSERT/UPDATE (upload, incl. upsert de substituição): mesma condição de
-- can_edit_camp() — admin/treasurer, ou membership local `adjunto` activa,
-- OU a excepção legacy.
CREATE POLICY "faturas_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'faturas' AND (
      public.can_edit_camp(public.storage_object_campo_id(name))
      OR public.has_legacy_anon_access(public.storage_object_campo_id(name))
    )
  );

CREATE POLICY "faturas_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'faturas' AND (
      public.can_edit_camp(public.storage_object_campo_id(name))
      OR public.has_legacy_anon_access(public.storage_object_campo_id(name))
    )
  )
  WITH CHECK (
    bucket_id = 'faturas' AND (
      public.can_edit_camp(public.storage_object_campo_id(name))
      OR public.has_legacy_anon_access(public.storage_object_campo_id(name))
    )
  );

-- DELETE: mesma condição de despesas_delete (migration 042) — de propósito
-- SEM can_edit_camp()/adjunto, só admin/treasurer ou a excepção legacy.
-- Consistência deliberada com a regra já existente para apagar despesas
-- (achado documentado em tests/security/role-matrix.test.ts): um `adjunto`
-- comum não apaga permanentemente nem despesas nem as suas fotos — só
-- admin/treasurer, ou hoje, para os 11 campos reais, a excepção legacy.
CREATE POLICY "faturas_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'faturas' AND (
      public.is_admin() OR public.is_treasurer()
      OR public.has_legacy_anon_access(public.storage_object_campo_id(name))
    )
  );

-- ── 4. Bucket privado ────────────────────────────────────────────────────────
-- Com o bucket ainda `public: true`, a URL pública (getPublicUrl) serviria
-- qualquer ficheiro sem passar pelas policies acima — teriam zero efeito
-- real para leitura. Privado: leitura só via Storage API (respeita as
-- policies de SELECT acima), a app passa a gerar signed URLs no servidor
-- (getSignedPhotoUrl) só para exibir `<img>`, nunca como a própria
-- autorização.
UPDATE storage.buckets SET public = false WHERE id = 'faturas';

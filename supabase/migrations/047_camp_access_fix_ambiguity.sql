-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2 — Camp Access Links: corrige ambiguidade de coluna em
-- camp_access_create_despesa
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Achado real (tests/security/camp-access-links.test.ts): `RETURNS TABLE
-- (despesa_id uuid, numero_recibo int)` cria implicitamente uma variável
-- PL/pgSQL chamada `numero_recibo`, que colide com a coluna
-- `despesas.numero_recibo` dentro de `SELECT MAX(numero_recibo) ... FROM
-- despesas` — Postgres não sabe se é a variável ou a coluna
-- ("column reference is ambiguous", 42702). Corrigido qualificando sempre
-- com o alias da tabela.
--
-- FORWARD:  este ficheiro.
-- ROLLBACK: reaplica a versão anterior de supabase/migrations/045_camp_access_links.sql
--           (o CREATE OR REPLACE abaixo já É o rollback funcional — não há
--           nada a desfazer isoladamente, só corrigir para a frente).

CREATE OR REPLACE FUNCTION public.camp_access_create_despesa(p_link_id uuid, p_payload jsonb)
RETURNS TABLE (despesa_id uuid, numero_recibo int)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_camp_id uuid;
  v_numero int;
  v_id uuid;
  v_attempt int;
BEGIN
  v_camp_id := public.camp_access_camp_id(p_link_id);
  IF v_camp_id IS NULL THEN
    RAISE EXCEPTION 'camp_access_create_despesa: link inválido, expirado ou revogado' USING ERRCODE = '42501';
  END IF;

  FOR v_attempt IN 1..3 LOOP
    SELECT COALESCE(MAX(d.numero_recibo), 0) + 1 INTO v_numero FROM despesas d WHERE d.campo_id = v_camp_id;
    BEGIN
      INSERT INTO despesas (
        campo_id, numero_recibo, data, valor, descricao, codigo, codigo_descricao, tipo,
        nif_confirmado, foto_path, ocr_status, ocr_texto, ocr_fornecedor, ocr_total, ocr_data,
        origem_dados, nif_visivel, qr_raw, qr_total, qr_data, qr_nif_emitente, qr_nif_adquirente,
        qr_numero_documento, qr_atcud, qr_tipo_documento
      ) VALUES (
        v_camp_id, v_numero, (p_payload->>'data')::date, (p_payload->>'valor')::numeric,
        p_payload->>'descricao', p_payload->>'codigo', p_payload->>'codigo_descricao', 'despesa',
        COALESCE((p_payload->>'nifConfirmado')::boolean, false), p_payload->>'fotoPath',
        COALESCE(p_payload->>'ocrStatus', 'nenhum'), p_payload->>'ocrTexto', p_payload->>'ocrFornecedor',
        (p_payload->>'ocrTotal')::numeric, (p_payload->>'ocrData')::date,
        COALESCE(p_payload->>'origemDados', 'manual'), COALESCE((p_payload->>'nifVisivel')::boolean, false),
        p_payload->>'qrRaw', (p_payload->>'qrTotal')::numeric, (p_payload->>'qrData')::date,
        p_payload->>'qrNifEmitente', p_payload->>'qrNifAdquirente', p_payload->>'qrNumeroDocumento',
        p_payload->>'qrAtcud', p_payload->>'qrTipoDocumento'
      ) RETURNING despesas.id INTO v_id;
      EXIT; -- sucesso
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 3 THEN
        RAISE EXCEPTION 'camp_access_create_despesa: não foi possível obter numero_recibo único';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_id, v_numero;
END;
$$;

GRANT EXECUTE ON FUNCTION public.camp_access_create_despesa(uuid, jsonb) TO anon, authenticated;

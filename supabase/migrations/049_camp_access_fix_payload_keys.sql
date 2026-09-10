-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2 — Camp Access Links: corrige chave errada no payload JSON
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Achado real (tests/e2e/camp-access-links.spec.ts, ciclo completo pela UI):
-- `camp_access_create_despesa`/`camp_access_update_despesa` extraíam
-- `p_payload->>'codigo_descricao'` (snake_case), mas o payload real enviado
-- por `src/actions/despesas.ts` (Zod-validado) usa `codigoDescricao`
-- (camelCase, mesmo padrão de todos os outros campos). Resultado: a coluna
-- NOT NULL `despesas.codigo_descricao` recebia sempre NULL, o INSERT/UPDATE
-- falhava, e a UI mostrava só "Erro ao registar. Tenta de novo." — sem
-- indicar a causa real. O teste ao nível de RPC (tests/security/
-- camp-access-links.test.ts) não apanhou isto porque usava a MESMA chave
-- errada no seu próprio payload de teste (também corrigido agora).
--
-- FORWARD:  este ficheiro.
-- ROLLBACK: nenhum necessário — corrige um bug, não é uma opção reversível.

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
        p_payload->>'descricao', p_payload->>'codigo', p_payload->>'codigoDescricao', 'despesa',
        COALESCE((p_payload->>'nifConfirmado')::boolean, false), p_payload->>'fotoPath',
        COALESCE(p_payload->>'ocrStatus', 'nenhum'), p_payload->>'ocrTexto', p_payload->>'ocrFornecedor',
        (p_payload->>'ocrTotal')::numeric, (p_payload->>'ocrData')::date,
        COALESCE(p_payload->>'origemDados', 'manual'), COALESCE((p_payload->>'nifVisivel')::boolean, false),
        p_payload->>'qrRaw', (p_payload->>'qrTotal')::numeric, (p_payload->>'qrData')::date,
        p_payload->>'qrNifEmitente', p_payload->>'qrNifAdquirente', p_payload->>'qrNumeroDocumento',
        p_payload->>'qrAtcud', p_payload->>'qrTipoDocumento'
      ) RETURNING despesas.id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 3 THEN
        RAISE EXCEPTION 'camp_access_create_despesa: não foi possível obter numero_recibo único';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_id, v_numero;
END;
$$;

CREATE OR REPLACE FUNCTION public.camp_access_update_despesa(p_link_id uuid, p_despesa_id uuid, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_camp_id uuid;
BEGIN
  v_camp_id := public.camp_access_camp_id(p_link_id);
  IF v_camp_id IS NULL THEN
    RAISE EXCEPTION 'camp_access_update_despesa: link inválido, expirado ou revogado' USING ERRCODE = '42501';
  END IF;

  UPDATE despesas SET
    valor = (p_payload->>'valor')::numeric,
    descricao = p_payload->>'descricao',
    data = (p_payload->>'data')::date,
    codigo = p_payload->>'codigo',
    codigo_descricao = p_payload->>'codigoDescricao',
    nif_confirmado = COALESCE((p_payload->>'nifConfirmado')::boolean, false),
    foto_path = p_payload->>'fotoPath'
  WHERE id = p_despesa_id AND campo_id = v_camp_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'camp_access_update_despesa: despesa não encontrada neste campo' USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.camp_access_create_despesa(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_update_despesa(uuid, uuid, jsonb) TO anon, authenticated;

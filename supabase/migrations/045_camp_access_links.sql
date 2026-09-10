-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 2 — Camp Access Links (substitui, a prazo, legacy_anon_access)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Modelo: 1 campo = 1 Adjunto operacional = 1 link de acesso, sem conta
-- Supabase Auth, sem OTP, sem password. Ver docs/v2/adr/ADR-camp-access-links.md
-- para o raciocínio completo.
--
-- Nunca guarda o token em claro — só o hash SHA-256. O boundary de BD é
-- SECURITY DEFINER + reautorização explícita dentro de cada função (nunca
-- confia só na presença do link_id), exactamente o mesmo padrão já usado em
-- has_camp_access()/can_edit_camp()/danger_zone_clear_financials() — sem
-- precisar de service_role (indisponível neste projeto).
--
-- FORWARD:      este ficheiro.
-- ROLLBACK:     supabase/rollbacks/045_camp_access_links_rollback.sql
-- VERIFICATION: tests/security/camp-access-links.test.ts + tests/e2e/camp-access-links.spec.ts

-- ── 1. camp_access_links ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS camp_access_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id             UUID NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  token_hash          TEXT NOT NULL UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id  UUID REFERENCES auth.users(id),
  expires_at          TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  last_used_at        TIMESTAMPTZ
);

COMMENT ON TABLE camp_access_links IS
  'Fase 2 V2. Um link de acesso operacional por campo (Adjunto), sem conta '
  'Supabase Auth. Token em claro NUNCA persistido — só token_hash (SHA-256). '
  'Ver docs/v2/adr/ADR-camp-access-links.md.';

-- Só um link ACTIVO por campo em simultâneo (activo = não revogado; um link
-- expirado continua "activo" até ser explicitamente revogado ou regenerado —
-- regenerar revoga o antigo explicitamente, nunca dois activos ao mesmo tempo).
CREATE UNIQUE INDEX IF NOT EXISTS camp_access_links_one_active_per_camp
  ON camp_access_links (camp_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS camp_access_links_camp_idx ON camp_access_links (camp_id);

ALTER TABLE camp_access_links ENABLE ROW LEVEL SECURITY;

-- Gestão do link (ver/gerar/revogar) é só para staff — nunca para uma sessão
-- de camp_access (secção 16 do pedido: default admin+treasurer gerem,
-- viewer só lê).
DROP POLICY IF EXISTS "camp_access_links_select" ON camp_access_links;
CREATE POLICY "camp_access_links_select" ON camp_access_links
  FOR SELECT TO authenticated
  USING (public.has_global_read());

DROP POLICY IF EXISTS "camp_access_links_write" ON camp_access_links;
CREATE POLICY "camp_access_links_write" ON camp_access_links
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_treasurer());

DROP POLICY IF EXISTS "camp_access_links_update" ON camp_access_links;
CREATE POLICY "camp_access_links_update" ON camp_access_links
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_treasurer())
  WITH CHECK (public.is_admin() OR public.is_treasurer());
-- Sem DELETE — revogação é sempre soft (revoked_at), histórico preservado.

-- Eventos mínimos de auditoria (secção 21 do pedido — "não criar uma
-- framework grande se não existe nenhuma ainda"; este projecto não tem
-- audit_log implementado, só descrito no modelo-alvo de AUTHORIZATION.md).
-- Nunca guarda o token em claro.
CREATE TABLE IF NOT EXISTS camp_access_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id     UUID REFERENCES camp_access_links(id) ON DELETE SET NULL,
  camp_id     UUID NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
  event       TEXT NOT NULL CHECK (event IN ('created', 'revoked', 'regenerated', 'used')),
  actor_user_id UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE camp_access_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "camp_access_events_select" ON camp_access_events;
CREATE POLICY "camp_access_events_select" ON camp_access_events
  FOR SELECT TO authenticated USING (public.has_global_read());
-- INSERT só via as funções SECURITY DEFINER abaixo (nunca directo do cliente).

-- ── 2. Geração / gestão de links (chamadas só por staff, via RLS normal) ───
-- O token em claro nunca atravessa esta função — é gerado em TypeScript
-- (crypto.randomBytes, nunca no browser) e só o hash chega aqui.
CREATE OR REPLACE FUNCTION public.camp_access_create_link(p_camp_id uuid, p_token_hash text, p_expires_at timestamptz)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (public.is_admin() OR public.is_treasurer()) THEN
    RAISE EXCEPTION 'camp_access_create_link: sem autorização' USING ERRCODE = '42501';
  END IF;

  -- Regenerar: revoga explicitamente qualquer link activo existente para
  -- este campo antes de criar o novo (nunca dois activos em simultâneo —
  -- também garantido pelo índice único, isto só torna a intenção explícita
  -- e regista o evento).
  UPDATE camp_access_links SET revoked_at = now()
  WHERE camp_id = p_camp_id AND revoked_at IS NULL;

  INSERT INTO camp_access_links (camp_id, token_hash, expires_at, created_by_user_id)
  VALUES (p_camp_id, p_token_hash, p_expires_at, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO camp_access_events (link_id, camp_id, event, actor_user_id)
  VALUES (v_id, p_camp_id, 'created', auth.uid());

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.camp_access_revoke_link(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_camp_id uuid;
BEGIN
  IF NOT (public.is_admin() OR public.is_treasurer()) THEN
    RAISE EXCEPTION 'camp_access_revoke_link: sem autorização' USING ERRCODE = '42501';
  END IF;
  UPDATE camp_access_links SET revoked_at = now()
  WHERE id = p_link_id AND revoked_at IS NULL
  RETURNING camp_id INTO v_camp_id;

  IF v_camp_id IS NOT NULL THEN
    INSERT INTO camp_access_events (link_id, camp_id, event, actor_user_id)
    VALUES (p_link_id, v_camp_id, 'revoked', auth.uid());
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.camp_access_create_link(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_revoke_link(uuid) TO authenticated;

-- ── 3. Resolução do token (bootstrap, GET /a/<token>) ───────────────────────
-- Chamada com anon (ninguém está autenticado ainda) — por isso não pode
-- depender de auth.uid(); a única "credencial" é o hash do token, que só
-- quem tem o link em claro consegue produzir.
CREATE OR REPLACE FUNCTION public.camp_access_bootstrap(p_token_hash text)
RETURNS TABLE (link_id uuid, camp_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link_id uuid;
  v_camp_id uuid;
BEGIN
  SELECT id, camp_access_links.camp_id INTO v_link_id, v_camp_id
  FROM camp_access_links
  WHERE token_hash = p_token_hash
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF v_link_id IS NULL THEN
    RETURN; -- nenhuma linha — o chamador trata como inválido/expirado/revogado sem distinguir
  END IF;

  UPDATE camp_access_links SET last_used_at = now() WHERE id = v_link_id;
  INSERT INTO camp_access_events (link_id, camp_id, event) VALUES (v_link_id, v_camp_id, 'used');

  RETURN QUERY SELECT v_link_id, v_camp_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.camp_access_bootstrap(text) TO anon, authenticated;

-- ── 4. Reautorização a cada pedido (usada por TODAS as funções abaixo e ────
-- pelo resolveActor() no servidor) — nunca confia só na presença do
-- link_id no cookie; revalida sempre contra o estado actual da BD.
CREATE OR REPLACE FUNCTION public.camp_access_camp_id(p_link_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT camp_id FROM camp_access_links
  WHERE id = p_link_id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.camp_access_camp_id(uuid) TO anon, authenticated;

-- ── 5. Despesas via Camp Access Session (primeiro recurso ligado — "só ────
-- despesas primeiro", mesmo padrão incremental da subfase 2.6) ─────────────
CREATE OR REPLACE FUNCTION public.camp_access_get_campo(p_link_id uuid)
RETURNS SETOF campos
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.* FROM campos c WHERE c.id = public.camp_access_camp_id(p_link_id);
$$;

CREATE OR REPLACE FUNCTION public.camp_access_list_despesas(p_link_id uuid)
RETURNS SETOF despesas
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT d.* FROM despesas d WHERE d.campo_id = public.camp_access_camp_id(p_link_id);
$$;

CREATE OR REPLACE FUNCTION public.camp_access_get_despesa(p_link_id uuid, p_despesa_id uuid)
RETURNS SETOF despesas
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT d.* FROM despesas d
  WHERE d.id = p_despesa_id AND d.campo_id = public.camp_access_camp_id(p_link_id);
$$;

CREATE OR REPLACE FUNCTION public.camp_access_list_despesa_linhas(p_link_id uuid, p_despesa_id uuid)
RETURNS SETOF despesa_linhas
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT dl.* FROM despesa_linhas dl
  JOIN despesas d ON d.id = dl.despesa_id
  WHERE dl.despesa_id = p_despesa_id AND d.campo_id = public.camp_access_camp_id(p_link_id);
$$;

-- Insere uma despesa com o mesmo payload/retry (3 tentativas em
-- numero_recibo) que src/actions/despesas.ts já usa para o caminho staff —
-- réplica fiel, não um comportamento novo.
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
    SELECT COALESCE(MAX(numero_recibo), 0) + 1 INTO v_numero FROM despesas WHERE campo_id = v_camp_id;
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
      ) RETURNING id INTO v_id;
      EXIT; -- sucesso
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 3 THEN
        RAISE EXCEPTION 'camp_access_create_despesa: não foi possível obter numero_recibo único';
      END IF;
      -- tenta de novo com o próximo número
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
    codigo_descricao = p_payload->>'codigo_descricao',
    nif_confirmado = COALESCE((p_payload->>'nifConfirmado')::boolean, false),
    foto_path = p_payload->>'fotoPath'
  WHERE id = p_despesa_id AND campo_id = v_camp_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'camp_access_update_despesa: despesa não encontrada neste campo' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.camp_access_delete_despesa(p_link_id uuid, p_despesa_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_camp_id uuid;
BEGIN
  v_camp_id := public.camp_access_camp_id(p_link_id);
  IF v_camp_id IS NULL THEN
    RAISE EXCEPTION 'camp_access_delete_despesa: link inválido, expirado ou revogado' USING ERRCODE = '42501';
  END IF;

  DELETE FROM despesas WHERE id = p_despesa_id AND campo_id = v_camp_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'camp_access_delete_despesa: despesa não encontrada neste campo' USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.camp_access_get_campo(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_list_despesas(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_get_despesa(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_list_despesa_linhas(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_create_despesa(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_update_despesa(uuid, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.camp_access_delete_despesa(uuid, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.camp_access_create_despesa IS
  'Fase 2 V2 (Camp Access Links). Réplica de src/actions/despesas.ts para '
  'sessões de camp_access (sem auth.uid()) — SECURITY DEFINER, revalida '
  'p_link_id a cada chamada. Chamada só por src/actions/despesas.ts, nunca '
  'directamente do cliente.';

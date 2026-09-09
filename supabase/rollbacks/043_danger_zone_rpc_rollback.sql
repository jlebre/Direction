-- ROLLBACK de 043_danger_zone_rpc.sql
--
-- Remove só a função RPC. Não apaga nenhum dado nem reverte nenhum DELETE
-- já executado através dela (isso seria irreversível por definição — a
-- própria natureza da Danger Zone). Depois deste rollback, SetupForm.tsx
-- teria de voltar a chamar `supabase.from(...).delete()` diretamente do
-- cliente (código anterior, disponível no histórico do git) para a Danger
-- Zone voltar a funcionar.

DROP FUNCTION IF EXISTS public.danger_zone_clear_financials(uuid);

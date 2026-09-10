-- ROLLBACK de 046_camp_access_reads.sql — remove só as 3 funções de leitura.
DROP FUNCTION IF EXISTS public.camp_access_list_regularizacoes(uuid);
DROP FUNCTION IF EXISTS public.camp_access_get_devolucao(uuid, uuid);
DROP FUNCTION IF EXISTS public.camp_access_list_devolucoes(uuid);

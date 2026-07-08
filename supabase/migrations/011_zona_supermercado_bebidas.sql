-- 011_zona_supermercado_bebidas.sql
-- Adiciona 'bebidas' ao enum zona_supermercado.
-- Necessário para ingredientes como Vinho branco e Cerveja
-- usados no seed_receitas_tremelgas2024.sql.
-- ADD VALUE IF NOT EXISTS: seguro re-correr, nunca destrutivo.

ALTER TYPE zona_supermercado ADD VALUE IF NOT EXISTS 'bebidas';

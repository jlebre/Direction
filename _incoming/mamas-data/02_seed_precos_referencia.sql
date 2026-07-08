-- ============================================
-- 02_seed_precos_referencia.sql
-- ~130 preços reais compilados de Continente, Pingo Doce e Intermarché
-- Fonte: folha "Preços" do Excel Organização Cozinha (2024)
-- Corre DEPOIS de 01_schema_precos.sql
-- ============================================
-- NOTA: estes são preços iniciais de arranque, adicionados por "CAMTIL (base)".
-- Qualquer utilizador pode editar ou adicionar novos preços/supermercados.

DO $$
DECLARE
  sm_continente UUID;
  sm_pingodoce UUID;
  sm_intermarche UUID;
BEGIN

-- Garantir supermercados de referência
INSERT INTO supermercados (nome, cadeia, localidade) VALUES ('Continente (geral)', 'Continente', NULL) ON CONFLICT (nome) DO NOTHING;
INSERT INTO supermercados (nome, cadeia, localidade) VALUES ('Pingo Doce (geral)', 'Pingo Doce', NULL) ON CONFLICT (nome) DO NOTHING;
INSERT INTO supermercados (nome, cadeia, localidade) VALUES ('Intermarché (geral)', 'Intermarché', NULL) ON CONFLICT (nome) DO NOTHING;

SELECT id INTO sm_continente FROM supermercados WHERE nome = 'Continente (geral)';
SELECT id INTO sm_pingodoce FROM supermercados WHERE nome = 'Pingo Doce (geral)';
SELECT id INTO sm_intermarche FROM supermercados WHERE nome = 'Intermarché (geral)';

-- Preços (produto, categoria, preco, unidade, supermercado, notas)
INSERT INTO precos (produto, categoria, preco, unidade, supermercado_id, criado_por, notas) VALUES
-- CHARCUTARIA
('Bacon para cubos (150g)', 'charcutaria', 1.65, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Bacon/presunto fatias (200g)', 'charcutaria', 1.77, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Chouriço corrente (pacote 10)', 'charcutaria', 5.99, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Fiambre para cubos', 'charcutaria', 7.73, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Fiambre fatiado (200g=10 fatias)', 'charcutaria', 1.59, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Linguiça (200g=4un)', 'charcutaria', 1.49, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Queijo fatiado (500g=24 fatias)', 'charcutaria', 3.95, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Queijo flamengo ralado (150g)', 'charcutaria', 1.26, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Queijo ralado para gratinar (200g)', 'charcutaria', 1.49, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Queijo parmesão (60g)', 'charcutaria', 1.87, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Queijo mozzarella', 'charcutaria', 0.99, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Grana padano', 'charcutaria', 3.12, 'un', sm_continente, 'CAMTIL (base)', NULL),
-- CONGELADOS
('Batatas fritas para fritar', 'congelados', 1.99, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Gelado de nata (1L)', 'congelados', 2.39, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Ervilhas congeladas (1kg)', 'congelados', 1.38, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Brócolos congelados (1kg)', 'congelados', 1.88, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Couve-flor congelada (750g)', 'congelados', 1.38, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
-- ENLATADOS
('Azeitonas (frasco 210g)', 'enlatados', 1.09, 'frasco', sm_continente, 'CAMTIL (base)', NULL),
('Cogumelos laminados (lata 185g)', 'enlatados', 1.19, 'lata', sm_continente, 'CAMTIL (base)', 'peso escorrido'),
('Ervilhas (lata grande 850g)', 'enlatados', 1.39, 'lata', sm_continente, 'CAMTIL (base)', '520g escorrido'),
('Feijão encarnado cozido (lata 520g)', 'enlatados', 1.19, 'lata', sm_continente, 'CAMTIL (base)', 'escorrido'),
('Feijão frade cozido (lata 520g)', 'enlatados', 1.19, 'lata', sm_continente, 'CAMTIL (base)', 'escorrido'),
('Leite condensado (lata 397g)', 'enlatados', 1.45, 'lata', sm_continente, 'CAMTIL (base)', NULL),
('Milho (lata 285g)', 'enlatados', 1.15, 'lata', sm_continente, 'CAMTIL (base)', 'escorrido'),
('Pesto (frasco)', 'enlatados', 1.69, 'frasco', sm_pingodoce, 'CAMTIL (base)', 'mais barato no Pingo Doce'),
('Polpa de manga (860g)', 'enlatados', 3.29, 'lata', sm_continente, 'CAMTIL (base)', NULL),
('Salsichas (lata 10un)', 'enlatados', 1.19, 'lata', sm_continente, 'CAMTIL (base)', NULL),
('Grão de bico (lata 830g)', 'enlatados', 1.19, 'lata', sm_continente, 'CAMTIL (base)', NULL),
('Leite de coco (lata 400ml)', 'enlatados', 1.39, 'lata', sm_continente, 'CAMTIL (base)', NULL),
('Atum ao natural (lata 270g)', 'enlatados', 2.69, 'lata', sm_continente, 'CAMTIL (base)', 'peso escorrido'),
('Tomate pelado (lata 480g)', 'enlatados', 1.29, 'lata', sm_continente, 'CAMTIL (base)', 'escorrido'),
('Edamame (lata pequena)', 'enlatados', 1.59, 'lata', sm_continente, 'CAMTIL (base)', NULL),
('Ananás (lata grande)', 'enlatados', 2.19, 'lata', sm_continente, 'CAMTIL (base)', NULL),
-- FRUTAS/LEGUMES
('Alface', 'frutas_legumes', 0.59, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Alho (pacote ~7)', 'frutas_legumes', 1.99, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Alho-francês', 'frutas_legumes', 2.82, 'kg', sm_continente, 'CAMTIL (base)', 'unidade ~100g'),
('Cebola (pacote 2kg ~15)', 'frutas_legumes', 3.34, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Cenouras (pacote ~10)', 'frutas_legumes', 1.22, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Courgette', 'frutas_legumes', 0.75, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Pimento (~350g)', 'frutas_legumes', 0.90, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Maçã', 'frutas_legumes', 1.59, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Melancia (~5kg)', 'frutas_legumes', 4.45, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Melão', 'frutas_legumes', 5.00, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Tomate', 'frutas_legumes', 1.99, 'kg', sm_continente, 'CAMTIL (base)', 'unidade ~250g'),
('Salsa (molho 50g)', 'frutas_legumes', 0.89, 'molho', sm_continente, 'CAMTIL (base)', NULL),
('Coentros (50g)', 'frutas_legumes', 0.99, 'molho', sm_continente, 'CAMTIL (base)', NULL),
('Limão', 'frutas_legumes', 0.36, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Abóbora manteiga', 'frutas_legumes', 1.60, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Cebola roxa', 'frutas_legumes', 0.29, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Pepino', 'frutas_legumes', 0.52, 'un', sm_continente, 'CAMTIL (base)', NULL),
-- LACTICÍNIOS
('Leite (1L)', 'lacticinios', 0.78, 'L', sm_continente, 'CAMTIL (base)', NULL),
('Manteiga (250g)', 'lacticinios', 1.87, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Natas culinária (200ml)', 'lacticinios', 0.72, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Natas para bater (200ml)', 'lacticinios', 0.76, 'un', sm_continente, 'CAMTIL (base)', NULL),
-- LIMPEZA/HIGIENE
('Desinfetante mãos (500ml)', 'limpeza', 2.89, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Detergente loiça (1L)', 'limpeza', 0.99, 'L', sm_continente, 'CAMTIL (base)', NULL),
('Toalhitas cozinha', 'limpeza', 1.49, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Esfregões (pack 3)', 'limpeza', 0.45, 'pack', sm_continente, 'CAMTIL (base)', NULL),
('Panos amarelos (6un)', 'limpeza', 1.09, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Papel cozinha (2 rolos)', 'limpeza', 1.19, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Papel higiénico (60 rolos)', 'limpeza', 11.15, 'pack', sm_continente, 'CAMTIL (base)', 'pack poupança'),
('Papel prata (30m)', 'limpeza', 2.49, 'rolo', sm_continente, 'CAMTIL (base)', NULL),
('Sacos plástico congelar (50un)', 'limpeza', 1.19, 'pacote', sm_continente, 'CAMTIL (base)', '3L'),
('Sacos do lixo 50L (3x15)', 'limpeza', 3.79, 'pack', sm_continente, 'CAMTIL (base)', NULL),
('Spray limpa tudo', 'limpeza', 2.29, 'un', sm_continente, 'CAMTIL (base)', NULL),
-- MERCEARIA
('Açúcar (1kg)', 'mercearia', 1.39, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Arroz vaporizado (1kg)', 'mercearia', 1.23, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Arroz risotto (1kg)', 'mercearia', 2.10, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Batata palha (400g)', 'mercearia', 1.99, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Batatas fritas lisas (185-200g)', 'mercearia', 1.25, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Bolachas Maria (4 pacotes)', 'mercearia', 1.89, 'conjunto', sm_continente, 'CAMTIL (base)', NULL),
('Bolachas tostadas (4 pacotes)', 'mercearia', 1.79, 'conjunto', sm_continente, 'CAMTIL (base)', NULL),
('Café moagem (250g)', 'mercearia', 1.79, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Chá (25un)', 'mercearia', 0.79, 'caixa', sm_continente, 'CAMTIL (base)', NULL),
('Chocolate Nesquik (800g)', 'mercearia', 3.49, 'un', sm_pingodoce, 'CAMTIL (base)', 'mais barato no Pingo Doce'),
('Chocolate tablete (100g)', 'mercearia', 0.69, 'tablete', sm_continente, 'CAMTIL (base)', NULL),
('Esparguete (1kg)', 'mercearia', 1.21, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Couscous (250g)', 'mercearia', 0.59, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Filipinos (pacote)', 'mercearia', 0.75, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Gaspacho (1L)', 'mercearia', 1.69, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Marmelada (900g)', 'mercearia', 2.69, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Massa espiral (500g)', 'mercearia', 0.83, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Massa para canja (pacotinho)', 'mercearia', 0.55, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Milho pipocas (250g)', 'mercearia', 0.39, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Nutella (uni)', 'mercearia', 2.45, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Óleo (1L)', 'mercearia', 1.45, 'L', sm_continente, 'CAMTIL (base)', NULL),
('Ovos', 'mercearia', 0.195, 'un', sm_continente, 'CAMTIL (base)', '~2.34/dúzia'),
('Pão', 'padaria', 0.14, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Pão de forma (375g ~15 fatias)', 'padaria', 1.78, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Pão ralado (300g)', 'mercearia', 0.60, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Farinha (1kg)', 'mercearia', 0.62, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Rebuçados (250g)', 'mercearia', 1.39, 'saco', sm_continente, 'CAMTIL (base)', NULL),
('Sopa canja (pó)', 'mercearia', 0.99, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Sopa cogumelos (pó)', 'mercearia', 0.89, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Sopa cebola (pó)', 'mercearia', 0.89, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Sopa marisco (pó)', 'mercearia', 0.89, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Sopa rabo de boi (pó)', 'mercearia', 0.89, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Sopa tomate (pó)', 'mercearia', 1.34, 'pacote', sm_continente, 'CAMTIL (base)', 'Maggi'),
('Sopa espargos (pó)', 'mercearia', 0.99, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Sopa legumes (pó)', 'mercearia', 0.99, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Puré de batata (500g)', 'mercearia', 2.29, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Vinho branco (1L)', 'bebidas', 0.85, 'L', sm_continente, 'CAMTIL (base)', 'culinária'),
('Cereais Chocapic (1kg)', 'mercearia', 2.99, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Soja fina (400g)', 'mercearia', 1.89, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Gomas ursinhos (300g)', 'mercearia', 1.49, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Palmiers (400g)', 'mercearia', 4.00, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
-- MOLHOS
('Azeite (3L)', 'temperos', 17.69, 'garrafa', sm_continente, 'CAMTIL (base)', NULL),
('Ketchup (560g)', 'temperos', 1.29, 'frasco', sm_continente, 'CAMTIL (base)', 'Top Down'),
('Maionese (470g)', 'temperos', 1.59, 'frasco', sm_continente, 'CAMTIL (base)', 'Top Down'),
('Polpa de tomate (1kg)', 'temperos', 1.99, 'garrafa', sm_continente, 'CAMTIL (base)', NULL),
('Molho Sriracha (frasco)', 'temperos', 1.49, 'frasco', sm_continente, 'CAMTIL (base)', NULL),
('Vinagre balsâmico (500ml)', 'temperos', 1.99, 'garrafa', sm_continente, 'CAMTIL (base)', NULL),
-- PEIXARIA
('Atum ao natural (por kg)', 'peixaria', 9.59, 'kg', sm_continente, 'CAMTIL (base)', 'escorrido, latas 270g'),
('Preparado marisco congelado (400g)', 'peixaria', 3.76, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Miolo camarão (250g)', 'peixaria', 3.49, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Delícias do mar congeladas (250g)', 'peixaria', 1.21, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
-- TALHO
('Bifanas', 'talho', 6.59, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Bife de vaca', 'talho', 12.25, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Bifes de peru', 'talho', 7.99, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Carne de porco (rojões)', 'talho', 5.08, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Carne porco picada', 'talho', 7.98, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Carne vaca picada', 'talho', 9.43, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Frango inteiro', 'talho', 2.34, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Peito de frango', 'talho', 6.59, 'kg', sm_continente, 'CAMTIL (base)', NULL),
-- TEMPEROS
('Caldos Knorr carne (24un)', 'temperos', 1.29, 'caixa', sm_continente, 'CAMTIL (base)', NULL),
('Caldos Knorr legumes (12un)', 'temperos', 0.99, 'caixa', sm_continente, 'CAMTIL (base)', NULL),
('Caldos Knorr galinha (12un)', 'temperos', 0.99, 'caixa', sm_continente, 'CAMTIL (base)', NULL),
('Louro (10g)', 'temperos', 0.69, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Molho francesinha (500g)', 'temperos', 1.99, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Orégãos (10g)', 'temperos', 0.49, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
('Pimenta (50g)', 'temperos', 0.79, 'saqueta', sm_continente, 'CAMTIL (base)', NULL),
('Sal grosso (1kg)', 'temperos', 0.25, 'kg', sm_continente, 'CAMTIL (base)', NULL),
('Caril (frasco)', 'temperos', 0.69, 'frasco', sm_continente, 'CAMTIL (base)', NULL),
('Açafrão (pacote)', 'temperos', 0.59, 'pacote', sm_continente, 'CAMTIL (base)', NULL),
-- OUTROS
('Sumo de laranja (1.5L)', 'bebidas', 1.39, 'un', sm_continente, 'CAMTIL (base)', NULL),
('Cerveja', 'bebidas', 1.19, 'L', sm_continente, 'CAMTIL (base)', NULL);

END $$;

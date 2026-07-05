-- ============================================
-- seed_precos_referencia.sql — Preços de Referência CAMTIL
-- Preços recolhidos no Continente / Pingo Doce, Julho 2023.
-- campo_id = NULL = preço de referência global (não ligado a um campo).
-- Idempotente: apaga e reinsere (campo_id IS NULL).
-- ============================================

-- Corre migration 003 primeiro:
-- ALTER TABLE campo_precos ALTER COLUMN campo_id DROP NOT NULL;

DELETE FROM campo_precos WHERE campo_id IS NULL;

INSERT INTO campo_precos (campo_id, item, categoria, preco, unidade, fornecedor, notas) VALUES

-- ============ TALHO ============
(NULL, 'Peito de frango',         'Talho',           4.99, 'kg',  'Continente',    'Preço médio, embalagem 1kg'),
(NULL, 'Frango inteiro',          'Talho',           2.29, 'kg',  'Continente',    'Frango do campo ~1.5kg'),
(NULL, 'Carne picada de vaca',    'Talho',           6.99, 'kg',  'Continente',    'Embalagem 500g'),
(NULL, 'Costelinha de porco',     'Talho',           4.49, 'kg',  'Continente',    ''),
(NULL, 'Salsichas (Frankfurt)',   'Talho',           3.29, 'kg',  'Continente',    'Embalagem 300g'),
(NULL, 'Bifanas (porco)',         'Talho',           5.99, 'kg',  'Continente',    'Para bifanas de campo'),
(NULL, 'Hambúrguer de vaca',      'Talho',           7.49, 'kg',  'Continente',    'Embalagem 4 unidades'),
(NULL, 'Frango inteiro congelado','Talho',           2.49, 'kg',  'Lidl',          'Lidl — muito mais barato'),

-- ============ PEIXARIA ============
(NULL, 'Atum em lata (80g)',      'Peixaria',        0.79, 'un',  'Continente',    'Marca branca'),
(NULL, 'Atum em lata (1.8kg)',    'Peixaria',        8.99, 'un',  'Metro',         'Lata hostelaria — muito melhor valor'),
(NULL, 'Sardinha em lata',        'Peixaria',        1.29, 'un',  'Continente',    'Lata 125g escorrido'),
(NULL, 'Bacalhau salgado seco',   'Peixaria',        9.99, 'kg',  'Continente',    'Partido grosso'),
(NULL, 'Carapau congelado',       'Peixaria',        2.99, 'kg',  'Continente',    'Para fritar'),
(NULL, 'Filetes de pescada',      'Peixaria',        5.49, 'kg',  'Continente',    'Congelados Iglo'),

-- ============ PADARIA ============
(NULL, 'Pão de forma',            'Padaria',         1.49, 'un',  'Continente',    'Embalagem 500g, ~20 fatias'),
(NULL, 'Pão de cachorro (8un)',   'Padaria',         1.19, 'un',  'Continente',    'Saco de 8 pães'),
(NULL, 'Pão de mistura',          'Padaria',         0.79, 'kg',  'Padaria local', 'Preço por kg, pão inteiro'),
(NULL, 'Tostas/tostas finas',     'Padaria',         1.89, 'un',  'Continente',    'Embalagem 200g'),
(NULL, 'Croissant (saco)',        'Padaria',         2.49, 'un',  'Continente',    'Saco 6 unidades'),

-- ============ FRUTAS/LEGUMES ============
(NULL, 'Batata',                  'Frutas/Legumes',  0.49, 'kg',  'Continente',    'Rede 5kg = 2.45€'),
(NULL, 'Cebola',                  'Frutas/Legumes',  0.59, 'kg',  'Continente',    'Rede 1kg'),
(NULL, 'Alho (cabeça)',           'Frutas/Legumes',  0.49, 'un',  'Continente',    'Cabeça grande'),
(NULL, 'Alho-francês',            'Frutas/Legumes',  1.29, 'kg',  'Continente',    'Por unidade ~0.45€'),
(NULL, 'Cenoura',                 'Frutas/Legumes',  0.69, 'kg',  'Continente',    'Saco 1kg'),
(NULL, 'Pimento vermelho',        'Frutas/Legumes',  1.99, 'kg',  'Continente',    ''),
(NULL, 'Pimento verde',           'Frutas/Legumes',  1.49, 'kg',  'Continente',    ''),
(NULL, 'Curgete',                 'Frutas/Legumes',  1.29, 'kg',  'Continente',    ''),
(NULL, 'Tomate',                  'Frutas/Legumes',  1.49, 'kg',  'Continente',    'Tomate cacho'),
(NULL, 'Alface',                  'Frutas/Legumes',  0.89, 'un',  'Continente',    'Cabeça inteira'),
(NULL, 'Banana',                  'Frutas/Legumes',  1.29, 'kg',  'Continente',    ''),
(NULL, 'Maçã',                    'Frutas/Legumes',  1.49, 'kg',  'Continente',    'Fuji ou Golden'),
(NULL, 'Pêra',                    'Frutas/Legumes',  1.79, 'kg',  'Continente',    ''),
(NULL, 'Laranja',                 'Frutas/Legumes',  0.99, 'kg',  'Continente',    'Rede 2kg = 1.98€'),
(NULL, 'Melancia',                'Frutas/Legumes',  0.49, 'kg',  'Continente',    'Inteira ~8kg = ~4€'),
(NULL, 'Salsa (molho)',           'Frutas/Legumes',  0.39, 'un',  'Continente',    'Molhinho fresco'),
(NULL, 'Cogumelos',               'Frutas/Legumes',  2.49, 'kg',  'Continente',    'Embalagem 500g = 1.25€'),

-- ============ DESPENSA ============
(NULL, 'Arroz agulha',            'Despensa',        0.89, 'kg',  'Continente',    'Marca branca, saco 1kg'),
(NULL, 'Esparguete',              'Despensa',        0.79, 'kg',  'Continente',    'Marca branca, embalagem 500g'),
(NULL, 'Massa cotovelinhos',      'Despensa',        0.79, 'kg',  'Continente',    'Marca branca, embalagem 500g'),
(NULL, 'Massa penne',             'Despensa',        0.89, 'kg',  'Continente',    'Marca branca, embalagem 500g'),
(NULL, 'Couscous',                'Despensa',        1.49, 'kg',  'Continente',    'Embalagem 500g'),
(NULL, 'Esparguete de arroz',     'Despensa',        2.29, 'kg',  'Continente',    'Para Pad Thai, embalagem 400g'),
(NULL, 'Feijão (lata 400g)',      'Despensa',        0.79, 'un',  'Continente',    'Marca branca — vermelho ou manteiga'),
(NULL, 'Grão de bico (lata)',     'Despensa',        0.79, 'un',  'Continente',    'Lata 400g escorrido'),
(NULL, 'Lentilhas',               'Despensa',        1.19, 'kg',  'Continente',    'Embalagem 500g'),
(NULL, 'Tomate pelado (lata)',    'Despensa',        0.59, 'un',  'Continente',    'Lata 400g marca branca'),
(NULL, 'Passata de tomate',       'Despensa',        1.29, 'un',  'Continente',    'Garrafa 680g Cirio'),
(NULL, 'Concentrado de tomate',   'Despensa',        0.89, 'un',  'Continente',    'Tubo 200g'),
(NULL, 'Óleo vegetal',            'Despensa',        1.99, 'L',   'Continente',    'Garrafa 1L girassol'),
(NULL, 'Azeite virgem extra',     'Despensa',        4.99, 'L',   'Continente',    'Garrafa 750ml = 6.65€/L'),
(NULL, 'Vinagre',                 'Despensa',        0.69, 'L',   'Continente',    'Garrafa 750ml'),
(NULL, 'Sal grosso',              'Despensa',        0.39, 'kg',  'Continente',    'Embalagem 1kg'),
(NULL, 'Açúcar',                  'Despensa',        0.99, 'kg',  'Continente',    'Embalagem 1kg'),
(NULL, 'Farinha de trigo',        'Despensa',        0.89, 'kg',  'Continente',    'Embalagem 1kg'),
(NULL, 'Molho de soja',           'Despensa',        2.49, 'un',  'Continente',    'Garrafa 250ml Kikkoman'),
(NULL, 'Ketchup',                 'Despensa',        1.99, 'un',  'Continente',    'Heinz 570g'),
(NULL, 'Mostarda',                'Despensa',        1.29, 'un',  'Continente',    'Frasco 215g'),
(NULL, 'Molho pesto',             'Despensa',        2.99, 'un',  'Continente',    'Barilla 190g'),
(NULL, 'Maionese',                'Despensa',        2.49, 'un',  'Continente',    'Hellmann''s 400ml'),
(NULL, 'Bolacha Maria (400g)',    'Despensa',        1.19, 'un',  'Continente',    'Embalagem 400g'),
(NULL, 'Bolacha Oreo',            'Despensa',        2.29, 'un',  'Continente',    'Embalagem 154g'),
(NULL, 'Leite condensado',        'Despensa',        1.89, 'un',  'Continente',    'Lata 397g Nestlé'),
(NULL, 'Batata palha (500g)',     'Despensa',        1.69, 'un',  'Continente',    'Ruffles ou marca branca'),
(NULL, 'Amendoim torrado',        'Despensa',        1.99, 'un',  'Continente',    'Embalagem 250g'),
(NULL, 'Azeitona preta (lata)',   'Despensa',        1.49, 'un',  'Continente',    'Lata 185g escorrido'),

-- ============ LATICÍNIOS ============
(NULL, 'Leite UHT (1L)',          'Laticínios',      0.89, 'un',  'Continente',    'Marca branca — melhor compra para campo'),
(NULL, 'Iogurte natural (4pack)', 'Laticínios',      1.49, 'un',  'Continente',    'Pack 4x125g'),
(NULL, 'Iogurte de frutas',       'Laticínios',      0.35, 'un',  'Continente',    'Por unidade 125g'),
(NULL, 'Manteiga',                'Laticínios',      2.29, 'un',  'Continente',    'Embalagem 250g Mimosa'),
(NULL, 'Queijo flamengo fatiado', 'Laticínios',      3.99, 'un',  'Continente',    'Embalagem 150g'),
(NULL, 'Queijo ralado',           'Laticínios',      3.49, 'un',  'Continente',    'Embalagem 200g mistura'),
(NULL, 'Queijo parmesão ralado',  'Laticínios',      4.99, 'un',  'Continente',    'Embalagem 80g Grana Padano'),
(NULL, 'Natas (200ml)',           'Laticínios',      0.99, 'un',  'Continente',    'Embalagem 200ml'),
(NULL, 'Fiambre (200g)',          'Laticínios',      1.99, 'un',  'Continente',    'Embalagem 200g fatiado'),
(NULL, 'Ovos (M, 10un)',          'Laticínios',      1.89, 'un',  'Continente',    'Caixa 10 ovos M'),

-- ============ OUTRO ============
(NULL, 'Açúcar mascavado',        'Outro',           2.49, 'kg',  'Continente',    'Para receitas doces'),
(NULL, 'Chocolate em pó',         'Outro',           3.99, 'un',  'Continente',    'Nestlé 500g'),
(NULL, 'Nescafé',                 'Outro',           5.99, 'un',  'Continente',    'Frasco 200g'),
(NULL, 'Chá de limão',            'Outro',           1.29, 'un',  'Continente',    'Caixa 20 saquetas'),
(NULL, 'Sumo (brick 200ml)',      'Outro',           0.35, 'un',  'Continente',    'Compal brick individual'),
(NULL, 'Água (5L)',               'Outro',           0.49, 'un',  'Continente',    'Garrafa 5L marca branca'),
(NULL, 'Coca-Cola (1.5L)',        'Outro',           1.49, 'un',  'Continente',    'Para dias especiais'),
(NULL, 'Gelado (2L balde)',       'Outro',           4.99, 'un',  'Continente',    'Balde 2L baunilha Olá');

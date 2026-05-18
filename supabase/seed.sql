-- ============================================================
-- App Direção Campo — Seed dos Campos Verão 2026
-- Colar no Supabase SQL Editor APÓS executar schema.sql
-- ============================================================

insert into campos (nome, escalao, datas, pre_campo, local, saldo_inicial, periodo, ano, setup_completo)
values
  -- Período 1
  ('Tremelgas I',   'Tremelga', '17 – 26 Jul',    '14, 15, 16 Jul',  'Valbom dos Figos', 3400, 1, 2026, false),
  ('Aranhiços I',   'Aranhiço', '17 – 26 Jul',    '14, 15, 16 Jul',  'Dornelas',         3280, 1, 2026, false),
  -- Período 2
  ('Melgas I',      'Melga',    '28 Jul – 6 Ago',  '26, 27 Jul',      'Valbom dos Figos', 3400, 2, 2026, false),
  ('Aranhiços II',  'Aranhiço', '28 Jul – 6 Ago',  '26, 27 Jul',      'Dornelas',         3280, 2, 2026, false),
  ('Mosquitos I',   'Mosquito', '30 Jul – 6 Ago',  '27, 28, 29 Jul',  'Abrantes',         2930, 2, 2026, false),
  -- Período 3
  ('Camaleões',     'Camaleão', '8 – 17 Ago',      '6, 7 Ago',        'Valbom dos Figos', 3630, 3, 2026, false),
  ('Melgas II',     'Melga',    '8 – 17 Ago',      '6, 7 Ago',        'Dornelas',         3400, 3, 2026, false),
  ('Aranhiços III', 'Aranhiço', '8 – 17 Ago',      '6, 7 Ago',        'Abrantes',         3280, 3, 2026, false),
  -- Período 4
  ('Tremelgas II',  'Tremelga', '19 – 28 Ago',     '17, 18 Ago',      'Valbom dos Figos', 3400, 4, 2026, false),
  ('Melgas III',    'Melga',    '19 – 28 Ago',     '17, 18 Ago',      'Dornelas',         3400, 4, 2026, false),
  ('Mosquitos II',  'Mosquito', '19 – 26 Ago',     '17, 18 Ago',      'Abrantes',         2930, 4, 2026, false)
on conflict (nome) do nothing;

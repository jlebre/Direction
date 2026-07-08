-- Seed: Receitas de sopa oficiais
-- Idempotente — usa ON CONFLICT DO NOTHING

-- O índice único é parcial: (nome) WHERE is_oficial = true
-- Por isso usa INSERT ... SELECT ... WHERE NOT EXISTS em vez de ON CONFLICT
INSERT INTO receitas (nome, categoria, descricao, is_oficial)
SELECT nome, categoria, descricao, is_oficial FROM (VALUES
  ('Sopa de legumes',    'sopa'::categoria_receita, 'Sopa de legumes variados — cenoura, alho francês, courgette e batata.',    true),
  ('Sopa de massa',      'sopa'::categoria_receita, 'Sopa de massa com legumes — tomate, cebola, cenoura e cotovelos.',          true),
  ('Canja de galinha',   'sopa'::categoria_receita, 'Canja de galinha com arroz, simples e reconfortante.',                      true),
  ('Caldo verde',        'sopa'::categoria_receita, 'Caldo verde tradicional com chouriço, couve cortada fina e batata.',        true),
  ('Sopa de feijão',     'sopa'::categoria_receita, 'Sopa de feijão encarnado com legumes e chouriço.',                         true),
  ('Sopa de tomate',     'sopa'::categoria_receita, 'Sopa de tomate fresco com cebola, alho e ovo escalfado.',                  true),
  ('Creme de cenoura',   'sopa'::categoria_receita, 'Creme de cenoura com gengibre — suave e ligeiramente adocicado.',          true)
) AS v(nome, categoria, descricao, is_oficial)
WHERE NOT EXISTS (
  SELECT 1 FROM receitas r WHERE r.nome = v.nome AND r.is_oficial = true
);

-- Criar versão Default para cada sopa sem versão
INSERT INTO receita_versoes (receita_id, nome_versao, is_default, estado)
SELECT r.id, 'Default', true, 'completa'
FROM receitas r
WHERE r.categoria = 'sopa'
  AND r.is_oficial = true
  AND NOT EXISTS (
    SELECT 1 FROM receita_versoes rv
    WHERE rv.receita_id = r.id AND rv.is_default = true
  );

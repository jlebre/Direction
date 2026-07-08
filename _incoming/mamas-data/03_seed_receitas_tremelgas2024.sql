-- ============================================
-- 03_seed_receitas_tremelgas2024.sql
-- 18 receitas novas extraídas do Plano de Refeições Tremelgas I 2024
-- (campo real de 10 dias, 58-60 pessoas)
-- Corre DEPOIS do schema de receitas existir.
-- Idempotente. Quantidades para escalão Tremelgas (~58-60 pax) nas 3 colunas
-- ajustadas proporcionalmente: Mosquitos -10%, Aranh/Melgas base, Cam/Trem +5%.
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS receitas_nome_is_oficial_idx ON receitas(nome) WHERE is_oficial = true;

-- Função helper: cria ingrediente (se não existir) e liga-o à receita.
-- Criada ANTES do bloco DO. Pode ser removida no final (ver última linha).
CREATE OR REPLACE FUNCTION add_ing(
  rid UUID, nome_ing TEXT, cat TEXT, unid TEXT, arm TEXT,
  qm NUMERIC, qam NUMERIC, qct NUMERIC, un_rec TEXT, notas_rec TEXT DEFAULT NULL
) RETURNS void AS $inner$
DECLARE iid UUID;
BEGIN
  INSERT INTO ingredientes (nome, categoria_supermercado, unidade_base, tipo_armazenamento)
  VALUES (nome_ing, cat, unid, arm) ON CONFLICT (nome) DO NOTHING;
  SELECT id INTO iid FROM ingredientes WHERE nome = nome_ing;
  INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade_mosquitos, quantidade_aranh_melgas, quantidade_cam_trem, unidade, notas)
  VALUES (rid, iid, qm, qam, qct, un_rec, notas_rec) ON CONFLICT (receita_id, ingrediente_id) DO NOTHING;
END;
$inner$ LANGUAGE plpgsql;

DO $$
DECLARE
  r_id UUID;
  i_id UUID;
BEGIN

-- ========== 1. FRANGO TERIYAKI ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Frango Teriyaki', 'frango',
 'Frango salteado em molho teriyaki caseiro (soja, açúcar, vinagre) com brócolos e arroz.',
 E'1. Fazer o arroz.\n2. Temperar o frango com sal e pimenta.\n3. Cozer os brócolos (pouco!).\n4. Aquecer óleo numa frigideira grande e cozinhar o frango até dourar.\n5. Misturar numa taça a soja, açúcar e vinagre.\n6. Juntar o alho à frigideira e deixar aromatizar.\n7. Juntar o molho e deixar reduzir até cobrir o frango e brócolos.',
 'O molho teriyaki caseiro (soja+açúcar+vinagre) sai muito mais barato que comprado. Não cozer demais os brócolos.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Frango Teriyaki' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Arroz','massas_arroz','kg','despensa',5,5.5,6,'kg');
PERFORM add_ing(r_id,'Peito de frango','talho','kg','fresco_diario',3.5,4,4.5,'kg');
PERFORM add_ing(r_id,'Molho de soja','temperos','L','despensa',0.8,1,1,'frasco','4 frascos');
PERFORM add_ing(r_id,'Açúcar','mercearia','kg','despensa',0.4,0.4,0.4,'kg');
PERFORM add_ing(r_id,'Vinagre de maçã','temperos','L','despensa',0.5,0.5,0.5,'L');
PERFORM add_ing(r_id,'Alho','frutas_legumes','un','despensa',18,20,20,'dente');
PERFORM add_ing(r_id,'Brócolos congelados','congelados','kg','casa_apoio',3,4,4,'pacote');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',10,12,12,'un');

-- ========== 2. MASSA DE LEGUMES ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Massa de Legumes', 'massa',
 'Massa fusilli com chouriço, courgette, cenoura e cogumelos em molho de natas.',
 E'1. Cozer a massa.\n2. Cortar o chouriço aos cubinhos e fritar.\n3. Refogar as courgettes e as cenouras.\n4. Adicionar os cogumelos.\n5. Numa panela, dissolver os caldos em 2L de água.\n6. Adicionar natas aos legumes e depois os caldos dissolvidos.\n7. Misturar tudo com a massa.',
 'Para reduzir natas: usar leite + farinha maizena (béchamel leve) fica mais barato e leve. Ou triturar courgette extra para dar cremosidade.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Massa de Legumes' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Massa fusilli','massas_arroz','kg','despensa',5,6,6,'kg');
PERFORM add_ing(r_id,'Courgette','frutas_legumes','un','fresco_diario',10,12,12,'un');
PERFORM add_ing(r_id,'Cenoura','frutas_legumes','kg','fresco_diario',1.5,2,2,'kg');
PERFORM add_ing(r_id,'Chouriço','charcutaria','un','despensa',2,2.5,2.5,'kg');
PERFORM add_ing(r_id,'Cogumelos em lata','enlatados','lata','despensa',6,8,8,'lata');
PERFORM add_ing(r_id,'Natas','lacticinios','L','fresco_diario',8,10,10,'pacote');
PERFORM add_ing(r_id,'Caldo de carne (cubo)','temperos','un','despensa',5,6,6,'un');

-- ========== 3. RAGÚ ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Ragú', 'massa',
 'Molho rico de carne de porco picada, chouriço e tomate, servido com massa.',
 E'1. Cobrir o fundo do tacho com cebola e alho picados.\n2. Deitar azeite e juntar caldos.\n3. Deixar apurar o refogado.\n4. Juntar a carne e deixar fritar, mexendo sempre.\n5. Juntar vinho branco.\n6. Quando a carne estiver cozinhada, juntar a polpa e o tomate pelado.\n7. Servir com massa.',
 'A soja hidratada estica a carne e reduz custo. Deixar apurar bem para o molho encorpar.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Ragú' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Carne de porco picada','talho','kg','fresco_diario',1.5,2,2.5,'kg');
PERFORM add_ing(r_id,'Massa fusilli','massas_arroz','kg','despensa',5,6,6,'kg');
PERFORM add_ing(r_id,'Chouriço','charcutaria','un','despensa',5,6,6,'un');
PERFORM add_ing(r_id,'Tomate pelado (lata)','enlatados','lata','despensa',5,6,6,'lata');
PERFORM add_ing(r_id,'Polpa de tomate','temperos','kg','despensa',2.5,3,3,'garrafa');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',10,12,12,'un');
PERFORM add_ing(r_id,'Vinho branco','bebidas','L','despensa',0.4,0.5,0.5,'copo','1-2 copos');

-- ========== 4. STROGANOFF ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Stroganoff de Peru', 'carne',
 'Bifes de peru em molho cremoso de cogumelos e natas, com arroz e brócolos.',
 E'1. Cortar e temperar os bifes com sal, pimenta, alho e vinho branco.\n2. Num tacho, refogado de azeite e cebola.\n3. Juntar a carne.\n4. Juntar cogumelos.\n5. Adicionar natas e leite + farinha maizena para engrossar.\n6. Deixar ferver e temperar o molho a gosto.\n7. Fazer o arroz à parte.',
 'O leite + maizena permite cortar as natas a meio (10 pacotes é muito!). Fica mais leve e barato.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Stroganoff de Peru' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Arroz','massas_arroz','kg','despensa',5,5.5,6,'kg');
PERFORM add_ing(r_id,'Bifes de peru','talho','kg','fresco_diario',3.5,4,4.5,'kg');
PERFORM add_ing(r_id,'Cogumelos em lata','enlatados','lata','despensa',6,8,8,'lata');
PERFORM add_ing(r_id,'Natas','lacticinios','L','fresco_diario',8,10,10,'pacote');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',15,17,17,'un');
PERFORM add_ing(r_id,'Farinha maizena','mercearia','kg','despensa',0.2,0.2,0.2,'pacote');
PERFORM add_ing(r_id,'Brócolos congelados','congelados','kg','casa_apoio',1.5,2,2,'kg');

-- ========== 5. PANADOS COM ARROZ DE TOMATE ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Panados com Arroz de Tomate', 'frango',
 'Bifes de frango panados e fritos, acompanhados de arroz de tomate malandro.',
 E'1. Fazer o arroz de tomate.\n2. Temperar os bifinhos com sal, alho, pimenta e limão. Marinar.\n3. Preparar 3 taças: farinha, ovos temperados, pão ralado.\n4. Passar cada bifinho pelas 3 taças.\n5. Fritar em óleo bem quente.\n6. Cortar os panados depois de fritos.',
 'Cortar os panados depois de fritos rende mais. O arroz de tomate quer-se malandro — não deixar secar.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Panados com Arroz de Tomate' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Peito de frango','talho','kg','fresco_diario',5,6,6.5,'kg','60 bifes');
PERFORM add_ing(r_id,'Arroz','massas_arroz','kg','despensa',5,6,6,'kg');
PERFORM add_ing(r_id,'Ovo','lacticinios','un','fresco_diario',18,20,22,'un');
PERFORM add_ing(r_id,'Pão ralado','mercearia','kg','despensa',6,8,8,'saco');
PERFORM add_ing(r_id,'Farinha','mercearia','kg','despensa',1,1,1,'pacote');
PERFORM add_ing(r_id,'Polpa de tomate','temperos','kg','despensa',2,2,2,'L');
PERFORM add_ing(r_id,'Tomate pelado (lata)','enlatados','lata','despensa',6,6,6,'lata');
PERFORM add_ing(r_id,'Óleo vegetal','temperos','L','despensa',5,6,6,'L');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',10,12,12,'un');

-- ========== 6. ARROZ DE ENCHIDOS ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Arroz de Enchidos', 'arroz_pure',
 'Arroz com chouriço, cenoura e ervilhas, opcionalmente com alheira.',
 E'1. Cortar aos cubinhos e fritar o chouriço (e alheira se usar).\n2. Refogar as cebolas e cenouras no mesmo sítio.\n3. Adicionar o arroz ao refogado e ao chouriço frito.\n4. Cozer o arroz; quando quase cozido, juntar as ervilhas.',
 'A alheira é opcional mas dá muito sabor. Cenoura ralada ou congelada funciona bem.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Arroz de Enchidos' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Arroz','massas_arroz','kg','despensa',5,6,6,'kg');
PERFORM add_ing(r_id,'Chouriço','charcutaria','un','despensa',8,10,10,'un');
PERFORM add_ing(r_id,'Cenoura','frutas_legumes','kg','fresco_diario',1.2,1.5,1.5,'kg','15 raladas');
PERFORM add_ing(r_id,'Ervilhas congeladas','congelados','kg','casa_apoio',2.5,3,3,'kg');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',8,10,10,'un');
PERFORM add_ing(r_id,'Alheira','charcutaria','un','fresco_diario',5,6,6,'un','opcional');

-- ========== 7. BIFANAS À MODA DO PORTO ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Bifanas à Moda do Porto', 'carne',
 'Bifanas de porco cozidas num molho rico de vinho, cerveja e especiarias. Servir com arroz e feijão preto.',
 E'1. Num tacho, azeite e óleo até cobrir o fundo.\n2. Juntar alho, louro, pimenta, colorau, mexendo em lume brando.\n3. Juntar vinho, cerveja, molho inglês, whisky e vinho do Porto + pouco sal.\n4. Levantar fervura e deitar a carne (sem tempero prévio).\n5. Regar com sumo de limão, juntar as metades a ferver.\n6. Ferver 15-20min até tenras. Retificar sal e picante.',
 'Todo o álcool vai para a panela — não leva água. Bastante colorau e picante fica melhor. Servir com arroz e feijão preto.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Bifanas à Moda do Porto' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Bifanas','talho','kg','fresco_diario',5,6,6.5,'kg');
PERFORM add_ing(r_id,'Vinho branco','bebidas','L','despensa',1.2,1.5,1.5,'L');
PERFORM add_ing(r_id,'Cerveja','bebidas','L','despensa',3,3,3,'un');
PERFORM add_ing(r_id,'Molho inglês (Worcester)','temperos','L','despensa',0.15,0.15,0.15,'dl');
PERFORM add_ing(r_id,'Alho','frutas_legumes','un','despensa',12,15,15,'dente');
PERFORM add_ing(r_id,'Arroz','massas_arroz','kg','despensa',5,6,6,'kg');
PERFORM add_ing(r_id,'Feijão preto (lata)','enlatados','lata','despensa',7,8,8,'lata');

-- ========== 8. LASANHA ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Lasanha', 'massa',
 'Lasanha de carne picada com molho de tomate, béchamel e queijo gratinado.',
 E'1. Refogar cebolas e alho picado.\n2. Adicionar a carne e depois a polpa de tomate.\n3. Retirar a mistura de carne.\n4. Camada de folhas de lasanha (já cozidas) no fundo.\n5. Cobrir com queijo ralado e béchamel.\n6. Camada de carne sobre o queijo.\n7. Repetir até acabar os ingredientes. Gratinar.',
 'Sem forno, cobrir com papel de alumínio — o vapor gratina o queijo. A soja estica a carne.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Lasanha' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Carne de porco picada','talho','kg','fresco_diario',1.2,1.5,2,'kg');
PERFORM add_ing(r_id,'Massa de lasanha','massas_arroz','kg','despensa',1.5,2,2,'caixa');
PERFORM add_ing(r_id,'Polpa de tomate','temperos','kg','despensa',1,1,1,'frasco');
PERFORM add_ing(r_id,'Queijo ralado','lacticinios','kg','fresco_diario',1.5,2,2,'pacote');
PERFORM add_ing(r_id,'Béchamel','mercearia','L','despensa',1,1,1,'pacote','500ml, ou fazer com leite+maizena');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',3,3,3,'un');

-- ========== 9. POKE BOWLS ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Poke Bowls', 'atum',
 'Taça havaiana de arroz avinagrado com atum, edamame, ananás, pepino e grão salteado.',
 E'1. Cozer o arroz carolino (de manhã).\n2. Dissolver o açúcar no vinagre ao lume e adicionar ao arroz frio.\n3. Cortar pepino e ananás em cubos, cebola em fatias finas.\n4. Pickle da cebola e pepino.\n5. Misturar o atum com maionese e sriracha.\n6. Saltear o grão com sal e paprika 10 min.\n7. Montar as taças.',
 'Receita de pré-campo (poucas pessoas). Boa para impressionar os animadores. O arroz avinagrado é a chave.',
 16, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Poke Bowls' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Arroz','massas_arroz','kg','despensa',1,1,1,'kg','carolino');
PERFORM add_ing(r_id,'Atum em lata','enlatados','lata','despensa',2,2,2,'lata');
PERFORM add_ing(r_id,'Edamame (lata)','enlatados','lata','despensa',1,1,1,'lata');
PERFORM add_ing(r_id,'Ananás (lata)','enlatados','lata','despensa',1,1,1,'lata');
PERFORM add_ing(r_id,'Pepino','frutas_legumes','un','fresco_diario',2,2,2,'un');
PERFORM add_ing(r_id,'Grão de bico (lata)','enlatados','lata','despensa',1,1,1,'lata');
PERFORM add_ing(r_id,'Cebola roxa','frutas_legumes','un','fresco_diario',2,2,2,'un');
PERFORM add_ing(r_id,'Molho Sriracha','temperos','frasco','despensa',1,1,1,'frasco');

-- ========== 10. MASSA GIGI HADID ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Massa Gigi Hadid', 'massa',
 'Massa penne em molho cremoso de tomate e vodka com chalota caramelizada e parmesão.',
 E'1. Cozer a massa penne; guardar uma concha da água.\n2. Saltear azeite, alho e chalota até caramelizar.\n3. Adicionar polpa de tomate, sal e pimenta; cozinhar 2 min.\n4. Juntar a vodka e deixar evaporar 1-2 min.\n5. Acrescentar natas e piri-piri.\n6. Envolver a massa e a manteiga.\n7. Adicionar água da cozedura para cremosidade. Terminar com parmesão.',
 'Receita de pré-campo. A vodka evapora — fica só o sabor. Água da cozedura é o segredo da cremosidade.',
 16, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Massa Gigi Hadid' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Massa penne','massas_arroz','kg','despensa',1,1,1,'kg');
PERFORM add_ing(r_id,'Polpa de tomate','temperos','kg','despensa',0.5,0.5,0.5,'frasco');
PERFORM add_ing(r_id,'Natas','lacticinios','L','fresco_diario',5,5,5,'pacote');
PERFORM add_ing(r_id,'Queijo parmesão','charcutaria','kg','fresco_diario',0.2,0.2,0.2,'pacote');
PERFORM add_ing(r_id,'Alho','frutas_legumes','un','despensa',8,8,8,'dente');
PERFORM add_ing(r_id,'Manteiga','lacticinios','kg','fresco_diario',0.125,0.125,0.125,'pacote');

-- ========== 11. HAMBÚRGUERES COM OVOS ROTOS ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Hambúrgueres com Ovos Rotos', 'carne',
 'Hambúrgueres caseiros servidos sobre batata palha com ovo estrelado e presunto.',
 E'1. Misturar carne, cebolas picadas, pão ralado e ovos.\n2. Fritar os hambúrgueres.\n3. Fazer ovos estrelados.\n4. Misturar batata palha com presunto cortado e ovos estrelados.',
 'Receita de pré-campo. A mistura carne picada 50/50 vaca/porco fica melhor.',
 16, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Hambúrgueres com Ovos Rotos' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Carne de vaca picada','talho','kg','fresco_diario',0.4,0.4,0.5,'kg');
PERFORM add_ing(r_id,'Carne de porco picada','talho','kg','fresco_diario',0.4,0.4,0.5,'kg');
PERFORM add_ing(r_id,'Ovo','lacticinios','un','fresco_diario',12,12,14,'un');
PERFORM add_ing(r_id,'Pão ralado','mercearia','kg','despensa',1,1,1,'pacote');
PERFORM add_ing(r_id,'Batata palha','mercearia','kg','despensa',2,2,2,'pacote');
PERFORM add_ing(r_id,'Presunto','charcutaria','kg','fresco_diario',0.25,0.25,0.25,'g','250g');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',2,2,2,'un');

-- ========== 12. SALADA DE COUSCOUS ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Salada de Couscous', 'salada',
 'Couscous frio com tomate, pepino, pimentos, ovo cozido e queijo feta.',
 E'1. Cozer o couscous em água com sal.\n2. Lavar bem os ovos e cozer com o couscous.\n3. Lavar e picar todos os vegetais.\n4. Descascar e picar os ovos.\n5. Cortar o feta em cubinhos.\n6. Misturar tudo e temperar com azeite e limão.',
 'Receita de pré-campo. Fresca e leve — boa para dias de calor. O feta faz a diferença.',
 16, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Salada de Couscous' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Couscous','massas_arroz','kg','despensa',0.75,0.75,0.75,'pacote','3 pacotes 250g');
PERFORM add_ing(r_id,'Tomate','frutas_legumes','kg','fresco_diario',0.5,0.5,0.5,'un','2 un');
PERFORM add_ing(r_id,'Pepino','frutas_legumes','un','fresco_diario',1,1,1,'un');
PERFORM add_ing(r_id,'Pimento','frutas_legumes','un','fresco_diario',2,2,2,'un');
PERFORM add_ing(r_id,'Ovo','lacticinios','un','fresco_diario',10,10,10,'un');
PERFORM add_ing(r_id,'Queijo feta','lacticinios','kg','fresco_diario',0.2,0.2,0.2,'un');
PERFORM add_ing(r_id,'Limão','frutas_legumes','un','despensa',2,2,2,'un');

-- ========== 13. RISOTTO ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Risotto', 'arroz_pure',
 'Arroz risotto cremoso com caldo, cebola e parmesão.',
 E'1. Refogar cebola picada em azeite/manteiga.\n2. Juntar o arroz risotto e deixar "tostar" 1-2 min.\n3. Adicionar o vinho branco e deixar evaporar.\n4. Ir juntando caldo quente aos poucos, mexendo sempre.\n5. Quando cremoso e al dente, juntar parmesão e manteiga.',
 'Receita de pré-campo. Exige mexer constante — não é para 60 pessoas. Caldo sempre quente.',
 16, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Risotto' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Arroz risotto','massas_arroz','kg','despensa',1.5,1.5,1.5,'kg');
PERFORM add_ing(r_id,'Cebola','frutas_legumes','un','despensa',3,3,3,'un');
PERFORM add_ing(r_id,'Queijo parmesão','charcutaria','kg','fresco_diario',0.2,0.2,0.2,'un');
PERFORM add_ing(r_id,'Caldo de galinha (cubo)','temperos','un','despensa',4,4,4,'un');
PERFORM add_ing(r_id,'Vinho branco','bebidas','L','despensa',0.3,0.3,0.3,'L');

-- ========== 14. SALADA DE ARROZ ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Salada de Arroz', 'salada',
 'Salada fria de arroz com frango desfiado, alface, beterraba e maçã.',
 E'1. Fazer arroz branco (logo de manhã), idealmente com a água de cozer o frango.\n2. Juntar todos os ingredientes bem lavados e cortados.\n3. Misturar o arroz com a maionese.',
 'Fazer o arroz com a água de cozer o frango dá mais sabor. Não usar cebola neste arroz.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Salada de Arroz' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Arroz','massas_arroz','kg','despensa',5,6,6,'kg');
PERFORM add_ing(r_id,'Peito de frango','talho','kg','fresco_diario',2.5,3,3,'kg');
PERFORM add_ing(r_id,'Alface','frutas_legumes','un','fresco_diario',10,12,12,'un');
PERFORM add_ing(r_id,'Beterraba (frasco)','enlatados','frasco','despensa',5,6,6,'frasco');
PERFORM add_ing(r_id,'Maçã','frutas_legumes','kg','fresco_diario',3.5,4,4,'kg');
PERFORM add_ing(r_id,'Maionese','temperos','frasco','despensa',5,6,6,'pacote');

-- ========== 15. CLUSTERS DE CORNFLAKES ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Clusters de Cornflakes', 'doce',
 'Bolinhas de cornflakes com chocolate derretido e mel. A sobremesa mais fácil do mundo.',
 E'1. Derreter o chocolate em banho-maria, mexendo para não queimar.\n2. Juntar o mel quando quase derretido.\n3. Deitar os cornflakes num alguidar e esmagá-los um pouco.\n4. Deitar o chocolate derretido e mexer bem.\n5. Espalhar numa camada fina para arrefecer.',
 'Fácil e muito boa — não comam muito antes do jantar! Camada fina arrefece mais rápido.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Clusters de Cornflakes' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Cornflakes','mercearia','kg','despensa',1,1,1,'embalagem');
PERFORM add_ing(r_id,'Chocolate de leite (tablete)','mercearia','tablete','despensa',4,4,4,'tablete');
PERFORM add_ing(r_id,'Chocolate culinária (tablete)','mercearia','tablete','despensa',4,4,4,'tablete');
PERFORM add_ing(r_id,'Mel','mercearia','kg','despensa',0.15,0.15,0.15,'un','6 colheres sopa');

-- ========== 16. MOUSSE DE MANGA ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Mousse de Manga', 'doce',
 'Mousse fresca de polpa de manga, leite condensado e iogurte natural.',
 E'1. Juntar a polpa de manga, o leite condensado e os iogurtes.\n2. Misturar bem.\n3. Deixar algum tempo no frigorífico antes de servir.',
 'Servir bem fresca. Pode substituir a manga por outra polpa de fruta.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Mousse de Manga' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Polpa de manga','enlatados','lata','despensa',4,4,4,'lata');
PERFORM add_ing(r_id,'Leite condensado','enlatados','lata','despensa',4,4,4,'lata');
PERFORM add_ing(r_id,'Iogurtes naturais','lacticinios','un','fresco_diario',16,16,16,'un');

-- ========== 17. MOUSSE DE FILIPINOS ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Mousse de Filipinos', 'doce',
 'Mousse rápida de bolachas Filipinos, leite condensado e natas.',
 E'1. Triturar os Filipinos (guardar alguns para decorar).\n2. Bater as natas.\n3. Misturar com o leite condensado e os Filipinos triturados.\n4. Decorar com Filipinos partidos. Refrigerar.',
 'Sobremesa de pré-campo. Simples e sempre um sucesso.',
 16, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Mousse de Filipinos' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Filipinos','mercearia','pacote','despensa',1,1,1,'pacote');
PERFORM add_ing(r_id,'Leite condensado','enlatados','lata','despensa',1,1,1,'lata');
PERFORM add_ing(r_id,'Natas','lacticinios','L','fresco_diario',2,2,2,'pacote');

-- ========== 18. PANQUECAS ==========
INSERT INTO receitas (nome, categoria, descricao, instrucoes, dicas_campo, pessoas_base, is_oficial) VALUES
('Panquecas', 'pequeno_almoco',
 'Panquecas fofas para um pequeno-almoço especial de campo.',
 E'1. Misturar a farinha, o açúcar e o sal.\n2. Juntar os ovos e o leite, batendo até ficar liso.\n3. Deixar a massa repousar.\n4. Fritar em frigideira levemente untada.\n5. Servir com marmelada, chocolate ou açúcar.',
 'Pequeno-almoço especial (ex: dia de anos). Fazer massa na véspera acelera a manhã.',
 58, true)
ON CONFLICT (nome) WHERE is_oficial = true DO NOTHING RETURNING id INTO r_id;
IF r_id IS NULL THEN SELECT id INTO r_id FROM receitas WHERE nome='Panquecas' AND is_oficial; END IF;
PERFORM add_ing(r_id,'Farinha','mercearia','kg','despensa',1.5,1.5,1.5,'kg');
PERFORM add_ing(r_id,'Açúcar','mercearia','kg','despensa',0.4,0.4,0.4,'kg');
PERFORM add_ing(r_id,'Ovo','lacticinios','un','fresco_diario',12,12,12,'un');
PERFORM add_ing(r_id,'Leite','bebidas_leite','L','despensa',2,2,2,'L');

END $$;

-- Limpar a função helper (opcional — descomenta se não a quiseres deixar na BD)
-- DROP FUNCTION IF EXISTS add_ing(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT);

// ============================================
// 04_dicas_content.ts
// Conteúdo estático das Dicas de Campo
// Compilado de: Livrinho da Mamã, Ser Mamã (Gambozinos),
// Caderno da Mamã (Campinácios), DICAS.docx, planos Tremelgas 2023/2024
//
// Colocar em: lib/dicas-content.ts  ou  data/dicas.ts
// Renderizar com Accordion (secções colapsáveis) na página /campo/[id]/dicas
// ============================================

export interface DicaSeccao {
  id: string;
  titulo: string;
  emoji: string;
  conteudo: string; // markdown-ish, usar whitespace-pre-line
}

export const DICAS: DicaSeccao[] = [
  {
    id: "timings",
    titulo: "Timings — Um dia na cozinha",
    emoji: "⏰",
    conteudo: `08h–09h · Ir buscar o pão. Dinamizar a equipa do pequeno-almoço.
09h–10h · Pequeno-almoço. Não esquecer o café!
10h–10h30 · Lavagem do PA. Adiantar o almoço — cortar o que dá mais trabalho. Ir buscar carne/fruta/frescos do dia.
10h30–12h · BDS. Temperar a carne. Arroz: refogado, fritar, juntar água.
12h–13h · Salada/tomate. Fazer os bifes. Revezar ida às atividades!
13h–14h · Almoço.
14h–15h · Sorna / Reunião (café). Pôr já água a ferver para a sopa do jantar.
15h30–16h30 · Fazer a sopa (fica-se com os bicos livres para o jantar).
16h30–17h30 · Cortar e refogar condimentos. Se avançado, ir às atividades!
17h30–18h · Lanche — sumo + restos de pão + bolachas Maria.
18h–19h · Se avançado, ir ao banho!
19h–20h · Celebração / Missa. Jantar em lume brando.
20h30–21h30 · Jantar — sopa e depois prato principal.
22h–23h30 · Café para os animadores.
23h30 · Aquecer água para o chá.
00h00 · Boa noite (reunião & mimos se houver).

⚠️ A cozinha marca o ritmo do dia! Um atraso na cozinha atrasa o dia todo.`
  },
  {
    id: "escaloes",
    titulo: "Idades dos escalões",
    emoji: "🎒",
    conteudo: `Mosquitos · 9/10 anos
Aranhiços · 11/12 anos
Melgas · 13/14 anos
Tremelgas · 15/16 anos
Camaleões · 17 anos

Cada escalão tem o seu campo próprio — não há campos mistos.
Os mais novos comem menos; os mais velhos comem mais. Ajustar quantidades.`
  },
  {
    id: "logistica",
    titulo: "Logística",
    emoji: "📋",
    conteudo: `• Dispensa no lugar mais fresco e à sombra. Perder tempo a arrumá-la bem compensa.
• Organizar a dispensa por dia e por refeição.
• Contar sempre com pelo menos 1 hora para cada refeição.
• Rever as refeições do dia seguinte todas as noites, com o adjunto.
• Ter a mamã ou uma tia responsável por cada refeição — os outros vão às atividades.
• Fazer o café quando a refeição está a meio.
• Delegar. Não querer ser responsável por tudo.
• Ter um/a tio/a "do café" — sempre café quentinho pronto.
• A sopa aguenta quente até ao jantar; a comida pode ficar pré-feita.
• Caneta de acetato para marcar sacos com o conteúdo.
• Separar as carnes em sacos por dia e refeição logo ao chegar do talho.
• Refeições à luz do dia! Os mais novos às escuras não comem.
• Desligar o gás ao fim da noite.
• Não se prendam à cozinha! BDS, jogos e banhos também são para vocês.`
  },
  {
    id: "piteu",
    titulo: "Segredos de um bom pitéu",
    emoji: "👩‍🍳",
    conteudo: `• Nunca deixar o arroz cozer até ao fim — desligar e deixar acabar ao vapor.
• Arroz vaporizado fica sempre solto (mais caro mas compensa).
• Demolhar o bacalhau 2 dias antes, trocar a água 2x/dia. Deixar lembrete escrito!
• Começar a sopa na sorna: fica feita cedo, reserva comida se faltar gás.
• Ter batatas fritas de reserva se a comida não chegar.
• Fruta cortada num alguidar com água — rende mais e não oxida.
• Ovos cozidos: muita água, ~15-20 min. Precisam de arrefecer antes de descascar.
• Experimentar os ovos antes de cozinhar!
• Escorrer a massa ainda meio crua — continua a cozer com o calor.
• Usar a água de cozer a massa para a sopa — poupa água e tempo.
• Ter sempre farinha maizena para engrossar molhos (misturar com água fria primeiro).
• Água a ferver: pôr a aquecer bem cedo (~15 min para ferver).`
  },
  {
    id: "poupar",
    titulo: "Poupar dinheiro sem perder sabor",
    emoji: "💰",
    conteudo: `• Natas em excesso pesam a digestão. Substituir por leite + maizena (béchamel leve): mais barato e leve.
• Mistura 50/50: metade natas, metade leite engrossado com maizena.
• Queijo creme / mascarpone de marca branca: duas colheres derretidas dão a cremosidade de vários pacotes de natas.
• Molho cremoso de vegetais: triturar courgette ou abóbora extra e envolver na massa em vez de natas.
• Cortar na maionese: substituir metade por iogurte natural não açucarado. Liga na mesma, mais fresco e barato.
• Soja fina hidratada estica a carne picada.
• Substituir bacalhau/paloco por salsichas; adicionar alho francês para render.
• Comprar queijo em barra e cortar sai mais barato que fatiado.
• Pedir a carne já cortada no talho — poupa trabalho.`
  },
  {
    id: "validade",
    titulo: "Validade dos alimentos no campo",
    emoji: "📅",
    conteudo: `• Alho-francês · ~1 semana
• Maçãs · ~1 semana (verdes aguentam mais)
• Melão / Melancia · ~1 semana (inteiros)
• Tomate · ~5 dias
• Alface · 1-2 dias no máximo
• Ovos · aguentam fora do frigorífico num lugar fresco — testar antes de usar!
• Pão · comprar fresco diariamente
• Carne · casa de apoio/frigorífico, usar no dia planeado`
  },
  {
    id: "compras",
    titulo: "Compras",
    emoji: "🛒",
    conteudo: `• Ligar ao supermercado ~2 semanas antes das compras grandes — às vezes preparam tudo.
• Dividir a lista por secção do supermercado — cada pessoa leva uma parte.
• Talho: ir primeiro, explicar o que se quer; cortam enquanto se faz o resto.
• Levar a lista do talho com antecedência.
• Aproveitar as caixas de cartão do supermercado para organizar.
• Se o campo for perto, dividir em duas compras: início + meio do campo.
• Ligar à mamã do campo anterior: sobras, dias que o talho fecha, preços, dicas.
• Saber os dias em que o talho/supermercado fecham!
• Verificar como é o pão aos domingos — o padeiro pode entregar se avisado.`
  },
  {
    id: "novos",
    titulo: "Escalões mais novos (Mosquitos e Aranhiços)",
    emoji: "🐛",
    conteudo: `• Jantar de dia (20h/20h30).
• Controlar idas à latrina — animadores de equipa ajudam.
• Não dar chás à noite — fazem xixi na cama.
• Verificar tendas disfarçadamente (xixi no saco-cama, chocolates escondidos).
• Levar 1-2 camisolas a mais — há sempre um miúdo sem roupa quente.
• Saco-cama extra por causa dos xixis.
• Nunca deixar a cozinha sem vigilância!
• Ver se os mais pequenos mudam de roupa pelo menos 1x no campo.`
  },
  {
    id: "caminhada",
    titulo: "Caminhada",
    emoji: "🥾",
    conteudo: `• Almoço ideal: cachorros ou sandes de atum (fácil e prático).
• Preparar um saco por equipa: papel higiénico, rebuçados, bolachas.
• Atenção aos molhos na mochila ao sol — podem estragar!
• Mamã e tias presentes na caminhada.
• Lanche reforçado no dia da caminhada.
• Levar fruta, água, sacos do lixo e papel higiénico.
• Dar rebuçados para energia.`
  },
  {
    id: "saude",
    titulo: "Saúde e obstipação",
    emoji: "💊",
    conteudo: `• Ajuda a fazer cocó: ameixas, café, sumo de laranja natural, chili/feijoada.
• Prisão de ventre é comum (medo da latrina). Ao 3º dia perguntar quem já foi.
• Sumo de laranja natural antes do PA resolve muitos casos sem remédios.
• Espremedor de sumo: levar de casa se possível.
• Tacho pequeno extra: há sempre 1 miúdo doente que precisa de comida especial.
• Pintarola: bom placebo para dores de barriga que são saudades.
• Atenção às insolações: insistir em chapéus, creme e lenços.
• Queimadura: usar água, nunca manteiga ou pasta de dentes.
• Crise epilética: afastar objetos, contar o tempo, esperar que passe. NÃO pôr nada na boca.`
  },
  {
    id: "higiene",
    titulo: "Higiene e limpeza",
    emoji: "🧼",
    conteudo: `• Borrifador com água e lixívia — usar nas mesas e facas.
• Desinfetar as mãos antes de cozinhar.
• De manhã: limpeza e arrumação à cozinha inteira.
• Carne à espera: tapar com pano e tampa — NÃO PODEM ENTRAR MOSCAS (põem ovos na carne crua).
• Alguidar com água e sabonete para lavar as mãos na cozinha.
• Afastar abelhas: espalhar café ou lixívia pelo chão.
• Dividir bem zona de loiça suja vs. loiça lavada.
• Loiça lavada a pelo menos 30 cm do chão e tapada.
• Cozinha e roda cobertas com taipal.`
  },
  {
    id: "miminhos",
    titulo: "Miminhos dos animadores",
    emoji: "🍫",
    conteudo: `• Chá e bolacha Maria na reunião — simples e eficaz.
• 2-3 vezes por campo pode caprichar (não todos os dias).
• Pipocas no petromax, tremoços, amendoins com mel.
• Sugerir aos animadores que levem miminhos de casa.
• A mamã controla o que é distribuído — atenção aos excessos.
• Café para os animadores sempre pronto após as refeições.
• Ideias vistas em campo: quesadillas, nachos com guacamole, pão de alho, fuet, amendoins com mel, gomas.`
  },
  {
    id: "pa-lanche",
    titulo: "Pequeno-almoço e lanche (quantidades)",
    emoji: "🥐",
    conteudo: `PEQUENO-ALMOÇO (~58 pax):
• 120-130 pães
• 10-12 L leite quente + 2-4 L leite frio
• 1,5 pacotes manteiga + 1,5 pacotes marmelada
• 0,5 pacote chocolate em pó
• Café: 1 pacote para cada 2 dias (2 cafeteiras + 1 termo)
• Chá para intolerantes (tília, camomila): 4 saquetas para 9 L
• Açúcar

LANCHE:
• Sobras de pão do pequeno-almoço
• Bolachas Maria: 1,5 pacotes por equipa + 4 de reserva (~14 pacotes)
• Restos de fruta (pôr em alguidar com água)
• Sumo ou limonada

PRÉ-CAMPO (~16 pax):
• 30 pães, 3 L leite, muito café, 1 manteiga, 1 marmelada`
  },
  {
    id: "legislacao",
    titulo: "Legislação (Artigo 10.º)",
    emoji: "⚖️",
    conteudo: `Alimentação variada em qualidade e quantidade, repartida em pelo menos 4 refeições por dia (pequeno-almoço, almoço, lanche, jantar). Consoante o plano, o lanche pode ser substituído por ceia.

Requisitos do acampamento:
• Espaço coberto exclusivo para preparação de refeições.
• Zona de refeições coberta.
• Higiene: 1 retrete + 1 duche por cada 25 pessoas.
• Reserva de água potável adequada.
• Estojo de primeiros socorros.`
  }
];

// Contactos de emergência nacionais (pré-preencher na farmácia)
export const CONTACTOS_NACIONAIS = [
  { tipo: "emergencia", nome: "Emergência (SNS/INEM)", telefone: "112" },
  { tipo: "saude24", nome: "SNS 24 (Saúde 24)", telefone: "808 24 24 24" },
  { tipo: "intoxicacao", nome: "Centro de Informação Antivenenos", telefone: "800 250 250" },
];

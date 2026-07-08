// ============================================
// 05_ementa_template_tremelgas2024.ts
// Ementa completa de 10 dias + 4 dias de pré-campo
// Fonte: Plano de Refeições Tremelgas I 2024 (campo real)
//
// Uso: oferecer como "Template de Ementa" clonável quando uma Mamã
// cria um campo novo e quer começar com uma base testada.
// Os nomes de receita ligam às receitas oficiais (seeds 03 + Livrinho).
// ============================================

export interface TemplateRefeicao {
  dia: number;          // -4 a -1 = pré-campo, 1 a 10 = campo
  refeicao: 'pequeno_almoco' | 'almoco' | 'lanche' | 'jantar' | 'sopa' | 'sobremesa';
  receita: string;      // nome da receita (match com biblioteca) ou texto livre
  notas?: string;
}

export const TEMPLATE_TREMELGAS_2024: {
  nome: string;
  descricao: string;
  duracao: number;
  refeicoes: TemplateRefeicao[];
} = {
  nome: "Tremelgas I 2024 (10 dias)",
  descricao: "Ementa completa testada num campo real de 10 dias para ~58 pessoas. Inclui pré-campo. Boa base para escalões mais velhos (Melgas, Tremelgas, Camaleões).",
  duracao: 10,
  refeicoes: [
    // ===== PRÉ-CAMPO =====
    { dia: -4, refeicao: 'almoco', receita: 'Cada um por si' },
    { dia: -4, refeicao: 'jantar', receita: 'Massa Gigi Hadid' },
    { dia: -4, refeicao: 'sobremesa', receita: 'Geladinhos' },

    { dia: -3, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: -3, refeicao: 'almoco', receita: 'Poke Bowls' },
    { dia: -3, refeicao: 'jantar', receita: 'Hambúrgueres com Ovos Rotos' },

    { dia: -2, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: -2, refeicao: 'almoco', receita: 'Salada de Couscous' },
    { dia: -2, refeicao: 'sopa', receita: 'Sopa de Espargos' },
    { dia: -2, refeicao: 'jantar', receita: 'Lasanha' },
    { dia: -2, refeicao: 'sobremesa', receita: 'Doce dos Gordos' },

    { dia: -1, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: -1, refeicao: 'almoco', receita: 'Risotto' },
    { dia: -1, refeicao: 'jantar', receita: 'Feijoada', notas: 'Feijoada para o Perry' },

    // ===== DIA 1 (Anos Perry) =====
    { dia: 1, refeicao: 'pequeno_almoco', receita: 'Panquecas', notas: 'PA especial — anos do Perry' },
    { dia: 1, refeicao: 'almoco', receita: 'Arroz Xau-Xau', notas: 'Servir com crepes chineses' },
    { dia: 1, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 1, refeicao: 'sopa', receita: 'Sopa de Cenoura' },
    { dia: 1, refeicao: 'jantar', receita: 'Jantar partilhado' },

    // ===== DIA 2 =====
    { dia: 2, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 2, refeicao: 'almoco', receita: 'Frango Teriyaki', notas: 'Com fruta' },
    { dia: 2, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 2, refeicao: 'sopa', receita: 'Sopa de Tomate' },
    { dia: 2, refeicao: 'jantar', receita: 'Massa de Legumes' },
    { dia: 2, refeicao: 'sobremesa', receita: 'Mousse de Manga' },

    // ===== DIA 3 =====
    { dia: 3, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 3, refeicao: 'almoco', receita: 'Massa Pesto com Frango' },
    { dia: 3, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 3, refeicao: 'sopa', receita: 'Sopa Rabo de Boi' },
    { dia: 3, refeicao: 'jantar', receita: 'Ragú' },

    // ===== DIA 4 =====
    { dia: 4, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 4, refeicao: 'almoco', receita: 'Alho Francês à Brás', notas: 'Com fruta' },
    { dia: 4, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 4, refeicao: 'sopa', receita: 'Canja' },
    { dia: 4, refeicao: 'jantar', receita: 'Caril de Legumes', notas: 'Verificar receita' },

    // ===== DIA 5 =====
    { dia: 5, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 5, refeicao: 'almoco', receita: 'Salada de massa com cenas', notas: 'Salada fria de frango com massa' },
    { dia: 5, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 5, refeicao: 'sopa', receita: 'Sopa de Cebola' },
    { dia: 5, refeicao: 'jantar', receita: 'Massa Pizza' },
    { dia: 5, refeicao: 'sobremesa', receita: 'Geladinhos' },

    // ===== DIA 6 =====
    { dia: 6, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 6, refeicao: 'almoco', receita: 'Cachorros', notas: 'Pão com atum/salsichas' },
    { dia: 6, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 6, refeicao: 'sopa', receita: 'Sopa de Legumes' },
    { dia: 6, refeicao: 'jantar', receita: 'Stroganoff de Peru' },
    { dia: 6, refeicao: 'sobremesa', receita: 'Clusters de Cornflakes' },

    // ===== DIA 7 =====
    { dia: 7, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 7, refeicao: 'almoco', receita: 'Massa Carbonara', notas: 'Com melancia' },
    { dia: 7, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 7, refeicao: 'sopa', receita: 'Sopa Rabo de Boi' },
    { dia: 7, refeicao: 'jantar', receita: 'Panados com Arroz de Tomate' },
    { dia: 7, refeicao: 'sobremesa', receita: 'Clusters de Cornflakes' },

    // ===== DIA 8 (Anos Marta) =====
    { dia: 8, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 8, refeicao: 'almoco', receita: 'Arroz de Enchidos', notas: 'Anos da Marta' },
    { dia: 8, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 8, refeicao: 'sopa', receita: 'Sopa de Cebola' },
    { dia: 8, refeicao: 'jantar', receita: 'Chili' },
    { dia: 8, refeicao: 'sobremesa', receita: 'Brigadeiros' },

    // ===== DIA 9 =====
    { dia: 9, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 9, refeicao: 'almoco', receita: 'Atum à Espanhola', notas: 'Com massa' },
    { dia: 9, refeicao: 'lanche', receita: 'Bolacha Maria + Fruta' },
    { dia: 9, refeicao: 'sopa', receita: 'Caldo Verde' },
    { dia: 9, refeicao: 'jantar', receita: 'Bifanas à Moda do Porto', notas: 'Com arroz e feijão preto' },
    { dia: 9, refeicao: 'sobremesa', receita: 'Salame de Chocolate' },

    // ===== DIA 10 =====
    { dia: 10, refeicao: 'pequeno_almoco', receita: 'Pequeno-almoço' },
    { dia: 10, refeicao: 'almoco', receita: 'Salada de Arroz', notas: 'Último dia — loiça fica lavada' },
  ]
};

// ============================================
// Extras vistos no campo (miminhos dos tios / FDS)
// Para popular presets de FDS Campo e snacks
// ============================================
export const EXTRAS_FDS = [
  'Quesadillas', 'Cones 3D', 'Pipocas', 'Filipinos', 'Amendoins com mel',
  'Gomas', 'Twix minis', 'Azeitonas galegas', 'Mentos fruta', 'Pão de alho',
  'Nachos com guacamole', 'Fuet', 'Moscow mule', 'Ginger ale', 'Vinho tinto'
];

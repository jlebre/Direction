export type UrgenciaLevel = 'normal' | 'hospital' | 'emergencia_112'

export interface GuiaCategoria {
  slug: string
  nome: string
  emoji: string
  descricao: string
  cor: string
  ordem: number
}

export interface GuiaItem {
  id: string
  categoriaSlug: string
  titulo: string
  subtitulo?: string
  tipo: 'regra' | 'material' | 'medicamento' | 'situacao'
  descricao?: string
  indicacoes?: string[]
  notas?: string[]
  procedimento?: string[]
  alertas?: string[]
  quando_112?: string[]
  quando_hospital?: string[]
  urgencia: UrgenciaLevel
  palavras_chave: string[]
  ordem: number
}

export const CATEGORIAS: GuiaCategoria[] = [
  { slug: 'regras',       nome: 'Regras',             emoji: '📋', descricao: 'Como gerir a farmácia em campo',      cor: 'text-gray-700 bg-gray-50 border-gray-200',       ordem: 1 },
  { slug: 'materiais',    nome: 'Materiais',           emoji: '🩺', descricao: 'Material de penso e produtos tópicos', cor: 'text-blue-700 bg-blue-50 border-blue-200',       ordem: 2 },
  { slug: 'medicamentos', nome: 'Medicamentos',        emoji: '💊', descricao: 'Medicamentos e indicações',            cor: 'text-purple-700 bg-purple-50 border-purple-200', ordem: 3 },
  { slug: 'lesoes',       nome: 'Lesões Frequentes',  emoji: '🩹', descricao: 'Feridas, entorses, bolhas, picadas',   cor: 'text-teal-700 bg-teal-50 border-teal-200',       ordem: 4 },
  { slug: 'queimaduras',  nome: 'Queimaduras',        emoji: '🔥', descricao: '1.º, 2.º e 3.º grau',                 cor: 'text-orange-700 bg-orange-50 border-orange-200', ordem: 5 },
  { slug: 'barriga',      nome: 'Barriga & Diarreia', emoji: '🤢', descricao: 'Diarreia, vómitos, obstipação',        cor: 'text-yellow-700 bg-yellow-50 border-yellow-200', ordem: 6 },
  { slug: 'garganta',     nome: 'Garganta & Ouvidos', emoji: '🤒', descricao: 'Dor de garganta e otites',             cor: 'text-indigo-700 bg-indigo-50 border-indigo-200', ordem: 7 },
  { slug: 'especiais',    nome: 'Situações Especiais', emoji: '🆘', descricao: 'Convulsões, engasgamento, anafilaxia', cor: 'text-red-700 bg-red-50 border-red-200',           ordem: 8 },
  { slug: 'meninas',      nome: 'Meninas',             emoji: '🌸', descricao: 'Produtos de higiene feminina',         cor: 'text-pink-700 bg-pink-50 border-pink-200',       ordem: 9 },
]

export const ITEMS: GuiaItem[] = [
  // ── REGRAS ──────────────────────────────────────────────────────────────────

  {
    id: 'regras-gerais',
    categoriaSlug: 'regras',
    titulo: 'Regras da Farmácia',
    tipo: 'regra',
    descricao: 'O animador responsável pela farmácia deve ter em conta as seguintes regras para garantir segurança e higiene.',
    procedimento: [
      'Em caso de dúvida ou desconhecimento: não dar nada.',
      'Saber previamente quais os animados que precisam de medicação diária, têm alergias ou doenças.',
      'Ter maior atenção aos casos com medicação ou alergias conhecidas.',
      'A farmácia deve manter-se sempre limpa — questão de higiene, segurança e preservação dos medicamentos.',
      'A farmácia deve estar sempre na tenda mamã, num sítio protegido e de fácil acesso.',
      'Ao longo do campo, registar o que foi usado.',
      'Na passagem de campo, repor aquilo que foi gasto para o campo seguinte.',
    ],
    alertas: [
      'Em caso de dúvida ou desconhecimento, não dar nada e contactar um responsável ou médico.',
    ],
    urgencia: 'normal',
    palavras_chave: ['regras', 'farmácia', 'higiene', 'organização', 'responsável'],
    ordem: 1,
  },

  // ── MATERIAIS ────────────────────────────────────────────────────────────────

  {
    id: 'pensos-rapidos',
    categoriaSlug: 'materiais',
    titulo: 'Pensos Rápidos',
    tipo: 'material',
    descricao: 'Para pequenos ferimentos.',
    urgencia: 'normal',
    palavras_chave: ['penso', 'pensos', 'ferimento', 'corte'],
    ordem: 1,
  },
  {
    id: 'algodao',
    categoriaSlug: 'materiais',
    titulo: 'Algodão',
    tipo: 'material',
    descricao: 'Material de apoio para limpeza e cuidados gerais.',
    urgencia: 'normal',
    palavras_chave: ['algodão', 'limpeza'],
    ordem: 2,
  },
  {
    id: 'pinca',
    categoriaSlug: 'materiais',
    titulo: 'Pinça',
    tipo: 'material',
    descricao: 'Para remover pequenos corpos estranhos, se adequado.',
    urgencia: 'normal',
    palavras_chave: ['pinça', 'farpas', 'espinha'],
    ordem: 3,
  },
  {
    id: 'agulhas',
    categoriaSlug: 'materiais',
    titulo: 'Agulhas',
    tipo: 'material',
    descricao: 'Para picar bolhas, apenas quando necessário.',
    alertas: ['Desinfetar a agulha antes de usar.'],
    urgencia: 'normal',
    palavras_chave: ['agulha', 'bolha'],
    ordem: 4,
  },
  {
    id: 'tesoura',
    categoriaSlug: 'materiais',
    titulo: 'Tesoura',
    tipo: 'material',
    descricao: 'Para cortar ligaduras, adesivo ou material de penso.',
    urgencia: 'normal',
    palavras_chave: ['tesoura'],
    ordem: 5,
  },
  {
    id: 'ligaduras',
    categoriaSlug: 'materiais',
    titulo: 'Ligaduras',
    tipo: 'material',
    descricao: 'Ligadura de pano e ligadura normal. Para suporte, proteção ou imobilização ligeira.',
    urgencia: 'normal',
    palavras_chave: ['ligadura', 'ligadura de pano', 'adesivo'],
    ordem: 6,
  },
  {
    id: 'compressas-esterilizadas',
    categoriaSlug: 'materiais',
    titulo: 'Compressas Esterilizadas',
    tipo: 'material',
    descricao: 'Cada compressa vem numa embalagem individual. Não reutilizar.',
    indicacoes: ['Desinfetar feridas.', 'Limpar olhos.'],
    urgencia: 'normal',
    palavras_chave: ['compressa', 'compressas', 'esterilizadas', 'ferida', 'olhos'],
    ordem: 7,
  },
  {
    id: 'compressas-nao-esterilizadas',
    categoriaSlug: 'materiais',
    titulo: 'Compressas Não Esterilizadas',
    tipo: 'material',
    indicacoes: [
      'Limpar uma zona antes de desinfetar.',
      'Fazer pensos maiores com adesivo quando não houver pensos do tamanho adequado.',
    ],
    urgencia: 'normal',
    palavras_chave: ['compressa', 'compressas', 'penso'],
    ordem: 8,
  },
  {
    id: 'luvas',
    categoriaSlug: 'materiais',
    titulo: 'Luvas',
    tipo: 'material',
    descricao: 'Devem ser usadas sempre que se faz um curativo.',
    alertas: ['Trocar de luvas com cada participante.'],
    urgencia: 'normal',
    palavras_chave: ['luvas', 'curativo', 'higiene'],
    ordem: 9,
  },
  {
    id: 'alcool',
    categoriaSlug: 'materiais',
    titulo: 'Álcool',
    tipo: 'material',
    descricao: 'Bom para desinfetar material e instrumentos.',
    alertas: ['Não usar álcool diretamente em feridas. Limpar feridas com soro fisiológico ou água.'],
    urgencia: 'normal',
    palavras_chave: ['álcool', 'desinfetar', 'desinfecção'],
    ordem: 10,
  },
  {
    id: 'soro-fisiologico',
    categoriaSlug: 'materiais',
    titulo: 'Soro Fisiológico',
    tipo: 'material',
    indicacoes: ['Limpar feridas.', 'Limpar olhos.'],
    notas: ['Não usar álcool nem água oxigenada nas feridas.', 'Idealmente comprar em doses individuais.'],
    urgencia: 'normal',
    palavras_chave: ['soro', 'soro fisiológico', 'ferida', 'olhos'],
    ordem: 11,
  },
  {
    id: 'betadine',
    categoriaSlug: 'materiais',
    titulo: 'Betadine',
    tipo: 'material',
    descricao: 'Para desinfetar feridas.',
    urgencia: 'normal',
    palavras_chave: ['betadine', 'desinfetar', 'ferida'],
    ordem: 12,
  },
  {
    id: 'biafine',
    categoriaSlug: 'materiais',
    titulo: 'Biafine',
    tipo: 'material',
    indicacoes: ['Queimaduras solares.', 'Queimaduras de cozinha.', 'Outras queimaduras ligeiras.'],
    notas: ['Seguir as indicações da pomada.'],
    alertas: [
      'Se a queimadura for grave, tiver formação de bolha, mau aspeto ou afetar grande área do corpo: levar ao hospital.',
    ],
    quando_hospital: ['Queimadura grave ou extensa.', 'Formação de bolha.', 'Mau aspeto da pele.'],
    urgencia: 'normal',
    palavras_chave: ['biafine', 'queimadura', 'solar', 'pomada'],
    ordem: 13,
  },
  {
    id: 'benaderme',
    categoriaSlug: 'materiais',
    titulo: 'Benaderme',
    tipo: 'material',
    indicacoes: ['Picadas de insetos.', 'Queimaduras solares.'],
    descricao: 'Ajuda a aliviar dor e comichão.',
    urgencia: 'normal',
    palavras_chave: ['benaderme', 'picada', 'comichão', 'solar'],
    ordem: 14,
  },
  {
    id: 'fenistil-pomada',
    categoriaSlug: 'materiais',
    titulo: 'Fenistil Pomada',
    tipo: 'material',
    descricao: 'Para picadas de insetos com reação local.',
    urgencia: 'normal',
    palavras_chave: ['fenistil', 'picada', 'inseto', 'reação local'],
    ordem: 15,
  },

  // ── MENINAS ─────────────────────────────────────────────────────────────────

  {
    id: 'produtos-meninas',
    categoriaSlug: 'meninas',
    titulo: 'Produtos de Higiene Feminina',
    tipo: 'material',
    indicacoes: ['Tampões.', 'Pensos higiénicos.'],
    urgencia: 'normal',
    palavras_chave: ['tampão', 'tampões', 'penso higiénico', 'menstruação', 'meninas'],
    ordem: 1,
  },

  // ── MEDICAMENTOS ─────────────────────────────────────────────────────────────

  {
    id: 'ibuprofeno',
    categoriaSlug: 'medicamentos',
    titulo: 'Ibuprofeno',
    subtitulo: 'Brufen',
    tipo: 'medicamento',
    indicacoes: [
      'Dores de cabeça.',
      'Dores de garganta.',
      'Dores menstruais — dar sempre 200 mg.',
      'Mosquitos e aranhiços (grupos mais novos) — usar dose mais baixa (200 mg) ou xarope.',
    ],
    notas: [
      'Se usar xarope, ver dose na embalagem.',
      'Lavar muito bem o copo antes de dar ao próximo.',
    ],
    urgencia: 'normal',
    palavras_chave: ['ibuprofeno', 'brufen', 'dor', 'cabeça', 'garganta', 'menstrual', 'anti-inflamatório'],
    ordem: 1,
  },
  {
    id: 'paracetamol',
    categoriaSlug: 'medicamentos',
    titulo: 'Paracetamol / Bem-U-Ron',
    tipo: 'medicamento',
    indicacoes: ['Febre.', 'Dores.'],
    notas: [
      'Mais indicado quando há febre.',
      'Começar por 500 mg. Se as queixas persistirem, dar 1000 mg na próxima toma.',
      'Optar pelo xarope para mosquitos e aranhiços (grupos mais novos).',
    ],
    urgencia: 'normal',
    palavras_chave: ['paracetamol', 'bem-u-ron', 'febre', 'dor', 'antipirético'],
    ordem: 2,
  },
  {
    id: 'diclofenac',
    categoriaSlug: 'medicamentos',
    titulo: 'Diclofenac / Voltaren',
    tipo: 'medicamento',
    indicacoes: ['Dores musculares muito fortes.'],
    urgencia: 'normal',
    palavras_chave: ['diclofenac', 'voltaren', 'dor muscular', 'anti-inflamatório'],
    ordem: 3,
  },
  {
    id: 'imodium',
    categoriaSlug: 'medicamentos',
    titulo: 'Imodium / Loperamida',
    tipo: 'medicamento',
    indicacoes: ['Parar a diarreia.'],
    procedimento: ['Colocar um comprimido debaixo da língua. Tem ação rápida.'],
    alertas: [
      'Se o participante tiver febre e diarreia ao mesmo tempo, não dar Imodium — contactar um médico.',
    ],
    urgencia: 'normal',
    palavras_chave: ['imodium', 'loperamida', 'diarreia', 'trânsito'],
    ordem: 4,
  },
  {
    id: 'ultralevur',
    categoriaSlug: 'medicamentos',
    titulo: 'Ultralevur 250 / UL 250',
    tipo: 'medicamento',
    indicacoes: ['Diarreia.'],
    notas: ['Ação mais lenta — pode ter de ser dado durante vários dias.'],
    alertas: [
      'Se o participante tiver febre e diarreia ao mesmo tempo, contactar um médico.',
    ],
    urgencia: 'normal',
    palavras_chave: ['ultralevur', 'UL 250', 'diarreia', 'probiótico'],
    ordem: 5,
  },
  {
    id: 'microlax',
    categoriaSlug: 'medicamentos',
    titulo: 'Microlax',
    tipo: 'medicamento',
    indicacoes: ['Obstipação / prisão de ventre.'],
    procedimento: ['Bisnagas retais com efeito rápido.', 'Desinfetar cada bisnaga antes de usar.'],
    alertas: [
      'Usar apenas quando já se tentou tudo o resto (fruta, café, etc.).',
      'Ao 6.º ou 7.º dia de campo sem evacuação, pode ponderar-se o seu uso.',
    ],
    urgencia: 'normal',
    palavras_chave: ['microlax', 'obstipação', 'prisão de ventre', 'laxante'],
    ordem: 6,
  },
  {
    id: 'laevolac',
    categoriaSlug: 'medicamentos',
    titulo: 'Laevolac / Movicol',
    tipo: 'medicamento',
    indicacoes: ['Obstipação.'],
    notas: ['Ação mais lenta.', 'Pode causar cólicas abdominais como efeito secundário frequente.'],
    alertas: [
      'Usar apenas quando já se tentou tudo o resto (fruta, café, etc.).',
      'Ao 6.º ou 7.º dia de campo sem evacuação, pode ponderar-se o seu uso.',
    ],
    urgencia: 'normal',
    palavras_chave: ['laevolac', 'movicol', 'obstipação', 'prisão de ventre', 'laxante'],
    ordem: 7,
  },
  {
    id: 'kompensam',
    categoriaSlug: 'medicamentos',
    titulo: 'Kompensam / Conforpam',
    tipo: 'medicamento',
    indicacoes: [
      'Azia.',
      'Sensação de ardor ou desconforto no estômago ou peito.',
      'Sensação de enfartamento.',
    ],
    urgencia: 'normal',
    palavras_chave: ['kompensam', 'conforpam', 'azia', 'estômago', 'ardor', 'enfartamento'],
    ordem: 8,
  },
  {
    id: 'buscopan',
    categoriaSlug: 'medicamentos',
    titulo: 'Buscopan',
    tipo: 'medicamento',
    indicacoes: ['Dores de barriga.', 'Cólicas fortes.', 'Alívio rápido.', 'Dores menstruais.'],
    alertas: ['Não dar quando há diarreia.'],
    urgencia: 'normal',
    palavras_chave: ['buscopan', 'cólicas', 'barriga', 'dores menstruais', 'espasmo'],
    ordem: 9,
  },
  {
    id: 'metoclopramida',
    categoriaSlug: 'medicamentos',
    titulo: 'Metoclopramida',
    tipo: 'medicamento',
    indicacoes: ['Antiemético — alívio de náuseas e vómitos.'],
    notas: ['Consultar a bula.'],
    urgencia: 'normal',
    palavras_chave: ['metoclopramida', 'náuseas', 'vómitos', 'antiemético'],
    ordem: 10,
  },
  {
    id: 'mebocaina',
    categoriaSlug: 'medicamentos',
    titulo: 'Mebocaína',
    tipo: 'medicamento',
    indicacoes: ['Rouquidão.', 'Dores de garganta leves.'],
    urgencia: 'normal',
    palavras_chave: ['mebocaína', 'garganta', 'rouquidão', 'pastilha'],
    ordem: 11,
  },
  {
    id: 'strepfen',
    categoriaSlug: 'medicamentos',
    titulo: 'Strepfen',
    tipo: 'medicamento',
    indicacoes: ['Rouquidão.', 'Dores de garganta.'],
    notas: ['Nota: no livrinho original aparece assinalado como "placebo".'],
    urgencia: 'normal',
    palavras_chave: ['strepfen', 'garganta', 'rouquidão'],
    ordem: 12,
  },
  {
    id: 'desloratadina',
    categoriaSlug: 'medicamentos',
    titulo: 'Desloratadina / Aerius',
    tipo: 'medicamento',
    indicacoes: ['Alergias.', 'Urticária.'],
    notas: ['Anti-histamínico com efeito sedativo mais ou menos leve.'],
    urgencia: 'normal',
    palavras_chave: ['desloratadina', 'aerius', 'alergia', 'urticária', 'anti-histamínico'],
    ordem: 13,
  },
  {
    id: 'epipen',
    categoriaSlug: 'medicamentos',
    titulo: 'Epipen / Anapen / Adrenalina',
    tipo: 'medicamento',
    descricao: 'Para reações alérgicas muito graves (choque anafilático). É obrigatório ter em campo.',
    indicacoes: [
      'Reação alérgica grave — pessoa sem conseguir respirar ou com reação sistémica grave.',
    ],
    procedimento: [
      'Ver bem a bula informativa para saber como usar.',
      'Doses: 0,3 mg para mais de 30 kg; 0,15 mg para menos de 30 kg.',
      'Dar adrenalina adequada ao peso e chamar imediatamente o 112.',
    ],
    alertas: [
      'Não deve estar ao sol.',
      'Em caso de reação alérgica grave, dar adrenalina adequada ao peso e chamar imediatamente o 112.',
      'É obrigatório ter em campo.',
    ],
    quando_112: ['Reação alérgica grave / choque anafilático.'],
    urgencia: 'emergencia_112',
    palavras_chave: ['epipen', 'anapen', 'adrenalina', 'anafilaxia', 'alergia grave', 'choque'],
    ordem: 14,
  },

  // ── LESÕES FREQUENTES ────────────────────────────────────────────────────────

  {
    id: 'feridas-abertas',
    categoriaSlug: 'lesoes',
    titulo: 'Feridas Abertas',
    tipo: 'situacao',
    procedimento: [
      'Desinfetar.',
      'Limpar bem a ferida.',
      'Pôr penso.',
      'Repetir diariamente.',
    ],
    urgencia: 'normal',
    palavras_chave: ['ferida', 'corte', 'sangue', 'penso', 'desinfetar'],
    ordem: 1,
  },
  {
    id: 'entorses',
    categoriaSlug: 'lesoes',
    titulo: 'Entorses',
    tipo: 'situacao',
    procedimento: [
      'Usar gelo.',
      'Se houver dores ou sinais de inflamação (inchaço, calor, rubor), dar Brufen/Ibuprofeno.',
    ],
    quando_hospital: [
      'Mobilidade do membro afetada.',
      'Dores que não passam.',
      'Pé muito inchado.',
    ],
    urgencia: 'hospital',
    palavras_chave: ['entorse', 'torcer', 'tornozelo', 'pé', 'joelho', 'inchaço', 'gelo'],
    ordem: 2,
  },
  {
    id: 'bolhas',
    categoriaSlug: 'lesoes',
    titulo: 'Bolhas',
    tipo: 'situacao',
    procedimento: [
      'Se a bolha provocar dor: tentar rebentar com uma agulha devidamente desinfetada.',
      'Se não provocar dor/incómodo: deixar rebentar espontaneamente.',
    ],
    urgencia: 'normal',
    palavras_chave: ['bolha', 'agulha', 'pé', 'friccção'],
    ordem: 3,
  },
  {
    id: 'picadas-abelha',
    categoriaSlug: 'lesoes',
    titulo: 'Picadas de Abelha / Vespa',
    tipo: 'situacao',
    procedimento: [
      'Procurar sinais de reação alérgica leve ou grave.',
      'Se for reação leve: pôr Fenistil pomada.',
      'Se for reação grave (dificuldade em respirar, inchaço sistémico): dar Epipen e chamar 112.',
    ],
    quando_112: ['Sinais de reação alérgica grave — dificuldade respiratória ou inchaço sistémico.'],
    urgencia: 'emergencia_112',
    palavras_chave: ['picada', 'abelha', 'vespa', 'alergia', 'comichão', 'inchaço', 'fenistil'],
    ordem: 4,
  },
  {
    id: 'pancada-cabeca',
    categoriaSlug: 'lesoes',
    titulo: 'Pancada na Cabeça',
    tipo: 'situacao',
    procedimento: [
      'Se não houver sinais de alarme: vigiar o estado.',
    ],
    quando_112: [
      'Vómitos.',
      'Dores de cabeça intensas.',
      'Dificuldade em falar.',
      'Alterações visuais.',
    ],
    urgencia: 'emergencia_112',
    palavras_chave: ['pancada', 'cabeça', 'traumatismo craniano', 'concussão', 'vómitos'],
    ordem: 5,
  },

  // ── QUEIMADURAS ──────────────────────────────────────────────────────────────

  {
    id: 'queimadura-1-grau',
    categoriaSlug: 'queimaduras',
    titulo: 'Queimadura de 1.º Grau',
    subtitulo: 'Tipo escaldão — superficial, com dor',
    tipo: 'situacao',
    procedimento: [
      'Aplicar água fria.',
      'Aplicar compressas frias.',
      'Pôr Biafine.',
      'Hidratar muito.',
    ],
    urgencia: 'normal',
    palavras_chave: ['queimadura', '1 grau', 'escaldão', 'solar', 'biafine'],
    ordem: 1,
  },
  {
    id: 'queimadura-2-grau',
    categoriaSlug: 'queimaduras',
    titulo: 'Queimadura de 2.º Grau',
    subtitulo: 'Com bolhas',
    tipo: 'situacao',
    procedimento: [
      'Não rebentar bolhas.',
      'Não colocar nada gorduroso (azeite, manteiga).',
      'Se uma bolha rebentar: limpar com soro fisiológico e aplicar compressas frias.',
      'Hidratar muito.',
    ],
    quando_hospital: [
      'Queimaduras de 2.º grau na cara.',
      'Queimaduras de 2.º grau no peito.',
    ],
    urgencia: 'hospital',
    palavras_chave: ['queimadura', '2 grau', 'bolha', 'cara', 'peito'],
    ordem: 2,
  },
  {
    id: 'queimadura-3-grau',
    categoriaSlug: 'queimaduras',
    titulo: 'Queimadura de 3.º Grau',
    subtitulo: 'Atingimento profundo — levar ao hospital',
    tipo: 'situacao',
    procedimento: ['Levar imediatamente ao hospital.'],
    quando_hospital: ['Qualquer queimadura de 3.º grau.'],
    urgencia: 'hospital',
    palavras_chave: ['queimadura', '3 grau', 'grave', 'profunda', 'hospital'],
    ordem: 3,
  },

  // ── BARRIGA & DIARREIA ───────────────────────────────────────────────────────

  {
    id: 'diarreia-febre',
    categoriaSlug: 'barriga',
    titulo: 'Diarreia + Febre',
    tipo: 'situacao',
    procedimento: [
      'Hidratar com muita água e chá.',
      'Dar paracetamol.',
      'Se necessário, levar ao hospital.',
    ],
    alertas: ['Não dar Imodium quando há febre e diarreia em simultâneo.'],
    quando_hospital: ['Situação persistente ou que se agrava.'],
    urgencia: 'hospital',
    palavras_chave: ['diarreia', 'febre', 'hidratação', 'paracetamol'],
    ordem: 1,
  },
  {
    id: 'diarreia-vomitos',
    categoriaSlug: 'barriga',
    titulo: 'Diarreia + Vómitos',
    tipo: 'situacao',
    procedimento: ['Hidratar muito.'],
    quando_hospital: ['O participante vomita tudo o que bebe.'],
    urgencia: 'hospital',
    palavras_chave: ['diarreia', 'vómitos', 'vomitar', 'hidratação', 'hospital'],
    ordem: 2,
  },
  {
    id: 'diarreia-geral',
    categoriaSlug: 'barriga',
    titulo: 'Diarreia Geral',
    tipo: 'situacao',
    procedimento: [
      'Hidratar — muita água.',
      'Dar hidratos de carbono: pão, banana.',
      'Evitar alimentos com muitas fibras (laranja, kiwi).',
      'Se houver cólicas fortes: dar Buscopan.',
    ],
    alertas: [
      'Se a situação se espalhar por mais miúdos, procurar possíveis origens (água ou alimentos estragados) e levar ao hospital.',
    ],
    quando_hospital: ['Diarreia a espalhar-se por vários participantes.'],
    urgencia: 'normal',
    palavras_chave: ['diarreia', 'barriga', 'banana', 'pão', 'hidratação', 'buscopan'],
    ordem: 3,
  },
  {
    id: 'obstipacao',
    categoriaSlug: 'barriga',
    titulo: 'Obstipação / Prisão de Ventre',
    tipo: 'situacao',
    procedimento: [
      'Dar alimentos fibrosos — fruta.',
      'Café pode ajudar.',
      'Como último recurso: laxante (Laevolac, Movicol ou Microlax).',
    ],
    notas: [
      'Distinguir casos reais de saudades de casa ou chamadas de atenção — ter sensibilidade.',
      'Muitas vezes funciona o efeito placebo (ex: "rebuçado mágico" para os mais novos).',
    ],
    urgencia: 'normal',
    palavras_chave: ['obstipação', 'prisão de ventre', 'cócó', 'laxante', 'fruta', 'microlax'],
    ordem: 4,
  },

  // ── GARGANTA & OUVIDOS ───────────────────────────────────────────────────────

  {
    id: 'dor-garganta',
    categoriaSlug: 'garganta',
    titulo: 'Dor de Garganta',
    tipo: 'situacao',
    procedimento: [
      'Procurar pontos brancos na garganta, inflamação acentuada das amígdalas ou dificuldade respiratória.',
      'Se tiver febre: dar paracetamol.',
      'Se tiver dores: intercalar com Brufen/Ibuprofeno.',
    ],
    notas: [
      'Na maioria dos casos é viral.',
      'Dores de garganta podem ser acompanhadas de dores de ouvidos — não são necessariamente otites.',
    ],
    quando_hospital: [
      'Pontos brancos na garganta.',
      'Inflamação acentuada das amígdalas.',
      'Dificuldade respiratória.',
    ],
    urgencia: 'hospital',
    palavras_chave: ['garganta', 'amígdalas', 'rouquidão', 'inflamação', 'pontos brancos', 'febre'],
    ordem: 1,
  },
  {
    id: 'dor-ouvidos',
    categoriaSlug: 'garganta',
    titulo: 'Dores de Ouvidos Fortes',
    tipo: 'situacao',
    procedimento: ['Levar ao hospital / centro de saúde.'],
    notas: ['É aconselhável não tomar banho no rio.'],
    quando_hospital: ['Qualquer dor de ouvidos forte.'],
    urgencia: 'hospital',
    palavras_chave: ['ouvidos', 'otite', 'ouvido', 'dor ouvido', 'rio'],
    ordem: 2,
  },

  // ── SITUAÇÕES ESPECIAIS ──────────────────────────────────────────────────────

  {
    id: 'convulsoes',
    categoriaSlug: 'especiais',
    titulo: 'Convulsões',
    tipo: 'situacao',
    descricao: 'Podem acontecer em miúdos com febres altas (convulsões febris) ou epilepsia.',
    procedimento: [
      'Durante a crise: não tocar no miúdo.',
      'Afastar objetos que estejam à volta.',
      'Não mexer na boca.',
      'Esperar que a crise passe.',
      'Após a crise: colocar em Posição Lateral de Segurança (PLS).',
      'Chamar 112.',
    ],
    quando_112: ['Após qualquer episódio de convulsão.'],
    urgencia: 'emergencia_112',
    palavras_chave: ['convulsão', 'convulsões', 'epilepsia', 'febre alta', 'PLS', '112'],
    ordem: 1,
  },
  {
    id: 'engasgamento',
    categoriaSlug: 'especiais',
    titulo: 'Engasgamento',
    tipo: 'situacao',
    procedimento: [
      'Dar 5 pancadas secas nas costas.',
      'Alternar com 5 compressões abdominais (manobra de Heimlich).',
      'Repetir até desobstruir ou o participante ficar inconsciente.',
    ],
    quando_112: ['Se o participante ficar inconsciente.'],
    urgencia: 'emergencia_112',
    palavras_chave: ['engasgamento', 'engasgar', 'obstrução', 'vias aéreas', 'heimlich', '112'],
    ordem: 2,
  },
  {
    id: 'reacao-alergica',
    categoriaSlug: 'especiais',
    titulo: 'Reação Alérgica Grave',
    subtitulo: 'Anafilaxia / Choque anafilático',
    tipo: 'situacao',
    descricao: 'Pode acontecer após picada de abelha em alérgicos ou ingestão de alimentos alergénios (amendoins, marisco).',
    procedimento: [
      'Identificar sinais: inchaço nos lábios/língua/olhos, dificuldade respiratória, pintas vermelhas pelo corpo.',
      'Dar adrenalina Epipen/Anapen adequada ao peso (>30 kg: 0,3 mg; <30 kg: 0,15 mg).',
      'Chamar imediatamente o 112.',
    ],
    quando_112: [
      'Qualquer reação alérgica grave ou sistémica.',
      'Dificuldade respiratória.',
      'Inchaço nos lábios, língua ou olhos.',
    ],
    urgencia: 'emergencia_112',
    palavras_chave: ['anafilaxia', 'alergia grave', 'epipen', 'adrenalina', 'abelha', 'amendoins', 'inchaço', 'respiração'],
    ordem: 3,
  },
  {
    id: 'desmaios',
    categoriaSlug: 'especiais',
    titulo: 'Desmaios',
    tipo: 'situacao',
    procedimento: [
      'Tentar acordar sem movimentos bruscos.',
      'Não levantar rapidamente.',
      'Se houve refeição recente (hipotensão): dar sal e água.',
      'Se a última refeição foi há algum tempo (hipoglicemia): dar bolachas e água.',
    ],
    quando_112: [
      'Não acorda.',
      'Não respira — iniciar suporte básico de vida e chamar 112.',
    ],
    urgencia: 'emergencia_112',
    palavras_chave: ['desmaio', 'desmaiar', 'inconsciente', 'açúcar', 'hipotensão', 'hipoglicemia', 'SBV'],
    ordem: 4,
  },
]

// Pesquisa full-text sobre todos os campos do item
export function pesquisar(query: string): GuiaItem[] {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()
  return ITEMS.filter((item) => {
    const haystack = [
      item.titulo,
      item.subtitulo,
      item.descricao,
      item.categoriaSlug,
      ...(item.indicacoes ?? []),
      ...(item.notas ?? []),
      ...(item.procedimento ?? []),
      ...(item.alertas ?? []),
      ...(item.quando_112 ?? []),
      ...(item.quando_hospital ?? []),
      ...(item.palavras_chave),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

// Itens de emergência 112 — para a strip de urgências
export function itens112(): GuiaItem[] {
  return ITEMS.filter((i) => i.urgencia === 'emergencia_112')
}

export function itensPorCategoria(slug: string): GuiaItem[] {
  return ITEMS.filter((i) => i.categoriaSlug === slug).sort((a, b) => a.ordem - b.ordem)
}

export function categoriaBySlug(slug: string): GuiaCategoria | undefined {
  return CATEGORIAS.find((c) => c.slug === slug)
}

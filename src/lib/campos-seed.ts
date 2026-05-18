export const CAMPOS_SEED = [
  // Período 1: 17–26 Jul
  { nome: 'Tremelgas I',   escalao: 'Tremelga', datas: '17 – 26 Jul',    local: 'Valbom dos Figos', pre_campo: '14, 15, 16 Jul',  saldo_inicial: 3400, periodo: 1 },
  { nome: 'Aranhiços I',   escalao: 'Aranhiço', datas: '17 – 26 Jul',    local: 'Dornelas',         pre_campo: '14, 15, 16 Jul',  saldo_inicial: 3280, periodo: 1 },
  // Período 2: 28 Jul – 6 Ago
  { nome: 'Melgas I',      escalao: 'Melga',    datas: '28 Jul – 6 Ago', local: 'Valbom dos Figos', pre_campo: '26, 27 Jul',      saldo_inicial: 3400, periodo: 2 },
  { nome: 'Aranhiços II',  escalao: 'Aranhiço', datas: '28 Jul – 6 Ago', local: 'Dornelas',         pre_campo: '26, 27 Jul',      saldo_inicial: 3280, periodo: 2 },
  { nome: 'Mosquitos I',   escalao: 'Mosquito', datas: '30 Jul – 6 Ago', local: 'Abrantes',         pre_campo: '27, 28, 29 Jul',  saldo_inicial: 2930, periodo: 2 },
  // Período 3: 8–17 Ago
  { nome: 'Camaleões',     escalao: 'Camaleão', datas: '8 – 17 Ago',     local: 'Valbom dos Figos', pre_campo: '6, 7 Ago',        saldo_inicial: 3630, periodo: 3 },
  { nome: 'Melgas II',     escalao: 'Melga',    datas: '8 – 17 Ago',     local: 'Dornelas',         pre_campo: '6, 7 Ago',        saldo_inicial: 3400, periodo: 3 },
  { nome: 'Aranhiços III', escalao: 'Aranhiço', datas: '8 – 17 Ago',     local: 'Abrantes',         pre_campo: '6, 7 Ago',        saldo_inicial: 3280, periodo: 3 },
  // Período 4: 19–28 Ago
  { nome: 'Tremelgas II',  escalao: 'Tremelga', datas: '19 – 28 Ago',    local: 'Valbom dos Figos', pre_campo: '17, 18 Ago',      saldo_inicial: 3400, periodo: 4 },
  { nome: 'Melgas III',    escalao: 'Melga',    datas: '19 – 28 Ago',    local: 'Dornelas',         pre_campo: '17, 18 Ago',      saldo_inicial: 3400, periodo: 4 },
  { nome: 'Mosquitos II',  escalao: 'Mosquito', datas: '19 – 26 Ago',    local: 'Abrantes',         pre_campo: '17, 18 Ago',      saldo_inicial: 2930, periodo: 4 },
] as const

export const PERIODOS = [
  { numero: 1, label: 'Período 1 — 17 a 26 Jul',      campos: ['Tremelgas I', 'Aranhiços I'] },
  { numero: 2, label: 'Período 2 — 28 Jul a 6 Ago',   campos: ['Melgas I', 'Aranhiços II', 'Mosquitos I'] },
  { numero: 3, label: 'Período 3 — 8 a 17 Ago',       campos: ['Camaleões', 'Melgas II', 'Aranhiços III'] },
  { numero: 4, label: 'Período 4 — 19 a 28 Ago',      campos: ['Tremelgas II', 'Melgas III', 'Mosquitos II'] },
]

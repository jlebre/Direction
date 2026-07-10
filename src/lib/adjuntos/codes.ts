import type { CodeCategory, CodeEntry } from '@/types/adjuntos'

export const CAMTIL_NIF = '501979891'

export const CODE_CATEGORIES: CodeCategory[] = [
  {
    label: 'FDS Campo',
    icon: '🏕️',
    color: '#6B7280',
    codes: [
      { code: '1.1', short: 'Deslocações', full: 'FDS Campo | Deslocações FDS Campo' },
      { code: '1.2', short: 'Alimentação', full: 'FDS Campo | Alimentação' },
    ],
  },
  {
    label: 'Divulgação',
    icon: '📮',
    color: '#8B5CF6',
    codes: [
      { code: '2.1', short: 'Correio', full: 'Divulgação | Correio' },
      { code: '2.2', short: 'Telemóveis', full: 'Divulgação | Telemóveis' },
    ],
  },
  {
    label: 'Alimentação',
    icon: '🍽️',
    color: '#EF4444',
    codes: [
      { code: '3.1.1', short: 'Compras Gerais', full: 'Alimentação | Compras Gerais' },
      { code: '3.1.2', short: 'Talho', full: 'Alimentação | Talho' },
      { code: '3.1.3', short: 'Pão', full: 'Alimentação | Pão' },
      { code: '3.1.4', short: 'Frutas & Legumes', full: 'Alimentação | Frutas & Legumes' },
      { code: '3.1.5', short: 'Diversos', full: 'Alimentação | Diversos' },
    ],
  },
  {
    label: 'Transportes',
    icon: '🚐',
    color: '#3B82F6',
    codes: [
      { code: '3.2.1', short: 'Participantes', full: 'Transportes | Gastos com Participantes' },
      { code: '3.2.2', short: 'Master', full: 'Transportes | Gastos Master' },
      { code: '3.2.3', short: 'Kangoo', full: 'Transportes | Gastos Kangoo' },
      { code: '3.2.4', short: 'Jesuíta', full: 'Transportes | Transporte Jesuita' },
    ],
  },
  {
    label: 'Material',
    icon: '🎨',
    color: '#F59E0B',
    codes: [
      { code: '3.3.1', short: 'Gás', full: 'Material | Gás (Botijas & Petromax & Camisas)' },
      { code: '3.3.2', short: 'Papelaria / Jogos', full: 'Material | Papelaria, Chineses, Material para Jogos, Sisal' },
    ],
  },
  {
    label: 'Animadores',
    icon: '👥',
    color: '#10B981',
    codes: [
      { code: '3.4.1', short: 'Deslocações', full: 'Gast. Anim. | Deslocações Animadores' },
      { code: '3.4.2', short: 'Telemóveis', full: 'Gast. Anim. | Telemóvel' },
    ],
  },
  {
    label: 'Farmácia',
    icon: '💊',
    color: '#EC4899',
    codes: [{ code: '3.5', short: 'Farmácia', full: 'Farmácia' }],
  },
  {
    label: 'Outros',
    icon: '📦',
    color: '#78716C',
    codes: [{ code: '3.6', short: 'Outros', full: 'Outros' }],
  },
  {
    label: 'Registos Criminais',
    icon: '📋',
    color: '#1F2937',
    codes: [{ code: '3.7', short: 'Registos Criminais', full: 'Registos Criminais' }],
  },
]

export function getCodeEntry(code: string): CodeEntry | undefined {
  for (const cat of CODE_CATEGORIES) {
    const found = cat.codes.find((c) => c.code === code)
    if (found) return found
  }
  return undefined
}

export function getCategoryForCode(code: string): CodeCategory | undefined {
  return CODE_CATEGORIES.find((cat) => cat.codes.some((c) => c.code === code))
}

export function getCodeColor(code: string): string {
  const cat = getCategoryForCode(code)
  return cat?.color ?? '#6B7280'
}

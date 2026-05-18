import { supabase } from '@/lib/supabase/client'

const PREFIXES: Record<string, string> = {
  'Mosquitos I': 'MOSQ1', 'Mosquitos II': 'MOSQ2',
  'Aranhiços I': 'ARAN1', 'Aranhiços II': 'ARAN2', 'Aranhiços III': 'ARAN3',
  'Melgas I': 'MELG1', 'Melgas II': 'MELG2', 'Melgas III': 'MELG3',
  'Tremelgas I': 'TREM1', 'Tremelgas II': 'TREM2',
  'Camaleões': 'CAM',
}

export function getCampoSlug(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')
}

export function getPhotoFilename(campoNome: string, numeroRecibo: number): string {
  const prefix = PREFIXES[campoNome] || 'CAMPO'
  return `${prefix}-${String(numeroRecibo).padStart(3, '0')}.jpg`
}

export function getPhotoUrl(path: string): string {
  const { data } = supabase.storage.from('faturas').getPublicUrl(path)
  return data.publicUrl
}

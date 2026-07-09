'use server'

import { createClient } from '@/lib/supabase/server'

export async function validatePin(campoId: string, pin: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('campos')
    .select('pin')
    .eq('id', campoId)
    .single()
  return !!data?.pin && data.pin === pin
}

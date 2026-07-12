'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { parseMoney } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CODE_CATEGORIES } from '@/lib/adjuntos/codes'

interface DbValor { escalao: string; ano: number; codigo: string; valor: number }
interface EscalaoCor { bg: string; text: string; light: string; border: string }

interface Props {
  valoresDb: DbValor[]
  escalaoOptions: string[]
  escalaoDefaults: Record<string, Record<string, number>>
  escalaoColors: Record<string, EscalaoCor>
}

export function ValoresRefClient({ valoresDb, escalaoOptions, escalaoDefaults, escalaoColors }: Props) {
  const [escalao, setEscalao] = useState(escalaoOptions[0] ?? 'Mosquito')
  const [ano, setAno] = useState(2026)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Form state: codigo → valor string
  const defaults = useMemo(() => escalaoDefaults[escalao] ?? {}, [escalao, escalaoDefaults])

  const dbMap = useMemo(() => {
    const m: Record<string, number> = {}
    valoresDb.filter((v) => v.escalao === escalao && v.ano === ano).forEach((v) => { m[v.codigo] = v.valor })
    return m
  }, [valoresDb, escalao, ano])

  const [values, setValues] = useState<Record<string, string>>({})

  // Derived: merge defaults → db → user edits
  const effective = useMemo(() => {
    const merged: Record<string, string> = {}
    for (const cat of CODE_CATEGORIES) {
      for (const c of cat.codes) {
        const dbVal = dbMap[c.code]
        const userVal = values[`${escalao}_${ano}_${c.code}`]
        merged[c.code] = userVal ?? (dbVal !== undefined ? String(dbVal) : String(defaults[c.code] ?? 0))
      }
    }
    return merged
  }, [defaults, dbMap, values, escalao, ano])

  function handleChange(codigo: string, val: string) {
    setValues((prev) => ({ ...prev, [`${escalao}_${ano}_${codigo}`]: val }))
  }

  async function guardar() {
    setSaving(true)
    const supabase = createClient()
    const rows = Object.entries(effective).map(([codigo, valor]) => ({
      escalao,
      ano,
      codigo,
      valor: parseMoney(valor) ?? 0,
    }))
    const { error } = await supabase.from('valores_referencia').upsert(rows, { onConflict: 'escalao,ano,codigo' })
    if (error) { toast.error('Erro ao guardar: ' + error.message) }
    else { toast.success(`Valores guardados para ${escalao} ${ano}`) }
    setSaving(false)
  }

  async function restaurarPadrao() {
    setResetting(true)
    const supabase = createClient()
    const { error } = await supabase.from('valores_referencia').delete().eq('escalao', escalao).eq('ano', ano)
    if (error) { toast.error('Erro ao restaurar: ' + error.message) }
    else {
      setValues({})
      toast.success(`Valores restaurados para os padrão do sistema (${escalao} ${ano})`)
    }
    setResetting(false)
  }

  // Soma total dos valores efectivos
  const totalEfectivo = Object.values(effective).reduce((s, v) => s + (parseMoney(v) ?? 0), 0)

  const cor = escalaoColors[escalao]

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Seletores */}
      <div className="bg-white rounded-xl border border-[#E7E8D1] p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Escalão</label>
            <Select value={escalao} onValueChange={(v) => { setEscalao(v); setValues({}) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {escalaoOptions.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Ano</label>
            <Select value={String(ano)} onValueChange={(v) => { setAno(Number(v)); setValues({}) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Total:</span>
            <span className="text-lg font-bold text-[#36454F]">€{totalEfectivo.toFixed(2)}</span>
          </div>
          {Object.keys(dbMap).length > 0 && (
            <span className="text-xs text-[#2D5016] bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              Valores personalizados activos
            </span>
          )}
          {Object.keys(dbMap).length === 0 && (
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
              A usar valores padrão
            </span>
          )}
        </div>
      </div>

      {/* Categorias */}
      <div className="space-y-4">
        {CODE_CATEGORIES.map((cat) => {
          const catTotal = cat.codes.reduce((s, c) => s + (parseMoney(effective[c.code] ?? '0') ?? 0), 0)
          return (
            <div key={cat.label} className="bg-white rounded-xl border border-[#E7E8D1] overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-[#F0F0E8]">
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="font-semibold text-sm text-[#36454F]">{cat.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: cor?.bg ?? '#36454F' }}>
                  €{catTotal.toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-[#F8F8F4]">
                {cat.codes.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-gray-500 w-12 shrink-0">{c.code}</span>
                    <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{c.short}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-gray-400 text-sm">€</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={effective[c.code] ?? '0'}
                        onChange={(e) => handleChange(c.code, e.target.value)}
                        className="w-24 h-8 text-sm text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Acções */}
      <div className="flex gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={restaurarPadrao}
          disabled={resetting || Object.keys(dbMap).length === 0}
        >
          {resetting ? 'A restaurar...' : 'Restaurar padrão'}
        </Button>
        <Button
          type="button"
          className="flex-1 bg-[#2D5016] hover:bg-[#2D5016]/90"
          onClick={guardar}
          disabled={saving}
        >
          {saving ? 'A guardar...' : `Guardar ${escalao} ${ano}`}
        </Button>
      </div>
    </div>
  )
}

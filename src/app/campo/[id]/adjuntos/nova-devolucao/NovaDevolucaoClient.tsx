'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import CodeSelector from '@/components/adjuntos/CodeSelector'
import type { CampoPublico } from '@/types/shared'
import type { Despesa } from '@/types/adjuntos'

interface Props {
  campo: CampoPublico
  faturas: Despesa[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function NovaDevolucaoClient({ campo, faturas }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [data, setData] = useState(today())
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [codigo, setCodigo] = useState<string | null>(null)
  const [codigoDescricao, setCodigoDescricao] = useState<string | null>(null)
  const [faturaId, setFaturaId] = useState<string>('')
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valor || parseFloat(valor) <= 0) { toast.error('Valor inválido'); return }
    setSubmitting(true)
    try {
      // Calcular próximo número de devolução
      const { data: lastDev } = await supabase
        .from('devolucoes')
        .select('numero_devolucao')
        .eq('campo_id', campo.id)
        .order('numero_devolucao', { ascending: false })
        .limit(1)
        .single()
      const numeroDevolucao = (lastDev?.numero_devolucao ?? 0) + 1

      const { error } = await supabase.from('devolucoes').insert({
        campo_id: campo.id,
        numero_devolucao: numeroDevolucao,
        data,
        valor: parseFloat(valor),
        descricao: descricao.trim() || null,
        codigo: codigo || null,
        codigo_descricao: codigoDescricao || null,
        fatura_original_id: faturaId || null,
        notas: notas.trim() || null,
        origem_dados: 'manual',
      })
      if (error) throw error
      toast.success(`Devolução #${numeroDevolucao} registada!`)
      router.push(`/campo/${campo.id}/adjuntos`)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registar devolução')
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen pb-10">
      <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center gap-3 mb-4">
          <Link href={`/campo/${campo.id}/adjuntos`} className="text-red-200">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Nova Devolução</h1>
        </div>
        <p className="max-w-lg mx-auto text-sm text-red-200">
          Regista uma nota de crédito, reembolso ou devolução. O valor será abatido ao total gasto.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-5 space-y-4">

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
          <div className="space-y-1">
            <Label>Data *</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <Label>Valor (€) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                className="pl-7"
                placeholder="0.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input
              placeholder="Ex: Devolução Continente, Nota de crédito..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</p>
          <CodeSelector
            selected={codigo}
            onSelect={(code: string, desc: string) => { setCodigo(code); setCodigoDescricao(desc) }}
          />
        </div>

        {faturas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
            <Label>Fatura associada (opcional)</Label>
            <select
              value={faturaId}
              onChange={(e) => setFaturaId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-800"
            >
              <option value="">— Sem fatura associada —</option>
              {faturas.map((f) => (
                <option key={f.id} value={f.id}>
                  #{f.numero_recibo} — {f.descricao ?? f.codigo_descricao ?? f.codigo} — €{Number(f.valor).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <Label>Notas</Label>
          <Input
            placeholder="Observações adicionais..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-12 text-base font-bold bg-[#B85042] hover:bg-[#B85042]/90 text-white"
        >
          {submitting ? 'A registar...' : 'Registar Devolução'}
        </Button>
      </form>
    </main>
  )
}

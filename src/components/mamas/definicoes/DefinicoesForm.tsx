'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Users, Euro, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SECCAO_LABELS } from '@/types/shared'
import type { Campo } from '@/types/shared'
import { parseMoney } from '@/lib/utils'

interface DefinicoesFormProps {
  campo: Campo | null
}

export function DefinicoesForm({ campo: campoInicial }: DefinicoesFormProps) {
  const router = useRouter()
  const [campo, setCampo] = useState(campoInicial)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  if (!campo) return <p className="p-4 text-gray-400">Campo não encontrado</p>

  function update(key: string, value: unknown) {
    setCampo((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  async function guardar() {
    if (!campo) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('campos')
        .update({
          nome: campo.nome,
          seccao: campo.seccao,
          local: campo.local,
          data_inicio: campo.data_inicio,
          data_fim: campo.data_fim,
          data_precampo_inicio: campo.data_precampo_inicio,
          data_precampo_fim: campo.data_precampo_fim,
          num_animados: campo.num_animados,
          num_animadores: campo.num_animadores,
          orcamento_alimentacao: campo.orcamento_alimentacao,
          orcamento_compras_gerais: campo.orcamento_compras_gerais,
          orcamento_talho: campo.orcamento_talho,
          orcamento_pao: campo.orcamento_pao,
          orcamento_frutas_legumes: campo.orcamento_frutas_legumes,
          orcamento_diversos: campo.orcamento_diversos,
        })
        .eq('id', campo.id)
      if (error) throw error
      toast.success('Definições guardadas')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-8">
      <Tabs defaultValue="geral">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E7E8D1] p-5 space-y-4">
            <h2 className="font-bold text-[#36454F] flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Informações do campo
            </h2>
            <div className="space-y-1">
              <Label>Nome do campo</Label>
              <Input value={campo.nome} onChange={(e) => update('nome', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Secção</Label>
                <Select value={campo.seccao ?? ''} onValueChange={(v) => update('seccao', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECCAO_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Local</Label>
                <Input
                  placeholder="Casa de Campo, Quinta..."
                  value={campo.local ?? ''}
                  onChange={(e) => update('local', e.target.value || null)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Início do campo</Label>
                <Input type="date" value={campo.data_inicio ?? ''} onChange={(e) => update('data_inicio', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fim do campo</Label>
                <Input type="date" value={campo.data_fim ?? ''} onChange={(e) => update('data_fim', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Início pré-campo</Label>
                <Input type="date" value={campo.data_precampo_inicio ?? ''} onChange={(e) => update('data_precampo_inicio', e.target.value || null)} />
              </div>
              <div className="space-y-1">
                <Label>Fim pré-campo</Label>
                <Input type="date" value={campo.data_precampo_fim ?? ''} onChange={(e) => update('data_precampo_fim', e.target.value || null)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E7E8D1] p-5 space-y-4">
            <h2 className="font-bold text-[#36454F] flex items-center gap-2">
              <Users className="h-4 w-4" /> Participantes
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Animados</Label>
                <Input
                  type="number"
                  min={0}
                  value={campo.num_animados ?? 0}
                  onChange={(e) => update('num_animados', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>Animadores</Label>
                <Input
                  type="number"
                  min={0}
                  value={campo.num_animadores ?? 0}
                  onChange={(e) => update('num_animadores', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="bg-[#E7E8D1]/50 rounded-lg px-4 py-2 text-sm text-gray-600">
              Total: <strong className="text-[#B85042]">{(campo.num_animados ?? 0) + (campo.num_animadores ?? 0)} pessoas</strong>
            </div>
          </div>

          <Button onClick={guardar} disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'A guardar...' : 'Guardar definições'}
          </Button>
        </TabsContent>

        <TabsContent value="orcamento" className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E7E8D1] p-5 space-y-4">
            <h2 className="font-bold text-[#36454F] flex items-center gap-2">
              <Euro className="h-4 w-4" /> Orçamento Mamãs
            </h2>
            {[
              { key: 'orcamento_alimentacao', label: 'Alimentação total' },
              { key: 'orcamento_compras_gerais', label: 'Compras grandes (despensa)' },
              { key: 'orcamento_talho', label: 'Talho' },
              { key: 'orcamento_pao', label: 'Padaria / Pão' },
              { key: 'orcamento_frutas_legumes', label: 'Frutas e legumes' },
              { key: 'orcamento_diversos', label: 'Diversos' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="pl-7"
                    value={(campo as unknown as Record<string, number>)[key] ?? ''}
                    onChange={(e) => update(key, e.target.value ? (parseMoney(e.target.value) ?? null) : null)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            ))}
          </div>
          <Button onClick={guardar} disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'A guardar...' : 'Guardar orçamento'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}

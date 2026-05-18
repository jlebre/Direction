'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Lock, MapPin, Users, Euro, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Campo } from '@/types/shared'
import Link from 'next/link'

export default function SetupForm({ campo }: { campo: Campo }) {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    diretor: campo.diretor ?? '',
    adjunto: campo.adjunto ?? '',
    mama: campo.mama ?? '',
    local: campo.local ?? '',
    num_animados: campo.num_animados ?? 0,
    num_animadores: campo.num_animadores ?? 0,
    saldo_inicial: campo.saldo_inicial ?? 0,
    orcamento_alimentacao: campo.orcamento_alimentacao ?? '',
    orcamento_compras_gerais: campo.orcamento_compras_gerais ?? '',
    orcamento_talho: campo.orcamento_talho ?? '',
    orcamento_pao: campo.orcamento_pao ?? '',
    orcamento_frutas_legumes: campo.orcamento_frutas_legumes ?? '',
    orcamento_diversos: campo.orcamento_diversos ?? '',
    pin: campo.pin ?? '',
  })
  const [saving, setSaving] = useState(false)

  function upd(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function guardar() {
    if (!form.mama.trim() || !form.diretor.trim()) {
      toast.error('Diretor/a e Mamã são obrigatórios')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('campos')
        .update({
          diretor: form.diretor.trim(),
          adjunto: form.adjunto.trim(),
          mama: form.mama.trim(),
          local: form.local.trim() || null,
          num_animados: Number(form.num_animados) || 0,
          num_animadores: Number(form.num_animadores) || 0,
          saldo_inicial: Number(form.saldo_inicial) || 0,
          orcamento_alimentacao: form.orcamento_alimentacao !== '' ? Number(form.orcamento_alimentacao) : null,
          orcamento_compras_gerais: form.orcamento_compras_gerais !== '' ? Number(form.orcamento_compras_gerais) : null,
          orcamento_talho: form.orcamento_talho !== '' ? Number(form.orcamento_talho) : null,
          orcamento_pao: form.orcamento_pao !== '' ? Number(form.orcamento_pao) : null,
          orcamento_frutas_legumes: form.orcamento_frutas_legumes !== '' ? Number(form.orcamento_frutas_legumes) : null,
          orcamento_diversos: form.orcamento_diversos !== '' ? Number(form.orcamento_diversos) : null,
          pin: form.pin.trim() || null,
          setup_completo: true,
        })
        .eq('id', campo.id)
      if (error) throw error
      toast.success('Campo configurado!')
      router.push(`/campo/${campo.id}`)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E7E8D1] px-4 h-14 flex items-center gap-3">
        <Link href={campo.setup_completo ? `/campo/${campo.id}` : '/'} className="text-[#2D5016] hover:opacity-70">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-[#36454F] flex-1 truncate">
          {campo.setup_completo ? 'Editar Setup' : 'Configurar campo'}
        </h1>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-5 pb-10">
        {/* Campo info (read-only) */}
        <div className="bg-[#2D5016]/10 border border-[#2D5016]/20 rounded-2xl p-4 space-y-1">
          <p className="font-bold text-[#2D5016] text-lg">{campo.nome}</p>
          {campo.escalao && <p className="text-sm text-[#36454F]">{campo.escalao}</p>}
          {campo.datas && <p className="text-sm text-gray-500">{campo.datas}</p>}
          {campo.pre_campo && <p className="text-xs text-gray-400">Pré-campo: {campo.pre_campo}</p>}
        </div>

        {/* Equipa */}
        <div className="bg-white rounded-2xl border border-[#E7E8D1] p-4 space-y-4">
          <h2 className="font-bold text-[#36454F] flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Equipa
          </h2>
          <div className="space-y-3">
            {[
              { key: 'mama', label: 'Mamã', required: true, placeholder: 'Nome da Mamã' },
              { key: 'diretor', label: 'Diretor/a', required: true, placeholder: 'Nome do Diretor ou Diretora' },
              { key: 'adjunto', label: 'Adjunto/a', required: false, placeholder: 'Nome do Adjunto ou Adjunta' },
            ].map(({ key, label, required, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label>
                  {label} {required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  placeholder={placeholder}
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={(e) => upd(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Local e participantes */}
        <div className="bg-white rounded-2xl border border-[#E7E8D1] p-4 space-y-4">
          <h2 className="font-bold text-[#36454F] flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" /> Local e participantes
          </h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Local</Label>
              <Input
                placeholder="Nome do local"
                value={form.local}
                onChange={(e) => upd('local', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº animados</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.num_animados}
                  onChange={(e) => upd('num_animados', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>Nº animadores</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.num_animadores}
                  onChange={(e) => upd('num_animadores', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Orçamento Adjuntos */}
        <div className="bg-white rounded-2xl border border-[#E7E8D1] p-4 space-y-4">
          <h2 className="font-bold text-[#36454F] flex items-center gap-2 text-sm">
            <Euro className="h-4 w-4" /> Saldo inicial (Adjuntos)
          </h2>
          <div className="space-y-1">
            <Label>Saldo inicial (€)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="pl-7"
                value={form.saldo_inicial}
                onChange={(e) => upd('saldo_inicial', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Orçamento Mamãs */}
        <div className="bg-white rounded-2xl border border-[#E7E8D1] p-4 space-y-4">
          <h2 className="font-bold text-[#36454F] flex items-center gap-2 text-sm">
            <Euro className="h-4 w-4" /> Orçamento Mamãs (opcional)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'orcamento_alimentacao', label: 'Alimentação total' },
              { key: 'orcamento_compras_gerais', label: 'Despensa' },
              { key: 'orcamento_talho', label: 'Talho' },
              { key: 'orcamento_pao', label: 'Padaria' },
              { key: 'orcamento_frutas_legumes', label: 'Frutas e legumes' },
              { key: 'orcamento_diversos', label: 'Diversos' },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="pl-7"
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => upd(key, e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PIN */}
        <div className="bg-white rounded-2xl border border-[#E7E8D1] p-4 space-y-4">
          <h2 className="font-bold text-[#36454F] flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4" /> PIN de proteção (opcional)
          </h2>
          <p className="text-xs text-gray-500">
            Protege ações como eliminar despesas. Qualquer pessoa com o PIN pode editar.
          </p>
          <div className="space-y-1">
            <Label>PIN (4 dígitos)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="• • • •"
              value={form.pin}
              onChange={(e) => upd('pin', e.target.value.replace(/\D/g, ''))}
              className="max-w-32"
            />
          </div>
        </div>

        <Button
          onClick={guardar}
          disabled={saving}
          className="w-full h-12 text-base font-bold bg-[#2D5016] hover:bg-[#2D5016]/90 text-white"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'A guardar...' : campo.setup_completo ? 'Guardar alterações' : 'Confirmar e entrar'}
        </Button>

        {campo.setup_completo && (
          <p className="text-center text-xs text-gray-400">
            ou{' '}
            <Link href={`/campo/${campo.id}`} className="text-[#2D5016] underline">
              voltar sem guardar
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Lock, MapPin, Users, Euro, ChevronLeft, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Campo } from '@/types/shared'
import Link from 'next/link'

interface DryRunResult {
  countDespesas: number
  countComFoto: number
  fotoPaths: string[]
}

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
    pin: campo.pin ?? '',
  })
  const [saving, setSaving] = useState(false)

  // Danger Zone state
  const [dangerOpen, setDangerOpen] = useState(false)
  const [dangerConfirm, setDangerConfirm] = useState('')
  const [dangerPin, setDangerPin] = useState('')
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null)
  const [dryRunLoading, setDryRunLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const CONFIRMACAO_TEXTO = 'LIMPAR FATURAS'
  const dangerReady =
    dangerConfirm === CONFIRMACAO_TEXTO &&
    (!campo.pin || dangerPin === campo.pin) &&
    dryRun !== null

  function upd(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function runDryRun() {
    setDryRunLoading(true)
    setDryRun(null)
    try {
      const { data: despesasData } = await supabase
        .from('despesas')
        .select('id, foto_path')
        .eq('campo_id', campo.id)

      const all = despesasData ?? []
      const comFoto = all.filter((d: { foto_path: string | null }) => d.foto_path)
      setDryRun({
        countDespesas: all.length,
        countComFoto: comFoto.length,
        fotoPaths: comFoto.map((d: { foto_path: string }) => d.foto_path),
      })
    } catch {
      toast.error('Erro ao calcular preview. Tenta de novo.')
    } finally {
      setDryRunLoading(false)
    }
  }

  async function handleLimparFaturas() {
    if (!dangerReady || !dryRun) return
    setDeleting(true)
    try {
      // 1. Apagar despesas (CASCADE elimina regularizacoes_nif associadas automaticamente)
      const { error: despesasError } = await supabase
        .from('despesas')
        .delete()
        .eq('campo_id', campo.id)
      if (despesasError) throw despesasError

      // 2. Apagar liquidacoes_nif (sem CASCADE — precisa de delete explícito)
      await supabase.from('liquidacoes_nif').delete().eq('campo_id', campo.id)

      // 3. Apagar imagens do storage (falha silenciosa por ficheiro)
      if (dryRun.fotoPaths.length > 0) {
        await supabase.storage.from('faturas').remove(dryRun.fotoPaths)
      }

      toast.success(`${dryRun.countDespesas} faturas eliminadas com sucesso.`)
      setDangerOpen(false)
      setDangerConfirm('')
      setDangerPin('')
      setDryRun(null)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao eliminar faturas')
    } finally {
      setDeleting(false)
    }
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

        {/* ─── DANGER ZONE ─────────────────────────────────────────── */}
        {campo.setup_completo && (
          <div className="rounded-2xl border-2 border-red-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { setDangerOpen((v) => !v); setDryRun(null); setDangerConfirm(''); setDangerPin('') }}
              className="w-full flex items-center justify-between px-4 py-3 bg-red-50 text-left"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-bold text-red-700">Danger Zone</span>
              </div>
              <span className="text-xs text-red-400">{dangerOpen ? '▲' : '▼'}</span>
            </button>

            {dangerOpen && (
              <div className="p-4 space-y-4 bg-white">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Esta área permite <strong>eliminar todas as faturas</strong> deste campo.
                  Os dados da configuração do campo e da área das mamãs não são afectados.
                  Esta acção <strong className="text-red-600">não pode ser desfeita</strong>.
                </p>

                {/* Preview / dry-run */}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={runDryRun}
                    disabled={dryRunLoading}
                    className="w-full border-gray-300 text-gray-600 text-xs"
                  >
                    {dryRunLoading ? 'A calcular...' : '🔍 Preview — ver o que será eliminado'}
                  </Button>

                  {dryRun !== null && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1 text-xs">
                      <p className="font-bold text-red-700 mb-2">O que vai ser eliminado:</p>
                      <p className="text-red-600">🧾 {dryRun.countDespesas} fatura(s) / registo(s) de despesa</p>
                      <p className="text-red-600">📷 {dryRun.countComFoto} imagem(ns) no storage</p>
                      <p className="text-red-600">📋 Regularizações e liquidações NIF associadas</p>
                      {dryRun.countDespesas === 0 && (
                        <p className="text-green-600 mt-2 font-medium">✓ Não há faturas para este campo.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirmação */}
                <div className="space-y-3">
                  {campo.pin && (
                    <div className="space-y-1">
                      <Label className="text-xs text-red-700">PIN do campo</Label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="• • • •"
                        value={dangerPin}
                        onChange={(e) => setDangerPin(e.target.value.replace(/\D/g, ''))}
                        className="max-w-32 border-red-300"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs text-red-700">
                      Escreve <span className="font-mono font-bold">LIMPAR FATURAS</span> para confirmar
                    </Label>
                    <Input
                      type="text"
                      value={dangerConfirm}
                      onChange={(e) => setDangerConfirm(e.target.value)}
                      placeholder="LIMPAR FATURAS"
                      className="border-red-300 font-mono"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleLimparFaturas}
                  disabled={!dangerReady || deleting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {deleting ? 'A eliminar...' : 'Eliminar todas as faturas'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

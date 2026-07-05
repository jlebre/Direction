'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { compressImage } from '@/lib/adjuntos/image-utils'
import { getCampoSlug, getPhotoFilename } from '@/lib/adjuntos/supabase-storage'
import type { Campo } from '@/types/shared'
import type { Despesa, RegularizacaoNif } from '@/types/adjuntos'
import CodeSelector from '@/components/adjuntos/CodeSelector'
import PinDialog from '@/components/shared/PinDialog'
import Toast from '@/components/shared/Toast'

type Step = 'select' | 'create'
type EstadoFatura = 'pendente' | 'parcial' | 'regularizada'

interface FaturaInfo extends Despesa {
  valorPendente: number
  estado: EstadoFatura
}

interface Props {
  campo: Campo
  faturasSemNIF: Despesa[]
  regularizacoes: RegularizacaoNif[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function computeAllocations(
  faturas: FaturaInfo[],
  totalValor: number,
  totalPendente: number
): { faturaId: string; valor: number }[] {
  if (faturas.length === 0) return []
  if (totalValor >= totalPendente) {
    return faturas.map((f) => ({ faturaId: f.id, valor: f.valorPendente }))
  }
  // Alocação proporcional com fix de arredondamento no último item
  let remaining = Math.round(totalValor * 100)
  const result: { faturaId: string; valor: number }[] = []
  for (let i = 0; i < faturas.length; i++) {
    const f = faturas[i]
    if (i === faturas.length - 1) {
      if (remaining > 0) result.push({ faturaId: f.id, valor: remaining / 100 })
    } else {
      const prop = Math.round((f.valorPendente / totalPendente) * totalValor * 100)
      if (prop > 0) {
        result.push({ faturaId: f.id, valor: prop / 100 })
        remaining -= prop
      }
    }
  }
  return result
}

export default function RegularizarClient({ campo, faturasSemNIF, regularizacoes }: Props) {
  const router = useRouter()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [showPin, setShowPin] = useState(!!campo.pin)
  const [pinError, setPinError] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(!campo.pin)

  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(today())
  const [codigo, setCodigo] = useState<string | null>(null)
  const [codigoDescricao, setCodigoDescricao] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function handlePinConfirm(pin: string) {
    if (pin === campo.pin) { setPinUnlocked(true); setShowPin(false); setPinError(false) }
    else { setPinError(true); setTimeout(() => setPinError(false), 1200) }
  }

  // Calcular estado por fatura
  const faturasInfo: FaturaInfo[] = faturasSemNIF.map((f) => {
    const totalReg = regularizacoes
      .filter((r) => r.despesa_original_id === f.id)
      .reduce((s, r) => s + Number(r.valor), 0)
    const valorPendente = Math.max(0, Number(f.valor) - totalReg)
    let estado: EstadoFatura
    if (totalReg === 0) estado = 'pendente'
    else if (valorPendente > 0.005) estado = 'parcial'
    else estado = 'regularizada'
    return { ...f, valorPendente, estado }
  })

  const faturasParaRegularizar = faturasInfo.filter((f) => f.estado !== 'regularizada')
  const selectedFaturas = faturasParaRegularizar.filter((f) => selected.has(f.id))
  const totalSelecionado = selectedFaturas.reduce((s, f) => s + f.valorPendente, 0)

  function toggleFatura(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function goToCreate() {
    setValor(totalSelecionado.toFixed(2))
    setStep('create')
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoLoading(true)
    try {
      const compressed = await compressImage(file)
      setPhotoFile(new File([compressed], file.name, { type: 'image/jpeg' }))
      setPhotoPreview(URL.createObjectURL(compressed))
    } finally {
      setPhotoLoading(false)
    }
  }

  async function handleSubmit() {
    if (!codigo || !valor || parseFloat(valor) <= 0 || selectedFaturas.length === 0) return
    setSubmitting(true)
    try {
      // 1. Número de recibo
      const { data: lastDespesa } = await supabase
        .from('despesas')
        .select('numero_recibo')
        .eq('campo_id', campo.id)
        .order('numero_recibo', { ascending: false })
        .limit(1)
        .single()
      const numeroRecibo = (lastDespesa?.numero_recibo ?? 0) + 1

      // 2. Upload da foto (opcional)
      let fotoPath: string | null = null
      if (photoFile) {
        const filename = getPhotoFilename(campo.nome, numeroRecibo)
        const slug = getCampoSlug(campo.nome)
        const path = `${slug}/${filename}`
        const compressed = await compressImage(photoFile)
        const { error: uploadError } = await supabase.storage
          .from('faturas')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
        if (!uploadError) fotoPath = path
      }

      // 3. Criar fatura de regularização
      const totalValor = parseFloat(valor)
      const { data: novaDespesa, error: insertError } = await supabase
        .from('despesas')
        .insert({
          campo_id: campo.id,
          numero_recibo: numeroRecibo,
          data,
          valor: totalValor,
          descricao: descricao.trim() || null,
          codigo: codigo!,
          codigo_descricao: codigoDescricao!,
          tipo: 'despesa',
          nif_confirmado: true,
          is_regularizacao_nif: true,
          foto_path: fotoPath,
        })
        .select('id')
        .single()

      if (insertError || !novaDespesa) throw insertError ?? new Error('Despesa não criada')

      // 4. Calcular alocações proporcionais
      const totalPendente = selectedFaturas.reduce((s, f) => s + f.valorPendente, 0)
      const allocations = computeAllocations(selectedFaturas, totalValor, totalPendente)

      // 5. Inserir ligações de regularização
      if (allocations.length > 0) {
        const { error: regError } = await supabase.from('regularizacoes_nif').insert(
          allocations.map((a) => ({
            campo_id: campo.id,
            despesa_regularizacao_id: novaDespesa.id,
            despesa_original_id: a.faturaId,
            valor: a.valor,
          }))
        )
        if (regError) throw regError
      }

      setToast({
        msg: `Fatura #${numeroRecibo} criada · ${selectedFaturas.length} fatura(s) regularizada(s)`,
        type: 'success',
      })
      setTimeout(() => {
        router.push(`/campo/${campo.id}/adjuntos`)
        router.refresh()
      }, 1200)
    } catch {
      setToast({ msg: 'Erro ao criar regularização. Tenta de novo.', type: 'error' })
      setSubmitting(false)
    }
  }

  if (showPin) {
    return (
      <PinDialog
        onConfirm={handlePinConfirm}
        onCancel={() => router.back()}
        error={pinError}
        subtitle="Introduz o PIN para regularizar faturas NIF."
      />
    )
  }
  if (!pinUnlocked) return null

  // ─── Estado: sem faturas por regularizar ─────────────────────────────────
  if (faturasParaRegularizar.length === 0) {
    return (
      <main className="min-h-screen">
        <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
          <div className="max-w-lg mx-auto">
            <Link href={`/campo/${campo.id}/adjuntos`} className="text-red-200 text-sm">← Adjuntos</Link>
            <h1 className="text-xl font-bold mt-2">Regularizar NIF</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-bold text-gray-800">Tudo regularizado!</p>
          <p className="text-sm text-gray-400 mt-1">Não há faturas sem NIF por regularizar.</p>
          <Link href={`/campo/${campo.id}/adjuntos`} className="mt-6 inline-block text-sm text-[#B85042] font-medium">
            ← Voltar aos adjuntos
          </Link>
        </div>
      </main>
    )
  }

  // ─── Passo 1: Seleccionar faturas ─────────────────────────────────────────
  if (step === 'select') {
    return (
      <main className="min-h-screen pb-8">
        <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Link href={`/campo/${campo.id}/adjuntos`} className="text-red-200 text-sm">← Adjuntos</Link>
            <span className="text-red-200 text-sm">1 / 2</span>
          </div>
          <div className="max-w-lg mx-auto mt-2">
            <h1 className="text-xl font-bold">Regularizar NIF</h1>
            <p className="text-red-200 text-sm mt-0.5">Selecciona as faturas a regularizar</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
          {faturasParaRegularizar.map((f) => {
            const isSelected = selected.has(f.id)
            const badgeLabel =
              f.estado === 'pendente' ? 'pendente' :
              `parcial · €${f.valorPendente.toFixed(2)} em aberto`

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFatura(f.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors active:opacity-80 ${
                  isSelected
                    ? 'border-[#B85042] bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-[#B85042] bg-[#B85042]' : 'border-gray-300'
                }`}>
                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">#{f.numero_recibo}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      f.estado === 'pendente' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {badgeLabel}
                    </span>
                    {f.foto_path && <span className="text-xs text-gray-400">📷</span>}
                  </div>
                  {f.descricao && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{f.descricao}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(f.data)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold text-gray-900">€{Number(f.valor).toFixed(2)}</p>
                  {f.estado === 'parcial' && (
                    <p className="text-xs text-orange-600">€{f.valorPendente.toFixed(2)} por regularizar</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Rodapé fixo com total e botão */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <div className="flex-1">
              {selected.size > 0 ? (
                <>
                  <p className="text-xs text-gray-400">{selected.size} fatura(s) seleccionada(s)</p>
                  <p className="text-lg font-bold text-gray-900">€{totalSelecionado.toFixed(2)}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Selecciona pelo menos uma fatura</p>
              )}
            </div>
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={goToCreate}
              className="px-6 py-3 bg-[#B85042] text-white font-bold rounded-xl disabled:opacity-40 active:opacity-90 transition-opacity"
            >
              Seguinte →
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ─── Passo 2: Criar nova fatura NIF ──────────────────────────────────────
  return (
    <main className="min-h-screen pb-8">
      <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button type="button" onClick={() => setStep('select')} className="text-red-200 text-sm">
            ← Voltar
          </button>
          <span className="text-red-200 text-sm">2 / 2</span>
        </div>
        <div className="max-w-lg mx-auto mt-2">
          <h1 className="text-xl font-bold">Nova Fatura NIF</h1>
          <p className="text-red-200 text-sm mt-0.5">
            Regulariza {selected.size} fatura(s) · €{totalSelecionado.toFixed(2)} em aberto
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Foto */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Foto da fatura NIF
          </h2>
          {photoPreview ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Fatura NIF" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 bg-white active:bg-gray-50"
                >
                  📷 Câmara
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 bg-white active:bg-gray-50"
                >
                  🖼 Galeria
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {photoLoading ? (
                <div className="w-full flex items-center justify-center gap-2 py-10 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
                  <div className="w-8 h-8 border-4 border-[#B85042] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 py-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 active:bg-gray-50"
                  >
                    <span className="text-3xl">📷</span>
                    <p className="text-sm font-medium">Câmara</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 py-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 active:bg-gray-50"
                  >
                    <span className="text-3xl">🖼</span>
                    <p className="text-sm font-medium">Galeria</p>
                  </button>
                </div>
              )}
              <p className="text-xs text-center text-gray-400">Opcional — mas recomendado</p>
            </div>
          )}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </section>

        {/* Detalhes */}
        <section className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-400">Valor da fatura NIF (€)</label>
              <button
                type="button"
                onClick={() => setValor(totalSelecionado.toFixed(2))}
                className="text-xs text-[#B85042] font-semibold"
              >
                Tudo (€{totalSelecionado.toFixed(2)})
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-xl text-gray-400 mr-1.5">€</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 focus:outline-none"
                autoFocus
              />
            </div>
            {parseFloat(valor) < totalSelecionado && parseFloat(valor) > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                Regularização parcial — as faturas ficam com saldo em aberto.
              </p>
            )}
          </div>

          <div className="px-4 py-3">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value.slice(0, 100))}
              placeholder="Ex: Fatura consolidada NIF — supermercado julho"
              rows={2}
              className="w-full text-sm text-gray-900 focus:outline-none resize-none placeholder:text-gray-300"
            />
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-400">Data da fatura NIF</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="text-sm font-medium text-gray-900 focus:outline-none"
            />
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">NIF CAMTIL</p>
              <span className="text-xs font-mono font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ 501 979 891</span>
            </div>
          </div>
        </section>

        {/* Categoria */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categoria</h2>
          <CodeSelector
            selected={codigo}
            onSelect={(code, desc) => { setCodigo(code); setCodigoDescricao(desc) }}
          />
        </section>

        {/* Resumo das faturas seleccionadas */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            Faturas a regularizar ({selected.size})
          </p>
          <div className="space-y-1">
            {selectedFaturas.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-700">#{f.numero_recibo} {f.descricao ? `— ${f.descricao}` : ''}</span>
                <span className="font-medium text-amber-900">€{f.valorPendente.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          disabled={!codigo || !valor || parseFloat(valor) <= 0 || submitting}
          onClick={handleSubmit}
          className="w-full py-4 bg-[#B85042] text-white font-bold text-base rounded-xl disabled:opacity-40 active:opacity-90"
        >
          {submitting ? 'A criar...' : 'Criar fatura de regularização'}
        </button>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </main>
  )
}

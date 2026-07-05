'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { compressImage } from '@/lib/adjuntos/image-utils'
import { getCampoSlug, getPhotoFilename } from '@/lib/adjuntos/supabase-storage'
import type { Campo } from '@/types/shared'
import PhotoCapture from '@/components/adjuntos/PhotoCapture'
import CodeSelector from '@/components/adjuntos/CodeSelector'
import PinDialog from '@/components/shared/PinDialog'
import Toast from '@/components/shared/Toast'

type Step = 1 | 2 | 3 | 4

interface FormState {
  photoFile: File | null
  photoPreview: string | null
  valor: string
  descricao: string
  data: string
  codigo: string | null
  codigoDescricao: string | null
  nifConfirmado: boolean
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function NovaDespesaClient({ campo }: { campo: Campo }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    photoFile: null, photoPreview: null, valor: '', descricao: '',
    data: today(), codigo: null, codigoDescricao: null, nifConfirmado: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showPin, setShowPin] = useState(!!campo.pin)
  const [pinError, setPinError] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(!campo.pin)

  function handlePinConfirm(pin: string) {
    if (pin === campo.pin) { setPinUnlocked(true); setShowPin(false); setPinError(false) }
    else { setPinError(true); setTimeout(() => setPinError(false), 1200) }
  }

  const handlePhoto = useCallback((file: File, preview: string) => {
    setForm((f) => ({ ...f, photoFile: file, photoPreview: preview }))
  }, [])

  function canGoNext(): boolean {
    if (step === 1) return true
    if (step === 2) return !!form.valor && parseFloat(form.valor) > 0
    if (step === 3) return !!form.codigo
    if (step === 4) return true
    return false
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: lastDespesa } = await supabase
        .from('despesas').select('numero_recibo').eq('campo_id', campo.id)
        .order('numero_recibo', { ascending: false }).limit(1).single()
      const numeroRecibo = (lastDespesa?.numero_recibo ?? 0) + 1

      let fotoPath: string | null = null
      if (form.photoFile) {
        const filename = getPhotoFilename(campo.nome, numeroRecibo)
        const slug = getCampoSlug(campo.nome)
        const path = `${slug}/${filename}`
        const compressed = await compressImage(form.photoFile)
        const { error: uploadError } = await supabase.storage
          .from('faturas').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
        if (!uploadError) fotoPath = path
      }

      const { error: insertError } = await supabase.from('despesas').insert({
        campo_id: campo.id, numero_recibo: numeroRecibo, data: form.data,
        valor: parseFloat(form.valor), descricao: form.descricao.trim() || null,
        codigo: form.codigo!, codigo_descricao: form.codigoDescricao!,
        tipo: 'despesa', nif_confirmado: form.nifConfirmado, foto_path: fotoPath,
      })
      if (insertError) throw insertError

      setToast({ msg: `Despesa #${numeroRecibo} registada!`, type: 'success' })
      setTimeout(() => { router.push(`/campo/${campo.id}/adjuntos`); router.refresh() }, 800)
    } catch {
      setToast({ msg: 'Erro ao registar. Tenta de novo.', type: 'error' })
      setSubmitting(false)
    }
  }

  if (showPin) {
    return (
      <PinDialog
        onConfirm={handlePinConfirm}
        onCancel={() => router.back()}
        error={pinError}
        subtitle="Este campo requer um PIN para adicionar despesas."
      />
    )
  }
  if (!pinUnlocked) return null

  return (
    <main className="min-h-screen flex flex-col">
      <div className="bg-[#B85042] text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
              className="text-red-200 text-sm"
            >
              ← {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>
            <p className="text-red-200 text-sm">{campo.nome}</p>
          </div>
          <h1 className="text-xl font-bold mt-2">Nova Despesa</h1>
          <div className="flex gap-1.5 mt-3">
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-red-800'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {step === 1 && (
          <StepWrapper title="Foto da Fatura" subtitle="Fotografia a fatura (recomendado)">
            <PhotoCapture
              onPhoto={(file, preview) => { handlePhoto(file, preview) }}
              onSkip={() => setStep(2)}
              currentPreview={form.photoPreview}
            />
            {form.photoPreview && (
              <button type="button" onClick={() => setStep(2)} className="w-full mt-4 py-4 bg-[#B85042] text-white font-bold text-base rounded-xl active:opacity-90">
                Seguinte →
              </button>
            )}
          </StepWrapper>
        )}

        {step === 2 && (
          <StepWrapper title="Detalhes" subtitle="Valor e descrição da despesa">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (€) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">€</span>
                  <input
                    type="number" inputMode="decimal" step="0.01" min="0.01"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-4 text-2xl font-bold focus:outline-none focus:border-[#B85042]"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value.slice(0, 100) }))}
                  placeholder="Ex: Compras Lidl para jantar de sábado"
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#B85042] resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{form.descricao.length}/100</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date" value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#B85042]"
                />
              </div>
            </div>
            <button type="button" disabled={!canGoNext()} onClick={() => setStep(3)} className="w-full mt-6 py-4 bg-[#B85042] text-white font-bold text-base rounded-xl disabled:opacity-40 active:opacity-90">
              Seguinte →
            </button>
          </StepWrapper>
        )}

        {step === 3 && (
          <StepWrapper title="Categoria" subtitle="Seleciona o código da despesa">
            <CodeSelector
              selected={form.codigo}
              onSelect={(code, desc) => setForm((f) => ({ ...f, codigo: code, codigoDescricao: desc }))}
            />
            <button type="button" disabled={!canGoNext()} onClick={() => setStep(4)} className="w-full mt-6 py-4 bg-[#B85042] text-white font-bold text-base rounded-xl disabled:opacity-40 active:opacity-90">
              Seguinte →
            </button>
          </StepWrapper>
        )}

        {step === 4 && (
          <StepWrapper title="Confirmação" subtitle="Revê os dados antes de registar">
            <div className="space-y-4">
              {form.photoPreview && (
                <div className="rounded-xl overflow-hidden aspect-video bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.photoPreview} alt="Fatura" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {[
                  ['Valor', `€${parseFloat(form.valor).toFixed(2)}`],
                  ['Descrição', form.descricao],
                  ['Data', new Date(form.data + 'T00:00:00').toLocaleDateString('pt-PT')],
                  ['Código', form.codigo ?? ''],
                  ['Categoria', form.codigoDescricao ?? ''],
                  ['Foto', form.photoFile ? '✓ Incluída' : 'Sem foto'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start px-4 py-3 gap-4">
                    <span className="text-sm text-gray-500 shrink-0">{label}</span>
                    <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>

              <div className={`rounded-xl border-2 p-4 transition-colors ${form.nifConfirmado ? 'border-green-300 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={form.nifConfirmado}
                    onChange={(e) => setForm((f) => ({ ...f, nifConfirmado: e.target.checked }))}
                    className="mt-0.5 w-5 h-5 accent-[#B85042] cursor-pointer"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-800">A fatura tem o NIF do CAMTIL</p>
                    <p className="text-sm font-mono font-bold text-[#B85042] mt-0.5">501 979 891</p>
                    {!form.nifConfirmado && (
                      <p className="text-xs text-amber-700 mt-1">Sem NIF — o valor entrará na bolsa por liquidar.</p>
                    )}
                  </div>
                </label>
              </div>
            </div>
            <button
              type="button" disabled={submitting} onClick={handleSubmit}
              className="w-full mt-6 py-4 bg-[#B85042] text-white font-bold text-base rounded-xl disabled:opacity-40 active:opacity-90"
            >
              {submitting ? 'A registar...' : 'Registar Despesa'}
            </button>
          </StepWrapper>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </main>
  )
}

function StepWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-400 mt-0.5 mb-5">{subtitle}</p>
      {children}
    </div>
  )
}

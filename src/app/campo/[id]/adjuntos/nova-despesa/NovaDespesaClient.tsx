'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { compressImage } from '@/lib/adjuntos/image-utils'
import { getCampoSlug, getPhotoFilename } from '@/lib/adjuntos/supabase-storage'
import type { CampoPublico } from '@/types/shared'
import { validatePin } from '@/actions/validatePin'
import PhotoCapture from '@/components/adjuntos/PhotoCapture'
import CodeSelector from '@/components/adjuntos/CodeSelector'
import PinDialog from '@/components/shared/PinDialog'
import Toast from '@/components/shared/Toast'
import { OcrResultCard } from '@/components/adjuntos/OcrResultCard'
import type { OcrUsarPayload } from '@/components/adjuntos/OcrResultCard'
import type { LinhaParsed } from '@/lib/adjuntos/ocr-parser'
import { useOcr } from '@/hooks/useOcr'
import { QRScanner } from '@/components/adjuntos/QRScanner'
import { parsearQrFatura, type QrFaturaData } from '@/lib/adjuntos/qr-parser'

type Step = 1 | 2 | 3 | 4

const CAMTIL_NIF = '501979891'

interface FormState {
  photoFile: File | null
  photoPreview: string | null
  valor: string
  descricao: string
  data: string
  codigo: string | null
  codigoDescricao: string | null
  nifConfirmado: boolean
  nifOrigemOcr: boolean
  nifVisivel: boolean
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function NovaDespesaClient({ campo, hasPin }: { campo: CampoPublico; hasPin: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    photoFile: null, photoPreview: null, valor: '', descricao: '',
    data: today(), codigo: null, codigoDescricao: null,
    nifConfirmado: false, nifOrigemOcr: false, nifVisivel: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showPin, setShowPin] = useState(hasPin)
  const [pinError, setPinError] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(!hasPin)
  const [linhasOcrEditadas, setLinhasOcrEditadas] = useState<LinhaParsed[] | null>(null)
  // QR Code
  const [mostrarQrScanner, setMostrarQrScanner] = useState(false)
  const [qrParsed, setQrParsed] = useState<QrFaturaData | null>(null)
  const [origemDados, setOrigemDados] = useState<'manual' | 'ocr' | 'qr_code'>('manual')

  const ocr = useOcr()

  async function handlePinConfirm(pin: string) {
    const valid = await validatePin(campo.id, pin)
    if (valid) { setPinUnlocked(true); setShowPin(false); setPinError(false) }
    else { setPinError(true); setTimeout(() => setPinError(false), 1200) }
  }

  const handlePhoto = useCallback((file: File, preview: string) => {
    setForm((f) => ({ ...f, photoFile: file, photoPreview: preview }))
    setQrParsed(null) // foto substitui QR
    ocr.processar(file)
  }, [ocr])

  function handleUsarOcr({ total, data, fornecedor, nifConfirmado, linhas }: OcrUsarPayload) {
    setOrigemDados('ocr')
    setForm((f) => ({
      ...f,
      valor: total !== null && total > 0 ? total.toFixed(2) : f.valor,
      data: data ?? f.data,
      descricao: fornecedor && !f.descricao ? `Compras ${fornecedor}` : f.descricao,
      nifConfirmado: nifConfirmado ? true : f.nifConfirmado,
      nifOrigemOcr: nifConfirmado,
      nifVisivel: nifConfirmado ? true : f.nifVisivel,
    }))
    setLinhasOcrEditadas(linhas)
    const novoValor = total !== null && total > 0 ? total.toFixed(2) : ''
    if (nifConfirmado && novoValor) {
      setStep(3)
    } else {
      setStep(2)
    }
  }

  function handleQrRead(raw: string) {
    setMostrarQrScanner(false)
    const data = parsearQrFatura(raw)
    setQrParsed(data)
  }

  function handleUsarQr() {
    if (!qrParsed) return
    const nifConfirmado = qrParsed.qr_nif_adquirente?.replace(/\s/g, '') === CAMTIL_NIF
    setOrigemDados('qr_code')
    setForm((f) => ({
      ...f,
      valor: qrParsed.qr_total !== null ? qrParsed.qr_total.toFixed(2) : f.valor,
      data: qrParsed.qr_data ?? f.data,
      descricao: f.descricao || (qrParsed.qr_numero_documento ? `Fatura ${qrParsed.qr_numero_documento}` : f.descricao),
      nifConfirmado: nifConfirmado ? true : f.nifConfirmado,
      nifOrigemOcr: false,
      nifVisivel: nifConfirmado ? true : f.nifVisivel,
    }))
    if (nifConfirmado && qrParsed.qr_total !== null) {
      setStep(3)
    } else {
      setStep(2)
    }
  }

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
      // Fazer upload da foto antes do loop de retry
      let fotoPath: string | null = null
      if (form.photoFile) {
        // Número provisório para o filename (pode ficar ligeiramente errado se houver race condition,
        // mas o foto_path no DB aponta sempre para o ficheiro real, que existe)
        const { data: lastForPhoto } = await supabase
          .from('despesas').select('numero_recibo').eq('campo_id', campo.id)
          .order('numero_recibo', { ascending: false }).limit(1).single()
        const provNum = (lastForPhoto?.numero_recibo ?? 0) + 1
        const filename = getPhotoFilename(campo.nome, provNum)
        const slug = getCampoSlug(campo.nome)
        const path = `${slug}/${filename}`
        const compressed = await compressImage(form.photoFile)
        const { error: uploadError } = await supabase.storage
          .from('faturas').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
        if (!uploadError) fotoPath = path
      }

      const ocrStatus = ocr.resultado ? 'processado' : (ocr.status === 'error' ? 'falhou' : 'nenhum')

      // Retry loop — em caso de conflito de numero_recibo (único por campo), tenta 3 vezes
      let novaDespesa: { id: string } | null = null
      let numeroRecibo = 0
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: lastDespesa } = await supabase
          .from('despesas').select('numero_recibo').eq('campo_id', campo.id)
          .order('numero_recibo', { ascending: false }).limit(1).single()
        numeroRecibo = (lastDespesa?.numero_recibo ?? 0) + 1

        const { data, error: insertError } = await supabase.from('despesas').insert({
          campo_id: campo.id, numero_recibo: numeroRecibo, data: form.data,
          valor: parseFloat(form.valor), descricao: form.descricao.trim() || null,
          codigo: form.codigo!, codigo_descricao: form.codigoDescricao!,
          tipo: 'despesa', nif_confirmado: form.nifConfirmado, foto_path: fotoPath,
          ocr_status: ocrStatus,
          ocr_texto: ocr.resultado?.texto_bruto ?? null,
          ocr_fornecedor: ocr.resultado?.fornecedor ?? null,
          ocr_total: ocr.resultado?.total_detectado ?? null,
          ocr_data: ocr.resultado?.data_detectada ?? null,
          origem_dados: origemDados,
          nif_visivel: form.nifVisivel,
          qr_raw: qrParsed?.qr_raw ?? null,
          qr_total: qrParsed?.qr_total ?? null,
          qr_data: qrParsed?.qr_data ?? null,
          qr_nif_emitente: qrParsed?.qr_nif_emitente ?? null,
          qr_nif_adquirente: qrParsed?.qr_nif_adquirente ?? null,
          qr_numero_documento: qrParsed?.qr_numero_documento ?? null,
          qr_atcud: qrParsed?.qr_atcud ?? null,
          qr_tipo_documento: qrParsed?.qr_tipo_documento ?? null,
        }).select('id').single()

        if (!insertError) { novaDespesa = data; break }
        // Código 23505 = unique_violation — aguarda e retenta com número actualizado
        if (insertError.code !== '23505' || attempt === 2) throw insertError
        await new Promise((r) => setTimeout(r, 100 * (attempt + 1)))
      }

      if (!novaDespesa) throw new Error('Falha ao obter ID da despesa')

      const linhasParaGuardar = linhasOcrEditadas ?? ocr.resultado?.linhas ?? []
      if (novaDespesa?.id && linhasParaGuardar.length > 0) {
        const linhasParaInserir = linhasParaGuardar
          .filter((l) => l.preco_total !== null && l.tipo_linha === 'produto')
          .map((l) => ({
            despesa_id: novaDespesa.id,
            texto_linha_original: l.texto_linha_original,
            nome_produto_bruto: l.nome_produto_bruto,
            quantidade: l.quantidade,
            unidade: l.unidade,
            preco_unitario: l.preco_unitario,
            preco_total: l.preco_total,
            confianca: l.confianca,
            estado: 'sugerido' as const,
            tipo_linha: l.tipo_linha,
            categoria_linha: l.categoria_linha,
          }))
        if (linhasParaInserir.length > 0) {
          await supabase.from('despesa_linhas').insert(linhasParaInserir)
        }
      }

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
          <StepWrapper title="Foto da Fatura" subtitle="Fotografia a fatura ou lê o QR Code">
            <PhotoCapture
              onPhoto={(file, preview) => { handlePhoto(file, preview) }}
              onSkip={() => setStep(2)}
              onQrCode={() => setMostrarQrScanner(true)}
              currentPreview={form.photoPreview}
            />

            {/* OCR card — aparece automaticamente após capturar foto */}
            {ocr.status !== 'idle' && (
              <div className="mt-4">
                <OcrResultCard
                  status={ocr.status}
                  progress={ocr.progress}
                  statusMsg={ocr.statusMsg}
                  resultado={ocr.resultado}
                  onUsar={(payload) => handleUsarOcr(payload)}
                />
              </div>
            )}

            {/* QR confirmação — aparece após ler QR Code */}
            {qrParsed && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-base">📱</span>
                    <p className="text-sm font-semibold text-blue-700">QR Code lido</p>
                  </div>
                  {!qrParsed.tem_dados_uteis ? (
                    <p className="text-xs text-amber-600">
                      Código lido mas sem dados úteis (total, NIF ou data). Tenta uma foto ou preenche manualmente.
                    </p>
                  ) : (
                    <div className="bg-white/70 rounded-lg divide-y divide-blue-100 text-sm">
                      {qrParsed.qr_total !== null && (
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-gray-500">Total</span>
                          <span className="font-bold text-blue-700">
                            €{qrParsed.qr_total.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                      {qrParsed.qr_data && (
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-gray-500">Data</span>
                          <span className="font-medium text-gray-800">
                            {qrParsed.qr_data.split('-').reverse().join('/')}
                          </span>
                        </div>
                      )}
                      {qrParsed.qr_nif_adquirente && (
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-gray-500">NIF adquirente</span>
                          <span className={`font-mono text-sm font-semibold ${qrParsed.qr_nif_adquirente === CAMTIL_NIF ? 'text-green-700' : 'text-gray-700'}`}>
                            {qrParsed.qr_nif_adquirente}
                            {qrParsed.qr_nif_adquirente === CAMTIL_NIF && ' ✓'}
                          </span>
                        </div>
                      )}
                      {qrParsed.qr_numero_documento && (
                        <div className="flex justify-between items-center px-3 py-2">
                          <span className="text-gray-500">Referência</span>
                          <span className="text-xs text-gray-700 truncate max-w-[180px]">
                            {qrParsed.qr_numero_documento}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-blue-200 flex gap-2">
                  {qrParsed.tem_dados_uteis ? (
                    <>
                      <button
                        type="button"
                        onClick={handleUsarQr}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold active:opacity-90"
                      >
                        Usar estes valores →
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrParsed(null)}
                        className="px-3 py-2.5 text-gray-400 text-sm"
                      >
                        Ignorar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMostrarQrScanner(true)}
                        className="flex-1 py-2.5 border border-blue-300 text-blue-600 rounded-lg text-sm font-semibold"
                      >
                        Tentar novamente
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrParsed(null)}
                        className="flex-1 py-2.5 text-gray-400 text-sm"
                      >
                        Ignorar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Botão Seguinte manual (sem usar OCR) */}
            {form.photoPreview && ocr.status !== 'a_carregar' && ocr.status !== 'a_processar' && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full mt-4 py-4 bg-[#B85042] text-white font-bold text-base rounded-xl active:opacity-90"
              >
                {ocr.status === 'done' ? 'Ignorar OCR e continuar →' : 'Seguinte →'}
              </button>
            )}

            {/* Enquanto OCR corre, mostrar botão mais discreto */}
            {form.photoPreview && (ocr.status === 'a_carregar' || ocr.status === 'a_processar') && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full mt-3 py-3 text-sm text-gray-400 font-medium"
              >
                Continuar sem esperar pelo OCR →
              </button>
            )}
          </StepWrapper>
        )}

        {step === 2 && (
          <StepWrapper title="Detalhes" subtitle="Valor e descrição da despesa">
            {/* Banner se OCR detectou um total diferente (só quando total > 0) */}
            {ocr.resultado?.total_detectado !== null &&
              ocr.resultado?.total_detectado !== undefined &&
              ocr.resultado.total_detectado > 0 &&
              form.valor !== ocr.resultado.total_detectado.toFixed(2) &&
              form.valor !== '' && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-green-700">
                    OCR detectou: <strong>€{ocr.resultado.total_detectado.toFixed(2).replace('.', ',')}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, valor: ocr.resultado!.total_detectado!.toFixed(2) }))}
                    className="text-xs font-semibold text-green-700 underline shrink-0"
                  >
                    Usar
                  </button>
                </div>
              )}

            {/* Banner se QR detectou um total diferente do campo actual */}
            {qrParsed?.qr_total !== null &&
              qrParsed?.qr_total !== undefined &&
              form.valor !== qrParsed.qr_total.toFixed(2) &&
              form.valor !== '' && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-blue-700">
                    QR Code: <strong>€{qrParsed.qr_total.toFixed(2).replace('.', ',')}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, valor: qrParsed!.qr_total!.toFixed(2) }))}
                    className="text-xs font-semibold text-blue-700 underline shrink-0"
                  >
                    Usar
                  </button>
                </div>
              )}

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
                {form.valor !== '' && parseFloat(form.valor) <= 0 && (
                  <p className="text-xs text-red-600 mt-1.5">O valor tem de ser maior que zero.</p>
                )}
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
                  ...(origemDados !== 'manual' ? [['Origem', origemDados === 'qr_code' ? '📱 QR Code' : '🔍 OCR']] : []),
                  ...((linhasOcrEditadas ?? ocr.resultado?.linhas ?? []).length > 0
                    ? [['OCR', `${(linhasOcrEditadas ?? ocr.resultado!.linhas).length} produtos`]]
                    : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start px-4 py-3 gap-4">
                    <span className="text-sm text-gray-500 shrink-0">{label}</span>
                    <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {form.nifOrigemOcr ? (
                <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 flex items-start gap-3">
                  <span className="text-green-600 mt-0.5 text-lg">✓</span>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">NIF detetado automaticamente pelo OCR</p>
                    <p className="text-sm font-mono font-bold text-[#B85042] mt-0.5">
                      {(ocr.resultado?.nif_detectado ?? '501979891').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, nifConfirmado: false, nifOrigemOcr: false }))}
                      className="text-xs text-gray-400 underline mt-1"
                    >
                      Corrigir manualmente
                    </button>
                  </div>
                </div>
              ) : form.nifVisivel && origemDados === 'qr_code' ? (
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                  <span className="text-blue-600 mt-0.5 text-lg">📱</span>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">NIF confirmado via QR Code</p>
                    <p className="text-sm font-mono font-bold text-[#B85042] mt-0.5">501 979 891</p>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, nifConfirmado: false, nifVisivel: false }))}
                      className="text-xs text-gray-400 underline mt-1"
                    >
                      Corrigir manualmente
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
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

      {/* QR Scanner — overlay full-screen */}
      {mostrarQrScanner && (
        <QRScanner
          onRead={handleQrRead}
          onCancel={() => setMostrarQrScanner(false)}
        />
      )}
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

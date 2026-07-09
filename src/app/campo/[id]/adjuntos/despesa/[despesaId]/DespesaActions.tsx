'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { CampoPublico } from '@/types/shared'
import { validatePin } from '@/actions/validatePin'
import type { Despesa } from '@/types/adjuntos'
import PinDialog from '@/components/shared/PinDialog'
import Toast from '@/components/shared/Toast'

export default function DespesaActions({ despesa, campo, hasPin }: { despesa: Despesa; campo: CampoPublico; hasPin: boolean }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function handleDeleteClick() {
    if (hasPin) setShowPin(true)
    else setShowConfirm(true)
  }

  async function handlePinConfirm(pin: string) {
    const valid = await validatePin(campo.id, pin)
    if (valid) { setShowPin(false); setPinError(false); setShowConfirm(true) }
    else { setPinError(true); setTimeout(() => setPinError(false), 1200) }
  }

  async function handleDelete() {
    setDeleting(true)
    if (despesa.foto_path) {
      await supabase.storage.from('faturas').remove([despesa.foto_path])
    }
    const { error } = await supabase.from('despesas').delete().eq('id', despesa.id)
    if (error) {
      setToast('Erro ao eliminar.')
      setDeleting(false)
      setShowConfirm(false)
      return
    }
    setToast('Despesa eliminada.')
    setTimeout(() => { router.push(`/campo/${campo.id}/adjuntos`); router.refresh() }, 800)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDeleteClick}
        className="w-full py-3.5 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 active:bg-red-100 text-base"
      >
        Eliminar Despesa
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Eliminar despesa?</h2>
            <p className="text-sm text-gray-500 mb-6">
              A despesa #{despesa.numero_recibo} — {despesa.descricao} — será eliminada permanentemente.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-60">
                {deleting ? 'A eliminar...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPin && (
        <PinDialog
          onConfirm={handlePinConfirm}
          onCancel={() => setShowPin(false)}
          error={pinError}
          subtitle="Introduz o PIN para eliminar esta despesa."
        />
      )}

      {toast && <Toast message={toast} type="success" onDismiss={() => setToast(null)} />}
    </>
  )
}

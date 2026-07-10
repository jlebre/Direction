'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { CampoPublico } from '@/types/shared'
import { validatePin } from '@/actions/validatePin'
import type { Devolucao } from '@/types/adjuntos'
import PinDialog from '@/components/shared/PinDialog'

export default function DevolucaoActions({
  devolucao,
  campo,
  hasPin,
}: {
  devolucao: Devolucao
  campo: CampoPublico
  hasPin: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    const { error } = await supabase.from('devolucoes').delete().eq('id', devolucao.id)
    if (error) {
      toast.error('Erro ao eliminar devolução')
      setDeleting(false)
      setShowConfirm(false)
      return
    }
    // Photo cleanup (if exists)
    if (devolucao.foto_path) {
      await supabase.storage.from('faturas').remove([devolucao.foto_path])
    }
    toast.success('Devolução eliminada')
    setTimeout(() => { router.push(`/campo/${campo.id}/adjuntos`); router.refresh() }, 600)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDeleteClick}
        className="w-full py-3.5 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 active:bg-red-100 text-base"
      >
        Eliminar Devolução
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Eliminar devolução?</h2>
            <p className="text-sm text-gray-500 mb-6">
              A devolução #{devolucao.numero_devolucao}
              {devolucao.descricao ? ` — ${devolucao.descricao}` : ''} (+€{Number(devolucao.valor).toFixed(2)}) será eliminada permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl disabled:opacity-60"
              >
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
          subtitle="Introduz o PIN para eliminar esta devolução."
        />
      )}
    </>
  )
}

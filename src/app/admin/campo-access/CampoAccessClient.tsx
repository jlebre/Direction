'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { generateCampAccessLink, revokeCampAccessLink } from './actions'

export interface LinkRow {
  campoId: string
  nome: string
  ano: number | null
  activeLink: {
    id: string
    created_at: string
    expires_at: string | null
    last_used_at: string | null
  } | null
}

function status(row: LinkRow): { label: string; className: string } {
  if (!row.activeLink) return { label: 'Não gerado', className: 'bg-gray-100 text-gray-500' }
  if (row.activeLink.expires_at && new Date(row.activeLink.expires_at) < new Date()) {
    return { label: 'Expirado', className: 'bg-amber-100 text-amber-700' }
  }
  return { label: 'Activo', className: 'bg-green-100 text-green-700' }
}

export default function CampoAccessClient({ rows: initialRows }: { rows: LinkRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [busyCampoId, setBusyCampoId] = useState<string | null>(null)
  const [newUrl, setNewUrl] = useState<{ campoId: string; url: string } | null>(null)

  async function handleGenerate(campoId: string, isRegenerate: boolean) {
    if (isRegenerate) {
      const ok = window.confirm('Regenerar invalida imediatamente o link (e qualquer sessão dele) actual deste campo. Continuar?')
      if (!ok) return
    }
    setBusyCampoId(campoId)
    try {
      const result = await generateCampAccessLink(campoId)
      if (result.error || !result.url) {
        toast.error(result.error ?? 'Erro ao gerar o link.')
        return
      }
      setNewUrl({ campoId, url: result.url })
      toast.success('Link gerado — copia-o agora, só é mostrado uma vez.')
    } finally {
      setBusyCampoId(null)
    }
  }

  async function handleRevoke(campoId: string, linkId: string) {
    const ok = window.confirm('Revogar este link? O Adjunto deixa de conseguir aceder imediatamente.')
    if (!ok) return
    setBusyCampoId(campoId)
    try {
      const result = await revokeCampAccessLink(linkId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRows((prev) => prev.map((r) => (r.campoId === campoId ? { ...r, activeLink: null } : r)))
      setNewUrl((prev) => (prev?.campoId === campoId ? null : prev))
      toast.success('Link revogado.')
    } finally {
      setBusyCampoId(null)
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Copiado.')
    } catch {
      toast.error('Não foi possível copiar — selecciona e copia manualmente.')
    }
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const s = status(row)
        const busy = busyCampoId === row.campoId
        return (
          <div key={row.campoId} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[#36454F]">{row.nome}</p>
                <p className="text-xs text-gray-400">{row.ano ?? '—'}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.className}`}>{s.label}</span>
            </div>

            {row.activeLink && (
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>Criado: {new Date(row.activeLink.created_at).toLocaleString('pt-PT')}</p>
                <p>Último acesso: {row.activeLink.last_used_at ? new Date(row.activeLink.last_used_at).toLocaleString('pt-PT') : 'nunca'}</p>
              </div>
            )}

            {newUrl?.campoId === row.campoId && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800">
                  Copia agora — não voltará a ser mostrado.
                </p>
                <div className="flex items-center gap-2">
                  <input readOnly value={newUrl.url} className="flex-1 text-xs bg-white border border-amber-200 rounded px-2 py-1.5 font-mono" />
                  <button
                    type="button"
                    onClick={() => copy(newUrl.url)}
                    className="text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1.5 rounded hover:bg-amber-200"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {!row.activeLink ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleGenerate(row.campoId, false)}
                  className="text-xs font-semibold text-white bg-[#2D5016] px-3 py-2 rounded-lg disabled:opacity-50"
                >
                  {busy ? 'A gerar...' : 'Gerar link'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleGenerate(row.campoId, true)}
                    className="text-xs font-semibold text-[#2D5016] bg-[#2D5016]/10 px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    Regenerar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRevoke(row.campoId, row.activeLink!.id)}
                    className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    Revogar
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

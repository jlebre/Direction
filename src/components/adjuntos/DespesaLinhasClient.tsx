'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Check, X, Pencil, ChevronRight } from 'lucide-react'
import type { DespesaLinha } from '@/types/adjuntos'

interface DespesaLinhasClientProps {
  linhasIniciais: DespesaLinha[]
  despesaId: string
}

type EstadoLinha = DespesaLinha['estado']

const CONFIANCA_STYLE: Record<string, { dot: string; label: string }> = {
  alta:  { dot: 'bg-green-400',  label: 'alta' },
  media: { dot: 'bg-amber-400',  label: 'média' },
  baixa: { dot: 'bg-gray-300',   label: 'baixa' },
}

export function DespesaLinhasClient({ linhasIniciais, despesaId }: DespesaLinhasClientProps) {
  const [linhas, setLinhas] = useState<DespesaLinha[]>(linhasIniciais)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [salvando, setSalvando] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const sugeridas = linhas.filter(l => l.estado === 'sugerido')
  const confirmadas = linhas.filter(l => l.estado === 'confirmado' || l.estado === 'corrigido')
  const ignoradas = linhas.filter(l => l.estado === 'ignorado')
  const altasSugeridas = sugeridas.filter(l => l.confianca === 'alta')

  function markSaving(id: string, on: boolean) {
    setSalvando(prev => {
      const next = new Set(prev)
      on ? next.add(id) : next.delete(id)
      return next
    })
  }

  async function confirmar(id: string) {
    markSaving(id, true)
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, estado: 'confirmado' as EstadoLinha } : l))
    const { error } = await supabase
      .from('despesa_linhas')
      .update({ estado: 'confirmado', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao confirmar')
      setLinhas(linhasIniciais)
    }
    markSaving(id, false)
  }

  async function ignorar(id: string) {
    markSaving(id, true)
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, estado: 'ignorado' as EstadoLinha } : l))
    const { error } = await supabase
      .from('despesa_linhas')
      .update({ estado: 'ignorado', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao ignorar')
      setLinhas(linhasIniciais)
    }
    markSaving(id, false)
  }

  async function confirmarTodosAlta() {
    const ids = altasSugeridas.map(l => l.id)
    if (ids.length === 0) return
    setLinhas(prev => prev.map(l => ids.includes(l.id) ? { ...l, estado: 'confirmado' as EstadoLinha } : l))
    const { error } = await supabase
      .from('despesa_linhas')
      .update({ estado: 'confirmado', updated_at: new Date().toISOString() })
      .in('id', ids)
    if (error) {
      toast.error('Erro ao confirmar')
      setLinhas(linhasIniciais)
    } else {
      toast.success(`${ids.length} produtos confirmados`)
    }
  }

  function iniciarEdicao(linha: DespesaLinha) {
    setEditandoId(linha.id)
    setEditNome(linha.nome_produto_bruto)
  }

  async function salvarEdicao(original: DespesaLinha) {
    const novoNome = editNome.trim()
    if (!novoNome) { cancelarEdicao(); return }

    markSaving(original.id, true)
    const nomeAlterado = novoNome.toLowerCase() !== original.nome_produto_bruto.toLowerCase()

    setLinhas(prev => prev.map(l =>
      l.id === original.id
        ? { ...l, nome_produto_bruto: novoNome, estado: 'corrigido' as EstadoLinha }
        : l
    ))
    setEditandoId(null)

    // Guarda na BD
    const { error } = await supabase.from('despesa_linhas').update({
      nome_produto_bruto: novoNome,
      estado: 'corrigido',
      updated_at: new Date().toISOString(),
    }).eq('id', original.id)

    if (error) {
      toast.error('Erro ao guardar edição')
      setLinhas(linhasIniciais)
      markSaving(original.id, false)
      return
    }

    // Guarda alias para sugestão futura (Fase 5)
    if (nomeAlterado) {
      await supabase.from('produto_aliases').upsert({
        alias: original.nome_produto_bruto.toLowerCase().trim(),
        origem: 'ocr',
      }, { onConflict: 'alias', ignoreDuplicates: true } as Parameters<ReturnType<typeof supabase.from>['upsert']>[1])
    }

    markSaving(original.id, false)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setEditNome('')
  }

  if (linhas.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Produtos OCR</h3>
          {sugeridas.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{sugeridas.length} por validar</p>
          )}
        </div>
        {altasSugeridas.length > 0 && (
          <button
            onClick={confirmarTodosAlta}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-100 transition-colors shrink-0"
          >
            <Check className="h-3.5 w-3.5" />
            Confirmar {altasSugeridas.length} (alta conf.)
          </button>
        )}
      </div>

      {/* Linhas sugeridas */}
      {sugeridas.length > 0 && (
        <div className="divide-y divide-gray-50">
          {sugeridas.map(linha => (
            <LinhaItem
              key={linha.id}
              linha={linha}
              editandoId={editandoId}
              editNome={editNome}
              salvando={salvando.has(linha.id)}
              onConfirmar={() => confirmar(linha.id)}
              onIgnorar={() => ignorar(linha.id)}
              onEditar={() => iniciarEdicao(linha)}
              onSalvarEdicao={() => salvarEdicao(linha)}
              onCancelarEdicao={cancelarEdicao}
              onChangeNome={setEditNome}
            />
          ))}
        </div>
      )}

      {/* Linhas confirmadas/corrigidas */}
      {confirmadas.length > 0 && (
        <>
          <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confirmados</p>
          </div>
          <div className="divide-y divide-gray-50">
            {confirmadas.map(linha => (
              <div key={linha.id} className="flex items-center gap-3 px-4 py-2.5">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{linha.nome_produto_bruto}</p>
                  {linha.quantidade !== null && (
                    <p className="text-[11px] text-gray-400">
                      {linha.quantidade} {linha.unidade ?? ''}
                      {linha.preco_unitario !== null ? ` × €${linha.preco_unitario.toFixed(2)}` : ''}
                    </p>
                  )}
                </div>
                {linha.preco_total !== null && (
                  <span className="text-sm font-semibold text-gray-600 shrink-0">
                    €{linha.preco_total.toFixed(2).replace('.', ',')}
                  </span>
                )}
                {linha.estado === 'corrigido' && (
                  <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1 shrink-0">corrigido</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ignoradas (colapsadas) */}
      {ignoradas.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">{ignoradas.length} linha{ignoradas.length > 1 ? 's' : ''} ignorada{ignoradas.length > 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  )
}

function LinhaItem({
  linha,
  editandoId,
  editNome,
  salvando,
  onConfirmar,
  onIgnorar,
  onEditar,
  onSalvarEdicao,
  onCancelarEdicao,
  onChangeNome,
}: {
  linha: DespesaLinha
  editandoId: string | null
  editNome: string
  salvando: boolean
  onConfirmar: () => void
  onIgnorar: () => void
  onEditar: () => void
  onSalvarEdicao: () => void
  onCancelarEdicao: () => void
  onChangeNome: (v: string) => void
}) {
  const isEditing = editandoId === linha.id
  const conf = CONFIANCA_STYLE[linha.confianca] ?? CONFIANCA_STYLE.media

  return (
    <div className={`px-4 py-3 space-y-2 ${salvando ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-2.5">
        {/* Indicador de confiança */}
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${conf.dot}`} title={`Confiança ${conf.label}`} />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={editNome}
              onChange={e => onChangeNome(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSalvarEdicao()
                if (e.key === 'Escape') onCancelarEdicao()
              }}
              className="w-full border border-[#B85042] rounded-lg px-2 py-1 text-sm focus:outline-none"
            />
          ) : (
            <button
              onClick={onEditar}
              className="flex items-center gap-1 text-left group"
            >
              <span className="text-sm font-medium text-gray-800">{linha.nome_produto_bruto}</span>
              <Pencil className="h-3 w-3 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
            </button>
          )}
          {linha.quantidade !== null && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {linha.quantidade} {linha.unidade ?? ''}
              {linha.preco_unitario !== null ? ` × €${linha.preco_unitario.toFixed(2)}` : ''}
            </p>
          )}
          <p className="text-[10px] text-gray-300 mt-0.5 truncate" title={linha.texto_linha_original}>
            {linha.texto_linha_original}
          </p>
        </div>

        {linha.preco_total !== null && (
          <span className="text-sm font-bold text-[#B85042] shrink-0">
            €{linha.preco_total.toFixed(2).replace('.', ',')}
          </span>
        )}
      </div>

      {/* Acções */}
      {isEditing ? (
        <div className="flex gap-2 pl-4">
          <button
            onClick={onSalvarEdicao}
            className="flex-1 py-1.5 bg-[#B85042] text-white text-xs font-semibold rounded-lg"
          >
            Guardar
          </button>
          <button
            onClick={onCancelarEdicao}
            className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex gap-2 pl-4">
          <button
            onClick={onConfirmar}
            disabled={salvando}
            className="flex items-center justify-center gap-1 flex-1 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Confirmar
          </button>
          <button
            onClick={onIgnorar}
            disabled={salvando}
            className="flex items-center justify-center gap-1 flex-1 py-1.5 bg-gray-50 text-gray-500 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Ignorar
          </button>
        </div>
      )}
    </div>
  )
}

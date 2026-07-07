'use client'

import { CheckCircle, AlertCircle, ChevronDown, ChevronUp, ShieldCheck, ShieldX, Pencil, X as XIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { OcrStatus, OcrResultado } from '@/hooks/useOcr'
import type { LinhaParsed } from '@/lib/adjuntos/ocr-parser'

export const CATEGORIAS_PRODUTO = [
  'Alimentação', 'Bebidas', 'Limpeza', 'Material',
  'Cozinha', 'Higiene', 'Transporte', 'Farmácia', 'Miminhos', 'Outros',
] as const

export type CategoriaLinha = typeof CATEGORIAS_PRODUTO[number]

export interface OcrUsarPayload {
  total: number | null
  data: string | null
  fornecedor: string | null
  nifConfirmado: boolean
  nifDetectado: string | null
  linhas: LinhaParsed[]
}

interface EditForm {
  nome: string
  quantidade: string
  unidade: string
  precTotal: string
  categoria: string
}

interface OcrResultCardProps {
  status: OcrStatus
  progress: number
  statusMsg: string
  resultado: OcrResultado | null
  onUsar: (payload: OcrUsarPayload) => void
}

const TIPO_LABEL: Record<string, string> = {
  deposito: 'depósito',
  desconto: 'desconto',
  iva: 'IVA',
  total: 'total',
  pagamento: 'pagamento',
  administrativo: 'admin',
}

export function OcrResultCard({ status, progress, statusMsg, resultado, onUsar }: OcrResultCardProps) {
  const [linhasEditadas, setLinhasEditadas] = useState<LinhaParsed[]>([])
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ nome: '', quantidade: '', unidade: '', precTotal: '', categoria: '' })
  const [categoriaBulk, setCategoriaBulk] = useState('')
  const [mostrarEspeciais, setMostrarEspeciais] = useState(false)
  const [nifAceite, setNifAceite] = useState<boolean | null>(null)

  useEffect(() => {
    setLinhasEditadas(resultado?.linhas ?? [])
    setEditIdx(null)
    setNifAceite(null)
  }, [resultado])

  if (status === 'idle') return null

  if (status === 'a_carregar' || status === 'a_processar') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm font-medium text-blue-700">{statusMsg || 'A interpretar...'}</p>
        </div>
        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {progress < 30 && (
          <p className="text-xs text-blue-500">Na primeira utilização, o modelo de OCR é transferido (~15MB). Pode demorar.</p>
        )}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700">Não foi possível interpretar a fatura. Introduz os valores manualmente.</p>
      </div>
    )
  }

  if (status === 'done' && resultado) {
    const temDados = resultado.total_detectado !== null || resultado.fornecedor || resultado.data_detectada
    const temNif = !!resultado.nif_detectado
    const nifEfetivo = temNif ? (nifAceite ?? true) : false
    const nLinhasEspeciais = resultado.linhasEspeciais?.length ?? 0

    function abrirEdicao(idx: number) {
      const l = linhasEditadas[idx]
      setEditForm({
        nome: l.nome_produto_bruto,
        quantidade: l.quantidade?.toString() ?? '',
        unidade: l.unidade ?? '',
        precTotal: l.preco_total?.toFixed(2) ?? '',
        categoria: l.categoria_linha ?? '',
      })
      setEditIdx(idx)
    }

    function guardarEdicao() {
      if (editIdx === null) return
      setLinhasEditadas(prev => prev.map((l, i) => i !== editIdx ? l : {
        ...l,
        nome_produto_bruto: editForm.nome.trim() || l.nome_produto_bruto,
        quantidade: editForm.quantidade ? parseFloat(editForm.quantidade) : l.quantidade,
        unidade: editForm.unidade || l.unidade,
        preco_total: editForm.precTotal ? parseFloat(editForm.precTotal.replace(',', '.')) : l.preco_total,
        categoria_linha: editForm.categoria || null,
      }))
      setEditIdx(null)
    }

    function removerLinha(idx: number) {
      setLinhasEditadas(prev => prev.filter((_, i) => i !== idx))
      if (editIdx === idx) setEditIdx(null)
    }

    function aplicarCategoria() {
      if (!categoriaBulk) return
      setLinhasEditadas(prev => prev.map(l => ({ ...l, categoria_linha: categoriaBulk })))
    }

    function handleUsar() {
      onUsar({
        total: resultado!.total_detectado,
        data: resultado!.data_detectada,
        fornecedor: resultado!.fornecedor,
        nifConfirmado: nifEfetivo,
        nifDetectado: resultado!.nif_detectado,
        linhas: linhasEditadas,
      })
    }

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
        {/* ── Cabeçalho com dados globais ─────────────── */}
        <div className="p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-700">Fatura interpretada</p>
          </div>

          {!temDados && (
            <p className="text-xs text-amber-600">Nenhum dado reconhecido com confiança. Verifica a qualidade da foto.</p>
          )}

          {temDados && (
            <div className="bg-white/70 rounded-lg divide-y divide-green-100 text-sm">
              {resultado.total_detectado !== null && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-green-700">€{resultado.total_detectado.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {resultado.fornecedor && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-gray-500">Fornecedor</span>
                  <span className="font-medium text-gray-800">{resultado.fornecedor}</span>
                </div>
              )}
              {resultado.data_detectada && (
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-gray-500">Data</span>
                  <span className="font-medium text-gray-800">{formatarData(resultado.data_detectada)}</span>
                </div>
              )}

              {/* NIF */}
              <div className="px-3 py-2">
                {temNif ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">NIF detetado</span>
                      <span className="font-mono font-medium text-gray-800">{resultado.nif_detectado}</span>
                    </div>
                    {nifAceite === false ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <ShieldX className="h-3 w-3" /> Marcado como incorreto
                        </span>
                        <button type="button" onClick={() => setNifAceite(null)} className="text-xs text-gray-400 underline">Desfazer</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> NIF visível na fatura
                        </span>
                        <button type="button" onClick={() => setNifAceite(false)} className="text-xs text-gray-400 underline">NIF incorreto</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">NIF</span>
                    <span className="text-xs text-gray-400">Não detetado</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Produtos ────────────────────────────────── */}
        {(linhasEditadas.length > 0 || resultado.linhas.length > 0) && (
          <div className="border-t border-green-200">
            {/* Header produtos + bulk categoria */}
            <div className="px-3 pt-2.5 pb-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Produtos ({linhasEditadas.length})
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={categoriaBulk}
                  onChange={e => setCategoriaBulk(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-green-400"
                >
                  <option value="">Aplicar categoria a todos...</option>
                  {CATEGORIAS_PRODUTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  type="button"
                  onClick={aplicarCategoria}
                  disabled={!categoriaBulk}
                  className="text-xs font-semibold text-green-700 bg-green-100 border border-green-200 rounded-lg px-2.5 py-1.5 disabled:opacity-40 shrink-0"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {linhasEditadas.length === 0 && (
              <p className="px-3 pb-3 text-xs text-gray-400">Nenhuma linha de produto. Podes adicionar manualmente após confirmar.</p>
            )}

            <div className="divide-y divide-green-100">
              {linhasEditadas.map((l, idx) => (
                <div key={idx} className="bg-white/50">
                  {editIdx === idx ? (
                    /* Formulário inline de edição */
                    <div className="px-3 py-3 space-y-2 bg-white border-l-2 border-green-400">
                      <input
                        value={editForm.nome}
                        onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome do produto"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-400"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editForm.quantidade}
                          onChange={e => setEditForm(f => ({ ...f, quantidade: e.target.value }))}
                          placeholder="Qtd"
                          className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-green-400"
                        />
                        <input
                          value={editForm.unidade}
                          onChange={e => setEditForm(f => ({ ...f, unidade: e.target.value }))}
                          placeholder="un"
                          className="w-14 text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-green-400"
                        />
                        <div className="flex-1 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                          <input
                            value={editForm.precTotal}
                            onChange={e => setEditForm(f => ({ ...f, precTotal: e.target.value }))}
                            placeholder="Total"
                            className="w-full text-sm border border-gray-200 rounded-lg pl-6 pr-2 py-2 focus:outline-none focus:border-green-400"
                          />
                        </div>
                      </div>
                      <select
                        value={editForm.categoria}
                        onChange={e => setEditForm(f => ({ ...f, categoria: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-green-400"
                      >
                        <option value="">Categoria (opcional)</option>
                        {CATEGORIAS_PRODUTO.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={guardarEdicao}
                          className="flex-1 py-2 bg-[#B85042] text-white text-xs font-semibold rounded-lg active:opacity-90"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditIdx(null)}
                          className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Linha de produto normal */
                    <div className="flex items-start gap-2 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{l.nome_produto_bruto}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {l.quantidade != null
                            ? `${l.quantidade} ${l.unidade ?? 'un'} × `
                            : ''}
                          <span className="font-semibold text-green-700">
                            €{(l.preco_total ?? 0).toFixed(2).replace('.', ',')}
                          </span>
                          {l.categoria_linha && (
                            <span className="ml-1.5 text-gray-400">· {l.categoria_linha}</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => abrirEdicao(idx)}
                        className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors shrink-0"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerLinha(idx)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        title="Remover"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Linhas especiais colapsadas ──────────────── */}
        {nLinhasEspeciais > 0 && (
          <div className="border-t border-green-200">
            <button
              type="button"
              onClick={() => setMostrarEspeciais(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-400 hover:bg-green-50/50"
            >
              <span>{nLinhasEspeciais} linhas ignoradas (IVA, depósitos, totais)</span>
              {mostrarEspeciais ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {mostrarEspeciais && (
              <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto bg-white/40">
                {resultado.linhasEspeciais?.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <p className="text-[11px] text-gray-400 truncate flex-1">{l.nome_produto_bruto}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {l.preco_total != null && (
                        <span className="text-[11px] text-gray-400">€{l.preco_total.toFixed(2)}</span>
                      )}
                      <span className="text-[9px] text-gray-300 border border-gray-200 rounded px-1 py-0.5 uppercase">
                        {TIPO_LABEL[l.tipo_linha] ?? l.tipo_linha}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────── */}
        {temDados && (
          <div className="p-3 border-t border-green-200">
            <button
              type="button"
              onClick={handleUsar}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Usar estes valores →
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

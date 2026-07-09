'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CampoPublico } from '@/types/shared'
import { validatePin } from '@/actions/validatePin'
import { formatBytes } from '@/lib/adjuntos/image-utils'
import PinDialog from '@/components/shared/PinDialog'
import type { MatchItem, OrphanItem, MissingItem } from './types'

interface Props {
  campo: CampoPublico
  hasPin: boolean
  matches: MatchItem[]
  orphans: OrphanItem[]
  missing: MissingItem[]
  totalStorageFiles: number
  storageError: string | null
}

export default function StorageClient({
  campo,
  hasPin,
  matches,
  orphans,
  missing,
  totalStorageFiles,
  storageError,
}: Props) {
  const router = useRouter()
  const [showPin, setShowPin] = useState(hasPin)
  const [pinError, setPinError] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(!hasPin)
  const [refreshing, setRefreshing] = useState(false)

  async function handlePinConfirm(pin: string) {
    const valid = await validatePin(campo.id, pin)
    if (valid) { setPinUnlocked(true); setShowPin(false); setPinError(false) }
    else { setPinError(true); setTimeout(() => setPinError(false), 1200) }
  }

  async function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1000)
  }

  if (showPin) {
    return (
      <PinDialog
        onConfirm={handlePinConfirm}
        onCancel={() => router.back()}
        error={pinError}
        subtitle="Área técnica — introduz o PIN para continuar."
      />
    )
  }
  if (!pinUnlocked) return null

  return (
    <main className="min-h-screen pb-10">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 pt-10 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={`/campo/${campo.id}/adjuntos`} className="text-gray-400 text-sm">
            ← Adjuntos
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-400 text-sm disabled:opacity-50"
          >
            {refreshing ? 'A refrescar...' : '↻ Refrescar'}
          </button>
        </div>
        <div className="max-w-lg mx-auto mt-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗄️</span>
            <h1 className="text-xl font-bold">Área Técnica · Storage</h1>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">{campo.nome} · bucket: faturas</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* Erro de acesso ao storage */}
        {storageError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Erro ao listar storage</p>
            <p className="font-mono text-xs">{storageError}</p>
          </div>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon="📁"
            label="Ficheiros no storage"
            value={totalStorageFiles}
            color="gray"
          />
          <StatCard
            icon="🟢"
            label="Correspondências OK"
            value={matches.length}
            color="green"
          />
          <StatCard
            icon="🟡"
            label="Imagens órfãs"
            value={orphans.length}
            color="amber"
          />
          <StatCard
            icon="🔴"
            label="Faturas sem ficheiro"
            value={missing.length}
            color="red"
          />
        </div>

        {/* Faturas sem ficheiro — mostrar primeiro porque são o problema mais grave */}
        {missing.length > 0 && (
          <Section
            title="Faturas sem ficheiro"
            subtitle="Despesas que dizem ter foto mas o ficheiro não existe no storage"
            accent="red"
          >
            {missing.map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-3 px-4 bg-red-50 rounded-xl border border-red-100">
                <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-red-600">#{m.numero_recibo}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-900">
                    {m.descricao ?? <span className="italic">Sem descrição</span>}
                  </p>
                  <p className="text-xs text-red-500 mt-0.5 font-mono">{m.filename}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-red-700">€{Number(m.valor).toFixed(2)}</p>
                  <Link
                    href={`/campo/${campo.id}/adjuntos/despesa/${m.id}/editar`}
                    className="text-xs text-red-500 font-medium"
                  >
                    Corrigir →
                  </Link>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Imagens órfãs */}
        {orphans.length > 0 && (
          <Section
            title="Imagens órfãs"
            subtitle="Ficheiros no storage sem despesa associada (ex: de despesas eliminadas)"
            accent="amber"
          >
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              Para eliminar estas imagens, usa o painel do Supabase → Storage → faturas.
            </p>
            {orphans.map((o) => (
              <div key={o.filename} className="flex items-center gap-3 py-2.5 px-3 bg-amber-50 rounded-xl border border-amber-100">
                {/* Thumbnail */}
                <a href={o.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={o.url}
                    alt={o.filename}
                    loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover bg-amber-100"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900 font-mono truncate">{o.filename}</p>
                  {o.size !== null && (
                    <p className="text-xs text-amber-600 mt-0.5">{formatBytes(o.size)}</p>
                  )}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Correspondências OK */}
        {matches.length > 0 && (
          <Section
            title={`Correspondências OK (${matches.length})`}
            subtitle="Imagens no storage com despesa correspondente"
            accent="green"
            collapsible
          >
            <div className="space-y-2">
              {matches.map((m) => (
                <div key={m.filename} className="flex items-center gap-3 py-2.5 px-3 bg-green-50 rounded-xl border border-green-100">
                  {/* Thumbnail */}
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.filename}
                      loading="lazy"
                      className="w-12 h-12 rounded-lg object-cover bg-green-100"
                    />
                  </a>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-green-800 truncate">{m.filename}</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      #{m.despesa.numero_recibo}
                      {m.despesa.descricao ? ` — ${m.despesa.descricao}` : ''}
                    </p>
                    {m.size !== null && (
                      <p className="text-xs text-green-500">{formatBytes(m.size)}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-green-800">€{Number(m.despesa.valor).toFixed(2)}</p>
                    <Link
                      href={`/campo/${campo.id}/adjuntos/despesa/${m.despesa.id}`}
                      className="text-xs text-green-600 font-medium"
                    >
                      Ver →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Estado vazio */}
        {!storageError && totalStorageFiles === 0 && matches.length === 0 && missing.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm text-gray-400">Ainda não há imagens no storage para este campo.</p>
          </div>
        )}
      </div>
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string
  label: string
  value: number
  color: 'gray' | 'green' | 'amber' | 'red'
}) {
  const colorMap = {
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  }
  const subColorMap = {
    gray: 'text-gray-500',
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-2xl">{icon}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className={`text-xs mt-0.5 ${subColorMap[color]}`}>{label}</p>
    </div>
  )
}

function Section({
  title,
  subtitle,
  accent,
  collapsible = false,
  children,
}: {
  title: string
  subtitle: string
  accent: 'red' | 'amber' | 'green'
  collapsible?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!collapsible)

  const borderMap = {
    red: 'border-red-200',
    amber: 'border-amber-200',
    green: 'border-green-200',
  }
  const titleMap = {
    red: 'text-red-800',
    amber: 'text-amber-800',
    green: 'text-green-800',
  }
  const subtitleMap = {
    red: 'text-red-500',
    amber: 'text-amber-500',
    green: 'text-green-500',
  }

  return (
    <section className={`rounded-xl border ${borderMap[accent]} overflow-hidden`}>
      <button
        type="button"
        className="w-full flex items-start justify-between px-4 py-3 text-left bg-white"
        onClick={() => collapsible && setOpen((v) => !v)}
      >
        <div>
          <h2 className={`text-sm font-bold ${titleMap[accent]}`}>{title}</h2>
          <p className={`text-xs mt-0.5 ${subtitleMap[accent]}`}>{subtitle}</p>
        </div>
        {collapsible && <span className="text-gray-400 text-sm mt-0.5">{open ? '▲' : '▼'}</span>}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </section>
  )
}

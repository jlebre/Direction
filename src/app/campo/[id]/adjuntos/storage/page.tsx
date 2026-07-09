import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { CampoPublico } from '@/types/shared'
import StorageClient from './StorageClient'
import type { MatchItem, OrphanItem, MissingItem } from './types'

export const dynamic = 'force-dynamic'

function campoSlug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
}

function publicUrl(supabaseUrl: string, slug: string, filename: string): string {
  return `${supabaseUrl}/storage/v1/object/public/faturas/${slug}/${encodeURIComponent(filename)}`
}

export default async function StoragePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const [{ data: campo }, { data: despesasRaw }] = await Promise.all([
    supabase.from('campos').select('*').eq('id', id).single(),
    supabase
      .from('despesas')
      .select('id, numero_recibo, descricao, valor, data, foto_path')
      .eq('campo_id', id)
      .not('foto_path', 'is', null)
      .order('numero_recibo', { ascending: true }),
  ])

  if (!campo) notFound()

  const { pin, ...campoPublico } = campo
  const c = campoPublico as CampoPublico
  const slug = campoSlug(c.nome)

  // Listar ficheiros no bucket para este campo
  const { data: storageFiles, error: listError } = await supabase.storage
    .from('faturas')
    .list(slug, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  const files = storageFiles ?? []

  // Despesas com foto (com filename extraído)
  const despesasComFoto = (despesasRaw ?? []).map((d) => ({
    id: d.id as string,
    numero_recibo: d.numero_recibo as number,
    descricao: d.descricao as string | null,
    valor: d.valor as number,
    foto_path: d.foto_path as string,
    filename: (d.foto_path as string).split('/').pop() ?? '',
  }))

  const storageFilenames = new Set(files.map((f) => f.name))
  const despesaFilenames = new Set(despesasComFoto.map((d) => d.filename))

  // Correspondências OK: despesa tem foto e o ficheiro existe
  const matches: MatchItem[] = despesasComFoto
    .filter((d) => storageFilenames.has(d.filename))
    .map((d) => {
      const file = files.find((f) => f.name === d.filename)
      return {
        filename: d.filename,
        url: publicUrl(supabaseUrl, slug, d.filename),
        size: (file?.metadata?.size as number | undefined) ?? null,
        despesa: {
          id: d.id,
          numero_recibo: d.numero_recibo,
          descricao: d.descricao,
          valor: d.valor,
        },
      }
    })

  // Faturas sem ficheiro: despesa tem foto_path mas ficheiro não existe no storage
  const missing: MissingItem[] = despesasComFoto
    .filter((d) => !storageFilenames.has(d.filename))
    .map((d) => ({
      id: d.id,
      numero_recibo: d.numero_recibo,
      descricao: d.descricao,
      valor: d.valor,
      filename: d.filename,
    }))

  // Imagens órfãs: ficheiro no storage sem despesa a referenciar
  const orphans: OrphanItem[] = files
    .filter((f) => !despesaFilenames.has(f.name))
    .map((f) => ({
      filename: f.name,
      url: publicUrl(supabaseUrl, slug, f.name),
      size: (f.metadata?.size as number | undefined) ?? null,
    }))

  return (
    <StorageClient
      campo={c}
      hasPin={!!pin}
      matches={matches}
      orphans={orphans}
      missing={missing}
      totalStorageFiles={files.length}
      storageError={listError?.message ?? null}
    />
  )
}

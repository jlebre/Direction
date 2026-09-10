/**
 * FASE 0.5 — CAMTIL Finance V2
 * Backup integral e recuperável de todos os dados financeiros (Adjuntos),
 * todos os campos, todos os anos, incluindo fotografias de faturas no Storage.
 *
 * Corre fora do runtime Next.js: `npx tsx scripts/backup/run-backup.ts`
 * (ou `npm run backup`).
 *
 * O QUE ESTE SCRIPT FAZ
 *   - Lê (SELECT) as tabelas financeiras da BD com a chave anon pública —
 *     as mesmas permissões que a app já usa em produção hoje.
 *   - Lista e descarrega (read-only) todos os objetos do bucket `faturas`.
 *   - Reutiliza os geradores de Excel/ZIP já usados pelo botão "Exportar ZIP"
 *     de cada campo (`generateExcelBuffer`, `buildZip` — ver
 *     src/lib/adjuntos/export-excel.ts e export-zip.ts) para produzir, por
 *     campo, exatamente o mesmo ficheiro que um Adjunto obteria hoje.
 *   - Escreve também uma camada "raw" (JSON completo, todas as colunas) de
 *     cada tabela, para recuperação mesmo que os exportadores não incluam
 *     alguma coluna.
 *   - Valida contagens (BD vs. backup) e gera checksums SHA-256.
 *
 * O QUE ESTE SCRIPT NUNCA FAZ
 *   - Não escreve, atualiza, apaga ou move nada na BD ou no Storage.
 *   - Não altera migrations, schema, RLS ou autenticação.
 *   - Não inclui dados médicos/pessoais das Mamãs (só tabelas financeiras).
 *   - Não inclui .env, chaves, ADMIN_PIN ou segredos no output.
 */
import path from 'node:path'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, copyFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

import {
  loadEnvLocal,
  getSupabaseClient,
  getDatabaseLabel,
  fetchAllRows,
  countRows,
  listAllStorageObjects,
  sha256OfBuffer,
  sha256OfFile,
  formatTimestamp,
} from './lib'

import { generateExcelBuffer } from '../../src/lib/adjuntos/export-excel'
import { buildZip } from '../../src/lib/adjuntos/export-zip'
import { getCampoSlug } from '../../src/lib/adjuntos/supabase-storage'
import type { Campo } from '../../src/types/shared'
import type { Despesa, DespesaLinha, Devolucao, RegularizacaoNif } from '../../src/types/adjuntos'

// ── Setup ─────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '..', '..')
loadEnvLocal(REPO_ROOT)
const supabase = getSupabaseClient()

const startedAt = new Date()
const ts = formatTimestamp(startedAt)
const BACKUP_NAME = `CAMTIL-Finance-Backup-${ts}`
const OUT_ROOT = path.join(REPO_ROOT, 'backup', BACKUP_NAME)
const CAMPOS_DIR = path.join(OUT_ROOT, 'campos')
const RAW_DIR = path.join(OUT_ROOT, 'raw')
const RAW_STORAGE_DIR = path.join(RAW_DIR, 'storage', 'faturas')

const BUCKET = 'faturas'

// Escopo financeiro confirmado na auditoria (Secção 0.5.4 do pedido) — tabelas
// exclusivamente Mamãs (receitas, ementa, farmácia, restrições, animados...)
// ficam de fora deliberadamente.
const FINANCIAL_TABLES = [
  'despesas',
  'despesa_linhas',
  'devolucoes',
  'regularizacoes_nif',
  'liquidacoes_nif',
  'produto_aliases',
  'campo_precos',
  'valores_referencia',
  'locais',
  'transportes',
  'transporte_segmentos',
] as const

function mkdirp(p: string) {
  mkdirSync(p, { recursive: true })
}

function log(msg: string) {
  console.log(`[backup] ${msg}`)
}

/** Espelha a fórmula de saldo usada em export-excel.ts (linhas 50-63) — não
 *  exportada de lá, por isso reescrita aqui só para os totais do manifest. */
function computeCampoTotais(campo: Campo, despesas: Despesa[], devolucoes: Devolucao[]) {
  const financeiras = despesas.filter((d) => !d.is_regularizacao_nif)
  const despesasList = financeiras.filter((d) => d.tipo === 'despesa')
  const receitasList = financeiras.filter((d) => d.tipo === 'receita')
  const totalDespesas = despesasList.reduce((s, d) => s + Number(d.valor), 0)
  const totalReceitas = receitasList.reduce((s, d) => s + Number(d.valor), 0)
  const totalDevolucoes = devolucoes.reduce((s, d) => s + Number(d.valor), 0)
  const saldoDisponivel = (campo.saldo_inicial ?? 0) + totalReceitas - totalDespesas + totalDevolucoes
  return { totalDespesas, totalReceitas, totalDevolucoes, saldoDisponivel }
}

function walkFiles(dir: string, base = dir): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walkFiles(full, base))
    else out.push(full)
  }
  return out
}

interface TableResult {
  dbCount: number
  rows: Record<string, unknown>[]
  match: boolean
}

async function main() {
  log(`Base de dados: ${getDatabaseLabel()}`)
  log(`Destino: ${OUT_ROOT}`)
  mkdirp(CAMPOS_DIR)
  mkdirp(RAW_DIR)
  mkdirp(RAW_STORAGE_DIR)

  // ── 1. campos (todas as linhas, todas as colunas) ──────────────────────────
  log('A ler campos...')
  const camposDbCount = await countRows(supabase, 'campos')
  const camposRaw = await fetchAllRows<Campo & { id: string; ano?: number | null }>(supabase, 'campos')
  writeFileSync(path.join(RAW_DIR, 'campos.json'), JSON.stringify(camposRaw, null, 2))
  const camposMatch = camposRaw.length === camposDbCount
  log(`  campos: BD=${camposDbCount} backup=${camposRaw.length} ${camposMatch ? 'OK' : 'MISMATCH'}`)

  // ── 2. Tabelas financeiras ──────────────────────────────────────────────────
  const tables: Record<string, TableResult> = {}
  for (const t of FINANCIAL_TABLES) {
    log(`A ler ${t}...`)
    const dbCount = await countRows(supabase, t)
    const rows = await fetchAllRows(supabase, t)
    writeFileSync(path.join(RAW_DIR, `${t}.json`), JSON.stringify(rows, null, 2))
    const match = rows.length === dbCount
    tables[t] = { dbCount, rows, match }
    log(`  ${t}: BD=${dbCount} backup=${rows.length} ${match ? 'OK' : 'MISMATCH'}`)
  }

  const despesas = tables.despesas.rows as unknown as Despesa[]
  const despesaLinhas = tables.despesa_linhas.rows as unknown as DespesaLinha[]
  const devolucoes = tables.devolucoes.rows as unknown as Devolucao[]
  const regularizacoes = tables.regularizacoes_nif.rows as unknown as RegularizacaoNif[]
  const liquidacoes = tables.liquidacoes_nif.rows

  // ── 3. Storage: listar + descarregar bucket faturas (read-only) ────────────
  log(`A listar bucket '${BUCKET}'...`)
  const storageObjects = await listAllStorageObjects(supabase, BUCKET)
  log(`  ${storageObjects.length} objetos encontrados`)

  const referencedPaths = new Set<string>()
  for (const d of despesas) if (d.foto_path) referencedPaths.add(d.foto_path)
  for (const d of devolucoes) if (d.foto_path) referencedPaths.add(d.foto_path)

  const storagePathSet = new Set(storageObjects.map((o) => o.path))
  const orphanFiles = storageObjects.filter((o) => !referencedPaths.has(o.path)).map((o) => o.path)
  const missingFiles = [...referencedPaths].filter((p) => !storagePathSet.has(p))

  log(`  referenciados pela BD: ${referencedPaths.size} | órfãos: ${orphanFiles.length} | em falta: ${missingFiles.length}`)

  log('A descarregar todos os ficheiros do Storage (pode demorar)...')
  let downloadOk = 0
  let downloadFail = 0
  const downloadedBufferByPath = new Map<string, Buffer>()
  for (const obj of storageObjects) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(obj.path)
      if (error || !data) throw error ?? new Error('sem dados')
      const buf = Buffer.from(await data.arrayBuffer())
      const dest = path.join(RAW_STORAGE_DIR, obj.path)
      mkdirp(path.dirname(dest))
      writeFileSync(dest, buf)
      downloadedBufferByPath.set(obj.path, buf)
      downloadOk++
    } catch (e) {
      downloadFail++
      log(`  FALHA a descarregar ${obj.path}: ${(e as Error).message}`)
    }
  }
  log(`  descarregados: ${downloadOk}/${storageObjects.length} (falhas: ${downloadFail})`)

  // ── 4. Por campo: export amigável (reutilizando os exportadores atuais) ────
  log('A gerar exports por campo...')
  const despesaCampoOf = new Map(despesas.map((d) => [d.id, d.campo_id]))
  const fieldsManifest: Record<string, unknown>[] = []
  let totalFotosCopiadasParaCampos = 0

  for (const campo of camposRaw) {
    const campoId = campo.id
    const despesasDoCampo = despesas.filter((d) => d.campo_id === campoId)
    const despesaLinhasDoCampo = despesaLinhas.filter((l) => despesaCampoOf.get(l.despesa_id) === campoId)
    const devolucoesDoCampo = devolucoes.filter((d) => d.campo_id === campoId)
    const regularizacoesDoCampo = regularizacoes.filter((r) => r.campo_id === campoId)
    const liquidacoesDoCampo = liquidacoes.filter((r) => (r as { campo_id?: string }).campo_id === campoId)

    const ano = campo.ano ?? 2026
    const slug = getCampoSlug(campo.nome)
    const dir = path.join(CAMPOS_DIR, String(ano), slug)
    const dataDir = path.join(dir, 'data')
    const faturasDir = path.join(dir, 'faturas')
    mkdirp(dataDir)
    mkdirp(faturasDir)

    // Export amigável — código de produção, não reimplementado.
    const excelBuf = generateExcelBuffer(
      campo as Campo,
      despesasDoCampo,
      regularizacoesDoCampo,
      despesaLinhasDoCampo,
      devolucoesDoCampo
    )
    writeFileSync(path.join(dir, 'financeiro.xlsx'), excelBuf)

    const zipBuf = (await buildZip(
      supabase,
      campo as Campo,
      despesasDoCampo,
      regularizacoesDoCampo,
      despesaLinhasDoCampo,
      devolucoesDoCampo,
      'nodebuffer'
    )) as Buffer
    writeFileSync(path.join(dir, 'export-original.zip'), zipBuf)

    // Camada bruta, por campo (subconjunto do raw/ global, para conveniência).
    writeFileSync(path.join(dataDir, 'despesas.json'), JSON.stringify(despesasDoCampo, null, 2))
    writeFileSync(path.join(dataDir, 'despesa_linhas.json'), JSON.stringify(despesaLinhasDoCampo, null, 2))
    writeFileSync(path.join(dataDir, 'devolucoes.json'), JSON.stringify(devolucoesDoCampo, null, 2))
    writeFileSync(path.join(dataDir, 'regularizacoes_nif.json'), JSON.stringify(regularizacoesDoCampo, null, 2))
    writeFileSync(path.join(dataDir, 'liquidacoes_nif.json'), JSON.stringify(liquidacoesDoCampo, null, 2))

    // Fotos cruas deste campo — copiadas do que já foi descarregado do Storage
    // (mesmos bytes do raw/storage/faturas/, sem novo pedido de rede).
    let fotosCampo = 0
    for (const [objPath, buf] of downloadedBufferByPath) {
      if (objPath === slug || objPath.startsWith(`${slug}/`)) {
        const rel = objPath.slice(slug.length + 1) || path.basename(objPath)
        const dest = path.join(faturasDir, rel)
        mkdirp(path.dirname(dest))
        writeFileSync(dest, buf)
        fotosCampo++
      }
    }
    totalFotosCopiadasParaCampos += fotosCampo

    const totais = computeCampoTotais(campo as Campo, despesasDoCampo, devolucoesDoCampo)
    fieldsManifest.push({
      id: campoId,
      nome: campo.nome,
      ano,
      escalao: campo.escalao ?? null,
      setup_completo: campo.setup_completo ?? null,
      arquivado: (campo as { arquivado?: boolean }).arquivado ?? false,
      contagens: {
        despesas: despesasDoCampo.length,
        despesa_linhas: despesaLinhasDoCampo.length,
        devolucoes: devolucoesDoCampo.length,
        regularizacoes_nif: regularizacoesDoCampo.length,
        liquidacoes_nif: liquidacoesDoCampo.length,
        fotos_faturas: fotosCampo,
      },
      financeiro: {
        saldo_inicial: campo.saldo_inicial ?? null,
        total_despesas: Number(totais.totalDespesas.toFixed(2)),
        total_receitas: Number(totais.totalReceitas.toFixed(2)),
        total_devolucoes: Number(totais.totalDevolucoes.toFixed(2)),
        saldo_disponivel: Number(totais.saldoDisponivel.toFixed(2)),
      },
    })
    log(`  ${campo.nome} (${ano}/${slug}): ${despesasDoCampo.length} despesas, ${devolucoesDoCampo.length} devoluções, ${fotosCampo} fotos`)
  }

  // ── 5. Validação de integridade ─────────────────────────────────────────────
  log('A validar integridade do backup...')
  const validation: Record<string, { pass: boolean; detail: string }> = {}

  validation['campos'] = {
    pass: camposMatch,
    detail: `BD=${camposDbCount} backup=${camposRaw.length}`,
  }
  for (const t of FINANCIAL_TABLES) {
    validation[t] = { pass: tables[t].match, detail: `BD=${tables[t].dbCount} backup=${tables[t].rows.length}` }
  }
  validation['storage_download'] = {
    pass: downloadFail === 0 && downloadOk === storageObjects.length,
    detail: `listados=${storageObjects.length} descarregados=${downloadOk} falhas=${downloadFail}`,
  }

  // Re-lê e valida cada JSON bruto (parse sem exceção).
  let jsonAllValid = true
  for (const file of ['campos.json', ...FINANCIAL_TABLES.map((t) => `${t}.json`)]) {
    try {
      JSON.parse(readFileSync(path.join(RAW_DIR, file), 'utf8'))
    } catch {
      jsonAllValid = false
      log(`  JSON inválido: raw/${file}`)
    }
  }
  validation['raw_json_valid'] = { pass: jsonAllValid, detail: `${FINANCIAL_TABLES.length + 1} ficheiros verificados` }

  // Re-lê e valida cada financeiro.xlsx / export-original.zip por campo.
  let excelAllValid = true
  let zipAllValid = true
  let excelChecked = 0
  let zipChecked = 0
  for (const campo of camposRaw) {
    const ano = campo.ano ?? 2026
    const slug = getCampoSlug(campo.nome)
    const dir = path.join(CAMPOS_DIR, String(ano), slug)
    try {
      const wb = XLSX.read(readFileSync(path.join(dir, 'financeiro.xlsx')), { type: 'buffer' })
      if (!wb.SheetNames.includes('Resumo') || !wb.SheetNames.includes('Faturas')) throw new Error('folhas em falta')
      excelChecked++
    } catch (e) {
      excelAllValid = false
      log(`  financeiro.xlsx inválido para ${campo.nome}: ${(e as Error).message}`)
    }
    try {
      const zip = await JSZip.loadAsync(readFileSync(path.join(dir, 'export-original.zip')))
      if (Object.keys(zip.files).length === 0) throw new Error('zip vazio')
      zipChecked++
    } catch (e) {
      zipAllValid = false
      log(`  export-original.zip inválido para ${campo.nome}: ${(e as Error).message}`)
    }
  }
  validation['campo_excel_files'] = { pass: excelAllValid, detail: `${excelChecked}/${camposRaw.length} verificados` }
  validation['campo_zip_files'] = { pass: zipAllValid, detail: `${zipChecked}/${camposRaw.length} verificados` }

  const overallPass = Object.values(validation).every((v) => v.pass)

  // ── 6. SHA-256 por campo (financeiro.xlsx + export-original.zip) ───────────
  log('A calcular checksums SHA-256...')
  const shaLines: string[] = []
  for (const campo of camposRaw) {
    const ano = campo.ano ?? 2026
    const slug = getCampoSlug(campo.nome)
    const dir = path.join(CAMPOS_DIR, String(ano), slug)
    for (const f of ['financeiro.xlsx', 'export-original.zip']) {
      const full = path.join(dir, f)
      const rel = path.relative(OUT_ROOT, full).split(path.sep).join('/')
      shaLines.push(`${sha256OfFile(full)}  ${rel}`)
    }
  }
  writeFileSync(path.join(OUT_ROOT, 'SHA256SUMS.txt'), shaLines.join('\n') + '\n')

  // ── 7. manifest.json ─────────────────────────────────────────────────────
  const counts = {
    fields: camposRaw.length,
    expenses: tables.despesas.rows.length,
    expense_lines: tables.despesa_linhas.rows.length,
    refunds: tables.devolucoes.rows.length,
    nif_regularizations: tables.regularizacoes_nif.rows.length,
    nif_settlements: tables.liquidacoes_nif.rows.length,
    product_aliases: tables.produto_aliases.rows.length,
    campo_precos: tables.campo_precos.rows.length,
    valores_referencia: tables.valores_referencia.rows.length,
    locais: tables.locais.rows.length,
    transportes: tables.transportes.rows.length,
    transporte_segmentos: tables.transporte_segmentos.rows.length,
    invoice_files_in_storage: storageObjects.length,
    invoice_files_downloaded: downloadOk,
    invoice_files_orphan: orphanFiles.length,
    invoice_files_missing_referenced_by_db: missingFiles.length,
  }

  const years = [...new Set(camposRaw.map((c) => c.ano ?? 2026))].sort()

  const manifest = {
    created_at: startedAt.toISOString(),
    database: getDatabaseLabel(),
    backup_name: BACKUP_NAME,
    scope: 'Financeiro / Adjuntos apenas — módulo Mamãs (receitas, ementas, farmácia, restrições, animados) deliberadamente excluído.',
    years,
    fields: fieldsManifest,
    counts,
    storage: {
      bucket: BUCKET,
      orphan_files: orphanFiles,
      missing_files_referenced_by_db: missingFiles,
    },
    validation: Object.fromEntries(Object.entries(validation).map(([k, v]) => [k, v.pass ? 'PASS' : 'FAIL'])),
    validation_detail: validation,
    overall_validation: overallPass ? 'PASS' : 'FAIL',
  }
  writeFileSync(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // ── 8. README.txt ────────────────────────────────────────────────────────
  const readme = `CAMTIL Finance — Backup Integral
${'='.repeat(40)}

Criado em: ${startedAt.toISOString()}
Base de dados: ${getDatabaseLabel()}
Âmbito: dados financeiros (Adjuntos) de TODOS os campos e TODOS os anos.
         O módulo Mamãs (receitas, ementas, farmácia, restrições alimentares,
         dados de crianças) NÃO está incluído neste backup, propositadamente.

ESTRUTURA
---------
manifest.json          Contagens, totais por campo, resultado da validação.
SHA256SUMS.txt          Checksums dos exports por campo (verificar com
                        "sha256sum -c SHA256SUMS.txt" a partir desta pasta).
campos/<ano>/<slug>/    Um export por campo, por ano:
  financeiro.xlsx         Igual ao Excel que o botão "Exportar ZIP" gera hoje.
  export-original.zip     Igual ao ZIP que o botão "Exportar ZIP" gera hoje
                           (mesmo código de produção, não reimplementado).
  data/*.json             Despesas/linhas/devoluções/regularizações/
                           liquidações deste campo, todas as colunas.
  faturas/                Fotografias originais deste campo, tal como estão
                           no Storage (bucket "faturas"), sem qualquer edição.
raw/                    Camada bruta e completa, para recuperação mesmo que
                        os exportadores não incluam alguma coluna no futuro:
  campos.json, despesas.json, despesa_linhas.json, devolucoes.json,
  regularizacoes_nif.json, liquidacoes_nif.json, produto_aliases.json,
  campo_precos.json, valores_referencia.json, locais.json,
  transportes.json, transporte_segmentos.json
  storage/faturas/        Espelho 1:1 de TODOS os objetos do bucket "faturas",
                           incluindo ficheiros órfãos (sem despesa/devolução
                           associada) — ver manifest.json > storage.orphan_files.

AVISO DE SEGURANÇA
-------------------
raw/campos.json inclui a coluna "pin" de cada campo (o manifest.json NÃO a
repete). Esse PIN está hoje guardado em texto simples na base de dados — ver
a auditoria técnica, Secção 5 (RLS totalmente aberto). Trata este backup com
o mesmo cuidado que darias aos dados financeiros originais: não o publiques,
não o partilhes por canais não encriptados, e considera mover esta pasta para
fora do OneDrive (ou para uma subpasta OneDrive não sincronizada) enquanto a
V2 não resolver a autenticação real.

NÃO INCLUÍDO (propositadamente)
--------------------------------
.env / .env.local, chaves Supabase, ADMIN_PIN, quaisquer segredos,
node_modules, código-fonte da aplicação, dados médicos/pessoais das Mamãs.

VALIDAÇÃO
---------
Ver manifest.json > "validation" e "overall_validation". PASS significa que
as contagens de cada tabela e do Storage descarregado coincidem exatamente
com a base de dados de origem no momento em que este backup foi criado, e que
todos os financeiro.xlsx / export-original.zip por campo foram reabertos e
validados com sucesso.
`
  writeFileSync(path.join(OUT_ROOT, 'README.txt'), readme)

  // ── 9. Master ZIP ────────────────────────────────────────────────────────
  log('A construir o ZIP mestre...')
  const masterZip = new JSZip()
  const backupParentDir = path.join(REPO_ROOT, 'backup')
  for (const file of walkFiles(OUT_ROOT)) {
    // Relativo a backup/ (não a OUT_ROOT), para que o zip contenha a pasta
    // CAMTIL-Finance-Backup-<timestamp>/ como topo, tal como no exemplo pedido.
    const zipRel = path.relative(backupParentDir, file).split(path.sep).join('/')
    masterZip.file(zipRel, readFileSync(file))
  }
  const masterBuf = (await masterZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })) as Buffer
  const masterZipPath = path.join(REPO_ROOT, 'backup', `${BACKUP_NAME}.zip`)
  writeFileSync(masterZipPath, masterBuf)
  const masterSha = sha256OfBuffer(masterBuf)
  writeFileSync(`${masterZipPath}.sha256`, `${masterSha}  ${BACKUP_NAME}.zip\n`)

  const finishedAt = new Date()
  const report = {
    backup_name: BACKUP_NAME,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    out_root: OUT_ROOT,
    master_zip: masterZipPath,
    master_zip_sha256: masterSha,
    master_zip_size_bytes: masterBuf.length,
    years,
    counts,
    fields: fieldsManifest,
    storage: { orphan_files: orphanFiles, missing_files_referenced_by_db: missingFiles },
    validation,
    overall_validation: overallPass ? 'PASS' : 'FAIL',
  }
  writeFileSync(path.join(REPO_ROOT, 'backup', `${BACKUP_NAME}-report.json`), JSON.stringify(report, null, 2))

  log(`Concluído em ${report.duration_seconds}s. Validação geral: ${report.overall_validation}`)
  log(`Master ZIP: ${masterZipPath} (${(masterBuf.length / 1024 / 1024).toFixed(1)} MB)`)
  log(`SHA-256: ${masterSha}`)
}

main().catch((err) => {
  console.error('[backup] ERRO FATAL:', err)
  process.exit(1)
})

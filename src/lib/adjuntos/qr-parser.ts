// Parser do QR Code de faturas portuguesas.
// Formato: A:NIF*B:NIF*C:PT*D:FS*E:N*F:YYYYMMDD*G:doc*H:ATCUD*O:total*...
// Campos relevantes: A, B, D, F, G, H, O

export interface QrFaturaData {
  qr_raw: string
  qr_total: number | null
  qr_data: string | null         // ISO: YYYY-MM-DD
  qr_nif_emitente: string | null
  qr_nif_adquirente: string | null
  qr_numero_documento: string | null
  qr_atcud: string | null
  qr_tipo_documento: string | null
  tem_dados_uteis: boolean
}

export function parsearQrFatura(raw: string): QrFaturaData {
  const result: QrFaturaData = {
    qr_raw: raw,
    qr_total: null,
    qr_data: null,
    qr_nif_emitente: null,
    qr_nif_adquirente: null,
    qr_numero_documento: null,
    qr_atcud: null,
    qr_tipo_documento: null,
    tem_dados_uteis: false,
  }

  const parts = raw.split('*')
  for (const part of parts) {
    const colonIdx = part.indexOf(':')
    if (colonIdx < 1) continue
    const key = part.slice(0, colonIdx).trim()
    const value = part.slice(colonIdx + 1).trim()
    if (!value) continue

    switch (key) {
      case 'A':
        if (/^\d{9}$/.test(value)) result.qr_nif_emitente = value
        break
      case 'B':
        if (/^\d{9}$/.test(value)) result.qr_nif_adquirente = value
        break
      case 'D':
        result.qr_tipo_documento = value
        break
      case 'F':
        // YYYYMMDD → YYYY-MM-DD
        if (/^\d{8}$/.test(value)) {
          const ano = value.slice(0, 4)
          const mes = value.slice(4, 6)
          const dia = value.slice(6, 8)
          const dataISO = `${ano}-${mes}-${dia}`
          // Validação básica de data
          const d = new Date(dataISO)
          if (!isNaN(d.getTime())) result.qr_data = dataISO
        }
        break
      case 'G':
        result.qr_numero_documento = value
        break
      case 'H':
        result.qr_atcud = value
        break
      case 'O': {
        const total = parseFloat(value.replace(',', '.'))
        if (!isNaN(total) && total > 0) result.qr_total = total
        break
      }
    }
  }

  result.tem_dados_uteis = result.qr_total !== null || result.qr_nif_adquirente !== null
  return result
}

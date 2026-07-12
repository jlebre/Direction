import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

/**
 * Parses a monetary string that may use comma or period as decimal separator.
 * Returns null for empty, negative, or invalid inputs.
 */
export function parseMoney(value: string): number | null {
  if (!value || !value.trim()) return null
  const normalized = value.trim().replace(/,/g, '.')
  if ((normalized.match(/\./g) ?? []).length > 1) return null
  if (/[^0-9.]/.test(normalized)) return null
  const num = parseFloat(normalized)
  if (isNaN(num) || num < 0) return null
  return num
}

export function formatQuantidade(qty: number, unidade: string): string {
  if (qty === 0) return '—'
  const formatted = qty % 1 === 0 ? qty.toString() : qty.toFixed(2).replace('.', ',')
  return `${formatted} ${unidade}`
}

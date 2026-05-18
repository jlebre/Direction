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

export function formatQuantidade(qty: number, unidade: string): string {
  if (qty === 0) return '—'
  const formatted = qty % 1 === 0 ? qty.toString() : qty.toFixed(2).replace('.', ',')
  return `${formatted} ${unidade}`
}

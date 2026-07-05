'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  UtensilsCrossed,
  Users,
  LayoutDashboard,
  BookOpen,
  MoreHorizontal,
  X,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: 'ementa',    label: 'Ementa',      icon: CalendarDays },
  { href: 'animados',  label: 'Animados',    icon: Users },
  { href: 'receitas',  label: 'Receitas',    icon: UtensilsCrossed },
  { href: 'restricoes', label: 'Restrições', icon: AlertTriangle },
  { href: 'conselhos', label: 'Conselhos',   icon: BookOpen },
]

const bottomNavMain = [
  { href: '', label: 'Hub', icon: LayoutDashboard },
  { href: 'ementa', label: 'Ementa', icon: CalendarDays },
  { href: 'animados', label: 'Animados', icon: Users },
  { href: 'restricoes', label: 'Restrições', icon: AlertTriangle },
]

const maisItems = [
  { href: 'receitas',  label: 'Receitas',  icon: UtensilsCrossed },
  { href: 'conselhos', label: 'Conselhos', icon: BookOpen },
]

export function CampoNav({ campoId, campoNome }: { campoId: string; campoNome: string }) {
  const pathname = usePathname()
  const base = `/campo/${campoId}/mamas`
  const hubHref = `/campo/${campoId}`
  const [maisAberto, setMaisAberto] = useState(false)

  const maisAtivo = maisItems.some((item) => pathname.startsWith(`${base}/${item.href}`))

  return (
    <>
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-[#E7E8D1] min-h-screen fixed left-0 top-0 z-20">
        <div className="p-4 border-b border-[#E7E8D1]">
          <Link
            href={hubHref}
            className="flex items-center gap-2 text-[#2D5016] font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🍳</span>
            <span>Mamãs</span>
          </Link>
        </div>
        <div className="p-3 border-b border-[#E7E8D1]">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#2D5016] transition-colors mb-2"
          >
            <LayoutDashboard className="h-3 w-3" />
            Todos os campos
          </Link>
          <Link
            href={hubHref}
            className="block text-sm font-bold text-[#36454F] truncate hover:text-[#2D5016] transition-colors"
          >
            {campoNome}
          </Link>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {navItems.map((item) => {
            const href = `${base}/${item.href}`
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5',
                  isActive
                    ? 'bg-[#2D5016] text-white'
                    : 'text-[#36454F] hover:bg-[#E7E8D1]'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Bottom nav — mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E7E8D1] flex">
        {bottomNavMain.map((item) => {
          const href = item.href === '' ? hubHref : `${base}/${item.href}`
          const isActive =
            item.href === ''
              ? pathname === hubHref || pathname === base
              : pathname.startsWith(`${base}/${item.href}`)
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors min-h-[56px]',
                isActive ? 'text-[#2D5016]' : 'text-gray-500'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}

        {/* "Mais" button */}
        <button
          onClick={() => setMaisAberto(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors min-h-[56px]',
            maisAtivo ? 'text-[#2D5016]' : 'text-gray-500'
          )}
        >
          <MoreHorizontal className={cn('h-5 w-5', maisAtivo && 'stroke-[2.5]')} />
          <span className="text-[10px]">Mais</span>
        </button>
      </nav>

      {/* "Mais" sheet overlay — mobile */}
      {maisAberto && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setMaisAberto(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl pb-safe">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E8D1]">
              <span className="font-bold text-[#36454F] text-sm">Mais módulos</span>
              <button onClick={() => setMaisAberto(false)} className="p-1 rounded-lg hover:bg-[#E7E8D1] transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              {maisItems.map((item) => {
                const href = `${base}/${item.href}`
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => setMaisAberto(false)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-[#2D5016] text-white'
                        : 'text-[#36454F] hover:bg-[#E7E8D1]'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] text-center leading-tight">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

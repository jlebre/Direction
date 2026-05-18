'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface HeaderProps {
  title?: string
  backHref?: string
  actions?: React.ReactNode
}

export function Header({ title, backHref, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-[#E7E8D1] px-4 h-14 flex items-center gap-3">
      {backHref && (
        <Link href={backHref} className="text-[#B85042] hover:opacity-70 transition-opacity">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      {title && (
        <h1 className="text-base font-bold text-[#36454F] flex-1 truncate">{title}</h1>
      )}
      {actions && (
        <div className="flex items-center gap-2 ml-auto">{actions}</div>
      )}
    </header>
  )
}

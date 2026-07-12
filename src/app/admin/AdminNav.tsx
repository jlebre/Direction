'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Campos' },
  { href: '/admin/locais', label: 'Locais' },
  { href: '/admin/valores-referencia', label: 'Valores Ref.' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="bg-white border-b border-[#E7E8D1] px-4">
      <div className="max-w-4xl mx-auto flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'text-sm px-4 py-3 whitespace-nowrap transition-colors',
                active
                  ? 'font-semibold border-b-2 border-[#2D5016] text-[#2D5016]'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

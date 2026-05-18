'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function CampoTracker({ campoId, campoNome }: { campoId: string; campoNome: string }) {
  const pathname = usePathname()

  useEffect(() => {
    try {
      localStorage.setItem('lastCampo', JSON.stringify({ id: campoId, nome: campoNome, path: pathname }))
    } catch { /* ignore */ }
  }, [pathname, campoId, campoNome])

  return null
}

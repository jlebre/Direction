'use client'

import { useEffect } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info'
  onDismiss: () => void
}

export default function Toast({ message, type = 'success', onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const bg =
    type === 'success' ? 'bg-[#2D5016]' : type === 'error' ? 'bg-red-600' : 'bg-gray-800'

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${bg} max-w-[90vw] text-center`}
    >
      {message}
    </div>
  )
}

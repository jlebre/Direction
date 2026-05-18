'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-[#36454F] group-[.toaster]:border-[#E7E8D1] group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-gray-500',
          actionButton: 'group-[.toast]:bg-[#B85042] group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600',
          error: 'group-[.toaster]:bg-[#F96167]/10 group-[.toaster]:text-[#F96167] group-[.toaster]:border-[#F96167]/20',
          success: 'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-800 group-[.toaster]:border-green-200',
        },
      }}
      position="top-right"
    />
  )
}

import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'App Direção',
  description: 'CAMTIL · Gestão de campos de verão 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f8f8f4]">
        {children}
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}

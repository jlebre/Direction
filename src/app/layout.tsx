import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Image from 'next/image'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DIREÇÃO CAMTIL',
  description: 'ADJUNTOS E MAMÃS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f8f8f4]">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            <Image
              src="/logo.png"
              alt="DIREÇÃO CAMTIL"
              width={140}
              height={40}
              priority
              className="h-10 w-auto"
            />
            <div>
              <p className="text-sm font-semibold text-black">DIREÇÃO CAMTIL</p>
              <p className="text-xs text-black/60">ADJUNTOS E MAMÃS</p>
            </div>
          </div>
        </header>

        {children}

        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}

/*import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DIREÇÃO CAMTIL',
  description: 'ADJUNTOS E MAMÃS',
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
*/
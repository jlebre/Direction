'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function verificarAdminPin(formData: FormData) {
  const pin = formData.get('pin') as string
  const adminPin = process.env.ADMIN_PIN

  if (!adminPin) throw new Error('ADMIN_PIN não está configurado no servidor.')
  if (pin !== adminPin) throw new Error('PIN incorreto.')

  const cookieStore = await cookies()
  cookieStore.set('admin_auth', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 horas
    path: '/',
    sameSite: 'strict',
  })

  redirect('/admin')
}

export async function sairAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_auth')
  redirect('/admin')
}

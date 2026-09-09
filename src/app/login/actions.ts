'use server'

import { createSessionServerClient } from '@/lib/supabase/session-server'
import { redirect } from 'next/navigation'

/**
 * FASE 2.2 (V2 Security & Auth) — Email OTP, sem password.
 *
 * `shouldCreateUser: false` é deliberado e implementa diretamente a decisão
 * fechada no Gate A: "nada de self-signup público" — só emails já com conta
 * (criada por um Admin, subfase 2.3) conseguem pedir um código. Um email
 * desconhecido recebe a mesma mensagem genérica de erro, para não revelar
 * se existe ou não conta associada.
 */
export async function sendOtp(
  _prevState: { error?: string; sent?: boolean },
  formData: FormData
): Promise<{ error?: string; sent?: boolean }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { error: 'Introduz um email válido.' }
  }

  const supabase = await createSessionServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })

  if (error) {
    // Mensagem genérica de propósito — não confirma nem nega se o email
    // tem conta (evita enumeração de utilizadores).
    return { error: 'Não foi possível enviar o código. Confirma o email ou contacta um administrador.' }
  }

  return { sent: true }
}

export async function verifyOtp(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const token = String(formData.get('token') ?? '').trim()
  const nextParam = String(formData.get('next') ?? '/')
  const next = nextParam.startsWith('/') ? nextParam : '/'

  if (!email || !token) {
    return { error: 'Introduz o código recebido por email.' }
  }

  const supabase = await createSessionServerClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

  if (error) {
    return { error: 'Código inválido ou expirado. Pede um novo código.' }
  }

  redirect(next)
}

export async function logout() {
  const supabase = await createSessionServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

'use client'

import { useActionState, useEffect, useState } from 'react'
import { sendOtp, verifyOtp } from './actions'

export function LoginForm({ next }: { next: string }) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')

  const [sendState, sendAction, sendPending] = useActionState(sendOtp, {})
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtp, {})

  useEffect(() => {
    if (sendState.sent) setStep('code')
  }, [sendState.sent])

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E7E8D1] p-8 space-y-6">
      <div className="text-center space-y-1">
        <div className="text-4xl mb-3">🔐</div>
        <h1 className="text-xl font-bold text-[#36454F]">Entrar</h1>
        <p className="text-sm text-gray-500">
          {step === 'email'
            ? 'Introduz o teu email para receberes um código de acesso.'
            : `Enviámos um código para ${email}.`}
        </p>
      </div>

      {step === 'email' ? (
        <form
          action={(formData) => {
            setEmail(String(formData.get('email') ?? '').trim().toLowerCase())
            sendAction(formData)
          }}
          className="space-y-4"
        >
          <input
            name="email"
            type="email"
            autoFocus
            autoComplete="email"
            placeholder="email@exemplo.com"
            className="w-full border border-[#E7E8D1] rounded-lg px-4 py-3 text-center focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
          {sendState.error && <p className="text-sm text-[#F96167] text-center">{sendState.error}</p>}
          <button
            type="submit"
            disabled={sendPending}
            className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {sendPending ? 'A enviar…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <input
            name="token"
            type="text"
            inputMode="numeric"
            autoFocus
            autoComplete="one-time-code"
            placeholder="Código"
            className="w-full border border-[#E7E8D1] rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
          {verifyState.error && <p className="text-sm text-[#F96167] text-center">{verifyState.error}</p>}
          <button
            type="submit"
            disabled={verifyPending}
            className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {verifyPending ? 'A verificar…' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Usar outro email
          </button>
        </form>
      )}
    </div>
  )
}

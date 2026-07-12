'use client'

import { useState } from 'react'
import { verificarAdminPin } from './actions'

export function AdminPinGate() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await verificarAdminPin(formData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F4] p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E7E8D1] p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl mb-3">⚙️</div>
          <h1 className="text-xl font-bold text-[#36454F]">Administração</h1>
          <p className="text-sm text-gray-500">Introduz o PIN de administrador</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="pin"
            type="password"
            autoFocus
            autoComplete="current-password"
            placeholder="PIN"
            className="w-full border border-[#E7E8D1] rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
          {error && (
            <p className="text-sm text-[#F96167] text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D5016] hover:bg-[#2D5016]/90 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'A verificar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

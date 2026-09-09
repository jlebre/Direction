import { cookies } from 'next/headers'
import { AdminPinGate } from './AdminPinGate'
import { AdminNav } from './AdminNav'

/**
 * LEGACY ACCESS (Fase 2 — compatibilidade transitória, ver
 * docs/v2/AUTHORIZATION.md § Fase de compatibilidade). Este gate por cookie
 * + ADMIN_PIN continua a proteger a UI de /admin, mas /admin/memberships
 * exige ADICIONALMENTE uma sessão Supabase Auth real com global_role='admin'
 * (authenticated access) — os dois não se substituem um ao outro nesta
 * fase, coexistem deliberadamente.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuth = cookieStore.get('admin_auth')?.value === 'true'

  if (!isAuth) return <AdminPinGate />

  return (
    <div className="min-h-screen bg-[#F8F8F4]">
      <AdminNav />
      {children}
    </div>
  )
}

import { cookies } from 'next/headers'
import { AdminPinGate } from './AdminPinGate'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuth = cookieStore.get('admin_auth')?.value === 'true'

  if (!isAuth) return <AdminPinGate />

  return <>{children}</>
}

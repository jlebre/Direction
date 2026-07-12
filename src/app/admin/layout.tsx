import { cookies } from 'next/headers'
import { AdminPinGate } from './AdminPinGate'
import { AdminNav } from './AdminNav'

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

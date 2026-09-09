import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F4] p-4">
      <LoginForm next={next && next.startsWith('/') ? next : '/'} />
    </div>
  )
}

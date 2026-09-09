import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * FASE 2.2 (V2 Security & Auth) — proteção estrutural de rotas.
 *
 * Next.js 16 renomeou `middleware.ts` para `proxy.ts` (função exportada
 * passa a chamar-se `proxy`, não `middleware`) — ver auditoria técnica,
 * Secção 2, e node_modules/next/dist/docs/.../proxy.md. Este ficheiro tem de
 * viver em `src/` (não na raiz do projeto) porque `app/` também vive em
 * `src/app/` — a doc do Next é explícita: "at the same level as pages or
 * app". Confirmado pelo build: "ƒ Proxy (Middleware)" só aparece com o
 * ficheiro aqui.
 *
 * ÂMBITO DELIBERADAMENTE LIMITADO NESTA SUBFASE: só `/tesouraria/*` — uma
 * rota nova, ainda sem nenhuma página construída, portanto com ZERO risco de
 * bloquear alguém que já usa a app hoje.
 *
 * `/campo/*` e `/admin/*` NÃO estão incluídos no matcher ainda, de propósito.
 * Incluí-los agora bloquearia TODA a app (incluindo o próprio /admin) para
 * TODA a gente, porque: (a) ainda não existe nenhuma conta Supabase Auth
 * real — profiles tem 0 linhas; (b) o fluxo de Email OTP ainda não foi
 * validado ponta-a-ponta por um humano; (c) o PIN legacy continua a ser o
 * único caminho de acesso funcional a estas rotas. Isto é exatamente o
 * cenário que a "REGRA DE STOP EM PRODUCTION" do plano da Fase 2 pede para
 * reportar antes de executar ("downtime significativo... impossibilidade
 * clara de rollback" — aqui seria "ninguém consegue entrar em lado nenhum
 * até o primeiro admin fazer login com sucesso"). Ver o relatório de
 * execução da Fase 2.2 para os passos exatos que destravam isto (bootstrap
 * do primeiro utilizador admin) — depois de confirmado, o matcher abaixo
 * pode ser estendido para incluir '/campo/:path*' e '/admin/:path*' como um
 * passo pequeno e isolado.
 */
const PROTECTED_PREFIXES = ['/tesouraria']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() valida o JWT contra o servidor Auth — nunca confiar só na
  // presença do cookie (getSession() sozinho não seria suficiente aqui).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/tesouraria/:path*'],
}

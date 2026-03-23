import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - mandatory for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // PROTECTED ROUTES LOGIC
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isLogin = request.nextUrl.pathname.startsWith('/login')

  if (!user && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

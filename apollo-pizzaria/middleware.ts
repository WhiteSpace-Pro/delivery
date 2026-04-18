import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from './types/database'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { pathname } = request.nextUrl

  // Handle favicon and static assets before any auth logic
  if (
    pathname === '/favicon.ico' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icon-') ||
    pathname === '/manifest.json'
  ) {
    return response
  }

  // Public routes (no auth required)
  const isPublicRoute =
    pathname === '/' || pathname === '/menu' || pathname.startsWith('/menu') || pathname.startsWith('/cart') || pathname.startsWith('/order') ||
    pathname === '/login' ||
    pathname === '/cardapio' ||
    pathname.startsWith('/api/webhooks')

  if (isPublicRoute) {
    return response
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to /login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(url)
  }

  // Get user role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()

  const role = profile?.role

  // dev e superadmin têm acesso irrestrito a todas as rotas
  if (role === 'dev' || role === 'superadmin') {
    return response
  }

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin' && role !== 'kitchen') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Delivery routes protection
  if (pathname.startsWith('/delivery')) {
    if (role !== 'delivery') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('error', 'restricted')
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/delivery/:path*'
  ],
}

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const redirectPath = searchParams.get('redirect')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'restricted') {
      setError('Acesso restrito a entregadores')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email ou senha incorretos')
      setIsLoading(false)
      return
    }

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single<{ role: string }>()

      if (profileError || !profile) {
        setError('Erro ao carregar perfil do usuário')
        setIsLoading(false)
        return
      }

      const roleRedirects: Record<string, string> = {
        dev:        '/admin',
        superadmin: '/admin',
        admin:      '/admin',
        kitchen:    '/admin',
        delivery:   '/delivery',
        customer:   '/',
      }

      const defaultDest = roleRedirects[profile.role] ?? '/'
      const adminRoles = ['dev', 'superadmin', 'admin', 'kitchen']
      const deliveryRoles = ['delivery']

      let destino = defaultDest
      if (redirectPath) {
        if (redirectPath.startsWith('/admin') && adminRoles.includes(profile.role)) {
          destino = redirectPath
        } else if (redirectPath.startsWith('/delivery') && deliveryRoles.includes(profile.role)) {
          destino = redirectPath
        }
      }

      router.push(destino)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, informe seu e-mail para redefinir a senha')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/minha-conta/senha`,
    })

    if (error) {
      setError('Erro ao enviar e-mail de redefinição')
    } else {
      setMessage('Verifique seu e-mail para redefinir a senha')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-apollo-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-playfair text-5xl md:text-6xl text-apollo-orange mb-2">
            Apollo
          </h1>
          <p className="font-dm text-white/60 text-sm uppercase tracking-widest">
            Pizzaria System
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-dm text-white/80 mb-1">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-apollo-orange transition-colors font-dm"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" title="Senha" className="block text-sm font-dm text-white/80 mb-1">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-apollo-orange transition-colors font-dm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-apollo-orange hover:underline font-dm"
            >
              Esqueci minha senha
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center font-dm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-lg text-center font-dm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-apollo-orange hover:bg-apollo-orange/90 disabled:opacity-50 text-white font-dm font-bold py-3 rounded-lg transition-colors"
          >
            {isLoading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginContent />
    </Suspense>
  )
}

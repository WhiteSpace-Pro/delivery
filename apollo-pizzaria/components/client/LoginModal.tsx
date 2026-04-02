/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      onSuccess()
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone }
        }
      })
      if (signUpError) throw signUpError

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: fullName, phone })
          .eq('id', data.user.id)

        if (profileError) console.error('Error updating profile:', profileError)
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0D0D0D] border-[#1C1C1C] text-white max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-playfair text-apollo-orange italic">
            {activeTab === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex bg-[#1C1C1C] rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('login')}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-md transition-all",
              activeTab === 'login' ? "bg-apollo-orange text-white" : "text-white/40 hover:text-white"
            )}
          >
            Entrar
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-md transition-all",
              activeTab === 'register' ? "bg-apollo-orange text-white" : "text-white/40 hover:text-white"
            )}
          >
            Cadastrar
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {activeTab === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nome completo</label>
                <input
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Telefone</label>
                <input
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                  placeholder="(99) 99999-9999"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">E-mail</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Senha</label>
            <input
              required
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-apollo-orange/20 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Processando...' : activeTab === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Loader2, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (activeTab === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (signInError) throw signInError
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              role: 'customer',
              tenant_id: TENANT_ID
            }
          }
        })
        if (signUpError) throw signUpError
      }

      onSuccess?.()
      onClose()
      window.location.reload() // Quick way to refresh UI state
    } catch (err: any) {
      console.error(err)
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] bg-[#141414] border-[#2A2A2A] text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-playfair font-bold italic text-apollo-orange">
            {activeTab === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="flex bg-[#0D0D0D] rounded-xl p-1 mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={cn(
                "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all",
                activeTab === 'login' ? "bg-apollo-orange text-white" : "text-white/40 hover:text-white"
              )}
            >
              Entrar
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={cn(
                "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all",
                activeTab === 'register' ? "bg-apollo-orange text-white" : "text-white/40 hover:text-white"
              )}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'register' && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                    placeholder="(99) 99999-9999"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input
                required
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                placeholder="E-mail"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input
                required
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                placeholder="Senha"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-apollo-orange/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>{activeTab === 'login' ? 'Entrar agora' : 'Finalizar cadastro'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-white/40 mt-6 uppercase tracking-widest font-bold">
            🔒 Checkout 100% Seguro
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

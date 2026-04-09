/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { createProfile } from '@/app/(client)/checkout/actions/checkout-actions'
import { cn } from '@/lib/utils'
import { Loader2, Mail, Lock, User, Phone, ArrowRight, KeyRound } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  redirectToCheckout?: boolean
}

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

// TODO: habilitar Phone Auth no Supabase dashboard para ativar login por telefone
const PHONE_AUTH_ENABLED = false

const supabase = createClient()

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `+55${digits}`
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function LoginModal({ isOpen, onClose, onSuccess, redirectToCheckout }: LoginModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    otp: '',
  })

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
    if (redirectToCheckout) {
      router.push('/checkout')
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (signInError) throw signInError
        handleSuccess()
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem.')
        }
        if (formData.password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.')
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              role: 'customer',
              tenant_id: TENANT_ID,
            },
          },
        })
        if (signUpError) throw signUpError

        if (authData.user) {
          await createProfile({
            id: authData.user.id,
            full_name: formData.fullName,
            phone: formData.phone,
            tenant_id: TENANT_ID,
          })
        }

        handleSuccess()
      }
    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'E-mail ou senha inválidos.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    const digits = formData.phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Informe um telefone válido com DDD.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formatPhoneE164(formData.phone),
      })
      if (otpError) throw otpError
      setOtpSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formatPhoneE164(formData.phone),
        token: formData.otp,
        type: 'sms',
      })
      if (verifyError) throw verifyError

      if (verifyData.user) {
        await createProfile({
          id: verifyData.user.id,
          full_name: formData.phone,
          phone: formData.phone,
          tenant_id: TENANT_ID,
        })
      }
      handleSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ email: '', password: '', confirmPassword: '', fullName: '', phone: '', otp: '' })
    setError(null)
    setOtpSent(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); resetForm() } }}>
      <DialogContent className="max-w-[400px] bg-[#141414] border-[#2A2A2A] text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-playfair font-bold italic text-apollo-orange">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Auth method tabs — phone only shown if enabled */}
          {PHONE_AUTH_ENABLED && (
            <div className="flex bg-[#0D0D0D] rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setAuthMethod('email'); resetForm() }}
                className={cn(
                  'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2',
                  authMethod === 'email' ? 'bg-apollo-orange text-white' : 'text-white/40 hover:text-white'
                )}
              >
                <Mail size={14} /> E-mail
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethod('phone'); resetForm() }}
                className={cn(
                  'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2',
                  authMethod === 'phone' ? 'bg-apollo-orange text-white' : 'text-white/40 hover:text-white'
                )}
              >
                <Phone size={14} /> Telefone
              </button>
            </div>
          )}

          {/* Email/Password flow */}
          {authMethod === 'email' && (
            <>
              <div className="flex bg-[#0D0D0D] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); resetForm() }}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all',
                    mode === 'login' ? 'bg-apollo-orange text-white' : 'text-white/40 hover:text-white'
                  )}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); resetForm() }}
                  className={cn(
                    'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all',
                    mode === 'register' ? 'bg-apollo-orange text-white' : 'text-white/40 hover:text-white'
                  )}
                >
                  Criar conta
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {mode === 'register' && (
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
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                        placeholder="(11) 99999-9999"
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
                    placeholder={mode === 'register' ? 'Senha (mín. 6 caracteres)' : 'Senha'}
                  />
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      required
                      type="password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                      placeholder="Confirmar senha"
                    />
                  </div>
                )}

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
                      <span>{mode === 'login' ? 'Entrar agora' : 'Finalizar cadastro'}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Phone/OTP flow — only rendered if PHONE_AUTH_ENABLED */}
          {authMethod === 'phone' && PHONE_AUTH_ENABLED && (
            <div className="space-y-3">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  disabled={otpSent}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors disabled:opacity-50"
                  placeholder="(11) 99999-9999"
                />
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <><Phone size={18} /> Receber código SMS</>
                  )}
                </button>
              ) : (
                <>
                  <p className="text-xs text-white/40 text-center">Código enviado para {formData.phone}</p>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      maxLength={6}
                      value={formData.otp}
                      onChange={e => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors tracking-[0.5em] text-center"
                      placeholder="000000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || formData.otp.length < 6}
                    className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (
                      <><ArrowRight size={18} /> Confirmar código</>
                    )}
                  </button>
                </>
              )}

              {error && (
                <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {error}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-[10px] text-white/40 uppercase tracking-widest font-bold">
            🔒 Checkout 100% Seguro
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

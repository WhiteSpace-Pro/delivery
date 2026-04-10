/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowRight, ArrowLeft, User, Lock, Mail, Phone } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  redirectToCheckout?: boolean
}

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const supabase = createClient()

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

type Step = 'identify' | 'found' | 'notFound'

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

export function LoginModal({ isOpen, onClose, onSuccess, redirectToCheckout }: LoginModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('identify')
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [identifier, setIdentifier] = useState('')
  // Step 2 — found
  const [foundName, setFoundName] = useState('')
  const [foundInitial, setFoundInitial] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [password, setPassword] = useState('')
  // Step 2 — not found (registration)
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const isPhone = !identifier.includes('@') && identifier.replace(/\D/g, '').length > 0
  const isEmail = identifier.includes('@')

  const goTo = (next: Step, dir: number) => {
    setDirection(dir)
    setError(null)
    setStep(next)
  }

  const handleSuccess = () => {
    onSuccess?.()
    onClose()
    if (redirectToCheckout) router.push('/checkout')
  }

  const resetAll = () => {
    setStep('identify')
    setDirection(1)
    setIdentifier('')
    setPassword('')
    setFoundName('')
    setFoundInitial('')
    setLoginEmail('')
    setRegFullName('')
    setRegEmail('')
    setRegPhone('')
    setRegPassword('')
    setRegConfirm('')
    setError(null)
  }

  // Step 1: identify
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      })
      const data = await res.json()
      if (data.found) {
        setFoundName(data.name)
        setFoundInitial(data.avatar_initial)
        setLoginEmail(data.loginEmail)
        // Pre-fill phone field for registration fallback (in case they go back)
        if (isPhone) setRegPhone(identifier)
        if (isEmail) setRegEmail(identifier)
        goTo('found', 1)
      } else {
        // Pre-fill known info
        if (isEmail) setRegEmail(identifier)
        if (isPhone) setRegPhone(identifier)
        goTo('notFound', 1)
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2a: sign in (found user)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })
      if (signInError) throw signInError
      handleSuccess()
    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Senha incorreta. Tente novamente.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  // Step 2b: register (not found)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (regPassword !== regConfirm) { setError('As senhas não coincidem.'); return }
    if (regPassword.length < 6) { setError('Senha deve ter pelo menos 6 caracteres.'); return }

    const emailToUse = isEmail ? identifier.trim() : regEmail.trim()
    if (!emailToUse || !emailToUse.includes('@')) {
      setError('Informe um e-mail válido para criar sua conta.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: emailToUse,
        password: regPassword,
        options: {
          data: {
            full_name: regFullName,
            phone: regPhone,
            role: 'customer',
            tenant_id: TENANT_ID,
          },
        },
      })
      if (signUpError) throw signUpError
      if (authData.user) {
        await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: authData.user.id,
            full_name: regFullName,
            phone: regPhone || null,
            tenant_id: TENANT_ID,
          }),
        })
      }
      handleSuccess()
    } catch (err: any) {
      setError(
        err.message?.includes('already registered')
          ? 'Este e-mail já está cadastrado.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); resetAll() } }}>
      <DialogContent className="max-w-[400px] bg-[#141414] border-[#2A2A2A] text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-playfair font-bold italic text-apollo-orange">
            {step === 'identify' && 'Identificação'}
            {step === 'found' && 'Bem-vindo de volta!'}
            {step === 'notFound' && 'Criar conta'}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 'identify' && (
              <motion.div
                key="identify"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="px-6 pb-6 pt-4"
              >
                <p className="text-sm text-white/50 mb-5">
                  Qual seu e-mail ou telefone?
                </p>
                <form onSubmit={handleIdentify} className="space-y-4">
                  <div className="relative">
                    {isPhone
                      ? <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      : <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    }
                    <input
                      autoFocus
                      required
                      value={identifier}
                      onChange={e => {
                        const v = e.target.value
                        // If only digits/phone chars, apply mask
                        if (!v.includes('@') && v.replace(/\D/g, '').length === v.replace(/[() -]/g, '').length) {
                          const digits = v.replace(/\D/g, '')
                          if (digits.length > 0 && !v.includes('@')) {
                            setIdentifier(maskPhone(v))
                            return
                          }
                        }
                        setIdentifier(v)
                      }}
                      className={inputCls}
                      placeholder="nome@email.com ou (11) 99999-9999"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {error}
                    </p>
                  )}

                  <button
                    disabled={loading || !identifier.trim()}
                    className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading
                      ? <Loader2 className="animate-spin" size={18} />
                      : <><span>Continuar</span><ArrowRight size={18} /></>
                    }
                  </button>
                </form>

                <p className="text-center text-[10px] text-white/40 uppercase tracking-widest font-bold mt-4">
                  🔒 Checkout 100% Seguro
                </p>
              </motion.div>
            )}

            {step === 'found' && (
              <motion.div
                key="found"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="px-6 pb-6 pt-4"
              >
                {/* User avatar */}
                <div className="flex items-center gap-4 mb-5 p-4 bg-[#0D0D0D] rounded-xl border border-[#2A2A2A]">
                  <div className="w-12 h-12 rounded-full bg-apollo-orange flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {foundInitial}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-0.5">
                      Encontramos seu cadastro!
                    </p>
                    <p className="font-bold text-white">{foundName}</p>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      autoFocus
                      required
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={inputCls}
                      placeholder="Sua senha"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {error}
                    </p>
                  )}

                  <button
                    disabled={loading || !password}
                    className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading
                      ? <Loader2 className="animate-spin" size={18} />
                      : <><span>Continuar como {foundName.split(' ')[0]}</span><ArrowRight size={18} /></>
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo('identify', -1)}
                    className="w-full text-center text-xs text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Não sou eu
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'notFound' && (
              <motion.div
                key="notFound"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="px-6 pb-6 pt-4"
              >
                <p className="text-sm text-white/50 mb-5">
                  Vamos criar seu cadastro.
                </p>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      autoFocus
                      required
                      value={regFullName}
                      onChange={e => setRegFullName(e.target.value)}
                      className={inputCls}
                      placeholder="Nome completo"
                    />
                  </div>

                  {/* If identifier is phone, ask for email too */}
                  {isPhone && (
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        required
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        className={inputCls}
                        placeholder="Seu e-mail"
                      />
                    </div>
                  )}

                  {/* If identifier is email, show phone field */}
                  {isEmail && (
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        value={regPhone}
                        onChange={e => setRegPhone(maskPhone(e.target.value))}
                        className={inputCls}
                        placeholder="Telefone (opcional)"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      required
                      type="password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className={inputCls}
                      placeholder="Senha (mín. 6 caracteres)"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      required
                      type="password"
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      className={inputCls}
                      placeholder="Confirmar senha"
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {error}
                    </p>
                  )}

                  <button
                    disabled={loading}
                    className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading
                      ? <Loader2 className="animate-spin" size={18} />
                      : <><span>Criar conta e continuar</span><ArrowRight size={18} /></>
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo('identify', -1)}
                    className="w-full text-center text-xs text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={12} /> Voltar
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

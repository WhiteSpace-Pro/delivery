'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Mail, Phone, Lock, User, Loader2,   } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { Dialog, DialogContent } from '@/components/ui/dialog'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  redirectToCheckout?: boolean
}

type Step = 'identify' | 'found' | 'notFound'

export function LoginModal({ isOpen, onClose, onSuccess, redirectToCheckout }: LoginModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('identify')
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Identify state
  const [identifier, setIdentifier] = useState('')
  const isEmail = identifier.includes('@')
  const isPhone = !isEmail && identifier.replace(/\D/g, '').length >= 10

  // Sign in state
  const [password, setPassword] = useState('')
  const [foundName, setFoundName] = useState('')
  const [foundPhone, setFoundPhone] = useState('')
  const [foundInitial, setFoundInitial] = useState('')
  const [loginEmail, setLoginEmail] = useState('')

  // Register state
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  const maskPhone = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
  }

  const goTo = (next: Step, dir: number) => {
    setDirection(dir)
    setStep(next)
    setError(null)
  }

  const handleSuccess = async () => {
    onSuccess?.()
    onClose()

    // Check role for redirection
    try {
      const { data: profile } = await supabase.from('profiles').select('role').single()
      if (profile?.role === 'delivery') {
        router.push('/delivery')
        return
      }
      if (['admin', 'kitchen', 'dev', 'superadmin'].includes(profile?.role || '')) {
        router.push('/admin')
        return
      }
    } catch (e) {
      console.error('Failed to get role for redirect', e)
    }

    if (redirectToCheckout) {
      router.push('/checkout')
    } else {
      window.location.reload()
    }
  }

  const resetAll = () => {
    setStep('identify')
    setDirection(1)
    setIdentifier('')
    setPassword('')
    setFoundName('')
    setFoundPhone('')
    setFoundInitial('')
    setLoginEmail('')
    setRegFullName('')
    setRegEmail('')
    setRegPhone('')
    setRegPassword('')
    setRegConfirm('')
    setError(null)
  }

  useEffect(() => {
    if (!isOpen) {
      setTimeout(resetAll, 300)
    }
  }, [isOpen])

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
        setFoundPhone(data.phone || '')
        setFoundInitial(data.avatar_initial)
        setLoginEmail(data.loginEmail)
        if (isPhone) setRegPhone(identifier)
        if (isEmail) setRegEmail(identifier)
        goTo('found', 1)
      } else {
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

  // Step 2a: sign in (found)
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
    setLoading(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail || `${regPhone.replace(/\D/g, '')}@apollo.pizzaria.com`,
        password: regPassword,
        options: {
          data: {
            full_name: regFullName,
            phone: regPhone,
            role: 'customer',
            tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6'
          }
        }
      })

      if (signUpError) throw signUpError

      if (data.user) {
         // Create profile explicitly
         await fetch('/api/auth/create-profile', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             id: data.user.id,
             full_name: regFullName,
             phone: regPhone,
             tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6'
           })
         })
         handleSuccess()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  }

  const inputCls = "w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 pl-12 text-sm focus:outline-none focus:border-apollo-orange transition-all placeholder:text-white/20"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-[#1C1C1C] border-[#2A2A2A] max-w-sm sm:rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="p-6 pb-0 pt-8">
            <h2 className="text-2xl font-playfair font-bold text-apollo-orange italic mb-1">
              Olá! Que bom ver você.
            </h2>
          </div>

          <AnimatePresence initial={false} custom={direction} mode="wait">
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
                <div className="flex items-center gap-4 mb-5 p-4 bg-[#0D0D0D] rounded-xl border border-[#2A2A2A]">
                  <div className="w-12 h-12 rounded-full bg-apollo-orange flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {foundInitial}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-0.5">
                      Encontramos seu cadastro!
                    </p>
                    <p className="font-bold text-white">{foundName}</p>
                    {foundPhone && <p className="text-xs text-white/30">{maskPhone(foundPhone)}</p>}
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

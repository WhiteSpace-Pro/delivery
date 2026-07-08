'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft, Mail, Phone, Lock, User, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  redirectToCheckout?: boolean
}

type Step = 'identify' | 'found' | 'notFound'

type IdentifyFormValues = {
  identifier: string
}

type SignInFormValues = {
  password: string
}

type RegisterFormValues = {
  full_name: string
  email: string
  phone: string
  password: string
  confirm_password: string
}

const identifierSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Informe e-mail ou telefone')
    .refine(value => {
      const trimmed = value.trim()
      const isEmail = /\S+@\S+\.\S+/.test(trimmed)
      const digits = trimmed.replace(/\D/g, '')
      const isPhone = digits.length === 10 || digits.length === 11
      return isEmail || isPhone
    }, 'Use um e-mail ou telefone válido'),
})

const signInSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

const registerSchema = z
  .object({
    full_name: z.string().trim().min(3, 'Informe seu nome completo'),
    email: z.string().trim().email('E-mail inválido').optional(),
    phone: z.string().trim().optional(),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirm_password: z.string().min(6, 'Confirmação obrigatória'),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        path: ['email'],
        code: 'custom',
        message: 'Informe e-mail ou telefone',
      })
    }
    if (data.password !== data.confirm_password) {
      ctx.addIssue({
        path: ['confirm_password'],
        code: 'custom',
        message: 'As senhas devem ser iguais',
      })
    }
  })

export function LoginModal({ isOpen, onClose, onSuccess, redirectToCheckout }: LoginModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('identify')
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [foundName, setFoundName] = useState('')
  const [foundPhone, setFoundPhone] = useState('')
  const [foundInitial, setFoundInitial] = useState('')
  const [loginEmail, setLoginEmail] = useState('')

  const identifyForm = useForm<IdentifyFormValues>({
    resolver: zodResolver(identifierSchema),
    defaultValues: { identifier: '' },
  })

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { password: '' },
  })

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
    },
  })

  const identifierValue = identifyForm.watch('identifier')
  const cleanedIdentifier = identifierValue.trim()
  const isEmail = cleanedIdentifier.includes('@')
  const isPhone = !isEmail && cleanedIdentifier.replace(/\D/g, '').length >= 10
  const signInPassword = signInForm.watch('password')

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

  const resetAll = useCallback(() => {
    setStep('identify')
    setDirection(1)
    setFoundName('')
    setFoundPhone('')
    setFoundInitial('')
    setLoginEmail('')
    setError(null)
    identifyForm.reset()
    signInForm.reset()
    registerForm.reset()
  }, [identifyForm, registerForm, signInForm])

  useEffect(() => {
    if (!isOpen) {
      setTimeout(resetAll, 300)
    }
  }, [isOpen, resetAll])

  const handleIdentify = async (values: IdentifyFormValues) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: values.identifier.trim() }),
      })

      if (!res.ok) {
        throw new Error('Erro ao verificar. Tente novamente.')
      }

      const data = await res.json()

      if (data.found) {
        setFoundName(data.name)
        setFoundPhone(data.phone || '')
        setFoundInitial(data.avatar_initial)
        setLoginEmail(data.loginEmail)

        if (isPhone) {
          registerForm.reset({ ...registerForm.getValues(), phone: maskPhone(values.identifier) })
        }

        if (isEmail) {
          registerForm.reset({ ...registerForm.getValues(), email: values.identifier })
        }

        goTo('found', 1)
      } else {
        if (isEmail) {
          registerForm.reset({ ...registerForm.getValues(), email: values.identifier })
        }
        if (isPhone) {
          registerForm.reset({ ...registerForm.getValues(), phone: maskPhone(values.identifier) })
        }
        goTo('notFound', 1)
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (values: SignInFormValues) => {
    setLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: values.password,
      })
      if (signInError) throw signInError
      handleSuccess()
    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Senha incorreta. Tente novamente.'
          : err.message,
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values: RegisterFormValues) => {
    setLoading(true)
    setError(null)

    try {
      const emailToUse = values.email || `${values.phone.replace(/\D/g, '')}@apollo.pizzaria.com`
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailToUse,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
            phone: values.phone,
            role: 'customer',
            tenant_id: process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6',
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        const profileRes = await fetch('/api/auth/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            full_name: values.full_name,
            phone: values.phone,
            tenant_id: process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6',
          }),
        })

        const profileData = await profileRes.json()

        if (!profileRes.ok || !profileData.success) {
          throw new Error(profileData?.error || 'Erro ao criar perfil')
        }

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
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  }

  const inputCls = 'pl-12 placeholder:text-white/20'

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
                <p className="text-sm text-white/50 mb-5">Qual seu e-mail ou telefone?</p>
                <form onSubmit={identifyForm.handleSubmit(handleIdentify)} className="space-y-4">
                  <div className="relative">
                    {isPhone ? (
                      <Phone
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        size={18}
                      />
                    ) : (
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        size={18}
                      />
                    )}
                    <Controller
                      control={identifyForm.control}
                      name="identifier"
                      render={({ field }) => (
                        <Input
                          autoFocus
                          value={field.value}
                          onChange={e => {
                            const nextValue = e.target.value
                            const shouldMask = !nextValue.includes('@')
                            field.onChange(shouldMask ? maskPhone(nextValue) : nextValue)
                          }}
                          placeholder="nome@email.com ou (11) 99999-9999"
                          className={inputCls}
                        />
                      )}
                    />
                  </div>

                  {identifyForm.formState.errors.identifier?.message && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {identifyForm.formState.errors.identifier.message}
                    </p>
                  )}

                  {error && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || !cleanedIdentifier}>
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span>Continuar</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
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

                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                      size={18}
                    />
                    <Input
                      autoFocus
                      type="password"
                      {...signInForm.register('password')}
                      placeholder="Sua senha"
                      className={inputCls}
                    />
                  </div>

                  {signInForm.formState.errors.password?.message && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}

                  {error && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !signInPassword}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span>Continuar como {foundName.split(' ')[0]}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </Button>

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
                <p className="text-sm text-white/50 mb-5">Vamos criar seu cadastro.</p>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3">
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                      size={18}
                    />
                    <Input
                      autoFocus
                      {...registerForm.register('full_name')}
                      placeholder="Nome completo"
                      className={inputCls}
                    />
                  </div>

                  {registerForm.formState.errors.full_name?.message && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {registerForm.formState.errors.full_name.message}
                    </p>
                  )}

                  {isPhone ? (
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        size={18}
                      />
                      <Input
                        type="email"
                        {...registerForm.register('email')}
                        placeholder="Seu e-mail"
                        className={inputCls}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Phone
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                        size={18}
                      />
                      <Controller
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Telefone (opcional)"
                            className={inputCls}
                            onChange={e => field.onChange(maskPhone(e.target.value))}
                          />
                        )}
                      />
                    </div>
                  )}

                  {registerForm.formState.errors.email?.message && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                  {registerForm.formState.errors.phone?.message && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {registerForm.formState.errors.phone.message}
                    </p>
                  )}

                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                      size={18}
                    />
                    <Input
                      type="password"
                      {...registerForm.register('password')}
                      placeholder="Senha (mín. 6 caracteres)"
                      className={inputCls}
                    />
                  </div>
                  {registerForm.formState.errors.password?.message && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}

                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"
                      size={18}
                    />
                    <Input
                      type="password"
                      {...registerForm.register('confirm_password')}
                      placeholder="Confirmar senha"
                      className={inputCls}
                    />
                  </div>
                  {registerForm.formState.errors.confirm_password?.message && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {registerForm.formState.errors.confirm_password.message}
                    </p>
                  )}

                  {error && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      {error}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <>
                        <span>Criar conta e continuar</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </Button>

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

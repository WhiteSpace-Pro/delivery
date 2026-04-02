/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { placeOrder, saveAddress } from './actions/checkout-actions'
import { LoginModal } from '@/components/client/LoginModal'
import { MapPin, Truck, ShoppingBag, ChevronDown, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

interface DeliveryRegion {
  id: string
  name: string
  fee: number
  estimated_time: number
}

interface SavedAddress {
  id: string
  street: string
  number: string
  neighborhood: string
  complement: string | null
  delivery_fee: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  const { user, profile } = useUser()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [regions, setRegions] = useState<DeliveryRegion[]>([])
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new')
  const [addressForm, setAddressForm] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    regionId: '',
    fee: 0,
    instructions: '',
    shouldSave: false
  })
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'credit_card' | 'debit_card'>('pix')
  const [changeFor, setChangeFor] = useState('')

  const [showSignup, setShowSignup] = useState(false)
  const [signupForm, setSignupForm] = useState({ email: '', password: '' })

  const subtotal = items.reduce((acc, item) => acc + item.total_price, 0)

  useEffect(() => {
    if (profile) {
      setCustomerName(profile.full_name || '')
      setCustomerPhone(profile.phone || '')
    }
  }, [profile])

  useEffect(() => {
    async function fetchData() {
      const { data: regionsData } = await supabase
        .from('delivery_regions')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('is_active', true)
        .order('fee', { ascending: true })

      if (regionsData) setRegions(regionsData as any)

      if (user) {
        const { data: addrData } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('tenant_id', TENANT_ID)

        if (addrData && addrData.length > 0) {
          setSavedAddresses(addrData as any)
          setSelectedAddressId(addrData[0].id)
        }
      }
    }
    fetchData()
  }, [user, supabase])

  const selectedRegion = regions.find(r => r.id === addressForm.regionId)
  const deliveryFee = deliveryType === 'pickup' ? 0 :
    (selectedAddressId === 'new' ? addressForm.fee :
      (savedAddresses.find(a => a.id === selectedAddressId)?.delivery_fee || 0))

  const finalTotal = subtotal + deliveryFee

  const handleRegionChange = (regionId: string) => {
    const region = regions.find(r => r.id === regionId)
    setAddressForm(prev => ({
      ...prev,
      regionId,
      neighborhood: region?.name || '',
      fee: region?.fee || 0
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    setLoading(true)

    try {
      let currentUserId = user?.id || null

      if (!user && showSignup && signupForm.email && signupForm.password) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: signupForm.email,
          password: signupForm.password,
          options: { data: { full_name: customerName, phone: customerPhone } }
        })
        if (signUpError) throw signUpError
        if (authData.user) {
          currentUserId = authData.user.id
        }
      }

      let addressId = selectedAddressId === 'new' ? null : selectedAddressId
      let finalInstructions = addressForm.instructions

      if (deliveryType === 'delivery' && selectedAddressId === 'new') {
        const fullAddressText = `${addressForm.street}, ${addressForm.number}${addressForm.complement ? ` - ${addressForm.complement}` : ''} (${addressForm.neighborhood})`

        if (currentUserId && (addressForm.shouldSave || showSignup)) {
          const savedAddr = await saveAddress({
            user_id: currentUserId,
            street: addressForm.street,
            number: addressForm.number,
            complement: addressForm.complement,
            neighborhood: addressForm.neighborhood,
            delivery_region_id: addressForm.regionId,
            delivery_fee: addressForm.fee
          })
          addressId = savedAddr.id
        } else {
          finalInstructions = `ENDEREÇO: ${fullAddressText}${addressForm.instructions ? ` | OBS: ${addressForm.instructions}` : ''}`
        }
      }

      const orderId = await placeOrder({
        customer_id: currentUserId,
        delivery_type: deliveryType,
        delivery_address_id: addressId,
        delivery_fee: deliveryFee,
        subtotal: subtotal,
        total_amount: finalTotal,
        payment_method: paymentMethod,
        change_for: paymentMethod === 'cash' ? Number(changeFor) : null,
        delivery_instructions: finalInstructions,
        items: items
      })

      clearCart()
      router.push(`/order/${orderId}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-4">
        <ShoppingBag size={64} className="text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Seu carrinho está vazio</h2>
        <button onClick={() => router.push('/cardapio')} className="text-apollo-orange font-bold underline">
          Voltar ao cardápio
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-dm pb-32">
      <div className="max-w-xl mx-auto p-4 md:p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-playfair font-bold text-apollo-orange italic mb-2">Checkout</h1>
          <p className="text-white/60">Quase lá! Complete os dados para finalizar seu pedido.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold text-sm">1</div>
              <h2 className="text-lg font-bold">Dados Pessoais</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Nome Completo</label>
                <input
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Telefone</label>
                <input
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-colors"
                  placeholder="(99) 99999-9999"
                />
              </div>
            </div>
          </section>

          <section className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold text-sm">2</div>
              <h2 className="text-lg font-bold">Entrega ou Retirada</h2>
            </div>

            <div className="flex bg-[#0D0D0D] rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all",
                  deliveryType === 'delivery' ? "bg-apollo-orange text-white" : "text-white/40 hover:text-white"
                )}
              >
                <Truck size={18} />
                Entrega
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all",
                  deliveryType === 'pickup' ? "bg-apollo-orange text-white" : "text-white/40 hover:text-white"
                )}
              >
                <ShoppingBag size={18} />
                Retirada
              </button>
            </div>

            {deliveryType === 'delivery' ? (
              <div className="space-y-6">
                {user && savedAddresses.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Endereços Salvos</label>
                    <div className="grid gap-2">
                      {savedAddresses.map(addr => (
                        <label key={addr.id} className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                          selectedAddressId === addr.id ? "bg-apollo-orange/10 border-apollo-orange" : "bg-[#0D0D0D] border-[#2A2A2A]"
                        )}>
                          <div className="flex gap-3 items-start">
                            <MapPin size={18} className={cn(selectedAddressId === addr.id ? "text-apollo-orange" : "text-white/20")} />
                            <div>
                              <p className="text-sm font-bold">{addr.street}, {addr.number}</p>
                              <p className="text-xs text-white/40">{addr.neighborhood}</p>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="saved_address"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="accent-apollo-orange"
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedAddressId('new')}
                        className={cn(
                          "text-center py-3 text-xs font-bold border border-dashed rounded-xl transition-colors",
                          selectedAddressId === 'new' ? "border-apollo-orange text-apollo-orange" : "border-[#2A2A2A] text-white/40"
                        )}
                      >
                        + Usar novo endereço
                      </button>
                    </div>
                  </div>
                )}

                {(selectedAddressId === 'new' || savedAddresses.length === 0) && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Rua</label>
                        <input
                          required
                          value={addressForm.street}
                          onChange={e => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange"
                          placeholder="Nome da rua"
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nº</label>
                        <input
                          required
                          value={addressForm.number}
                          onChange={e => setAddressForm(prev => ({ ...prev, number: e.target.value }))}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange"
                          placeholder="123"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Bairro</label>
                      <div className="relative">
                        <select
                          required
                          value={addressForm.regionId}
                          onChange={e => handleRegionChange(e.target.value)}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:border-apollo-orange"
                        >
                          <option value="">Selecione seu bairro</option>
                          {regions.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                      </div>
                    </div>

                    {selectedRegion && (
                      <div className="bg-apollo-orange/10 border border-apollo-orange/20 rounded-xl p-3">
                        <p className="text-xs font-bold text-apollo-orange">
                          Taxa: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedRegion.fee)}
                          {' · '}
                          Tempo: ~{selectedRegion.estimated_time} min
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Complemento</label>
                      <input
                        value={addressForm.complement}
                        onChange={e => setAddressForm(prev => ({ ...prev, complement: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange"
                        placeholder="Apto, bloco, etc"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Instruções</label>
                      <textarea
                        value={addressForm.instructions}
                        onChange={e => setAddressForm(prev => ({ ...prev, instructions: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange min-h-[80px]"
                        placeholder="Ex: interfone estragado, deixar na portaria..."
                      />
                    </div>

                    {user && (
                      <label className="flex items-center gap-3 cursor-pointer group pt-2">
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-all",
                          addressForm.shouldSave ? "bg-apollo-orange border-apollo-orange" : "border-white/20 group-hover:border-white/40"
                        )}>
                          {addressForm.shouldSave && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold text-white/60">Salvar este endereço</span>
                        <input
                          type="checkbox"
                          hidden
                          checked={addressForm.shouldSave}
                          onChange={e => setAddressForm(prev => ({ ...prev, shouldSave: e.target.checked }))}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0D0D0D] border border-dashed border-apollo-orange/40 rounded-xl p-5 text-center">
                <MapPin size={24} className="text-apollo-orange mx-auto mb-3" />
                <p className="text-sm font-bold mb-1">Av. Jequitinhonha 218, Vera Cruz</p>
                <p className="text-xs text-white/40">Pronto em aproximadamente 15 min.</p>
              </div>
            )}
          </section>

          <section className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold text-sm">3</div>
              <h2 className="text-lg font-bold">Pagamento</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { id: 'pix', label: 'PIX', icon: '⚡' },
                { id: 'cash', label: 'Dinheiro', icon: '💵' },
                { id: 'credit_card', label: 'Crédito', icon: '💳' },
                { id: 'debit_card', label: 'Débito', icon: '🏦' }
              ].map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                    paymentMethod === method.id ? "bg-apollo-orange border-apollo-orange" : "bg-[#0D0D0D] border-[#2A2A2A] text-white/40"
                  )}
                >
                  <span className="text-xl">{method.icon}</span>
                  <span className="text-xs font-bold">{method.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-1 animate-in zoom-in-95 duration-200">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Troco para</label>
                <input
                  type="number"
                  value={changeFor}
                  onChange={e => setChangeFor(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange"
                  placeholder="Ex: 100"
                />
              </div>
            )}
          </section>

          {!user && (customerName && customerPhone) && (
             <section className="bg-[#1C1C1C] rounded-2xl p-5 border border-dashed border-apollo-orange/40 overflow-hidden">
               <button
                type="button"
                onClick={() => setShowSignup(!showSignup)}
                className="w-full flex items-center justify-between text-left"
               >
                 <div className="flex items-center gap-3">
                  <span className="text-xl">💾</span>
                  <div>
                    <h3 className="text-sm font-bold">Salvar dados para próximos pedidos?</h3>
                    <p className="text-[10px] text-white/40">Crie uma conta para salvar endereços e ver histórico.</p>
                  </div>
                 </div>
                 <ChevronDown size={18} className={cn("text-white/20 transition-transform", showSignup && "rotate-180")} />
               </button>

               {showSignup && (
                  <div className="pt-6 space-y-4 border-t border-[#2A2A2A] mt-4">
                     <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">E-mail</label>
                      <input
                        type="email"
                        value={signupForm.email}
                        onChange={e => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange"
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Senha</label>
                      <input
                        type="password"
                        value={signupForm.password}
                        onChange={e => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLoginModalOpen(true)}
                      className="text-[10px] text-apollo-orange font-bold hover:underline"
                    >
                      Já tenho conta → entrar
                    </button>
                  </div>
               )}
             </section>
          )}

          <div className="pt-4 pb-20">
             <button
              disabled={loading}
              className="w-full bg-apollo-orange hover:bg-apollo-orange/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-apollo-orange/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
              <span>
                {loading ? 'Processando...' : `Finalizar Pedido • ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}`}
              </span>
            </button>
          </div>
        </form>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
}

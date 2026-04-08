/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { placeOrder, saveAddress } from './actions/checkout-actions'
import { LoginModal } from '@/components/client/LoginModal'
import { MapPin, Truck, ShoppingBag, Check, Loader2, ArrowLeft, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateDeliveryFee } from '@/lib/maps/distance'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

// interface DeliveryRegion {
//   id: string
//   name: string
//   fee: number
//   estimated_time: number
// }

interface SavedAddress {
  id: string
  street: string
  number: string
  neighborhood: string
  complement: string | null
  delivery_fee: number
  zipcode?: string
}

const supabase = createClient()

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  const { user, profile } = useUser()

  const [loading, setLoading] = useState(false)
  const [calculatingFee, setCalculatingFee] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  // const [regions, setRegions] = useState<DeliveryRegion[]>([])
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new')

  const [addressForm, setAddressForm] = useState({
    zipcode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    regionId: '',
    fee: 0,
    distance: 0,
    lat: 0,
    lng: 0,
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

  const fetchRegionsAndAddresses = useCallback(async () => {
    /* const { data: regionsData } = await supabase
      .from('delivery_regions')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true)
      .order('fee', { ascending: true })

    if (regionsData) setRegions(regionsData as any) */

    if (user) {
      const { data: addrData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', TENANT_ID)

      if (addrData && addrData.length > 0) {
        setSavedAddresses(addrData as any)
        setSelectedAddressId(addrData[0].id)
      } else {
        setSelectedAddressId('new')
      }
    }
  }, [user])

  useEffect(() => {
    fetchRegionsAndAddresses()
  }, [fetchRegionsAndAddresses])

  const deliveryFee = deliveryType === 'pickup' ? 0 :
    (selectedAddressId === 'new' ? addressForm.fee :
      (savedAddresses.find(a => a.id === selectedAddressId)?.delivery_fee || 0))

  const finalTotal = subtotal + deliveryFee

  const handleZipcodeSearch = async () => {
    if (addressForm.zipcode.length < 8) return
    
    setCalculatingFee(true)
    try {
      // 1. Buscar dados do CEP (ViaCEP ou similar para preencher rua/bairro)
      const cepResponse = await fetch(`https://viacep.com.br/ws/${addressForm.zipcode.replace(/\D/g, '')}/json/`)
      const cepData = await cepResponse.json()
      
      if (cepData.erro) {
        alert('CEP não encontrado')
        return
      }

      // 2. Calcular frete pela distância usando Nominatim
      const fullAddress = `${cepData.logradouro}, ${cepData.bairro}, ${cepData.localidade} - ${cepData.uf}, ${addressForm.zipcode}`
      const result = await calculateDeliveryFee(fullAddress)
      
      setAddressForm(prev => ({
        ...prev,
        street: cepData.logradouro,
        neighborhood: cepData.bairro,
        fee: result.fee,
        distance: result.distance,
        lat: result.coords?.lat || 0,
        lng: result.coords?.lng || 0
      }))
    } catch (error) {
      console.error('Erro ao buscar CEP/Frete:', error)
    } finally {
      setCalculatingFee(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    setLoading(true)

    try {
      let currentUserId = user?.id || null

      // 1. Optional Signup
      if (!user && showSignup && signupForm.email && signupForm.password) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: signupForm.email,
          password: signupForm.password,
          options: {
            data: {
              full_name: customerName,
              phone: customerPhone,
              tenant_id: TENANT_ID,
              role: 'customer'
            }
          }
        })
        if (signUpError) throw signUpError
        if (authData.user) {
          currentUserId = authData.user.id
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            full_name: customerName,
            phone: customerPhone,
            tenant_id: TENANT_ID,
            role: 'customer',
            is_active: true
          }, { onConflict: 'id' })
        }
      }

      let addressId = selectedAddressId === 'new' ? null : selectedAddressId
      let finalInstructions = addressForm.instructions

      // 2. Address Handling
      if (deliveryType === 'delivery') {
        if (selectedAddressId === 'new') {
          if (currentUserId && addressForm.shouldSave) {
            const savedAddr = await saveAddress({
              user_id: currentUserId,
              street: addressForm.street,
              number: addressForm.number,
              complement: addressForm.complement,
              neighborhood: addressForm.neighborhood,
              delivery_fee: addressForm.fee,
              zipcode: addressForm.zipcode,
              lat: addressForm.lat,
              lng: addressForm.lng
            } as any)
            addressId = savedAddr.id
          } else if (!addressId) {
            // Fallback for anonymous or unsaved: store in instructions
            const fullAddressText = `${addressForm.street}, ${addressForm.number}${addressForm.complement ? ` - ${addressForm.complement}` : ''} (${addressForm.neighborhood}) - CEP: ${addressForm.zipcode}`
            finalInstructions = `ENDEREÇO: ${fullAddressText}${addressForm.instructions ? ` | OBS: ${addressForm.instructions}` : ''}`
          }
        }
      }

      // 3. Place Order
      const orderId = await placeOrder({
        customer_id: currentUserId,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
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
        <header className="mb-8 flex items-center justify-between">
          <div>
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest"
            >
                <ArrowLeft size={14} />
                Voltar
            </button>
            <h1 className="text-3xl font-playfair font-bold text-apollo-orange italic mb-1">Checkout</h1>
            <p className="text-white/60 text-sm">Quase lá! Complete os dados para finalizar.</p>
          </div>
          {!user && (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-xs font-bold transition-all"
              >
                  Já tenho conta
              </button>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SEÇÃO 1: CLIENTE */}
          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold text-sm">1</div>
              <h2 className="text-lg font-bold">Identificação</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nome Completo</label>
                <input
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Telefone</label>
                <input
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                  placeholder="(99) 99999-9999"
                />
              </div>
            </div>

            {!user && (
              <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                    showSignup ? "bg-apollo-orange border-apollo-orange" : "border-white/10 group-hover:border-white/30"
                  )}>
                    {showSignup && <Check size={14} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">
                    Criar conta para acompanhar meus pedidos
                  </span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={showSignup}
                    onChange={e => setShowSignup(e.target.checked)}
                  />
                </label>

                {showSignup && (
                  <div className="mt-4 grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">E-mail</label>
                      <input
                        type="email"
                        value={signupForm.email}
                        onChange={e => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Senha</label>
                      <input
                        type="password"
                        value={signupForm.password}
                        onChange={e => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <p className="md:col-span-2 text-[11px] text-white/30 ml-1">
                      Deixe em branco para continuar sem conta — seu pedido será registrado normalmente.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SEÇÃO 2: ENDEREÇO */}
          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold text-sm">2</div>
              <h2 className="text-lg font-bold">Entrega</h2>
            </div>

            <div className="flex bg-[#0D0D0D] rounded-2xl p-1 mb-8 border border-white/5">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 py-3.5 text-sm font-bold rounded-xl transition-all duration-300",
                  deliveryType === 'delivery' ? "bg-apollo-orange text-white shadow-lg shadow-apollo-orange/20" : "text-white/40 hover:text-white"
                )}
              >
                <Truck size={20} />
                Entrega
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 py-3.5 text-sm font-bold rounded-xl transition-all duration-300",
                  deliveryType === 'pickup' ? "bg-apollo-orange text-white shadow-lg shadow-apollo-orange/20" : "text-white/40 hover:text-white"
                )}
              >
                <ShoppingBag size={20} />
                Retirada
              </button>
            </div>

            {deliveryType === 'delivery' ? (
              <div className="space-y-6">
                {user && savedAddresses.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Endereços Salvos</label>
                    <div className="grid gap-3">
                      {savedAddresses.map(addr => (
                        <label key={addr.id} className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group",
                          selectedAddressId === addr.id ? "bg-apollo-orange/10 border-apollo-orange shadow-inner" : "bg-[#0D0D0D] border-[#2A2A2A] hover:border-white/10"
                        )}>
                          <div className="flex gap-4 items-start">
                            <MapPin size={20} className={cn(selectedAddressId === addr.id ? "text-apollo-orange" : "text-white/20 group-hover:text-white/40 transition-colors")} />
                            <div>
                              <p className="text-sm font-bold">{addr.street}, {addr.number}</p>
                              <p className="text-[11px] text-white/40">{addr.neighborhood}{addr.complement ? ` • ${addr.complement}` : ''}</p>
                            </div>
                          </div>
                          <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              selectedAddressId === addr.id ? "border-apollo-orange" : "border-white/10"
                          )}>
                              {selectedAddressId === addr.id && <div className="w-2.5 h-2.5 rounded-full bg-apollo-orange" />}
                          </div>
                          <input
                            type="radio"
                            name="saved_address"
                            className="hidden"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                          />
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedAddressId('new')}
                        className={cn(
                          "text-center py-4 text-xs font-bold border-2 border-dashed rounded-xl transition-all",
                          selectedAddressId === 'new' ? "border-apollo-orange text-apollo-orange bg-apollo-orange/5" : "border-[#2A2A2A] text-white/20 hover:border-white/10 hover:text-white/40"
                        )}
                      >
                        + Adicionar novo endereço
                      </button>
                    </div>
                  </div>
                )}

                {(selectedAddressId === 'new' || savedAddresses.length === 0) && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">CEP</label>
                      <div className="flex gap-2">
                        <input
                          required
                          value={addressForm.zipcode}
                          onChange={e => setAddressForm(prev => ({ ...prev, zipcode: e.target.value }))}
                          className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={handleZipcodeSearch}
                          disabled={calculatingFee || addressForm.zipcode.length < 8}
                          className="bg-apollo-orange hover:bg-apollo-orange/80 disabled:opacity-50 px-4 rounded-xl transition-all flex items-center justify-center"
                        >
                          {calculatingFee ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Rua</label>
                        <input
                          required
                          value={addressForm.street}
                          onChange={e => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                          placeholder="Ex: Av. Amazonas"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nº</label>
                        <input
                          required
                          value={addressForm.number}
                          onChange={e => setAddressForm(prev => ({ ...prev, number: e.target.value }))}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all text-center"
                          placeholder="123"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Bairro</label>
                            <input
                                required
                                value={addressForm.neighborhood}
                                onChange={e => setAddressForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                                placeholder="Seu bairro"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Complemento</label>
                            <input
                                value={addressForm.complement}
                                onChange={e => setAddressForm(prev => ({ ...prev, complement: e.target.value }))}
                                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                                placeholder="Apto, bloco..."
                            />
                        </div>
                    </div>

                    {addressForm.fee > 0 && (
                      <div className="bg-apollo-orange/10 border border-apollo-orange/20 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Truck size={16} className="text-apollo-orange" />
                            <span className="text-xs font-bold text-white/80">Distância: {addressForm.distance.toFixed(1)} km</span>
                        </div>
                        <span className="text-sm font-bold text-apollo-orange">Taxa: R$ {addressForm.fee.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Instruções Adicionais (Opcional)</label>
                      <textarea
                        value={addressForm.instructions}
                        onChange={e => setAddressForm(prev => ({ ...prev, instructions: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange min-h-[100px] resize-none transition-all"
                        placeholder="Ex: Tocar o interfone da esquerda, deixar com o porteiro..."
                      />
                    </div>

                    {user && (
                      <label className="flex items-center gap-3 cursor-pointer group pt-4">
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                          addressForm.shouldSave ? "bg-apollo-orange border-apollo-orange" : "border-white/10 group-hover:border-white/30"
                        )}>
                          {addressForm.shouldSave && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">Salvar este endereço para pedidos futuros</span>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={addressForm.shouldSave}
                          onChange={e => setAddressForm(prev => ({ ...prev, shouldSave: e.target.checked }))}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0D0D0D] border border-dashed border-apollo-orange/30 rounded-2xl p-8 text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-apollo-orange/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-apollo-orange/20">
                    <MapPin size={32} className="text-apollo-orange" />
                </div>
                <h3 className="font-bold text-lg mb-1">Retirada na Loja</h3>
                <p className="text-sm text-white/80 mb-1">Av. Jequitinhonha 218, Vera Cruz</p>
                <p className="text-xs text-apollo-orange font-bold">Pronto em aproximadamente 15-20 min.</p>
              </div>
            )}
          </section>

          {/* SEÇÃO 3: PAGAMENTO */}
          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold text-sm">3</div>
              <h2 className="text-lg font-bold">Forma de Pagamento</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
                    "flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-300",
                    paymentMethod === method.id ? "bg-apollo-orange border-apollo-orange shadow-lg shadow-apollo-orange/20" : "bg-[#0D0D0D] border-[#2A2A2A] text-white/40 hover:text-white hover:border-white/10"
                  )}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-widest">{method.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Troco para quanto?</label>
                <input
                  type="number"
                  value={changeFor}
                  onChange={e => setChangeFor(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                  placeholder="Ex: 50"
                />
              </div>
            )}
          </section>

          {/* RESUMO E BOTÃO FINAL */}
          <div className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] shadow-2xl sticky bottom-4">
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Subtotal</span>
                <span className="font-bold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Taxa de Entrega</span>
                  <span className="text-apollo-orange font-bold">+ R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="h-px bg-white/5 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-playfair font-bold text-apollo-orange italic">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (deliveryType === 'delivery' && !deliveryFee && selectedAddressId === 'new')}
              className="w-full bg-apollo-orange hover:bg-apollo-orange/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-xl shadow-apollo-orange/20 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Finalizar Pedido
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  )
}

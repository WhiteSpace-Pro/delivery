/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { placeOrder } from './actions/checkout-actions'
import { LoginModal } from '@/components/client/LoginModal'
import { MapPin, Truck, ShoppingBag, Check, Loader2, ArrowLeft, Search, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const supabase = createClient()

const STORE_LAT = -19.9558
const STORE_LNG = -43.9275

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcFee(distKm: number): number {
  return Math.max(2, Math.ceil(distKm))
}

function calcTime(distKm: number): number {
  return Math.max(20, Math.round(distKm * 3))
}

interface SavedAddress {
  id: string
  label: string | null
  street: string
  number: string
  neighborhood: string
  complement: string | null
  delivery_fee: number | null
  zipcode: string | null
  delivery_region_id: string | null
}

interface DeliveryRegion {
  id: string
  name: string
  fee: number
  estimated_time: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  const { user, profile, isLoading: userLoading } = useUser()

  const [loading, setLoading] = useState(false)
  const [calculatingFee, setCalculatingFee] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [regions, setRegions] = useState<DeliveryRegion[]>([])

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new')
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)

  const [addressForm, setAddressForm] = useState({
    label: '',
    zipcode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    regionId: '',
    fee: 0,
    estimatedTime: 0,
    lat: 0,
    lng: 0,
    instructions: '',
    shouldSave: false,
    regionNotFound: false,
  })

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'credit_card' | 'debit_card'>('pix')
  const [changeFor, setChangeFor] = useState('')

  const subtotal = items.reduce((acc, item) => acc + item.total_price, 0)

  // Redirect if not authenticated after loading
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  // Prefill name/phone from profile
  useEffect(() => {
    if (profile) {
      setCustomerName(profile.full_name || '')
      setCustomerPhone((profile as any).phone || '')
    }
  }, [profile])

  const fetchData = useCallback(async () => {
    if (!user) return

    // Fetch saved addresses
    const res = await fetch('/api/addresses')
    if (res.ok) {
      const data = await res.json()
      setSavedAddresses(data)
      if (data.length > 0) {
        setSelectedAddressId(data[0].id)
        setShowNewAddressForm(false)
      } else {
        setSelectedAddressId('new')
        setShowNewAddressForm(true)
      }
    }

    // Fetch delivery regions
    const { data: regionsData } = await supabase
      .from('delivery_regions')
      .select('id, name, fee, estimated_time')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true)
      .order('fee', { ascending: true })

    if (regionsData) setRegions(regionsData as DeliveryRegion[])
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Lookup region by neighborhood name
  const lookupRegion = useCallback((neighborhood: string) => {
    if (!neighborhood) return
    const normalized = neighborhood.toLowerCase().trim()
    const match = regions.find(r =>
      r.name.toLowerCase().includes(normalized) || normalized.includes(r.name.toLowerCase())
    )
    if (match) {
      setAddressForm(prev => ({
        ...prev,
        regionId: match.id,
        fee: match.fee,
        estimatedTime: match.estimated_time,
        regionNotFound: false,
      }))
    } else {
      setAddressForm(prev => ({
        ...prev,
        regionId: '',
        fee: 0,
        estimatedTime: 0,
        regionNotFound: neighborhood.length > 2,
      }))
    }
  }, [regions])

  const handleZipcodeSearch = async () => {
    const cep = addressForm.zipcode.replace(/\D/g, '')
    if (cep.length < 8) return
    setCalculatingFee(true)
    try {
      // 1. ViaCEP — fill address fields
      const viacepRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const viacep = await viacepRes.json()
      if (viacep.erro) {
        setAddressForm(prev => ({ ...prev, regionNotFound: true, fee: 0, estimatedTime: 0 }))
        return
      }

      const street = viacep.logradouro || ''
      const neighborhood = viacep.bairro || ''
      const city = viacep.localidade || 'Belo Horizonte'
      const uf = viacep.uf || 'MG'

      setAddressForm(prev => ({ ...prev, street, neighborhood }))

      // 2. Geocode the customer address
      const addressQuery = `${street || neighborhood}, ${city}, ${uf}, Brasil`
      const geocodeRes = await fetch(`/api/geocode?address=${encodeURIComponent(addressQuery)}`)
      const geocode = await geocodeRes.json()

      if (geocode.lat != null && geocode.lng != null) {
        // 3. Haversine distance
        const distKm = haversineKm(STORE_LAT, STORE_LNG, geocode.lat, geocode.lng)
        const fee = calcFee(distKm)
        const estimatedTime = calcTime(distKm)

        // 4. Coverage check: compare against max fee in delivery_regions
        const maxRegionFee = regions.length > 0
          ? Math.max(...regions.map(r => r.fee))
          : 15

        if (fee > maxRegionFee) {
          setAddressForm(prev => ({
            ...prev,
            street,
            neighborhood,
            regionId: '',
            fee: 0,
            estimatedTime: 0,
            lat: geocode.lat,
            lng: geocode.lng,
            regionNotFound: true,
          }))
          return
        }

        // Find nearest region for ID reference (optional)
        const matchedRegion = regions.find(r =>
          r.name.toLowerCase().includes(neighborhood.toLowerCase()) ||
          neighborhood.toLowerCase().includes(r.name.toLowerCase())
        )

        setAddressForm(prev => ({
          ...prev,
          street,
          neighborhood,
          regionId: matchedRegion?.id || '',
          fee,
          estimatedTime,
          lat: geocode.lat,
          lng: geocode.lng,
          regionNotFound: false,
        }))
      } else {
        // 5. Geocoding failed — fallback to neighborhood lookup in delivery_regions
        setAddressForm(prev => ({ ...prev, street, neighborhood }))
        lookupRegion(neighborhood)
      }
    } catch {
      console.error('Erro ao buscar CEP')
    } finally {
      setCalculatingFee(false)
    }
  }

  const deliveryFee = deliveryType === 'pickup'
    ? 0
    : selectedAddressId === 'new' || showNewAddressForm
      ? addressForm.fee
      : (savedAddresses.find(a => a.id === selectedAddressId)?.delivery_fee ?? 0)

  const finalTotal = subtotal + deliveryFee

  const getActiveAddress = (): SavedAddress | null => {
    if (selectedAddressId === 'new' || showNewAddressForm) return null
    return savedAddresses.find(a => a.id === selectedAddressId) ?? null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0 || !user) return
    setLoading(true)

    try {
      const activeAddress = getActiveAddress()
      const isNewAddress = selectedAddressId === 'new' || showNewAddressForm

      const orderId = await placeOrder({
        customer_id: user.id,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_type: deliveryType,
        delivery_address_id: activeAddress?.id ?? null,
        delivery_fee: deliveryFee,
        subtotal,
        total_amount: finalTotal,
        payment_method: paymentMethod,
        change_for: paymentMethod === 'cash' ? Number(changeFor) : null,
        delivery_instructions: isNewAddress ? addressForm.instructions : null,
        items,
        newAddress: (isNewAddress && deliveryType === 'delivery' && addressForm.shouldSave) ? {
          label: addressForm.label || 'Casa',
          street: addressForm.street,
          number: addressForm.number,
          complement: addressForm.complement,
          neighborhood: addressForm.neighborhood,
          zipcode: addressForm.zipcode,
          delivery_region_id: addressForm.regionId || null,
          delivery_fee: addressForm.fee,
          lat: addressForm.lat || undefined,
          lng: addressForm.lng || undefined,
        } : null,
      })

      clearCart()
      router.push(`/order/${orderId}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Loader2 size={40} className="text-apollo-orange animate-spin" />
      </div>
    )
  }

  if (!user) return null

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

  const showingNewForm = selectedAddressId === 'new' || showNewAddressForm || savedAddresses.length === 0

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-dm pb-32">
      <div className="max-w-xl mx-auto p-4 md:p-6">
        <header className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h1 className="text-3xl font-playfair font-bold text-apollo-orange italic mb-1">Checkout</h1>
          <p className="text-white/60 text-sm">Quase lá! Complete os dados para finalizar.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SEÇÃO 1: IDENTIFICAÇÃO */}
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
          </section>

          {/* SEÇÃO 2: ENTREGA */}
          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold text-sm">2</div>
              <h2 className="text-lg font-bold">Entrega</h2>
            </div>

            <div className="flex bg-[#0D0D0D] rounded-2xl p-1 mb-8 border border-white/5">
              {(['delivery', 'pickup'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDeliveryType(type)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-3 py-3.5 text-sm font-bold rounded-xl transition-all duration-300',
                    deliveryType === type ? 'bg-apollo-orange text-white shadow-lg shadow-apollo-orange/20' : 'text-white/40 hover:text-white'
                  )}
                >
                  {type === 'delivery' ? <><Truck size={20} /> Entrega</> : <><ShoppingBag size={20} /> Retirada</>}
                </button>
              ))}
            </div>

            {deliveryType === 'delivery' ? (
              <div className="space-y-4">
                {/* Saved address cards */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Endereços Salvos</p>
                    {savedAddresses.map(addr => (
                      <label
                        key={addr.id}
                        onClick={() => { setSelectedAddressId(addr.id); setShowNewAddressForm(false) }}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                          selectedAddressId === addr.id && !showNewAddressForm
                            ? 'bg-apollo-orange/10 border-apollo-orange'
                            : 'bg-[#0D0D0D] border-[#2A2A2A] hover:border-white/10'
                        )}
                      >
                        <div className="flex gap-3 items-start">
                          <MapPin size={18} className={cn(selectedAddressId === addr.id && !showNewAddressForm ? 'text-apollo-orange' : 'text-white/20')} />
                          <div>
                            {addr.label && <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-0.5">{addr.label}</p>}
                            <p className="text-sm font-bold">{addr.street}, {addr.number}</p>
                            <p className="text-xs text-white/40">{addr.neighborhood}{addr.complement ? ` • ${addr.complement}` : ''}</p>
                          </div>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                          selectedAddressId === addr.id && !showNewAddressForm ? 'border-apollo-orange' : 'border-white/10'
                        )}>
                          {selectedAddressId === addr.id && !showNewAddressForm && <div className="w-2.5 h-2.5 rounded-full bg-apollo-orange" />}
                        </div>
                      </label>
                    ))}

                    <button
                      type="button"
                      onClick={() => { setSelectedAddressId('new'); setShowNewAddressForm(true) }}
                      className={cn(
                        'w-full text-center py-3.5 text-xs font-bold border-2 border-dashed rounded-xl transition-all',
                        showNewAddressForm
                          ? 'border-apollo-orange text-apollo-orange bg-apollo-orange/5'
                          : 'border-[#2A2A2A] text-white/20 hover:border-white/10 hover:text-white/40'
                      )}
                    >
                      + Usar novo endereço
                    </button>
                  </div>
                )}

                {/* New address form */}
                {showingNewForm && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Label (ex: Casa, Trabalho)</label>
                      <input
                        value={addressForm.label}
                        onChange={e => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                        placeholder="Casa"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">CEP</label>
                      <div className="flex gap-2">
                        <input
                          required={showingNewForm && deliveryType === 'delivery'}
                          value={addressForm.zipcode}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                            setAddressForm(prev => ({ ...prev, zipcode: v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v }))
                          }}
                          className="flex-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={handleZipcodeSearch}
                          disabled={calculatingFee || addressForm.zipcode.replace(/\D/g, '').length < 8}
                          className="bg-apollo-orange hover:bg-apollo-orange/80 disabled:opacity-40 px-4 rounded-xl transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"
                        >
                          {calculatingFee
                            ? <><Loader2 size={16} className="animate-spin" /><span className="hidden sm:inline">Calculando...</span></>
                            : <Search size={20} />
                          }
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-3 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Rua</label>
                        <input
                          required={showingNewForm && deliveryType === 'delivery'}
                          value={addressForm.street}
                          onChange={e => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange transition-all"
                          placeholder="Av. Amazonas"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Nº</label>
                        <input
                          required={showingNewForm && deliveryType === 'delivery'}
                          value={addressForm.number}
                          onChange={e => setAddressForm(prev => ({ ...prev, number: e.target.value }))}
                          className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm text-center focus:outline-none focus:border-apollo-orange transition-all"
                          placeholder="123"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Bairro</label>
                        <input
                          required={showingNewForm && deliveryType === 'delivery'}
                          value={addressForm.neighborhood}
                          onChange={e => {
                            setAddressForm(prev => ({ ...prev, neighborhood: e.target.value }))
                            lookupRegion(e.target.value)
                          }}
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

                    {/* Delivery fee feedback */}
                    {calculatingFee && (
                      <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-2">
                        <Loader2 size={16} className="text-apollo-orange animate-spin" />
                        <span className="text-xs text-white/50">Calculando taxa de entrega...</span>
                      </div>
                    )}
                    {!calculatingFee && addressForm.fee > 0 && (
                      <div className="bg-apollo-orange/10 border border-apollo-orange/20 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-apollo-orange" />
                          <span className="text-xs text-white/70">~{addressForm.estimatedTime} min</span>
                        </div>
                        <span className="text-sm font-bold text-apollo-orange">Taxa: R$ {addressForm.fee.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    {!calculatingFee && addressForm.regionNotFound && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-400">Fora da área de entrega.</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold ml-1">Instruções (Opcional)</label>
                      <textarea
                        value={addressForm.instructions}
                        onChange={e => setAddressForm(prev => ({ ...prev, instructions: e.target.value }))}
                        className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-apollo-orange min-h-[80px] resize-none transition-all"
                        placeholder="Ex: Porteiro, interfone..."
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group pt-2">
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                        addressForm.shouldSave ? 'bg-apollo-orange border-apollo-orange' : 'border-white/10 group-hover:border-white/30'
                      )}>
                        {addressForm.shouldSave && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-xs font-bold text-white/50 group-hover:text-white transition-colors">Salvar este endereço para próximas compras</span>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={addressForm.shouldSave}
                        onChange={e => setAddressForm(prev => ({ ...prev, shouldSave: e.target.checked }))}
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0D0D0D] border border-dashed border-apollo-orange/30 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-apollo-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {([
                { id: 'pix', label: 'PIX', icon: '⚡' },
                { id: 'cash', label: 'Dinheiro', icon: '💵' },
                { id: 'credit_card', label: 'Crédito', icon: '💳' },
                { id: 'debit_card', label: 'Débito', icon: '🏦' },
              ] as const).map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-300',
                    paymentMethod === method.id ? 'bg-apollo-orange border-apollo-orange shadow-lg' : 'bg-[#0D0D0D] border-[#2A2A2A] text-white/40 hover:text-white hover:border-white/10'
                  )}
                >
                  <span className="text-2xl">{method.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-widest">{method.label}</span>
                </button>
              ))}
            </div>
            {paymentMethod === 'cash' && (
              <div className="space-y-1.5">
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

          {/* RESUMO */}
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
              disabled={
                loading ||
                (deliveryType === 'delivery' && showingNewForm && addressForm.regionNotFound) ||
                (deliveryType === 'delivery' && showingNewForm && !addressForm.street)
              }
              className="w-full bg-apollo-orange hover:bg-apollo-orange/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-xl shadow-apollo-orange/20 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> Processando...</>
              ) : (
                <><Check size={20} /> Finalizar Pedido</>
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2, Camera } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { placeOrder } from './actions/checkout-actions'
import { calculateDeliveryFee } from '@/lib/maps/distance'
import Image from 'next/image'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

interface Address {
  id: string
  label: string
  street: string
  number: string
  complement: string
  neighborhood: string
  zipcode: string
  delivery_fee: number
  lat: number
  lng: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  const { user, profile, isLoading: userLoading } = useUser()
  const supabase = createClient()

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [calculatingFee, setCalculatingFee] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isStoreOpen, setIsStoreOpen] = useState(true)

  // PIX State
  const [showPixScreen, setShowPixScreen] = useState(false)
  const [pixReceipt, setPixReceipt] = useState<File | null>(null)
  const [pixReceiptPreview, setPixReceiptPreview] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const [addressForm, setAddressForm] = useState({
    label: '',
    zipcode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    regionId: '',
    fee: 0,
    lat: 0,
    lng: 0,
    instructions: '',
    shouldSave: false,
    regionNotFound: false,
  })

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'credit_card' | 'debit_card'>('pix')
  const [changeFor, setChangeFor] = useState('')

  const subtotal = items.reduce((acc, item) => acc + item.total_price, 0)

  useEffect(() => {
    const saved = localStorage.getItem('apollo-checkout-pix')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.orderId && data.paymentMethod === 'pix') {
          setOrderId(data.orderId)
          setShowPixScreen(true)
        }
      } catch (e) { console.error(e) }
    }
  }, [])

  useEffect(() => {
    if (showPixScreen && orderId) {
      localStorage.setItem('apollo-checkout-pix', JSON.stringify({ orderId, paymentMethod: 'pix' }))
    } else {
      localStorage.removeItem('apollo-checkout-pix')
    }
  }, [showPixScreen, orderId])

  useEffect(() => {
    async function checkStoreStatus() {
      const { data } = await supabase.from('tenants').select('is_active').eq('id', TENANT_ID).single()
      if (data) setIsStoreOpen(!!(data as any)?.is_active)
    }
    void checkStoreStatus()
  }, [supabase])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (profile) {
      setCustomerName(profile.full_name || '')
      setCustomerPhone((profile as any).phone || '')
    }
  }, [profile])

  const fetchData = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/addresses')
    if (res.ok) {
      const data = await res.json()
      setSavedAddresses(data)
      if (data.length > 0) {
        setSelectedAddressId(data[0].id)
      } else {
        setSelectedAddressId('new')
      }
    }
  }, [user])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const searchZipcode = async () => {
    const cep = addressForm.zipcode.replace(/\D/g, '')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setAddressForm(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
        }))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleCEPBlur = async () => {
    if (addressForm.zipcode.replace(/\D/g, '').length === 8) {
      await searchZipcode()
    }
  }

  const handleCalculateFee = async () => {
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood) {
      alert('Preencha rua, número e bairro para calcular o frete.')
      return
    }

    setCalculatingFee(true)
    const fullAddress = `${addressForm.street}, ${addressForm.number}, ${addressForm.neighborhood}, Belo Horizonte, MG`
    const result = await calculateDeliveryFee(fullAddress)

    if (result.coords) {
      setAddressForm(prev => ({
        ...prev,
        fee: result.fee,
        lat: result.coords!.lat,
        lng: result.coords!.lng,
        regionNotFound: result.fee === 0
      }))
    } else {
      setAddressForm(prev => ({ ...prev, regionNotFound: true, fee: 0 }))
    }
    setCalculatingFee(false)
  }

  const getActiveAddress = () => {
    if (selectedAddressId === 'new') return null
    return savedAddresses.find(a => a.id === selectedAddressId)
  }

  const deliveryFee = deliveryType === 'pickup' ? 0 : (selectedAddressId === 'new' ? addressForm.fee : (getActiveAddress()?.delivery_fee || 0))
  const finalTotal = subtotal + deliveryFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStoreOpen) {
      alert("A loja está fechada.");
      return;
    }
    if (items.length === 0 || !user) return

    if (deliveryType === 'delivery' && selectedAddressId === 'new' && addressForm.fee === 0) {
      alert('Calcule o frete antes de finalizar.')
      return
    }

    setLoading(true)

    try {
      const activeAddress = getActiveAddress()
      const isNewAddress = selectedAddressId === 'new'

      const generatedOrderId = await placeOrder({
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
          delivery_region_id: null,
          delivery_fee: addressForm.fee,
          lat: addressForm.lat || undefined,
          lng: addressForm.lng || undefined,
        } : null,
      })

      if (paymentMethod === 'pix') {
        setOrderId(generatedOrderId)
        setShowPixScreen(true)
      } else {
        clearCart()
        router.push(`/order/${generatedOrderId}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPixReceipt(file)
      const reader = new FileReader()
      reader.onloadend = () => setPixReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleConfirmPix = async () => {
    if (!pixReceipt || !orderId) return
    setLoading(true)
    try {
      const fileExt = pixReceipt.name.split('.').pop()
      const fileName = `${TENANT_ID}/comprovantes/${orderId}/${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('delivery-photos').upload(fileName, pixReceipt)

      if (error) throw error

      const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      await supabase.from('orders').update({
        pix_receipt_note: publicUrl,
        status: ('pending' as any),
        payment_status: ('pending' as any)
      } as any).eq('id', orderId)

      clearCart()
      localStorage.removeItem('apollo-checkout-pix')
      router.push(`/order/${orderId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      alert('Erro ao enviar comprovante: ' + msg)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><Loader2 size={40} className="text-apollo-orange animate-spin" /></div>

  if (showPixScreen) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white font-dm p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#1C1C1C] rounded-3xl p-8 border border-white/5 shadow-2xl">
          <h1 className="text-2xl font-playfair font-bold text-apollo-orange mb-6 text-center italic">Pagamento PIX</h1>
          <div className="bg-[#0D0D0D] rounded-2xl p-6 mb-6 text-center space-y-4">
            <p className="text-sm text-white/60">Escaneie o QR Code ou copie a chave</p>
            <div className="w-48 h-48 bg-white mx-auto rounded-xl flex items-center justify-center">
              <span className="text-black text-xs">[QR CODE]</span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl text-xs font-mono break-all border border-white/10">
              00020126330014BR.GOV.BCB.PIX011112345678901
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-bold uppercase text-white/40 mb-2 block">Upload do Comprovante</span>
              <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-apollo-orange transition-colors cursor-pointer">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*,.pdf" />
                {pixReceiptPreview ? (
                  <div className="relative w-full aspect-video">
                     <Image src={pixReceiptPreview} alt="Preview" fill className="object-contain" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/40">
                    <Camera size={32} />
                    <span className="text-xs">Foto ou PDF</span>
                  </div>
                )}
              </div>
            </label>

            <button
              onClick={handleConfirmPix}
              disabled={!pixReceipt || loading}
              className="w-full bg-apollo-orange hover:bg-apollo-orange/90 disabled:opacity-50 h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Confirmar Pagamento</>}
            </button>

            <button
              onClick={() => { setShowPixScreen(false); setOrderId(null); }}
              className="w-full text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest py-2"
            >
              Trocar forma de pagamento
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-dm pb-32">
       <div className="max-w-xl mx-auto p-4 md:p-6">
        <header className="mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest">
            <ArrowLeft size={14} /> Voltar
          </button>
          <h1 className="text-3xl font-playfair font-bold text-apollo-orange italic mb-1">Checkout</h1>
          {!isStoreOpen && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm font-bold mb-4">A LOJA ESTÁ FECHADA NO MOMENTO</div>}
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A]">
             <h2 className="text-lg font-bold mb-6">1. Identificação</h2>
             <div className="grid md:grid-cols-2 gap-4">
               <input required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="Nome" />
               <input required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="Telefone" />
             </div>
          </section>

          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A]">
             <h2 className="text-lg font-bold mb-6">2. Entrega</h2>
             <div className="flex bg-[#0D0D0D] rounded-xl p-1 mb-6">
               <button type="button" onClick={() => setDeliveryType('delivery')} className={cn("flex-1 py-3 rounded-lg text-sm font-bold", deliveryType === 'delivery' ? "bg-apollo-orange text-white" : "text-white/40")}>Entrega</button>
               <button type="button" onClick={() => setDeliveryType('pickup')} className={cn("flex-1 py-3 rounded-lg text-sm font-bold", deliveryType === 'pickup' ? "bg-apollo-orange text-white" : "text-white/40")}>Retirada</button>
             </div>

             {deliveryType === 'delivery' && (
               <div className="space-y-4">
                 {savedAddresses.length > 0 && (
                   <div className="grid grid-cols-1 gap-2">
                     {savedAddresses.map(addr => (
                       <button key={addr.id} type="button" onClick={() => setSelectedAddressId(addr.id)} className={cn("p-4 rounded-xl border text-left transition-all", selectedAddressId === addr.id ? "border-apollo-orange bg-apollo-orange/5" : "border-white/5 bg-[#0D0D0D]")}>
                         <p className="text-sm font-bold">{addr.label}</p>
                         <p className="text-xs text-white/60">{addr.street}, {addr.number}</p>
                       </button>
                     ))}
                     <button type="button" onClick={() => setSelectedAddressId('new')} className={cn("p-4 rounded-xl border border-dashed text-sm font-bold", selectedAddressId === 'new' ? "border-apollo-orange text-apollo-orange" : "border-white/20 text-white/40")}>+ Novo Endereço</button>
                   </div>
                 )}

                 {selectedAddressId === 'new' && (
                   <div className="space-y-4">
                     <input value={addressForm.zipcode} onChange={e => setAddressForm(prev => ({...prev, zipcode: e.target.value}))} onBlur={handleCEPBlur} className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="CEP" />
                     <div className="grid grid-cols-4 gap-2">
                        <input className="col-span-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="Rua" value={addressForm.street} readOnly />
                        <input className="col-span-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm text-center" placeholder="Nº" value={addressForm.number} onChange={e => setAddressForm(prev => ({...prev, number: e.target.value}))} />
                     </div>
                     <input className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="Bairro" value={addressForm.neighborhood} readOnly />
                     <button type="button" onClick={handleCalculateFee} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Calcular Frete</button>

                     {calculatingFee && <div className="text-center text-xs text-apollo-orange animate-pulse">Calculando...</div>}
                     {addressForm.fee > 0 && <div className="bg-apollo-orange/10 p-3 rounded-xl text-center text-apollo-orange font-bold text-sm">Taxa de entrega: R$ {addressForm.fee.toFixed(2).replace('.', ',')}</div>}
                   </div>
                 )}
               </div>
             )}
          </section>

          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A]">
             <h2 className="text-lg font-bold mb-6">3. Pagamento</h2>
             <div className="grid grid-cols-2 gap-2">
               {['pix', 'cash', 'credit_card', 'debit_card'].map(m => (
                 <button key={m} type="button" onClick={() => setPaymentMethod(m as any)} className={cn("p-4 rounded-xl border text-sm font-bold uppercase transition-all", paymentMethod === m ? "bg-apollo-orange border-apollo-orange shadow-lg" : "bg-[#0D0D0D] border-[#2A2A2A] text-white/40")}>
                   {m === 'pix' ? '⚡ PIX' : m === 'cash' ? '💵 Dinheiro' : '💳 Cartão'}
                 </button>
               ))}
             </div>
             {paymentMethod === 'cash' && (
                <div className="mt-4 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-white/40">Troco para quanto?</label>
                  <input type="number" value={changeFor} onChange={e => setChangeFor(e.target.value)} className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm" placeholder="Ex: 50" />
                </div>
             )}
          </section>

          <div className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] sticky bottom-4 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
               <span className="text-lg font-bold">Total</span>
               <span className="text-2xl font-playfair font-bold text-apollo-orange italic">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
             </div>
             <button type="submit" disabled={loading || !isStoreOpen} className="w-full bg-apollo-orange h-14 rounded-xl font-bold shadow-xl shadow-apollo-orange/20 transition-all disabled:opacity-50">
               {loading ? 'Processando...' : 'Finalizar Pedido'}
             </button>
          </div>
        </form>
       </div>
    </div>
  )
}

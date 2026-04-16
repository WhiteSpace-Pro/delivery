'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Loader2, Camera, Copy, MapPin } from 'lucide-react'
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
  const [pixData, setPixData] = useState({ qrCode: '', brCode: '', amount: 0, pixKey: '+5531985375524' })
  const [copiedBrCode, setCopiedBrCode] = useState(false)

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
          if (data.pixData) setPixData(data.pixData)
        }
      } catch (e) { console.error(e) }
    }
  }, [])

  useEffect(() => {
    if (showPixScreen && orderId) {
      localStorage.setItem('apollo-checkout-pix', JSON.stringify({ orderId, paymentMethod: 'pix', pixData }))
    } else {
      localStorage.removeItem('apollo-checkout-pix')
    }
  }, [showPixScreen, orderId, pixData])

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
      setCustomerPhone((profile as any).phone || (profile as any).customer_phone || '')
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
    if (cep.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setAddressForm(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          fee: 0,
          regionNotFound: false
        }))
      } else {
        setAddressForm(prev => ({ ...prev, regionNotFound: true }))
      }
    } catch (e) {
      console.error(e)
      setAddressForm(prev => ({ ...prev, regionNotFound: true }))
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

    if (deliveryType === 'delivery') {
      const activeAddress = getActiveAddress();
      const isNewAddress = selectedAddressId === 'new';

      const checkLat = isNewAddress ? addressForm.lat : activeAddress?.lat;
      const checkLng = isNewAddress ? addressForm.lng : activeAddress?.lng;

      if (checkLat == null || checkLng == null) {
        alert('Endereço inválido — por favor, revise e busque o CEP novamente para garantir que a localização foi encontrada.');
        return;
      }
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
        const qrUrl = `/api/pix/qrcode?valor=${finalTotal.toFixed(2)}&txid=APOLLO${generatedOrderId.slice(-6).toUpperCase()}&saida=qr`
        const brUrl = `/api/pix/qrcode?valor=${finalTotal.toFixed(2)}&txid=APOLLO${generatedOrderId.slice(-6).toUpperCase()}&saida=br`
        const brRes = await fetch(brUrl)
        const { brcode: brCode } = await brRes.json()

        setPixData({ qrCode: qrUrl, brCode, amount: finalTotal, pixKey: '+5531985375524' })
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
      const timestamp = Date.now()
      const fileName = `${TENANT_ID}/comprovantes/${orderId}/${timestamp}.${fileExt}`
      const { error } = await supabase.storage.from('delivery-photos').upload(fileName, pixReceipt)

      if (error) throw error

      const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      await supabase.from('orders').update({
        pix_receipt_note: publicUrl,
        status: 'pending',
        payment_status: 'pending'
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

  const copyBrCode = () => {
    navigator.clipboard.writeText(pixData.brCode)
    setCopiedBrCode(true)
    setTimeout(() => setCopiedBrCode(false), 2000)
  }

  if (userLoading) return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><Loader2 size={40} className="text-apollo-orange animate-spin" /></div>

  if (showPixScreen) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white font-dm p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#1C1C1C] rounded-3xl p-8 border border-white/5 shadow-2xl overflow-y-auto max-h-screen">
          <h1 className="text-2xl font-playfair font-bold text-apollo-orange mb-6 text-center italic">Pagamento PIX</h1>

          <div className="bg-[#0D0D0D] rounded-2xl p-6 mb-6 text-center space-y-4">
             <div className="flex justify-between text-xs font-bold text-white/40 uppercase mb-2">
                <span>Valor a pagar</span>
                <span className="text-apollo-orange">R$ {pixData.amount.toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="w-64 h-64 bg-white mx-auto rounded-xl flex items-center justify-center overflow-hidden">
                <img src={pixData.qrCode} alt="PIX QR Code" className="w-full h-full" />
             </div>
             <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-4">Copia e Cola</p>
             <div className="flex gap-2">
                <input readOnly value={pixData.brCode} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono focus:outline-none" />
                <button onClick={copyBrCode} className="p-2 bg-apollo-orange rounded-xl hover:bg-apollo-orange/80 transition-colors">
                   {copiedBrCode ? <Check size={16} /> : <Copy size={16} />}
                </button>
             </div>
             <p className="text-[10px] text-white/40 font-bold mt-2">Chave: {pixData.pixKey} (Telefone)</p>
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
                    <span className="text-xs font-bold">Tirar Foto ou Escolher PDF</span>
                  </div>
                )}
              </div>
            </label>

            <button
              onClick={handleConfirmPix}
              disabled={!pixReceipt || loading}
              className="w-full bg-apollo-orange hover:bg-apollo-orange/90 disabled:opacity-50 h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Enviar Comprovante</>}
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
               <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Nome Completo</label>
                  <input required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:border-apollo-orange outline-none transition-all" placeholder="Seu nome" />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Telefone</label>
                  <input
                    required
                    value={customerPhone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                      let masked = val;
                      if (val.length > 2) masked = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                      if (val.length > 6) {
                        if (val.length <= 10) {
                          masked = `(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`;
                        } else {
                          masked = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                        }
                      }
                      setCustomerPhone(masked);
                    }}
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm focus:border-apollo-orange outline-none transition-all"
                    placeholder="(31) 99999-9999"
                  />
               </div>
             </div>
          </section>

          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A]">
             <h2 className="text-lg font-bold mb-6">2. Entrega</h2>
             <div className="flex bg-[#0D0D0D] rounded-xl p-1 mb-6 border border-white/5">
               <button type="button" onClick={() => setDeliveryType('delivery')} className={cn("flex-1 py-3 rounded-lg text-sm font-bold transition-all", deliveryType === 'delivery' ? "bg-apollo-orange text-white" : "text-white/40")}>Entrega</button>
               <button type="button" onClick={() => setDeliveryType('pickup')} className={cn("flex-1 py-3 rounded-lg text-sm font-bold transition-all", deliveryType === 'pickup' ? "bg-apollo-orange text-white" : "text-white/40")}>Retirada</button>
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
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/40 ml-1">CEP</label>
                        <input value={addressForm.zipcode} onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                          const masked = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val;
                          setAddressForm(prev => ({
                            ...prev,
                            zipcode: masked,
                            street: '',
                            number: '',
                            neighborhood: '',
                            fee: 0,
                            lat: 0,
                            lng: 0
                          }));
                        }} onBlur={handleCEPBlur} className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="00000-000" />
                        {addressForm.regionNotFound && <p className="text-[10px] text-apollo-orange font-bold mt-1">CEP não encontrado. Preencha o endereço manualmente.</p>}
                     </div>
                     <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-3 space-y-1">
                           <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Rua</label>
                           <input className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="Rua" value={addressForm.street} readOnly={!addressForm.regionNotFound} onChange={e => setAddressForm(prev => ({...prev, street: e.target.value}))} />
                        </div>
                        <div className="col-span-1 space-y-1">
                           <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Nº</label>
                           <input className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm text-center" placeholder="123" value={addressForm.number} onChange={e => setAddressForm(prev => ({...prev, number: e.target.value, fee: 0}))} onBlur={handleCalculateFee} />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Bairro</label>
                        <input className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3.5 text-sm" placeholder="Bairro" value={addressForm.neighborhood} readOnly={!addressForm.regionNotFound} onChange={e => setAddressForm(prev => ({...prev, neighborhood: e.target.value}))} />
                     </div>


                     {calculatingFee && <div className="text-center text-xs text-apollo-orange animate-pulse">Calculando distância real...</div>}
                     {addressForm.fee > 0 && <div className="bg-apollo-orange/10 p-4 rounded-xl text-center text-apollo-orange font-bold text-sm border border-apollo-orange/20 animate-in zoom-in">Taxa de entrega: R$ {addressForm.fee.toFixed(2).replace('.', ',')}</div>}
                     <label className="flex items-center gap-3 cursor-pointer mt-2">
                       <input
                         type="checkbox"
                         id="shouldSave"
                         checked={addressForm.shouldSave}
                         onChange={e => setAddressForm(prev => ({ ...prev, shouldSave: e.target.checked }))}
                         className="w-4 h-4 accent-apollo-orange"
                       />
                       <span className="text-xs font-medium text-white/60">Salvar este endereço para próximas entregas</span>
                     </label>
                   </div>
                 )}
               </div>
             )}

             {deliveryType === 'pickup' && (
                <div className="bg-[#0D0D0D] p-6 rounded-2xl border border-dashed border-apollo-orange/30 text-center">
                   <MapPin className="mx-auto text-apollo-orange mb-2" size={32} />
                   <h3 className="font-bold text-sm">Retirada na Loja</h3>
                   <p className="text-xs text-white/40">Av. Jequitinhonha, 218 - Vera Cruz</p>
                </div>
             )}
          </section>

          <section className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A]">
             <h2 className="text-lg font-bold mb-6">3. Pagamento</h2>
             <div className="grid grid-cols-2 gap-2">
               {['pix', 'cash', 'credit_card', 'debit_card'].map(m => (
                 <button key={m} type="button" onClick={() => setPaymentMethod(m as any)} className={cn("p-4 rounded-xl border text-xs font-bold uppercase transition-all flex flex-col items-center gap-2", paymentMethod === m ? "bg-apollo-orange border-apollo-orange shadow-lg" : "bg-[#0D0D0D] border-[#2A2A2A] text-white/40")}>
                   <span className="text-xl">{m === 'pix' ? '⚡' : m === 'cash' ? '💵' : '💳'}</span>
                   <span>{m === 'pix' ? 'PIX' : m === 'cash' ? 'Dinheiro' : m === 'credit_card' ? 'Crédito' : 'Débito'}</span>
                 </button>
               ))}
             </div>
             {paymentMethod === 'cash' && (
                <div className="mt-4 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Troco para quanto?</label>
                  <input type="number" value={changeFor} onChange={e => setChangeFor(e.target.value)} className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm focus:border-apollo-orange outline-none transition-all" placeholder="Ex: 50" />
                </div>
             )}
          </section>

          <div className="bg-[#1C1C1C] rounded-2xl p-6 border border-[#2A2A2A] sticky bottom-4 shadow-2xl">
             <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                   <span className="text-white/40">Subtotal</span>
                   <span className="font-bold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm">
                   <span className="text-white/40">Taxa de Entrega</span>
                   <span className="text-apollo-orange font-bold">
                      {deliveryType === 'pickup' ? 'Grátis' : (deliveryFee > 0 ? `+ R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : 'Calcule o frete')}
                   </span>
                </div>
                <div className="h-px bg-white/5 my-2" />
                <div className="flex justify-between items-center">
                   <span className="text-lg font-bold">Total do Pedido</span>
                   <span className="text-3xl font-playfair font-bold text-apollo-orange italic">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
             </div>
             <button type="submit" disabled={loading || !isStoreOpen} className="w-full bg-apollo-orange h-16 rounded-xl font-bold text-lg shadow-xl shadow-apollo-orange/20 transition-all disabled:opacity-50 active:scale-[0.98]">
               {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Finalizar Pedido'}
             </button>
          </div>
        </form>
       </div>
    </div>
  )
}

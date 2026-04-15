/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2, Wallet, Check, Home } from 'lucide-react'
import { checkRemainingOrders, registerReturnToBase } from '@/app/(admin)/actions/delivery-actions'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const supabase = createClient()

interface ConfirmModalProps {
  orderId: string
  deliveryId: string
  position: { lat: number; lng: number } | null
  onClose: () => void
  onConfirmed: () => void
}

export function ConfirmModal({ orderId, deliveryId, position, onClose, onConfirmed }: ConfirmModalProps) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: photo, 2: collection confirmation, 3: return to base
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handlePhotoSubmit = () => {
    if (photo) setStep(2)
  }

  const handleFinalConfirm = async (received: boolean) => {
    setLoading(true)
    setError(null)

    try {
      // 1. Upload photo
      const timestamp = Date.now()
      const path = `${TENANT_ID}/entregas/${orderId}/${timestamp}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(path, photo!, { contentType: photo!.type, upsert: false })
      if (uploadError) throw new Error('Erro ao enviar foto.')

      const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(path)
      const photoUrl = urlData.publicUrl

      // 2. INSERT delivery_checkin
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabase.from('delivery_checkins').insert({
        order_id: orderId,
        delivery_id: deliveryId,
        tenant_id: TENANT_ID,
        type: 'delivery_success',
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        photo_url: photoUrl,
        storage_bucket: 'delivery-photos',
        storage_path: path,
        expires_at: expiresAt.toISOString(),
      } as any)

      // 3. Update order status and payment status if received
      const updateData: any = { status: 'delivered', delivered_at: new Date().toISOString() }
      if (received) updateData.payment_status = 'collected'

      const { error: orderError } = await supabase.from('orders').update(updateData).eq('id', orderId)
      if (orderError) throw orderError

      // Feature 1: Check if it was the last delivery
      const isLast = await checkRemainingOrders(deliveryId)
      if (isLast) {
        setStep(3)
      } else {
        onConfirmed()
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar entrega.')
    } finally {
      setLoading(false)
    }
  }

  const handleReturnToBase = async (returning: boolean) => {
    if (returning) {
      setLoading(true)
      try {
        await registerReturnToBase(deliveryId, position?.lat ?? null, position?.lng ?? null)
        onConfirmed()
      } catch (err: any) {
        setError(err.message || 'Erro ao registrar retorno.')
      } finally {
        setLoading(false)
      }
    } else {
      onConfirmed()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#141414] rounded-3xl p-8 border border-white/10 shadow-2xl">
        {step === 1 ? (
           <div className="space-y-6 text-center">
              <h2 className="text-xl font-bold text-white italic">Foto da Entrega</h2>
              <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
              <div onClick={() => inputRef.current?.click()} className="h-64 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-apollo-orange transition-all overflow-hidden bg-black/20">
                 {preview ? <img src={preview} className="w-full h-full object-cover" alt="Preview" /> : <div className="flex flex-col items-center text-white/40"><Camera size={48} /><p className="mt-2 text-xs font-bold uppercase tracking-widest">Tirar Foto</p></div>}
              </div>
              <button onClick={handlePhotoSubmit} disabled={!photo} className="w-full h-14 bg-apollo-orange disabled:opacity-30 text-white font-bold rounded-2xl shadow-xl shadow-apollo-orange/20">Avançar</button>
           </div>
        ) : step === 2 ? (
           <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-apollo-orange/10 rounded-full flex items-center justify-center mx-auto"><Wallet className="text-apollo-orange" size={32} /></div>
              <h2 className="text-xl font-bold text-white italic">Você recebeu o pagamento?</h2>
              <p className="text-white/40 text-sm italic">Confirme se o cliente efetuou o pagamento em dinheiro ou cartão.</p>

              <div className="grid grid-cols-1 gap-3">
                 <button onClick={() => handleFinalConfirm(true)} disabled={loading} className="w-full h-14 bg-green-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-green-500">
                    {loading ? <Loader2 className="animate-spin" /> : <><Check /> Sim, recebi</>}
                 </button>
                 <button onClick={() => handleFinalConfirm(false)} disabled={loading} className="w-full h-14 bg-zinc-800 text-white font-bold rounded-2xl transition-all hover:bg-zinc-700">
                    Não recebi / PIX
                 </button>
              </div>
           </div>
        ) : (
           <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-apollo-orange/10 rounded-full flex items-center justify-center mx-auto"><Home className="text-apollo-orange" size={32} /></div>
              <h2 className="text-xl font-bold text-white italic">Rota concluída!</h2>
              <p className="text-white/40 text-sm italic">Está voltando para a base?</p>

              <div className="grid grid-cols-1 gap-3">
                 <button onClick={() => handleReturnToBase(true)} disabled={loading} className="w-full h-14 bg-apollo-orange text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-apollo-orange/80">
                    {loading ? <Loader2 className="animate-spin" /> : 'Sim, estou voltando'}
                 </button>
                 <button onClick={() => handleReturnToBase(false)} disabled={loading} className="w-full h-14 bg-zinc-800 text-white font-bold rounded-2xl transition-all hover:bg-zinc-700">
                    Não por enquanto
                 </button>
              </div>
           </div>
        )}
        {error && <p className="text-red-500 text-xs mt-4 font-bold">{error}</p>}
      </div>
    </div>
  )
}

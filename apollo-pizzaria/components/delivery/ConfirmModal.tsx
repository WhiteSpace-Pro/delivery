/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, CheckCircle2, Loader2, X } from 'lucide-react'

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
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleConfirm = async () => {
    if (!photo) return
    setLoading(true)
    setError(null)

    try {
      // 1. Upload photo
      const timestamp = Date.now()
      const path = `${TENANT_ID}/${orderId}/${timestamp}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(path, photo, { contentType: photo.type, upsert: false })
      if (uploadError) throw new Error('Erro ao enviar foto.')

      const { data: urlData } = supabase.storage.from('delivery-photos').getPublicUrl(path)
      const photoUrl = urlData.publicUrl

      // 2. INSERT delivery_checkin
      await supabase.from('delivery_checkins' as any).insert({
        order_id: orderId,
        delivery_id: deliveryId,
        tenant_id: TENANT_ID,
        type: 'delivery_success',
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        photo_url: photoUrl,
      } as never)

      // 3. UPDATE order status via API (needs supabaseAdmin server-side)
      await fetch('/api/orders/confirm-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })

      // 4. Notify next
      await fetch('/api/notify-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, delivery_id: deliveryId }),
      })

      onConfirmed()
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar entrega.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full bg-[#1A1A1A] rounded-t-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Confirmar Entrega</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Photo capture */}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {preview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-52 object-cover" />
              <button
                onClick={() => { setPhoto(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 text-white/40 hover:border-apollo-orange hover:text-apollo-orange transition-colors"
            >
              <Camera size={36} />
              <span className="text-sm font-bold">Tirar foto da entrega</span>
              <span className="text-xs">Obrigatório para confirmar</span>
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!photo || loading}
          className="w-full bg-[#E85D24] disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm transition-all"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Confirmando...</>
            : <><CheckCircle2 size={18} /> Confirmar entrega</>
          }
        </button>
      </div>
    </div>
  )
}

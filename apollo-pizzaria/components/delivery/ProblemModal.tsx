/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, AlertTriangle, Loader2, X } from 'lucide-react'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const supabase = createClient()

const PROBLEM_TYPES = [
  { id: 'absent', label: 'Cliente ausente' },
  { id: 'not_found', label: 'Endereço não encontrado' },
  { id: 'refused', label: 'Cliente recusou' },
  { id: 'other', label: 'Outro' },
] as const

type ProblemType = typeof PROBLEM_TYPES[number]['id']

interface ProblemModalProps {
  orderId: string
  deliveryId: string
  position: { lat: number; lng: number } | null
  onClose: () => void
  onReported: () => void
}

export function ProblemModal({ orderId, deliveryId, position, onClose, onReported }: ProblemModalProps) {
  const [problemType, setProblemType] = useState<ProblemType | null>(null)
  const [observations, setObservations] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!problemType) return
    setLoading(true)
    setError(null)

    try {
      let photoUrl: string | null = null

      if (photo) {
        const path = `${TENANT_ID}/${orderId}/problem_${Date.now()}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('delivery-photos')
          .upload(path, photo, { contentType: photo.type, upsert: false })
        if (!uploadErr) {
          const { data } = supabase.storage.from('delivery-photos').getPublicUrl(path)
          photoUrl = data.publicUrl
        }
      }

      await supabase.from('delivery_checkins' as any).insert({
        order_id: orderId,
        delivery_id: deliveryId,
        tenant_id: TENANT_ID,
        type: 'problem',
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        photo_url: photoUrl,
        observations: observations || null,
        problem_type: problemType,
      } as never)

      // NOTE: does NOT change order status — admin handles it
      onReported()
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar problema.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full bg-[#1A1A1A] rounded-t-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" /> Reportar Problema
          </h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Problem type selection */}
        <div className="space-y-2">
          {PROBLEM_TYPES.map(pt => (
            <label key={pt.id} className="flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer"
              style={{ borderColor: problemType === pt.id ? '#E85D24' : 'rgba(255,255,255,0.1)', background: problemType === pt.id ? 'rgba(232,93,36,0.1)' : 'transparent' }}>
              <input type="radio" name="problem" className="accent-[#E85D24]"
                checked={problemType === pt.id} onChange={() => setProblemType(pt.id)} />
              <span className="text-sm text-white font-medium">{pt.label}</span>
            </label>
          ))}
        </div>

        {/* Optional photo */}
        <div>
          <input ref={inputRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handlePhotoChange} />
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-36 object-cover" />
              <button onClick={() => { setPhoto(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
                <X size={16} className="text-white" />
              </button>
            </div>
          ) : (
            <button onClick={() => inputRef.current?.click()}
              className="w-full h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-white/30 text-xs hover:border-white/30 hover:text-white/50 transition-colors">
              <Camera size={16} /> Foto opcional
            </button>
          )}
        </div>

        {/* Observations */}
        <textarea
          value={observations}
          onChange={e => setObservations(e.target.value)}
          rows={3}
          className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-[#E85D24] transition-colors"
          placeholder="Observações (opcional)..."
        />

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!problemType || loading}
          className="w-full bg-amber-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Enviando...</>
            : 'Registrar problema'
          }
        </button>
      </div>
    </div>
  )
}

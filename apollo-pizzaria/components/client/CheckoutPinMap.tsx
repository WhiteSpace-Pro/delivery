'use client'

import { useEffect, useRef, useState } from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — CSS import for TomTom SDK
import '@tomtom-international/web-sdk-maps/dist/maps.css'
import { Loader2, MapPin, RotateCcw, Check } from 'lucide-react'

const STORE_LAT = -19.9077
const STORE_LNG = -43.8948

export interface PinAddressData {
  lat: number
  lng: number
  street: string
  neighborhood: string
  display: string
  number: string
}

interface CheckoutPinMapProps {
  onConfirm: (data: PinAddressData) => void
  onCancel: () => void
}

export function CheckoutPinMap({ onConfirm, onCancel }: CheckoutPinMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<'picking' | 'confirming'>('picking')
  const [geocoded, setGeocoded] = useState<Omit<PinAddressData, 'number'> | null>(null)
  const [pinNumber, setPinNumber] = useState('')
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    let map: any = null
    const key = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''

    async function initMap() {
      if (!mapContainer.current) return
      const tt = await import('@tomtom-international/web-sdk-maps')

      map = (tt.default ?? tt).map({
        key,
        container: mapContainer.current,
        center: [STORE_LNG, STORE_LAT],
        zoom: 15,
        dragPan: true,
        scrollZoom: false,
      })

      const el = document.createElement('div')
      el.style.cssText = 'width:32px;height:32px;border-radius:50%;background:#E85D24;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:grab;display:flex;align-items:center;justify-content:center;'
      el.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:white;"></div>'

      const marker = new (tt.default ?? tt).Marker({ element: el, draggable: true })
        .setLngLat([STORE_LNG, STORE_LAT])
        .addTo(map)

      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat()
        setGeocoding(true)
        setStage('confirming')
        setPinNumber('')

        let street = ''
        let neighborhood = ''
        let display = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`

        if (key) {
          try {
            const res = await fetch(
              `https://api.tomtom.com/search/2/reverseGeocode/${lngLat.lat},${lngLat.lng}.json?key=${key}`
            )
            const data = await res.json()
            const addr = data.addresses?.[0]?.address
            if (addr) {
              street = addr.streetName || ''
              neighborhood = addr.municipalitySubdivision || ''
              display = addr.freeformAddress || display
            }
          } catch { /* ignore */ }
        }

        setGeocoded({ lat: lngLat.lat, lng: lngLat.lng, street, neighborhood, display })
        setGeocoding(false)
      })
    }

    initMap()
    return () => { if (map) map.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConfirm = () => {
    if (!geocoded || !pinNumber.trim()) return
    onConfirm({ ...geocoded, number: pinNumber.trim() })
  }

  const handleRedo = () => {
    setStage('picking')
    setGeocoded(null)
    setPinNumber('')
  }

  return (
    <div className="space-y-3">
      <div ref={mapContainer} className="w-full h-56 bg-[#111] rounded-xl overflow-hidden" />

      {stage === 'picking' && (
        <div className="text-center text-xs text-white/40 py-1 flex items-center justify-center gap-2">
          <MapPin size={13} className="text-apollo-orange" />
          Arraste o PIN laranja até o seu endereço
        </div>
      )}

      {geocoding && (
        <div className="flex items-center justify-center gap-2 text-xs text-white/40 py-2">
          <Loader2 size={13} className="animate-spin text-apollo-orange" />
          Buscando endereço...
        </div>
      )}

      {stage === 'confirming' && !geocoding && geocoded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
          <div className="bg-[#0D0D0D] rounded-xl p-3 border border-[#2A2A2A]">
            <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Endereço encontrado</p>
            <p className="text-sm text-white">{geocoded.display}</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Número</label>
            <input
              autoFocus
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-center focus:border-apollo-orange outline-none transition-all"
              placeholder="Nº da casa / apartamento"
              value={pinNumber}
              onChange={e => setPinNumber(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRedo}
              className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-bold text-white/60 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={13} /> Refazer
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!pinNumber.trim()}
              className="flex-1 py-3 rounded-xl bg-apollo-orange text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors hover:bg-apollo-orange/90"
            >
              <Check size={13} /> Confirmar
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-white/30 hover:text-white/60 text-[10px] font-bold uppercase tracking-widest py-1 transition-colors"
      >
        Usar CEP em vez disso
      </button>
    </div>
  )
}

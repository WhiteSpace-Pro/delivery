'use client'

import { useEffect, useRef } from 'react'
import '@tomtom-international/web-sdk-maps/dist/maps.css'

export function SimplePreviewMap({ lat, lng, onLocationChange }: { lat: number, lng: number, onLocationChange?: (lat: number, lng: number, address?: string) => void }) {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: any = null

    async function initMap() {
      if (!mapContainer.current) return

      const tt = await import('@tomtom-international/web-sdk-maps')
      map = tt.map({
        key: process.env.NEXT_PUBLIC_TOMTOM_API_KEY || '',
        container: mapContainer.current,
        center: [lng, lat],
        zoom: 16,
        dragPan: true,
        scrollZoom: false
      })

      const el = document.createElement('div')
      el.className = 'w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center cursor-pointer'
      el.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>'

      const marker = new tt.Marker({ element: el, draggable: !!onLocationChange })
        .setLngLat([lng, lat])
        .addTo(map)

      if (onLocationChange) {
        marker.on('dragend', async () => {
          const lngLat = marker.getLngLat()
          let address: string | undefined
          const key = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
          if (key) {
            try {
              const res = await fetch(
                `https://api.tomtom.com/search/2/reverseGeocode/${lngLat.lat},${lngLat.lng}.json?key=${key}`
              )
              const data = await res.json()
              address = data.addresses?.[0]?.address?.freeformAddress
            } catch { /* ignore */ }
          }
          onLocationChange(lngLat.lat, lngLat.lng, address)
        })
      }
    }
    initMap()

    return () => {
      if (map) map.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]) // Intentional: Do not include onLocationChange to prevent re-rendering map when dragging

  return <div ref={mapContainer} className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mt-2" />
}


'use client'

import { useEffect, useRef } from 'react'
import '@tomtom-international/web-sdk-maps/dist/maps.css'

export function SimplePreviewMap({ lat, lng }: { lat: number, lng: number }) {
  const mapContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: any = null
    // marker will be held by map

    async function initMap() {
      if (!mapContainer.current) return

      const tt = await import('@tomtom-international/web-sdk-maps')
      map = tt.map({
        key: process.env.NEXT_PUBLIC_TOMTOM_API_KEY || '',
        container: mapContainer.current,
        center: [lng, lat],
        zoom: 16,
        dragPan: false,
        scrollZoom: false
      })

      const el = document.createElement('div')
      el.className = 'w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center'
      el.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>'

      new tt.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map)
    }
    initMap()

    return () => {
      if (map) map.remove()
    }
  }, [lat, lng])

  return <div ref={mapContainer} className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mt-2" />
}

'use client'

import { useEffect, useRef } from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — CSS import for TomTom SDK
import '@tomtom-international/web-sdk-maps/dist/maps.css'

const STORE_LAT = -19.9077
const STORE_LNG = -43.8948
const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY

/* eslint-disable @typescript-eslint/no-explicit-any */
interface TomTomMapProps {
  driverLat: number | null
  driverLng: number | null
}

export function TomTomMap({ driverLat, driverLng }: TomTomMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const driverMarkerRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !TOMTOM_KEY) return

    let tt: any

    async function initMap() {
      try {
        const mod = await import('@tomtom-international/web-sdk-maps')
        tt = mod.default ?? mod

        const centerLat = driverLat ?? STORE_LAT
        const centerLng = driverLng ?? STORE_LNG

        const map = tt.map({
          key: TOMTOM_KEY,
          container: containerRef.current!,
          center: [centerLng, centerLat],
          zoom: 14,
          stylesVisibility: { trafficFlow: false, trafficIncidents: false },
        })

        mapRef.current = map

        // Store pin
        new tt.Marker({ color: '#E85D24' })
          .setLngLat([STORE_LNG, STORE_LAT])
          .addTo(map)

        // Driver pin
        if (driverLat && driverLng) {
          driverMarkerRef.current = new tt.Marker({ color: '#D4941A' })
            .setLngLat([driverLng, driverLat])
            .addTo(map)
        }
      } catch (err) {
        console.error('[TomTomMap] init error:', err)
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update driver marker position when location changes
  useEffect(() => {
    if (!driverMarkerRef.current || driverLat == null || driverLng == null) return
    driverMarkerRef.current.setLngLat([driverLng, driverLat])
    if (mapRef.current) {
      mapRef.current.panTo([driverLng, driverLat])
    }
  }, [driverLat, driverLng])

  if (!TOMTOM_KEY) {
    return (
      <div className="w-full h-48 bg-[#1C1C1C] rounded-2xl border border-white/5 flex items-center justify-center">
        <p className="text-white/30 text-xs">Mapa indisponível — configure NEXT_PUBLIC_TOMTOM_API_KEY</p>
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-48 rounded-2xl overflow-hidden" />
}

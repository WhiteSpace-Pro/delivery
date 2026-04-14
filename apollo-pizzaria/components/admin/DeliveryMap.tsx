'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — CSS import for TomTom SDK
import '@tomtom-international/web-sdk-maps/dist/maps.css'
import { Driver } from '@/types'

const STORE_LAT = -19.9077
const STORE_LNG = -43.8948
const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY
const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function timeSince(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}min`
  return `${Math.floor(minutes / 60)}h`
}

interface DeliveryMapProps {
  initialDrivers: Driver[]
}

export default function DeliveryMap({ initialDrivers }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<{ [key: string]: any }>({})
  const ttRef = useRef<any>(null)
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)

  function createPopupContent(driver: Driver, dist: number, timeStr: string) {
    return `
      <div style="padding: 4px; min-width: 120px; font-family: sans-serif;">
        <div style="font-weight: bold; margin-bottom: 4px; color: #0D0D0D;">${driver.full_name}</div>
        <div style="font-size: 11px; margin-bottom: 2px; color: #666;">
          Status: <span style="color: ${driver.is_active ? '#10b981' : '#ef4444'}; font-weight: bold;">
            ${driver.is_active ? 'Online' : 'Offline'}
          </span>
        </div>
        <div style="font-size: 11px; margin-bottom: 2px; color: #666;">Distância: <b style="color: #0D0D0D;">${Math.round(dist)}m</b></div>
        <div style="font-size: 10px; color: #999; margin-top: 4px;">Atualizado há ${timeStr}</div>
      </div>
    `
  }

  function addOrUpdateMarker(driver: Driver, tt: any) {
    if (!mapRef.current || !driver.location) return

    const { delivery_id, lat, lng, updated_at } = driver.location
    const dist = distanciaMetros(STORE_LAT, STORE_LNG, lat, lng)
    const timeStr = timeSince(updated_at)

    if (markersRef.current[delivery_id]) {
      markersRef.current[delivery_id].setLngLat([lng, lat])
      const popupContent = createPopupContent(driver, dist, timeStr)
      markersRef.current[delivery_id].getPopup().setHTML(popupContent)
    } else {
      const el = document.createElement('div')
      el.className = 'custom-marker'
      el.style.backgroundColor = '#D4941A'
      el.style.width = '28px'
      el.style.height = '28px'
      el.style.borderRadius = '50%'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.color = 'white'
      el.style.fontWeight = '900'
      el.style.fontSize = '13px'
      el.style.border = '2px solid white'
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)'
      el.innerText = (driver.full_name || 'M').charAt(0).toUpperCase()

      const popup = new tt.Popup({ offset: 30, closeButton: false }).setHTML(createPopupContent(driver, dist, timeStr))

      const marker = new tt.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current)

      markersRef.current[delivery_id] = marker
    }
  }

  useEffect(() => {
    if (!containerRef.current || !TOMTOM_KEY) return

    let tt: any

    async function initMap() {
      try {
        const mod = await import('@tomtom-international/web-sdk-maps')
        tt = mod.default ?? mod
        ttRef.current = tt

        const map = tt.map({
          key: TOMTOM_KEY,
          container: containerRef.current!,
          center: [STORE_LNG, STORE_LAT],
          zoom: 13,
          stylesVisibility: { trafficFlow: false, trafficIncidents: false },
        })

        mapRef.current = map

        map.on('load', () => {
          // Store pin
          const storePopup = new tt.Popup({ offset: 35, closeButton: false }).setHTML('<b>Apollo Pizzaria</b>')
          new tt.Marker({ color: '#E85D24' })
            .setLngLat([STORE_LNG, STORE_LAT])
            .setPopup(storePopup)
            .addTo(map)

          // Initial driver markers
          drivers.forEach(driver => {
            if (driver.location) {
              addOrUpdateMarker(driver, tt)
            }
          })
        })

      } catch (err) {
        console.error('[DeliveryMap] init error:', err)
      }
    }

    initMap()

    // Realtime subscription
    const supabase = createClient()

    // Profile changes for online/offline status in map popups
    const profileChannel = supabase
      .channel('map-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `tenant_id=eq.${TENANT_ID}`
        },
        (payload) => {
          setDrivers(prev => {
            const updated = prev.map(d =>
              d.id === payload.new.id ? { ...d, is_active: payload.new.is_active } : d
            )
            const driver = updated.find(d => d.id === payload.new.id)
            if (driver && driver.location && ttRef.current) {
              addOrUpdateMarker(driver, ttRef.current)
            }
            return updated
          })
        }
      )
      .subscribe()

    const locationChannel = supabase
      .channel('map-location-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_current_location',
          filter: `tenant_id=eq.${TENANT_ID}`
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newLoc = payload.new as any;
            setDrivers(prev => {
              const updated = prev.map(d => {
                if (d.id === newLoc.delivery_id) {
                  return { ...d, location: newLoc }
                }
                return d
              })

              const driver = updated.find(d => d.id === newLoc.delivery_id)
              if (driver && ttRef.current) {
                addOrUpdateMarker(driver, ttRef.current)
              }
              return updated
            })
          }
        }
      )
      .subscribe()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(locationChannel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!TOMTOM_KEY) {
    return (
      <div className="w-full h-[400px] bg-[#F8F7F5] rounded-3xl border border-black/5 flex items-center justify-center">
        <p className="text-[#666] text-sm font-medium">Mapa indisponível — configure NEXT_PUBLIC_TOMTOM_API_KEY</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[400px] rounded-3xl overflow-hidden border border-black/10 shadow-sm bg-white mb-8">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}

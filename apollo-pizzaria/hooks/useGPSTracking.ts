'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const supabase = createClient()

export interface GPSPosition {
  lat: number
  lng: number
  accuracy: number
}

interface TrackingConfig {
  orderId: string
  deliveryId: string
  enabled: boolean
}

export function useGPSTracking({ orderId, deliveryId, enabled }: TrackingConfig) {
  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const lastInsertRef = useRef<number>(0)

  const insertTracking = useCallback(async (coords: GeolocationCoordinates) => {
    if (!orderId || !deliveryId) return

    const now = Date.now()
    const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible'
    const throttleMs = isVisible ? 5000 : 15000

    if (now - lastInsertRef.current < throttleMs) return
    if (coords.accuracy > 50) return // discard inaccurate fixes

    lastInsertRef.current = now

    await supabase
      .from('delivery_tracking')
      .insert({
        order_id: orderId,
        tenant_id: TENANT_ID,
        delivery_id: deliveryId,
        lat: Number(coords.latitude),
        lng: Number(coords.longitude),
        accuracy: coords.accuracy,
        speed: coords.speed ?? null,
        heading: coords.heading ?? null,
        altitude: coords.altitude ?? null,
        battery_level: null,
        is_charging: null,
        timestamp: new Date().toISOString(),
      } as never)
  }, [orderId, deliveryId])

  useEffect(() => {
    if (!enabled || !orderId) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionError(false)
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        insertTracking(pos.coords)
      },
      (err) => {
        if (err.code === 1) {
          // Permission denied — stop watching
          setPermissionError(true)
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
        }
        // codes 2 (unavailable) and 3 (timeout) — keep trying
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, orderId, insertTracking])

  return { position, permissionError }
}

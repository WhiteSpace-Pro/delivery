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
  orderId: string | null
  deliveryId: string
  enabled: boolean
}

export function useGPSTracking({ orderId, deliveryId, enabled }: TrackingConfig) {
  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const lastInsertRef = useRef<number>(0)

  const insertTracking = useCallback(async (coords: GeolocationCoordinates) => {
    // Basic validation
    if (!deliveryId || !deliveryId.match(/^[0-9a-f-]{36}$/i)) {
      console.warn('[GPS] Invalid deliveryId:', deliveryId)
      return
    }

    const now = Date.now()
    const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible'

    // Throttle: 5s if visible, 15s if background
    const throttleMs = isVisible ? 5000 : 15000
    if (now - lastInsertRef.current < throttleMs) return

    // Log accuracy instead of filtering it out
    console.log('[GPS] Accuracy:', coords.accuracy)

    lastInsertRef.current = now

    // Prepare payload
    const payload = {
      delivery_id: deliveryId,
      order_id: (orderId && orderId !== '') ? orderId : null,
      lat: Number(coords.latitude),
      lng: Number(coords.longitude),
      accuracy: coords.accuracy ? Number(coords.accuracy) : null,
      speed: coords.speed != null ? Number(coords.speed) : null,
      heading: coords.heading != null ? Number(coords.heading) : null,
      altitude: coords.altitude != null ? Number(coords.altitude) : null,
      battery_level: null,
      is_charging: null,
      timestamp: new Date().toISOString(),
      tenant_id: TENANT_ID,
    }

    console.log('[GPS] Attempting insert into delivery_tracking:', payload)

    const { data, error } = await supabase
      .from('delivery_tracking')
      .insert(payload as any)
      .select()

    if (error) {
      console.error('[GPS] Insert error:', error.message, error.details, error.hint)
    } else {
      console.log('[GPS] Insert success:', data?.[0]?.id)
    }
  }, [orderId, deliveryId])

  useEffect(() => {
    // If not enabled or no deliveryId, ensure watch is cleared
    if (!enabled || !deliveryId) {
      if (watchIdRef.current !== null) {
        console.log('[GPS] Stopping watch')
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      console.error('[GPS] Geolocation API unavailable')
      return
    }

    // Clear existing watch before starting new one
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    console.log('[GPS] Starting watch for deliveryId:', deliveryId, 'orderId:', orderId)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionError(false)
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        void insertTracking(pos.coords)
      },
      (err) => {
        console.error('[GPS] Geolocation error:', err.code, err.message)
        if (err.code === 1) { // PERMISSION_DENIED
          setPermissionError(true)
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, deliveryId, orderId, insertTracking])

  return { position, permissionError }
}

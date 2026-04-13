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
    if (!deliveryId) return

    const now = Date.now()
    const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible'
    const throttleMs = isVisible ? 5000 : 15000

    if (now - lastInsertRef.current < throttleMs) return

    // Increased accuracy threshold to 100m for better compatibility in test/indoor environments
    if (coords.accuracy > 100) {
      console.warn('[GPS] Accuracy too low:', coords.accuracy)
      return
    }

    lastInsertRef.current = now

    console.log('[GPS] Inserting position:', { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, orderId })

    // Update history - Triggers will handle sync to delivery_current_location
    const { error } = await supabase
      .from('delivery_tracking')
      .insert({
        delivery_id: deliveryId,
        order_id: orderId || null,
        lat: Number(coords.latitude),
        lng: Number(coords.longitude),
        accuracy: Number(coords.accuracy),
        speed: coords.speed ? Number(coords.speed) : null,
        heading: coords.heading ? Number(coords.heading) : null,
        altitude: coords.altitude ? Number(coords.altitude) : null,
        battery_level: null,
        is_charging: null,
        timestamp: new Date().toISOString(),
        tenant_id: TENANT_ID,
      } as any)

    if (error) {
      console.error('[GPS] Error inserting tracking:', error)
    }
  }, [orderId, deliveryId])

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        console.log('[GPS] Disabling tracking')
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      console.error('[GPS] Geolocation not supported')
      return
    }

    console.log('[GPS] Enabling tracking for deliveryId:', deliveryId)

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
        console.error('[GPS] watchPosition error:', err)
        if (err.code === 1) {
          setPermissionError(true)
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [enabled, deliveryId, insertTracking])

  return { position, permissionError }
}

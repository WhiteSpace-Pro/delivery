'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface DeliveryLocation {
  lat: number
  lng: number
  updated_at: string
}

interface UseDeliveryTrackingOptions {
  orderId: string
  enabled?: boolean
}

export function useDeliveryTracking({ orderId, enabled = true }: UseDeliveryTrackingOptions) {
  const [location, setLocation] = useState<DeliveryLocation | null>(null)
  const [isApproaching, setIsApproaching] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!orderId || !enabled) return

    // Fetch current position once
    async function fetchCurrent() {
      const { data } = await supabase
        .from('delivery_current_location')
        .select('lat, lng, updated_at')
        .eq('order_id', orderId)
        .maybeSingle()

      if (data && data.lat != null && data.lng != null) {
        setLocation({ lat: data.lat as number, lng: data.lng as number, updated_at: data.updated_at as string })
      }
    }

    fetchCurrent()

    // Realtime: position updates
    const channel = supabase.channel(`tracking:${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_current_location',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const row = payload.new as any
        setLocation({ lat: row.lat, lng: row.lng, updated_at: row.updated_at })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'delivery_current_location',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const row = payload.new as any
        setLocation({ lat: row.lat, lng: row.lng, updated_at: row.updated_at })
      })
      .on('broadcast', { event: 'delivery_approaching' }, () => {
        setIsApproaching(true)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, enabled])

  return { location, isApproaching }
}

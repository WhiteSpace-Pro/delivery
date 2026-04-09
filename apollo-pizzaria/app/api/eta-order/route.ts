import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TOMTOM_KEY = process.env.TOMTOM_API_KEY

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  const order_id = req.nextUrl.searchParams.get('order_id')
  if (!order_id) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 })
  }

  // Fetch order with delivery address and assigned driver
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, assigned_delivery_id, address:addresses!orders_delivery_address_id_fkey(lat, lng)')
    .eq('id', order_id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const row = order as unknown as {
    assigned_delivery_id: string | null
    address: { lat: number | null; lng: number | null } | null
  }

  const { assigned_delivery_id } = row
  const delivery_lat = row.address?.lat ?? null
  const delivery_lng = row.address?.lng ?? null

  if (!delivery_lat || !delivery_lng) {
    return NextResponse.json({ eta_minutes: null, distance_km: null, motoboy_name: null })
  }

  // Fetch driver current position
  const { data: location } = await supabaseAdmin
    .from('delivery_current_location')
    .select('lat, lng')
    .eq('order_id', order_id)
    .maybeSingle()

  if (!location) {
    return NextResponse.json({ eta_minutes: null, distance_km: null, motoboy_name: null })
  }

  const { lat: driverLat, lng: driverLng } = location as { lat: number; lng: number }

  // Fetch driver name
  let motoboy_name: string | null = null
  if (assigned_delivery_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', assigned_delivery_id)
      .single()
    motoboy_name = (profile as { full_name: string | null } | null)?.full_name ?? null
  }

  // Calculate ETA via TomTom, fallback to Haversine
  if (TOMTOM_KEY) {
    try {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${driverLat},${driverLng}:${delivery_lat},${delivery_lng}/json?key=${TOMTOM_KEY}&travelMode=motorcycle&departAt=now`
      const res = await fetch(url, { next: { revalidate: 0 } })
      const data = await res.json()
      const route = data?.routes?.[0]
      if (route) {
        const eta_minutes = Math.ceil(route.summary.travelTimeInSeconds / 60)
        const distance_km = route.summary.lengthInMeters / 1000
        return NextResponse.json({ eta_minutes, distance_km, motoboy_name })
      }
    } catch (err) {
      console.error('[eta-order] TomTom error:', err)
    }
  }

  // Haversine fallback
  const distance_km = haversineKm(driverLat, driverLng, delivery_lat, delivery_lng)
  const eta_minutes = Math.ceil((distance_km / 30) * 60)
  return NextResponse.json({ eta_minutes, distance_km, motoboy_name })
}

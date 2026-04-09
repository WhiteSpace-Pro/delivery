/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const TOMTOM_KEY = process.env.TOMTOM_API_KEY

async function calcEta(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  if (!TOMTOM_KEY) return null
  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json?key=${TOMTOM_KEY}&travelMode=motorcycle&departAt=now`
    const res = await fetch(url)
    const data = await res.json()
    const route = data?.routes?.[0]
    if (route) return Math.ceil(route.summary.travelTimeInSeconds / 60)
  } catch { /* ignore */ }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { order_id, delivery_id } = await req.json()
    if (!order_id || !delivery_id) {
      return NextResponse.json({ error: 'order_id and delivery_id required' }, { status: 400 })
    }

    // a) Mark current order as delivered
    await supabaseAdmin
      .from('orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() } as any)
      .eq('id', order_id)

    // b) Find next order for this driver
    const { data: nextOrders } = await supabaseAdmin
      .from('orders')
      .select('id, delivery_address_id')
      .eq('assigned_delivery_id', delivery_id)
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'out_for_delivery')
      .neq('id', order_id)
      .order('created_at', { ascending: true })
      .limit(1)

    const nextOrder = nextOrders?.[0]

    if (!nextOrder) {
      return NextResponse.json({ success: true, hasNext: false })
    }

    // c) Get driver's current location
    const { data: driverLoc } = await supabaseAdmin
      .from('delivery_current_location')
      .select('lat, lng')
      .eq('order_id', order_id)
      .maybeSingle()

    // d) Get destination address
    let eta_minutes: number | null = null
    if (driverLoc && nextOrder.delivery_address_id) {
      const { data: addr } = await supabaseAdmin
        .from('addresses')
        .select('lat, lng')
        .eq('id', nextOrder.delivery_address_id)
        .maybeSingle()

      if (addr?.lat != null && addr?.lng != null && driverLoc.lat != null && driverLoc.lng != null) {
        eta_minutes = await calcEta(
          driverLoc.lat as number, driverLoc.lng as number,
          addr.lat as number, addr.lng as number
        )
      }
    }

    // e) Get customer_id for notification
    const { data: nextOrderFull } = await supabaseAdmin
      .from('orders')
      .select('customer_id')
      .eq('id', nextOrder.id)
      .single()

    // f) Insert notification
    if (nextOrderFull?.customer_id) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          tenant_id: TENANT_ID,
          type: 'delivery_approaching',
          title: '🍕 Sua pizza é a próxima!',
          message: eta_minutes ? `Chega em ~${eta_minutes} min` : 'O motoboy está a caminho!',
          is_read: false,
          data: { order_id: nextOrder.id, eta_seconds: eta_minutes ? eta_minutes * 60 : null },
        } as any)
    }

    // g) Broadcast via Supabase Realtime
    const channel = supabaseAdmin.channel(`tracking:${nextOrder.id}`)
    await channel.send({
      type: 'broadcast',
      event: 'delivery_approaching',
      payload: { order_id: nextOrder.id, eta_minutes },
    })
    await supabaseAdmin.removeChannel(channel)

    return NextResponse.json({ success: true, hasNext: true, eta: eta_minutes })
  } catch (err) {
    console.error('[notify-next]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

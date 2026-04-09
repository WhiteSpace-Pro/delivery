import { NextRequest, NextResponse } from 'next/server'

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
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 })
  }

  const [fromLat, fromLng] = from.split(',').map(Number)
  const [toLat, toLng] = to.split(',').map(Number)

  if (TOMTOM_KEY) {
    try {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json?key=${TOMTOM_KEY}&travelMode=motorcycle&departAt=now`
      const res = await fetch(url, { next: { revalidate: 0 } })
      const data = await res.json()

      const route = data?.routes?.[0]
      if (route) {
        const summary = route.summary
        const eta_seconds = summary.travelTimeInSeconds
        const eta_minutes = Math.ceil(eta_seconds / 60)
        const distance_km = summary.lengthInMeters / 1000

        return NextResponse.json({ eta_seconds, eta_minutes, distance_km })
      }
    } catch (err) {
      console.error('[eta] TomTom error:', err)
    }
  }

  // Fallback: Haversine + 30 km/h average speed
  const distance_km = haversineKm(fromLat, fromLng, toLat, toLng)
  const eta_seconds = Math.round((distance_km / 30) * 3600)
  const eta_minutes = Math.ceil(eta_seconds / 60)

  return NextResponse.json({ eta_seconds, eta_minutes, distance_km })
}

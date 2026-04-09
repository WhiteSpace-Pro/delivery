import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')
  if (!address) {
    return NextResponse.json({ lat: null, lng: null })
  }

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status === 'OK' && data.results?.length > 0) {
        const { lat, lng } = data.results[0].geometry.location
        return NextResponse.json({ lat, lng })
      }
    } catch {
      // fall through to Nominatim
    }
  }

  // Fallback: Nominatim (OpenStreetMap) — free, no key required
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ApolloDelivery/1.0',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })
    const data = await res.json()
    if (data?.length > 0) {
      return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
    }
  } catch {
    // geocoding unavailable
  }

  return NextResponse.json({ lat: null, lng: null })
}

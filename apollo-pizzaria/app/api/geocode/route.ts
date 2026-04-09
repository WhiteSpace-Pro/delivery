import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const street = searchParams.get('street') || ''
  const number = searchParams.get('number') || ''
  const neighborhood = searchParams.get('neighborhood') || ''
  const city = searchParams.get('city') || ''
  const state = searchParams.get('state') || ''

  // Require at least neighborhood + city to avoid geocoding garbage
  if (!neighborhood && !street) {
    return NextResponse.json({ lat: null, lng: null })
  }

  // Build the most specific query possible
  const parts = [street, number, neighborhood, city, state, 'Brasil'].filter(Boolean)
  const queryString = parts.join(', ')

  console.log('[geocode] query:', queryString)

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryString)}&key=${googleKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status === 'OK' && data.results?.length > 0) {
        const { lat, lng } = data.results[0].geometry.location
        console.log('[geocode] resultado (Google):', lat, lng)
        return NextResponse.json({ lat, lng })
      }
    } catch {
      // fall through to Nominatim
    }
  }

  // Fallback: Nominatim (OpenStreetMap) — no key required
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryString)}&format=json&limit=1&countrycodes=br`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ApolloDelivery/1.0',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })
    const data = await res.json()
    if (data?.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      console.log('[geocode] resultado (Nominatim):', lat, lng)
      return NextResponse.json({ lat, lng })
    }

    // If full address didn't match, retry with just neighborhood + city
    if (neighborhood && city) {
      const fallbackQuery = [neighborhood, city, state, 'Brasil'].filter(Boolean).join(', ')
      console.log('[geocode] retry com bairro:', fallbackQuery)
      const res2 = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackQuery)}&format=json&limit=1&countrycodes=br`,
        { headers: { 'User-Agent': 'ApolloDelivery/1.0', 'Accept-Language': 'pt-BR,pt;q=0.9' } }
      )
      const data2 = await res2.json()
      if (data2?.length > 0) {
        const lat = parseFloat(data2[0].lat)
        const lng = parseFloat(data2[0].lon)
        console.log('[geocode] resultado fallback (bairro):', lat, lng)
        return NextResponse.json({ lat, lng })
      }
    }
  } catch {
    // geocoding unavailable
  }

  return NextResponse.json({ lat: null, lng: null })
}

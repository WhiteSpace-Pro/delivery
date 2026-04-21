import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const street = searchParams.get('street') || ''
  const number = searchParams.get('number') || ''
  const neighborhood = searchParams.get('neighborhood') || ''
  const city = searchParams.get('city') || ''
  const state = searchParams.get('state') || ''

  if (!neighborhood && !street) {
    return NextResponse.json({ lat: null, lng: null })
  }

  const parts = [street, number, neighborhood, city, state, 'Brasil'].filter(Boolean)
  const queryString = parts.join(', ')

  console.log('[geocode] query:', queryString)

  const tomtomKey = process.env.TOMTOM_API_KEY || process.env.NEXT_PUBLIC_TOMTOM_API_KEY

  if (!tomtomKey) {
    console.error('[geocode] Erro: TOMTOM_API_KEY não configurada')
    return NextResponse.json({ lat: null, lng: null }, { status: 500 })
  }

  try {
    const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(queryString)}.json?key=${tomtomKey}&countrySet=BR&limit=1`
    const res = await fetch(url)
    const data = await res.json()

    if (data.results && data.results.length > 0) {
      const { lat, lon } = data.results[0].position
      console.log('[geocode] resultado (TomTom):', lat, lon)
      return NextResponse.json({ lat, lng: lon })
    }
  } catch (error) {
    console.error('[geocode] erro na API TomTom:', error)
  }

  return NextResponse.json({ lat: null, lng: null })
}

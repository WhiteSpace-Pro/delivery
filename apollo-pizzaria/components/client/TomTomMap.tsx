'use client'

import { useEffect, useRef } from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — CSS import for TomTom SDK
import '@tomtom-international/web-sdk-maps/dist/maps.css'

const STORE_LAT = -19.9077
const STORE_LNG = -43.8948
const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY
const ROUTE_LINE_COLOR = '#E85D24'
const ROUTE_SOURCE_ID = 'driver-route'
const ROUTE_LAYER_ID = 'driver-route-line'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface TomTomMapProps {
  driverLat: number | null
  driverLng: number | null
  destLat?: number | null
  destLng?: number | null
  draggable?: boolean
  onDragEnd?: (lat: number, lng: number) => void
}

async function fetchRoutePoints(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<[number, number][]> {
  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json?key=${TOMTOM_KEY}&travelMode=motorcycle`
    const res = await fetch(url)
    const data = await res.json()
    const points: { lat: number; lon: number }[] = data?.routes?.[0]?.legs?.[0]?.points ?? []
    return points.map(p => [p.lon, p.lat])
  } catch {
    return []
  }
}

function drawRouteOnMap(map: any, coordinates: [number, number][]) {
  if (!coordinates.length) return

  const geojson = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
  }

  if (map.getSource(ROUTE_SOURCE_ID)) {
    map.getSource(ROUTE_SOURCE_ID).setData(geojson)
  } else {
    map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: geojson })
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ROUTE_LINE_COLOR, 'line-width': 4 },
    })
  }
}

export function TomTomMap({ driverLat, driverLng, destLat, destLng, draggable, onDragEnd }: TomTomMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const driverMarkerRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || !TOMTOM_KEY) return

    let tt: any

    async function initMap() {
      try {
        const mod = await import('@tomtom-international/web-sdk-maps')
        tt = mod.default ?? mod

        const centerLat = driverLat ?? STORE_LAT
        const centerLng = driverLng ?? STORE_LNG

        const map = tt.map({
          key: TOMTOM_KEY,
          container: containerRef.current!,
          center: [centerLng, centerLat],
          zoom: 14,
          stylesVisibility: { trafficFlow: false, trafficIncidents: false },
        })

        mapRef.current = map

        // Store pin
        new tt.Marker({ color: '#E85D24' })
          .setLngLat([STORE_LNG, STORE_LAT])
          .addTo(map)

        // Driver pin
        if (driverLat && driverLng) {
          driverMarkerRef.current = new tt.Marker({ color: '#D4941A', draggable })
            .setLngLat([driverLng, driverLat])
            .addTo(map)

          if (draggable && onDragEnd) {
            driverMarkerRef.current.on('dragend', () => {
              const lngLat = driverMarkerRef.current.getLngLat()
              onDragEnd(lngLat.lat, lngLat.lng)
            })
          }

          // Draw initial route
          const toLat = destLat ?? STORE_LAT
          const toLng = destLng ?? STORE_LNG
          map.on('load', async () => {
            const points = await fetchRoutePoints(driverLat, driverLng, toLat, toLng)
            drawRouteOnMap(map, points)
          })
        }
      } catch (err) {
        console.error('[TomTomMap] init error:', err)
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update driver marker and redraw route when position changes
  useEffect(() => {
    if (!driverMarkerRef.current || driverLat == null || driverLng == null) return
    driverMarkerRef.current.setLngLat([driverLng, driverLat])
    const map = mapRef.current
    if (!map) return
    map.panTo([driverLng, driverLat])

    const toLat = destLat ?? STORE_LAT
    const toLng = destLng ?? STORE_LNG
    fetchRoutePoints(driverLat, driverLng, toLat, toLng).then(points => {
      drawRouteOnMap(map, points)
    })
  }, [driverLat, driverLng, destLat, destLng])

  if (!TOMTOM_KEY) {
    return (
      <div className="w-full h-48 bg-[#1C1C1C] rounded-2xl border border-white/5 flex items-center justify-center">
        <p className="text-white/30 text-xs">Mapa indisponível — configure NEXT_PUBLIC_TOMTOM_API_KEY</p>
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-48 rounded-2xl overflow-hidden" />
}

'use client'

import { useState, useEffect, useRef } from 'react'
import {
  assignDriverAndSend,
  getAvailableDrivers,
  previewAddressFee,
  saveAddressCorrection,
} from '@/app/(admin)/actions/order-actions'
import { OrderWithItems, Profile } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { SimplePreviewMap } from './SimplePreviewMap'

const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ''
const SEARCH_LAT = -19.9077
const SEARCH_LNG = -43.8948

interface TomTomSuggestion {
  address: {
    streetName?: string
    municipalitySubdivision?: string
    freeformAddress: string
  }
  position: { lat: number; lon: number }
}

interface TomTomReverseGeocodeAddress {
  streetName?: string
  municipalitySubdivision?: string
  streetNumber?: string
  freeformAddress?: string
}

interface TomTomReverseGeocodeResult {
  address?: TomTomReverseGeocodeAddress
}

interface TomTomReverseGeocodeResponse {
  addresses?: TomTomReverseGeocodeResult[]
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface DriverAssignModalProps {
  order: OrderWithItems
  tenantId: string
  onClose: () => void
}

export function DriverAssignModal({ order, onClose }: DriverAssignModalProps) {
  const deliveryAddress = (order as any).addresses

  const [isValidAddress, setIsValidAddress] = useState(() => {
    if (!deliveryAddress) return true
    return (
      deliveryAddress.lat != null &&
      deliveryAddress.lat !== 0 &&
      deliveryAddress.lng != null &&
      deliveryAddress.lng !== 0
    )
  })

  // Driver selection
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Address search
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TomTomSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAddressSelected, setIsAddressSelected] = useState(false)

  // Selected address data
  const [selectedStreet, setSelectedStreet] = useState('')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null)
  const pinCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  // Number & complement
  const [number, setNumber] = useState(deliveryAddress?.number ?? '')
  const [complement, setComplement] = useState(deliveryAddress?.complement ?? '')

  // Number-vs-pin conflict
  const [numberCoords, setNumberCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showConflict, setShowConflict] = useState(false)
  const [isRefiningNumber, setIsRefiningNumber] = useState(false)

  // Fee preview
  const [feeInfo, setFeeInfo] = useState<{ fee: number; distanceKm: number } | null>(null)
  const [isCalculatingFee, setIsCalculatingFee] = useState(false)
  const originalFee = order.delivery_fee

  // Save
  const [isSaving, setIsSaving] = useState(false)
  const [addressError, setAddressError] = useState('')
  const latestPinDragRequestRef = useRef(0)

  useEffect(() => {
    pinCoordsRef.current = pinCoords
  }, [pinCoords])

  useEffect(() => {
    getAvailableDrivers()
      .then(data => { if (data) setDrivers(data as any) })
      .catch(console.error)
      .finally(() => setIsLoadingDrivers(false))
  }, [])

  // TomTom autocomplete — only runs while no address is selected yet
  useEffect(() => {
    if (isAddressSelected || searchQuery.length < 3) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const q = encodeURIComponent(searchQuery)
        const res = await fetch(
          `https://api.tomtom.com/search/2/search/${q}.json?key=${TOMTOM_KEY}&countrySet=BR&lat=${SEARCH_LAT}&lon=${SEARCH_LNG}&radius=20000&language=pt-BR`
        )
        const data = await res.json()
        setSuggestions((data.results ?? []).slice(0, 6))
      } catch { /* ignore */ }
      finally { setIsSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, isAddressSelected])

  // Number refinement — compare geocoded-with-number to current pin
  useEffect(() => {
    if (!selectedStreet || !number) {
      setNumberCoords(null)
      setShowConflict(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsRefiningNumber(true)
      try {
        const query = encodeURIComponent(
          `${selectedStreet}, ${number}, Belo Horizonte, MG`
        )
        const res = await fetch(
          `https://api.tomtom.com/search/2/geocode/${query}.json?key=${TOMTOM_KEY}&countrySet=BR&limit=1`
        )
        const data = await res.json()
        const result = data.results?.[0]
        if (!result) return
        const coords = { lat: result.position.lat as number, lng: result.position.lon as number }
        setNumberCoords(coords)
        const current = pinCoordsRef.current
        if (current) {
          const dist = haversineKm(current.lat, current.lng, coords.lat, coords.lng)
          if (dist > 0.1) {
            setShowConflict(true)
          } else {
            setPinCoords(coords)
            setFeeInfo(null)
          }
        }
      } catch { /* ignore */ }
      finally { setIsRefiningNumber(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [selectedStreet, number])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (isAddressSelected) {
      setIsAddressSelected(false)
      setSelectedStreet('')
      setSelectedNeighborhood('')
      setPinCoords(null)
      setNumberCoords(null)
      setShowConflict(false)
      setFeeInfo(null)
    }
  }

  const handleSelectSuggestion = (s: TomTomSuggestion) => {
    setSearchQuery(s.address.freeformAddress)
    setSelectedStreet(s.address.streetName || s.address.freeformAddress)
    setSelectedNeighborhood(s.address.municipalitySubdivision || '')
    setPinCoords({ lat: s.position.lat, lng: s.position.lon })
    setSuggestions([])
    setIsAddressSelected(true)
    setFeeInfo(null)
    setShowConflict(false)
    setNumberCoords(null)
    setAddressError('')
  }

  const geocodeNumberFromStreet = async (
    street: string,
    streetNumber: string
  ): Promise<{ lat: number; lng: number } | null> => {
    const query = encodeURIComponent(`${street}, ${streetNumber}, Belo Horizonte, MG`)
    const res = await fetch(
      `https://api.tomtom.com/search/2/geocode/${query}.json?key=${TOMTOM_KEY}&countrySet=BR&limit=1`
    )
    const data: { results?: Array<{ position?: { lat?: number; lon?: number } }> } =
      await res.json()
    const firstResult = data.results?.[0]
    if (
      firstResult?.position?.lat == null ||
      firstResult.position.lon == null
    ) {
      return null
    }
    return {
      lat: firstResult.position.lat,
      lng: firstResult.position.lon,
    }
  }

  const handlePinDrag = (lat: number, lng: number) => {
    setPinCoords({ lat, lng })
    setFeeInfo(null)
    setShowConflict(false)
    setAddressError('')

    const currentRequestId = Date.now()
    latestPinDragRequestRef.current = currentRequestId

    void (async () => {
      try {
        const res = await fetch(
          `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_KEY}&language=pt-BR`
        )
        const data: TomTomReverseGeocodeResponse = await res.json()
        const address = data.addresses?.[0]?.address
        if (!address || latestPinDragRequestRef.current !== currentRequestId) return

        const draggedStreet = address.streetName?.trim() || ''
        const draggedNeighborhood = address.municipalitySubdivision?.trim() || ''
        const draggedNumber = address.streetNumber?.trim() || ''
        const previousNumber = number.trim()

        const searchLabel =
          [draggedStreet, draggedNeighborhood].filter(Boolean).join(' - ') ||
          address.freeformAddress ||
          ''

        if (searchLabel) setSearchQuery(searchLabel)
        setSelectedStreet(draggedStreet || selectedStreet)
        setSelectedNeighborhood(draggedNeighborhood)
        setIsAddressSelected(true)

        if (draggedNumber) {
          if (previousNumber && previousNumber !== draggedNumber) {
            const coordsFromTypedNumber = await geocodeNumberFromStreet(
              draggedStreet || selectedStreet,
              previousNumber
            )
            if (latestPinDragRequestRef.current !== currentRequestId) return
            setNumberCoords(coordsFromTypedNumber)
            setShowConflict(true)
          } else {
            setNumberCoords(null)
          }
          setNumber(draggedNumber)
        }
      } catch {
        // ignore reverse geocode failures when dragging
      }
    })()
  }

  const handleConflictChoose = (choice: 'pin' | 'number') => {
    if (choice === 'number' && numberCoords) {
      setPinCoords(numberCoords)
    }
    setFeeInfo(null)
    setShowConflict(false)
  }

  const handleCalculateFee = async () => {
    if (!pinCoords) return
    setIsCalculatingFee(true)
    setAddressError('')
    try {
      const result = await previewAddressFee(pinCoords.lat, pinCoords.lng)
      setFeeInfo(result)
    } catch (e: any) {
      setAddressError(e.message || 'Erro ao calcular frete')
    } finally {
      setIsCalculatingFee(false)
    }
  }

  const handleSaveAddress = async () => {
    if (!pinCoords || !feeInfo || !order.delivery_address_id) {
      setAddressError('Preencha o endereço, número e calcule o frete antes de confirmar.')
      return
    }
    setIsSaving(true)
    setAddressError('')
    try {
      await saveAddressCorrection(order.id, order.delivery_address_id, {
        street: selectedStreet,
        number,
        neighborhood: selectedNeighborhood,
        complement: complement || undefined,
        lat: pinCoords.lat,
        lng: pinCoords.lng,
      })
      setIsValidAddress(true)
    } catch (e: any) {
      setAddressError(e.message || 'Erro ao salvar endereço')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedDriverId) return
    setIsSubmitting(true)
    try {
      await assignDriverAndSend(order.id, selectedDriverId)
      onClose()
    } catch (e) {
      console.error('Failed to assign driver:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canCalculateFee = !!pinCoords && !showConflict && !isRefiningNumber
  const canSave = canCalculateFee && !!feeInfo && !!number.trim()
  const feeChanged = feeInfo !== null && feeInfo.fee !== originalFee

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0D0D0D]">
            Atribuir motoboy — Pedido #{order.display_id || order.id.slice(-4).toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        {deliveryAddress && !isValidAddress ? (
          <div className="py-4 space-y-4 bg-red-50 p-4 rounded-xl border border-red-100">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              ⚠️ Endereço Inválido
            </h3>
            <p className="text-sm text-red-600">
              Endereço sem coordenadas. Busque o logradouro abaixo para corrigir.
            </p>

            {/* Search field */}
            <div className="relative">
              <label className="text-xs font-bold text-red-800 mb-1 block">
                Buscar logradouro
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Ex: Rua Leopoldo Gomes, esquina com Belém"
                className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-red-400"
                disabled={isSaving}
              />
              {isSearching && (
                <div className="absolute right-3 top-9">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
                </div>
              )}
              {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="px-4 py-2 hover:bg-red-50 cursor-pointer text-xs text-gray-800 border-b border-gray-100 last:border-0"
                      onClick={() => handleSelectSuggestion(s)}
                    >
                      {s.address.freeformAddress}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Number & Complement — always visible once address selected */}
            {isAddressSelected && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-red-800 mb-1 block">
                      Número
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={e => { setNumber(e.target.value); setFeeInfo(null) }}
                      placeholder="Ex: 123"
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-red-400"
                      disabled={isSaving}
                    />
                    {isRefiningNumber && (
                      <p className="text-xs text-red-400 mt-1">Refinando posição...</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-red-800 mb-1 block">
                      Ponto de referência
                    </label>
                    <input
                      type="text"
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      placeholder="Ex: próx. ao mercado"
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-red-400"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Pin-vs-number conflict */}
                {showConflict && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-bold text-yellow-800">
                      O número diverge da posição do pin. Qual usar?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConflictChoose('pin')}
                        className="flex-1 py-1.5 text-xs font-bold text-yellow-800 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-50"
                      >
                        Posição do pin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConflictChoose('number')}
                        className="flex-1 py-1.5 text-xs font-bold bg-yellow-400 border border-yellow-400 rounded-lg hover:bg-yellow-500 text-white"
                      >
                        Posição do número
                      </button>
                    </div>
                  </div>
                )}

                {/* Map with draggable pin */}
                {pinCoords && (
                  <div>
                    <p className="text-xs text-red-700 mb-1 font-medium">
                      Arraste o pin para ajuste fino
                    </p>
                    <SimplePreviewMap
                      lat={pinCoords.lat}
                      lng={pinCoords.lng}
                      onLocationChange={handlePinDrag}
                    />
                  </div>
                )}

                {/* Fee calculation */}
                <button
                  type="button"
                  onClick={handleCalculateFee}
                  disabled={!canCalculateFee || isCalculatingFee}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCalculatingFee ? 'Calculando frete...' : 'Calcular Frete'}
                </button>

                {feeInfo && (
                  <div className={`rounded-lg p-3 text-sm space-y-1 ${feeChanged ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                    <p className={`font-bold ${feeChanged ? 'text-amber-800' : 'text-green-800'}`}>
                      Frete calculado: R$ {feeInfo.fee.toFixed(2)}
                      {' '}({feeInfo.distanceKm.toFixed(1)} km)
                    </p>
                    {feeChanged && (
                      <p className="text-xs text-amber-700">
                        ⚠️ Diferente do valor anterior (R$ {originalFee.toFixed(2)}) — será atualizado ao confirmar.
                      </p>
                    )}
                  </div>
                )}

                {addressError && (
                  <p className="text-xs text-red-600 font-bold">{addressError}</p>
                )}

                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={!canSave || isSaving}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Confirmar Endereço'}
                </button>
              </>
            )}

            {!isAddressSelected && addressError && (
              <p className="text-xs text-red-600 font-bold">{addressError}</p>
            )}
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {isLoadingDrivers ? (
              <p className="text-center py-4 text-[#666] text-sm animate-pulse">
                Carregando motoboys...
              </p>
            ) : drivers.length > 0 ? (
              drivers.map(driver => (
                <label
                  key={driver.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E5E7EB] hover:bg-[#F8F7F5] cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-[#0D0D0D]">{driver.full_name}</span>
                    <span className="text-xs text-[#666]">{driver.phone}</span>
                  </div>
                  <input
                    type="radio"
                    name="driver"
                    value={driver.id}
                    checked={selectedDriverId === driver.id}
                    onChange={() => setSelectedDriverId(driver.id)}
                    className="w-4 h-4 accent-[#E85D24]"
                  />
                </label>
              ))
            ) : (
              <p className="text-center py-4 text-[#666] text-sm font-medium">
                Nenhum motoboy online no momento.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-[#666] hover:bg-[#F8F7F5] rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedDriverId}
            className="flex-1 py-3 text-sm font-bold bg-[#E85D24] text-white rounded-xl hover:bg-[#D14D1B] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar saída'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

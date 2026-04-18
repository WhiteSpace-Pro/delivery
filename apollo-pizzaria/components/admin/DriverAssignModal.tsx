'use client'

import { useState, useEffect } from 'react'
import { assignDriverAndSend, getAvailableDrivers, updateOrderAddress } from '@/app/(admin)/actions/order-actions'
import { OrderWithItems, Profile } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SimplePreviewMap } from './SimplePreviewMap'

interface DriverAssignModalProps {
  order: OrderWithItems
  tenantId: string
  onClose: () => void
}

export function DriverAssignModal({ order, onClose }: DriverAssignModalProps) {
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [zipcode, setZipcode] = useState('')
  const [number, setNumber] = useState('')
  const [freeText, setFreeText] = useState('')
  const [searchType, setSearchType] = useState<'cep' | 'freetext'>('cep')
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearchingNom, setIsSearchingNom] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null)

  const deliveryAddress = (order as any).addresses
  const [isValidAddress, setIsValidAddress] = useState(() => {
    if (!deliveryAddress) return true; // If no address (e.g. withdrawal), it's valid
    return deliveryAddress.lat != null && deliveryAddress.lat !== 0 && deliveryAddress.lng != null && deliveryAddress.lng !== 0;
  });

  const handleUpdateAddress = async () => {
    if (searchType === 'cep' && (!zipcode || !number)) {
      setAddressError('Preencha CEP e número')
      return
    }
    if (searchType === 'freetext' && !freeText) {
      setAddressError('Preencha o endereço completo')
      return
    }
    setIsUpdatingAddress(true)
    setAddressError('')
    try {
      if (!order.delivery_address_id) {
        setAddressError('Pedido não tem um endereço vinculado. Cancele e recrie o pedido.')
        setIsUpdatingAddress(false)
        return
      }
      await updateOrderAddress(
        order.id,
        order.delivery_address_id,
        zipcode,
        number,
        searchType === 'freetext' ? selectedCoords?.lat : undefined,
        searchType === 'freetext' ? selectedCoords?.lng : undefined
      )
      setIsValidAddress(true)
    } catch (error: any) {
      setAddressError(error.message || 'Falha ao corrigir endereço')
    } finally {
      setIsUpdatingAddress(false)
    }
  }



  const handleMapDrag = (newLat: number, newLng: number, address?: string) => {
    setSelectedCoords({ lat: newLat, lng: newLng });
    if (address) {
      setFreeText(address);
    }
  }

  useEffect(() => {
    if (searchType !== 'freetext' || freeText.length < 3 || selectedCoords) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingNom(true)
      try {
        const query = encodeURIComponent(`${freeText}, Belo Horizonte, MG`)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`, {
          headers: { 'User-Agent': 'ApolloPizzaria/1.0' }
        })
        const data = await res.json()
        setSuggestions(data || [])
      } catch (err) {
        console.error('Nominatim error', err)
      } finally {
        setIsSearchingNom(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [freeText, searchType, selectedCoords])

  useEffect(() => {
    async function fetchDrivers() {
      try {
        const data = await getAvailableDrivers()
        if (data) setDrivers(data as any)
      } catch (error) {
        console.error('Failed to fetch drivers:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDrivers()
  }, [])

  const handleConfirm = async () => {
    if (!selectedDriverId) return
    setIsSubmitting(true)
    try {
      await assignDriverAndSend(order.id, selectedDriverId)
      onClose()
    } catch (error) {
      console.error('Failed to assign driver:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0D0D0D]">
            Atribuir motoboy — Pedido #${order.display_id || order.id.slice(-4).toUpperCase()}
          </DialogTitle>
        </DialogHeader>


        {deliveryAddress && !isValidAddress ? (
          <div className="py-4 space-y-4 bg-red-50 p-4 rounded-xl border border-red-100">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              ⚠️ Endereço Inválido
            </h3>
            <p className="text-sm text-red-600">
              O endereço do pedido está sem coordenadas (lat/lng).
              Para atribuir um motoboy, corrija o endereço abaixo informando CEP e Número.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 text-xs font-bold text-red-800 cursor-pointer">
                  <input type="radio" checked={searchType === 'cep'} onChange={() => setSearchType('cep')} className="accent-red-600" /> CEP + Número
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-red-800 cursor-pointer">
                  <input type="radio" checked={searchType === 'freetext'} onChange={() => setSearchType('freetext')} className="accent-red-600" /> Texto Livre
                </label>
              </div>

              {searchType === 'cep' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-red-800 mb-1 block">CEP</label>
                    <input
                      type="text"
                      value={zipcode}
                      onChange={e => setZipcode(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                      disabled={isUpdatingAddress}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-red-800 mb-1 block">Número</label>
                    <input
                      type="text"
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      placeholder="Ex: 123"
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                      disabled={isUpdatingAddress}
                    />
                  </div>
                </>
              ) : (
                <div className="relative">
                  <label className="text-xs font-bold text-red-800 mb-1 block">Endereço Completo</label>
                  <input
                    type="text"
                    value={freeText}
                    onChange={e => {
                      setFreeText(e.target.value)
                      setSelectedCoords(null)
                    }}
                    placeholder="Ex: Av Amazonas, 1000, Centro"
                    className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black focus:outline-none focus:border-red-400"
                    disabled={isUpdatingAddress}
                  />
                  {isSearchingNom && (
                    <div className="absolute right-3 top-9">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
                    </div>
                  )}
                  {suggestions.length > 0 && !selectedCoords && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {suggestions.map((s, idx) => (
                        <li
                          key={idx}
                          className="px-4 py-2 hover:bg-red-50 cursor-pointer text-xs text-gray-800 border-b border-gray-100 last:border-0"
                          onClick={() => {
                            setFreeText(s.display_name)
                            setSelectedCoords({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) })
                            setSuggestions([])
                          }}
                        >
                          {s.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {searchType === 'freetext' && selectedCoords && (
                <div className="mt-2 relative">
                  <div className="text-xs font-bold text-green-700 flex justify-between">
                    <span>Localização Encontrada:</span>
                    <button type="button" onClick={() => setSelectedCoords(null)} className="text-gray-500 hover:text-red-500 underline">Alterar</button>
                  </div>
                  <SimplePreviewMap lat={selectedCoords.lat} lng={selectedCoords.lng} onLocationChange={handleMapDrag} />
                </div>
              )}

              {addressError && <p className="text-xs text-red-600 font-bold">{addressError}</p>}

              <button
                onClick={handleUpdateAddress}
                disabled={isUpdatingAddress || (searchType === 'cep' ? (!zipcode || !number) : !selectedCoords)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingAddress ? 'Corrigindo...' : 'Corrigir e Recalcular Frete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {isLoading ? (
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

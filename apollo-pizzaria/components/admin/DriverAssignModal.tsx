'use client'

import { useState, useEffect } from 'react'
import { assignDriverAndSend, getAvailableDrivers, updateOrderAddress, calculateAddressFee } from '@/app/(admin)/actions/order-actions'
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

  const deliveryAddress = (order as any).addresses

  const [searchType, setSearchType] = useState<'cep' | 'map'>('cep')
  const [zipcode, setZipcode] = useState(deliveryAddress?.zipcode || '')
  const [number, setNumber] = useState(deliveryAddress?.number || '')
  const [street, setStreet] = useState(deliveryAddress?.street || '')
  const [neighborhood, setNeighborhood] = useState(deliveryAddress?.neighborhood || '')
  const [complement, setComplement] = useState(deliveryAddress?.complement || '')
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>({ lat: deliveryAddress?.lat || -19.9077, lng: deliveryAddress?.lng || -43.8948 })

  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [isCalculatingFee, setIsCalculatingFee] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [predictedFee, setPredictedFee] = useState<number | null>(null)

  const oldFee = Number(order.delivery_fee) || 0;

  const [isValidAddress, setIsValidAddress] = useState(() => {
    if (!deliveryAddress) return true; // If no address (e.g. withdrawal), it's valid
    return deliveryAddress.lat != null && deliveryAddress.lat !== 0 && deliveryAddress.lng != null && deliveryAddress.lng !== 0;
  });

  const handleUpdateAddress = async () => {
    if (searchType === 'cep' && (!zipcode || !number)) {
      setAddressError('Preencha CEP e número')
      return
    }
    if (searchType === 'map' && (!street || !number || !selectedCoords)) {
      setAddressError('Preencha os dados do mapa e o número')
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
        searchType === 'map' ? selectedCoords?.lat : undefined,
        searchType === 'map' ? selectedCoords?.lng : undefined,
        street,
        neighborhood,
        complement
      )
      setIsValidAddress(true)
    } catch (error: any) {
      setAddressError(error.message || 'Falha ao corrigir endereço')
    } finally {
      setIsUpdatingAddress(false)
    }
  }

  const handleMapDrag = async (newLat: number, newLng: number) => {
    setSelectedCoords({ lat: newLat, lng: newLng });
    try {
      const res = await fetch(`/api/geocode?lat=${newLat}&lng=${newLng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          const parts = data.address.split(',');
          if (parts.length > 0) setStreet(parts[0].trim());
          if (parts.length > 2) setNeighborhood(parts[2].split('-')[0].trim());
        }
      }
    } catch (e) {
      console.error('Failed to reverse geocode', e);
    }
  }

  const calculatePredictedFee = async () => {
    setAddressError('');
    setIsCalculatingFee(true);
    try {
      const fee = await calculateAddressFee({
        street,
        number,
        neighborhood,
        city: 'Belo Horizonte',
        state: 'MG',
        lat: searchType === 'map' ? selectedCoords?.lat : undefined,
        lng: searchType === 'map' ? selectedCoords?.lng : undefined,
        zipcode: searchType === 'cep' ? zipcode : undefined
      });
      setPredictedFee(fee);
    } catch (e: any) {
      setAddressError(e.message || 'Erro ao calcular frete');
    } finally {
      setIsCalculatingFee(false);
    }
  }

  const handleCepChange = async (val: string) => {
    const raw = val.replace(/\D/g, '');
    setZipcode(val);
    if (raw.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro);
          setNeighborhood(data.bairro);
        }
      } catch (e) {
        // ignore
      }
    }
  }

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
      console.error('Failed to assign driver', error)
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

        {!isValidAddress ? (
          <div className="py-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
              <p className="text-sm text-red-800 font-bold mb-1">Endereço inválido ou incompleto</p>
              <p className="text-xs text-red-600 mb-4">Por favor, corrija o endereço antes de despachar o pedido.</p>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-xs font-bold text-red-800 cursor-pointer">
                  <input type="radio" checked={searchType === 'cep'} onChange={() => setSearchType('cep')} className="accent-red-600" /> CEP + Número
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-red-800 cursor-pointer">
                  <input type="radio" checked={searchType === 'map'} onChange={() => setSearchType('map')} className="accent-red-600" /> Mapa
                </label>
              </div>

              {searchType === 'cep' ? (
                <>
                  <div className="mb-2">
                    <label className="text-xs font-bold text-red-800 mb-1 block">CEP</label>
                    <input
                      type="text"
                      value={zipcode}
                      onChange={e => handleCepChange(e.target.value)}
                      placeholder="Ex: 30130-000"
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                      disabled={isUpdatingAddress}
                      maxLength={9}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="text-xs font-bold text-red-800 mb-1 block">Rua</label>
                    <input
                      type="text"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                      disabled={isUpdatingAddress}
                    />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
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
                    <div className="flex-1">
                      <label className="text-xs font-bold text-red-800 mb-1 block">Bairro</label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={e => setNeighborhood(e.target.value)}
                        className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                        disabled={isUpdatingAddress}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-bold text-red-800 mb-1 block">Complemento (opcional)</label>
                    <input
                      type="text"
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                      disabled={isUpdatingAddress}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 relative">
                    <label className="text-xs font-bold text-red-800 mb-1 block">Arraste o pino para o local exato</label>
                    <SimplePreviewMap lat={selectedCoords?.lat || -19.9077} lng={selectedCoords?.lng || -43.8948} onLocationChange={handleMapDrag} />
                  </div>
                  <div className="mb-2 mt-4">
                    <label className="text-xs font-bold text-red-800 mb-1 block">Rua (encontrada no mapa)</label>
                    <input
                      type="text"
                      value={street}
                      onChange={e => setStreet(e.target.value)}
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                      disabled={isUpdatingAddress}
                    />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-red-800 mb-1 block">Número</label>
                      <input
                        type="text"
                        value={number}
                        onChange={e => setNumber(e.target.value)}
                        placeholder="Obrigatório"
                        className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                        disabled={isUpdatingAddress}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-red-800 mb-1 block">Bairro</label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={e => setNeighborhood(e.target.value)}
                        className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                        disabled={isUpdatingAddress}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-bold text-red-800 mb-1 block">Complemento (opcional)</label>
                    <input
                      type="text"
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm text-black"
                      disabled={isUpdatingAddress}
                    />
                  </div>
                </>
              )}

              {addressError && <p className="text-xs text-red-600 font-bold mb-2">{addressError}</p>}

              {predictedFee !== null ? (
                <div className="bg-white rounded-lg p-3 mb-4 text-center border border-red-200">
                  <p className="text-xs text-gray-500 mb-1">
                    {predictedFee === oldFee
                      ? "O frete permanecerá o mesmo:"
                      : `Frete atualizado de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oldFee)} para:`}
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(predictedFee)}
                  </p>
                  <button
                    onClick={() => setPredictedFee(null)}
                    className="text-xs text-gray-400 underline mt-1 hover:text-gray-600"
                  >
                    Recalcular
                  </button>
                </div>
              ) : (
                <button
                  onClick={calculatePredictedFee}
                  disabled={isCalculatingFee || (searchType === 'cep' ? (!zipcode || !number) : (!selectedCoords || !number))}
                  className="w-full py-2 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 mb-2"
                >
                  {isCalculatingFee ? 'Calculando...' : 'Verificar Frete'}
                </button>
              )}

              <button
                onClick={handleUpdateAddress}
                disabled={isUpdatingAddress || predictedFee === null}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingAddress ? 'Corrigindo...' : 'Confirmar e Atualizar Endereço'}
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

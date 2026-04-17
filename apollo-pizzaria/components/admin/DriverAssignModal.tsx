'use client'

import { useState, useEffect } from 'react'
import { assignDriverAndSend, getAvailableDrivers, updateOrderAddress } from '@/app/(admin)/actions/order-actions'
import { OrderWithItems, Profile } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [addressError, setAddressError] = useState('')

  const deliveryAddress = (order as any).addresses
  const [isValidAddress, setIsValidAddress] = useState(() => {
    if (!deliveryAddress) return true; // If no address (e.g. withdrawal), it's valid
    return deliveryAddress.lat != null && deliveryAddress.lat !== 0 && deliveryAddress.lng != null && deliveryAddress.lng !== 0;
  });

  const handleUpdateAddress = async () => {
    if (!zipcode || !number) {
      setAddressError('Preencha CEP e número')
      return
    }
    setIsUpdatingAddress(true)
    setAddressError('')
    try {
      await updateOrderAddress(order.id, deliveryAddress.id, zipcode, number)
      setIsValidAddress(true)
      // Recarregar os motoboys para garantir estado correto e mostrar UI liberada
    } catch (error: any) {
      setAddressError(error.message || 'Falha ao corrigir endereço')
    } finally {
      setIsUpdatingAddress(false)
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
            Atribuir motoboy — Pedido #${order.id.slice(-4)}
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
              <div>
                <label className="text-xs font-bold text-red-800 mb-1 block">CEP</label>
                <input
                  type="text"
                  value={zipcode}
                  onChange={e => setZipcode(e.target.value)}
                  placeholder="00000-000"
                  className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm"
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
                  className="w-full bg-white border border-red-200 rounded-lg p-2.5 text-sm"
                  disabled={isUpdatingAddress}
                />
              </div>

              {addressError && <p className="text-xs text-red-600 font-bold">{addressError}</p>}

              <button
                onClick={handleUpdateAddress}
                disabled={isUpdatingAddress || !zipcode || !number}
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

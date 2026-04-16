'use client'

import { useState, useEffect } from 'react'
import { assignDriverAndSend, getAvailableDrivers } from '@/app/(admin)/actions/order-actions'
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
    if (order.delivery_type === 'delivery') {
      const orderAddress = (order as any).addresses;
      if (!order.delivery_address_id || !orderAddress || orderAddress.lat == null || orderAddress.lng == null) {
        alert('Endereço inválido — entre em contato com o cliente antes de despachar.');
        return;
      }
    }
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

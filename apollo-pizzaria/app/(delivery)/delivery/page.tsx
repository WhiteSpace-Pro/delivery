/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { ConfirmModal } from '@/components/delivery/ConfirmModal'
import { ProblemModal } from '@/components/delivery/ProblemModal'
import { MapPin, Navigation, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const supabase = createClient()

interface DeliveryOrder {
  id: string
  customer_name: string | null
  delivery_instructions: string | null
  total_amount: number
  payment_method: string
  address: {
    street: string
    number: string
    neighborhood: string
    complement: string | null
    lat: number | null
    lng: number | null
  } | null
  items: { quantity: number; product: { name: string } | null }[]
}

interface EtaInfo { km: string; min: string }

export default function DeliveryPage() {
  const { user, profile, isLoading } = useUser()
  const [isOnline, setIsOnline] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [eta, setEta] = useState<Record<string, EtaInfo>>({})
  const [confirmOrder, setConfirmOrder] = useState<DeliveryOrder | null>(null)
  const [problemOrder, setProblemOrder] = useState<DeliveryOrder | null>(null)

  const firstOrder = orders[0]
  const { position, permissionError } = useGPSTracking({
    orderId: firstOrder?.id || '',
    deliveryId: user?.id || '',
    enabled: isOnline && !!firstOrder,
  })

  // Seed online status from profile.is_active
  useEffect(() => {
    if (profile) setIsOnline(!!(profile as any).is_active)
  }, [profile])

  const fetchOrders = useCallback(async () => {
    if (!user) return
    setLoadingOrders(true)
    const { data } = await supabase
      .from('orders')
      .select(`
        id, customer_name, delivery_instructions, total_amount, payment_method,
        address:addresses!orders_delivery_address_id_fkey(street, number, neighborhood, complement, lat, lng),
        items:order_items(quantity, product:products(name))
      `)
      .eq('assigned_delivery_id', user.id)
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'out_for_delivery')
      .order('created_at', { ascending: true })

    if (data) setOrders(data as any)
    setLoadingOrders(false)
  }, [user])

  useEffect(() => {
    if (isOnline) fetchOrders()
    else setOrders([])
  }, [isOnline, fetchOrders])

  // Fetch ETA for each order when position updates
  useEffect(() => {
    if (!position || orders.length === 0) return
    orders.forEach(async (order) => {
      const addr = order.address
      if (!addr?.lat || !addr?.lng) return
      try {
        const res = await fetch(
          `/api/eta?from=${position.lat},${position.lng}&to=${addr.lat},${addr.lng}`
        )
        const data = await res.json()
        if (data.eta_minutes != null) {
          setEta(prev => ({
            ...prev,
            [order.id]: {
              km: data.distance_km?.toFixed(1) || '–',
              min: String(data.eta_minutes),
            },
          }))
        }
      } catch { /* ignore */ }
    })
  }, [position, orders])

  const handleToggleOnline = async () => {
    if (!user) return
    setToggleLoading(true)
    const next = !isOnline
    setIsOnline(next)
    await supabase
      .from('profiles')
      .update({ is_active: next } as never)
      .eq('id', user.id)
    setToggleLoading(false)
    if (next) fetchOrders()
  }

  const handleDeliveryConfirmed = () => {
    setConfirmOrder(null)
    fetchOrders()
  }

  const handleProblemReported = () => {
    setProblemOrder(null)
    fetchOrders()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={40} className="text-[#E85D24] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24">
      {/* ONLINE / OFFLINE Toggle */}
      <button
        onClick={handleToggleOnline}
        disabled={toggleLoading}
        style={{ minHeight: 64 }}
        className={`w-full rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
          isOnline
            ? 'bg-[#E85D24] text-white shadow-[#E85D24]/20'
            : 'bg-[#333] text-white/60'
        }`}
      >
        {toggleLoading
          ? <Loader2 size={22} className="animate-spin" />
          : (
            <>
              <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-white/20'}`} />
              {isOnline ? 'ONLINE — Recebendo entregas' : 'OFFLINE — Toque para ficar online'}
            </>
          )
        }
      </button>

      {permissionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs">
          <AlertTriangle size={14} />
          Permissão de localização negada. Ative o GPS para rastrear.
        </div>
      )}

      {!isOnline ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/20">
          <span className="text-6xl mb-4">🛵</span>
          <p className="font-bold text-white/40">Você está offline</p>
        </div>
      ) : loadingOrders ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="text-[#E85D24] animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <span className="text-5xl mb-4">✅</span>
          <p className="text-white/40 font-bold">Sem entregas atribuídas</p>
          <button onClick={fetchOrders} className="mt-4 flex items-center gap-2 text-xs text-[#E85D24] font-bold">
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, idx) => {
            const etaInfo = eta[order.id]
            const addr = order.address
            const itemsSummary = order.items
              ?.map((i: any) => `${i.quantity}× ${i.product?.name || 'Item'}`)
              .join(', ')

            return (
              <div key={order.id} className="bg-[#0D0D0D] rounded-2xl p-5 border border-white/5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[#E85D24] text-xl font-bold">
                    #{order.id.slice(-4).toUpperCase()}
                  </span>
                  {idx === 0 && position && (
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded-full">
                      GPS ativo
                    </span>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-[#E85D24] mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-white/80">
                    {addr ? (
                      <>
                        <p className="font-bold">{addr.street}, {addr.number}</p>
                        <p className="text-white/50 text-xs">{addr.neighborhood}{addr.complement ? ` • ${addr.complement}` : ''}</p>
                      </>
                    ) : (
                      <p className="text-white/40 italic">{order.delivery_instructions || 'Endereço não informado'}</p>
                    )}
                  </div>
                </div>

                {/* Items */}
                {itemsSummary && (
                  <p className="text-xs text-white/40 line-clamp-2">{itemsSummary}</p>
                )}

                {/* ETA row */}
                {etaInfo && (
                  <div className="bg-white/5 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-white/60">
                    <Navigation size={12} className="text-[#E85D24]" />
                    ~{etaInfo.km} km · ~{etaInfo.min} min
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  {addr?.lat && addr?.lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${addr.lat},${addr.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1C1C1C] border border-white/10 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 hover:border-[#E85D24] transition-colors"
                    >
                      <Navigation size={14} /> Navegar
                    </a>
                  )}

                  <button
                    onClick={() => setConfirmOrder(order)}
                    className="bg-[#E85D24] text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    ✓ Confirmar entrega
                  </button>

                  <button
                    onClick={() => setProblemOrder(order)}
                    className="col-span-2 bg-transparent border border-amber-500/30 text-amber-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-amber-500/10 transition-colors"
                  >
                    <AlertTriangle size={12} /> Reportar problema
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confirmOrder && (
        <ConfirmModal
          orderId={confirmOrder.id}
          deliveryId={user!.id}
          position={position}
          onClose={() => setConfirmOrder(null)}
          onConfirmed={handleDeliveryConfirmed}
        />
      )}

      {problemOrder && (
        <ProblemModal
          orderId={problemOrder.id}
          deliveryId={user!.id}
          position={position}
          onClose={() => setProblemOrder(null)}
          onReported={handleProblemReported}
        />
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { ConfirmModal } from '@/components/delivery/ConfirmModal'
import { MapPin, Navigation, Loader2, Phone, MessageSquare } from 'lucide-react'
import { calculateRouteForDeliveries } from '@/lib/maps/tomtom'
import { Profile } from '@/types'
import { getDeliveryOrders } from '@/app/(admin)/actions/order-actions'
import { updateDriverStatus } from '@/app/(admin)/actions/delivery-actions'

const STORE_COORDS = { lat: -19.9077, lng: -43.8948 }

interface DeliveryOrder {
  id: string
  display_id: string | null
  customer_name: string | null
  customer_phone: string | null
  delivery_instructions: string | null
  total_amount: number
  payment_method: string
  distanceTo?: number
  addresses: {
    street: string
    number: string
    neighborhood: string
    complement: string | null
    lat: number | null
    lng: number | null
  } | null
  order_items: { quantity: number; products: { name: string } | null }[]
}

export default function DeliveryPage() {
  const { user, profile, isLoading } = useUser()
  const [isOnline, setIsOnline] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [confirmOrder, setConfirmOrder] = useState<DeliveryOrder | null>(null)

  const firstOrder = orders[0]
  const { position } = useGPSTracking({
    orderId: firstOrder?.id || '',
    deliveryId: user?.id || '',
    enabled: isOnline,
  })

  useEffect(() => {
    if (profile) setIsOnline(!!(profile as Profile).is_active)
  }, [profile])

  const fetchOrders = useCallback(async () => {
    if (!user) return
    try {
      const data = await getDeliveryOrders()

      if (data) {
         const typedData = data.map((o: any) => ({
           ...o,
           addresses: o['addresses'] || o.addresses, // Standardized property
           order_items: o.order_items?.map((i: any) => ({
             ...i,
             products: i['products!order_items_product_id_fkey'] || i.products
           }))
         })) as unknown as DeliveryOrder[];

         const destinations = typedData
           .filter(o => o.addresses?.lat && o.addresses?.lng)
           .map(o => ({ lat: o.addresses!.lat!, lng: o.addresses!.lng!, orderId: o.id }));

         if (destinations.length > 0) {
            try {
              const routeResult = await calculateRouteForDeliveries(STORE_COORDS, destinations as any);
              const sorted = [...typedData].sort((a, b) => {
                 const idxA = routeResult.route.findIndex(r => (r as any).orderId === a.id);
                 const idxB = routeResult.route.findIndex(r => (r as any).orderId === b.id);
                 return idxA - idxB;
              }).map(o => {
                 const routeInfo = routeResult.route.find(r => (r as any).orderId === o.id);
                 return { ...o, distanceTo: routeInfo ? (routeInfo as any).distanceFromLast : 0 };
              });
              setOrders(sorted);
            } catch (e) {
              console.error("Routing error:", e);
              setOrders(typedData);
            }
         } else {
            setOrders(typedData);
         }
      }
    } catch (error) {
      console.error("Error loading deliveries:", error)
    }
  }, [user])

  useEffect(() => {
    if (isOnline) {
      void fetchOrders()
    } else {
      setOrders([])
    }
  }, [isOnline, fetchOrders])

  const handleToggleOnline = async () => {
    if (!user) return
    setToggleLoading(true)
    try {
      const next = !isOnline
      await updateDriverStatus(next)
      setIsOnline(next)
      if (next) void fetchOrders()
    } catch (error) {
      console.error("Failed to toggle status:", error)
    } finally {
      setToggleLoading(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={40} className="text-[#E85D24] animate-spin" /></div>

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24 px-4 pt-4 font-dm text-white">
      <button onClick={handleToggleOnline} disabled={toggleLoading} className={`w-full h-16 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${isOnline ? 'bg-apollo-orange text-white shadow-lg' : 'bg-zinc-800 text-white/40'}`}>
         {toggleLoading ? <Loader2 className="animate-spin" /> : <><span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-white/10'}`} /> {isOnline ? 'ONLINE' : 'OFFLINE'}</>}
      </button>

      {orders.length === 0 ? (
        <div className="py-20 text-center text-white/20"><p>Nenhuma entrega no momento</p></div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-[#1C1C1C] rounded-3xl p-6 border border-white/5 space-y-5">
              <div className="flex justify-between items-start">
                 <span className="text-2xl font-bold text-apollo-orange italic">#{order.display_id || order.id.slice(0, 8).toUpperCase()}</span>
                 <div className="text-right">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Valor</p>
                    <p className="text-lg font-bold">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</p>
                 </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="text-apollo-orange mt-1 shrink-0" size={20} />
                  <div>
                      <p className="font-bold text-white/90">{order.addresses?.street}, {order.addresses?.number}</p>
                      <p className="text-sm text-white/50">{order.addresses?.neighborhood}</p>
                  </div>
                </div>

                <div className="pl-8 space-y-1">
                  <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Cliente</p>
                  <p className="font-bold text-white/90">{order.customer_name ?? 'Não informado'}</p>

                  {order.customer_phone && (
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-sm font-medium text-white/70">{order.customer_phone}</span>
                      <div className="flex gap-2">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="p-2 bg-zinc-800 text-apollo-orange rounded-lg hover:bg-zinc-700 transition-colors"
                          title="Ligar"
                        >
                          <Phone size={16} />
                        </a>
                        <a
                          href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-zinc-800 text-green-500 rounded-lg hover:bg-zinc-700 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageSquare size={16} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                 {['cash', 'debit_card', 'credit_card'].includes(order.payment_method) ? (
                   <span className="bg-apollo-orange/10 border border-apollo-orange text-apollo-orange px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">COBRAR {order.payment_method === 'cash' ? 'DINHEIRO' : 'CARTÃO'}</span>
                 ) : (
                   <span className="bg-green-500/10 border border-green-500 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">PAGO PIX</span>
                 )}
                 {order.distanceTo != null && <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-bold text-white/40">~{(order.distanceTo / 1000).toFixed(1)} km</span>}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                 <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.addresses?.lat},${order.addresses?.lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 text-white font-bold py-4 rounded-2xl text-xs flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all"><Navigation size={14} /> NAVEGAR</a>
                 <button onClick={() => setConfirmOrder(order)} className="bg-apollo-orange text-white font-bold py-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-apollo-orange/20 transition-all">✓ ENTREGUE</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmOrder && <ConfirmModal orderId={confirmOrder.id} deliveryId={user!.id} position={position} onClose={() => setConfirmOrder(null)} onConfirmed={() => { setConfirmOrder(null); void fetchOrders(); }} />}
    </div>
  )
}

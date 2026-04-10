'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { ConfirmModal } from '@/components/delivery/ConfirmModal'
import { MapPin, Navigation, Loader2 } from 'lucide-react'
import { calculateRouteForDeliveries } from '@/lib/maps/tomtom'
import { Profile } from '@/types'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
const STORE_COORDS = { lat: -19.9077, lng: -43.8948 }
const supabase = createClient()

interface DeliveryOrder {
  id: string
  customer_name: string | null
  delivery_instructions: string | null
  total_amount: number
  payment_method: string
  distanceTo?: number
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
    enabled: isOnline && !!firstOrder,
  })

  useEffect(() => {
    if (profile) setIsOnline(!!(profile as Profile).is_active)
  }, [profile])

  const fetchOrders = useCallback(async () => {
    if (!user) return
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

    if (data) {
       const typedData = data as unknown as DeliveryOrder[];
       const destinations = typedData
         .filter(o => o.address?.lat && o.address?.lng)
         .map(o => ({ lat: o.address!.lat!, lng: o.address!.lng!, orderId: o.id }));

       if (destinations.length > 0) {
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
       } else {
          setOrders(typedData);
       }
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
    const next = !isOnline
    setIsOnline(next)
    await supabase.from('profiles').update({ is_active: next } as any).eq('id', user.id)
    setToggleLoading(false)
    if (next) void fetchOrders()
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 size={40} className="text-[#E85D24] animate-spin" /></div>

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24 px-4 pt-4 font-dm">
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
                 <span className="text-2xl font-bold text-apollo-orange italic">#{order.id.slice(-4).toUpperCase()}</span>
                 <div className="text-right">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Valor</p>
                    <p className="text-lg font-bold">R$ {order.total_amount.toFixed(2).replace('.', ',')}</p>
                 </div>
              </div>

              <div className="flex items-start gap-3">
                 <MapPin className="text-apollo-orange mt-1 shrink-0" size={20} />
                 <div>
                    <p className="font-bold text-white/90">{order.address?.street}, {order.address?.number}</p>
                    <p className="text-sm text-white/50">{order.address?.neighborhood}</p>
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
                 <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.address?.lat},${order.address?.lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 text-white font-bold py-4 rounded-2xl text-xs flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all"><Navigation size={14} /> NAVEGAR</a>
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

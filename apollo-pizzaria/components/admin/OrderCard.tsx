/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { OrderWithItems } from '@/types'
import { cn } from '@/lib/utils'
import { Clock, ChevronRight } from 'lucide-react'

interface OrderCardProps {
  order: OrderWithItems

  onOpenDetail: () => void
  onMoveToNext: () => void
}

export function OrderCard({ order, onOpenDetail, onMoveToNext }: OrderCardProps) {
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [stageMinutes, setStageMinutes] = useState(0)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: order.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now()
      const start = new Date(order.created_at || '').getTime()
      setTotalMinutes(Math.floor((now - start) / 60000))

      const anyOrder = order as any
      let stageStart = order.created_at
      if (order.status === 'confirmed' && anyOrder.confirmed_at) stageStart = anyOrder.confirmed_at
      if (order.status === 'preparing' && anyOrder.preparing_at) stageStart = anyOrder.preparing_at
      if (order.status === 'ready' && anyOrder.ready_at) stageStart = anyOrder.ready_at
      if (order.status === 'out_for_delivery' && anyOrder.dispatched_at) stageStart = anyOrder.dispatched_at
      if (order.status === 'delivered' && anyOrder.delivered_at) stageStart = anyOrder.delivered_at

      const stageDiff = now - new Date(stageStart || '').getTime()
      setStageMinutes(Math.floor(stageDiff / 60000))
    }

    calculateTime()
    const interval = setInterval(calculateTime, 60000)
    return () => clearInterval(interval)
  }, [order])

  const getDelayInfo = () => {
    const limits: Record<string, number> = {
      pending: 5,
      confirmed: 5,
      preparing: 20,
      ready: 10,
      out_for_delivery: 40,
      delivered: 999999
    }
    const limit = limits[order.status] || 20
    const isDelayed = stageMinutes >= limit
    return { isDelayed }
  }

  const { isDelayed } = getDelayInfo()

  const itemsSummary = order.order_items
    ?.map(item => {
      const product = (item as any)['products!order_items_product_id_fkey'] || (item as any).products
      const productName = product?.name ?? `Item #${item.product_id?.slice(-4)}`
      return `${item.quantity}× ${productName}${item.size ? ' ' + item.size : ''}`
    })
    .join(', ')

  const actionLabels: Record<string, string> = {
    pending: '✓ Confirmar',
    confirmed: '🍕 Preparar',
    preparing: '✅ Pronto',
    ready: '🛵 Saiu',
    out_for_delivery: '✓ Entregue',
  }

  const isAwaitingCollection = order.payment_status === ('awaiting_collection' as any)
  const isPixPending = order.payment_method === 'pix' && order.payment_status === 'pending'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-lg shadow-sm border border-[#E5E7EB] p-3 group relative cursor-default select-none",
        isDelayed ? "border-l-[3px] border-l-[#ef4444]" : "border-l-[3px] border-l-[#22c55e]"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-[#0D0D0D] text-base" {...attributes} {...listeners}>
          {(order as any).display_id || order.id.slice(-4)}
        </span>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-1 text-[#666] text-[10px]">
              <Clock size={10} />
              há {totalMinutes} min
            </div>
            <div className="text-[9px] text-[#999] font-medium">
              nesta etapa há {stageMinutes} min
            </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
         {isPixPending && (order as any).pix_receipt_note && (
           <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
             PIX — Comprovante enviado
           </span>
         )}
         {isPixPending && !(order as any).pix_receipt_note && (
           <span className="bg-yellow-100 text-yellow-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
             PIX — Aguardando comprovante
           </span>
         )}
         {isAwaitingCollection && (
           <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
             A cobrar
           </span>
         )}
      </div>

      <p className="text-[#0D0D0D] text-sm font-bold line-clamp-2 mb-3 leading-relaxed">
        {itemsSummary}
      </p>

      <div className="flex justify-between items-center mt-auto">
        <div className="flex flex-col">
          <span className="font-bold text-[#0D0D0D] text-sm">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.total_amount) || 0)}
          </span>
          <span className="text-[9px] text-[#666] font-bold uppercase tracking-tighter">
            {order.payment_method === 'pix' ? 'PIX' :
             order.payment_method === 'cash' ? 'Dinheiro' : 'Cartão'}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
            className="p-1.5 rounded-md hover:bg-[#F8F7F5] text-[#666] transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          {actionLabels[order.status] && (
            <button
              disabled={order.status === "pending" && isPixPending}
              onClick={(e) => { e.stopPropagation(); onMoveToNext(); }}
              title={order.status === "pending" && isPixPending ? ((order as any).pix_receipt_note ? "Abra o pedido para confirmar o pagamento PIX" : "Abra o pedido para confirmar ou solicitar reenvio") : ""}
              className={cn(
                "bg-[#E85D24] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-md hover:bg-[#D14D1B] transition-colors",
                (order.status === "pending" && isPixPending) && "opacity-50 cursor-not-allowed"
              )}
            >
              {actionLabels[order.status]}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

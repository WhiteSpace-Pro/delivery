/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderWithItems } from '@/types'
import { OrderStatus } from '@/types/enums'
import { OrderDetailModal } from './OrderDetailModal'
import { DriverAssignModal } from './DriverAssignModal'
import { playNotificationSound } from '@/lib/audio'
import { updateOrderStatus, getKanbanOrders } from '@/app/(admin)/actions/order-actions'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { DroppableColumn } from './DroppableColumn'

const supabaseModule = createClient()

const COLUMNS: { key: OrderStatus; label: string; color: string }[] = [
  { key: 'pending', label: 'Novo', color: 'bg-red-500' },
  { key: 'confirmed', label: 'Confirmado', color: 'bg-blue-500' },
  { key: 'preparing', label: 'Preparando', color: 'bg-yellow-500' },
  { key: 'ready', label: 'Pronto', color: 'bg-green-400' },
  { key: 'out_for_delivery', label: 'Saiu', color: 'bg-orange-500' },
  { key: 'delivered', label: 'Entregue', color: 'bg-green-700' },
]

export function OrderKanban({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [pendingReceipts, setPendingReceipts] = useState<Set<string>>(new Set())
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const [assignModalOrder, setAssignModalOrder] = useState<OrderWithItems | null>(null)

  const supabase = supabaseModule

  const fetchInitialData = useCallback(async () => {
    try {
      const ordersData = await getKanbanOrders()
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

      if (ordersData) {
        const filtered = (ordersData as any[]).filter(o => {
          // NOVO (pending): Apenas PIX com comprovante enviado (pix_receipt_note != null) ou < 2h
          if (o.status === 'pending') {
            if (o.payment_method === 'pix') {
              const isRecent = new Date(o.created_at).getTime() >= twoHoursAgo.getTime()
              return !!o.pix_receipt_note || isRecent
            }
          }
          return true
        })
        setOrders(filtered)
      }

      const { data: notifications } = await supabase
        .from('notifications')
        .select('order_id' as any)
        .eq('tenant_id', tenantId)
        .in('type' as any, ['order_status', 'delivery_approaching'])
        .eq('is_read' as any, false)

      if (notifications) {
        setPendingReceipts(new Set(notifications.map((n: any) => n.order_id)))
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }, [tenantId, supabase])

  useEffect(() => {
    fetchInitialData()

    const ordersChannel = supabase.channel(`orders:${tenantId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      }, async (payload) => {
        // Fetch full order data on insert to ensure joins are present and avoid PGRST201
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items(*, products!order_items_product_id_fkey(name, type)),
            addresses(*),
            customer:profiles!orders_customer_id_fkey(full_name, phone),
            delivery:profiles!orders_assigned_delivery_id_fkey(full_name, phone)
          `)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          setOrders(prev => [data as any, ...prev])
          if (data.status === 'pending' || data.status === 'confirmed') playNotificationSound()
        } else if (error) {
          console.error('Error fetching new order on realtime:', error)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      }, async (payload) => {
         // Keep local consistency. Realtime updates might not include joins.
         setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [tenantId, supabase, fetchInitialData])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const orderId = active.id as string
    const newStatus = over.id as OrderStatus
    const order = orders.find(o => o.id === orderId)

    if (!order || order.status === newStatus) return
    if (newStatus === 'out_for_delivery') {
      setAssignModalOrder(order)
      return
    }

    const oldStatus = order.status
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))

    try {
      await updateOrderStatus(orderId, newStatus)
    } catch (error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: oldStatus } : o))
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  return (
    <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-300">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 min-w-max p-1">
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col.key}
              id={col.key}
              title={col.label}
              color={col.color}
              orders={orders.filter(o => o.status === col.key)}
              pendingReceipts={pendingReceipts}
              onOpenDetail={setSelectedOrder}
              onMoveToNext={(orderToMove) => {
                 const currentIdx = COLUMNS.findIndex(c => c.key === orderToMove.status);
                 const nextStatusIdx = currentIdx + 1;
                 if (nextStatusIdx < COLUMNS.length) {
                   const nextStatus = COLUMNS[nextStatusIdx].key;
                   if (nextStatus === 'out_for_delivery') {
                     setAssignModalOrder(orderToMove);
                   } else {
                     void updateOrderStatus(orderToMove.id, nextStatus);
                   }
                 }
              }}
            />
          ))}
        </div>
      </DndContext>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          hasPendingReceipt={pendingReceipts.has(selectedOrder.id)}
          onReceiptVerified={(id) => {
            setPendingReceipts(prev => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          }}
        />
      )}

      {assignModalOrder && (
        <DriverAssignModal
          order={assignModalOrder}
          tenantId={tenantId}
          onClose={() => setAssignModalOrder(null)}
        />
      )}
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderWithItems } from '@/types'
import { OrderStatus } from '@/types/enums'
import { OrderDetailModal } from './OrderDetailModal'
import { DriverAssignModal } from './DriverAssignModal'
import { playNotificationSound } from '@/lib/audio'
import { updateOrderStatus } from '@/app/(admin)/actions/order-actions'
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

  const supabase = createClient()

  const fetchInitialData = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, order_items(*), profiles!orders_customer_id_fkey(*)')
      .eq('tenant_id', tenantId)
      .gte('created_at', today.toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (ordersData) {
      setOrders(ordersData as unknown as OrderWithItems[])
    }

    const { data: notifications } = await supabase
      .from('notifications')
      .select('order_id' as any)
      .eq('tenant_id', tenantId)
      .eq('type' as any, 'receipt_uploaded')
      .eq('is_read' as any, false)

    if (notifications) {
      setPendingReceipts(new Set(notifications.map((n: any) => n.order_id)))
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
        const { data } = await supabase
          .from('orders')
          .select('*, order_items(*), profiles!orders_customer_id_fkey(*)')
          .eq('id', payload.new.id)
          .single()

        if (data) {
          setOrders(prev => [...prev, data as unknown as OrderWithItems])
          if (data.status === 'pending') playNotificationSound()
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
      })
      .subscribe()

    const notificationsChannel = supabase.channel(`notifications:${tenantId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        if (payload.new.type === 'receipt_uploaded') {
          setPendingReceipts(prev => new Set(prev).add(payload.new.order_id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(notificationsChannel)
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
    <div className="overflow-x-auto pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 min-w-max">
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
                 const nextStatusIdx = COLUMNS.findIndex(c => c.key === orderToMove.status) + 1;
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

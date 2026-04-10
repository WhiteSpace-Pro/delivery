'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { OrderWithItems } from '@/types'
import { OrderCard } from './OrderCard'

interface DroppableColumnProps {
  id: string
  title: string
  color: string
  orders: OrderWithItems[]
  pendingReceipts: Set<string>
  onOpenDetail: (order: OrderWithItems) => void
  onMoveToNext: (order: OrderWithItems) => void
}

export function DroppableColumn({ id, title, color, orders, pendingReceipts, onOpenDetail, onMoveToNext }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col w-[300px] bg-[#F1F0EE] rounded-xl p-3 min-h-[500px]"
    >
      <header className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="font-bold text-[#0D0D0D] text-sm uppercase tracking-wider">{title}</h3>
        <span className="ml-auto bg-white/50 text-[#666] text-xs font-bold px-2 py-0.5 rounded-full">
          {orders.length}
        </span>
      </header>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              hasPendingReceipt={pendingReceipts.has(order.id)}
              onOpenDetail={() => onOpenDetail(order)}
              onMoveToNext={() => onMoveToNext(order)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

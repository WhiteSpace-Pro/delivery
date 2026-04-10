/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  MapPin,
  Phone,
  User,
  Receipt,
  Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { OrderWithItems } from '@/types'
import { cn } from '@/lib/utils'

interface OrderDetailModalProps {
  order: OrderWithItems
  onClose: () => void
  hasPendingReceipt?: boolean
  onReceiptVerified?: (id: string) => void
}

export function OrderDetailModal({ order, onClose, onReceiptVerified }: OrderDetailModalProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchFullDetails() {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products!order_items_product_id_fkey (*),
            half_product:products!order_items_half_product_id_fkey (*),
            edge:edge_options (*)
          ),
          address:addresses (*)
        `)
        .eq('id', order.id)
        .single()

      if (data) setDetails(data)
      setLoading(false)
    }

    void fetchFullDetails()
  }, [order.id, supabase])

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    setIsUpdating(true)
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: newStatus as any } as any)
      .eq('id', order.id)

    if (!error) {
      setDetails((prev: any) => ({ ...prev, payment_status: newStatus }))
      if (newStatus === 'paid' && onReceiptVerified) onReceiptVerified(order.id)
    }
    setIsUpdating(false)
  }

  const handleConfirmPix = async () => {
    setIsUpdating(true)
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: ('paid' as any), status: 'confirmed' } as any)
      .eq('id', order.id)

    if (!error) {
      setDetails((prev: any) => ({ ...prev, payment_status: ('paid' as any), status: 'confirmed' }))
      if (onReceiptVerified) onReceiptVerified(order.id)
    }
    setIsUpdating(false)
  }

  if (!order) return null

  const paymentStatusLabels: Record<string, string> = {
    pending: 'Aguardando confirmação',
    awaiting_collection: 'A cobrar (motoboy)',
    collected: 'Coletado pelo motoboy',
    paid: 'Pago'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#F3F4F6] flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-[#0D0D0D]">Pedido #{order.id.slice(-8).toUpperCase()}</h2>
            <p className="text-sm text-[#666]">
              {new Date(order.created_at || "").toLocaleString('pt-BR')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3F4F6] rounded-full text-[#666] transition-colors"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-apollo-orange" size={40} /></div>
          ) : (
            <>
              <section className="space-y-4">
                <h3 className="font-bold flex items-center gap-2"><User size={18} className="text-apollo-orange" /> Cliente</h3>
                <div className="bg-[#F8F7F5] p-4 rounded-xl space-y-1 border border-[#E5E7EB]">
                   <p className="font-bold text-lg">{details.customer_name || 'Cliente'}</p>
                   <p className="text-sm text-[#666] flex items-center gap-2"><Phone size={14} /> {details.customer_phone}</p>
                   <div className="pt-2 mt-2 border-t border-[#E5E7EB] flex gap-2">
                      <MapPin size={16} className="text-apollo-orange shrink-0 mt-0.5" />
                      <div className="text-sm">
                         <p className="font-semibold">{details.address?.street}, {details.address?.number}</p>
                         <p className="text-xs text-[#666]">{details.address?.neighborhood} {details.address?.complement ? ` • ${details.address.complement}` : ''}</p>
                         <p className="text-xs text-[#666]">{details.address?.city}, {details.address?.state}</p>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-4">
                 <h3 className="font-bold">Itens</h3>
                 <div className="space-y-3">
                    {details.order_items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="flex gap-3">
                           <span className="font-bold text-apollo-orange">{item.quantity}×</span>
                           <div>
                              <p className="font-bold">{item.is_half ? `${item.product?.name} / ${item.half_product?.name}` : item.product?.name}</p>
                              <p className="text-[10px] text-[#666] font-bold uppercase">{item.size} {item.edge ? `• Borda ${item.edge.name}` : ''}</p>
                              {item.observations && <p className="text-xs text-apollo-orange italic mt-1 font-medium">{item.observations}</p>}
                           </div>
                        </div>
                        <span className="font-bold">R$ {(item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                 </div>
              </section>

              <section className="bg-[#F8F7F5] p-6 rounded-2xl border border-[#E5E7EB] space-y-3">
                 <div className="flex justify-between text-sm"><span className="text-[#666]">Subtotal</span><span className="font-bold">R$ {details.subtotal.toFixed(2).replace('.', ',')}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-[#666]">Taxa de entrega</span><span className="font-bold">R$ {details.delivery_fee.toFixed(2).replace('.', ',')}</span></div>
                 <div className="h-px bg-[#E5E7EB] my-2" />
                 <div className="flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="text-2xl font-bold text-apollo-orange italic">R$ {details.total_amount.toFixed(2).replace('.', ',')}</span>
                 </div>
                 <div className="pt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                       <p className="text-xs font-bold text-[#666] uppercase">{details.payment_method === 'pix' ? '⚡ PIX' : details.payment_method === 'cash' ? '💵 Dinheiro' : '💳 Cartão'}</p>
                       <span className={cn("text-[10px] font-bold px-2 py-1 rounded uppercase", details.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600")}>
                          {paymentStatusLabels[details.payment_status] || details.payment_status}
                       </span>
                    </div>
                 </div>
              </section>

              {details.pix_receipt_note && (
                <section className="space-y-4">
                   <h3 className="font-bold flex items-center gap-2"><Receipt size={18} className="text-apollo-orange" /> Comprovante PIX</h3>
                   <div className="rounded-xl overflow-hidden border border-[#E5E7EB]">
                      <img src={details.pix_receipt_note} alt="Comprovante" className="w-full h-auto cursor-pointer" onClick={() => window.open(details.pix_receipt_note, '_blank')} />
                   </div>
                   {details.payment_status === 'pending' && (
                     <button onClick={handleConfirmPix} disabled={isUpdating} className="w-full py-4 bg-apollo-orange text-white font-bold rounded-xl shadow-lg">Confirmar Pagamento</button>
                   )}
                </section>
              )}

              {details.payment_status === ('awaiting_collection' as any) && details.status === 'delivered' && (
                <button onClick={() => handleUpdatePaymentStatus('collected')} disabled={isUpdating} className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl">Confirmar Recebimento (Motoboy)</button>
              )}
              {details.payment_status === ('collected' as any) && (
                <button onClick={() => handleUpdatePaymentStatus('paid')} disabled={isUpdating} className="w-full py-4 bg-green-500 text-white font-bold rounded-xl">Dar Baixa (Caixa)</button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

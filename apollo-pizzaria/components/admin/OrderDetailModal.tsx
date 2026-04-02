/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { OrderWithItems } from '@/types'
import { cn } from '@/lib/utils'
import { X, Clock, MapPin, User, Phone, Receipt, CheckCircle2, Download, AlertTriangle } from 'lucide-react'
import { getReceiptSignedUrl, markNotificationAsRead, cancelOrder } from '@/app/(admin)/actions/order-actions'
import { motion } from 'framer-motion'

interface OrderDetailModalProps {
  order: OrderWithItems
  onClose: () => void
  hasPendingReceipt: boolean
  onReceiptVerified: (id: string) => void
}

export function OrderDetailModal({ order, onClose, hasPendingReceipt, onReceiptVerified }: OrderDetailModalProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const orderAny = order as any;
  const receiptPath = orderAny.receipt_url || orderAny.pix_receipt_url;

  useEffect(() => {
    if (receiptPath) {
      getReceiptSignedUrl(receiptPath).then(setReceiptUrl).catch(console.error)
    }
  }, [receiptPath])

  const handleVerifyReceipt = async () => {
    setIsVerifying(true)
    try {
      await markNotificationAsRead(order.id)
      onReceiptVerified(order.id)
    } catch (error) {
      console.error('Failed to verify receipt:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCancelOrder = async () => {
    try {
      await cancelOrder(order.id)
      onClose()
    } catch (error) {
      console.error('Failed to cancel order:', error)
    }
  }

  const statusSteps = [
    { key: 'pending', label: 'Pendente' },
    { key: 'confirmed', label: 'Confirmado' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'ready', label: 'Pronto' },
    { key: 'out_for_delivery', label: 'Saiu' },
    { key: 'delivered', label: 'Entregue' }
  ]

  const currentStatusIdx = statusSteps.findIndex(s => s.key === order.status)

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-[480px] bg-white h-full shadow-2xl flex flex-col"
      >
        <header className="p-6 border-b border-[#E5E7EB] flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-[#0D0D0D]">#${order.id.slice(-4)}</h2>
              <span className="bg-[#F8F7F5] text-[#666] text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                {order.status}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#666] text-sm">
              <Clock size={14} />
              há ${Math.floor((Date.now() - new Date(order.created_at || '').getTime()) / 60000)} min
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F7F5] rounded-full transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Timeline */}
          <section>
            <div className="flex justify-between relative">
              <div className="absolute top-[11px] left-0 right-0 h-[2px] bg-[#E5E7EB]" />
              {statusSteps.map((step, idx) => (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full border-4 border-white flex items-center justify-center transition-colors",
                    idx <= currentStatusIdx ? "bg-[#E85D24]" : "bg-[#E5E7EB]"
                  )}>
                    {idx < currentStatusIdx && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tighter",
                    idx <= currentStatusIdx ? "text-[#E85D24]" : "text-[#666]"
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Customer */}
          <section className="space-y-4">
            <h3 className="font-bold text-[#0D0D0D] flex items-center gap-2">
              <User size={18} className="text-[#E85D24]" />
              Cliente
            </h3>
            <div className="bg-[#F8F7F5] p-4 rounded-xl space-y-2">
              <p className="font-bold text-[#0D0D0D]">{order.profiles?.full_name}</p>
              <p className="text-sm text-[#666] flex items-center gap-2">
                <Phone size={14} />
                {order.profiles?.phone}
              </p>
              <div className="pt-2 mt-2 border-t border-[#E5E7EB] flex gap-2">
                <MapPin size={16} className="text-[#E85D24] shrink-0 mt-0.5" />
                <div className="text-sm text-[#374151]">
                  <p className="font-semibold">{orderAny.delivery_address}</p>
                  <p className="text-xs text-[#666]">{orderAny.delivery_neighborhood}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="space-y-4">
            <h3 className="font-bold text-[#0D0D0D]">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <span className="font-bold text-[#E85D24]">{item.quantity}×</span>
                    <div>
                      <p className="font-bold text-[#0D0D0D] text-sm">Item #${item.product_id?.slice(-4)}</p>
                      {item.size && <p className="text-[10px] text-[#666] uppercase">Tamanho: {item.size}</p>}
                      {item.edge_option_id && <p className="text-[10px] text-[#666]">Borda: ${item.edge_option_id.slice(-4)}</p>}
                      {item.observations && <p className="text-xs text-[#E85D24] italic mt-1 font-medium">{item.observations}</p>}
                    </div>
                  </div>
                  <span className="font-bold text-[#0D0D0D] text-sm">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Financial */}
          <section className="bg-[#F8F7F5] p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#666]">Subtotal</span>
              <span className="text-[#0D0D0D] font-medium">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((order.total_amount || 0) - (order.delivery_fee || 0))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666]">Taxa de entrega</span>
              <span className="text-[#0D0D0D] font-medium">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.delivery_fee || 0)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E5E7EB]">
              <span className="font-bold text-[#0D0D0D]">Total</span>
              <span className="font-bold text-[#E85D24] text-lg">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount || 0)}
              </span>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#666]">{order.payment_method}</span>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                order.payment_status === 'paid' ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#666]/10 text-[#666]"
              )}>
                {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </section>

          {/* Receipt */}
          {receiptUrl && (
            <section className="space-y-4">
              <h3 className="font-bold text-[#0D0D0D] flex items-center gap-2">
                <Receipt size={18} className="text-[#E85D24]" />
                Comprovante Pix
              </h3>
              <div className="relative group rounded-xl overflow-hidden border border-[#E5E7EB]">
                <img
                  src={receiptUrl}
                  alt="Comprovante"
                  className="w-full h-48 object-cover cursor-pointer"
                  onClick={() => window.open(receiptUrl, '_blank')}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <a
                    href={`${receiptUrl}&download=true`}
                    className="p-2 bg-white rounded-full text-[#0D0D0D] hover:scale-110 transition-transform"
                    title="Baixar"
                  >
                    <Download size={20} />
                  </a>
                </div>
              </div>
              {hasPendingReceipt && (
                <button
                  onClick={handleVerifyReceipt}
                  disabled={isVerifying}
                  className="w-full py-3 bg-[#f59e0b] text-white font-bold rounded-xl hover:bg-[#d97706] transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  {isVerifying ? 'Verificando...' : 'Marcar como verificado'}
                </button>
              )}
            </section>
          )}

          {/* Actions */}
          <section className="pt-8 flex flex-col gap-3">
             {showCancelConfirm ? (
               <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
                 <p className="text-sm text-red-600 font-bold flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Tem certeza? Esta ação não pode ser desfeita.
                 </p>
                 <div className="flex gap-2">
                   <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 text-xs font-bold text-[#666] bg-white border border-[#E5E7EB] rounded-lg"
                   >
                     Voltar
                   </button>
                   <button
                    onClick={handleCancelOrder}
                    className="flex-1 py-2 text-xs font-bold text-white bg-red-500 rounded-lg"
                   >
                     Sim, cancelar
                   </button>
                 </div>
               </div>
             ) : (
               <button
                 onClick={() => setShowCancelConfirm(true)}
                 className="w-full py-3 text-[#ef4444] font-bold text-sm hover:bg-red-50 rounded-xl transition-colors"
               >
                 Cancelar pedido
               </button>
             )}
          </section>
        </div>
      </motion.div>
    </div>
  )
}

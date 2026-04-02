/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { OrderWithItems } from '@/types'
import { cn } from '@/lib/utils'
import { X, Clock, MapPin, User, Phone, Receipt, CheckCircle2, Download, AlertTriangle } from 'lucide-react'
import { getReceiptSignedUrl, markNotificationAsRead, cancelOrder } from '@/app/(admin)/actions/order-actions'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface OrderDetailModalProps {
  order: OrderWithItems
  onClose: () => void
  hasPendingReceipt: boolean
  onReceiptVerified: (id: string) => void
}

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

export function OrderDetailModal({ order, onClose, hasPendingReceipt, onReceiptVerified }: OrderDetailModalProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function fetchFullDetails() {
      setLoading(true)
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!orders_customer_id_fkey(full_name, phone),
          address:addresses!orders_delivery_address_id_fkey(*),
          items:order_items(
            *,
            product:products(name, type),
            half_product:products!order_items_half_product_id_fkey(name),
            edge:pizza_options(name)
          )
        `)
        .eq('id', order.id)
        .eq('tenant_id', TENANT_ID)
        .single()

      if (orderData) {
        setDetails(orderData)
        const anyOrder = orderData as any
        if (anyOrder.receipt_url) {
          getReceiptSignedUrl(anyOrder.receipt_url).then(setReceiptUrl).catch(console.error)
        }
      }
      setLoading(false)
    }
    fetchFullDetails()
  }, [order.id, supabase])

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

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '–'
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const statusSteps = [
    { key: 'pending', label: 'Recebido', time: details?.created_at },
    { key: 'confirmed', label: 'Confirmado', time: details?.confirmed_at },
    { key: 'preparing', label: 'Preparando', time: details?.preparing_at },
    { key: 'ready', label: 'Pronto', time: details?.ready_at },
    { key: 'out_for_delivery', label: 'Saiu', time: details?.dispatched_at },
    { key: 'delivered', label: 'Entregue', time: details?.delivered_at }
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
        className="relative w-full max-w-[480px] bg-white h-full shadow-2xl flex flex-col text-[#0D0D0D]"
      >
        <header className="p-6 border-b border-[#E5E7EB] flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold">#{order.id.slice(-4)}</h2>
              <span className="bg-[#F8F7F5] text-[#666] text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                {order.status}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[#666] text-sm">
              <Clock size={14} />
              há {Math.floor((Date.now() - new Date(order.created_at || '').getTime()) / 60000)} min
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F8F7F5] rounded-full transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 text-[#666]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E85D24] mb-2" />
              <p className="text-sm">Carregando detalhes...</p>
            </div>
          ) : (
            <>
              <section>
                <div className="flex justify-between relative">
                  <div className="absolute top-[11px] left-0 right-0 h-[2px] bg-[#E5E7EB]" />
                  {statusSteps.map((step, idx) => (
                    <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full border-4 border-white flex items-center justify-center transition-colors",
                        idx <= currentStatusIdx ? (idx === currentStatusIdx ? "bg-amber-500" : "bg-[#22c55e]") : "bg-[#E5E7EB]"
                      )}>
                        {idx < currentStatusIdx ? <CheckCircle2 size={12} className="text-white" /> : (idx === currentStatusIdx && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />)}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-tighter",
                          idx <= currentStatusIdx ? (idx === currentStatusIdx ? "text-amber-500" : "text-[#22c55e]") : "text-[#666]"
                        )}>
                          {step.label}
                        </span>
                        <span className="text-[8px] text-[#999] font-medium">{formatTime(step.time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <User size={18} className="text-[#E85D24]" />
                  Cliente
                </h3>
                <div className="bg-[#F8F7F5] p-4 rounded-xl space-y-2 border border-[#E5E7EB]">
                  <p className="font-bold">
                    {details?.customer?.full_name || 'Cliente anônimo'}
                  </p>
                  {details?.customer?.phone && (
                    <p className="text-sm text-[#666] flex items-center gap-2">
                      <Phone size={14} />
                      {details.customer.phone}
                    </p>
                  )}
                  <div className="pt-2 mt-2 border-t border-[#E5E7EB] flex gap-2">
                    <MapPin size={16} className="text-[#E85D24] shrink-0 mt-0.5" />
                    <div className="text-sm text-[#374151]">
                      {details?.address ? (
                        <>
                          <p className="font-semibold">{details.address.street}, {details.address.number}</p>
                          <p className="text-xs text-[#666]">
                            {details.address.neighborhood}
                            {details.address.complement && ` • ${details.address.complement}`}
                            {' • Taxa '}
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.address.delivery_fee || 0)}
                          </p>
                        </>
                      ) : (
                        <div>
                          <p className="italic text-[#666]">
                            {details?.delivery_type === 'pickup' ? 'Retirada na loja' : (details?.delivery_instructions || 'Endereço não informado')}
                          </p>
                          {details?.delivery_fee > 0 && (
                            <p className="text-xs text-[#666] font-medium mt-0.5">Taxa R$ {details.delivery_fee.toFixed(2).replace('.', ',')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="font-bold">Itens do Pedido</h3>
                <div className="space-y-4">
                  {details?.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <span className="font-bold text-[#E85D24]">{item.quantity}×</span>
                        <div>
                          <p className="font-bold text-sm">
                            {item.is_half ? (
                                `${item.product?.name} / ${item.half_product?.name}`
                            ) : (
                                item.product?.name || 'Item'
                            )}
                          </p>
                          <div className="flex flex-wrap gap-2 text-[10px] text-[#666] uppercase font-bold mt-0.5">
                            {item.size && <span>• {item.size}</span>}
                            {item.edge?.name && <span>• Borda {item.edge.name}</span>}
                          </div>
                          {item.observations && <p className="text-xs text-[#E85D24] italic mt-1 font-medium">{item.observations}</p>}
                        </div>
                      </div>
                      <span className="font-bold text-sm">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#F8F7F5] p-4 rounded-xl space-y-2 border border-[#E5E7EB]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Subtotal</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details?.subtotal || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Taxa de entrega</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details?.delivery_fee || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E7EB]">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-[#E85D24] text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details?.total_amount || 0)}
                  </span>
                </div>
                <div className="pt-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#666]">
                        {details?.payment_method === 'pix' ? 'PIX' :
                         details?.payment_method === 'cash' ? 'Dinheiro' :
                         details?.payment_method === 'credit_card' ? 'Crédito' : 'Débito'}
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                      details?.payment_status === 'paid' ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#666]/10 text-[#666]"
                    )}>
                      {details?.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  {details?.payment_method === 'cash' && details?.change_for && (
                    <p className="text-[10px] text-[#666]">Troco para: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.change_for)}</p>
                  )}
                </div>
              </section>

              {receiptUrl && (
                <section className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

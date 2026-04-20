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
  Loader2,
  Check,
  Truck
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrderDetails, getReceiptSignedUrl, confirmWithoutReceipt } from '@/app/(admin)/actions/order-actions'
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
  const [showInlineConfirm, setShowInlineConfirm] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchFullDetails() {
      try {
        const data = await getOrderDetails(order.id)
        if (data) setDetails(data)
      } catch (error) {
        console.error('Error fetching order details:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchFullDetails()
  }, [order.id])

  useEffect(() => {
    if (!details?.pix_receipt_note) return

    let path = details.pix_receipt_note
    if (path.startsWith('http')) {
      const parts = path.split(/\/storage\/v1\/object\/(?:public|authenticated)\//)
      if (parts.length > 1) {
        const bucketAndPath = parts[1]
        const firstSlash = bucketAndPath.indexOf('/')
        if (firstSlash !== -1) {
          path = bucketAndPath.substring(firstSlash + 1)
        }
      }
    }

    getReceiptSignedUrl(path)
      .then(setReceiptUrl)
      .catch((err) => {
        console.error('Error fetching signed URL for receipt:', err)
        setReceiptUrl(null)
      })
  }, [details?.pix_receipt_note])

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

  const handleConfirmWithoutReceipt = async () => {
    setIsUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      await confirmWithoutReceipt(order.id, user.id)
      if (onReceiptVerified) onReceiptVerified(order.id)
      onClose()
    } catch (error) {
      console.error("Error confirming without receipt:", error)
      alert("Erro ao confirmar pedido sem comprovante.")
    } finally {
      setIsUpdating(false)
    }
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
      onClose()
    }
    setIsUpdating(false)
  }

  const handleRequestResend = async () => {
    setIsUpdating(true)
    const { error } = await supabase
      .from('orders')
      .update({ pix_receipt_requested: true } as any)
      .eq('id', order.id)

    if (!error) {
      setDetails((prev: any) => ({ ...prev, pix_receipt_requested: true }))
    }
    setIsUpdating(false)
  }

  if (!order) return null

  const paymentLabels: Record<string, string> = {
    pix: 'PIX',
    cash: 'Dinheiro',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito'
  }

  const paymentStatusLabels: Record<string, string> = {
    pending: 'Aguardando confirmação',
    awaiting_collection: 'A cobrar (motoboy)',
    collected: 'Coletado pelo motoboy',
    paid: 'Pago'
  }

  const customerName = details?.customer_name ?? details?.customer?.full_name ?? 'Não identificado'
  const customerPhone = details?.customer_phone ?? details?.customer?.phone ?? 'Não informado'
  const deliveryName = details?.delivery?.full_name
  const address = details?.addresses

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#F3F4F6] flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-[#0D0D0D]">Pedido #{details?.display_id || details?.order_number || order.id.slice(-4).toUpperCase()}</h2>
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
                   <p className="font-bold text-lg">{customerName}</p>
                   <p className="text-sm text-[#666] flex items-center gap-2"><Phone size={14} /> {customerPhone}</p>
                   {address && (
                     <div className="pt-2 mt-2 border-t border-[#E5E7EB] flex gap-2">
                        <MapPin size={16} className="text-apollo-orange shrink-0 mt-0.5" />
                        <div className="text-sm">
                           <p className="font-semibold">{address.street}, {address.number}</p>
                           <p className="text-xs text-[#666]">{address.neighborhood} {address.complement ? ` • ${address.complement}` : ''}</p>
                           <p className="text-xs text-[#666]">{address.city}, {address.state}</p>
                        </div>
                     </div>
                   )}
                </div>
              </section>

              {deliveryName && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-zinc-500 uppercase tracking-wider">
                    <Truck size={14} /> Entregador
                  </h3>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <p className="font-bold text-zinc-700">{deliveryName}</p>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                 <h3 className="font-bold">Itens</h3>
                 <div className="space-y-3">
                    {details?.order_items?.filter((item: any) => !item.combo_order_item_id).map((item: any) => {
                      const product = item['products!order_items_product_id_fkey'] || item.products
                      const halfProduct = item['products!order_items_half_product_id_fkey'] || item.half_product
                      const edge = item['pizza_options!order_items_edge_option_id_fkey'] || item.edge

                      const comboChildren = details?.order_items?.filter((child: any) => child.combo_order_item_id === item.id) || [];

                      return (
                        <div key={item.id} className="flex justify-between items-start text-sm">
                          <div className="flex gap-3">
                             <span className="font-bold text-apollo-orange">{item.quantity}×</span>
                             <div>
                                <p className="font-bold">
                                  {item.is_half && halfProduct?.name ? `½ ${product?.name ?? ""} / ½ ${halfProduct.name}` : (product?.name ?? "")}
                                </p>
                                <p className="text-[10px] text-[#666] font-bold uppercase">{item.size} {edge ? `• Borda ${edge.name}` : ''}</p>

                                {comboChildren.length > 0 ? (
                                  <div className="mt-1 flex flex-col gap-0.5">
                                    {comboChildren.map((child: any) => {
                                      const childProduct = child['products!order_items_product_id_fkey'] || child.products;
                                      const childHalfProduct = child['products!order_items_half_product_id_fkey'] || child.half_product;
                                      let childName = childProduct?.name || 'Item';
                                      if (child.is_half && childHalfProduct?.name) {
                                        childName = `½ ${childName} / ½ ${childHalfProduct.name}`;
                                      }
                                      return (
                                        <p key={child.id} className="text-xs text-[#666]">
                                          + {child.quantity}x {childName}
                                        </p>
                                      );
                                    })}
                                  </div>
                                ) : (() => {
                                  // Legacy combo items fallback
                                  const comboItemsArray = product?.["combo_items!combo_items_combo_id_fkey"] || product?.combo_items;
                                  if (product?.type === 'combo' && comboItemsArray && comboItemsArray.length > 0) {
                                    return (
                                      <div className="mt-1 flex flex-col gap-0.5">
                                        {comboItemsArray.map((ci: any, idx: number) => {
                                          const ciProduct = ci['products!combo_items_product_id_fkey'] || ci.products
                                          return (
                                            <p key={idx} className="text-xs text-[#666]">
                                              + {ci.quantity}x {ciProduct?.name || 'Item'}
                                            </p>
                                          )
                                        })}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}

                                {item.observations && <p className="text-xs text-apollo-orange italic mt-1 font-medium">{item.observations}</p>}
                             </div>
                          </div>
                          <span className="font-bold">R$ {(Number(item.unit_price) * item.quantity).toFixed(2).replace('.', ',')}</span>
                        </div>
                      )
                    })}
                 </div>
              </section>

              <section className="bg-[#F8F7F5] p-6 rounded-2xl border border-[#E5E7EB] space-y-3">
                 <div className="flex justify-between text-sm"><span className="text-[#666]">Subtotal</span><span className="font-bold">R$ {Number(details?.subtotal || 0).toFixed(2).replace('.', ',')}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-[#666]">Taxa de entrega</span><span className="font-bold">R$ {Number(details?.delivery_fee || 0).toFixed(2).replace('.', ',')}</span></div>
                 <div className="h-px bg-[#E5E7EB] my-2" />
                 <div className="flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="text-2xl font-bold text-apollo-orange italic">R$ {Number(details?.total_amount || 0).toFixed(2).replace('.', ',')}</span>
                 </div>
                 <div className="pt-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                       <p className="text-xs font-bold text-[#666] uppercase">{paymentLabels[details?.payment_method] || details?.payment_method}</p>
                       <span className={cn("text-[10px] font-bold px-2 py-1 rounded uppercase", details?.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600")}>
                          {paymentStatusLabels[details?.payment_status] || details?.payment_status}
                       </span>
                    </div>
                 </div>
              </section>

              {details?.payment_method === 'pix' && (
                <section className="space-y-4 border-t border-[#E5E7EB] pt-6">
                   <h3 className="font-bold flex items-center gap-2"><Receipt size={18} className="text-apollo-orange" /> Confirmação de Pagamento PIX</h3>

                   {details.pix_receipt_note ? (
                     <div className="space-y-4">
                        {details.pix_receipt_note?.toLowerCase().endsWith('.pdf') ? (
                          <button
                            onClick={() => window.open(receiptUrl || details.pix_receipt_note, '_blank')}
                            className="w-full py-6 border-2 border-dashed border-[#E5E7EB] rounded-xl flex items-center justify-center gap-3 text-apollo-orange font-bold hover:bg-orange-50 transition-colors"
                          >
                            📄 Comprovante PDF — Clique para abrir
                          </button>
                        ) : (
                          <div className="rounded-xl overflow-hidden border border-[#E5E7EB] bg-zinc-50 p-2">
                             <img src={receiptUrl || ""} alt="Comprovante" className="w-full h-auto cursor-pointer rounded-lg shadow-sm" onClick={() => receiptUrl && window.open(receiptUrl, '_blank')} />
                          </div>
                        )}
                        {details.payment_status === 'pending' && (
                          <button onClick={handleConfirmPix} disabled={isUpdating} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                             {isUpdating ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Confirmar Pagamento</>}
                          </button>
                        )}
                        {details.payment_status === 'pending' && details.pix_receipt_note && (
                          <button
                            onClick={handleRequestResend}
                            disabled={isUpdating || details.pix_receipt_requested}
                            className="w-full py-3 border-2 border-dashed border-apollo-orange text-apollo-orange font-bold rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                          >
                             {isUpdating ? <Loader2 className="animate-spin" /> : (details.pix_receipt_requested ? 'Reenvio solicitado' : 'Solicitar Reenvio')}
                          </button>
                        )}
                        {details.pix_receipt_requested && (
                          <p className="text-[10px] text-apollo-orange font-bold text-center uppercase tracking-widest mt-2 animate-pulse">Aguardando novo comprovante do cliente</p>
                        )}
                     </div>
                   ) : (
                     <div className="p-6 bg-yellow-50 border border-yellow-100 rounded-xl text-center">
                        <p className="text-sm text-yellow-800 font-medium italic mb-4">Aguardando envio do comprovante pelo cliente...</p>
                        <div className="flex flex-col gap-2">
                          {!showInlineConfirm ? (
                            <>
                              <button
                                onClick={handleRequestResend}
                                disabled={isUpdating || details.pix_receipt_requested}
                                className="w-full py-3 border-2 border-dashed border-apollo-orange text-apollo-orange font-bold rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-2 text-sm"
                              >
                                {isUpdating ? <Loader2 className="animate-spin" /> : (details.pix_receipt_requested ? "Reenvio solicitado" : "Solicitar Reenvio")}
                              </button>
                              <button
                                onClick={() => setShowInlineConfirm(true)}
                                disabled={isUpdating}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md"
                              >
                                {isUpdating ? <Loader2 className="animate-spin" /> : <><Check size={18} /> Confirmar sem comprovante</>}
                              </button>
                            </>
                          ) : (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 text-left">
                              <p className="text-sm text-red-800 font-medium">⚠️ Atenção: confirmando sem comprovante. Esta ação será registrada.</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setShowInlineConfirm(false)}
                                  className="flex-1 py-2 text-xs font-bold text-red-800 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={handleConfirmWithoutReceipt}
                                  disabled={isUpdating}
                                  className="flex-1 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                >
                                  {isUpdating ? <Loader2 className="animate-spin size-3 mx-auto" /> : "Confirmar mesmo assim"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                     </div>
                   )}
                </section>
              )}

              {details?.payment_status === ('awaiting_collection' as any) && details?.status === 'delivered' && (
                <button onClick={() => handleUpdatePaymentStatus('collected')} disabled={isUpdating} className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl">Confirmar Recebimento (Motoboy)</button>
              )}
              {details?.payment_status === ('collected' as any) && (
                <button onClick={() => handleUpdatePaymentStatus('paid')} disabled={isUpdating} className="w-full py-4 bg-green-500 text-white font-bold rounded-xl">Dar Baixa (Caixa)</button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

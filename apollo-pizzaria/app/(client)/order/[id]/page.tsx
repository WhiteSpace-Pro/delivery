'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Loader2, Receipt, Camera, Check } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/contexts/CartContext'
import { cn } from '@/lib/utils'

const supabase = createClient()

export default function OrderSuccessPage() {
  const params = useParams()
  const id = params?.id as string
  const { clearCart } = useCart()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clearCart()
  }, [clearCart])

  const [uploading, setUploading] = useState(false)
  const [pixReceipt, setPixReceipt] = useState<File | null>(null)
  const [pixReceiptPreview, setPixReceiptPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPixReceipt(file)
      const reader = new FileReader()
      reader.onloadend = () => setPixReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleConfirmPix = async () => {
    if (!pixReceipt || !order?.id) return
    setUploading(true)
    try {
      const fileExt = pixReceipt.name.split('.').pop()
      const timestamp = Date.now()
      const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'
      const fileName = `${TENANT_ID}/comprovantes/${order.id}/${timestamp}.${fileExt}`
      const { error } = await supabase.storage.from('delivery-photos').upload(fileName, pixReceipt)

      if (error) throw error

      const publicUrl = `https://ckshypkyylmzvhjhqrzf.supabase.co/storage/v1/object/public/delivery-photos/${fileName}`

      await supabase.from('orders').update({
        pix_receipt_note: publicUrl,
        pix_receipt_requested: false,
        status: 'pending',
        payment_status: 'pending'
      } as any).eq('id', order.id)

      setPixReceipt(null)
      setPixReceiptPreview(null)
      // Realtime update should handle the rest
    } catch (err: any) {
      alert('Erro ao enviar comprovante: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!id) return

    async function fetchOrder() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, display_id, pix_receipt_requested, addresses(*)')
          .eq('id', id)
          .single()

        if (error) throw error
        if (data) setOrder(data)
      } catch (err) {
        console.error('[order page] fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    void fetchOrder()

    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id}`
      },
      (payload) => {
        setOrder(payload.new)
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [id])

  if (loading) return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center"><Loader2 size={40} className="text-apollo-orange animate-spin" /></div>
  if (!order) return <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-white">Pedido não encontrado</div>

  const statusLabels: Record<string, { label: string, color: string }> = {
    pending: { label: 'Aguardando Confirmação', color: '#8A8480' },
    confirmed: { label: 'Confirmado', color: '#D4941A' },
    preparing: { label: 'Em Preparo', color: '#E85D24' },
    ready: { label: 'Pronto para Entrega', color: '#10B981' },
    out_for_delivery: { label: 'Saiu para Entrega', color: '#3B82F6' },
    delivered: { label: 'Entregue', color: '#059669' },
    cancelled: { label: 'Cancelado', color: '#EF4444' }
  }

  const currentStatus = statusLabels[order.status] || statusLabels.pending

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-dm pb-20">
      <div className="max-w-xl mx-auto p-4 md:p-6">
        <header className="mb-12 text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-playfair font-bold text-white mb-2 italic">Pedido Realizado!</h1>
          <p className="text-white/60 text-sm">Acompanhe o status do seu pedido abaixo.</p>
        </header>

        <div className="space-y-6">
          <section className="bg-[#1C1C1C] rounded-3xl p-6 border border-white/5 shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Pedido</p>
                   <p className="text-lg font-mono font-bold">#{order.display_id || order.id.substring(0, 8)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Status Atual</p>
                   <p className="text-sm font-bold" style={{ color: currentStatus.color }}>{currentStatus.label}</p>
                </div>
             </div>

             <div className="relative space-y-8 pl-8 border-l border-white/10 ml-2">
                {['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].map((s, idx) => {
                  const sIdx = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].indexOf(order.status);
                  const isCompleted = sIdx >= idx;
                  const isCurrent = order.status === s;

                  return (
                    <div key={idx} className="relative">
                      <div className={cn(
                        "absolute -left-[41px] w-6 h-6 rounded-full border-4 border-[#1C1C1C] transition-colors",
                        isCompleted ? "bg-apollo-orange" : "bg-white/10",
                        isCurrent && "ring-4 ring-apollo-orange/20 animate-pulse"
                      )} />
                      <p className={cn("text-sm font-bold", isCompleted ? "text-white" : "text-white/20")}>
                        {statusLabels[s]?.label}
                      </p>
                    </div>
                  )
                })}
             </div>
          </section>

          {order.payment_method === 'pix' && (order.pix_receipt_requested || !order.pix_receipt_note) && order.payment_status === 'pending' && (
            <section className="bg-[#1C1C1C] rounded-3xl p-6 border-2 border-dashed border-apollo-orange space-y-4 animate-in zoom-in duration-300">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-apollo-orange/10 rounded-full flex items-center justify-center">
                     <Camera className="text-apollo-orange" size={20} />
                  </div>
                  <div>
                     <h2 className="font-bold">{order.pix_receipt_requested ? 'Novo comprovante solicitado' : 'Enviar Comprovante PIX'}</h2>
                     <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{order.pix_receipt_requested ? 'O estabelecimento solicitou o reenvio' : 'Obrigatório para confirmar seu pedido'}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="block">
                    <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-apollo-orange transition-colors cursor-pointer bg-black/20">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*,.pdf" />
                      {pixReceiptPreview ? (
                        <div className="relative w-full aspect-video">
                           <img src={pixReceiptPreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/40">
                          <Camera size={24} />
                          <span className="text-xs font-bold">Clique para tirar foto ou anexo</span>
                        </div>
                      )}
                    </div>
                  </label>

                  <button
                    onClick={handleConfirmPix}
                    disabled={!pixReceipt || uploading}
                    className="w-full bg-apollo-orange hover:bg-apollo-orange/90 disabled:opacity-50 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    {uploading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Enviar Agora</>}
                  </button>
               </div>
            </section>
          )}

          <section className="bg-[#1C1C1C] rounded-3xl p-6 border border-white/5 space-y-4">
             <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <Receipt className="text-apollo-orange" size={20} />
                <h2 className="font-bold">Resumo do Pedido</h2>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="font-bold">R$ {order.subtotal.toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-white/60">Taxa de entrega</span>
                <span className="font-bold">R$ {order.delivery_fee.toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-apollo-orange">R$ {order.total_amount.toFixed(2).replace('.', ',')}</span>
             </div>
          </section>

          <div className="grid grid-cols-1 gap-3">
             <Link href="/meus-pedidos" className="w-full bg-white/5 hover:bg-white/10 h-14 rounded-2xl flex items-center justify-center font-bold transition-all">
                Meus Pedidos
             </Link>
             <Link href="/cardapio" className="w-full text-center py-4 text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest">
                Voltar ao Cardápio
             </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'
import { ChevronRight, ShoppingBag, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function MyOrdersPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orders: any[] | null = null
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *, display_id,
        order_items(
          *,
          products!order_items_product_id_fkey(name)
        )
      `)
      .eq('customer_id', user.id)
      .eq('tenant_id', process.env.NEXT_PUBLIC_TENANT_ID_APOLLO!)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[meus-pedidos] Query error:', error)
    }

    orders = data
  } catch (e) {
    console.error('[meus-pedidos] EXCEPTION:', e)
    return <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center">Erro ao carregar pedidos</div>
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending:          { label: 'Pendente',         color: 'bg-white/10 text-white/60' },
    confirmed:        { label: 'Confirmado',        color: 'bg-blue-500/20 text-blue-400' },
    preparing:        { label: 'Preparando',        color: 'bg-amber-500/20 text-amber-400' },
    ready:            { label: 'Pronto',            color: 'bg-green-500/20 text-green-400' },
    out_for_delivery: { label: 'Saiu para entrega', color: 'bg-apollo-orange/20 text-apollo-orange' },
    delivered:        { label: 'Entregue',          color: 'bg-[#22c55e]/20 text-[#22c55e]' },
    cancelled:        { label: 'Cancelado',         color: 'bg-red-500/20 text-red-400' },
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-dm pb-20">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/cardapio"
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4 text-xs font-bold uppercase tracking-widest"
            >
              <ArrowLeft size={14} />
              Cardápio
            </Link>
            <h1 className="text-3xl font-playfair font-bold italic text-apollo-orange">Meus Pedidos</h1>
          </div>
          <div className="bg-[#1C1C1C] p-2 rounded-full border border-white/5">
            <ShoppingBag size={20} className="text-white/20" />
          </div>
        </header>

        {!orders || orders.length === 0 ? (
          <div className="bg-[#1C1C1C] rounded-3xl p-12 text-center border border-[#2A2A2A] shadow-xl">
            <ShoppingBag size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/60 mb-6">Você ainda não fez nenhum pedido.</p>
            <Link
              href="/cardapio"
              className="inline-block bg-apollo-orange px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Ver Cardápio
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const createdAt = new Date(order.created_at ?? '')
              const date = createdAt.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })
              const time = createdAt.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })

              const status = statusMap[order.status] ?? statusMap.pending

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const itemsSummary = (order.order_items as any[])
                .map((item) => `${item.quantity}× ${item.products?.name || 'Item'}`)
                .join(', ')

              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="block bg-[#1C1C1C] border border-[#2A2A2A] rounded-2xl p-5 hover:border-apollo-orange/50 hover:bg-[#222] transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center border border-white/5">
                        <span className="text-xs font-bold text-apollo-orange">#{order.display_id}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{date} • {time}</p>
                        <p className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1 inline-block', status.color)}>
                          {status.label}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-apollo-orange">
                      R$ {order.total_amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-white/60 line-clamp-1 flex-1">{itemsSummary}</p>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-apollo-orange group-hover:text-white transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

const STATUS_CONFIG: Record<string, { label: string, color: string }> = {
  pending: { label: 'Novo', color: 'bg-red-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
  preparing: { label: 'Preparando', color: 'bg-yellow-500' },
  ready: { label: 'Pronto', color: 'bg-green-400' },
  out_for_delivery: { label: 'Saiu para entrega', color: 'bg-orange-500' },
  delivered: { label: 'Entregue', color: 'bg-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-zinc-600' }
}

export default async function MyOrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        product:products(name)
      )
    `)
    .eq('customer_id', user.id)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-dm-sans pb-20 text-[#F5F0E8]">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-playfair font-bold text-apollo-orange italic mb-2">Meus Pedidos</h1>
          <p className="text-white/60">Acompanhe seu histórico e pedidos em andamento.</p>
        </header>

        {(!orders || orders.length === 0) ? (
          <div className="bg-[#1C1C1C] rounded-2xl p-12 text-center border border-[#2A2A2A]">
            <Package size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40 mb-6">Você ainda não realizou nenhum pedido.</p>
            <Link href="/cardapio" className="bg-apollo-orange text-white px-8 py-3 rounded-xl font-bold inline-block">
              Ver cardápio
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order: any) => {
              const date = new Date(order.created_at)
              const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              }).format(date)
              const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
              const itemsSummary = order.order_items
                ?.map((item: any) => `${item.quantity}× ${item.product?.name || 'Item'}`)
                .join(', ')

              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="bg-[#1C1C1C] rounded-2xl p-5 border border-[#2A2A2A] hover:border-apollo-orange/40 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1">#${order.id.slice(-4)}</h3>
                      <p className="text-xs text-white/40 capitalize">{formattedDate} • {formattedTime}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white",
                      status.color
                    )}>
                      {status.label}
                    </span>
                  </div>

                  <p className="text-sm text-white/60 line-clamp-1 mb-4">
                    {itemsSummary}
                  </p>

                  <div className="flex justify-between items-center pt-4 border-t border-[#2A2A2A]">
                    <span className="font-bold text-apollo-orange">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-white/40 group-hover:text-apollo-orange transition-colors">
                      Ver detalhes
                      <ChevronRight size={14} />
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

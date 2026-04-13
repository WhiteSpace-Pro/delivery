import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrderKanban } from '@/components/admin/OrderKanban'
import { StoreStatusToggle } from '@/components/admin/StoreStatusToggle'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'kitchen', 'dev', 'superadmin'].includes(profile.role)) {
    redirect('/')
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('is_active')
    .eq('id', TENANT_ID)
    .single()

  // Use last 24h for consistency with Kanban
  const startOfPeriod = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: ordersToday } = await supabase
    .from('orders')
    .select('total_amount, payment_status, status')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', startOfPeriod)

  // Pedidos hoje (excluir PIX não confirmado)
  const confirmedOrdersToday = ordersToday?.filter(o =>
    !(o.status === 'pending' && o.payment_status === 'pending') && o.status !== 'cancelled'
  ) || []
  const ordersCount = confirmedOrdersToday.length

  // Faturamento hoje
  const revenueOrders = ordersToday?.filter(o =>
    ['paid', 'awaiting_collection', 'collected'].includes(o.payment_status as any) &&
    !['pending', 'cancelled'].includes(o.status)
  ) || []

  const totalRevenue = revenueOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  // Ticket médio: faturamento / pedidos que geraram faturamento (fórmula correta do contrato)
  const averageTicket = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0

  // Em andamento
  const inProgressCount = ordersToday
    ?.filter(o =>
      ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status) &&
      o.payment_status !== 'pending'
    )
    .length || 0

  // Horário e Data corretos em BRT (America/Sao_Paulo)
  const now = new Date()
  const hour = parseInt(
    now.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false
    })
  )
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const dateStr = now.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <main className="min-h-screen bg-[#F8F7F5] font-dm-sans p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">
            {greeting}, {(profile.full_name || 'Usuário').split(' ')[0]}
          </h1>
          <p className="text-[#666] capitalize">{dateStr}</p>
        </div>
        <StoreStatusToggle isActive={(tenant as any)?.is_active ?? false} />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Pedidos hoje" value={ordersCount.toString()} />
        <MetricCard
          title="Faturamento hoje"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
        />
        <MetricCard
          title="Ticket médio"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(averageTicket)}
        />
        <MetricCard title="Em andamento" value={inProgressCount.toString()} />
      </div>

      <OrderKanban tenantId={TENANT_ID} />
    </main>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#E5E7EB]">
      <p className="text-sm text-[#666] mb-1">{title}</p>
      <p className="text-2xl font-bold text-[#0D0D0D]">{value}</p>
    </div>
  )
}

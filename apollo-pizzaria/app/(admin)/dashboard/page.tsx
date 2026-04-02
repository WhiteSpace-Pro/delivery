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

  if (!profile || !['admin', 'kitchen'].includes(profile.role)) {
    redirect('/')
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('is_active')
    .eq('id', TENANT_ID)
    .single()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  // Initial fetch for metrics
  const { data: ordersToday } = await supabase
    .from('orders')
    .select('total_amount, payment_status, status')
    .eq('tenant_id', TENANT_ID)
    .gte('created_at', todayISO)

  const ordersCount = ordersToday?.length || 0
  const totalRevenue = ordersToday
    ?.filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
  const averageTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0
  const inProgressCount = ordersToday
    ?.filter(o => !['delivered', 'cancelled'].includes(o.status))
    .length || 0

  const hours = new Date().getHours()
  let greeting = 'Boa noite'
  if (hours >= 0 && hours < 12) greeting = 'Bom dia'
  else if (hours >= 12 && hours < 18) greeting = 'Boa tarde'

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <main className="min-h-screen bg-[#F8F7F5] font-dm-sans p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">
            {greeting}, {(profile.full_name || 'Usuário').split(' ')[0]}
          </h1>
          <p className="text-[#666] capitalize">{formattedDate}</p>
        </div>
        <StoreStatusToggle isActive={tenant?.is_active ?? false} />
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

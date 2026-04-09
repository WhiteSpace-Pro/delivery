import { getDriversWithStats } from '@/app/(admin)/actions/delivery-actions'
import { DeliveryList } from './DeliveryList'

export const dynamic = 'force-dynamic'

export default async function DeliveryPage() {
  const drivers = await getDriversWithStats()

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Gestão de Motoboys</h1>
          <p className="text-[#666]">Gerencie sua equipe de entregas e acompanhe o desempenho hoje.</p>
        </div>
      </header>

      <DeliveryList initialDrivers={drivers} />
    </div>
  )
}

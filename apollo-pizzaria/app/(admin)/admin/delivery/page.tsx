import { getDriversWithStats } from '@/app/(admin)/actions/delivery-actions'
import { DeliveryList } from './DeliveryList'
import nextDynamic from 'next/dynamic'

const DeliveryMap = nextDynamic(() => import('@/components/admin/DeliveryMap'), { ssr: false })

export const dynamic = 'force-dynamic'

export default async function DeliveryPage() {
  const drivers = await getDriversWithStats()
  const hasLocations = drivers.some(d => d.location)

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0D0D0D]">Gestão de Motoboys</h1>
          <p className="text-[#666]">Turno atual e histórico de entregas da equipe</p>
        </div>
      </header>

      {hasLocations && <DeliveryMap initialDrivers={drivers} />}

      <DeliveryList initialDrivers={drivers} />
    </div>
  )
}

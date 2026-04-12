'use client'

import { useState } from 'react'
import { Plus, Copy, Check, Key, Clock, Bike } from 'lucide-react'
import { toggleDriverStatus, createDriver, getDriversWithStats, resetDriverPassword, getDriverOrdersDetails } from '@/app/(admin)/actions/delivery-actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Driver {
  id: string
  full_name: string | null
  phone: string | null
  email: string
  is_active: boolean | null
  vehicle_type: string | null
  vehicle_color: string | null
  vehicle_plate: string | null
  vehicle_brand: string | null
  vehicle_model: string | null
  ordersToday: number;
  inProgressCount: number
}

export function DeliveryList({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detailsDriver, setDetailsDriver] = useState<Driver | null>(null)
  const [driverOrders, setDriverOrders] = useState<{ inProgress: any[], delivered: any[] } | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [newDriver, setNewDriver] = useState({
    full_name: '',
    email: '',
    phone: '',
    vehicle_type: 'Moto',
    vehicle_color: '',
    vehicle_plate: '',
    vehicle_brand: '',
    vehicle_model: ''
  })
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleToggle = async (driverId: string, currentStatus: boolean) => {
    try {
      await toggleDriverStatus(driverId, currentStatus)
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, is_active: !currentStatus } : d))
    } catch (error) {
      console.error(error)
    }
  }

  const handleResetPassword = async (email: string) => {
     try {
       const link = await resetDriverPassword(email)
       setResetLink(link)
     } catch (err: unknown) {
       const msg = err instanceof Error ? err.message : 'Erro desconhecido'
       alert(msg)
     }
  }

  const formatPlate = (value: string) => {
    const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    if (clean.length <= 7) {
      if (clean.length > 3) return clean.slice(0, 3) + '-' + clean.slice(3)
      return clean
    }
    return clean.slice(0, 7)
  }

  const handleOpenDetails = async (driver: Driver) => {
    setDetailsDriver(driver)
    setLoadingDetails(true)
    try {
      const details = await getDriverOrdersDetails(driver.id)
      setDriverOrders(details)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const tempPass = Math.random().toString(36).slice(-8)
    try {
      await createDriver({ ...newDriver, password_temp: tempPass })
      setGeneratedPassword(tempPass)
      const updatedDrivers = await getDriversWithStats()
      setDrivers(updatedDrivers as unknown as Driver[])
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      alert(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setGeneratedPassword(null)
            setResetLink(null)
            setNewDriver({ full_name: '', email: '', phone: '', vehicle_type: 'Moto', vehicle_color: '', vehicle_plate: '', vehicle_brand: '', vehicle_model: '' })
            setIsModalOpen(true)
          }}
          className="bg-apollo-orange text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#D14D1B] transition-all shadow-lg shadow-apollo-orange/20"
        >
          <Plus size={20} />
          Cadastrar Motoboy
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#0D0D0D]/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F7F5] border-b border-[#0D0D0D]/5">
              <th className="px-6 py-4 text-[11px] font-bold text-[#0D0D0D]/40 uppercase tracking-wider">Motoboy</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#0D0D0D]/40 uppercase tracking-wider">Veículo</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#0D0D0D]/40 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#0D0D0D]/40 uppercase tracking-wider text-center">Em andamento</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#0D0D0D]/40 uppercase tracking-wider text-center">Entregas Hoje</th>
              <th className="px-6 py-4 text-[11px] font-bold text-[#0D0D0D]/40 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0D0D0D]/5">
            {drivers.map(driver => (
              <tr key={driver.id} className="hover:bg-[#F8F7F5]/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-apollo-orange/10 flex items-center justify-center text-apollo-orange font-bold">
                      {driver.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[#1A1A1A]">{driver.full_name}</p>
                      <p className="text-[13px] text-[#555555]">{driver.email}</p>
                      <p className="text-[13px] text-[#555555]">{driver.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="text-[13px] text-[#555555]">
                     <p><span className="font-bold">{driver.vehicle_brand} {driver.vehicle_model}</span> {driver.vehicle_color}</p>
                     <p className="uppercase font-mono">{driver.vehicle_plate} — {driver.vehicle_type}</p>
                   </div>
                </td>
                <td className="px-6 py-4">
                   <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold", driver.is_active ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#6B7280]")}>
                     {driver.is_active ? 'ONLINE' : 'OFFLINE'}
                   </span>
                </td>
                <td className="px-6 py-4 text-center">
                   <button
                    onClick={() => handleOpenDetails(driver)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-all",
                      driver.inProgressCount > 0 ? "bg-apollo-orange text-white" : "bg-[#F3F4F6] text-[#6B7280]"
                    )}
                   >
                     {driver.inProgressCount}
                   </button>
                </td>
                <td className="px-6 py-4 text-center">
                   <button
                    onClick={() => handleOpenDetails(driver)}
                    className="text-lg font-bold hover:text-apollo-orange transition-colors"
                   >
                     {driver.ordersToday}
                   </button>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                   <button onClick={() => handleResetPassword(driver.email)} className="p-2 hover:bg-white rounded-lg text-[#666] transition-colors" title="Resetar Senha">
                      <Key size={18} />
                   </button>
                   <Switch checked={driver.is_active ?? false} onCheckedChange={() => handleToggle(driver.id, driver.is_active ?? false)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white rounded-2xl sm:max-w-[500px] p-0 overflow-hidden">
           {generatedPassword || resetLink ? (
             <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"><Check size={32} /></div>
                <h3 className="text-xl font-bold">{resetLink ? 'Link Gerado!' : 'Motoboy Criado!'}</h3>
                <div className="bg-[#F8F7F5] p-6 rounded-2xl border border-dashed border-[#0D0D0D]/10 relative">
                   <p className="text-[10px] font-bold uppercase text-[#666] mb-2">{resetLink ? 'Link de Recuperação' : 'Senha Temporária'}</p>
                   <p className="text-sm font-mono font-bold text-apollo-orange break-all">{resetLink || generatedPassword}</p>
                   <button onClick={() => { navigator.clipboard.writeText(resetLink || generatedPassword!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-4 right-4 p-2 bg-white rounded-lg border border-black/5">
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                   </button>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-[#0D0D0D] text-white rounded-xl font-bold">Concluir</button>
             </div>
           ) : (
             <form onSubmit={handleCreateDriver}>
                <DialogHeader className="p-6 border-b border-[#0D0D0D]/5 bg-[#F8F7F5]"><DialogTitle>Cadastrar Motoboy</DialogTitle></DialogHeader>
                <div className="p-6 grid grid-cols-2 gap-4">
                   <div className="col-span-2 space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Nome</Label><input required value={newDriver.full_name} onChange={e => setNewDriver({...newDriver, full_name: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">E-mail</Label><input required type="email" value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Telefone</Label><input required value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Marca</Label><input required value={newDriver.vehicle_brand} onChange={e => setNewDriver({...newDriver, vehicle_brand: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Modelo</Label><input required value={newDriver.vehicle_model} onChange={e => setNewDriver({...newDriver, vehicle_model: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Cor</Label><input required value={newDriver.vehicle_color} onChange={e => setNewDriver({...newDriver, vehicle_color: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Placa</Label><input required value={newDriver.vehicle_plate} onChange={e => setNewDriver({...newDriver, vehicle_plate: formatPlate(e.target.value)})} maxLength={8} className="w-full p-3 rounded-xl border border-black/10 text-sm font-mono" /></div>
                   <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[#666]">Tipo</Label>
                      <select value={newDriver.vehicle_type} onChange={e => setNewDriver({...newDriver, vehicle_type: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm bg-white">
                         <option>Moto</option><option>Carro</option><option>Bicicleta</option><option>Van</option>
                      </select>
                   </div>
                </div>
                <DialogFooter className="p-6 bg-[#F8F7F5] border-t border-[#0D0D0D]/5">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-[#666]">Cancelar</button>
                   <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-apollo-orange text-white rounded-xl font-bold shadow-lg shadow-apollo-orange/20">{isSubmitting ? 'Salvando...' : 'Salvar Motoboy'}</button>
                </DialogFooter>
             </form>
           )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsDriver} onOpenChange={(open) => !open && setDetailsDriver(null)}>
        <DialogContent className="bg-[#F8F7F5] sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
           <DialogHeader className="p-6 border-b border-[#0D0D0D]/5 bg-white">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-apollo-orange/10 flex items-center justify-center text-apollo-orange font-bold text-xl">
                    {detailsDriver?.full_name?.charAt(0)}
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-bold">{detailsDriver?.full_name}</DialogTitle>
                    <p className="text-sm text-[#666]">{detailsDriver?.vehicle_brand} {detailsDriver?.vehicle_model} • {detailsDriver?.vehicle_plate}</p>
                 </div>
              </div>
           </DialogHeader>

           <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {loadingDetails ? (
                <div className="py-12 text-center text-[#666] animate-pulse">Carregando detalhes...</div>
              ) : (
                <>
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={18} className="text-apollo-orange" />
                      <h3 className="font-bold uppercase text-xs tracking-widest text-[#666]">Em andamento ({driverOrders?.inProgress.length || 0})</h3>
                    </div>
                    <div className="space-y-3">
                      {driverOrders?.inProgress.length === 0 && <p className="text-sm text-[#666] italic bg-white p-4 rounded-xl border border-black/5">Nenhuma entrega em andamento.</p>}
                      {driverOrders?.inProgress.map((order: any) => (
                        <div key={order.id} className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <span className="text-[10px] font-bold bg-[#F8F7F5] px-2 py-1 rounded text-[#666]">#{order.display_id || order.id.slice(0,8)}</span>
                                 <p className="text-sm font-bold mt-1">{order.addresses?.street}, {order.addresses?.number}</p>
                                 <p className="text-[11px] text-[#666]">{order.addresses?.neighborhood}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-bold text-apollo-orange">R$ {Number(order.total_amount).toFixed(2)}</p>
                                 <p className="text-[10px] uppercase font-bold text-[#666]">{order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'cash' ? 'Dinheiro' : 'Cartão'}</p>
                              </div>
                           </div>
                           <div className="text-[11px] text-[#666] border-t border-black/5 pt-2 mt-2">
                              {order.order_items?.map((item: any, idx: number) => (
                                <span key={idx}>{item.quantity}x {item.products?.name}{idx < order.order_items.length - 1 ? ', ' : ''}</span>
                              ))}
                           </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Bike size={18} className="text-green-600" />
                      <h3 className="font-bold uppercase text-xs tracking-widest text-[#666]">Entregues Hoje ({driverOrders?.delivered.length || 0})</h3>
                    </div>
                    <div className="space-y-3">
                      {driverOrders?.delivered.length === 0 && <p className="text-sm text-[#666] italic bg-white p-4 rounded-xl border border-black/5">Nenhuma entrega realizada hoje.</p>}
                      {driverOrders?.delivered.map((order: any) => (
                        <div key={order.id} className="bg-white/50 p-4 rounded-2xl border border-black/5 opacity-80">
                           <div className="flex justify-between items-start">
                              <div>
                                 <span className="text-[10px] font-bold bg-[#F8F7F5] px-2 py-1 rounded text-[#666]">#{order.display_id || order.id.slice(0,8)}</span>
                                 <p className="text-sm font-medium mt-1">{order.addresses?.street}, {order.addresses?.number}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-bold">R$ {Number(order.total_amount).toFixed(2)}</p>
                                 <p className="text-[10px] text-green-600 font-bold uppercase">Entregue</p>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
           </div>

           <DialogFooter className="p-4 bg-white border-t border-[#0D0D0D]/5">
              <button onClick={() => setDetailsDriver(null)} className="w-full py-3 bg-[#0D0D0D] text-white rounded-xl font-bold">Fechar</button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

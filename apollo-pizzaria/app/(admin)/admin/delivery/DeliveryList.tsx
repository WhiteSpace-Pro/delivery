'use client'

import { useState, useEffect } from 'react'
import { Plus, Copy, Check, Key, Clock, Bike, AlertCircle, MapPin } from 'lucide-react'
import { toggleDriverStatus, createDriver, getDriversWithStats, resetDriverPassword, getDriverOrdersDetails } from '@/app/(admin)/actions/delivery-actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

const STORE_COORDS = { lat: -19.90693, lng: -43.89515 }

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
  inProgressCount: number;
  previousShiftCount: number;
  location?: { lat: number | null, lng: number | null } | null
}

export function DeliveryList({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)

  useEffect(() => {
    const supabase = createClient()
    const profileChannel = supabase
      .channel('delivery-profiles-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `tenant_id=eq.${TENANT_ID}` },
        (payload) => {
          setDrivers(prev => prev.map(d =>
            d.id === payload.new.id ? { ...d, is_active: payload.new.is_active as boolean } : d
          ))
        }
      )
      .subscribe()

    const locationChannel = supabase
      .channel('delivery-location-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_current_location', filter: `tenant_id=eq.${TENANT_ID}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const loc = payload.new as { delivery_id: string; lat: number; lng: number; updated_at: string }
            setDrivers(prev => prev.map(d =>
              d.id === loc.delivery_id ? { ...d, location: { lat: loc.lat, lng: loc.lng } } : d
            ))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(locationChannel)
    }
  }, [])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detailsDriver, setDetailsDriver] = useState<Driver | null>(null)
  const [driverOrders, setDriverOrders] = useState<{ inProgress: any[], delivered: any[], previousShift: any[] } | null>(null)
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-black italic text-[#0D0D0D]">Equipe de Entrega</h2>
           <p className="text-sm text-[#666]">Turno atual e histórico de entregas da equipe</p>
        </div>
        <button
          onClick={() => {
            setGeneratedPassword(null)
            setIsModalOpen(true)
          }}
          className="bg-apollo-orange text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-apollo-orange/20"
        >
          <Plus size={20} /> Novo Motoboy
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#F8F7F5] border-b border-black/5">
            <tr>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-[#666]">Motoboy</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-[#666]">Veículo</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-[#666]">Status</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-[#666] text-center">No Turno Atual</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-[#666] text-center">Turnos Ant.</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-[#666] text-center">Entregues no Turno</th>
              <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-[#666] text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {drivers.map(driver => {
              const naBase = driver.location && driver.location.lat !== null && driver.location.lng !== null && distanciaMetros(driver.location.lat as number, driver.location.lng as number, STORE_COORDS.lat, STORE_COORDS.lng) <= 50;

              return (
                <tr key={driver.id} className="hover:bg-[#F8F7F5]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-apollo-orange/10 flex items-center justify-center text-apollo-orange font-bold">
                        {driver.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#1A1A1A]">{driver.full_name}</p>
                          {naBase && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border border-green-200">
                              <MapPin size={8} className="fill-green-700" /> NA BASE
                            </span>
                          )}
                        </div>
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
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold transition-all",
                        driver.previousShiftCount > 0 ? "bg-red-600 text-white animate-pulse" : "bg-[#F3F4F6] text-[#6B7280]"
                      )}
                     >
                       {driver.previousShiftCount}
                     </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <button
                      onClick={() => handleOpenDetails(driver)}
                      className={cn("px-3 py-1 rounded-full text-xs font-bold", driver.ordersToday > 0 ? "bg-green-100 text-green-700" : "bg-[#F3F4F6] text-[#6B7280]")}
                     >
                       {driver.ordersToday}
                     </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button
                         onClick={() => handleResetPassword(driver.email)}
                         className="p-2 text-[#666] hover:bg-[#F8F7F5] rounded-lg transition-all"
                         title="Resetar Senha"
                       >
                         <Key size={18} />
                       </button>
                       <Switch
                        checked={!!driver.is_active}
                        onCheckedChange={() => handleToggle(driver.id, !!driver.is_active)}
                       />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!resetLink} onOpenChange={(open) => !open && setResetLink(null)}>
         <DialogContent className="bg-white">
            <DialogHeader>
               <DialogTitle className="text-xl font-bold">Link de Recuperação</DialogTitle>
            </DialogHeader>
            <div className="p-4 bg-[#F8F7F5] rounded-xl break-all text-xs font-mono border border-black/5">
               {resetLink}
            </div>
            <DialogFooter>
               <button onClick={() => copyToClipboard(resetLink!)} className="w-full py-3 bg-apollo-orange text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copiado!' : 'Copiar Link'}
               </button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white p-0 overflow-hidden sm:max-w-[500px]">
           {generatedPassword ? (
             <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                   <Check className="text-green-600" size={32} />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-[#0D0D0D]">Motoboy Criado!</h3>
                   <p className="text-sm text-[#666]">Envie os dados de acesso para o motoboy.</p>
                </div>
                <div className="bg-[#F8F7F5] p-6 rounded-2xl border border-black/5 space-y-4 text-left">
                   <div>
                      <Label className="text-[10px] uppercase font-bold text-[#666]">E-mail</Label>
                      <p className="font-bold text-[#0D0D0D]">{newDriver.email}</p>
                   </div>
                   <div>
                      <Label className="text-[10px] uppercase font-bold text-[#666]">Senha Temporária</Label>
                      <p className="text-2xl font-black text-apollo-orange tracking-wider">{generatedPassword}</p>
                   </div>
                </div>
                <button
                   onClick={() => setIsModalOpen(false)}
                   className="w-full py-4 bg-[#0D0D0D] text-white rounded-xl font-bold"
                >
                   Concluído
                </button>
             </div>
           ) : (
             <form onSubmit={handleCreateDriver}>
                <DialogHeader className="p-6 border-b border-black/5">
                   <DialogTitle className="text-xl font-black italic text-[#0D0D0D]">Novo Motoboy</DialogTitle>
                </DialogHeader>
                <div className="p-6 grid grid-cols-2 gap-4">
                   <div className="col-span-2 space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Nome Completo</Label><input required value={newDriver.full_name} onChange={e => setNewDriver({...newDriver, full_name: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm text-[#0D0D0D]" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">E-mail</Label><input required type="email" value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm text-[#0D0D0D]" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">WhatsApp</Label><input required value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm text-[#0D0D0D]" /></div>

                   <div className="col-span-2 pt-2 border-t border-black/5 mt-2">
                      <p className="text-[10px] uppercase font-black text-gray-500 mb-4">Dados do Veículo</p>
                   </div>

                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Marca</Label><input required value={newDriver.vehicle_brand} onChange={e => setNewDriver({...newDriver, vehicle_brand: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm text-[#0D0D0D]" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Modelo</Label><input required value={newDriver.vehicle_model} onChange={e => setNewDriver({...newDriver, vehicle_model: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm text-[#0D0D0D]" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Cor</Label><input required value={newDriver.vehicle_color} onChange={e => setNewDriver({...newDriver, vehicle_color: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm text-[#0D0D0D]" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Placa</Label><input required value={newDriver.vehicle_plate} onChange={e => setNewDriver({...newDriver, vehicle_plate: formatPlate(e.target.value)})} maxLength={8} className="w-full p-3 rounded-xl border border-black/10 text-sm font-mono text-[#0D0D0D]" /></div>
                   <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[#666]">Tipo</Label>
                      <select value={newDriver.vehicle_type} onChange={e => setNewDriver({...newDriver, vehicle_type: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm bg-white text-[#0D0D0D]">
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
                    <DialogTitle className="text-xl font-bold text-[#0D0D0D]">{detailsDriver?.full_name}</DialogTitle>
                    <p className="text-sm text-[#666]">{detailsDriver?.vehicle_brand} {detailsDriver?.vehicle_model} • {detailsDriver?.vehicle_plate}</p>
                 </div>
              </div>
           </DialogHeader>

           <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {loadingDetails ? (
                <div className="py-12 text-center text-[#666] animate-pulse">Carregando detalhes...</div>
              ) : (
                <>
                  {driverOrders?.previousShift && driverOrders.previousShift.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle size={18} className="text-red-600" />
                        <h3 className="font-bold uppercase text-xs tracking-widest text-red-600 flex items-center gap-2">
                          TURNOS ANTERIORES
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] animate-pulse">PENDENTE</span>
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {driverOrders.previousShift.map((order: any) => (
                          <div key={order.id} className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-sm">
                             <div className="flex justify-between items-start mb-2">
                                <div>
                                   <span className="text-[10px] font-bold bg-white px-2 py-1 rounded text-red-600">#{order.display_id || order.id.slice(0,8)}</span>
                                   <p className="text-sm font-bold mt-1">{order.addresses?.street}, {order.addresses?.number}</p>
                                   <p className="text-[11px] text-[#666]">Saída: {new Date(order.dispatched_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-bold text-red-600">R$ {Number(order.total_amount).toFixed(2)}</p>
                                   <p className="text-[10px] uppercase font-bold text-[#666]">{order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'cash' ? 'Dinheiro' : 'Cartão'}</p>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={18} className="text-apollo-orange" />
                      <h3 className="font-bold uppercase text-xs tracking-widest text-[#666]">No Turno Atual ({driverOrders?.inProgress.length || 0})</h3>
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
                      <h3 className="font-bold uppercase text-xs tracking-widest text-[#666]">Entregues no Turno ({driverOrders?.delivered.length || 0})</h3>
                    </div>
                    <div className="space-y-3">
                      {driverOrders?.delivered.length === 0 && <p className="text-sm text-[#666] italic bg-white p-4 rounded-xl border border-black/5">Nenhuma entrega realizada no turno.</p>}
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

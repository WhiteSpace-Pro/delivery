'use client'

import { useState, useEffect } from 'react'
import { Plus, Copy, Check, Key, Clock, Bike, AlertCircle, MapPin } from 'lucide-react'
import { toggleDriverStatus, createDriver, resetDriverPassword, getDriverOrdersDetails } from '@/app/(admin)/actions/delivery-actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const STORE_COORDS = { lat: -19.9077, lng: -43.8948 }
const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

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
  location?: { lat: number | null, lng: number | null, updated_at?: string } | null
}

export function DeliveryList({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
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

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to profile changes (online/offline status)
    const profileChannel = supabase
      .channel('delivery-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `tenant_id=eq.${TENANT_ID}`
        },
        (payload) => {
          setDrivers(prev => prev.map(d =>
            d.id === payload.new.id ? { ...d, is_active: payload.new.is_active } : d
          ))
        }
      )
      .subscribe()

    // Subscribe to location changes
    const locationChannel = supabase
      .channel('delivery-location-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_current_location',
          filter: `tenant_id=eq.${TENANT_ID}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setDrivers(prev => prev.map(d =>
              d.id === payload.new.delivery_id ? { ...d, location: { lat: payload.new.lat ?? null, lng: payload.new.lng ?? null, updated_at: payload.new.updated_at } } : d
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const tempPass = Math.random().toString(36).slice(-8)
    try {
      await createDriver({ ...newDriver, password_temp: tempPass })
      setGeneratedPassword(tempPass)
    } catch (err: any) {
      alert(err.message)
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
        <h2 className="text-xl font-bold text-[#0D0D0D]">Equipe de Entrega</h2>
        <button
          onClick={() => {
            setIsModalOpen(true)
            setGeneratedPassword(null)
          }}
          className="bg-apollo-orange text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-apollo-orange/20"
        >
          <Plus size={20} />
          Novo Motoboy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => {
          const distance = driver.location?.lat && driver.location?.lng
            ? distanciaMetros(STORE_COORDS.lat, STORE_COORDS.lng, driver.location.lat, driver.location.lng)
            : null

          const isNearBase = distance !== null && distance <= 50

          return (
            <div
              key={driver.id}
              className={cn(
                "bg-white p-6 rounded-3xl border border-black/5 shadow-sm transition-all hover:shadow-md cursor-pointer",
                !driver.is_active && "opacity-70"
              )}
              onClick={() => handleOpenDetails(driver)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                    driver.is_active ? "bg-apollo-orange/10 text-apollo-orange" : "bg-gray-100 text-gray-400"
                  )}>
                    {driver.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0D0D0D]">{driver.full_name}</h3>
                    <p className="text-xs text-[#666]">{driver.phone}</p>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={!!driver.is_active}
                    onCheckedChange={() => handleToggle(driver.id, !!driver.is_active)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#F8F7F5] p-3 rounded-2xl text-center">
                  <p className="text-[10px] uppercase font-bold text-[#666] mb-1">Entregas</p>
                  <p className="text-xl font-black text-[#0D0D0D]">{driver.ordersToday}</p>
                </div>
                <div className="bg-[#F8F7F5] p-3 rounded-2xl text-center relative overflow-hidden">
                  <p className="text-[10px] uppercase font-bold text-[#666] mb-1">No Turno</p>
                  <p className="text-xl font-black text-apollo-orange">{driver.inProgressCount}</p>
                  {driver.previousShiftCount > 0 && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg animate-pulse">
                      +{driver.previousShiftCount} ANT.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div className="flex items-center gap-2">
                  <Bike size={14} className="text-[#666]" />
                  <span className="text-[10px] font-medium text-[#666] truncate max-w-[120px]">
                    {driver.vehicle_model} ({driver.vehicle_plate})
                  </span>
                </div>
                {driver.location?.lat ? (
                   <div className={cn(
                     "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold",
                     isNearBase ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600"
                   )}>
                     <MapPin size={10} />
                     {isNearBase ? "NA BASE" : `${(distance! / 1000).toFixed(1)}km`}
                   </div>
                ) : (
                  <span className="text-[10px] font-bold text-[#999]">SEM GPS</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#F8F7F5] sm:max-w-[500px] p-0 overflow-hidden">
           <DialogHeader className="p-6 bg-white border-b border-[#0D0D0D]/5">
              <DialogTitle className="text-xl font-bold text-[#0D0D0D]">Cadastrar Motoboy</DialogTitle>
           </DialogHeader>

           {generatedPassword ? (
             <div className="p-12 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Check size={32} />
                </div>
                <div>
                   <h3 className="text-lg font-bold">Motoboy Criado!</h3>
                   <p className="text-sm text-[#666]">Envie os dados de acesso para o motoboy.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4 text-left">
                   <div>
                      <Label className="text-[10px] uppercase font-bold text-[#666]">E-mail</Label>
                      <p className="font-medium">{newDriver.email}</p>
                   </div>
                   <div>
                      <Label className="text-[10px] uppercase font-bold text-[#666]">Senha Temporária</Label>
                      <div className="flex items-center justify-between">
                         <p className="font-mono font-bold text-lg">{generatedPassword}</p>
                         <button onClick={() => copyToClipboard(generatedPassword)} className="text-apollo-orange p-2 hover:bg-apollo-orange/5 rounded-lg">
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                         </button>
                      </div>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-[#0D0D0D] text-white rounded-2xl font-bold">Concluir</button>
             </div>
           ) : (
             <form onSubmit={onSubmit}>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Nome Completo</Label><input required value={newDriver.full_name} onChange={e => setNewDriver({...newDriver, full_name: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">E-mail (Login)</Label><input required type="email" value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Telefone/WhatsApp</Label><input required value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Marca</Label><input required value={newDriver.vehicle_brand} onChange={e => setNewDriver({...newDriver, vehicle_brand: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Modelo</Label><input required value={newDriver.vehicle_model} onChange={e => setNewDriver({...newDriver, vehicle_model: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Cor</Label><input required value={newDriver.vehicle_color} onChange={e => setNewDriver({...newDriver, vehicle_color: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm" /></div>
                      <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-[#666]">Placa</Label><input required value={newDriver.vehicle_plate} onChange={e => setNewDriver({...newDriver, vehicle_plate: formatPlate(e.target.value)})} maxLength={8} className="w-full p-3 rounded-xl border border-black/10 text-sm font-mono" /></div>
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[#666]">Tipo de Veículo</Label>
                      <select value={newDriver.vehicle_type} onChange={e => setNewDriver({...newDriver, vehicle_type: e.target.value})} className="w-full p-3 rounded-xl border border-black/10 text-sm bg-white">
                         <option>Moto</option><option>Carro</option><option>Bicicleta</option><option>Van</option>
                      </select>
                   </div>
                </div>
                <DialogFooter className="p-6 bg-white border-t border-[#0D0D0D]/5">
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
                  <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => handleResetPassword(detailsDriver!.email)} className="bg-white p-4 rounded-2xl border border-black/5 flex items-center gap-3 hover:bg-gray-50 group">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-apollo-orange">
                           <Key size={20} />
                        </div>
                        <div className="text-left">
                           <p className="text-xs font-bold">Resetar Senha</p>
                           <p className="text-[10px] text-[#666]">Gerar link de acesso</p>
                        </div>
                     </button>
                     {resetLink && (
                        <button onClick={() => copyToClipboard(resetLink)} className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3 hover:bg-green-100 group">
                           <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-600">
                              {copied ? <Check size={20} /> : <Copy size={20} />}
                           </div>
                           <div className="text-left">
                              <p className="text-xs font-bold text-green-700">Link Gerado!</p>
                              <p className="text-[10px] text-green-600">Clique para copiar</p>
                           </div>
                        </button>
                     )}
                  </div>

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

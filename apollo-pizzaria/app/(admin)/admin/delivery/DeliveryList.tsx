'use client'

import { useState } from 'react'
import { Plus, User, Mail, Truck, Copy, Check, Phone } from 'lucide-react'
import { toggleDriverStatus, createDriver, getDriversWithStats } from '@/app/(admin)/actions/delivery-actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Driver {
  id: string
  full_name: string | null
  phone: string | null
  email: string
  is_active: boolean | null
  vehicle_type: string | null
  vehicle_color: string | null
  vehicle_plate: string | null
  ordersToday: number
}

export function DeliveryList({ initialDrivers }: { initialDrivers: Driver[] }) {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newDriver, setNewDriver] = useState({
    full_name: '',
    email: '',
    phone: '',
    vehicle_type: 'Moto',
    vehicle_color: '',
    vehicle_plate: ''
  })
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleToggle = async (driverId: string, currentStatus: boolean) => {
    try {
      await toggleDriverStatus(driverId, currentStatus)
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, is_active: !currentStatus } : d))
    } catch (error) {
      console.error('Failed to toggle driver status:', error)
    }
  }

  const formatPlate = (value: string) => {
    // Remove non-alphanumeric
    const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    if (clean.length <= 7) {
      // ABC-1234
      if (clean.length > 3) {
        return clean.slice(0, 3) + '-' + clean.slice(3)
      }
      return clean
    }
    // ABC1D23 (Mercosul) - usually just display it clean or handled
    return clean.slice(0, 7)
  }

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const tempPass = Math.random().toString(36).slice(-8)
    try {
      await createDriver({ ...newDriver, password_temp: tempPass })
      setGeneratedPassword(tempPass)
      // Refresh list
      const updatedDrivers = await getDriversWithStats()
      setDrivers(updatedDrivers as unknown as Driver[])
    } catch (error) {
      console.error('Failed to create driver:', error)
      alert('Erro ao criar motoboy. Verifique se o e-mail já está em uso.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setGeneratedPassword(null)
            setNewDriver({
              full_name: '',
              email: '',
              phone: '',
              vehicle_type: 'Moto',
              vehicle_color: '',
              vehicle_plate: ''
            })
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-[#E85D24] text-white rounded-xl font-bold hover:bg-[#D14D1B] transition-colors shadow-sm"
        >
          <Plus size={20} />
          Novo motoboy
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#0D0D0D]/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8F7F5] border-b border-[#0D0D0D]/10">
                <th className="px-6 py-4 font-bold text-sm text-[#0D0D0D]/60 uppercase tracking-wider">Motoboy</th>
                <th className="px-6 py-4 font-bold text-sm text-[#0D0D0D]/60 uppercase tracking-wider">Veículo</th>
                <th className="px-6 py-4 font-bold text-sm text-[#0D0D0D]/60 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-sm text-[#0D0D0D]/60 uppercase tracking-wider text-center">Pedidos hoje</th>
                <th className="px-6 py-4 font-bold text-sm text-[#0D0D0D]/60 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0D0D0D]/5">
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-[#F8F7F5]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-apollo-orange/10 flex items-center justify-center text-apollo-orange font-bold">
                          {driver.full_name?.charAt(0) || <User size={18} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0D0D0D]">{driver.full_name || 'N/A'}</span>
                          <div className="flex flex-col text-[13px] text-[#555555] font-dm-sans">
                            <span className="flex items-center gap-1"><Mail size={12} className="text-[#4A4A4A]" /> {driver.email}</span>
                            <span className="flex items-center gap-1"><Phone size={12} className="text-[#4A4A4A]" /> {driver.phone || 'S/T'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-[13px] text-[#555555] font-dm-sans">
                         <span className="font-bold text-[#4A4A4A]">{driver.vehicle_type} {driver.vehicle_color}</span>
                         <span className="text-[#666] uppercase">{driver.vehicle_plate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        driver.is_active
                          ? 'bg-[#D1FAE5] text-[#065F46]'
                          : 'bg-[#F3F4F6] text-[#6B7280]'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${driver.is_active ? 'bg-[#10B981]' : 'bg-gray-400'}`} />
                        {driver.is_active ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-[#0D0D0D]">{driver.ordersToday}</span>
                        <span className="text-[10px] text-[#666] uppercase">Entregues</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-[#666] font-medium">Ativo</span>
                        <Switch
                          checked={driver.is_active ?? false}
                          onCheckedChange={() => handleToggle(driver.id, driver.is_active ?? false)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#666]">
                    Nenhum motoboy cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white rounded-2xl sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
          {!generatedPassword ? (
            <form onSubmit={handleCreateDriver}>
              <DialogHeader className="p-6 bg-[#F8F7F5] border-b border-[#0D0D0D]/5">
                <DialogTitle className="text-xl font-bold text-[#0D0D0D] flex items-center gap-2">
                  <Truck className="text-apollo-orange" size={24} />
                  Cadastrar Novo Motoboy
                </DialogTitle>
              </DialogHeader>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="full_name" className="text-[11px] font-bold text-[#0D0D0D]/60 uppercase tracking-wider">Nome Completo</Label>
                  <input
                    id="full_name"
                    required
                    value={newDriver.full_name}
                    onChange={(e) => setNewDriver({ ...newDriver, full_name: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0D0D0D]/10 focus:outline-none focus:ring-2 focus:ring-apollo-orange/20 focus:border-apollo-orange transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[11px] font-bold text-[#0D0D0D]/60 uppercase tracking-wider">Telefone</Label>
                  <input
                    id="phone"
                    required
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    placeholder="(31) 99999-9999"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0D0D0D]/10 focus:outline-none focus:ring-2 focus:ring-apollo-orange/20 focus:border-apollo-orange transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] font-bold text-[#0D0D0D]/60 uppercase tracking-wider">E-mail de Acesso</Label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                    placeholder="joao@apollo.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0D0D0D]/10 focus:outline-none focus:ring-2 focus:ring-apollo-orange/20 focus:border-apollo-orange transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                   <Label htmlFor="vehicle_type" className="text-[11px] font-bold text-[#0D0D0D]/60 uppercase tracking-wider">Veículo</Label>
                   <select
                     id="vehicle_type"
                     value={newDriver.vehicle_type}
                     onChange={(e) => setNewDriver({ ...newDriver, vehicle_type: e.target.value })}
                     className="w-full px-4 py-2.5 rounded-xl border border-[#0D0D0D]/10 focus:outline-none focus:ring-2 focus:ring-apollo-orange/20 focus:border-apollo-orange transition-all text-sm bg-white"
                   >
                     <option>Moto</option>
                     <option>Carro</option>
                     <option>Bicicleta</option>
                     <option>Van</option>
                   </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle_color" className="text-[11px] font-bold text-[#0D0D0D]/60 uppercase tracking-wider">Cor do Veículo</Label>
                  <input
                    id="vehicle_color"
                    value={newDriver.vehicle_color}
                    onChange={(e) => setNewDriver({ ...newDriver, vehicle_color: e.target.value })}
                    placeholder="Vermelha"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0D0D0D]/10 focus:outline-none focus:ring-2 focus:ring-apollo-orange/20 focus:border-apollo-orange transition-all text-sm"
                  />
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="vehicle_plate" className="text-[11px] font-bold text-[#0D0D0D]/60 uppercase tracking-wider">Placa</Label>
                  <input
                    id="vehicle_plate"
                    value={newDriver.vehicle_plate}
                    onChange={(e) => setNewDriver({ ...newDriver, vehicle_plate: formatPlate(e.target.value) })}
                    placeholder="ABC-1234"
                    maxLength={8}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0D0D0D]/10 focus:outline-none focus:ring-2 focus:ring-apollo-orange/20 focus:border-apollo-orange transition-all text-sm font-mono uppercase"
                  />
                </div>
              </div>

              <DialogFooter className="p-6 bg-[#F8F7F5]/50 flex-col sm:flex-row gap-3 border-t border-[#0D0D0D]/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-[#666] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-sm font-bold bg-[#E85D24] text-white rounded-xl hover:bg-[#D14D1B] disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Motoboy'}
                </button>
              </DialogFooter>
            </form>
          ) : (
            <div className="p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#0D0D0D]">Motoboy Criado!</h3>
                <p className="text-[#666] text-sm mt-1">Copie a senha temporária abaixo e envie para o motoboy.</p>
              </div>

              <div className="bg-[#F8F7F5] p-6 rounded-2xl border border-dashed border-[#0D0D0D]/10 relative group">
                <p className="text-xs font-bold text-[#0D0D0D]/40 uppercase mb-2">Senha Temporária</p>
                <p className="text-3xl font-mono font-bold text-apollo-orange tracking-wider">
                  {generatedPassword}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="absolute top-4 right-4 p-2 text-[#666] hover:text-apollo-orange transition-colors bg-white rounded-lg shadow-sm border border-[#0D0D0D]/5"
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-4 bg-[#0D0D0D] text-white rounded-xl font-bold hover:bg-[#262626] transition-colors"
              >
                Concluir
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

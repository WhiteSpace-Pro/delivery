'use client'

import { useState } from 'react'
import { toggleStoreStatus } from '@/app/(admin)/actions/order-actions'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function StoreStatusToggle({ isActive: initialStatus }: { isActive: boolean }) {
  const [isActive, setIsActive] = useState(initialStatus)

  const handleToggle = async () => {
    const nextStatus = !isActive
    setIsActive(nextStatus) // Optimistic update

    try {
      await toggleStoreStatus(isActive)
    } catch (error) {
      setIsActive(!nextStatus) // Rollback on error
      console.error('Failed to toggle store status:', error)
    }
  }

  return (
    <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-[#E5E7EB] shadow-sm">
      <Switch
        id="store-status"
        checked={isActive}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-[#E85D24]"
      />
      <Label htmlFor="store-status" className="font-semibold text-sm cursor-pointer">
        {isActive ? 'Loja aberta' : 'Loja fechada'}
      </Label>
    </div>
  )
}

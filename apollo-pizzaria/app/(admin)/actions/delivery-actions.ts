/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'kitchen'].includes(profile.role)) {
    throw new Error('Forbidden')
  }
}

export async function getDriversWithStats() {
  await requireAdmin()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  // Fetch drivers
  const { data: drivers, error: driversError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .eq('role', 'delivery')
    .eq('tenant_id', TENANT_ID)

  if (driversError) {
    console.error('Error fetching drivers:', driversError)
    throw new Error('Failed to fetch drivers')
  }

  // Fetch today's delivered orders for these drivers
  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('assigned_delivery_id')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'delivered')
    .gte('created_at', todayISO)

  if (ordersError) {
    console.error('Error fetching driver orders:', ordersError)
    throw new Error('Failed to fetch driver stats')
  }

  // Fetch emails from auth.users
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

  if (authError) {
    console.error('Error fetching auth users:', authError)
  }

  const stats = drivers.map(driver => {
    const ordersCount = orders?.filter(o => o.assigned_delivery_id === driver.id).length || 0
    const authUser = authUsers?.users.find(u => u.id === driver.id)

    return {
      id: driver.id,
      full_name: driver.full_name,
      role: driver.role,
      is_active: driver.is_active,
      email: authUser?.email || 'N/A',
      ordersToday: ordersCount
    }
  })

  return stats
}

export async function createDriver(formData: { full_name: string; email: string; password_temp: string }) {
  await requireAdmin()

  // 1. Create user in Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.password_temp,
    email_confirm: true,
    user_metadata: {
      role: 'delivery',
      tenant_id: TENANT_ID,
      full_name: formData.full_name
    }
  })

  if (authError) {
    console.error('Error creating driver auth:', authError)
    throw new Error(authError.message)
  }

  // 2. Profile update (role 'delivery' and tenant_id)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role: 'delivery',
      tenant_id: TENANT_ID,
      full_name: formData.full_name,
      is_active: false
    } as any)
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('Error updating driver profile:', profileError)
  }

  revalidatePath('/admin/delivery')
  return { success: true }
}

export async function toggleDriverStatus(driverId: string, currentStatus: boolean) {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: !currentStatus } as any)
    .eq('id', driverId)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error toggling driver status:', error)
    throw new Error('Failed to toggle status')
  }

  revalidatePath('/admin/delivery')
}

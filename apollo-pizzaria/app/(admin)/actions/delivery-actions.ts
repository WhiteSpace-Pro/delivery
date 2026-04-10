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

  const { data: drivers, error: driversError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, role, is_active, created_at, vehicle_type, vehicle_color, vehicle_plate, vehicle_brand, vehicle_model' as any)
    .eq('role', 'delivery')
    .eq('tenant_id', TENANT_ID)

  if (driversError) {
    console.error('Error fetching drivers:', driversError)
    throw new Error('Failed to fetch drivers')
  }

  const typedDrivers = (drivers || []) as any[]

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

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()

  const stats = typedDrivers.map(driver => {
    const ordersCount = orders?.filter(o => o.assigned_delivery_id === driver.id).length || 0
    const authUser = authUsers?.users.find(u => u.id === driver.id)

    return {
      id: driver.id,
      full_name: driver.full_name,
      phone: driver.phone,
      role: driver.role,
      is_active: driver.is_active,
      vehicle_type: driver.vehicle_type,
      vehicle_color: driver.vehicle_color,
      vehicle_plate: driver.vehicle_plate,
      vehicle_brand: driver.vehicle_brand,
      vehicle_model: driver.vehicle_model,
      email: authUser?.email || 'N/A',
      ordersToday: ordersCount
    }
  })

  return stats
}

export async function createDriver(formData: {
  full_name: string;
  email: string;
  phone: string;
  password_temp: string;
  vehicle_type: string;
  vehicle_color: string;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
}) {
  await requireAdmin()

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

  if (authError) throw new Error(authError.message)

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      role: 'delivery',
      tenant_id: TENANT_ID,
      full_name: formData.full_name,
      phone: formData.phone,
      vehicle_type: formData.vehicle_type,
      vehicle_color: formData.vehicle_color,
      vehicle_plate: formData.vehicle_plate,
      vehicle_brand: formData.vehicle_brand,
      vehicle_model: formData.vehicle_model,
      is_active: false
    } as any)
    .eq('id', authData.user.id)

  if (profileError) console.error(profileError)

  revalidatePath('/admin/delivery')
  return { success: true }
}

export async function toggleDriverStatus(driverId: string, currentStatus: boolean) {
  await requireAdmin()
  await supabaseAdmin
    .from('profiles')
    .update({ is_active: !currentStatus } as any)
    .eq('id', driverId)
  revalidatePath('/admin/delivery')
}

export async function resetDriverPassword(email: string) {
  await requireAdmin()
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm?next=/minha-conta/senha` }
  })
  if (error) throw new Error(error.message)
  return data.properties.action_link
}

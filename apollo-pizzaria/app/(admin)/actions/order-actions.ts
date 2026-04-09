/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { OrderStatus } from '@/types/enums'
import { revalidatePath } from 'next/cache'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'kitchen'].includes(profile.role)) throw new Error('Forbidden')
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin()

  const now = new Date().toISOString()
  const updateData: any = { status }

  if (status === 'confirmed') updateData.confirmed_at = now
  if (status === 'preparing') updateData.preparing_at = now
  if (status === 'ready') updateData.ready_at = now
  if (status === 'out_for_delivery') updateData.dispatched_at = now
  if (status === 'delivered') updateData.delivered_at = now

  const { error } = await supabaseAdmin
    .from('orders')
    .update(updateData as any)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error updating order status:', error)
    throw new Error('Failed to update order status')
  }

  revalidatePath('/admin', 'page')
}

export async function assignDriverAndSend(orderId: string, driverId: string | null) {
  await requireAdmin()

  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      assigned_delivery_id: driverId,
      status: 'out_for_delivery',
      dispatched_at: now,
    } as any)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error assigning driver:', error)
    throw new Error('Failed to assign driver')
  }

  revalidatePath('/admin', 'page')
}

export async function toggleStoreStatus(currentStatus: boolean) {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ is_active: !currentStatus } as any)
    .eq('id', TENANT_ID)

  if (error) {
    console.error('Error toggling store status:', error)
    throw new Error('Failed to toggle store status')
  }

  revalidatePath('/admin', 'page')
}

export async function getReceiptSignedUrl(receiptPath: string) {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(receiptPath, 60)
  if (error) throw new Error('Failed to get receipt URL')
  return data.signedUrl
}

export async function markNotificationAsRead(orderId: string) {
  await requireAdmin()

  await supabaseAdmin
    .from('notifications')
    .update({ is_read: true } as any)
    .eq('order_id' as any, orderId)
    .eq('type' as any, 'receipt_uploaded')
    .eq('tenant_id', TENANT_ID)

  revalidatePath('/admin', 'page')
}

export async function cancelOrder(orderId: string) {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled' } as any)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error cancelling order:', error)
    throw new Error('Failed to cancel order')
  }

  revalidatePath('/admin', 'page')
}

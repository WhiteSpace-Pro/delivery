/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { OrderStatus } from '@/types/enums'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

type OrderUpdate = Database['public']['Tables']['orders']['Update']

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = createClient()

  const updateData: OrderUpdate = { status }
  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error updating order status:', error)
    throw new Error('Failed to update order status')
  }

  revalidatePath('/admin', 'page')
}

export async function assignDriverAndSend(orderId: string, driverId: string | null) {
  const supabase = createClient()

  const updateData: OrderUpdate = {
    assigned_delivery_id: driverId,
    status: 'out_for_delivery'
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error assigning driver:', error)
    throw new Error('Failed to assign driver')
  }

  revalidatePath('/admin', 'page')
}

export async function toggleStoreStatus(currentStatus: boolean) {
  const supabase = createClient()

  const { error } = await supabase
    .from('tenants')
    .update({ is_active: !currentStatus })
    .eq('id', TENANT_ID)

  if (error) {
    console.error('Error toggling store status:', error)
    throw new Error('Failed to toggle store status')
  }

  revalidatePath('/admin', 'page')
}

export async function getReceiptSignedUrl(receiptPath: string) {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(receiptPath, 60)

  if (error) {
    console.error('Error creating signed URL:', error)
    throw new Error('Failed to get receipt URL')
  }

  return data.signedUrl
}

export async function markNotificationAsRead(orderId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true } as any)
    .eq('order_id' as any, orderId)
    .eq('type' as any, 'receipt_uploaded')
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error marking notification as read:', error)
    throw new Error('Failed to mark notification as read')
  }

  revalidatePath('/admin', 'page')
}

export async function cancelOrder(orderId: string) {
  const supabase = createClient()

  const updateData: OrderUpdate = { status: 'cancelled' }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error('Error cancelling order:', error)
    throw new Error('Failed to cancel order')
  }

  revalidatePath('/admin', 'page')
}

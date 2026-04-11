/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { OrderStatus } from '@/types/enums'
import { revalidatePath } from 'next/cache'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6'

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

export async function getKanbanOrders() {
  await requireAdmin()

  const startOfPeriod = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items(*, products!order_items_product_id_fkey(name, type)),
      addresses(*),
      customer:profiles!orders_customer_id_fkey(full_name, phone),
      delivery:profiles!orders_assigned_delivery_id_fkey(full_name, phone)
    `)
    .eq("tenant_id", TENANT_ID)
    .gte("created_at", startOfPeriod)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching kanban orders:", error)
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  return data as any
}

export async function getOrderDetails(orderId: string) {
  await requireAdmin()

  const { data, error } = await (supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, status, payment_method, payment_status,
      subtotal, delivery_fee, total_amount,
      customer_name, customer_phone,
      order_items(id, quantity, unit_price, products!order_items_product_id_fkey(name), half_product:products!order_items_half_product_id_fkey(name), edge:pizza_options!order_items_edge_option_id_fkey(name)),
      addresses(street, number, complement, neighborhood, city),
      customer:profiles!orders_customer_id_fkey(full_name, phone),
      delivery:profiles!orders_assigned_delivery_id_fkey(full_name, phone)
    `) as any)
    .eq('id', orderId)
    .single()

  if (error) {
    console.error("Error fetching order details:", error)
    throw new Error(`Failed to fetch order details: ${error.message}`)
  }

  return data as any
}

export async function getAvailableDrivers() {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'delivery')
    .eq('is_active', true)
    .eq('tenant_id', TENANT_ID)

  if (error) {
    console.error("Error fetching available drivers:", error)
    throw new Error(`Failed to fetch drivers: ${error.message}`)
  }

  return data
}

export async function getDeliveryOrders() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      addresses(street, number, complement, neighborhood, city, lat, lng),
      order_items(quantity, products!order_items_product_id_fkey(name))
    `)
    .eq('assigned_delivery_id', user.id)
    .eq('status', 'out_for_delivery')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: true })

  if (error) {
    console.error("Error fetching delivery orders:", error)
    throw new Error(`Failed to fetch deliveries: ${error.message}`)
  }

  return data as any
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

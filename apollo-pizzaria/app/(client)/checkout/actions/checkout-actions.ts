/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

export async function createProfile(params: {
  id: string
  full_name: string
  phone: string
  tenant_id: string
}) {
  await supabaseAdmin
    .from('profiles')
    .upsert({
      id: params.id,
      full_name: params.full_name,
      phone: params.phone,
      tenant_id: params.tenant_id,
      role: 'customer',
      is_active: true,
    }, { onConflict: 'id' })
}

export async function confirmReceiptUpload(
  orderId: string,
  receiptPath: string,
  tenantId: string
) {
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      pix_receipt_note: receiptPath,
      status: 'pending',
      payment_status: 'pending'
    } as any)
    .eq('id', orderId)

  if (updateError) throw new Error('Erro ao vincular o comprovante ao pedido.')

  await supabaseAdmin
    .from('notifications')
    .insert({
      tenant_id: tenantId,
      order_id: orderId,
      type: 'order_status',
      title: 'Comprovante recebido',
      message: `Comprovante Pix enviado para o pedido #${orderId.substring(0, 8)}`,
      is_read: false,
    } as any)
}

interface PlaceOrderParams {
  customer_id: string
  customer_name: string | null
  customer_phone: string | null
  delivery_type: 'delivery' | 'pickup'
  delivery_address_id: string | null
  delivery_fee: number
  subtotal: number
  total_amount: number
  payment_method: 'pix' | 'cash' | 'credit_card' | 'debit_card'
  change_for: number | null
  delivery_instructions: string | null
  items: any[]
  // New address to save after order (optional)
  newAddress?: {
    label: string
    street: string
    number: string
    complement: string
    neighborhood: string
    zipcode: string
    delivery_region_id: string | null
    delivery_fee: number
    lat?: number
    lng?: number
  } | null
}

export async function placeOrder(params: PlaceOrderParams) {
  // 0. Ensure profile exists
  await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: params.customer_id,
        tenant_id: TENANT_ID,
        role: 'customer',
        full_name: params.customer_name ?? null,
        phone: params.customer_phone ?? null,
        is_active: true,
      } as any,
      { onConflict: 'id' }
    )

  // 1. Create order with correct initial statuses (Group 3 logic)
  const isPix = params.payment_method === 'pix'
  const initialStatus = isPix ? 'pending' : 'confirmed'
  const initialPaymentStatus = isPix ? 'pending' : 'awaiting_collection'

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      tenant_id: TENANT_ID,
      customer_id: params.customer_id,
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
      delivery_address_id: params.delivery_address_id,
      delivery_fee: params.delivery_fee,
      subtotal: params.subtotal,
      total_amount: params.total_amount,
      payment_method: params.payment_method,
      change_for: params.change_for,
      delivery_instructions: params.delivery_instructions,
      delivery_type: params.delivery_type,
      status: initialStatus,
      payment_status: initialPaymentStatus,
    } as any)
    .select()
    .single()

  if (orderError) {
    console.error('Order creation error:', orderError)
    throw new Error('Falha ao criar pedido')
  }

  // 2. Resolve half_product_ids by name
  const halfNames = params.items
    .filter(item => item.half_half && typeof item.half_half === 'string')
    .map(item => item.half_half as string)
  
  let halfProductMap: Record<string, string> = {}
  if (halfNames.length > 0) {
    const { data: halfProducts } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .in('name', halfNames)
      .eq('tenant_id', TENANT_ID)
    if (halfProducts) {
      halfProductMap = Object.fromEntries(halfProducts.map(p => [p.name, p.id]))
    }
  }

  // 3. Create order items
  const orderItems = params.items.map(item => ({
    tenant_id: TENANT_ID,
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    size: item.size || null,
    edge_option_id: item.border_id || null,
    is_half: !!item.half_half,
    half_product_id: item.half_half ? (halfProductMap[item.half_half as string] || null) : null,
    observations: item.observations || null,
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItems as any)

  if (itemsError) {
    console.error('Order items creation error:', itemsError)
    await supabaseAdmin.from('orders').delete().eq('id', order.id)
    throw new Error('Falha ao criar itens do pedido')
  }

  // 3. Save new address if requested and link to order
  if (params.newAddress) {
    const { data: savedAddress } = await supabaseAdmin
      .from('addresses')
      .insert({
        user_id: params.customer_id,
        tenant_id: TENANT_ID,
        label: params.newAddress.label || 'Casa',
        street: params.newAddress.street,
        number: params.newAddress.number,
        complement: params.newAddress.complement || null,
        neighborhood: params.newAddress.neighborhood,
        zipcode: params.newAddress.zipcode,
        delivery_region_id: params.newAddress.delivery_region_id || null,
        delivery_fee: params.newAddress.delivery_fee,
        lat: params.newAddress.lat || null,
        lng: params.newAddress.lng || null,
        city: 'Belo Horizonte',
        state: 'MG',
        is_primary: false,
      } as any)
      .select('id')
      .single()
    if (savedAddress?.id) {
      await supabaseAdmin
        .from('orders')
        .update({ delivery_address_id: savedAddress.id } as any)
        .eq('id', order.id)
    }
  }

  revalidatePath('/meus-pedidos')
  return order.id
}

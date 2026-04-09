/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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
    .update({ receipt_url: receiptPath } as never)
    .eq('id', orderId)

  if (updateError) throw new Error('Erro ao vincular o comprovante ao pedido.')

  await supabaseAdmin
    .from('notifications')
    .insert({
      tenant_id: tenantId,
      type: 'order_status',
      title: 'Comprovante recebido',
      message: `Comprovante Pix enviado para o pedido #${orderId.substring(0, 8)}`,
      is_read: false,
    } as never)
}

const TENANT_ID = '496c5a35-6843-4061-b3ab-159d15a0cbc6'

interface PlaceOrderParams {
  customer_name: string | null
  customer_phone: string | null
  customer_id: string | null
  delivery_type: 'delivery' | 'pickup'
  delivery_address_id: string | null
  delivery_fee: number
  subtotal: number
  total_amount: number
  payment_method: 'pix' | 'cash' | 'credit_card' | 'debit_card'
  change_for: number | null
  delivery_instructions: string | null
  items: any[]
}

export async function placeOrder(params: PlaceOrderParams) {
  // 1. Create order
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
      status: 'pending',
      payment_status: 'pending'
    } as any)
    .select()
    .single()

  if (orderError) {
    console.error('Order creation error:', orderError)
    throw new Error('Falha ao criar pedido')
  }

  // 2. Create order items
  const orderItems = params.items.map(item => ({
    tenant_id: TENANT_ID,
    order_id: order.id,
    product_id: item.id, // item.id is product_id from cart
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    size: item.size || null,
    edge_option_id: item.border_id || null,
    is_half: !!item.half_half,
    half_product_id: item.half_half?.id || null,
    observations: item.observations || null
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItems as any)

  if (itemsError) {
    console.error('Order items creation error:', itemsError)
    await supabaseAdmin.from('orders').delete().eq('id', order.id)
    throw new Error('Falha ao criar itens do pedido')
  }

  revalidatePath('/meus-pedidos')
  return order.id
}

export async function saveAddress(params: {
  user_id: string
  street: string
  number: string
  complement: string
  neighborhood: string
  delivery_region_id?: string | null
  delivery_fee: number
  zipcode?: string
  lat?: number
  lng?: number
}) {
  const { data, error } = await supabaseAdmin
    .from('addresses')
    .insert({
      ...params,
      tenant_id: TENANT_ID,
      label: 'Casa',
      city: 'Belo Horizonte',
      state: 'MG',
      is_primary: false
    } as any)
    .select()
    .single()

  if (error) {
    console.error('Save address error:', error)
    throw new Error('Falha ao salvar endereço')
  }

  return data
}

import { createClient } from "@/lib/supabase/client";
import { CartItem } from "@/contexts/CartContext";

export interface OrderData {
  address: string;
  payment_method: "pix" | "credit_card" | "debit_card" | "cash";
  change_for: number | null;
  customer_name: string;
}

const APOLLO_TENANT_ID = "496c5a35-6843-4061-b3ab-159d15a0cbc6";

export async function handlePlaceOrder(
  orderData: OrderData,
  items: CartItem[],
  subtotal: number
) {
  const supabase = createClient();
  const tenant_id = process.env.NEXT_PUBLIC_TENANT_ID || APOLLO_TENANT_ID;

  try {
    // 1. Insert order
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id,
        delivery_type: 'delivery',
        payment_method: orderData.payment_method,
        subtotal: subtotal,
        total_amount: subtotal,
        status: 'pending',
        delivery_instructions: orderData.address,
        change_for: orderData.change_for,
      } as any)
      .select()
      .single();

    if (orderError) {
      if (orderError.code === '403') {
        console.error("[Apollo/orders] RLS Error inserting order:", orderError);
      }
      throw orderError;
    }

    // 2. Insert order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      tenant_id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      size: (item.size === 'M' || item.size === 'G' || item.size === 'GG') ? item.size : null,
      observations: `${item.observations || ''} ${item.half_half ? 'Meia: ' + item.half_half : ''} ${item.border ? 'Borda: ' + item.border : ''}`.trim()
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (itemsError) {
      if (itemsError.code === '403') {
        console.error("[Apollo/orders] RLS Error inserting items:", itemsError);
      }
      throw itemsError;
    }

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("[Apollo/orders] Order creation failed:", error);
    return { success: false, error };
  }
}

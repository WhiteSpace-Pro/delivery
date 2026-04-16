'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateAddressLocation(addressId: string, updates: {
  street?: string,
  number?: string,
  neighborhood?: string,
  city?: string,
  state?: string,
  zipcode?: string,
  lat: number,
  lng: number,
  delivery_fee?: number
}) {
  const { error } = await supabaseAdmin
    .from('addresses')
    .update(updates as any)
    .eq('id', addressId)

  if (error) {
    console.error('Failed to update address location:', error)
    throw new Error('Falha ao atualizar o endereço')
  }

  revalidatePath('/admin')
  revalidatePath('/checkout')
}

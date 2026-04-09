import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'not authenticated' })

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, status, created_at')
    .eq('customer_id', user.id)
    .eq('tenant_id', process.env.NEXT_PUBLIC_TENANT_ID_APOLLO!)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    user_id: user.id,
    tenant_id: process.env.NEXT_PUBLIC_TENANT_ID_APOLLO,
    orders_count: orders?.length ?? 0,
    orders,
    error
  })
}

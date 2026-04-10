import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO ?? '496c5a35-6843-4061-b3ab-159d15a0cbc6'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, user_id, full_name, phone, tenant_id } = body
    const finalId = id || user_id

    if (!finalId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: finalId,
          tenant_id: tenant_id ?? TENANT_ID,
          role: 'customer',
          full_name: full_name ?? null,
          phone: phone ?? null,
          is_active: true,
        } as any,
        { onConflict: 'id' }
      )

    if (error) {
      console.error('[create-profile] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[create-profile] unexpected:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json()
    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ found: false })
    }

    const isEmail = identifier.includes('@')

    if (isEmail) {
      // Paginated search through auth.users by email
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (error) return NextResponse.json({ found: false })

      const authUser = data.users.find(u => u.email?.toLowerCase() === identifier.trim().toLowerCase())
      if (!authUser) return NextResponse.json({ found: false })

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, phone')
        .eq('id', authUser.id)
        .maybeSingle()

      const name = profile?.full_name || authUser.email!.split('@')[0]
      return NextResponse.json({
        found: true,
        name,
        phone: profile?.phone || '',
        avatar_initial: name.charAt(0).toUpperCase(),
        loginEmail: authUser.email!.toLowerCase(),
      })
    } else {
      // Phone lookup — query profiles.phone
      const digits = identifier.replace(/\D/g, '');
      if (digits.length < 10) return NextResponse.json({ found: false })

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone')
        .ilike('phone', `%${digits.slice(-8)}%`)

      if (!profiles || profiles.length === 0) return NextResponse.json({ found: false })

      const profile = profiles.find(p => p.phone && p.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))

      if (!profile) return NextResponse.json({ found: false })

      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      if (!authData?.user?.email) return NextResponse.json({ found: false })

      const name = profile.full_name || 'Usuário'
      return NextResponse.json({
        found: true,
        name,
        phone: profile.phone || '',
        avatar_initial: name.charAt(0).toUpperCase(),
        loginEmail: authData.user.email.toLowerCase(),
      })
    }
  } catch {
    return NextResponse.json({ found: false })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'acesso_negado', message: 'Você não tem permissão para acessar este recurso.' }, { status: 403 })
    }

    const userId = session.user.id

    // Fetch user profile to get role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'acesso_negado', message: 'Você não tem permissão para acessar este recurso.' }, { status: 403 })
    }

    const { role } = profile
    if (!['admin', 'delivery'].includes(role)) {
      return NextResponse.json({ error: 'acesso_negado', message: 'Você não tem permissão para acessar este recurso.' }, { status: 403 })
    }

    const checkinId = params.id

    // Fetch checkin details
    const { data: checkin, error: checkinError } = await supabaseAdmin
      .from('delivery_checkins')
      .select('delivery_id, storage_bucket, storage_path, expires_at')
      .eq('id', checkinId)
      .single()

    if (checkinError || !checkin) {
      return NextResponse.json({ error: 'nao_encontrado', message: 'Checkin não encontrado.' }, { status: 404 })
    }

    if (role === 'delivery' && checkin.delivery_id !== userId) {
      return NextResponse.json({ error: 'acesso_negado', message: 'Você não tem permissão para acessar este recurso.' }, { status: 403 })
    }

    if (!checkin.storage_bucket || !checkin.storage_path) {
       return NextResponse.json({ error: 'nao_encontrado', message: 'Arquivo não encontrado para este checkin.' }, { status: 404 })
    }

    if (checkin.expires_at && new Date(checkin.expires_at) < new Date()) {
      return NextResponse.json({ error: 'acesso_negado', message: 'Você não tem permissão para acessar este recurso.' }, { status: 403 })
    }

    // Generate Signed URL
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(checkin.storage_bucket)
      .createSignedUrl(checkin.storage_path, 300) // 5 minutes

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'erro_interno', message: 'Não foi possível gerar a URL.' }, { status: 500 })
    }

    return NextResponse.json({ url: urlData.signedUrl }, { status: 200 })

  } catch (err: any) {
    return NextResponse.json({ error: 'erro_interno', message: 'Erro ao processar a requisição.' }, { status: 500 })
  }
}

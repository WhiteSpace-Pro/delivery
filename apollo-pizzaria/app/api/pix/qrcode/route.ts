import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const valor = searchParams.get('valor')
  const txid = searchParams.get('txid')
  const saida = searchParams.get('saida') ?? 'br'

  try {
    // Buscar chave Pix do tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', TENANT_ID)
      .single()

    const pixKey = (tenant as any)?.pix_key || '+5531985375524'
    const cleanPixKey = pixKey.replace(/\s/g, '')

    const url = new URL('https://gerarqrcodepix.com.br/api/v1')
    url.searchParams.set('nome', (tenant as any)?.name || 'Apollo Pizzaria')
    url.searchParams.set('cidade', 'Belo Horizonte')
    url.searchParams.set('chave', cleanPixKey)
    url.searchParams.set('valor', valor ?? '0')
    url.searchParams.set('txid', txid ?? 'APOLLO')
    url.searchParams.set('saida', saida)
    url.searchParams.set('tamanho', '300')

    const response = await fetch(url.toString())

    if (saida === 'qr') {
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        headers: { 'Content-Type': 'image/png' }
      })
    } else {
      const text = await response.text()
      return NextResponse.json({ brcode: text })
    }
  } catch (error) {
    console.error('PIX Proxy Error:', error)
    return NextResponse.json({ error: 'Failed to generate PIX' }, { status: 500 })
  }
}

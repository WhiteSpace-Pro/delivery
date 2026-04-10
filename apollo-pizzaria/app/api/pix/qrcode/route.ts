import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { generateBrCode } from '@/lib/pix/brcode'
import { supabaseAdmin } from '@/lib/supabase/admin'

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const valor = parseFloat(searchParams.get('valor') ?? '0')
  const txid = searchParams.get('txid') ?? 'APOLLO'
  const saida = searchParams.get('saida') ?? 'br'

  try {
    // Buscar chave Pix do tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', TENANT_ID)
      .single()

    const brcode = generateBrCode({
      chave: (tenant as any)?.pix_key || '+5531985375524',
      nome: (tenant as any)?.name || 'Apollo Pizzaria',
      cidade: 'Belo Horizonte',
      valor,
      txid
    })

    if (saida === 'qr') {
      // Gerar imagem PNG do QR Code
      const buffer = await QRCode.toBuffer(brcode, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      })

      // Standard response using Uint8Array to avoid type issues with Buffer in some environments
      return new Response(new Uint8Array(buffer), {
        headers: { 'Content-Type': 'image/png' }
      })
    } else {
      return NextResponse.json({ brcode })
    }
  } catch (error) {
    console.error('PIX Generation Error:', error)
    return NextResponse.json({ error: 'Failed to generate PIX' }, { status: 500 })
  }
}

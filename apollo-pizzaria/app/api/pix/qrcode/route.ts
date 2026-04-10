import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { generateBrCode } from '@/lib/pix/brcode'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const valor = parseFloat(searchParams.get('valor') ?? '0')
  const txid = searchParams.get('txid') ?? 'APOLLO'
  const saida = searchParams.get('saida') ?? 'br'

  // Buscar chave Pix do tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('pix_key, name' as any)
    .eq('id', process.env.NEXT_PUBLIC_TENANT_ID_APOLLO!)
    .single()

  const brcode = generateBrCode({
    chave: (tenant as any)?.pix_key ?? '+5531985375524',
    nome: (tenant as any)?.name ?? 'Apollo Pizzaria',
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
    
    // Convert Buffer to Uint8Array to satisfy NextResponse type
    const response = new NextResponse(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'image/png' }
    })
    return response
  } else {
    return NextResponse.json({ brcode })
  }
}

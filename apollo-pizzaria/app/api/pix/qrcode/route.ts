import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const valor = searchParams.get('valor')
  const txid = searchParams.get('txid')
  const saida = searchParams.get('saida') ?? 'br'

  const url = new URL('https://gerarqrcodepix.com.br/api/v1')
  url.searchParams.set('nome', 'Apollo Pizzaria')
  url.searchParams.set('cidade', 'Belo Horizonte')
  url.searchParams.set('chave', '31985375524')
  url.searchParams.set('valor', valor ?? '0')
  url.searchParams.set('txid', txid ?? 'APOLLO')
  url.searchParams.set('saida', saida)
  url.searchParams.set('tamanho', '300')

  try {
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

export function generateBrCode(params: {
  chave: string      // ex: '+5531985375524'
  nome: string       // ex: 'Apollo Pizzaria' (max 25 chars)
  cidade: string     // ex: 'Belo Horizonte' (max 15 chars)
  valor: number      // ex: 107.00
  txid: string       // ex: 'APOLLO00044'
}): string {
  function field(id: string, value: string): string {
    return id + value.length.toString().padStart(2, '0') + value
  }

  function crc16(str: string): string {
    let crc = 0xFFFF
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
  }

  const merchantAccountInfo = field('00', 'BR.GOV.BCB.PIX') + field('01', params.chave)
  const additionalData = field('05', params.txid.substring(0, 25))
  const valorStr = params.valor.toFixed(2)

  const brcode =
    field('00', '01') +
    field('26', merchantAccountInfo) +
    field('52', '0000') +
    field('53', '986') +
    field('54', valorStr) +
    field('58', 'BR') +
    field('59', params.nome.substring(0, 25)) +
    field('60', params.cidade.substring(0, 15)) +
    field('62', additionalData) +
    '6304'

  return brcode + crc16(brcode)
}

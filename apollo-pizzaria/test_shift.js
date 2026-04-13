const { getStartOfCurrentShift } = require('./lib/turno')

try {
  const start = getStartOfCurrentShift()
  console.log('Now (UTC):', new Date().toISOString())
  console.log('Now (BRT):', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
  console.log('Shift Start (UTC):', start.toISOString())
  console.log('Shift Start (BRT):', start.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
} catch (e) {
  console.error(e)
}

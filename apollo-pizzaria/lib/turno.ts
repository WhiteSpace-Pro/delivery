export function getStartOfCurrentShift(): Date {
  const now = new Date()
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const shiftStart = new Date(brt)
  shiftStart.setHours(17, 40, 0, 0)
  if (brt < shiftStart) {
    shiftStart.setDate(shiftStart.getDate() - 1)
  }
  // Converter de volta para UTC
  const offset = now.getTime() - brt.getTime()
  return new Date(shiftStart.getTime() + offset)
}

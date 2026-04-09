'use client'

import { useState, useEffect, useCallback } from 'react'

interface ApproachingPopupProps {
  driverName: string
  orderId: string
  initialEtaMinutes?: number | null
}

function playApproachingSound() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const play = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.02)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    play(523, 0, 0.15)    // C5
    play(659, 0.25, 0.2)  // E5
  } catch { /* ignore */ }
}

export function ApproachingPopup({ driverName, orderId, initialEtaMinutes }: ApproachingPopupProps) {
  const [dismissed, setDismissed] = useState(false)
  const [eta, setEta] = useState<number | null>(initialEtaMinutes ?? null)

  useEffect(() => {
    playApproachingSound()
  }, [])

  // Recalculate ETA every 30s
  const refreshEta = useCallback(async () => {
    try {
      const res = await fetch(`/api/eta-order?order_id=${orderId}`)
      const data = await res.json()
      if (data.eta_minutes) setEta(data.eta_minutes)
    } catch { /* ignore */ }
  }, [orderId])

  useEffect(() => {
    const interval = setInterval(refreshEta, 30000)
    return () => clearInterval(interval)
  }, [refreshEta])

  if (dismissed) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none"
      style={{ animation: 'slideUp 0.4s ease-out' }}
    >
      <div className="max-w-sm mx-auto bg-[#141414] border border-[#E85D24]/40 rounded-2xl p-5 shadow-2xl shadow-[#E85D24]/20 pointer-events-auto">
        {/* Pulsing pizza icon */}
        <div className="flex items-start gap-4">
          <div style={{ animation: 'pulse 1.2s ease-in-out infinite' }} className="text-4xl flex-shrink-0">
            🍕
          </div>
          <div className="flex-1">
            <p className="font-playfair text-[22px] font-bold text-[#F5F0E8] italic leading-tight">
              Sua pizza é a próxima!
            </p>
            <p className="text-[#8A8480] text-sm mt-1">
              {driverName} está a caminho
              {eta != null ? ` — chega em ~${eta} min` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="mt-4 w-full bg-[#E85D24] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#D15420] transition-colors"
        >
          Ok, estou esperando!
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

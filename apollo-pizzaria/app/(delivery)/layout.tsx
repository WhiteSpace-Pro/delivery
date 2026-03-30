'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { LogOut } from 'lucide-react'
import Link from 'next/link'

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, isLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center font-dm">
        <p className="text-white/40 font-bold uppercase tracking-widest text-sm">
          Acessando sistema...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white font-dm font-bold">
      {/* Header */}
      <header className="h-16 bg-[#0D0D0D] px-4 md:px-8 border-b border-white/5 flex items-center justify-between sticky top-0 z-40">
        <Link href="/delivery" className="flex items-center gap-2">
          <span className="font-playfair text-2xl text-apollo-orange font-bold">
            Apollo
          </span>
          <span className="text-[10px] text-apollo-orange/60 border border-apollo-orange/20 px-1 rounded uppercase tracking-tighter">
            Delivery
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <p className="font-bold text-sm leading-none">
              {profile?.full_name || 'Motoboy'}
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">
              Online
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-apollo-orange flex items-center justify-center text-[#0D0D0D] font-black text-sm">
            {profile?.full_name?.charAt(0) || 'D'}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-white/40 hover:text-apollo-orange transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4">
        {children}
      </main>
    </div>
  )
}

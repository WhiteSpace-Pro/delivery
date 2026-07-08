'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Menu, X, LogOut, LayoutDashboard, Utensils, Truck, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'

const supabase = createClient()

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { profile, isLoading } = useUser()
  const router = useRouter()


  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { name: 'Cardápio', icon: Utensils, href: '/cardapio' },
    { name: 'Motoboys', icon: Truck, href: '/admin/delivery' },
    { name: 'Relatórios', icon: BarChart3, href: '/admin/relatorios' },
    { name: 'Configurações', icon: Settings, href: '/admin/settings' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center font-dm">
        <p className="text-[#0D0D0D]/40">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] flex font-dm text-[#0D0D0D]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col fixed inset-y-0 border-r border-[#0D0D0D]/10 bg-white z-50">
        <div className="p-6">
          <Link href="/admin">
            <h1 className="font-playfair text-3xl text-apollo-orange font-bold">
              Apollo
            </h1>
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F8F7F5] transition-colors"
            >
              <item.icon size={20} className="text-apollo-orange" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-playfair text-3xl text-apollo-orange font-bold">
                Apollo
              </h1>
              <button onClick={() => setIsSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <nav className="space-y-4">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#F8F7F5] transition-colors"
                >
                  <item.icon size={20} className="text-apollo-orange" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-60 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-[#0D0D0D]/10 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
          <button
            className="lg:hidden p-2"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <p className="font-bold text-sm leading-none">
                {profile?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-[#0D0D0D]/60 capitalize">
                {profile?.role}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-apollo-orange/10 border border-apollo-orange/20 flex items-center justify-center text-apollo-orange font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-[#0D0D0D]/60 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-0">
          {children}
        </div>
      </div>
    </div>
  )
}

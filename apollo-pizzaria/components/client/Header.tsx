"use client";

import { useState } from "react";
import { ShoppingCart, User as UserIcon, LogOut } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/client/CartDrawer";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { LoginModal } from "@/components/client/LoginModal";

function HeaderBadge() {
  const { totalItems } = useCart();

  if (totalItems === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-[#E85D24] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
      {totalItems}
    </span>
  );
}

interface HeaderProps {
  userName?: string;
}

export function Header({ userName }: HeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user } = useUser();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#0D0D0D]/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-playfair text-2xl font-bold text-[#E85D24] tracking-tight">
            Apollo
          </Link>

          <nav className="flex items-center gap-4 md:gap-6">
            <Link href="/cardapio" className="text-sm font-medium hover:text-[#E85D24] transition-colors">
              Cardápio
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                {userName && (
                  <span className="text-[14px] font-dm text-[#8A8480] hidden sm:inline">
                    Olá, {userName}
                  </span>
                )}
                <Link href="/meus-pedidos" className="text-sm font-medium hover:text-[#E85D24] transition-colors flex items-center gap-2">
                  <UserIcon size={16} />
                  <span className="hidden sm:inline">Meus Pedidos</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white/40 hover:text-red-400 transition-colors"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="text-sm font-medium hover:text-[#E85D24] transition-colors"
              >
                Entrar
              </button>
            )}

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2 hover:bg-white/5 rounded-full transition-colors"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={24} className="text-[#F5F0E8]" />
              <HeaderBadge />
            </button>
          </nav>
        </div>
      </header>

      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

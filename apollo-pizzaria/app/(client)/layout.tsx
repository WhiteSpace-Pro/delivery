"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CartProvider, useCart } from "@/contexts/CartContext";

function HeaderBadge() {
  const { totalItems } = useCart();

  if (totalItems === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-[#E85D24] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
      {totalItems}
    </span>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#0D0D0D] text-[#F5F0E8] font-dm">
        <header className="sticky top-0 z-50 w-full bg-[#0D0D0D]/80 backdrop-blur-md border-b border-white/5">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-playfair text-2xl font-bold text-[#E85D24] tracking-tight">
              Apollo
            </Link>

            <nav className="flex items-center gap-6">
              <Link href="/cardapio" className="text-sm font-medium hover:text-[#E85D24] transition-colors">
                Cardápio
              </Link>

              <button className="relative p-2 hover:bg-white/5 rounded-full transition-colors">
                <ShoppingCart size={24} className="text-[#F5F0E8]" />
                <HeaderBadge />
              </button>
            </nav>
          </div>
        </header>

        <main>
          {children}
        </main>
      </div>
    </CartProvider>
  );
}

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Badge value should come from Zustand store in prompt 06
  // For now using placeholder 0
  const cartItemCount = 0;

  return (
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
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-[#E85D24] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartItemCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main>
        {children}
      </main>
    </div>
  );
}

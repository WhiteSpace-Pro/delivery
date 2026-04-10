"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useUser } from "@/hooks/useUser";
import { CartItemRow } from "./CartItemRow";
import { LoginModal } from "./LoginModal";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, addItem, removeItem, clearCart } = useCart();
  const { user } = useUser();
  const [loginOpen, setLoginOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkStoreStatus() {
      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID_APOLLO || '496c5a35-6843-4061-b3ab-159d15a0cbc6';
      const { data } = await supabase.from('tenants').select('is_active').eq('id', tenantId).single();
      if (data) setIsStoreOpen(!!(data as any)?.is_active);
    }
    checkStoreStatus();
  }, [supabase]);

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  const handleGoToCheckout = async () => {
    if (!isStoreOpen) {
      alert("A loja está fechada no momento. Não é possível realizar pedidos.");
      return;
    }
    if (user) {
      onClose();
      router.push('/checkout');
    } else {
      onClose();
      await new Promise(r => setTimeout(r, 300));
      setLoginOpen(true);
    }
  };

  const handleIncrement = (item: CartItem) => {
    addItem({ ...item, quantity: 1, total_price: item.unit_price });
  };

  const handleDecrement = (item: CartItem) => {
    if (item.quantity > 1) {
      addItem({ ...item, quantity: -1, total_price: -item.unit_price });
    } else {
      removeItem(item.id, item.size, item.border, item.half_half, item.combo_flavors);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0D0D0D] border-l border-white/5 shadow-2xl z-[70] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-[#E85D24]" size={24} />
                  <h2 className="text-xl font-playfair font-bold text-[#F5F0E8]">Seu Carrinho</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full text-[#8A8480] hover:text-[#F5F0E8] transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="text-6xl mb-2">🛒</div>
                    <div>
                      <h3 className="text-lg font-bold text-[#F5F0E8]">Seu carrinho está vazio</h3>
                      <p className="text-[#8A8480] text-sm mt-1">Que tal adicionar umas pizzas deliciosas?</p>
                    </div>
                    <button
                      onClick={onClose}
                      className="mt-4 px-6 py-3 bg-[#E85D24] text-white font-bold rounded-xl hover:bg-[#D15420] transition-colors"
                    >
                      Ver cardápio
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <CartItemRow
                        key={`${item.id}-${item.size}-${item.border}-${item.half_half}-${index}`}
                        item={item}
                        onIncrement={() => handleIncrement(item)}
                        onDecrement={() => handleDecrement(item)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="p-6 border-t border-white/5 bg-[#141414] space-y-4">
                  {!isStoreOpen && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-500 text-xs text-center font-bold uppercase tracking-wider">
                      A loja está fechada
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[#8A8480] font-medium">Subtotal</span>
                    <span className="text-xl font-bold text-[#F5F0E8]">
                      R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      disabled={!isStoreOpen}
                      onClick={handleGoToCheckout}
                      className="w-full bg-[#E85D24] hover:bg-[#D15420] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#E85D24]/10"
                    >
                      Ir para o checkout
                      <ArrowRight size={18} />
                    </button>

                    <button
                      onClick={clearCart}
                      className="flex items-center justify-center gap-2 text-[#8A8480] hover:text-red-400 text-xs font-bold transition-colors uppercase tracking-widest py-2"
                    >
                      <Trash2 size={14} />
                      Limpar carrinho
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => { onClose(); }}
        redirectToCheckout
      />
    </>
  );
}

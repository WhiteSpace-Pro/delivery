"use client";

import React from 'react';
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem } from "@/contexts/CartContext";

interface CartItemRowProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function CartItemRow({
  item,
  onIncrement,
  onDecrement
}: CartItemRowProps) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-[#141414] rounded-2xl border border-white/5 transition-all hover:bg-[#1C1C1C]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#F5F0E8] text-base truncate">
            {item.name}
            {item.half_half && (
              <span className="text-[#8A8480] font-normal block text-xs mt-0.5">
                + {item.half_half}
              </span>
            )}
            {item.combo_flavors && item.combo_flavors.length > 0 && (
              <span className="text-[#8A8480] font-normal block text-xs mt-0.5">
                Sabores: {item.combo_flavors.join(", ")}
              </span>
            )}
          </h4>

          <div className="flex flex-wrap gap-2 mt-1.5">
            {item.size && (
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[#8A8480]">
                {item.size}
              </span>
            )}
            {item.border && item.border !== 'Tradicional' && (
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-[#D4941A]/10 border border-[#D4941A]/20 rounded text-[#D4941A]">
                Borda {item.border}
              </span>
            )}
          </div>

          {item.observations && (
            <p className="text-xs text-[#8A8480] italic mt-2 line-clamp-1">
              &quot;{item.observations}&quot;
            </p>
          )}
        </div>

        <div className="text-right">
          <div className="text-[10px] text-[#8A8480] uppercase font-bold tracking-widest mb-0.5">Total</div>
          <div className="font-bold text-[#E85D24]">
            R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex items-center gap-4 bg-black/20 rounded-full p-1 border border-white/5">
          <button
            onClick={onDecrement}
            className="w-8 h-8 flex items-center justify-center text-[#8A8480] hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title={item.quantity === 1 ? "Remover item" : "Diminuir quantidade"}
          >
            {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
          </button>
          <span className="text-sm font-bold w-4 text-center text-[#F5F0E8]">{item.quantity}</span>
          <button
            onClick={onIncrement}
            className="w-8 h-8 flex items-center justify-center text-[#8A8480] hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Aumentar quantidade"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="text-[10px] text-[#8A8480] font-medium italic">
          R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / un
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "@/types";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700"] });

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
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

  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isPizza = product.type === 'pizza';

  const handleAdd = () => {
    if (!isStoreOpen) return;
    onAdd(product);
  };

  return (
    <div
      className={cn(
        "group bg-[#1C1C1C] border border-white/5 rounded-2xl p-4 transition-all duration-300 hover:border-[#D4941A] cursor-pointer h-full flex flex-col",
        !isStoreOpen && "opacity-80 grayscale-[0.5]"
      )}
      onClick={handleAdd}
    >
      {/* Image / Fallback Placeholder */}
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-4 bg-zinc-800 flex items-center justify-center">
        {!imgError && product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="text-4xl">🍕</div>
        )}
        {!isStoreOpen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold text-xs uppercase tracking-widest bg-apollo-orange px-3 py-1 rounded">Fechado</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1">
        <h3 className={cn(playfair.className, "text-[17px] text-[#F5F0E8] font-bold mb-2")}>
          {product.name}
        </h3>
        <p className="font-dm text-[13px] text-[#8A8480] line-clamp-2 mb-6">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between">
          {isPizza ? (
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full text-[12px] font-bold transition-colors border border-[#E85D24] text-[#E85D24]">M</span>
              <span className="px-3 py-1 rounded-full text-[12px] font-bold transition-colors border bg-[#E85D24] border-[#E85D24] text-white">G</span>
              <span className="px-3 py-1 rounded-full text-[12px] font-bold transition-colors border border-[#E85D24] text-[#E85D24]">GG</span>
            </div>
          ) : (
            <span className="text-[#E85D24] font-bold">
              {formatPrice(product.price_single)}
            </span>
          )}

          <button
            disabled={!isStoreOpen}
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
            className={cn(
              "w-9 h-9 text-white rounded-full flex items-center justify-center transition-colors shadow-lg",
              isStoreOpen ? "bg-[#E85D24] hover:bg-[#D15420]" : "bg-zinc-700 cursor-not-allowed"
            )}
          >
            <span className="text-xl font-bold">+</span>
          </button>
        </div>

        {isPizza && (
          <div className="mt-4 text-[#E85D24] font-bold text-sm">
            A partir de {formatPrice(product.price_m)}
          </div>
        )}
      </div>
    </div>
  );
}

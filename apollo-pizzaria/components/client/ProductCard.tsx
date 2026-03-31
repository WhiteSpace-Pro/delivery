"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/types";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700"] });

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isPizza = product.type === 'pizza';

  return (
    <div
      className="group bg-[#1C1C1C] border border-white/5 rounded-2xl p-4 transition-all duration-300 hover:border-[#D4941A] cursor-pointer h-full flex flex-col"
      onClick={() => onAdd(product)}
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
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product);
            }}
            className="w-9 h-9 bg-[#E85D24] hover:bg-[#D15420] text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
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

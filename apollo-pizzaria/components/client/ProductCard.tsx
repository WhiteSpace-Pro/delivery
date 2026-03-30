"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Product } from "@/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product, size?: 'M' | 'G' | 'GG') => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState<'M' | 'G' | 'GG'>('G');
  const [imageError, setImageError] = useState(false);

  const isPizza = product.type === 'pizza';

  const getPrice = () => {
    if (isPizza) {
      if (selectedSize === 'M') return product.price_m;
      if (selectedSize === 'G') return product.price_g;
      if (selectedSize === 'GG') return product.price_gg;
    }
    return product.price_single;
  };

  const currentPrice = getPrice();

  const placeholderUrl = "https://placehold.co/600x450/1C1C1C/F5F0E8?text=" + encodeURIComponent(product.name);
  const src = (imageError || !product.image_url) ? placeholderUrl : product.image_url;

  return (
    <div className="group relative bg-[#1C1C1C] rounded-xl border border-white/5 hover:border-[#D4941A] transition-all duration-200 overflow-hidden flex flex-col h-full">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-[#141414]">
        <Image
          src={src}
          alt={product.name}
          fill
          unoptimized={src.startsWith('https://placehold.co')}
          onError={() => setImageError(true)}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-playfair text-[17px] text-[#F5F0E8] mb-1">
          {product.name}
        </h3>

        <p className="font-dm text-[13px] text-[#8A8480] line-clamp-2 mb-4 h-9">
          {product.description}
        </p>

        <div className="mt-auto space-y-4">
          {isPizza && (
            <div className="flex gap-2">
              {(['M', 'G', 'GG'] as const).map((size) => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSize(size);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-[12px] font-bold transition-colors border",
                    selectedSize === size
                      ? "bg-[#E85D24] border-[#E85D24] text-white"
                      : "bg-transparent border-[#E85D24] text-[#E85D24]"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[#E85D24] font-bold text-lg">
              {currentPrice ? `R${Number(currentPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
            </span>

            <button
              onClick={() => onAdd(product, isPizza ? selectedSize : undefined)}
              className="w-9 h-9 bg-[#E85D24] hover:bg-[#D15420] text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

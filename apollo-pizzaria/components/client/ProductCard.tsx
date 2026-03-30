"use client"

import React from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Product } from '../../types'
import { useCartStore } from '../../stores/cartStore'
import { cn } from '../../lib/utils'

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const { addItem, openCart } = useCartStore()

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Quick add only for beverages and combos
    if (product.type !== 'pizza') {
      addItem({
        product,
        size: null,
        edgeOption: null,
        isHalf: false,
        halfProduct: null,
        quantity: 1,
        unitPrice: product.price_single || 0,
        observations: ''
      })
      openCart()
    } else if (onClick) {
      onClick()
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group bg-[#141414] border border-white/5 rounded-2xl overflow-hidden hover:border-apollo-orange/30 transition-all cursor-pointer shadow-xl",
        product.type === 'pizza' ? "aspect-[4/5]" : ""
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={product.image_url || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

        <div className="absolute top-3 right-3">
          <button
            onClick={handleQuickAdd}
            className="w-10 h-10 bg-apollo-orange text-white flex items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-playfair text-[#F5F0E8] font-bold">{product.name}</h3>
          {product.price_single && (
            <span className="text-apollo-gold font-dm font-bold">
              R$ {product.price_single.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>

        <p className="text-sm text-white/50 font-dm line-clamp-2">
          {product.type === 'pizza' ? 'Selecione o tamanho para ver o preço' : 'Bebida gelada de 2 litros'}
        </p>

        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {product.tags.map((tag) => (
              <span key={tag} className="text-[10px] uppercase tracking-wider font-dm font-bold text-white/40 bg-white/5 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductCard

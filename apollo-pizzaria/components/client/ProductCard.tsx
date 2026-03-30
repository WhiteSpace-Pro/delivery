"use client"

import React from 'react'
import Image from 'next/image'
import { Plus, Flame, Star, Users } from 'lucide-react'
import { Product } from '../../types'
import { useCartStore } from '../../stores/cartStore'
import { cn } from '../../lib/utils'
import { motion } from 'framer-motion'

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

  // Conversion Badges Logic
  const isMostOrdered = product.sort_order === 1 || product.name.includes('Muçarela')
  const isTrending = product.tags?.includes('frango')
  const viewerCount = Math.floor(Math.random() * 20) + 5

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={onClick}
      className={cn(
        "group relative bg-[#141414] border border-white/5 rounded-3xl overflow-hidden hover:border-apollo-orange/40 transition-all cursor-pointer shadow-2xl flex flex-col h-full",
        product.type === 'pizza' ? "" : ""
      )}
    >
      {/* Visual Triggers */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {isMostOrdered && (
          <div className="bg-apollo-orange text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-apollo-orange/20">
            <Flame className="w-3 h-3 fill-current" />
            Mais pedido hoje
          </div>
        )}
        {isTrending && (
          <div className="bg-apollo-gold text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-apollo-gold/20">
            <Star className="w-3 h-3 fill-current" />
            Destaque
          </div>
        )}
      </div>

      {/* Product Image */}
      <div className="relative aspect-[16/11] w-full overflow-hidden">
        <Image
          src={product.image_url || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-80" />

        {/* Quick Add Button */}
        <div className="absolute bottom-4 right-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleQuickAdd}
            className="w-12 h-12 bg-white text-black flex items-center justify-center rounded-full hover:bg-apollo-orange hover:text-white transition-colors shadow-xl"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Social Proof */}
        {isMostOrdered && (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[10px] font-dm text-white/60 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg">
            <Users className="w-3 h-3" />
            <span>{viewerCount} pessoas vendo agora</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-4">
          <h3 className="text-xl font-playfair text-[#F5F0E8] font-bold leading-tight group-hover:text-apollo-orange transition-colors">
            {product.name}
          </h3>
          {product.price_single && (
            <div className="text-right shrink-0">
              <span className="block text-xs text-white/40 font-dm line-through">
                R$ {(product.price_single * 1.2).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-apollo-gold font-dm font-bold text-lg">
                R$ {product.price_single.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-white/40 font-dm line-clamp-2 mb-4">
          {product.description || (product.type === 'pizza' ? 'Selecione o tamanho para ver o preço e personalizar sua massa.' : 'Bebida gelada para acompanhar seu pedido.')}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {product.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[9px] uppercase tracking-widest font-dm font-bold text-white/30 bg-white/5 border border-white/5 px-2 py-1 rounded-md">
                {tag}
              </span>
            ))}
          </div>

          {product.type === 'pizza' && (
            <span className="text-[10px] font-dm font-bold text-apollo-orange uppercase tracking-tighter bg-apollo-orange/10 px-2 py-1 rounded-md">
              A partir de R$ {product.price_m?.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ProductCard

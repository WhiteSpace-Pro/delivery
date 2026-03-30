"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag } from 'lucide-react'
import { Product, PizzaOption } from '../../types'
import { useCartStore } from '../../stores/cartStore'
import { cn } from '../../lib/utils'
import Image from 'next/image'

interface PizzaModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

const PizzaModal = ({ product, isOpen, onClose }: PizzaModalProps) => {
  const { addItem, openCart } = useCartStore()
  const [selectedSize, setSelectedSize] = useState<'M' | 'G' | 'GG' | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<PizzaOption | null>(null)
  const [observations, setObservations] = useState('')

  // Pricing Logic
  const sizePrice = useMemo(() => {
    if (!selectedSize) return 0
    if (selectedSize === 'M') return product.price_m || 0
    if (selectedSize === 'G') return product.price_g || 0
    if (selectedSize === 'GG') return product.price_gg || 0
    return 0
  }, [selectedSize, product])

  const totalPrice = sizePrice + (selectedEdge?.extra_price || 0)

  const handleAddToCart = () => {
    if (!selectedSize) return

    addItem({
      product,
      size: selectedSize,
      edgeOption: selectedEdge,
      isHalf: false,
      halfProduct: null,
      quantity: 1,
      unitPrice: totalPrice,
      observations
    })

    onClose()
    openCart()
  }

  // Mock edges (since we don't have a hook for it yet)
  const edges: PizzaOption[] = [
    { id: '1', name: 'Tradicional', extra_price: 0, type: 'edge', is_available: true, tenant_id: product.tenant_id, sort_order: 1, product_id: null, price: 0, active: true },
    { id: '2', name: 'Catupiry', extra_price: 12, type: 'edge', is_available: true, tenant_id: product.tenant_id, sort_order: 2, product_id: null, price: 12, active: true },
    { id: '3', name: 'Cheddar', extra_price: 12, type: 'edge', is_available: true, tenant_id: product.tenant_id, sort_order: 3, product_id: null, price: 12, active: true },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-[#141414] rounded-3xl z-[61] overflow-hidden flex flex-col md:flex-row shadow-2xl"
          >
            {/* Left: Image */}
            <div className="relative w-full md:w-1/2 aspect-video md:aspect-auto h-64 md:h-auto overflow-hidden">
              <Image
                src={product.image_url || '/placeholder.png'}
                alt={product.name}
                fill
                className="object-cover"
              />
              <button
                onClick={onClose}
                className="absolute top-4 left-4 p-2 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors md:hidden"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Right: Content */}
            <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-playfair text-[#F5F0E8] font-bold">{product.name}</h2>
                  <p className="text-white/50 font-dm mt-1">Personalize sua pizza do seu jeito</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors hidden md:block"
                >
                  <X className="w-6 h-6 text-white/40 hover:text-white" />
                </button>
              </div>

              {/* Sizes */}
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest text-apollo-gold font-dm font-bold mb-4">
                  1. Escolha o tamanho
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { size: 'M' as const, label: 'Média', price: product.price_m },
                    { size: 'G' as const, label: 'Grande', price: product.price_g },
                    { size: 'GG' as const, label: 'Gigante', price: product.price_gg }
                  ].map((s) => (
                    <button
                      key={s.size}
                      onClick={() => setSelectedSize(s.size)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-center group",
                        selectedSize === s.size
                          ? "border-apollo-orange bg-apollo-orange/5"
                          : "border-white/5 bg-white/5 hover:border-white/10"
                      )}
                    >
                      <span className={cn(
                        "block text-sm font-dm font-bold uppercase mb-1",
                        selectedSize === s.size ? "text-apollo-orange" : "text-white/60 group-hover:text-white"
                      )}>
                        {s.label}
                      </span>
                      <span className="text-xs text-white/40">
                        R$ {s.price?.toFixed(2).replace('.', ',')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edges */}
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest text-apollo-gold font-dm font-bold mb-4">
                  2. Borda recheada?
                </h3>
                <div className="space-y-2">
                  {edges.map((edge) => (
                    <button
                      key={edge.id}
                      onClick={() => setSelectedEdge(edge)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 transition-all flex justify-between items-center",
                        selectedEdge?.id === edge.id
                          ? "border-apollo-orange bg-apollo-orange/5"
                          : "border-white/5 bg-white/5 hover:border-white/10"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-dm font-bold",
                        selectedEdge?.id === edge.id ? "text-[#F5F0E8]" : "text-white/60"
                      )}>
                        {edge.name}
                      </span>
                      <span className="text-xs text-white/40">
                        {edge.extra_price > 0 ? `+ R$ ${edge.extra_price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Observations */}
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest text-apollo-gold font-dm font-bold mb-4">
                  3. Observações
                </h3>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: Tirar cebola, bem passada, etc..."
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-[#F5F0E8] focus:border-apollo-orange focus:outline-none transition-all placeholder:text-white/20"
                />
              </div>

              {/* Footer CTA */}
              <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-white/40 font-dm">Preço total</p>
                  <p className="text-2xl font-dm font-bold text-apollo-gold">
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className={cn(
                    "flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-dm font-bold text-white transition-all",
                    selectedSize
                      ? "bg-apollo-orange hover:brightness-110 active:scale-95 shadow-lg shadow-apollo-orange/20"
                      : "bg-white/5 cursor-not-allowed text-white/20"
                  )}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Adicionar ao carrinho
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default PizzaModal

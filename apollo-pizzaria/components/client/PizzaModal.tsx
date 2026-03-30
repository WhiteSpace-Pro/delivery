"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Plus, Star, Users, Flame, Clock } from 'lucide-react'
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

  // Mock data for better UX
  const edges: PizzaOption[] = [
    { id: '1', name: 'Tradicional', extra_price: 0, type: 'edge', is_available: true, tenant_id: product.tenant_id, sort_order: 1, product_id: null, price: 0, active: true },
    { id: '2', name: 'Catupiry Original', extra_price: 12, type: 'edge', is_available: true, tenant_id: product.tenant_id, sort_order: 2, product_id: null, price: 12, active: true },
    { id: '3', name: 'Cheddar Scala', extra_price: 12, type: 'edge', is_available: true, tenant_id: product.tenant_id, sort_order: 3, product_id: null, price: 12, active: true },
  ]

  const suggestedDrinks = [
    { name: 'Coca-Cola 2L', price: 12, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=200' },
    { name: 'Fanta Laranja 2L', price: 10, image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&q=80&w=200' },
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
            className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl bg-[#0D0D0D] md:rounded-[40px] z-[101] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(232,93,36,0.1)] border border-white/5"
          >
            {/* Left: Interactive Media */}
            <div className="relative w-full md:w-[45%] h-[30vh] md:h-auto overflow-hidden group">
              <Image
                src={product.image_url || '/placeholder.png'}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent opacity-90 md:hidden" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0D0D0D] hidden md:block opacity-40" />

              <button
                onClick={onClose}
                className="absolute top-6 left-6 p-3 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors md:hidden backdrop-blur-md"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="absolute bottom-8 left-8 space-y-3 z-10">
                <div className="bg-apollo-orange text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-xl">
                  <Flame className="w-3 h-3 fill-current" />
                  🔥 Mais pedido hoje
                </div>
                <h2 className="text-4xl md:text-5xl font-playfair text-[#F5F0E8] font-bold leading-tight drop-shadow-lg">
                  {product.name}
                </h2>
                <div className="flex items-center gap-4 text-white/60 text-sm font-dm">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 20-30 min</span>
                  <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-apollo-gold fill-current" /> 4.9 (120+)</span>
                </div>
              </div>
            </div>

            {/* Right: Customization Engine */}
            <div className="flex-1 flex flex-col h-full bg-[#0D0D0D] overflow-hidden">
              <div className="flex items-center justify-between p-8 border-b border-white/5 hidden md:flex">
                <h3 className="text-xl font-playfair text-[#F5F0E8] font-bold">Personalize seu pedido</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                >
                  <X className="w-6 h-6 text-white/40 group-hover:text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                {/* 1. Size Selection */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm uppercase tracking-[0.2em] text-apollo-gold font-dm font-bold">
                      1. Escolha o tamanho
                    </h3>
                    <span className="text-[10px] text-white/20 font-bold uppercase">Obrigatório</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { size: 'M' as const, label: 'Média', price: product.price_m, desc: '6 fatias' },
                      { size: 'G' as const, label: 'Grande', price: product.price_g, desc: '8 fatias' },
                      { size: 'GG' as const, label: 'Gigante', price: product.price_gg, desc: '12 fatias' }
                    ].map((s) => (
                      <button
                        key={s.size}
                        onClick={() => setSelectedSize(s.size)}
                        className={cn(
                          "relative p-6 rounded-3xl border-2 transition-all text-left flex flex-col justify-between group overflow-hidden",
                          selectedSize === s.size
                            ? "border-apollo-orange bg-apollo-orange/5"
                            : "border-white/5 bg-white/5 hover:border-white/10"
                        )}
                      >
                        {selectedSize === s.size && (
                          <motion.div layoutId="size-active" className="absolute top-4 right-4 w-5 h-5 rounded-full bg-apollo-orange flex items-center justify-center">
                            <Plus className="w-3 h-3 text-white rotate-45" />
                          </motion.div>
                        )}
                        <div>
                          <span className={cn(
                            "block text-lg font-dm font-bold uppercase tracking-tight",
                            selectedSize === s.size ? "text-apollo-orange" : "text-white/80 group-hover:text-white"
                          )}>
                            {s.label}
                          </span>
                          <span className="text-xs text-white/40 font-dm">{s.desc}</span>
                        </div>
                        <span className="text-sm text-apollo-gold font-bold mt-4">
                          R$ {s.price?.toFixed(2).replace('.', ',')}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 2. Edge Options */}
                <section>
                   <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm uppercase tracking-[0.2em] text-apollo-gold font-dm font-bold">
                      2. Borda recheada?
                    </h3>
                    <span className="text-[10px] text-white/20 font-bold uppercase">Opcional</span>
                  </div>
                  <div className="space-y-3">
                    {edges.map((edge) => (
                      <button
                        key={edge.id}
                        onClick={() => setSelectedEdge(edge)}
                        className={cn(
                          "w-full p-5 rounded-2xl border-2 transition-all flex justify-between items-center group",
                          selectedEdge?.id === edge.id
                            ? "border-apollo-orange bg-apollo-orange/5"
                            : "border-white/5 bg-white/5 hover:border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            selectedEdge?.id === edge.id ? "border-apollo-orange bg-apollo-orange" : "border-white/10"
                          )}>
                            {selectedEdge?.id === edge.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className={cn(
                            "text-base font-dm font-medium",
                            selectedEdge?.id === edge.id ? "text-[#F5F0E8]" : "text-white/60"
                          )}>
                            {edge.name}
                          </span>
                        </div>
                        <span className="text-sm text-white/40 font-bold group-hover:text-apollo-gold transition-colors">
                          {edge.extra_price > 0 ? `+ R$ ${edge.extra_price.toFixed(2).replace('.', ',')}` : 'Incluso'}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 3. Upsell Drinks */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm uppercase tracking-[0.2em] text-apollo-gold font-dm font-bold">
                      Acompanha uma bebida?
                    </h3>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {suggestedDrinks.map((drink) => (
                      <div key={drink.name} className="flex-shrink-0 w-64 bg-white/5 rounded-3xl p-4 border border-white/5 flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                          <Image src={drink.image} alt={drink.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-dm font-bold text-white/80">{drink.name}</p>
                          <p className="text-xs text-apollo-gold font-bold">R$ {drink.price.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <button className="p-2 bg-apollo-orange/10 text-apollo-orange rounded-full hover:bg-apollo-orange hover:text-white transition-all">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. Observations */}
                <section>
                  <h3 className="text-sm uppercase tracking-[0.2em] text-apollo-gold font-dm font-bold mb-4">
                    Observações adicionais
                  </h3>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Ex: Tirar cebola, massa fina, mais passada..."
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-[#F5F0E8] focus:border-apollo-orange/50 focus:outline-none transition-all placeholder:text-white/20 resize-none"
                  />
                </section>
              </div>

              {/* Action Bar */}
              <div className="p-8 bg-[#0D0D0D] border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-white/40 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-widest">12 pessoas pedindo agora</span>
                  </div>
                  <p className="text-3xl font-dm font-bold text-apollo-gold">
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className={cn(
                    "w-full md:w-auto md:min-w-[300px] py-5 px-10 rounded-2xl flex items-center justify-center gap-3 font-dm font-bold text-white transition-all",
                    selectedSize
                      ? "bg-apollo-orange hover:brightness-110 shadow-[0_10px_30px_rgba(232,93,36,0.3)]"
                      : "bg-white/5 cursor-not-allowed text-white/20"
                  )}
                >
                  <ShoppingBag className="w-6 h-6" />
                  {selectedSize ? 'Adicionar à sacola' : 'Selecione o tamanho'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default PizzaModal

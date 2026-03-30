"use client"

import React, { useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import { cn } from '../../lib/utils'
import Image from 'next/image'
import Link from 'next/link'

const CartDrawer = () => {
  const { items, isOpen, closeCart, updateQuantity, removeItem } = useCartStore()

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  }, [items])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#141414] shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-apollo-orange" />
                <h2 className="text-xl font-playfair text-[#F5F0E8]">Seu pedido</h2>
              </div>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-[#F5F0E8]" />
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <ShoppingBag className="w-12 h-12 text-white/20" />
                  <p className="text-white/60 font-dm">Seu carrinho está vazio</p>
                  <button
                    onClick={closeCart}
                    className="text-apollo-orange font-dm hover:underline"
                  >
                    Voltar ao cardápio
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-[60px] h-[60px] flex-shrink-0">
                      <Image
                        src={item.product.image_url || '/placeholder-pizza.png'}
                        alt={item.product.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-dm text-[#F5F0E8] truncate">
                        {item.isHalf ? (
                          `½ ${item.product.name} + ½ ${item.halfProduct?.name}`
                        ) : (
                          item.product.name
                        )}
                      </h3>
                      <div className="text-xs text-white/60 font-dm mt-1">
                        {item.size && <span className="uppercase">{item.size}</span>}
                        {item.edgeOption && <span> • Borda: {item.edgeOption.name}</span>}
                      </div>
                      {item.observations && (
                        <p className="text-[12px] text-white/40 italic mt-1 truncate">
                          Obs: {item.observations}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3 bg-white/5 rounded-full px-3 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:text-apollo-orange transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-dm min-w-[20px] text-center text-[#F5F0E8]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:text-apollo-orange transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-dm font-medium text-[#F5F0E8]">
                            R$ {(item.unitPrice * item.quantity).toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-white/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer / Summary */}
            <div className="p-6 border-t border-white/10 bg-[#0D0D0D]">
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm font-dm">
                  <span className="text-white/60">Subtotal</span>
                  <span className="text-[#F5F0E8]">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm font-dm">
                  <span className="text-white/60">Taxa de entrega</span>
                  <span className="text-white/60 italic">Calculada no checkout</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5 mt-2">
                  <span className="text-lg font-playfair text-[#F5F0E8]">Total estimado</span>
                  <span className="text-lg font-dm font-bold text-apollo-gold">
                    R$ {subtotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className={cn(
                  "w-full py-4 rounded-xl flex items-center justify-center gap-2 font-dm font-bold text-white transition-all",
                  items.length > 0
                    ? "bg-apollo-orange hover:brightness-110 active:scale-95 shadow-lg shadow-apollo-orange/20"
                    : "bg-white/5 cursor-not-allowed text-white/20"
                )}
                onClick={(e) => {
                  if (items.length === 0) e.preventDefault()
                  else closeCart()
                }}
              >
                Ir para o checkout
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CartDrawer

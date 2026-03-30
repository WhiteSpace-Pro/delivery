"use client"

import React, { useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, Trash2, ShoppingBag, Truck, Gift, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import { cn } from '../../lib/utils'
import Image from 'next/image'
import Link from 'next/link'

const CartDrawer = () => {
  const { items, isOpen, closeCart, updateQuantity, removeItem } = useCartStore()

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  }, [items])

  const freeDeliveryThreshold = 80
  const progressToFreeDelivery = Math.min((subtotal / freeDeliveryThreshold) * 100, 100)
  const remainingForFreeDelivery = Math.max(freeDeliveryThreshold - subtotal, 0)

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
            className="fixed inset-0 bg-black/80 z-[200] backdrop-blur-xl"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-[450px] bg-[#0D0D0D] shadow-[0_0_100px_rgba(0,0,0,0.5)] z-[201] flex flex-col border-l border-white/5"
          >
            {/* Header */}
            <div className="p-8 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-apollo-orange/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-apollo-orange" />
                </div>
                <div>
                  <h2 className="text-xl font-playfair text-[#F5F0E8] font-bold">Sua sacola</h2>
                  <p className="text-xs text-white/40 font-dm">{items.length} {items.length === 1 ? 'item' : 'itens'} no total</p>
                </div>
              </div>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-white/5 rounded-full transition-all group"
              >
                <X className="w-6 h-6 text-white/40 group-hover:text-white" />
              </button>
            </div>

            {/* Incentives / Progress Bar */}
            {items.length > 0 && (
              <div className="p-8 bg-apollo-orange/5 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Truck className={cn("w-4 h-4", progressToFreeDelivery === 100 ? "text-green-500" : "text-apollo-orange")} />
                    <span className="text-xs font-dm font-bold text-[#F5F0E8]">
                      {progressToFreeDelivery === 100 ? "ENTREGA GRÁTIS DESBLOQUEADA! 🎉" : `Faltam R$ ${remainingForFreeDelivery.toFixed(2).replace('.', ',')} para frete grátis`}
                    </span>
                  </div>
                  <span className="text-[10px] font-dm font-bold text-white/20 uppercase tracking-widest">{progressToFreeDelivery.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToFreeDelivery}%` }}
                    className={cn("h-full transition-colors", progressToFreeDelivery === 100 ? "bg-green-500" : "bg-apollo-orange")}
                  />
                </div>
              </div>
            )}

            {/* Item List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-white/10" />
                  </div>
                  <div>
                    <p className="text-xl font-playfair font-bold text-[#F5F0E8]">Sua sacola está vazia</p>
                    <p className="text-sm text-white/40 font-dm mt-2 max-w-[200px] mx-auto">Adicione pizzas quentinhas e acompanhamentos ao seu pedido.</p>
                  </div>
                  <button
                    onClick={closeCart}
                    className="px-8 py-4 bg-apollo-orange text-white font-dm font-bold rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-apollo-orange/20"
                  >
                    Voltar ao cardápio
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={item.id}
                    className="flex gap-5 group"
                  >
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-xl">
                      <Image
                        src={item.product.image_url || '/placeholder-pizza.png'}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-dm font-bold text-[#F5F0E8] truncate group-hover:text-apollo-orange transition-colors">
                          {item.isHalf ? (
                            `½ ${item.product.name} + ½ ${item.halfProduct?.name}`
                          ) : (
                            item.product.name
                          )}
                        </h3>
                        <span className="text-sm font-dm font-bold text-apollo-gold whitespace-nowrap ml-4">
                          R$ {(item.unitPrice * item.quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="text-xs text-white/40 font-dm mt-1 flex items-center gap-2">
                        {item.size && <span className="uppercase font-bold tracking-widest text-apollo-gold/60">{item.size}</span>}
                        {item.edgeOption && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-white/10" /> Borda: {item.edgeOption.name}</span>}
                      </div>

                      {item.observations && (
                        <p className="text-[11px] text-white/20 italic mt-2 line-clamp-1 border-l border-white/5 pl-2">
                          {`"${item.observations}"`}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-full px-3 py-1.5 shadow-inner">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:text-apollo-orange text-white/40 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-dm font-bold min-w-[15px] text-center text-[#F5F0E8]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:text-apollo-orange text-white/40 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-white/20 hover:text-red-500 transition-all p-2 rounded-full hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Recommendations / Upsell */}
            {items.length > 0 && (
               <div className="px-8 pb-4">
                <div className="p-4 bg-apollo-gold/5 rounded-2xl border border-apollo-gold/10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-apollo-gold/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-apollo-gold" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-apollo-gold uppercase tracking-[0.1em]">Ganhe 10% de desconto</p>
                    <p className="text-xs text-[#F5F0E8]/60 font-dm">Use o cupom <span className="text-apollo-gold font-bold">PRIMEIRACOMPRA</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Summary */}
            <div className="p-8 border-t border-white/5 bg-[#0D0D0D] shadow-[0_-30px_60px_rgba(0,0,0,0.5)]">
              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-sm font-dm">
                  <span className="text-white/40">Subtotal</span>
                  <span className="text-[#F5F0E8] font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm font-dm">
                  <span className="text-white/40">Taxa de entrega</span>
                  <span className={cn("font-bold", progressToFreeDelivery === 100 ? "text-green-500" : "text-white/40 italic")}>
                    {progressToFreeDelivery === 100 ? "Grátis" : "Calculada no checkout"}
                  </span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/5 mt-4">
                  <div>
                    <span className="text-[10px] font-dm font-bold text-white/20 uppercase tracking-[0.2em] block mb-1">Total estimado</span>
                    <span className="text-3xl font-playfair font-bold text-[#F5F0E8]">
                      R$ {subtotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {progressToFreeDelivery === 100 && (
                    <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-1 rounded-md font-bold uppercase mb-2">Economia de R$ 7,00</span>
                  )}
                </div>
              </div>

              <Link
                href="/checkout"
                className={cn(
                  "w-full py-5 rounded-[20px] flex items-center justify-center gap-3 font-dm font-bold text-white transition-all text-lg",
                  items.length > 0
                    ? "bg-apollo-orange hover:brightness-110 shadow-[0_15px_40px_rgba(232,93,36,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-white/5 cursor-not-allowed text-white/20"
                )}
                onClick={(e) => {
                  if (items.length === 0) e.preventDefault()
                  else closeCart()
                }}
              >
                {items.length === 0 ? "Adicione itens para continuar" : "Finalizar pedido agora"}
              </Link>
              <p className="text-[10px] text-center text-white/20 font-dm mt-4 uppercase tracking-[0.1em]">Pagamento via Pix ou Cartão de Crédito</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CartDrawer

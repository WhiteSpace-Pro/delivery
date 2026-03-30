"use client"

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'

const MobileCartBar = () => {
  const { items, openCart, isOpen } = useCartStore()

  const totalItems = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0)
  }, [items])

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  }, [items])

  if (items.length === 0 || isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-6 right-6 z-[150] md:hidden"
      >
        <button
          onClick={openCart}
          className="w-full bg-apollo-orange text-white p-5 rounded-[24px] flex items-center justify-between shadow-[0_20px_50px_rgba(232,93,36,0.4)] active:scale-95 transition-all border border-white/10 overflow-hidden relative group"
        >
          {/* Subtle reflection effect */}
          <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:left-[100%] transition-all duration-1000" />

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-white text-apollo-orange text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-apollo-orange">
                {totalItems}
              </span>
            </div>
            <div className="text-left">
              <span className="block text-[10px] font-dm font-black uppercase tracking-[0.15em] text-white/60 mb-0.5">Ver sua sacola</span>
              <span className="text-lg font-dm font-bold tracking-tight">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-dm font-black uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
            Continuar
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

export default MobileCartBar

"use client"

import React, { useMemo } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '../../stores/cartStore'
import { motion, AnimatePresence } from 'framer-motion'

const Header = () => {
  const { items, openCart } = useCartStore()

  const totalItems = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0)
  }, [items])

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#0D0D0D]/80 backdrop-blur-md border-b border-white/5 z-50">
      <div className="container mx-auto h-full px-6 flex items-center justify-between">
        <h1 className="text-2xl font-playfair text-apollo-orange font-bold">Apollo Pizzaria</h1>

        <button
          onClick={openCart}
          className="relative p-2 hover:bg-white/5 rounded-full transition-colors group"
        >
          <ShoppingCart className="w-6 h-6 text-[#F5F0E8] group-hover:text-apollo-orange transition-colors" />

          <AnimatePresence>
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                key={totalItems}
                className="absolute -top-1 -right-1 bg-apollo-orange text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0D0D0D]"
              >
                <motion.span
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                >
                  {totalItems}
                </motion.span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </header>
  )
}

export default Header

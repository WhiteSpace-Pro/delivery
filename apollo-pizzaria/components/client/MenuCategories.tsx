"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Pizza, Beer, Package, Star, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Category {
  id: string
  name: string
  icon: React.ElementType
}

const categories: Category[] = [
  { id: 'pizzas', name: 'Pizzas', icon: Pizza },
  { id: 'promocoes', name: 'Promoções', icon: Package },
  { id: 'bebidas', name: 'Bebidas', icon: Beer },
]

const MenuCategories = () => {
  const [activeCategory, setActiveCategory] = useState('pizzas')
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToCategory = (id: string) => {
    setActiveCategory(id)
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = element.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className={cn(
      "w-full z-40 transition-all duration-300",
      isSticky ? "fixed top-20 left-0 bg-[#0D0D0D]/90 backdrop-blur-xl py-4 border-b border-white/5 px-6 shadow-2xl" : "relative py-8"
    )}>
      <div className="container mx-auto">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-full font-dm font-bold text-sm whitespace-nowrap transition-all border shrink-0",
                activeCategory === cat.id
                  ? "bg-apollo-orange border-apollo-orange text-white shadow-lg shadow-apollo-orange/20"
                  : "bg-white/5 border-white/5 text-white/40 hover:text-white/60 hover:bg-white/10"
              )}
            >
              <cat.icon className="w-4 h-4" />
              {cat.name}
              {activeCategory === cat.id && (
                <motion.div layoutId="cat-indicator" className="w-1 h-1 rounded-full bg-white ml-1" />
              )}
            </button>
          ))}

          {/* Quick info for sticky state */}
          {isSticky && (
            <div className="ml-auto hidden lg:flex items-center gap-6 pr-6">
              <div className="flex items-center gap-1.5 text-xs font-dm font-bold text-white/40">
                <Clock className="w-3.5 h-3.5 text-apollo-orange" />
                20-35 min
              </div>
              <div className="flex items-center gap-1.5 text-xs font-dm font-bold text-white/40">
                <Star className="w-3.5 h-3.5 text-apollo-gold fill-current" />
                4.9
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuCategories

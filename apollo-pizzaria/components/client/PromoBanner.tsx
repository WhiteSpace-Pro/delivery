"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Star, Ticket, ChevronRight } from 'lucide-react'
import Image from 'next/image'

const PromoBanner = () => {
  return (
    <section className="relative w-full h-[450px] md:h-[600px] bg-[#0D0D0D] overflow-hidden">
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-pizza.jpg"
          alt="Banner Pizza"
          fill
          className="object-cover opacity-50 scale-110 blur-sm brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-[#0D0D0D] opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-transparent to-transparent opacity-80" />
      </div>

      <div className="container mx-auto h-full px-6 relative z-10 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-2xl space-y-6"
        >
          {/* Conversion Badge */}
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/5 backdrop-blur-xl px-4 py-2 rounded-full mb-4">
             <div className="flex items-center gap-1.5 text-xs font-dm font-bold text-apollo-orange">
              <Clock className="w-4 h-4 fill-current opacity-20" />
              20-35 min
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <div className="flex items-center gap-1.5 text-xs font-dm font-bold text-white/40">
              <Star className="w-4 h-4 text-apollo-gold fill-current" />
              4.9 (120+ avaliações)
            </div>
          </div>

          <h1 className="text-5xl md:text-8xl font-playfair font-bold text-[#F5F0E8] leading-tight tracking-tight">
            A verdadeira <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-apollo-orange to-apollo-gold drop-shadow-sm italic">Pizza Napolitana</span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 font-dm max-w-lg leading-relaxed mb-8">
            Massa de fermentação natural, ingredientes importados e forno a lenha. Viva a experiência Apollo.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <button
              onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full md:w-auto px-10 py-5 bg-apollo-orange text-white font-dm font-bold rounded-2xl flex items-center justify-center gap-3 hover:brightness-110 shadow-[0_15px_40px_rgba(232,93,36,0.3)] transition-all active:scale-95 group"
            >
              Fazer meu pedido agora
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
              <Ticket className="w-6 h-6 text-apollo-gold" />
              <div>
                <p className="text-[10px] font-dm font-bold text-white/30 uppercase tracking-[0.2em] block">Cupom de boas-vindas</p>
                <p className="text-sm font-dm font-bold text-apollo-gold">APOLLO10 (10% OFF)</p>
              </div>
            </div>
          </div>

          <div className="pt-10 flex items-center gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-dm font-bold text-[#F5F0E8]">12k+</span>
              <span className="text-[10px] font-dm font-bold text-white/20 uppercase tracking-[0.2em]">Pedidos realizados</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-dm font-bold text-[#F5F0E8]">1.2k+</span>
              <span className="text-[10px] font-dm font-bold text-white/20 uppercase tracking-[0.2em]">Clientes felizes</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-dm font-bold text-[#F5F0E8]">4.9</span>
              <span className="text-[10px] font-dm font-bold text-white/20 uppercase tracking-[0.2em]">Nota média</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Side Decorative Item */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -20, x: 200 }}
        animate={{ opacity: 1, scale: 1, rotate: 0, x: 0 }}
        transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
        className="absolute top-[20%] right-[-10%] z-20 w-[600px] h-[600px] hidden xl:block"
      >
        <Image
          src="/hero-pizza.jpg"
          alt="Pizza Hero"
          fill
          className="object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,1)] hover:rotate-12 transition-all duration-1000"
        />
      </motion.div>
    </section>
  )
}

export default PromoBanner

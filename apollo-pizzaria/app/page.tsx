"use client"

import React, { useState, useMemo } from 'react'
import Header from '../components/client/Header'
import ProductCard from '../components/client/ProductCard'
import CartDrawer from '../components/client/CartDrawer'
import PizzaModal from '../components/client/PizzaModal'
import PromoBanner from '../components/client/PromoBanner'
import MenuCategories from '../components/client/MenuCategories'
import MobileCartBar from '../components/client/MobileCartBar'
import { Product } from '../types'

// Enhanced Mock Data
const mockProducts: Product[] = [
  {
    id: '1',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat1',
    name: 'Muçarela Clássica',
    description: 'Molho de tomate pelati, muçarela premium e orégano fresco.',
    price: 48,
    image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&q=80&w=600',
    is_pizza: true,
    active: true,
    created_at: new Date().toISOString(),
    type: 'pizza',
    price_m: 36,
    price_g: 48,
    price_gg: 58,
    tags: ['tradicional', 'vegetariana'],
    allow_half: true,
    is_available: true,
    sort_order: 1
  },
  {
    id: '2',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat1',
    name: 'Frango c/Catupiry',
    description: 'Frango desfiado temperado com ervas finas e legítimo Catupiry.',
    price: 48,
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600',
    is_pizza: true,
    active: true,
    created_at: new Date().toISOString(),
    type: 'pizza',
    price_m: 36,
    price_g: 48,
    price_gg: 58,
    tags: ['frango'],
    allow_half: true,
    is_available: true,
    sort_order: 2
  },
  {
    id: '4',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat1',
    name: 'Pepperoni Supreme',
    description: 'Pepperoni artesanal e dose extra de muçarela.',
    price: 52,
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=600',
    is_pizza: true,
    active: true,
    created_at: new Date().toISOString(),
    type: 'pizza',
    price_m: 38,
    price_g: 52,
    price_gg: 62,
    tags: ['especial'],
    allow_half: true,
    is_available: true,
    sort_order: 4
  },
  {
    id: '5',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat1',
    name: 'Margherita Especial',
    description: 'Muçarela de búfala, manjericão e tomate cereja.',
    price: 48,
    image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=600',
    is_pizza: true,
    active: true,
    created_at: new Date().toISOString(),
    type: 'pizza',
    price_m: 36,
    price_g: 48,
    price_gg: 58,
    tags: ['vegetariana'],
    allow_half: true,
    is_available: true,
    sort_order: 5
  },
  {
    id: '6',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat2',
    name: 'Combo Casal',
    description: '1 Pizza Média + 1 Coca-Cola 1.5L + 1 Borda Grátis.',
    price: 49,
    image_url: 'https://images.unsplash.com/photo-1555072956-7758afb20e8f?auto=format&fit=crop&q=80&w=600',
    is_pizza: false,
    active: true,
    created_at: new Date().toISOString(),
    type: 'combo',
    price_single: 49,
    tags: ['promo', 'combo'],
    allow_half: false,
    is_available: true,
    sort_order: 6
  },
  {
    id: '3',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat3',
    name: 'Coca-Cola 2L',
    description: 'Gelada e pronta para o seu pedido.',
    price: 12,
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600',
    is_pizza: false,
    active: true,
    created_at: new Date().toISOString(),
    type: 'beverage',
    price_single: 12,
    tags: ['gelada'],
    allow_half: false,
    is_available: true,
    sort_order: 3
  }
]

export default function Page() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const pizzas = useMemo(() => mockProducts.filter(p => p.type === 'pizza'), [])
  const combos = useMemo(() => mockProducts.filter(p => p.type === 'combo'), [])
  const beverages = useMemo(() => mockProducts.filter(p => p.type === 'beverage'), [])

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-[#F5F0E8] overflow-x-hidden selection:bg-apollo-orange/30">
      <Header />

      <PromoBanner />

      <div id="menu" className="container mx-auto px-6 lg:px-12 relative z-10 pb-32">
        <MenuCategories />

        {/* Combos Highlight Section */}
        {combos.length > 0 && (
          <section id="promocoes" className="pt-10 mb-20 scroll-mt-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-4">
                <div className="bg-apollo-gold/10 text-apollo-gold text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full inline-block">Economize muito</div>
                <h2 className="text-4xl md:text-5xl font-playfair font-bold italic tracking-tight">Promoções Especiais</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {combos.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Pizzas Section */}
        <section id="pizzas" className="pt-10 mb-20 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-4">
              <div className="bg-apollo-orange/10 text-apollo-orange text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full inline-block">Nossas Pizzas</div>
              <h2 className="text-4xl md:text-5xl font-playfair font-bold italic tracking-tight">O Sabor da Itália</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {pizzas.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>

        {/* Beverages Section */}
        <section id="bebidas" className="pt-10 mb-20 scroll-mt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-4">
              <div className="bg-white/5 text-white/40 text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full inline-block">Acompanhamentos</div>
              <h2 className="text-4xl md:text-5xl font-playfair font-bold italic tracking-tight">Bebidas & Sobremesas</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {beverages.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>

      <CartDrawer />
      <MobileCartBar />

      {selectedProduct && (
        <PizzaModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Footer Design Element */}
      <footer className="py-20 bg-black border-t border-white/5 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-20">
            <div>
              <h3 className="text-3xl font-playfair font-bold text-apollo-orange mb-4">Apollo Pizzaria</h3>
              <p className="text-white/40 font-dm max-w-sm">A verdadeira experiência da pizza napolitana, agora no conforto da sua casa.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <span className="text-[10px] font-dm font-bold text-white/20 uppercase tracking-[0.2em]">Menu</span>
                <ul className="space-y-2 text-sm font-dm text-white/60">
                  <li className="hover:text-apollo-orange transition-colors cursor-pointer">Pizzas</li>
                  <li className="hover:text-apollo-orange transition-colors cursor-pointer">Combos</li>
                  <li className="hover:text-apollo-orange transition-colors cursor-pointer">Bebidas</li>
                </ul>
              </div>
              <div className="space-y-4">
                <span className="text-[10px] font-dm font-bold text-white/20 uppercase tracking-[0.2em]">Social</span>
                <ul className="space-y-2 text-sm font-dm text-white/60">
                  <li className="hover:text-apollo-orange transition-colors cursor-pointer">Instagram</li>
                  <li className="hover:text-apollo-orange transition-colors cursor-pointer">WhatsApp</li>
                  <li className="hover:text-apollo-orange transition-colors cursor-pointer">Facebook</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 pt-12 text-[10px] font-dm font-bold text-white/20 uppercase tracking-[0.1em]">
            <span>© 2024 Apollo Pizzaria. Todos os direitos reservados.</span>
            <div className="flex gap-8">
              <span className="hover:text-white transition-colors cursor-pointer">Termos de uso</span>
              <span className="hover:text-white transition-colors cursor-pointer">Privacidade</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

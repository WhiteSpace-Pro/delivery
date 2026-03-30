"use client"

import React, { useState } from 'react'
import Header from '../components/client/Header'
import ProductCard from '../components/client/ProductCard'
import CartDrawer from '../components/client/CartDrawer'
import PizzaModal from '../components/client/PizzaModal'
import { Product } from '../types'

// Mock Data for testing that matches the Database types
const mockProducts: Product[] = [
  {
    id: '1',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat1',
    name: 'Muçarela',
    description: 'Molho de tomate especial e muçarela',
    price: 48,
    image_url: 'https://images.unsplash.com/photo-1573410312251-89b14fad0d97?auto=format&fit=crop&q=80&w=400',
    is_pizza: true,
    active: true,
    created_at: new Date().toISOString(),
    // Extended properties used in UI
    type: 'pizza',
    price_m: 36,
    price_g: 48,
    price_gg: 58,
    tags: ['tradicional'],
    allow_half: true,
    is_available: true,
    sort_order: 1
  },
  {
    id: '2',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat1',
    name: 'Frango c/Catupiry',
    description: 'Frango desfiado e legítimo Catupiry',
    price: 48,
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400',
    is_pizza: true,
    active: true,
    created_at: new Date().toISOString(),
    // Extended properties used in UI
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
    id: '3',
    tenant_id: '496c5a35-6843-4061-b3ab-159d15a0cbc6',
    category_id: 'cat2',
    name: 'Coca-Cola 2L',
    description: 'Refrigerante 2 litros',
    price: 12,
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400',
    is_pizza: false,
    active: true,
    created_at: new Date().toISOString(),
    // Extended properties used in UI
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

  return (
    <main className="min-h-screen bg-apollo-dark pt-24 pb-12">
      <Header />

      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-playfair text-[#F5F0E8] mb-8">Cardápio Apollo</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => product.type === 'pizza' && setSelectedProduct(product)}
            />
          ))}
        </div>
      </div>

      <CartDrawer />

      {selectedProduct && (
        <PizzaModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}

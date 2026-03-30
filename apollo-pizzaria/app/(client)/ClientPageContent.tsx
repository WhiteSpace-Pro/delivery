"use client";

import { useState } from "react";
import { Product } from "@/types";
import { ProductCard } from "@/components/client/ProductCard";
import { PizzaModal } from "@/components/client/PizzaModal";
import { cn } from "@/lib/utils";

type FilterType = 'Todas' | 'Vegetarianas' | 'Promoções';

interface ClientPageContentProps {
  initialProducts: Product[];
  tenantId: string;
}

export default function ClientPageContent({ initialProducts, tenantId }: ClientPageContentProps) {
  const [filter, setFilter] = useState<FilterType>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = initialProducts.filter(product => {
    if (filter === 'Todas') return true;
    if (filter === 'Vegetarianas') return product.tags?.includes('vegetariana');
    if (filter === 'Promoções') return product.tags?.includes('promoção');
    return true;
  });

  const handleAddProduct = (product: Product) => {
    if (product.type === 'pizza') {
      setSelectedProduct(product);
      setIsModalOpen(true);
    } else {
      // Direct add to cart logic will be in prompt 06
      console.log("Added direct:", product.name);
    }
  };

  const filters: FilterType[] = ['Todas', 'Vegetarianas', 'Promoções'];

  if (initialProducts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#141414] rounded-3xl border border-white/5">
        <p className="text-[#8A8480] font-dm italic">O cardápio está temporariamente indisponível.</p>
      </div>
    );
  }

  return (
    <section className="container mx-auto px-4 pb-20">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap",
              filter === f
                ? "bg-[#E85D24] border-[#E85D24] text-white shadow-lg shadow-[#E85D24]/20"
                : "bg-[#1C1C1C] border-white/5 text-[#8A8480] hover:border-[#D4941A]/50"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={handleAddProduct}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-[#8A8480] font-dm italic">Nenhum item encontrado com este filtro.</p>
        </div>
      )}

      {/* Pizza Customization Modal */}
      <PizzaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        tenantId={tenantId}
      />
    </section>
  );
}

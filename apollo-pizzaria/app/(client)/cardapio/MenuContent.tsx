"use client";

import { useState, useEffect } from "react";
import { Product, Database } from "@/types";
import { ProductCard } from "@/components/client/ProductCard";
import { PizzaModal } from "@/components/client/PizzaModal";
import { cn } from "@/lib/utils";

type Category = Database['public']['Tables']['categories']['Row'];

interface MenuContentProps {
  categories: Category[];
  products: Product[];
  tenantId: string;
}

export default function MenuContent({ categories, products, tenantId }: MenuContentProps) {
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [vegetarianOnly, setVegetarianOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Initialize activeCategory with the first category ID once categories are available
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const filteredProducts = products.filter(p => {
    const matchCategory = p.category_id === activeCategory;
    const matchVeg = vegetarianOnly ? p.tags?.includes('vegetariana') : true;
    return matchCategory && matchVeg;
  });

  const handleAddProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-32 bg-[#141414] rounded-3xl border border-white/5">
        <h2 className="text-2xl font-playfair text-[#F5F0E8] mb-4">Cardápio em Manutenção</h2>
        <p className="text-[#8A8480] font-dm max-w-md mx-auto">
          No momento não há categorias ativas. Por favor, tente novamente em instantes ou entre em contato com a pizzaria.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-10">
      {/* Sidebar - Desktop only */}
      <aside className="hidden md:block w-64 flex-shrink-0 sticky top-32 h-fit">
        <h2 className="font-playfair text-2xl font-bold mb-8 text-[#F5F0E8]">Categorias</h2>
        <nav className="flex flex-col gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-3 rounded-xl text-left font-bold transition-all border",
                activeCategory === cat.id
                  ? "bg-[#E85D24] border-[#E85D24] text-white shadow-lg shadow-[#E85D24]/10"
                  : "bg-transparent border-transparent text-[#8A8480] hover:border-white/10 hover:bg-white/5"
              )}
            >
              {cat.name}
            </button>
          ))}
        </nav>

        <div className="mt-12 pt-8 border-t border-white/5">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={vegetarianOnly}
              onChange={() => setVegetarianOnly(!vegetarianOnly)}
              className="sr-only"
            />
            <div className={cn(
              "w-10 h-5 rounded-full transition-colors relative",
              vegetarianOnly ? "bg-[#D4941A]" : "bg-white/10"
            )} >
              <div className={cn(
                "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform",
                vegetarianOnly ? "translate-x-5" : "translate-x-0"
              )} />
            </div>
            <span className="text-sm font-bold text-[#8A8480] group-hover:text-[#F5F0E8] transition-colors">
              Vegetarianas
            </span>
          </label>
        </div>
      </aside>

      {/* Main Grid */}
      <div className="flex-1">
        {/* Mobile Category Selector */}
        <div className="md:hidden flex items-center gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-[#E85D24] border-[#E85D24] text-white shadow-lg shadow-[#E85D24]/20"
                  : "bg-[#1C1C1C] border-white/5 text-[#8A8480] hover:border-[#D4941A]/50"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-[#F5F0E8]">
            {categories.find(c => c.id === activeCategory)?.name || "Produtos"}
          </h1>
          <div className="md:hidden">
            <button
              onClick={() => setVegetarianOnly(!vegetarianOnly)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold border transition-all",
                vegetarianOnly ? "bg-[#D4941A] border-[#D4941A] text-white" : "border-white/10 text-[#8A8480]"
              )}
            >
              Veggie
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={handleAddProduct}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-24 bg-[#141414] rounded-2xl border border-dashed border-white/5">
            <p className="text-[#8A8480] font-dm">Não há produtos disponíveis nesta categoria.</p>
          </div>
        )}
      </div>

      {/* Pizza Customization Modal */}
      <PizzaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        tenantId={tenantId}
      />
    </div>
  );
}

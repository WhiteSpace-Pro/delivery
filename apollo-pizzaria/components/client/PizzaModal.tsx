"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { Product, PizzaOption } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PizzaSize = 'M' | 'G' | 'GG';

interface PizzaModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  tenantId: string;
}

export function PizzaModal({ isOpen, onClose, product, tenantId }: PizzaModalProps) {
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('G');
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [firstFlavorId, setFirstFlavorId] = useState<string>("");
  const [secondFlavorId, setSecondFlavorId] = useState<string>("");
  const [flavors, setFlavors] = useState<Product[]>([]);
  const [edgeOptions, setEdgeOptions] = useState<PizzaOption[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [observations, setObservations] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (product) {
      setFirstFlavorId(product.id);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen) {
      const fetchFlavors = async () => {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('type', 'pizza')
          .eq('is_available', true);
        if (data) setFlavors(data as Product[]);
      };

      const fetchEdges = async () => {
        const { data } = await supabase
          .from('pizza_options')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('active', true);
        if (data) {
          const options = data as PizzaOption[];
          setEdgeOptions(options);
          const trad = options.find(o => o.name.toLowerCase().includes('tradicional'));
          if (trad) setSelectedEdgeId(trad.id);
        }
      };

      fetchFlavors();
      fetchEdges();
    }
  }, [isOpen, tenantId, supabase]);

  if (!product) return null;

  const firstFlavor = flavors.find(f => f.id === firstFlavorId) || product;
  const secondFlavor = flavors.find(f => f.id === secondFlavorId);

  const calculateTotal = () => {
    let basePrice = 0;
    const p1 = firstFlavor;
    const p2 = isHalfAndHalf && secondFlavor ? secondFlavor : p1;

    if (selectedSize === 'M') {
      basePrice = Math.max(p1.price_m || 0, isHalfAndHalf ? (p2.price_m || 0) : 0);
    } else if (selectedSize === 'G') {
      basePrice = Math.max(p1.price_g || 0, isHalfAndHalf ? (p2.price_g || 0) : 0);
    } else {
      basePrice = Math.max(p1.price_gg || 0, isHalfAndHalf ? (p2.price_gg || 0) : 0);
    }

    const edgePrice = edgeOptions.find(o => o.id === selectedEdgeId)?.price || 0;
    return basePrice + edgePrice;
  };

  const total = calculateTotal();

  const sizes: { id: PizzaSize; label: string; price: number | null }[] = [
    { id: 'M', label: 'Média', price: firstFlavor.price_m },
    { id: 'G', label: 'Grande', price: firstFlavor.price_g },
    { id: 'GG', label: 'Gigante', price: firstFlavor.price_gg }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[600px] max-h-[90vh] bg-[#141414] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#141414] z-10">
              <h2 className="font-playfair text-xl text-[#F5F0E8]">{firstFlavor.name}</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-[#8A8480] transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* SECTION 1 — TAMANHO */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8480]">Escolha o Tamanho</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size.id)}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-left group",
                        selectedSize === size.id
                          ? "border-[#E85D24] bg-[#E85D24]/10"
                          : "border-white/5 bg-[#1C1C1C] hover:border-[#D4941A]/50"
                      )}
                    >
                      <div className={cn("text-xs font-bold mb-1", selectedSize === size.id ? "text-[#E85D24]" : "text-[#8A8480]")}>
                        {size.label}
                      </div>
                      <div className="text-[#F5F0E8] font-bold">
                        R$ {size.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* SECTION 2 — MEIA A MEIA */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8480]">Meia a meia?</h3>
                  <button
                    onClick={() => setIsHalfAndHalf(!isHalfAndHalf)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isHalfAndHalf ? "bg-[#E85D24]" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                      isHalfAndHalf ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {isHalfAndHalf && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#8A8480] uppercase ml-1">1ª Metade</label>
                        <div className="relative">
                          <select
                            value={firstFlavorId}
                            onChange={(e) => setFirstFlavorId(e.target.value)}
                            className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl p-4 text-[#F5F0E8] appearance-none focus:outline-none focus:border-[#E85D24] transition-colors"
                          >
                            {flavors.map(flavor => (
                              <option key={flavor.id} value={flavor.id}>{flavor.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A8480] pointer-events-none" size={20} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#8A8480] uppercase ml-1">2ª Metade</label>
                        <div className="relative">
                          <select
                            value={secondFlavorId}
                            onChange={(e) => setSecondFlavorId(e.target.value)}
                            className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl p-4 text-[#F5F0E8] appearance-none focus:outline-none focus:border-[#E85D24] transition-colors"
                          >
                            <option value="">Escolha o 2º sabor</option>
                            {flavors.filter(f => f.id !== firstFlavorId).map(flavor => (
                              <option key={flavor.id} value={flavor.id}>{flavor.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A8480] pointer-events-none" size={20} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center py-4">
                      <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 flex">
                        <div className="flex-1 bg-[#E85D24] flex items-center justify-center p-2 text-center text-[10px] font-bold leading-tight">
                          {firstFlavor.name}
                        </div>
                        <div className="flex-1 bg-[#D4941A] flex items-center justify-center p-2 text-center text-[10px] font-bold leading-tight border-l border-white/10">
                          {secondFlavor ? secondFlavor.name : "..."}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </section>

              {/* SECTION 3 — BORDA */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8480]">Borda Recheada</h3>
                <div className="flex flex-wrap gap-4">
                  {edgeOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="edge"
                          value={option.id}
                          checked={selectedEdgeId === option.id}
                          onChange={() => setSelectedEdgeId(option.id)}
                          className="sr-only"
                        />
                        <div className={cn(
                          "w-5 h-5 rounded-full border transition-all",
                          selectedEdgeId === option.id ? "border-[#E85D24] border-[6px]" : "border-white/20 group-hover:border-[#D4941A]"
                        )} />
                      </div>
                      <span className="text-sm font-medium text-[#F5F0E8]">
                        {option.name}
                        {option.price > 0 && (
                          <span className="text-[#E85D24] ml-1">
                            (+R$ {option.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* SECTION 4 — OBSERVAÇÕES */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8480]">Observações</h3>
                <div className="relative">
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value.slice(0, 200))}
                    placeholder="Ex: sem cebola, bem assada..."
                    className="w-full h-24 bg-[#1C1C1C] border border-white/10 rounded-xl p-4 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#E85D24] transition-colors resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] text-[#8A8480]">
                    {observations.length}/200
                  </div>
                </div>
              </section>
            </div>

            {/* Footer sticky */}
            <div className="p-6 border-t border-white/5 bg-[#141414] sticky bottom-0 z-10 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-[#8A8480] uppercase font-bold tracking-widest mb-1">Total</div>
                <div className="text-2xl font-bold text-[#E85D24]">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 h-14 bg-[#E85D24] hover:bg-[#D15420] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#E85D24]/10"
              >
                Adicionar ao carrinho
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

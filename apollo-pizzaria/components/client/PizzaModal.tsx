"use client";

import { useState, useEffect, useMemo } from "react";
import { Product, PizzaOption } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart, CartItem } from "@/contexts/CartContext";

interface PizzaModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  tenantId: string;
}

function inferCombo(name: string) {
  let qty_pizzas = 1;
  if (name.startsWith("2 ")) qty_pizzas = 2;
  else if (name.startsWith("1 ")) qty_pizzas = 1;

  let size: 'G' | 'GG' | null = null;
  if (name.includes('GG') || name.toLowerCase().includes('gigante')) {
    size = 'GG';
  } else if (name.includes(' G ') || name.includes('G +') || name.endsWith(' G')) {
    size = 'G';
  }

  return { qty_pizzas, size };
}

export function PizzaModal({ isOpen, onClose, product, tenantId }: PizzaModalProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<'M' | 'G' | 'GG'>('G');
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [firstFlavorId, setFirstFlavorId] = useState<string>("");
  const [secondFlavorId, setSecondFlavorId] = useState<string>("");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>("");
  const [observations, setObservations] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [flavors, setFlavors] = useState<Product[]>([]);
  const [edgeOptions, setEdgeOptions] = useState<PizzaOption[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [selectedComboFlavors, setSelectedComboFlavors] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && tenantId) {
      setImgError(false);
      if (product) {
        setFirstFlavorId(product.id);
        setObservations("");
        setQuantity(1);
        setIsHalfAndHalf(false);
        setSecondFlavorId("");
        setSelectedComboFlavors([]);
      }

      const fetchFlavors = async () => {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('type', 'pizza')
          .eq('is_available', true)
          .order('name', { ascending: true });
        if (data) setFlavors(data as Product[]);
      };

      const fetchEdges = async () => {
        const { data } = await supabase
          .from('pizza_options')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_available', true);
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
  }, [isOpen, tenantId, product, supabase]);

  const firstFlavor = useMemo(() =>
    flavors.find(f => f.id === firstFlavorId) || product,
    [flavors, firstFlavorId, product]
  );

  const secondFlavor = useMemo(() =>
    flavors.find(f => f.id === secondFlavorId),
    [flavors, secondFlavorId]
  );

  const isPizza = product?.type === 'pizza';
  const isCombo = product?.type === 'combo';

  const comboInfo = useMemo(() => {
    if (!product || !isCombo) return null;
    return inferCombo(product.name);
  }, [product, isCombo]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;

    if (isCombo) {
      return product.price_single || 0;
    }

    if (!isPizza) {
      return product.price_single || 0;
    }

    if (!firstFlavor) return 0;

    let basePrice = 0;
    const p1 = firstFlavor;
    const p2 = secondFlavor;

    if (selectedSize === 'M') {
      basePrice = Math.max(p1.price_m || 0, isHalfAndHalf ? (p2?.price_m || 0) : 0);
    } else if (selectedSize === 'G') {
      basePrice = Math.max(p1.price_g || 0, isHalfAndHalf ? (p2?.price_g || 0) : 0);
    } else if (selectedSize === 'GG') {
      basePrice = Math.max(p1.price_gg || 0, isHalfAndHalf ? (p2?.price_gg || 0) : 0);
    }

    const edge = edgeOptions.find(e => e.id === selectedEdgeId);
    const edgePrice = edge?.extra_price || 0;

    return basePrice + edgePrice;
  }, [isPizza, isCombo, product, firstFlavor, secondFlavor, selectedSize, isHalfAndHalf, edgeOptions, selectedEdgeId]);

  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!product) return;

    const cartItem: CartItem = {
      id: product.id,
      name: product.name,
      size: isPizza ? selectedSize : (isCombo && comboInfo ? comboInfo.size : null),
      border: isPizza ? (edgeOptions.find(e => e.id === selectedEdgeId)?.name || null) : null,
      half_half: isPizza && isHalfAndHalf ? (secondFlavor?.name || null) : null,
      combo_flavors: isCombo ? selectedComboFlavors : undefined,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      observations
    };

    addItem(cartItem);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onClose();
    }, 800);
  };

  const toggleComboFlavor = (flavorName: string) => {
    if (!comboInfo) return;
    setSelectedComboFlavors(prev => {
      if (prev.includes(flavorName)) {
        return prev.filter(f => f !== flavorName);
      }
      if (prev.length < comboInfo.qty_pizzas) {
        return [...prev, flavorName];
      }
      return prev;
    });
  };

  const isComboComplete = comboInfo ? selectedComboFlavors.length === comboInfo.qty_pizzas : true;
  const isHalfHalfComplete = isHalfAndHalf ? (!!firstFlavorId && !!secondFlavorId) : true;

  const getButtonText = () => {
    if (showToast) return 'Adicionado!';
    if (isCombo && comboInfo) {
      const remaining = comboInfo.qty_pizzas - selectedComboFlavors.length;
      if (remaining > 0) {
        if (comboInfo.qty_pizzas === 1) return "Escolha 1 sabor";
        if (selectedComboFlavors.length === 0) return `Escolha ${comboInfo.qty_pizzas} sabores`;
        return `Escolha mais ${remaining} sabor${remaining > 1 ? 'es' : ''}`;
      }
    }
    return 'Adicionar ao carrinho';
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-[#0D0D0D] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/5"
          >
            {/* Header com Imagem */}
            <div className="relative h-48 sm:h-64 shrink-0">
              {product.image_url && !imgError ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1C1C1C] to-[#0D0D0D] flex items-center justify-center">
                  <span className="text-[#E85D24] font-playfair text-4xl opacity-20">Apollo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#E85D24] transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
              <header>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[#E85D24] text-xs font-bold uppercase tracking-widest bg-[#E85D24]/10 px-3 py-1 rounded-full mb-3 inline-block">
                      {product.type === 'pizza' ? 'Pizza Artesanal' : product.type === 'combo' ? 'Combo Apollo' : 'Bebida / Outros'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-playfair font-bold text-[#F5F0E8]">{product.name}</h2>
                  </div>
                </div>
                {product.description && (
                  <p className="text-[#8A8480] mt-3 text-sm leading-relaxed max-w-lg">{product.description}</p>
                )}
              </header>

              {isPizza ? (
                <>
                  {/* SECTION 1 — TAMANHO */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8480]">Escolha o Tamanho</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'M', label: 'Média (6 fatias)', price: firstFlavor?.price_m },
                        { id: 'G', label: 'Grande (8 fatias)', price: firstFlavor?.price_g },
                        { id: 'GG', label: 'Gigante (12 fatias)', price: firstFlavor?.price_gg },
                      ].map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSize(size.id as 'M' | 'G' | 'GG')}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all",
                            selectedSize === size.id
                              ? "bg-[#E85D24]/10 border-[#E85D24] ring-1 ring-[#E85D24]"
                              : "bg-white/5 border-white/5 hover:border-white/20"
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
                              {firstFlavor?.name}
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
                            {option.extra_price && option.extra_price > 0 ? (
                              <span className="text-[#E85D24] ml-1">
                                (+R$ {option.extra_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}

              {isCombo && comboInfo && (
                <section className="space-y-4">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8480]">Escolha os Sabores</h3>
                    <p className="text-xs text-[#E85D24] font-medium mt-1">Escolha {comboInfo.qty_pizzas} sabor(es)</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {flavors.map((flavor) => {
                      const isSelected = selectedComboFlavors.includes(flavor.name);
                      const price = comboInfo.size === 'G' ? flavor.price_g : (comboInfo.size === 'GG' ? flavor.price_gg : null);

                      return (
                        <button
                          key={flavor.id}
                          onClick={() => toggleComboFlavor(flavor.name)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                            isSelected
                              ? "bg-[#E85D24]/10 border-[#E85D24]"
                              : "bg-[#1C1C1C] border-white/5 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center transition-all",
                              isSelected ? "bg-[#E85D24] border-[#E85D24]" : "border-white/20"
                            )}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                            <span className={cn("text-sm font-medium", isSelected ? "text-[#F5F0E8]" : "text-[#8A8480]")}>
                              {flavor.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-[#D4941A]">
                            {price ? `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "incluso"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Quantity */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8480]">Quantidade</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 bg-[#1C1C1C] border border-white/5 rounded-full p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center text-xl font-bold text-[#F5F0E8] hover:bg-white/5 rounded-full"
                    >-</button>
                    <span className="text-lg font-bold w-4 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-xl font-bold text-[#F5F0E8] hover:bg-white/5 rounded-full"
                    >+</button>
                  </div>
                  <span className="text-[#8A8480] text-sm italic">Mínimo: 1</span>
                </div>
              </section>

              {/* Observations */}
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
                  R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={showToast || !isComboComplete || !isHalfHalfComplete}
                className="w-full sm:w-auto px-8 h-14 bg-[#E85D24] hover:bg-[#D15420] disabled:bg-zinc-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#E85D24]/10"
              >
                {getButtonText()}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface PizzaModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  tenantId: string;
}

interface Flavor {
  id: string;
  name: string;
  price_m: number;
  price_g: number;
  price_gg: number;
}

export function PizzaModal({ isOpen, onClose, product, tenantId }: PizzaModalProps) {
  const { addItem } = useCart();
  const supabase = createClient();

  const [selectedSize, setSelectedSize] = useState<'M' | 'G' | 'GG'>('G');
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [firstFlavorId, setFirstFlavorId] = useState<string>('');
  const [secondFlavorId, setSecondFlavorId] = useState<string>('');
  const [edgeOptions, setEdgeOptions] = useState<any[]>([]);
  const [selectedEdgeId] = useState<string>('');
  const [observations] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [comboPizzas, setComboPizzas] = useState<any[]>([]);

  const isPizza = product?.type === 'pizza';
  const isCombo = product?.type === 'combo';

  const fetchDetails = useCallback(async () => {
    const { data: flavorsData } = await supabase
      .from('products')
      .select('id, name, price_m, price_g, price_gg')
      .eq('tenant_id', tenantId)
      .eq('type', 'pizza')
      .eq('is_available' as any, true);

    if (flavorsData) {
      setFlavors(flavorsData as Flavor[]);
      if (flavorsData.length > 0) setFirstFlavorId(flavorsData[0].id);
    }

    const { data: edgesData } = await (supabase as any)
      .from('pizza_options')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_available', true);

    if (edgesData) setEdgeOptions(edgesData);

    if (isCombo) {
      const qty = product?.name.toLowerCase().includes('2') ? 2 : 1;
      const initialPizzas = Array.from({ length: qty }).map(() => ({
        isHalf: false,
        flavor1Id: flavorsData?.[0]?.id || '',
        flavor2Id: '',
        edgeId: ''
      }));
      setComboPizzas(initialPizzas);
    }
  }, [supabase, tenantId, isCombo, product?.name]);

  useEffect(() => {
    if (isOpen && product) {
      void fetchDetails();
    }
  }, [isOpen, product, fetchDetails]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    if (isCombo) return (product.price_single || 0) * quantity;
    if (!isPizza) return (product.price_single || 0) * quantity;

    const f1 = flavors.find(f => f.id === firstFlavorId);
    const f2 = flavors.find(f => f.id === secondFlavorId);

    let base = 0;
    if (selectedSize === 'M') base = Math.max(f1?.price_m || 0, isHalfAndHalf ? (f2?.price_m || 0) : 0);
    if (selectedSize === 'G') base = Math.max(f1?.price_g || 0, isHalfAndHalf ? (f2?.price_g || 0) : 0);
    if (selectedSize === 'GG') base = Math.max(f1?.price_gg || 0, isHalfAndHalf ? (f2?.price_gg || 0) : 0);

    const edge = edgeOptions.find(e => e.id === selectedEdgeId);
    return (base + (edge?.extra_price || 0)) * quantity;
  }, [product, isCombo, isPizza, flavors, firstFlavorId, secondFlavorId, isHalfAndHalf, selectedSize, selectedEdgeId, quantity, edgeOptions]);

  const handleAddToCart = () => {
    if (!product) return;

    if (isCombo) {
       addItem({
         id: product.id,
         name: product.name,
         unit_price: product.price_single || 0,
         total_price: totalPrice,
         quantity: quantity,
         combo_config: comboPizzas.map(p => ({
           flavor1: flavors.find(f => f.id === p.flavor1Id)?.name,
           flavor2: p.isHalf ? flavors.find(f => f.id === p.flavor2Id)?.name : null,
         }))
       } as any);
    } else if (isPizza) {
       const f2 = flavors.find(f => f.id === secondFlavorId);
       addItem({
         id: product.id,
         name: product.name,
         size: selectedSize,
         unit_price: totalPrice / quantity,
         total_price: totalPrice,
         quantity,
         border: edgeOptions.find(e => e.id === selectedEdgeId)?.name,
         half_half: isHalfAndHalf ? { id: f2?.id, name: f2?.name } : null,
         observations
       } as any);
    } else {
       addItem({
         id: product.id,
         name: product.name,
         unit_price: product.price_single || 0,
         total_price: totalPrice,
         quantity
       } as any);
    }
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="relative w-full max-w-2xl bg-[#141414] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-8 bg-[#1A1A1A] border-b border-white/5">
              <div className="flex-1">
                <span className="text-[#E85D24] text-[10px] font-bold uppercase tracking-widest bg-[#E85D24]/10 px-3 py-1 rounded-full mb-3 inline-block">
                  PIZZA ARTESANAL
                </span>
                <h2 className="text-2xl sm:text-[32px] font-black text-white uppercase tracking-tight leading-tight">{product.name}</h2>
                {product.description && (
                  <p className="text-[#8A8480] mt-3 text-sm leading-relaxed max-w-md">{product.description}</p>
                )}
              </div>

              {isHalfAndHalf && (
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/10 shrink-0 shadow-2xl rotate-12">
                  <div className="absolute inset-0 flex">
                    {/* Metade 1 */}
                    <div className="w-1/2 h-full bg-[#E85D24]/10 flex items-center justify-center p-3 text-center border-r border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-tighter leading-none opacity-40">
                        {flavors.find(f => f.id === firstFlavorId)?.name || "Sabor 1"}
                      </span>
                    </div>
                    {/* Metade 2 */}
                    <div className="w-1/2 h-full bg-[#D4941A]/10 flex items-center justify-center p-3 text-center">
                      <span className="text-[9px] font-black uppercase tracking-tighter leading-none opacity-40">
                        {flavors.find(f => f.id === secondFlavorId)?.name || "Sabor 2"}
                      </span>
                    </div>
                  </div>
                  {/* Divisor Visual */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-white/10" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                </div>
              )}

              <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full text-white sm:relative sm:top-0 sm:right-0"><X /></button>
            </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 text-white">
            {isPizza && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {['M', 'G', 'GG'].map(s => (
                    <button key={s} onClick={() => setSelectedSize(s as any)} className={cn("py-4 rounded-xl border font-bold", selectedSize === s ? "border-apollo-orange bg-apollo-orange/10" : "border-white/5")}>{s}</button>
                  ))}
                </div>

                <div className="space-y-4">
                  <button onClick={() => setIsHalfAndHalf(!isHalfAndHalf)} className={cn("w-full py-4 rounded-xl border flex items-center justify-center gap-2 font-bold", isHalfAndHalf ? "border-apollo-orange bg-apollo-orange/10" : "border-white/5")}>
                    {isHalfAndHalf ? "Remover Meio a Meio" : "Fazer Meio a Meio"}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select value={firstFlavorId} onChange={e => setFirstFlavorId(e.target.value)} className="w-full bg-[#1C1C1C] border border-white/10 p-4 rounded-xl text-sm">
                      {flavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {isHalfAndHalf && (
                      <select value={secondFlavorId} onChange={e => setSecondFlavorId(e.target.value)} className="w-full bg-[#1C1C1C] border border-white/10 p-4 rounded-xl text-sm">
                        <option value="">Segundo Sabor</option>
                        {flavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </>
            )}

            {isCombo && (
              <div className="space-y-6">
                {comboPizzas.map((p, idx) => (
                  <div key={idx} className="p-4 border border-white/5 rounded-2xl bg-white/5 space-y-4">
                    <h4 className="font-bold text-sm uppercase text-white/40">Pizza {idx + 1}</h4>
                    <button onClick={() => {
                      const newPizzas = [...comboPizzas];
                      newPizzas[idx].isHalf = !newPizzas[idx].isHalf;
                      setComboPizzas(newPizzas);
                    }} className="text-xs text-apollo-orange font-bold underline">
                      {p.isHalf ? "Sabor único" : "Meia a meia"}
                    </button>
                    <div className="grid grid-cols-1 gap-2">
                      <select value={p.flavor1Id} onChange={e => {
                        const newPizzas = [...comboPizzas];
                        newPizzas[idx].flavor1Id = e.target.value;
                        setComboPizzas(newPizzas);
                      }} className="w-full bg-[#0D0D0D] p-3 rounded-xl border border-white/10 text-sm">
                        {flavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      {p.isHalf && (
                        <select value={p.flavor2Id} onChange={e => {
                          const newPizzas = [...comboPizzas];
                          newPizzas[idx].flavor2Id = e.target.value;
                          setComboPizzas(newPizzas);
                        }} className="w-full bg-[#0D0D0D] p-3 rounded-xl border border-white/10 text-sm">
                          <option value="">Escolha o 2º sabor</option>
                          {flavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
               <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-bold">-</button>
               <span className="text-xl font-bold">{quantity}</span>
               <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-bold">+</button>
            </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-[#1C1C1C] flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 font-bold uppercase">Total</p>
              <p className="text-2xl font-bold text-apollo-orange">R$ {totalPrice.toFixed(2).replace('.', ',')}</p>
            </div>
            <button onClick={handleAddToCart} className="px-8 h-14 bg-apollo-orange hover:bg-apollo-orange/90 rounded-xl font-bold text-white shadow-xl">Adicionar</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

"use client";

import React, { useState } from 'react';
import { useCart, CartItem } from "@/contexts/CartContext";
import { CartItemRow } from "@/components/client/CartItemRow";
import { handlePlaceOrder } from "@/lib/orders";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, DollarSign, QrCode, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CartPage() {
  const { items, addItem, removeItem, clearCart } = useCart();
  const { user } = useUser();
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "debit_card" | "cash">("pix");
  const [changeFor, setChangeFor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  const handleIncrement = (item: CartItem) => {
    addItem({ ...item, quantity: 1, total_price: item.unit_price });
  };

  const handleDecrement = (item: CartItem) => {
    if (item.quantity > 1) {
      addItem({ ...item, quantity: -1, total_price: -item.unit_price });
    } else {
      removeItem(item.id, item.size, item.border, item.half_half);
    }
  };

  const onSubmitOrder = async () => {
    if (!address.trim() || items.length === 0) return;

    setIsLoading(true);
    setErrorMsg("");

    const orderData = {
      address,
      payment_method: paymentMethod,
      change_for: paymentMethod === 'cash' && changeFor ? parseFloat(changeFor.replace(',', '.')) : null,
      customer_name: user?.email ?? 'Cliente'
    };

    const result = await handlePlaceOrder(orderData, items, subtotal);

    if (result.success) {
      clearCart();
      // Redirect to order status page
      router.push(`/order/${result.orderId}`);
    } else {
      setErrorMsg("Erro ao registrar. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <Link href="/cardapio" className="flex items-center gap-2 text-[#8A8480] hover:text-[#F5F0E8] transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium">Voltar para o cardápio</span>
        </Link>
        <h1 className="text-3xl font-playfair font-bold text-[#F5F0E8]">Finalizar Pedido</h1>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#141414] border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-6">
          <div className="text-6xl">🛒</div>
          <div>
            <h2 className="text-xl font-bold text-[#F5F0E8]">Seu carrinho está vazio</h2>
            <p className="text-[#8A8480] mt-1">Adicione itens ao carrinho para fazer um pedido.</p>
          </div>
          <Link
            href="/cardapio"
            className="px-8 py-4 bg-[#E85D24] text-white font-bold rounded-xl hover:bg-[#D15420] transition-colors"
          >
            Ver Cardápio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Items */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-[#F5F0E8] mb-6 flex items-center gap-2">
                Itens do pedido
                <span className="text-sm font-normal text-[#8A8480]">({items.length})</span>
              </h2>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <CartItemRow
                    key={`${item.id}-${item.size}-${item.border}-${item.half_half}-${index}`}
                    item={item}
                    onIncrement={() => handleIncrement(item)}
                    onDecrement={() => handleDecrement(item)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* Delivery Address */}
            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-[#F5F0E8] mb-6 flex items-center gap-2">
                <MapPin className="text-[#E85D24]" size={20} />
                Endereço de entrega
              </h2>
              <div className="space-y-2">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro e complemento"
                  className="w-full h-32 bg-[#0D0D0D] border border-white/10 rounded-2xl p-4 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#E85D24] transition-colors resize-none"
                />
                <p className="text-[10px] text-[#8A8480] px-1">
                  * Campos obrigatórios para entrega.
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-[#F5F0E8] mb-6 flex items-center gap-2">
                <CreditCard className="text-[#E85D24]" size={20} />
                Forma de pagamento
              </h2>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setPaymentMethod("pix")}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    paymentMethod === "pix"
                      ? "bg-[#E85D24]/10 border-[#E85D24] text-[#E85D24]"
                      : "bg-[#0D0D0D] border-white/5 text-[#8A8480] hover:border-white/10"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", paymentMethod === "pix" ? "bg-[#E85D24] text-white" : "bg-white/5 text-[#8A8480]")}>
                    <QrCode size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Pix</div>
                    <div className="text-xs opacity-70">Aprovação imediata</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    paymentMethod === "cash"
                      ? "bg-[#E85D24]/10 border-[#E85D24] text-[#E85D24]"
                      : "bg-[#0D0D0D] border-white/5 text-[#8A8480] hover:border-white/10"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", paymentMethod === "cash" ? "bg-[#E85D24] text-white" : "bg-white/5 text-[#8A8480]")}>
                    <DollarSign size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Dinheiro</div>
                    <div className="text-xs opacity-70">Pagar na entrega</div>
                  </div>
                </button>

                {paymentMethod === "cash" && (
                  <div className="mt-2 pl-2 pr-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-[#8A8480] uppercase mb-1 block">Precisa de troco?</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8480] text-sm">R$</span>
                      <input
                        type="text"
                        value={changeFor}
                        onChange={(e) => setChangeFor(e.target.value.replace(/[^0-9,.]/g, ''))}
                        placeholder="Ex: 100,00"
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl p-3 pl-10 text-[#F5F0E8] text-sm focus:outline-none focus:border-[#E85D24] transition-colors"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setPaymentMethod("credit_card")}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    paymentMethod === "credit_card"
                      ? "bg-[#E85D24]/10 border-[#E85D24] text-[#E85D24]"
                      : "bg-[#0D0D0D] border-white/5 text-[#8A8480] hover:border-white/10"
                  )}
                >
                  <div className={cn("p-2 rounded-lg", paymentMethod === "credit_card" ? "bg-[#E85D24] text-white" : "bg-white/5 text-[#8A8480]")}>
                    <CreditCard size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Cartão na entrega</div>
                    <div className="text-xs opacity-70">Débito ou Crédito</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between text-[#8A8480]">
                <span>Subtotal</span>
                <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-[#8A8480]">
                <span>Taxa de entrega</span>
                <span className="text-green-500 font-medium">Grátis</span>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-lg font-bold text-[#F5F0E8]">Total</span>
                <span className="text-2xl font-bold text-[#E85D24]">
                  R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-[#8A8480] bg-white/5 p-3 rounded-xl">
                <Clock size={14} className="text-[#E85D24]" />
                <span>Entrega estimada: 40–60 min</span>
              </div>

              <button
                onClick={onSubmitOrder}
                disabled={isLoading || items.length === 0 || !address.trim()}
                className={cn(
                  "w-full h-16 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 shadow-lg",
                  isLoading || items.length === 0 || !address.trim()
                    ? "bg-zinc-800 opacity-50 cursor-not-allowed"
                    : "bg-[#E85D24] hover:bg-[#D15420] shadow-[#E85D24]/10"
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>Fazer pedido</>
                )}
              </button>

              {errorMsg && (
                <p className="text-center text-red-500 text-sm font-bold animate-pulse">
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

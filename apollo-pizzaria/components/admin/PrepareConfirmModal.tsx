import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { OrderWithItems } from '@/types'

interface PrepareConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  order: OrderWithItems | null
}

export function PrepareConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  order
}: PrepareConfirmModalProps) {
  if (!isOpen || !order) return null

  // Extrair apenas as pizzas (avulsas ou filhas de combo)
  const pizzasToPrepare: { name: string; size: string; qty: number }[] = [];
  const allObservations: string[] = [];

  if (order.delivery_instructions) {
    allObservations.push(order.delivery_instructions.trim());
  }

  order.order_items?.forEach((item: any) => {
    const product = item['products!order_items_product_id_fkey'] || item.products;
    const halfProduct = item['products!order_items_half_product_id_fkey'] || item.half_product;

    if (item.observations && item.observations.trim() !== '') {
      allObservations.push(item.observations.trim());
    }

    // Ignorar combos pai, pois as pizzas reais estão como filhas
    if (product?.type === 'combo') return;

    // Ignorar bebidas e outros tipos (só queremos pizzas)
    if (product?.type !== 'pizza') return;


    let pizzaName = product?.name || 'Pizza';
    if (item.is_half && halfProduct?.name) {
      pizzaName = `½ ${pizzaName} / ½ ${halfProduct.name}`;
    }

    const edgeName = item['edge:pizza_options!order_items_edge_option_id_fkey']?.name || item.edge?.name;
    if (edgeName && !edgeName.toLowerCase().includes('tradicional')) {
      pizzaName += ` (Borda ${edgeName})`;
    }

    const size = item.size ? ` ${item.size}` : '';


    pizzasToPrepare.push({
      name: pizzaName,
      size,
      qty: item.quantity
    });
  });



  const uniqueObservations = Array.from(new Set(allObservations)).filter(Boolean);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-100">
            <h2 className="text-xl font-bold text-zinc-900">
              Confirmar preparo — Pedido #{order.display_id || order.id.slice(0, 8)}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <section>
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Itens a Produzir
              </h3>
              <div className="space-y-2">
                {pizzasToPrepare.length > 0 ? (
                  pizzasToPrepare.map((pizza, idx) => (
                    <div key={idx} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                      <p className="text-base font-bold text-zinc-800">
                        Pizza {String(idx + 1).padStart(2, '0')}{pizza.size} - {pizza.name}
                        {pizza.qty > 1 && <span className="ml-2 text-apollo-orange">({pizza.qty}x)</span>}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-500 italic">Nenhuma pizza identificada (pedido apenas de bebidas/outros).</p>
                )}
              </div>
            </section>

            {uniqueObservations.length > 0 && (
              <section className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="text-red-600 shrink-0" size={28} />
                  <h3 className="text-xl font-black text-red-700 uppercase tracking-tight">
                    Atenção (Observações)
                  </h3>
                </div>
                <div className="space-y-3 mt-4">
                  {uniqueObservations.map((obs, idx) => (
                    <p key={idx} className="text-lg font-black text-red-900 uppercase leading-snug break-words">
                      {obs}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-3 text-sm font-bold text-white bg-apollo-orange hover:bg-apollo-orange/90 rounded-xl shadow-lg shadow-apollo-orange/20 transition-all"
            >
              OK, iniciar preparo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

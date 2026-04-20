"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  size: string | null;
  border: string | null;
  half_half: string | null;
  combo_pizzas?: {
    firstFlavorId: string;
    isHalf: boolean;
    secondFlavorId: string | null;
    edgeId: string | null;
  }[];
  combo_beverages?: {
    id: string;
    name: string;
    quantity: number;
  }[];
  quantity: number;
  unit_price: number;
  total_price: number;
  observations: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string, size: string | null, border: string | null, half_half: string | null, combo_pizzas?: CartItem['combo_pizzas'], combo_beverages?: CartItem['combo_beverages']) => void;
  clearCart: () => void;
  updateItem: (oldItemId: string, updatedItem: CartItem) => void;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('apollo_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const valid = Array.isArray(parsed) ? parsed.filter((item: any) =>
          typeof item.name === 'string' &&
          (item.half_half === undefined || item.half_half === null || typeof item.half_half === 'string') &&
          (item.border === undefined || item.border === null || typeof item.border === 'string')
        ) : [];
        setItems(valid);
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
        setItems([]);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('apollo_cart', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addItem = (newItem: CartItem) => {
    setItems(prevItems => {
      // Check if item with same configuration already exists
      const existingItemIndex = prevItems.findIndex(item =>
        item.id === newItem.id &&
        item.size === newItem.size &&
        item.border === newItem.border &&
        item.half_half === newItem.half_half &&
        JSON.stringify(item.combo_pizzas) === JSON.stringify(newItem.combo_pizzas) &&
        JSON.stringify(item.combo_beverages) === JSON.stringify(newItem.combo_beverages)
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];

        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + newItem.quantity,
          total_price: (existingItem.quantity + newItem.quantity) * existingItem.unit_price
        };
        return updatedItems;
      }

      return [...prevItems, newItem];
    });
  };

  const removeItem = (id: string, size: string | null, border: string | null, half_half: string | null, combo_pizzas?: CartItem['combo_pizzas'], combo_beverages?: CartItem['combo_beverages']) => {
    setItems(prevItems => prevItems.filter(item =>
      !(item.id === id && item.size === size && item.border === border && item.half_half === half_half && JSON.stringify(item.combo_pizzas) === JSON.stringify(combo_pizzas) && JSON.stringify(item.combo_beverages) === JSON.stringify(combo_beverages))
    ));
  };


  const updateItem = (oldItemId: string, updatedItem: CartItem) => {
    setItems(prevItems => {
      const index = prevItems.findIndex(i => i.id === oldItemId);
      if (index === -1) return prevItems;
      const newItems = [...prevItems];
      newItems[index] = updatedItem;
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItem, clearCart, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  size: string | null;
  border: string | null;
  half_half: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  observations: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string, size: string | null, border: string | null, half_half: string | null) => void;
  clearCart: () => void;
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
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
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
        item.half_half === newItem.half_half
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

  const removeItem = (id: string, size: string | null, border: string | null, half_half: string | null) => {
    setItems(prevItems => prevItems.filter(item =>
      !(item.id === id && item.size === size && item.border === border && item.half_half === half_half)
    ));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalItems }}>
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

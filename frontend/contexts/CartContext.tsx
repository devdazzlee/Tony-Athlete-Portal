"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

interface CartItem {
  productId: number;
  variantId: number;
  title: string;
  variantTitle: string;
  price: number;
  quantity: number;
  image?: string;
  storeId: string;
  storeName: string;
  currency: string;
  handle: string;
  sku?: string;
  inventoryQuantity?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: number, variantId: number) => void;
  updateQuantity: (productId: number, variantId: number, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  storeId: string | null;
  storeName: string | null;
  currency: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "tc_nutrition_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("USD");

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setItems(parsed.items || []);
        setStoreId(parsed.storeId || null);
        setStoreName(parsed.storeName || null);
        setCurrency(parsed.currency || "USD");
      } catch (error) {
        console.error("Error loading cart:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items, storeId, storeName, currency })
    );
  }, [items, storeId, storeName, currency]);

  const addItem = (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
    // Check if cart has items from a different store
    if (items.length > 0 && items[0].storeId !== item.storeId) {
      toast.error("You can only order from one store at a time. Please clear your cart first.");
      return;
    }

    // Check if item already exists
    const existingItemIndex = items.findIndex(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    );

    if (existingItemIndex !== -1) {
      // Update quantity
      const newItems = [...items];
      newItems[existingItemIndex].quantity += quantity;
      setItems(newItems);
      toast.success(`Updated ${item.title} quantity in cart`);
    } else {
      // Add new item
      setItems([...items, { ...item, quantity }]);
      setStoreId(item.storeId);
      setStoreName(item.storeName);
      setCurrency(item.currency);
      toast.success(`Added ${item.title} to cart`);
    }
  };

  const removeItem = (productId: number, variantId: number) => {
    const item = items.find((i) => i.productId === productId && i.variantId === variantId);
    setItems(items.filter((i) => !(i.productId === productId && i.variantId === variantId)));
    if (item) {
      toast.success(`Removed ${item.title} from cart`);
    }
    
    // Clear store info if cart is empty
    if (items.length === 1) {
      setStoreId(null);
      setStoreName(null);
    }
  };

  const updateQuantity = (productId: number, variantId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }

    const newItems = items.map((item) =>
      item.productId === productId && item.variantId === variantId
        ? { ...item, quantity }
        : item
    );
    setItems(newItems);
  };

  const clearCart = () => {
    setItems([]);
    setStoreId(null);
    setStoreName(null);
    setCurrency("USD");
    toast.success("Cart cleared");
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        storeId,
        storeName,
        currency,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}


import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Cart, CartItem, Product } from '../types';

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: number) => boolean;
  getItemQuantity: (productId: number) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart>(() => {
    // Load cart from localStorage on init
    const savedCart = localStorage.getItem('el_colt_cart');
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
      } catch (e) {
        console.error('Failed to parse saved cart', e);
      }
    }
    return { items: [], total: 0, itemCount: 0 };
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('el_colt_cart', JSON.stringify(cart));
  }, [cart]);

  // Calculate cart totals
  const calculateTotals = (items: CartItem[]): { total: number; itemCount: number } => {
    let total = 0;
    let itemCount = 0;

    items.forEach(item => {
      const price = parseFloat(item.product.sale_price || item.product.price || item.product.regular_price || '0');
      total += price * item.quantity;
      itemCount += item.quantity;
    });

    return { total, itemCount };
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      // Check if product already in cart
      const existingItemIndex = prevCart.items.findIndex(item => item.product.id === product.id);
      
      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        newItems = [...prevCart.items];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity
        };
      } else {
        // Add new item
        newItems = [...prevCart.items, { product, quantity }];
      }

      const { total, itemCount } = calculateTotals(newItems);
      return { items: newItems, total, itemCount };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.product.id !== productId);
      const { total, itemCount } = calculateTotals(newItems);
      return { items: newItems, total, itemCount };
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => {
      const newItems = prevCart.items.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      );
      const { total, itemCount } = calculateTotals(newItems);
      return { items: newItems, total, itemCount };
    });
  };

  const clearCart = () => {
    setCart({ items: [], total: 0, itemCount: 0 });
  };

  const isInCart = (productId: number): boolean => {
    return cart.items.some(item => item.product.id === productId);
  };

  const getItemQuantity = (productId: number): number => {
    const item = cart.items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isInCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};


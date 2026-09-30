import React, { createContext, useContext, useState } from 'react';
import { safeImageUrl } from '../services/supabase';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const openCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };
  const closeCheckout = () => setIsCheckoutOpen(false);

  const addToCart = (product, onToast) => {
    const stock = Number(product.available_quantity) || 0;
    const existing = cart.find((item) => item.productId === product.id);
    const requested = (existing?.quantity || 0) + 1;

    if (requested > stock) {
      if (onToast) onToast(`Only ${stock} ${product.unit || 'kg'} available`);
      return;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: requested } : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          farmName: product.farms?.farm_name || 'Local partner farm',
          unitPrice: Number(product.price),
          unit: product.unit || 'kg',
          imageUrl: safeImageUrl(product.image_url),
          quantity: 1,
          available: stock,
        },
      ]);
    }

    if (onToast) onToast(`${product.name} added to cart`);
  };

  const updateQuantity = (productId, action, onToast) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId);
      if (!item) return prev;

      if (action === 'increase') {
        if (item.quantity >= item.available) {
          if (onToast) onToast(`Only ${item.available} ${item.unit} available`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      if (action === 'decrease') {
        if (item.quantity <= 1) {
          return prev.filter((i) => i.productId !== productId);
        }
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }

      if (action === 'remove') {
        return prev.filter((i) => i.productId !== productId);
      }

      return prev;
    });
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        isCheckoutOpen,
        openCheckout,
        closeCheckout,
        addToCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

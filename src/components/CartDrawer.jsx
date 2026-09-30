import React from 'react';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../services/supabase';

export default function CartDrawer() {
  const {
    cart,
    cartTotal,
    isCartOpen,
    closeCart,
    updateQuantity,
    clearCart,
    openCheckout,
  } = useCart();

  return (
    <>
      <aside
        className={`cart-drawer ${isCartOpen ? 'open' : ''}`}
        id="cart-drawer"
        aria-hidden={!isCartOpen}
      >
        <div className="cart-header">
          <h2>Your cart</h2>
          <button
            id="close-cart"
            className="close-cart"
            type="button"
            onClick={closeCart}
          >
            &times;
          </button>
        </div>
        <p className="cart-note">Fresh harvest reserved for your kitchen.</p>

        <div id="cart-items" className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              Your cart is empty.<br />Add fresh products to get started.
            </div>
          ) : (
            cart.map((item) => (
              <div
                className="cart-item"
                key={item.productId}
                data-product-id={item.productId}
              >
                <div
                  className="cart-item-img"
                  style={{ backgroundImage: `url('${item.imageUrl}')` }}
                />
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {formatMoney(item.unitPrice)} / {item.unit}
                  </p>
                  <div className="quantity">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, 'decrease')}
                    >
                      -
                    </button>
                    <span>
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, 'increase')}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="remove-item"
                      onClick={() => updateQuantity(item.productId, 'remove')}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div>
            <span>Subtotal</span>
            <strong id="cart-total">{formatMoney(cartTotal)}</strong>
          </div>
          <button
            id="checkout-btn"
            className="checkout-btn"
            type="button"
            disabled={cart.length === 0}
            onClick={openCheckout}
          >
            Continue to checkout
          </button>
          <button
            id="clear-cart"
            className="clear-cart"
            type="button"
            onClick={clearCart}
          >
            Clear cart
          </button>
        </div>
      </aside>

      <div
        className={`cart-overlay ${isCartOpen ? 'open' : ''}`}
        id="cart-overlay"
        onClick={closeCart}
      />
    </>
  );
}

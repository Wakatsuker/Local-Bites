import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase, formatMoney } from '../services/supabase';

export default function CheckoutModal({ onOrderPlaced }) {
  const { currentUser, currentProfile, showToast } = useAuth();
  const { cart, cartTotal, isCheckoutOpen, closeCheckout, clearCart } = useCart();

  const [phone, setPhone] = useState(currentProfile?.phone || '');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('route_dispatch');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isCheckoutOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showToast('Please sign in before checking out');
      return;
    }

    if (!phone.trim() || !businessName.trim() || !address.trim()) {
      showToast('Please complete all contact and delivery details');
      return;
    }

    if (cart.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check stock
      const productIds = cart.map((item) => item.productId);
      const { data: dbProducts, error: pErr } = await supabase
        .from('products')
        .select('id, price, unit, available_quantity, farms(seller_id)')
        .in('id', productIds);

      if (pErr) throw pErr;

      for (const item of cart) {
        const prod = dbProducts.find((p) => p.id === item.productId);
        if (!prod || Number(prod.available_quantity) < item.quantity) {
          throw new Error(`${item.name} no longer has enough stock.`);
        }
      }

      // 2. Insert order
      const { data: orderData, error: oErr } = await supabase
        .from('orders')
        .insert({
          buyer_id: currentUser.id,
          contact_name: currentProfile?.full_name || 'Buyer',
          phone: phone.trim(),
          business_name: businessName.trim(),
          delivery_address: address.trim(),
          delivery_method: deliveryMethod,
          payment_method: paymentMethod,
          subtotal: cartTotal,
          total: cartTotal,
        })
        .select('id')
        .single();

      if (oErr) throw oErr;

      // 3. Insert order items
      const orderItems = cart.map((item) => {
        const prod = dbProducts.find((p) => p.id === item.productId);
        return {
          order_id: orderData.id,
          product_id: item.productId,
          seller_id: prod?.farms?.seller_id,
          product_name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        };
      });

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      // 4. Decrement stock
      for (const item of cart) {
        await supabase.rpc('decrement_product_stock', {
          p_product_id: item.productId,
          p_quantity: item.quantity,
        });
      }

      clearCart();
      setIsSuccess(true);
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      showToast(err.message, 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueShopping = () => {
    setIsSuccess(false);
    closeCheckout();
  };

  return (
    <section id="checkout-modal" className="checkout-modal open">
      <div className={`checkout-card ${isSuccess ? 'success' : ''}`}>
        <div className="checkout-heading">
          <div>
            <span className="eyebrow">SECURE CHECKOUT</span>
            <h2>Complete your order</h2>
          </div>
          <button
            id="close-checkout"
            className="close-cart"
            type="button"
            onClick={closeCheckout}
          >
            &times;
          </button>
        </div>

        {!isSuccess ? (
          <form id="checkout-form" onSubmit={handleSubmit}>
            <h3>Contact details</h3>
            <div className="form-grid">
              <label>
                Buyer name
                <input
                  id="checkout-name"
                  name="name"
                  value={currentProfile?.full_name || ''}
                  readOnly
                />
              </label>
              <label>
                Phone number
                <input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="Your contact number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            </div>

            <h3>Delivery address</h3>
            <label>
              Restaurant / business name
              <input
                name="business_name"
                required
                placeholder="Your business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <label>
              Complete address
              <textarea
                name="address"
                required
                rows="2"
                placeholder="Your complete delivery address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <h3>Delivery option</h3>
            <div className="choice-row">
              <label>
                <input
                  type="radio"
                  name="delivery"
                  value="route_dispatch"
                  checked={deliveryMethod === 'route_dispatch'}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                />{' '}
                Route dispatch <small>Today, 2:00 PM · Free</small>
              </label>
              <label>
                <input
                  type="radio"
                  name="delivery"
                  value="farm_pickup"
                  checked={deliveryMethod === 'farm_pickup'}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                />{' '}
                Farm pickup <small>Partner farm pickup</small>
              </label>
            </div>

            <h3>Payment method</h3>
            <div className="choice-row">
              <label>
                <input
                  type="radio"
                  name="payment"
                  value="cash_on_delivery"
                  checked={paymentMethod === 'cash_on_delivery'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />{' '}
                Cash on delivery
              </label>
              <label>
                <input
                  type="radio"
                  name="payment"
                  value="gcash"
                  checked={paymentMethod === 'gcash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />{' '}
                GCash (demo)
              </label>
            </div>

            <div className="checkout-summary">
              <span>Estimated total</span>
              <strong id="checkout-total">{formatMoney(cartTotal)}</strong>
            </div>

            <button className="place-order" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Placing order...' : 'Place order'}
            </button>
          </form>
        ) : (
          <div id="order-success" className="order-success show">
            <span>✓</span>
            <h2>Order placed!</h2>
            <p>Your harvest order has been saved and will appear in your order history.</p>
            <button
              id="continue-shopping"
              className="place-order"
              type="button"
              onClick={handleContinueShopping}
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

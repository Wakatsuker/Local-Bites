import React from 'react';
import { supabase, formatMoney } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function OrdersSection({ orders, onReloadOrders, onClose }) {
  const { showToast } = useAuth();

  const handleClearHistory = async () => {
    if (!window.confirm('Clear your order history from this account?')) return;

    try {
      const { data, error } = await supabase.rpc('clear_buyer_order_history');
      if (error) throw error;

      await onReloadOrders();
      const count = Number(data) || 0;
      showToast(count ? 'Order history cleared' : 'No order history to clear');
    } catch (err) {
      showToast(err.message, 3500);
    }
  };

  return (
    <section id="orders" className="section-wrap orders-section open">
      <div className="section-heading">
        <h2>My Orders</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            id="clear-buyer-history"
            className="clear-history-button"
            type="button"
            onClick={handleClearHistory}
          >
            Clear history
          </button>
          {onClose && (
            <button
              className="close-cart"
              type="button"
              onClick={onClose}
              style={{ fontSize: '1.2rem', padding: '4px 8px' }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div id="orders-list" className="orders-list">
        {orders.length === 0 ? (
          <div className="order-empty">
            No orders yet. Your completed checkout orders will appear here.
          </div>
        ) : (
          orders.map((order) => {
            const items = (order.order_items || [])
              .map(
                (item) =>
                  `${item.product_name} (${item.quantity} ${item.unit || 'kg'})`
              )
              .join(', ');

            return (
              <article className="order-card" key={order.id}>
                <div>
                  <h3>Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                  <p>{new Date(order.created_at).toLocaleString()}</p>
                  <p>{items}</p>
                  <p className="order-total">{formatMoney(order.total)}</p>
                </div>
                <span className="order-status">{order.status}</span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

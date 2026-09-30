import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function SellerOrdersModal({ isOpen, onClose, onOrdersChanged }) {
  const { currentUser, showToast } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(
          'order_id, product_name, quantity, unit, unit_price, orders!inner(id, status, contact_name, created_at)'
        )
        .eq('seller_id', currentUser.id)
        .eq('seller_hidden', false);

      if (error) throw error;

      // Group orders by order_id
      const map = new Map();
      (data || []).forEach((row) => {
        if (!map.has(row.order_id)) {
          map.set(row.order_id, {
            id: row.order_id,
            status: row.orders.status,
            contactName: row.orders.contact_name,
            createdAt: row.orders.created_at,
            items: [],
          });
        }
        map.get(row.order_id).items.push(row);
      });

      const sorted = [...map.values()].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setOrders(sorted);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      showToast(newStatus === 'dispatched' ? 'Order accepted for delivery' : 'Order rejected');
      await loadOrders();
      if (onOrdersChanged) onOrdersChanged();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleClearHistory = async () => {
    if (
      !window.confirm(
        'Clear resolved orders from Incoming Orders? Pending orders will remain.'
      )
    ) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('clear_seller_order_history');
      if (error) throw error;

      await loadOrders();
      if (onOrdersChanged) onOrdersChanged();
      const count = Number(data) || 0;
      showToast(count ? 'Incoming order history cleared' : 'No resolved orders to clear');
    } catch (err) {
      showToast(err.message, 3500);
    }
  };

  return (
    <section className="seller-action-modal open">
      <div className="seller-action-card">
        <button
          className="close-cart seller-orders-close"
          type="button"
          onClick={onClose}
        >
          &times;
        </button>
        <h2>Incoming Orders</h2>

        <div id="seller-order-list">
          {loading ? (
            <p>Loading orders...</p>
          ) : orders.length === 0 ? (
            <div className="order-empty">No orders found.</div>
          ) : (
            orders.map((order) => {
              const isPending = order.status === 'pending';

              return (
                <article
                  className="order-card"
                  key={order.id}
                  data-order-id={order.id}
                >
                  <div>
                    <strong>{order.contactName}</strong>
                    <p>{new Date(order.createdAt).toLocaleString()}</p>
                    <p>
                      {order.items.map((item, idx) => (
                        <span key={idx}>
                          {item.product_name} &mdash; {item.quantity}{' '}
                          {item.unit || 'kg'}
                          {idx < order.items.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  </div>
                  <span className="order-status">{order.status}</span>

                  {isPending && (
                    <div className="order-actions">
                      <button
                        className="approve-order"
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'dispatched')}
                      >
                        Accept
                      </button>
                      <button
                        className="reject-order"
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        <button
          id="clear-seller-history"
          className="clear-history-button"
          type="button"
          onClick={handleClearHistory}
        >
          Clear history
        </button>
      </div>
    </section>
  );
}

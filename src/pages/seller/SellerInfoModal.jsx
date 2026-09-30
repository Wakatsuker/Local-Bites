import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export default function SellerInfoModal({ isOpen, onClose, type }) {
  const { currentUser, showToast } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && type === 'deliveries' && currentUser) {
      setLoading(true);
      supabase
        .from('order_items')
        .select(
          'order_id, product_name, quantity, unit, orders!inner(id, status, contact_name, created_at)'
        )
        .eq('seller_id', currentUser.id)
        .then(({ data, error }) => {
          setLoading(false);
          if (error) {
            showToast(error.message);
            return;
          }

          const map = new Map();
          (data || []).forEach((row) => {
            if (row.orders.status === 'dispatched') {
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
            }
          });

          setDeliveries([...map.values()]);
        });
    }
  }, [isOpen, type, currentUser]);

  if (!isOpen) return null;

  return (
    <section className="seller-action-modal open">
      <div className="seller-action-card">
        <button
          className="close-cart seller-info-close"
          type="button"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 id="seller-info-title">
          {type === 'deliveries' ? 'Deliveries' : 'Messages'}
        </h2>

        <div id="seller-info-content">
          {type === 'deliveries' ? (
            loading ? (
              <p>Loading deliveries...</p>
            ) : deliveries.length === 0 ? (
              <div className="order-empty">No active deliveries currently out.</div>
            ) : (
              deliveries.map((order) => (
                <article className="order-card" key={order.id}>
                  <div>
                    <strong>{order.contactName}</strong>
                    <p>{new Date(order.createdAt).toLocaleString()}</p>
                    <p>
                      {order.items.map((item, idx) => (
                        <span key={idx}>
                          {item.product_name} ({item.quantity} {item.unit || 'kg'})
                          {idx < order.items.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  </div>
                  <span className="order-status">{order.status}</span>
                </article>
              ))
            )
          ) : (
            <div className="order-empty">
              Messaging will be available in a future update.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

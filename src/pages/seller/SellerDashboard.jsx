import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import SellerProductsModal from './SellerProductsModal';
import SellerOrdersModal from './SellerOrdersModal';
import SellerInfoModal from './SellerInfoModal';

export default function SellerDashboard() {
  const {
    currentUser,
    currentProfile,
    currentFarm,
    setSelectedRole,
    logout,
    openProfile,
  } = useAuth();

  // Modals state
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoModalType, setInfoModalType] = useState('deliveries');

  // Pending orders badge count
  const [pendingCount, setPendingCount] = useState(0);

  const displayName = currentProfile?.full_name || 'Juan';
  const farmDisplayName = currentFarm?.farm_name || 'Digos Sungrown Farm';

  const checkPendingOrders = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('order_items')
      .select('order_id, orders!inner(id, status)')
      .eq('seller_id', currentUser.id)
      .eq('seller_hidden', false);

    if (data) {
      const map = new Map();
      data.forEach((row) => map.set(row.order_id, row.orders.status));
      const pending = [...map.values()].filter((s) => s === 'pending').length;
      setPendingCount(pending);
    }
  };

  useEffect(() => {
    checkPendingOrders();
    const interval = setInterval(checkPendingOrders, 20000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleOpenProducts = (addForm) => {
    setShowAddForm(addForm);
    setProductsModalOpen(true);
  };

  const handleOpenInfo = (type) => {
    setInfoModalType(type);
    setInfoModalOpen(true);
  };

  return (
    <section id="seller-app" className="seller-app" style={{ display: 'block' }}>
      <header className="seller-top">
        <button
          className="back-role"
          type="button"
          onClick={() => setSelectedRole(null)}
          title="Back to portal select"
        >
          &larr;
        </button>

        <a className="brand" href="#seller">
          <span className="brand-mark">L</span>
          <span>
            <strong>LocalBites</strong>
            <small>FARMER CO-OP</small>
          </span>
        </a>

        <div>
          <strong>{displayName}</strong>
          <small>Farmer Portal</small>
        </div>

        <button
          className="icon-button profile-open"
          type="button"
          aria-label="View profile"
          onClick={openProfile}
        >
          <span className="profile-avatar">&#9679;</span>
          <span className="profile-copy">
            <strong>{displayName}</strong>
            <small>View Profile</small>
          </span>
          <span className="profile-arrow">&rsaquo;</span>
        </button>

        <button
          className="icon-button logout-btn"
          aria-label="Logout"
          type="button"
          onClick={logout}
        >
          ↪
        </button>
      </header>

      <main className="seller-main">
        <div className="eyebrow">● {farmDisplayName}</div>
        <h1>Good morning, {displayName}!</h1>
        <p className="lede">Let's share your harvest today.</p>

        <button
          className="add-product"
          type="button"
          onClick={() => handleOpenProducts(true)}
        >
          + &nbsp; Add Product
        </button>

        <div className="seller-links">
          <button type="button" onClick={() => handleOpenProducts(false)}>
            ▣ <strong>My Products</strong>
            <b>&rsaquo;</b>
          </button>

          <button type="button" onClick={() => setOrdersModalOpen(true)}>
            ▤ <strong>Incoming Orders</strong>
            {pendingCount > 0 && (
              <em className="pending-badge" style={{ display: 'inline-block' }}>
                {pendingCount}
              </em>
            )}
            <b>&rsaquo;</b>
          </button>

          <button type="button" onClick={() => handleOpenInfo('deliveries')}>
            ▰ <strong>Deliveries</strong>
            <b>&rsaquo;</b>
          </button>

          <button type="button" onClick={() => handleOpenInfo('messages')}>
            ▤ <strong>Messages</strong>
            <b>&rsaquo;</b>
          </button>
        </div>

        <div className="seller-promo">
          <small>LOCAL COOPERATIVE</small>
          <h2>
            Fresh Harvest,
            <br />
            Brighter
            <br />
            Tomorrows
          </h2>
          <p>Direct from your soil to local tables across the city.</p>
          <span>🌱</span>
        </div>

        <div className="seller-stats">
          <div>
            Dispatched Today
            <strong>
              42 <small>kg</small>
            </strong>
          </div>
          <div>
            Gross Earnings<strong>PHP 2,850</strong>
          </div>
        </div>
      </main>

      {/* Seller Modals */}
      <SellerProductsModal
        isOpen={productsModalOpen}
        onClose={() => setProductsModalOpen(false)}
        initialShowForm={showAddForm}
      />

      <SellerOrdersModal
        isOpen={ordersModalOpen}
        onClose={() => setOrdersModalOpen(false)}
        onOrdersChanged={checkPendingOrders}
      />

      <SellerInfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        type={infoModalType}
      />
    </section>
  );
}

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { currentProfile, logout, openProfile } = useAuth();
  const { cartCount, toggleCart } = useCart();

  const displayName = currentProfile?.full_name || 'Guest User';

  return (
    <header className="topbar">
      <a className="brand" href="#home" onClick={() => setActiveTab('home')}>
        <span className="brand-mark">⌁</span>
        <span>
          <strong>LocalBites</strong>
          <small>FARMER CO-OP</small>
        </span>
      </a>
      <div className="role-pill">BUYER</div>
      <p className="tagline">RESTAURANT &amp; BUYER CO-OP</p>
      
      <nav className="desktop-nav">
        <a
          href="#home"
          className={activeTab === 'home' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('home');
          }}
        >
          Home
        </a>
        <a
          href="#browse"
          className={activeTab === 'browse' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('browse');
            document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Browse
        </a>
        <a
          href="#orders"
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('orders');
          }}
        >
          Orders
        </a>
        <a
          href="#about"
          className={activeTab === 'about' ? 'active' : ''}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('about');
          }}
        >
          About
        </a>
      </nav>

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
        className="icon-button cart-button"
        id="open-cart"
        aria-label="Cart"
        onClick={toggleCart}
      >
        🛒<b id="cart-count">{cartCount}</b>
      </button>

      <button
        className="icon-button logout-btn"
        aria-label="Logout"
        onClick={logout}
      >
        ↪
      </button>
    </header>
  );
}

import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function RoleSelectPage() {
  const { openAuth } = useAuth();

  return (
    <section id="role-screen" className="role-screen">
      <div className="role-card">
        <a className="brand role-brand" href="#role">
          <span className="brand-mark">L</span>
          <span>
            <strong>LocalBites</strong>
            <small>FARMER CO-OP</small>
          </span>
        </a>
        <span className="role-kicker">WELCOME TO THE CO-OP</span>
        <h1>How will you use LocalBites?</h1>
        <p>Choose a portal, then sign in or create a sample account.</p>
        
        <div className="role-options">
          <button type="button" onClick={() => openAuth('buyer')}>
            <span>🛒</span>
            <strong>I'm a Buyer</strong>
            <small>Browse fresh harvests and place orders</small>
            <b>Continue &rarr;</b>
          </button>
          
          <button type="button" onClick={() => openAuth('seller')}>
            <span>🌱</span>
            <strong>I'm a Seller</strong>
            <small>Manage your farm and products</small>
            <b>Continue &rarr;</b>
          </button>
        </div>

        <small className="prototype-note">Supabase-backed prototype</small>
      </div>
    </section>
  );
}

import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import RoleSelectPage from './pages/RoleSelectPage';
import BuyerHome from './pages/buyer/BuyerHome';
import SellerDashboard from './pages/seller/SellerDashboard';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import Toast from './components/Toast';

export default function App() {
  const { selectedRole, darkMode, toggleTheme } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  return (
    <>
      {/* 1. Portal Views */}
      {!selectedRole ? (
        <RoleSelectPage />
      ) : selectedRole === 'buyer' ? (
        <div className="app-shell" id="buyer-app" style={{ display: 'block' }}>
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
          <BuyerHome activeTab={activeTab} setActiveTab={setActiveTab} />
          <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
          <CartDrawer />
          <CheckoutModal />
        </div>
      ) : (
        <SellerDashboard />
      )}

      {/* 2. Global Modals and Controls */}
      <AuthModal />
      <ProfileModal />
      <Toast />

      {/* Floating Dark Mode Toggle */}
      <button
        className="theme-toggle"
        type="button"
        aria-label="Toggle dark mode"
        onClick={toggleTheme}
      >
        {darkMode ? '\u2600' : '\u263E'}
      </button>
    </>
  );
}

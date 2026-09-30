import React from 'react';

export default function MobileNav({ activeTab, setActiveTab }) {
  return (
    <nav className="mobile-nav">
      <a
        className={activeTab === 'home' ? 'active' : ''}
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('home');
        }}
      >
        ⌂<span>Home</span>
      </a>
      <a
        className={activeTab === 'browse' ? 'active' : ''}
        href="#browse"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('browse');
          document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        ▣<span>Browse</span>
      </a>
      <a
        className={activeTab === 'orders' ? 'active' : ''}
        href="#orders"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('orders');
        }}
      >
        ▤<span>Orders</span>
      </a>
      <a
        className={activeTab === 'about' ? 'active' : ''}
        href="#about"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('about');
        }}
      >
        ☰<span>More</span>
      </a>
    </nav>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabase } from '../../services/supabase';
import ProductGrid from './ProductGrid';
import OrdersSection from './OrdersSection';

const CATEGORIES = [
  { label: 'Vegetables', icon: '🥬', count: '34 items' },
  { label: 'Fruits', icon: '🍊', count: '18 items' },
  { label: 'Herbs', icon: '🌿', count: '12 items' },
  { label: 'Dairy & Eggs', icon: '🥚', count: '9 items' },
  { label: 'Meat & Seafood', icon: '🥩', count: '15 items' },
  { label: 'All Items', icon: '⊞', count: 'All available' },
];

export default function BuyerHome({ activeTab, setActiveTab }) {
  const { currentUser, currentProfile, showToast } = useAuth();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [showOrders, setShowOrders] = useState(false);

  const displayName = currentProfile?.full_name || 'Chef Maria';

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, price, unit, available_quantity, image_url, farms(farm_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
  };

  const loadOrders = async () => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, created_at, order_items(product_name, quantity, unit, unit_price)')
      .eq('buyer_id', currentUser.id)
      .eq('buyer_hidden', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
  };

  useEffect(() => {
    loadProducts();
    if (currentUser) {
      loadOrders();
    }

    // Realtime subscription for products
    const channel = supabase
      .channel('react-buyer-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'orders') {
      setShowOrders(true);
      loadOrders();
    }
  }, [activeTab]);

  return (
    <main>
      <section id="home" className="hero section-wrap">
        <div className="eyebrow">● {displayName} • Green Leaf Bistro</div>
        <h1>Good morning, {displayName}!</h1>
        <p className="lede">
          Fresh and local harvest directly from partner farms in Digos City.
        </p>
        
        <div className="search-row">
          <label>
            ⌕
            <input
              id="search-input"
              placeholder="Search fresh vegetables, fruits, herbs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button className="filter-btn" type="button">
            ☷
          </button>
        </div>

        <div className="dispatch">
          <span>▰</span>
          <strong>ROUTE DISPATCH</strong>
          <b>• 2:00 PM today</b>
          <small>8 farms currently harvesting for this cycle</small>
          <i>›</i>
        </div>
      </section>

      <section className="promo section-wrap">
        <span>◒ Direct Harvest Hub</span>
        <h2>Support Local, Serve Fresh</h2>
        <p>
          Direct from coop growers like Juan &amp; Elena with zero middleman markup,
          straight to your kitchen prep table.
        </p>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('All Items');
            document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Explore Digos Coop Batch &rarr;
        </button>
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <h2>Categories</h2>
          <a
            href="#browse"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            View catalog
          </a>
        </div>
        <div className="categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              type="button"
              className={selectedCategory === cat.label ? 'selected' : ''}
              onClick={() => {
                setSelectedCategory(cat.label);
                document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {cat.icon}
              <strong>{cat.label}</strong>
              <small>{cat.count}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section-wrap spotlight">
        <div className="section-heading">
          <h2>✪ Farmer Spotlight</h2>
          <a href="#about">Digos Valley</a>
        </div>
        <article className="farmer-card">
          <div className="farmer-avatar">👨🏽‍🌾</div>
          <div>
            <h3>Juan's Sungrown Farm</h3>
            <span className="verified">Verified Organic</span>
            <p>Tomatoes &amp; Crisp Butterhead Lettuce freshly picked this morning at 6:00 AM.</p>
          </div>
          <div className="lot">
            <small>CURRENT LOT AVAILABLE</small>
            <strong>45 kg Roma • 25 kg Butterhead</strong>
            <button
              className="order-btn"
              type="button"
              onClick={() => {
                document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              🛒 Order
            </button>
          </div>
        </article>
      </section>

      {showOrders && (
        <OrdersSection
          orders={orders}
          onReloadOrders={loadOrders}
          onClose={() => {
            setShowOrders(false);
            setActiveTab('home');
          }}
        />
      )}

      <section id="browse" className="section-wrap products">
        <div className="section-heading">
          <h2>Fresh Out of Field</h2>
          <a href="#browse">Updated freshly</a>
        </div>
        <ProductGrid
          products={products}
          search={search}
          category={selectedCategory}
          onAddToCart={(product) => addToCart(product, showToast)}
        />
      </section>
    </main>
  );
}

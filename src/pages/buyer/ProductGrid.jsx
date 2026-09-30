import React from 'react';
import { safeImageUrl, formatMoney } from '../../services/supabase';

export default function ProductGrid({ products, search, category, onAddToCart }) {
  const query = search.toLowerCase();

  const filtered = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.category} ${product.farms?.farm_name || ''}`
      .toLowerCase()
      .includes(query);
    const matchesCategory =
      category === 'All Items' || product.category === category;
    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    return (
      <div id="product-grid">
        <div className="order-empty">No matching products are available.</div>
      </div>
    );
  }

  return (
    <div id="product-grid">
      {filtered.map((product) => {
        const stock = Number(product.available_quantity) || 0;
        const unit = product.unit || 'kg';
        const isSoldOut = stock <= 0;

        return (
          <article
            className="product"
            key={product.id}
            data-product-id={product.id}
          >
            <div
              className="product-img"
              style={{ backgroundImage: `url('${safeImageUrl(product.image_url)}')` }}
            />
            <div>
              <h3>{product.name}</h3>
              <p>{product.farms?.farm_name || 'Local partner farm'}</p>
              <div className="price">
                {formatMoney(product.price)} <small>/ {unit}</small>
                <button
                  className="add"
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => onAddToCart(product)}
                >
                  +
                </button>
              </div>
              <span className={`stock-badge ${isSoldOut ? 'sold' : ''}`}>
                {isSoldOut ? 'SOLD OUT' : `${stock} ${unit} available`}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

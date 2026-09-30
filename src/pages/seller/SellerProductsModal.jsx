import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  supabase,
  safeImageUrl,
  formatMoney,
  PRODUCT_IMAGE_BUCKET,
} from '../../services/supabase';

export default function SellerProductsModal({ isOpen, onClose, initialShowForm = false }) {
  const { currentFarm, showToast } = useAuth();

  const [showForm, setShowForm] = useState(initialShowForm);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    setShowForm(initialShowForm);
  }, [initialShowForm]);

  const loadProducts = async () => {
    if (!currentFarm) return;

    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, unit, available_quantity, image_url')
      .eq('farm_id', currentFarm.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(error.message);
      setIsError(true);
    } else {
      setProducts(data || []);
      setStatus(`${data?.length || 0} product${data?.length === 1 ? '' : 's'} in your catalog`);
      setIsError(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen, currentFarm]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setStatus('Enter a product name, not spaces only.');
      setIsError(true);
      return;
    }

    const availableQuantity = Number(quantity);
    if (!Number.isInteger(availableQuantity) || availableQuantity < 0) {
      setStatus('Available quantity must be a whole number (no decimals).');
      setIsError(true);
      return;
    }

    if (!currentFarm) {
      setStatus('No farm is connected to this account.');
      setIsError(true);
      return;
    }

    setSaving(true);
    setStatus('Saving product...');
    setIsError(false);

    try {
      let imageUrl = null;

      if (imageFile) {
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const storagePath = `${currentFarm.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(storagePath, imageFile);

        if (uploadError) throw uploadError;

        imageUrl = supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .getPublicUrl(storagePath).data.publicUrl;
      }

      const { error: insertError } = await supabase.from('products').insert({
        farm_id: currentFarm.id,
        name: name.trim().replace(/\s+/g, ' '),
        category,
        price: Number(price),
        unit,
        available_quantity: availableQuantity,
        description: description.trim(),
        image_url: imageUrl,
      });

      if (insertError) throw insertError;

      // Reset
      setName('');
      setPrice('');
      setQuantity('');
      setDescription('');
      setImageFile(null);
      setStatus('Product saved successfully.');
      setIsError(false);
      showToast('Product added to your farm catalog');
      await loadProducts();
    } catch (err) {
      setStatus(err.message || 'Error saving product.');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Remove this product from your catalog?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('farm_id', currentFarm.id);

      if (error) throw error;
      showToast('Product removed');
      await loadProducts();
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <section className="seller-products-modal open">
      <div className="seller-products-card">
        <div className="seller-products-head">
          <h2 id="seller-products-title">
            {showForm ? 'Add product' : 'My Products'}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="checkout-btn"
              type="button"
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'View catalog' : '+ Add new'}
            </button>
            <button
              className="close-cart seller-products-close"
              type="button"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
        </div>

        <p className={`seller-db-status ${isError ? 'error' : ''}`}>
          {status}
        </p>

        {showForm && (
          <form
            className="seller-form"
            id="seller-product-form"
            onSubmit={handleSubmit}
          >
            <div className="seller-form-grid">
              <label>
                Product name
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="e.g. Roma Tomatoes"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>Vegetables</option>
                  <option>Fruits</option>
                  <option>Herbs</option>
                  <option>Dairy &amp; Eggs</option>
                  <option>Meat &amp; Seafood</option>
                </select>
              </label>

              <label>
                Price
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="65"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>

              <label>
                Unit
                <select
                  name="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="item">Item</option>
                </select>
              </label>

              <label>
                Available quantity
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
            </div>

            <label>
              Product description
              <textarea
                name="description"
                rows="3"
                placeholder="Describe freshness, harvest time, or packaging"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <label>
              Product image
              <input
                name="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0] || null)}
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save product'}
            </button>
          </form>
        )}

        <div className="seller-db-list" id="seller-db-list">
          {products.map((prod) => (
            <article
              className="seller-db-product"
              key={prod.id}
              data-product-id={prod.id}
            >
              <img src={safeImageUrl(prod.image_url)} alt={prod.name} />
              <div>
                <strong>{prod.name}</strong>
                <small>
                  {formatMoney(prod.price)} / {prod.unit} &middot;{' '}
                  {prod.available_quantity} {prod.unit} available
                </small>
              </div>
              <button
                type="button"
                className="delete-product"
                onClick={() => handleDelete(prod.id)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

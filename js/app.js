(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Configuration and application state
  // ---------------------------------------------------------------------------

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const PRODUCT_IMAGE_BUCKET = "product-images";
  const EMPTY_IMAGE =
    "https://placehold.co/500x500/e8f5eb/056532?text=Fresh+Produce";

  const state = {
    selectedRole: "buyer",
    currentUser: null,
    currentProfile: null,
    currentFarm: null,
    products: [],
    cart: [],
    search: "",
    category: "All Items",
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [
    ...parent.querySelectorAll(selector),
  ];

  const dom = {
    roleScreen: $("#role-screen"),
    buyerApp: $("#buyer-app"),
    sellerApp: $("#seller-app"),
    productGrid: $("#product-grid"),
    searchInput: $("#search-input"),
    toast: $("#toast"),
    cartDrawer: $("#cart-drawer"),
    cartOverlay: $("#cart-overlay"),
    cartItems: $("#cart-items"),
    cartCount: $("#cart-count"),
    cartTotal: $("#cart-total"),
    checkoutModal: $("#checkout-modal"),
    checkoutCard: $(".checkout-card"),
    checkoutForm: $("#checkout-form"),
    checkoutTotal: $("#checkout-total"),
    orderSuccess: $("#order-success"),
    ordersSection: $("#orders"),
    ordersList: $("#orders-list"),
  };

  // ---------------------------------------------------------------------------
  // General UI helpers
  // ---------------------------------------------------------------------------

  function escapeHtml(value = "") {
    return String(value).replace(
      /[&<>'"]/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[character],
    );
  }

  function safeImageUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : EMPTY_IMAGE;
    } catch {
      return EMPTY_IMAGE;
    }
  }

  function formatMoney(value) {
    return `PHP ${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  let toastTimer;

  function showToast(message, duration = 2200) {
    window.clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add("show");
    toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("show");
    }, duration);
  }

  function openModal(element) {
    element?.classList.add("open");
  }

  function closeModal(element) {
    element?.classList.remove("open");
  }

  function setPortal(role = null) {
    dom.roleScreen.style.display = role ? "none" : "grid";
    dom.buyerApp.style.display = role === "buyer" ? "block" : "none";
    dom.sellerApp.style.display = role === "seller" ? "block" : "none";
  }

  function createCloseButton(id, onClick) {
    const button = document.createElement("button");
    button.id = id;
    button.className = "close-cart";
    button.type = "button";
    button.innerHTML = "&times;";
    button.addEventListener("click", onClick);
    return button;
  }

  // ---------------------------------------------------------------------------
  // Generated dialogs and controls
  // ---------------------------------------------------------------------------

  const authModal = document.createElement("section");
  authModal.className = "auth-modal";
  authModal.innerHTML = `
    <div class="auth-card">
      <div class="auth-head">
        <div>
          <span class="auth-role" id="auth-role">Buyer</span>
          <h2 id="auth-title">Sign in to LocalBites</h2>
        </div>
        <button class="close-cart" id="auth-close" type="button">&times;</button>
      </div>
      <p>Use your LocalBites sample account.</p>
      <form class="auth-form" id="auth-form">
        <label>Email
          <input id="auth-email" type="email" required placeholder="you@example.com">
        </label>
        <label>Password
          <input id="auth-password" type="password" required minlength="6" placeholder="At least 6 characters">
        </label>
        <div class="auth-status" id="auth-status"></div>
        <button type="submit" id="auth-submit">Sign in</button>
        <button type="button" class="auth-switch" id="auth-switch">Create a sample account</button>
      </form>
    </div>`;
  document.body.appendChild(authModal);

  const profileModal = document.createElement("section");
  profileModal.className = "profile-modal";
  profileModal.innerHTML = `
    <div class="profile-card">
      <div class="checkout-heading">
        <h2>Edit profile</h2>
        <button class="close-cart profile-close" type="button">&times;</button>
      </div>
      <form class="profile-form" id="profile-form">
        <label>Display name<input name="full_name" required></label>
        <label>Phone number<input name="phone"></label>
        <label>Account type<input name="role" readonly></label>
        <div id="farm-fields">
          <label>Farm name<input name="farm_name"></label>
          <label>Farm location<input name="location"></label>
        </div>
        <div class="profile-message" id="profile-message"></div>
        <button type="submit">Save profile</button>
        <button type="button" class="profile-logout clear-cart">Log out</button>
      </form>
    </div>`;
  document.body.appendChild(profileModal);

  const sellerProductsModal = document.createElement("section");
  sellerProductsModal.className = "seller-products-modal";
  sellerProductsModal.innerHTML = `
    <div class="seller-products-card">
      <div class="seller-products-head">
        <h2 id="seller-products-title">Manage products</h2>
        <button class="close-cart seller-products-close" type="button">&times;</button>
      </div>
      <p class="seller-db-status" id="seller-db-status"></p>
      <form class="seller-form" id="seller-product-form">
        <div class="seller-form-grid">
          <label>Product name
            <input name="name" required maxlength="100" placeholder="e.g. Roma Tomatoes">
          </label>
          <label>Category
            <select name="category">
              <option>Vegetables</option>
              <option>Fruits</option>
              <option>Herbs</option>
              <option>Dairy &amp; Eggs</option>
              <option>Meat &amp; Seafood</option>
            </select>
          </label>
          <label>Price
            <input name="price" type="number" min="0" step="0.01" required placeholder="65">
          </label>
          <label>Unit
            <select name="unit">
              <option value="kg">Kilogram (kg)</option>
              <option value="item">Item</option>
            </select>
          </label>
          <label>Available quantity
            <input name="quantity" type="number" min="0" step="1" inputmode="numeric" required placeholder="50">
          </label>
        </div>
        <label>Product description
          <textarea name="description" rows="3" placeholder="Describe freshness, harvest time, or packaging"></textarea>
        </label>
        <label>Product image<input name="image" type="file" accept="image/*"></label>
        <button type="submit">Save product</button>
      </form>
      <div class="seller-db-list" id="seller-db-list"></div>
    </div>`;
  document.body.appendChild(sellerProductsModal);

  const sellerOrdersModal = document.createElement("section");
  sellerOrdersModal.className = "seller-action-modal";
  sellerOrdersModal.innerHTML = `
    <div class="seller-action-card">
      <button class="close-cart seller-orders-close" type="button">&times;</button>
      <h2>Incoming Orders</h2>
      <div id="seller-order-list">Loading orders...</div>
      <button id="clear-seller-history" class="clear-history-button" type="button">Clear history</button>
    </div>`;
  document.body.appendChild(sellerOrdersModal);

  const sellerInfoModal = document.createElement("section");
  sellerInfoModal.className = "seller-action-modal";
  sellerInfoModal.innerHTML = `
    <div class="seller-action-card">
      <button class="close-cart seller-info-close" type="button">&times;</button>
      <h2 id="seller-info-title"></h2>
      <div id="seller-info-content"></div>
    </div>`;
  document.body.appendChild(sellerInfoModal);

  const themeButton = document.createElement("button");
  themeButton.className = "theme-toggle";
  themeButton.type = "button";
  themeButton.setAttribute("aria-label", "Toggle dark mode");
  document.body.appendChild(themeButton);

  if (!$("#close-orders")) {
    $("#orders .section-heading")?.appendChild(
      createCloseButton("close-orders", () => closeModal(dom.ordersSection)),
    );
  }

  function createProfilePills() {
    $$(".topbar, .seller-top").forEach((header) => {
      const button = document.createElement("button");
      button.className = "icon-button profile-open";
      button.type = "button";
      button.setAttribute("aria-label", "View profile");
      button.innerHTML = `
        <span class="profile-avatar">&#9679;</span>
        <span class="profile-copy"><strong>Guest User</strong><small>View Profile</small></span>
        <span class="profile-arrow">&rsaquo;</span>`;
      button.addEventListener("click", openProfileEditor);

      const logoutButton = $(".logout-btn", header);
      header.insertBefore(button, logoutButton || null);
    });
  }

  // ---------------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------------

  function setTheme(darkMode) {
    document.body.classList.toggle("dark-mode", darkMode);
    themeButton.textContent = darkMode ? "\u2600" : "\u263E";
    localStorage.setItem("localbites-dark", darkMode ? "1" : "0");
  }

  // ---------------------------------------------------------------------------
  // Authentication and portal routing
  // ---------------------------------------------------------------------------

  let signUpMode = false;

  function clearAuthForm() {
    $("#auth-form").reset();
    $("#auth-status").textContent = "";
  }

  function openAuth(role) {
    state.selectedRole = role;
    signUpMode = false;
    clearAuthForm();
    $("#auth-role").textContent = role === "seller" ? "Seller" : "Buyer";
    $("#auth-title").textContent = "Sign in to LocalBites";
    $("#auth-submit").textContent = "Sign in";
    $("#auth-switch").textContent = "Create a sample account";
    dom.roleScreen.style.display = "none";
    openModal(authModal);
  }

  function toggleAuthMode() {
    signUpMode = !signUpMode;
    $("#auth-status").textContent = "";
    $("#auth-title").textContent = signUpMode
      ? "Create your sample account"
      : "Sign in to LocalBites";
    $("#auth-submit").textContent = signUpMode ? "Create account" : "Sign in";
    $("#auth-switch").textContent = signUpMode
      ? "I already have an account"
      : "Create a sample account";
  }

  async function ensureProfile(user, role) {
    const existing = await db
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data) return existing.data;

    const fullName = user.email?.split("@")[0] || "LocalBites User";
    const created = await db
      .from("profiles")
      .insert({ id: user.id, full_name: fullName, role })
      .select("id, full_name, phone, role")
      .single();

    if (created.error) throw created.error;
    return created.data;
  }

  async function ensureSellerFarm(user, profile) {
    const existing = await db
      .from("farms")
      .select("id, farm_name, location")
      .eq("seller_id", user.id)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data) return existing.data;

    const created = await db
      .from("farms")
      .insert({
        seller_id: user.id,
        farm_name: `${profile.full_name}'s Farm`,
        location: "Digos Valley",
      })
      .select("id, farm_name, location")
      .single();

    if (created.error) throw created.error;
    return created.data;
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    const status = $("#auth-status");
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    status.textContent = "Connecting to Supabase...";

    const response = signUpMode
      ? await db.auth.signUp({ email, password })
      : await db.auth.signInWithPassword({ email, password });

    if (response.error) {
      status.textContent = response.error.message;
      return;
    }

    if (!response.data.session) {
      status.textContent = "Account created. Confirm your email, then sign in.";
      return;
    }

    try {
      const profile = await ensureProfile(response.data.user, state.selectedRole);

      state.currentUser = response.data.user;
      state.currentProfile = profile;
      state.currentFarm =
        state.selectedRole === "seller" || profile.role === "seller"
          ? await ensureSellerFarm(response.data.user, profile)
          : null;
      SUPABASE_FARM_ID = state.currentFarm?.id || "";

      closeModal(authModal);
      setPortal(state.selectedRole);
      await updateProfileDisplay();

      if (state.selectedRole === "buyer") {
        await Promise.all([loadBuyerProducts(), loadBuyerOrders()]);
      } else {
        await refreshPendingBadge();
      }
    } catch (error) {
      status.textContent = error.message;
    }
  }

  async function logout() {
    await db.auth.signOut();
    state.currentUser = null;
    state.currentProfile = null;
    state.currentFarm = null;
    state.cart = [];
    SUPABASE_FARM_ID = "";

    renderCart();
    clearAuthForm();
    closeAllModals();
    setPortal();
  }

  function closeAllModals() {
    [
      authModal,
      profileModal,
      sellerProductsModal,
      sellerOrdersModal,
      sellerInfoModal,
      dom.checkoutModal,
      dom.ordersSection,
    ].forEach(closeModal);
    toggleCart(false);
  }

  // ---------------------------------------------------------------------------
  // Dynamic profiles
  // ---------------------------------------------------------------------------

  async function updateProfileDisplay() {
    if (!state.currentUser) return;

    const profileResult = await db
      .from("profiles")
      .select("full_name, phone, role")
      .eq("id", state.currentUser.id)
      .single();

    if (profileResult.error) return;
    state.currentProfile = profileResult.data;

    const name = state.currentProfile.full_name;
    const buyerHeading = $("#buyer-app .hero h1");
    const buyerBadge = $("#buyer-app .hero .eyebrow");
    const sellerHeading = $("#seller-app .seller-main h1");
    const sellerPortal = $("#seller-app .seller-top > div");

    if (buyerHeading) buyerHeading.textContent = `Good morning, ${name}!`;
    if (buyerBadge) buyerBadge.textContent = `\u25CF ${name} \u2022 Green Leaf Bistro`;
    if (sellerHeading) sellerHeading.textContent = `Good morning, ${name}!`;

    if (sellerPortal) {
      sellerPortal.innerHTML = `<strong>${escapeHtml(name)}</strong><small>Farmer Portal</small>`;
    }

    $$(".profile-copy strong").forEach((element) => {
      element.textContent = name;
    });

    if (
      state.selectedRole === "seller" ||
      state.currentProfile.role === "seller"
    ) {
      const farmResult = await db
        .from("farms")
        .select("id, farm_name, location")
        .eq("seller_id", state.currentUser.id)
        .single();

      if (!farmResult.error) {
        state.currentFarm = farmResult.data;
        SUPABASE_FARM_ID = state.currentFarm.id;
        const farmBadge = $("#seller-app .seller-main .eyebrow");
        if (farmBadge) farmBadge.textContent = `\u25CF ${state.currentFarm.farm_name}`;
      }
    }
  }

  async function openProfileEditor() {
    if (!state.currentUser) return;

    await updateProfileDisplay();
    const form = $("#profile-form");
    form.elements.full_name.value = state.currentProfile?.full_name || "";
    form.elements.phone.value = state.currentProfile?.phone || "";
    const accountRole =
      state.currentProfile?.role === "seller" ? "Seller" : "Buyer";
    const portalRole = state.selectedRole === "seller" ? "Seller" : "Buyer";
    form.elements.role.value = `${accountRole} account \u2022 ${portalRole} portal`;

    const sellerFields = $("#farm-fields");
    sellerFields.style.display = state.currentFarm ? "grid" : "none";

    form.elements.farm_name.value = state.currentFarm?.farm_name || "";
    form.elements.location.value = state.currentFarm?.location || "";
    $("#profile-message").textContent = "";
    openModal(profileModal);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = $("#profile-message");

    const profileResult = await db
      .from("profiles")
      .update({
        full_name: form.get("full_name").trim(),
        phone: form.get("phone").trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", state.currentUser.id);

    if (profileResult.error) {
      message.textContent = profileResult.error.message;
      return;
    }

    if (state.currentFarm) {
      const farmResult = await db
        .from("farms")
        .update({
          farm_name: form.get("farm_name").trim(),
          location: form.get("location").trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("seller_id", state.currentUser.id);

      if (farmResult.error) {
        message.textContent = farmResult.error.message;
        return;
      }
    }

    message.textContent = "Profile saved.";
    await updateProfileDisplay();
    window.setTimeout(() => closeModal(profileModal), 600);
  }

  // ---------------------------------------------------------------------------
  // Buyer products and catalog filters
  // ---------------------------------------------------------------------------

  async function loadBuyerProducts() {
    const result = await db
      .from("products")
      .select(
        "id, name, category, price, unit, available_quantity, image_url, farms(farm_name)",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (result.error) {
      dom.productGrid.innerHTML = `<div class="order-empty">Unable to load products: ${escapeHtml(result.error.message)}</div>`;
      return;
    }

    state.products = result.data || [];
    renderBuyerProducts();
  }

  function renderBuyerProducts() {
    const search = state.search.toLowerCase();
    const filtered = state.products.filter((product) => {
      const matchesSearch = `${product.name} ${product.category} ${product.farms?.farm_name || ""}`
        .toLowerCase()
        .includes(search);
      const matchesCategory =
        state.category === "All Items" || product.category === state.category;
      return matchesSearch && matchesCategory;
    });

    if (!filtered.length) {
      dom.productGrid.innerHTML =
        '<div class="order-empty">No matching products are available.</div>';
      return;
    }

    dom.productGrid.innerHTML = filtered
      .map((product) => {
        const stock = Number(product.available_quantity) || 0;
        const unit = product.unit || "kg";
        return `
          <article class="product" data-product-id="${product.id}">
            <div class="product-img" style="background-image:url('${safeImageUrl(product.image_url)}')"></div>
            <div>
              <h3>${escapeHtml(product.name)}</h3>
              <p>${escapeHtml(product.farms?.farm_name || "Local partner farm")}</p>
              <div class="price">
                ${formatMoney(product.price)} <small>/ ${escapeHtml(unit)}</small>
                <button class="add" type="button" ${stock <= 0 ? "disabled" : ""}>+</button>
              </div>
              <span class="stock-badge ${stock <= 0 ? "sold" : ""}">
                ${stock > 0 ? `${stock} ${escapeHtml(unit)} available` : "SOLD OUT"}
              </span>
            </div>
          </article>`;
      })
      .join("");
  }

  function addProductToCart(productId) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;

    const stock = Number(product.available_quantity) || 0;
    const cartItem = state.cart.find((item) => item.productId === productId);
    const requestedQuantity = (cartItem?.quantity || 0) + 1;

    if (requestedQuantity > stock) {
      showToast(`Only ${stock} ${product.unit || "kg"} available`);
      return;
    }

    if (cartItem) {
      cartItem.quantity = requestedQuantity;
    } else {
      state.cart.push({
        productId: product.id,
        name: product.name,
        farmName: product.farms?.farm_name || "Local partner farm",
        unitPrice: Number(product.price),
        unit: product.unit || "kg",
        imageUrl: safeImageUrl(product.image_url),
        quantity: 1,
        available: stock,
      });
    }

    renderCart();
    showToast(`${product.name} added to cart`);
  }

  // ---------------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------------

  function getCartTotal() {
    return state.cart.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    );
  }

  function toggleCart(open) {
    dom.cartDrawer.classList.toggle("open", open);
    dom.cartOverlay.classList.toggle("open", open);
    dom.cartDrawer.setAttribute("aria-hidden", String(!open));
  }

  function renderCart() {
    dom.cartCount.textContent = state.cart.reduce(
      (quantity, item) => quantity + item.quantity,
      0,
    );
    dom.cartTotal.textContent = formatMoney(getCartTotal());

    if (!state.cart.length) {
      dom.cartItems.innerHTML = `
        <div class="cart-empty">
          Your cart is empty.<br>Add fresh products to get started.
        </div>`;
      return;
    }

    dom.cartItems.innerHTML = state.cart
      .map(
        (item) => `
          <div class="cart-item" data-product-id="${item.productId}">
            <div class="cart-item-img" style="background-image:url('${item.imageUrl}')"></div>
            <div>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${formatMoney(item.unitPrice)} / ${escapeHtml(item.unit)}</p>
              <div class="quantity">
                <button type="button" data-cart-action="decrease">-</button>
                <span>${item.quantity} ${escapeHtml(item.unit)}</span>
                <button type="button" data-cart-action="increase">+</button>
                <button type="button" class="remove-item" data-cart-action="remove">Remove</button>
              </div>
            </div>
          </div>`,
      )
      .join("");
  }

  function updateCartItem(productId, action) {
    const index = state.cart.findIndex((item) => item.productId === productId);
    if (index < 0) return;

    const item = state.cart[index];
    if (action === "increase") {
      if (item.quantity >= item.available) {
        showToast(`Only ${item.available} ${item.unit} available`);
        return;
      }
      item.quantity += 1;
    }

    if (action === "decrease") item.quantity -= 1;
    if (action === "remove" || item.quantity <= 0) state.cart.splice(index, 1);
    renderCart();
  }

  // ---------------------------------------------------------------------------
  // Checkout and buyer order history
  // ---------------------------------------------------------------------------

  function openCheckout() {
    if (!state.cart.length) {
      showToast("Add a product before checking out");
      return;
    }

    dom.checkoutForm.elements.name.value =
      state.currentProfile?.full_name || "";
    dom.checkoutForm.elements.phone.value =
      state.currentProfile?.phone || dom.checkoutForm.elements.phone.value;
    dom.checkoutTotal.textContent = formatMoney(getCartTotal());
    toggleCart(false);
    openModal(dom.checkoutModal);
  }

  async function submitCheckout(event) {
    event.preventDefault();

    if (!state.currentUser || state.selectedRole !== "buyer") {
      showToast("Sign in as a buyer before checking out");
      return;
    }

    const checkoutValues = {};
    const requiredCheckoutFields = [
      ["phone", "phone number"],
      ["business_name", "restaurant or business name"],
      ["address", "complete delivery address"],
    ];

    for (const [fieldName, fieldLabel] of requiredCheckoutFields) {
      const input = dom.checkoutForm.elements.namedItem(fieldName);
      const value = input.value.trim().replace(/\s+/g, " ");
      input.setCustomValidity("");

      if (!value) {
        const validationMessage = `Enter a ${fieldLabel}, not spaces only.`;
        input.setCustomValidity(validationMessage);
        input.reportValidity();
        showToast(validationMessage);
        return;
      }

      input.value = value;
      checkoutValues[fieldName] = value;
    }

    const snapshot = state.cart.map((item) => ({ ...item }));
    if (!snapshot.length) return;

    const submitButton = $("button[type='submit']", dom.checkoutForm);
    submitButton.disabled = true;
    submitButton.textContent = "Placing order...";

    try {
      const productResult = await db
        .from("products")
        .select("id, price, unit, available_quantity, farms(seller_id)")
        .in(
          "id",
          snapshot.map((item) => item.productId),
        );

      if (productResult.error) throw productResult.error;

      for (const item of snapshot) {
        const product = productResult.data.find(
          (record) => record.id === item.productId,
        );
        if (!product || Number(product.available_quantity) < item.quantity) {
          throw new Error(`${item.name} no longer has enough stock.`);
        }
      }

      const form = new FormData(dom.checkoutForm);
      const total = snapshot.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      const orderResult = await db
        .from("orders")
        .insert({
          buyer_id: state.currentUser.id,
          contact_name: state.currentProfile.full_name,
          phone: checkoutValues.phone,
          business_name: checkoutValues.business_name,
          delivery_address: checkoutValues.address,
          delivery_method: form.get("delivery"),
          payment_method: form.get("payment"),
          subtotal: total,
          total,
        })
        .select("id")
        .single();

      if (orderResult.error) throw orderResult.error;

      const orderItems = snapshot.map((item) => {
        const product = productResult.data.find(
          (record) => record.id === item.productId,
        );
        return {
          order_id: orderResult.data.id,
          product_id: item.productId,
          seller_id: product.farms?.seller_id,
          product_name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        };
      });

      const itemResult = await db.from("order_items").insert(orderItems);
      if (itemResult.error) throw itemResult.error;

      for (const item of snapshot) {
        const stockResult = await db.rpc("decrement_product_stock", {
          p_product_id: item.productId,
          p_quantity: item.quantity,
        });
        if (stockResult.error || stockResult.data === false) {
          throw stockResult.error || new Error(`Unable to update ${item.name} stock.`);
        }
      }

      state.cart = [];
      renderCart();
      await Promise.all([loadBuyerProducts(), loadBuyerOrders()]);

      dom.checkoutCard.classList.add("success");
      dom.orderSuccess.classList.add("show");
    } catch (error) {
      showToast(error.message, 3500);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Place order";
    }
  }

  async function loadBuyerOrders() {
    if (!state.currentUser || state.selectedRole !== "buyer") return;

    const result = await db
      .from("orders")
      .select(
        "id, status, total, created_at, order_items(product_name, quantity, unit, unit_price)",
      )
      .eq("buyer_id", state.currentUser.id)
      .eq("buyer_hidden", false)
      .order("created_at", { ascending: false });

    if (result.error) {
      dom.ordersList.innerHTML = `<div class="order-empty">Unable to load orders: ${escapeHtml(result.error.message)}</div>`;
      return;
    }

    if (!result.data?.length) {
      dom.ordersList.innerHTML =
        '<div class="order-empty">No orders yet. Your completed checkout orders will appear here.</div>';
      return;
    }

    dom.ordersList.innerHTML = result.data
      .map((order) => {
        const items = (order.order_items || [])
          .map(
            (item) =>
              `${escapeHtml(item.product_name)} (${item.quantity} ${escapeHtml(item.unit || "kg")})`,
          )
          .join(", ");
        return `
          <article class="order-card">
            <div>
              <h3>Order #${order.id.slice(0, 8).toUpperCase()}</h3>
              <p>${new Date(order.created_at).toLocaleString()}</p>
              <p>${items}</p>
              <p class="order-total">${formatMoney(order.total)}</p>
            </div>
            <span class="order-status">${escapeHtml(order.status)}</span>
          </article>`;
      })
      .join("");
  }

  async function clearBuyerOrderHistory() {
    if (!state.currentUser || state.selectedRole !== "buyer") return;
    if (!window.confirm("Clear your order history from this account?")) return;

    const button = $("#clear-buyer-history");
    button.disabled = true;

    const result = await db.rpc("clear_buyer_order_history");
    button.disabled = false;

    if (result.error) {
      showToast(result.error.message, 3500);
      return;
    }

    await loadBuyerOrders();
    const count = Number(result.data) || 0;
    showToast(count ? "Order history cleared" : "No order history to clear");
  }

  // ---------------------------------------------------------------------------
  // Seller product management
  // ---------------------------------------------------------------------------

  async function loadSellerProducts() {
    const status = $("#seller-db-status");
    const list = $("#seller-db-list");

    if (!state.currentFarm) {
      status.textContent = "No farm is connected to this seller account.";
      status.className = "seller-db-status error";
      return;
    }

    const result = await db
      .from("products")
      .select("id, name, price, unit, available_quantity, image_url")
      .eq("farm_id", state.currentFarm.id)
      .order("created_at", { ascending: false });

    if (result.error) {
      status.textContent = result.error.message;
      status.className = "seller-db-status error";
      return;
    }

    status.className = "seller-db-status";
    status.textContent = `${result.data.length} product${result.data.length === 1 ? "" : "s"} in your catalog`;
    list.innerHTML = result.data
      .map(
        (product) => `
          <article class="seller-db-product" data-product-id="${product.id}">
            <img src="${safeImageUrl(product.image_url)}" alt="${escapeHtml(product.name)}">
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <small>${formatMoney(product.price)} / ${escapeHtml(product.unit)} &middot; ${product.available_quantity} ${escapeHtml(product.unit)} available</small>
            </div>
            <button type="button" class="delete-product">Delete</button>
          </article>`,
      )
      .join("");
  }

  async function openSellerProducts(showForm) {
    $("#seller-products-title").textContent = showForm
      ? "Add product"
      : "My Products";
    $("#seller-product-form").style.display = showForm ? "grid" : "none";
    openModal(sellerProductsModal);
    await loadSellerProducts();
  }

  async function saveSellerProduct(event) {
    event.preventDefault();
    const productForm = event.currentTarget;
    const status = $("#seller-db-status");
    const nameInput = productForm.elements.namedItem("name");
    const quantityInput = productForm.elements.namedItem("quantity");
    const productName = nameInput.value.trim().replace(/\s+/g, " ");
    const availableQuantity = Number(quantityInput.value);

    nameInput.setCustomValidity("");
    if (!productName) {
      const validationMessage = "Enter a product name, not spaces only.";
      nameInput.setCustomValidity(validationMessage);
      nameInput.reportValidity();
      status.textContent = validationMessage;
      status.className = "seller-db-status error";
      return;
    }

    quantityInput.setCustomValidity("");
    if (!Number.isInteger(availableQuantity) || availableQuantity < 0) {
      const validationMessage =
        "Available quantity must be a whole number (no decimals).";
      quantityInput.setCustomValidity(validationMessage);
      quantityInput.reportValidity();
      status.textContent = validationMessage;
      status.className = "seller-db-status error";
      return;
    }

    nameInput.value = productName;
    const form = new FormData(productForm);

    if (!state.currentFarm) {
      status.textContent = "No farm is connected to this account.";
      status.className = "seller-db-status error";
      return;
    }

    status.textContent = "Saving product...";
    status.className = "seller-db-status";

    try {
      let imageUrl = null;
      const image = form.get("image");

      if (image?.size) {
        const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const storagePath = `${state.currentFarm.id}/${crypto.randomUUID()}-${safeName}`;
        const upload = await db.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(storagePath, image);

        if (upload.error) throw upload.error;
        imageUrl = db.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .getPublicUrl(storagePath).data.publicUrl;
      }

      const result = await db.from("products").insert({
        farm_id: state.currentFarm.id,
        name: productName,
        category: form.get("category"),
        price: Number(form.get("price")),
        unit: form.get("unit"),
        available_quantity: availableQuantity,
        description: form.get("description").trim(),
        image_url: imageUrl,
      });

      if (result.error) throw result.error;

      productForm.reset();
      status.textContent = "Product saved successfully.";
      await Promise.all([loadSellerProducts(), loadBuyerProducts()]);
    } catch (error) {
      status.textContent = error.message;
      status.className = "seller-db-status error";
    }
  }

  async function deleteSellerProduct(productId) {
    if (!window.confirm("Remove this product from your catalog?")) return;

    const result = await db
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("farm_id", state.currentFarm.id);

    if (result.error) {
      showToast(result.error.message);
      return;
    }

    await Promise.all([loadSellerProducts(), loadBuyerProducts()]);
    showToast("Product removed");
  }

  // ---------------------------------------------------------------------------
  // Seller orders, deliveries, and badge
  // ---------------------------------------------------------------------------

  async function getSellerOrderItems(includeCleared = false) {
    if (!state.currentUser) return { data: [], error: null };
    let query = db
      .from("order_items")
      .select(
        "order_id, product_name, quantity, unit, unit_price, orders!inner(id, status, contact_name, created_at)",
      )
      .eq("seller_id", state.currentUser.id);

    if (!includeCleared) query = query.eq("seller_hidden", false);
    return query;
  }

  function groupSellerOrders(rows = []) {
    const orders = new Map();
    rows.forEach((row) => {
      if (!orders.has(row.order_id)) {
        orders.set(row.order_id, {
          id: row.order_id,
          status: row.orders.status,
          contactName: row.orders.contact_name,
          createdAt: row.orders.created_at,
          items: [],
        });
      }
      orders.get(row.order_id).items.push(row);
    });
    return [...orders.values()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  async function refreshPendingBadge() {
    if (!state.currentUser || state.selectedRole !== "seller") return;
    const result = await getSellerOrderItems();
    if (result.error) return;

    const pendingCount = groupSellerOrders(result.data).filter(
      (order) => order.status === "pending",
    ).length;
    const incomingButton = $$(".seller-links button")[1];
    let badge = $(".pending-badge", incomingButton);

    if (pendingCount && !badge) {
      badge = document.createElement("em");
      badge.className = "pending-badge";
      incomingButton.insertBefore(badge, $("b", incomingButton));
    }

    if (badge) {
      badge.textContent = pendingCount;
      badge.style.display = pendingCount ? "inline-block" : "none";
    }
  }

  function renderSellerOrders(orders, target, actions = true) {
    if (!orders.length) {
      target.innerHTML = '<div class="order-empty">No orders found.</div>';
      return;
    }

    target.innerHTML = orders
      .map((order) => {
        const products = order.items
          .map(
            (item) =>
              `${escapeHtml(item.product_name)} \u2014 ${item.quantity} ${escapeHtml(item.unit || "kg")}`,
          )
          .join("<br>");
        const controls =
          actions && order.status === "pending"
            ? `<div class="order-actions">
                 <button class="approve-order" data-status="dispatched">Accept</button>
                 <button class="reject-order" data-status="cancelled">Reject</button>
               </div>`
            : "";

        return `
          <article class="order-card" data-order-id="${order.id}">
            <div>
              <strong>${escapeHtml(order.contactName)}</strong>
              <p>${new Date(order.createdAt).toLocaleString()}</p>
              <p>${products}</p>
            </div>
            <span class="order-status">${escapeHtml(order.status)}</span>
            ${controls}
          </article>`;
      })
      .join("");
  }

  async function openSellerOrders() {
    openModal(sellerOrdersModal);
    const target = $("#seller-order-list");
    target.textContent = "Loading orders...";
    const result = await getSellerOrderItems();

    if (result.error) {
      target.textContent = result.error.message;
      return;
    }

    renderSellerOrders(groupSellerOrders(result.data), target);
    await refreshPendingBadge();
  }

  async function updateSellerOrder(orderId, status) {
    const result = await db.from("orders").update({ status }).eq("id", orderId);
    if (result.error) {
      showToast(result.error.message);
      return;
    }

    await openSellerOrders();
    showToast(status === "dispatched" ? "Order accepted for delivery" : "Order rejected");
  }

  async function clearSellerOrderHistory() {
    if (!state.currentUser || state.selectedRole !== "seller") return;
    if (
      !window.confirm(
        "Clear resolved orders from Incoming Orders? Pending orders will remain.",
      )
    ) {
      return;
    }

    const button = $("#clear-seller-history");
    button.disabled = true;

    const result = await db.rpc("clear_seller_order_history");
    button.disabled = false;

    if (result.error) {
      showToast(result.error.message, 3500);
      return;
    }

    await openSellerOrders();
    const count = Number(result.data) || 0;
    showToast(
      count ? "Incoming order history cleared" : "No resolved orders to clear",
    );
  }

  async function openDeliveries() {
    $("#seller-info-title").textContent = "Deliveries";
    const target = $("#seller-info-content");
    target.textContent = "Loading deliveries...";
    openModal(sellerInfoModal);

    const result = await getSellerOrderItems(true);
    if (result.error) {
      target.textContent = result.error.message;
      return;
    }

    const deliveries = groupSellerOrders(result.data).filter(
      (order) => order.status === "dispatched",
    );
    renderSellerOrders(deliveries, target, false);
  }

  function openMessages() {
    $("#seller-info-title").textContent = "Messages";
    $("#seller-info-content").innerHTML =
      '<div class="order-empty">Messaging will be available in a future update.</div>';
    openModal(sellerInfoModal);
  }

  // ---------------------------------------------------------------------------
  // Events and initialization
  // ---------------------------------------------------------------------------

  function bindEvents() {
    $$('[data-role]').forEach((button) =>
      button.addEventListener("click", () => openAuth(button.dataset.role)),
    );

    $("#auth-close").addEventListener("click", () => {
      closeModal(authModal);
      clearAuthForm();
      setPortal();
    });
    $("#auth-switch").addEventListener("click", toggleAuthMode);
    $("#auth-form").addEventListener("submit", handleAuthSubmit);

    $$(".logout-btn").forEach((button) => button.addEventListener("click", logout));
    $(".back-role")?.addEventListener("click", logout);
    $(".profile-logout").addEventListener("click", logout);
    $(".profile-close").addEventListener("click", () => closeModal(profileModal));
    $("#profile-form").addEventListener("submit", saveProfile);

    $("#open-cart").addEventListener("click", () => toggleCart(true));
    $("#close-cart").addEventListener("click", () => toggleCart(false));
    dom.cartOverlay.addEventListener("click", () => toggleCart(false));
    $("#clear-cart").addEventListener("click", () => {
      state.cart = [];
      renderCart();
    });
    $("#checkout-btn").addEventListener("click", openCheckout);

    dom.cartItems.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cart-action]");
      if (!button) return;
      const item = button.closest("[data-product-id]");
      updateCartItem(item.dataset.productId, button.dataset.cartAction);
    });

    dom.productGrid.addEventListener("click", (event) => {
      const button = event.target.closest(".add");
      if (!button) return;
      addProductToCart(button.closest("[data-product-id]").dataset.productId);
    });

    dom.searchInput.addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      renderBuyerProducts();
    });

    $$(".categories button").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".categories button").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        state.category = $("strong", button).textContent.trim();
        renderBuyerProducts();
        $("#browse").scrollIntoView({ behavior: "smooth" });
      });
    });

    $$("a[href='#orders']").forEach((link) => {
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        await loadBuyerOrders();
        openModal(dom.ordersSection);
      });
    });

    $("#close-checkout").addEventListener("click", () => closeModal(dom.checkoutModal));
    dom.checkoutForm.addEventListener("submit", submitCheckout);
    ["phone", "business_name", "address"].forEach((fieldName) => {
      const input = dom.checkoutForm.elements.namedItem(fieldName);
      input.addEventListener("input", () => input.setCustomValidity(""));
    });
    $("#clear-buyer-history").addEventListener(
      "click",
      clearBuyerOrderHistory,
    );
    $("#continue-shopping").addEventListener("click", () => {
      closeModal(dom.checkoutModal);
      dom.checkoutCard.classList.remove("success");
      dom.orderSuccess.classList.remove("show");
      dom.checkoutForm.reset();
    });

    $(".add-product").addEventListener("click", () => openSellerProducts(true));
    const sellerLinks = $$(".seller-links button");
    sellerLinks[0].addEventListener("click", () => openSellerProducts(false));
    sellerLinks[1].addEventListener("click", openSellerOrders);
    sellerLinks[2].addEventListener("click", openDeliveries);
    sellerLinks[3].addEventListener("click", openMessages);

    $(".seller-products-close").addEventListener("click", () =>
      closeModal(sellerProductsModal),
    );
    const sellerProductForm = $("#seller-product-form");
    const sellerProductName = sellerProductForm.elements.namedItem("name");
    const sellerProductQuantity =
      sellerProductForm.elements.namedItem("quantity");
    sellerProductForm.addEventListener("submit", saveSellerProduct);
    sellerProductName.addEventListener("input", () => {
      sellerProductName.setCustomValidity("");
    });
    sellerProductQuantity.addEventListener("input", () => {
      sellerProductQuantity.setCustomValidity("");
    });
    $("#seller-db-list").addEventListener("click", (event) => {
      const button = event.target.closest(".delete-product");
      if (!button) return;
      deleteSellerProduct(button.closest("[data-product-id]").dataset.productId);
    });

    $(".seller-orders-close").addEventListener("click", () =>
      closeModal(sellerOrdersModal),
    );
    $("#seller-order-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-status]");
      if (!button) return;
      const orderId = button.closest("[data-order-id]").dataset.orderId;
      updateSellerOrder(orderId, button.dataset.status);
    });
    $("#clear-seller-history").addEventListener(
      "click",
      clearSellerOrderHistory,
    );

    $(".seller-info-close").addEventListener("click", () =>
      closeModal(sellerInfoModal),
    );
    themeButton.addEventListener("click", () =>
      setTheme(!document.body.classList.contains("dark-mode")),
    );
  }

  function subscribeToRealtimeProducts() {
    db.channel("localbites-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        loadBuyerProducts,
      )
      .subscribe();
  }

  function initialize() {
    createProfilePills();
    bindEvents();
    renderCart();
    setTheme(localStorage.getItem("localbites-dark") === "1");
    setPortal();
    loadBuyerProducts();
    subscribeToRealtimeProducts();

    window.setInterval(() => {
      if (state.currentUser && state.selectedRole === "seller") {
        refreshPendingBadge();
      }
    }, 30_000);
  }

  initialize();
})();

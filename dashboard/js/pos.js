/**
 * Jewelry Dashboard — Punto de Venta (POS) Module v2.0
 * Professional in-store sales system for Jewelry Miami.
 *
 * Features:
 *  - Product search by name, SKU, barcode
 *  - Category-based browsing with product grid
 *  - Smart cart with quantity controls and inline editing
 *  - Variation picker with attribute matrix
 *  - Discount system (%, fixed, per-item)
 *  - Tax calculation (Florida 7%)
 *  - Multiple payment methods (cash, card, Zelle, mixed)
 *  - Cash tendered / change calculator
 *  - Customer lookup (WC customer search)
 *  - Order notes
 *  - Receipt with print support
 *  - Today's sales summary sidebar
 *  - Hold / park cart for later
 *  - Keyboard shortcuts (F2=search, F4=pay, Esc=cancel)
 *
 * @version 2.0.0
 */
const JewdPOS = (function () {
  "use strict";

  // ── State ────────────────────────────────────────────────────────────
  let cart = [];
  let discount = { type: "percent", value: 0 };
  let payments = [];
  let selectedCustomer = null;
  let allCategories = [];
  let currentCategory = "";
  let searchTimeout = null;
  let initialized = false;
  let processing = false;
  let heldCarts = [];
  let todaySales = [];
  let productCache = {};

  const TAX_RATE = 0.07;
  const HELD_CARTS_KEY = "jewd_pos_held";

  /**
   * Per-user localStorage key for today's sales.
   * Prevents data leakage when switching users on the same browser.
   */
  function salesKey() {
    const user = window.JewdAuth ? window.JewdAuth.currentUser() : null;
    const uname = user ? user.username || user.user_login || "" : "";
    return uname ? "jewd_pos_today_" + uname : "jewd_pos_today";
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const fmtN = (n) => {
    const num = parseFloat(n);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };
  const fmtCurrency = (n) => "$" + fmtN(n);

  function normalizeMediaUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url, window.location.origin);
      const c = window.JEWD_CONFIG || {};
      let storeHost = "";
      try {
        storeHost = c.siteUrl ? new URL(c.siteUrl).hostname : "";
      } catch (_) {}
      const wpHosts = [
        storeHost,
        "tujoyita.local",
        "jewelry.local.dev",
        "localhost",
        "127.0.0.1",
      ].filter(Boolean);
      if (wpHosts.includes(parsed.hostname)) {
        const uploadsPrefix = "/wp-content/uploads/";
        const idx = parsed.pathname.indexOf(uploadsPrefix);
        if (idx !== -1) {
          const relativePath = parsed.pathname.substring(idx + uploadsPrefix.length);
          const basePath = window.location.pathname.includes("/dashboard")
            ? "/dashboard/media/"
            : "/media/";
          return basePath + relativePath;
        }
      }
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }

  function productImg(product) {
    return product.images && product.images[0] ? normalizeMediaUrl(product.images[0].src) : "";
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // ── Initialization ──────────────────────────────────────────────────
  async function init() {
    if (initialized) return;
    initialized = true;

    restoreHeldCarts();
    restoreTodaySales();
    bindEvents();
    resetPayments();
    try {
      await loadCategories();
    } catch (e) {
      console.error("[POS] init loadCategories failed:", e);
    }
    renderCart();
    renderHeldCartsIndicator();
    renderTodaySummary();

    // Ticket #26: Load seller summary for gerente/admin
    if (
      window.JewdAuth &&
      (window.JewdAuth.can("manage_woocommerce") || window.JewdAuth.can("manage_options"))
    ) {
      loadPosSellerSummary();
    }
  }

  function bindEvents() {
    const searchInput = $("#posSearch");
    if (searchInput) {
      const debouncedSearch = debounce((q) => searchProducts(q), 300);
      searchInput.addEventListener("input", () => debouncedSearch(searchInput.value));
      searchInput.addEventListener("focus", () => {
        if (searchInput.value.length >= 2) searchProducts(searchInput.value);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          searchInput.value = "";
          const r = $("#posResults");
          if (r) r.style.display = "none";
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const first = $("#posResults .jewd-pos-result-item");
          if (first) first.click();
        }
      });
    }

    const clearBtn = $("#posClearCart");
    if (clearBtn) clearBtn.addEventListener("click", confirmClearCart);

    const holdBtn = $("#posHoldCart");
    if (holdBtn) holdBtn.addEventListener("click", holdCart);

    const discBtn = $("#posDiscountBtn");
    if (discBtn) discBtn.addEventListener("click", toggleDiscountPanel);

    const discApply = $("#posDiscountApply");
    if (discApply) discApply.addEventListener("click", applyDiscount);

    const discRemove = $("#posDiscountRemove");
    if (discRemove) discRemove.addEventListener("click", removeDiscount);

    const checkoutBtn = $("#posCheckout");
    if (checkoutBtn) checkoutBtn.addEventListener("click", openPaymentModal);

    document.addEventListener("click", (e) => {
      const results = $("#posResults");
      const searchBox = $(".jewd-pos-search");
      if (results && searchBox && !searchBox.contains(e.target)) {
        results.style.display = "none";
      }
    });

    const todayBtn = $("#posTodayToggle");
    if (todayBtn) todayBtn.addEventListener("click", toggleTodaySales);

    document.addEventListener("keydown", (e) => {
      const posSection = $("#sectionPos");
      if (!posSection || !posSection.classList.contains("active")) return;
      if (e.key === "F2") {
        e.preventDefault();
        if (searchInput) searchInput.focus();
      }
      if (e.key === "F4" && cart.length > 0) {
        e.preventDefault();
        openPaymentModal();
      }
      if (e.key === "Escape") {
        closePaymentModal();
        closeReceiptOverlay();
      }
    });
  }

  // ── Categories ──────────────────────────────────────────────────────
  async function loadCategories() {
    try {
      const res = await JewdAPI.getCategories();
      const cats = res && res.data ? res.data : Array.isArray(res) ? res : [];
      allCategories = cats.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
      renderCategories();
      loadCategoryProducts("");
    } catch (e) {
      console.error("[POS] Failed to load categories:", e);
    }
  }

  function renderCategories() {
    const container = $("#posCategories");
    if (!container) return;

    let html = '<button class="jewd-pos-cat-btn active" data-cat="">Todos</button>';
    allCategories.slice(0, 15).forEach((c) => {
      html +=
        '<button class="jewd-pos-cat-btn" data-cat="' +
        c.id +
        '">' +
        esc(c.name) +
        ' <span class="jewd-pos-cat-count">(' +
        c.count +
        ")</span></button>";
    });

    container.innerHTML = html;
    container.querySelectorAll(".jewd-pos-cat-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        container
          .querySelectorAll(".jewd-pos-cat-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.cat;
        loadCategoryProducts(currentCategory);
      });
    });
  }

  async function loadCategoryProducts(catId) {
    const grid = $("#posGrid");
    if (!grid) {
      console.warn("[POS] #posGrid not found!");
      return;
    }
    grid.innerHTML =
      '<div class="jewd-pos-grid-loading"><div class="jewd-spinner"></div><span>Cargando productos...</span></div>';

    try {
      const res = await JewdAPI.searchProducts({
        category: catId || undefined,
        perPage: 50,
      });
      const products = res && res.data ? res.data : Array.isArray(res) ? res : [];
      cacheProducts(products);
      renderProductGrid(products);
    } catch (e) {
      console.error("[POS] loadCategoryProducts error:", e);
      grid.innerHTML = '<div class="jewd-pos-grid-empty">Error al cargar productos</div>';
    }
  }

  function cacheProducts(products) {
    products.forEach((p) => {
      productCache[p.id] = p;
    });
  }

  // ── Product Search ──────────────────────────────────────────────────
  async function searchProducts(query) {
    const results = $("#posResults");
    if (!results) return;

    if (!query || query.length < 2) {
      results.style.display = "none";
      return;
    }

    results.innerHTML =
      '<div class="jewd-pos-result-loading"><div class="jewd-spinner-sm"></div> Buscando...</div>';
    results.style.display = "block";

    try {
      const res = await JewdAPI.searchProducts({ search: query, perPage: 15 });
      const products = res && res.data ? res.data : Array.isArray(res) ? res : [];
      if (products.length === 0) {
        results.innerHTML =
          '<div class="jewd-pos-result-empty"><span>🔍</span> No se encontró "' +
          esc(query) +
          '"</div>';
        return;
      }
      cacheProducts(products);
      renderSearchResults(products, results);
    } catch (e) {
      results.innerHTML = '<div class="jewd-pos-result-empty">Error de búsqueda</div>';
    }
  }

  function renderSearchResults(products, container) {
    let html = "";
    products.forEach((p) => {
      const img = productImg(p);
      const price = getProductPrice(p);
      const stock = getStockInfo(p);
      const inCart = cart.find((i) => i.productId === p.id);

      html +=
        '<div class="jewd-pos-result-item ' +
        (stock.outOfStock ? "jewd-pos-oos" : "") +
        '" data-product-id="' +
        p.id +
        '">' +
        '<div class="jewd-pos-result-img">' +
        (img ? '<img src="' + esc(img) + '" alt="">' : "<span>💎</span>") +
        "</div>" +
        '<div class="jewd-pos-result-info">' +
        '<div class="jewd-pos-result-name">' +
        esc(p.name) +
        "</div>" +
        '<div class="jewd-pos-result-meta">' +
        (p.sku ? '<span class="jewd-pos-result-sku">SKU: ' + esc(p.sku) + "</span>" : "") +
        '<span class="jewd-pos-result-stock ' +
        stock.cls +
        '">' +
        stock.label +
        "</span>" +
        (p.type === "variable" ? '<span class="jewd-pos-result-type">Variaciones</span>' : "") +
        "</div></div>" +
        '<div class="jewd-pos-result-right">' +
        '<div class="jewd-pos-result-price">' +
        fmtCurrency(price) +
        "</div>" +
        (inCart
          ? '<div class="jewd-pos-result-in-cart">×' + inCart.qty + " en carrito</div>"
          : "") +
        "</div></div>";
    });

    container.innerHTML = html;
    container.querySelectorAll(".jewd-pos-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (item.classList.contains("jewd-pos-oos")) {
          toast("⚠️ Producto agotado");
          return;
        }
        const pid = parseInt(item.dataset.productId);
        const product = productCache[pid];
        if (product) {
          if (product.type === "variable") {
            showVariationPicker(product);
          } else {
            addToCart(product, null);
          }
        }
        container.style.display = "none";
        $("#posSearch").value = "";
      });
    });
  }

  // ── Product Grid ────────────────────────────────────────────────────
  function renderProductGrid(products) {
    const grid = $("#posGrid");
    if (!grid) return;

    if (products.length === 0) {
      grid.innerHTML =
        '<div class="jewd-pos-grid-empty"><span>📦</span> No hay productos en esta categoría</div>';
      return;
    }

    let html = "";
    products.forEach((p) => {
      const img = productImg(p);
      const price = getProductPrice(p);
      const stock = getStockInfo(p);
      const inCart = cart.find((i) => i.productId === p.id);

      html +=
        '<div class="jewd-pos-product-card ' +
        (stock.outOfStock ? "jewd-pos-oos" : "") +
        " " +
        (inCart ? "jewd-pos-in-cart" : "") +
        '" data-product-id="' +
        p.id +
        '">' +
        (inCart ? '<span class="jewd-pos-card-badge">×' + inCart.qty + "</span>" : "") +
        (stock.outOfStock ? '<span class="jewd-pos-card-oos">Agotado</span>' : "") +
        '<div class="jewd-pos-product-img">' +
        (img
          ? '<img src="' + esc(img) + '" alt="" loading="lazy">'
          : '<span class="jewd-pos-no-img">💎</span>') +
        "</div>" +
        '<div class="jewd-pos-product-body">' +
        '<div class="jewd-pos-product-name" title="' +
        esc(p.name) +
        '">' +
        esc(p.name) +
        "</div>" +
        (p.sku ? '<div class="jewd-pos-product-sku">' + esc(p.sku) + "</div>" : "") +
        '<div class="jewd-pos-product-bottom">' +
        '<span class="jewd-pos-product-price">' +
        fmtCurrency(price) +
        "</span>" +
        (p.sale_price
          ? '<span class="jewd-pos-product-was">' + fmtCurrency(p.regular_price) + "</span>"
          : "") +
        "</div>" +
        (p.type === "variable" ? '<span class="jewd-pos-var-badge">Variaciones</span>' : "") +
        "</div></div>";
    });
    grid.innerHTML = html;

    grid.querySelectorAll(".jewd-pos-product-card").forEach((card) => {
      card.addEventListener("click", async () => {
        if (card.classList.contains("jewd-pos-oos")) {
          toast("⚠️ Producto agotado");
          return;
        }
        const pid = parseInt(card.dataset.productId);
        const product = productCache[pid];
        if (product) {
          if (product.type === "variable") {
            await showVariationPicker(product);
          } else {
            addToCart(product, null);
            card.classList.add("jewd-pos-added");
            setTimeout(() => card.classList.remove("jewd-pos-added"), 400);
            refreshGridBadges();
          }
        }
      });
    });
  }

  function refreshGridBadges() {
    $$(".jewd-pos-product-card").forEach((card) => {
      const pid = parseInt(card.dataset.productId);
      const inCart = cart.find((i) => i.productId === pid);
      const badge = card.querySelector(".jewd-pos-card-badge");
      if (inCart) {
        card.classList.add("jewd-pos-in-cart");
        if (badge) {
          badge.textContent = "×" + inCart.qty;
        } else {
          const b = document.createElement("span");
          b.className = "jewd-pos-card-badge";
          b.textContent = "×" + inCart.qty;
          card.prepend(b);
        }
      } else {
        card.classList.remove("jewd-pos-in-cart");
        if (badge) badge.remove();
      }
    });
  }

  // ── Variation Picker ────────────────────────────────────────────────
  async function showVariationPicker(product) {
    try {
      const vRes = await JewdAPI.getVariations(product.id);
      const variations = vRes && vRes.data ? vRes.data : Array.isArray(vRes) ? vRes : [];
      if (variations.length === 0) {
        toast("⚠️ Sin variaciones disponibles");
        return;
      }

      const overlay = document.createElement("div");
      overlay.className = "jewd-pos-modal-overlay";

      let varHtml = "";
      const available = variations.filter(
        (v) => v.stock_status === "instock" || (v.stock_quantity !== null && v.stock_quantity > 0),
      );
      const outOfStock = variations.filter(
        (v) => v.stock_status !== "instock" && (v.stock_quantity === null || v.stock_quantity <= 0),
      );

      available.forEach((v) => {
        const attrs = v.attributes ? v.attributes.map((a) => a.option).join(" / ") : "";
        const attrFull = v.attributes
          ? v.attributes.map((a) => a.name + ": " + a.option).join(", ")
          : "";
        const price = parseFloat(v.sale_price || v.price || v.regular_price) || 0;
        const stockInfo = getStockInfo(v);
        const inCart = cart.find((i) => i.variationId === v.id);

        varHtml +=
          '<button class="jewd-pos-var-option" data-var-id="' +
          v.id +
          '" title="' +
          esc(attrFull) +
          '">' +
          '<div class="jewd-pos-var-left">' +
          '<span class="jewd-pos-var-attrs">' +
          esc(attrs) +
          "</span>" +
          '<span class="jewd-pos-var-details">' +
          (v.sku ? '<span class="jewd-pos-var-sku">SKU: ' + esc(v.sku) + "</span>" : "") +
          '<span class="jewd-pos-var-stock ' +
          stockInfo.cls +
          '">' +
          stockInfo.label +
          "</span>" +
          "</span></div>" +
          '<div class="jewd-pos-var-right">' +
          '<span class="jewd-pos-var-price">' +
          fmtCurrency(price) +
          "</span>" +
          (inCart ? '<span class="jewd-pos-var-in-cart">×' + inCart.qty + "</span>" : "") +
          "</div></button>";
      });

      if (outOfStock.length > 0) {
        varHtml += '<div class="jewd-pos-var-oos-divider">Agotadas</div>';
        outOfStock.forEach((v) => {
          const attrs = v.attributes ? v.attributes.map((a) => a.option).join(" / ") : "";
          varHtml +=
            '<button class="jewd-pos-var-option jewd-pos-var-disabled" disabled>' +
            '<span class="jewd-pos-var-attrs">' +
            esc(attrs) +
            "</span>" +
            '<span class="jewd-pos-var-price jewd-pos-text-muted">Agotado</span></button>';
        });
      }

      const img = productImg(product);

      overlay.innerHTML =
        '<div class="jewd-pos-modal jewd-pos-var-picker">' +
        '<div class="jewd-pos-modal-header">' +
        '<div class="jewd-pos-var-product-info">' +
        (img ? '<img src="' + esc(img) + '" class="jewd-pos-var-product-img" alt="">' : "") +
        "<div><h4>" +
        esc(product.name) +
        '</h4><p class="jewd-pos-text-muted">' +
        available.length +
        " disponible" +
        (available.length !== 1 ? "s" : "") +
        "</p></div>" +
        '</div><button class="jewd-pos-modal-close" title="Cerrar">✕</button></div>' +
        '<div class="jewd-pos-modal-body"><div class="jewd-pos-var-list">' +
        varHtml +
        "</div></div></div>";

      document.body.appendChild(overlay);

      overlay
        .querySelectorAll(".jewd-pos-var-option:not(.jewd-pos-var-disabled)")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            const varId = parseInt(btn.dataset.varId);
            const variation = variations.find((v) => v.id === varId);
            if (variation) addToCart(product, variation);
            overlay.remove();
          });
        });

      overlay
        .querySelector(".jewd-pos-modal-close")
        .addEventListener("click", () => overlay.remove());
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
      });
      const onEsc = (e) => {
        if (e.key === "Escape") {
          overlay.remove();
          document.removeEventListener("keydown", onEsc);
        }
      };
      document.addEventListener("keydown", onEsc);
    } catch (e) {
      toast("Error al cargar variaciones");
      console.error("[POS] Variation load error:", e);
    }
  }

  // ── Cart Management ─────────────────────────────────────────────────
  function addToCart(product, variation) {
    const itemId = variation ? product.id + "-" + variation.id : "" + product.id;

    const existing = cart.find((item) => item.id === itemId);
    if (existing) {
      const stockQty = variation ? variation.stock_quantity : product.stock_quantity;
      if (stockQty !== null && existing.qty >= stockQty) {
        toast("⚠️ Stock máximo (" + stockQty + ")");
        return;
      }
      existing.qty += 1;
      toast(product.name + " — ahora ×" + existing.qty);
    } else {
      const price = variation
        ? parseFloat(variation.sale_price || variation.price || variation.regular_price) || 0
        : getProductPrice(product);
      const attrs =
        variation && variation.attributes
          ? variation.attributes.map((a) => a.option).join(" / ")
          : "";
      const stockQty = variation ? variation.stock_quantity : product.stock_quantity;

      cart.push({
        id: itemId,
        productId: product.id,
        variationId: variation ? variation.id : null,
        name: product.name,
        sku: variation ? variation.sku || product.sku : product.sku || "",
        attrs: attrs,
        price: price,
        originalPrice: price,
        qty: 1,
        maxQty: stockQty,
        img: productImg(product),
      });
      toast("✅ " + product.name + (attrs ? " (" + attrs + ")" : "") + " agregado");
    }

    renderCart();
    updateCheckoutState();
    refreshGridBadges();
  }

  function removeFromCart(itemId) {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    cart = cart.filter((i) => i.id !== itemId);
    toast("🗑 " + item.name + " removido");
    renderCart();
    updateCheckoutState();
    refreshGridBadges();
  }

  function updateQty(itemId, delta) {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty < 1) {
      removeFromCart(itemId);
      return;
    }
    if (item.maxQty !== null && newQty > item.maxQty) {
      toast("⚠️ Stock máximo: " + item.maxQty);
      return;
    }
    item.qty = newQty;
    renderCart();
    refreshGridBadges();
  }

  function setQty(itemId, qty) {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    const n = Math.max(1, parseInt(qty) || 1);
    if (item.maxQty !== null && n > item.maxQty) {
      item.qty = item.maxQty;
      toast("⚠️ Stock máximo: " + item.maxQty);
    } else {
      item.qty = n;
    }
    renderCart();
    refreshGridBadges();
  }

  function setItemPrice(itemId, newPrice) {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    item.price = Math.max(0, parseFloat(newPrice) || 0);
    renderCart();
  }

  function confirmClearCart() {
    if (cart.length === 0) return;
    if (cart.length > 2) {
      showConfirm("¿Vaciar carrito?", "Se eliminarán " + cart.length + " productos.", clearCart);
    } else {
      clearCart();
    }
  }

  function clearCart() {
    cart = [];
    discount = { type: "percent", value: 0 };
    resetPayments();
    selectedCustomer = null;
    renderCart();
    updateCheckoutState();
    refreshGridBadges();
    if ($("#posCustName")) $("#posCustName").value = "";
    if ($("#posCustEmail")) $("#posCustEmail").value = "";
    if ($("#posCustPhone")) $("#posCustPhone").value = "";
    if ($("#posNotes")) $("#posNotes").value = "";
    const panel = $("#posDiscountPanel");
    if (panel) panel.classList.remove("open");
    const dv = $("#posDiscountValue");
    if (dv) dv.value = "";
    const label = $("#posDiscountLabel");
    if (label) label.style.display = "none";
  }

  // ── Hold / Park Cart ────────────────────────────────────────────────
  function holdCart() {
    if (cart.length === 0) {
      toast("⚠️ Carrito vacío");
      return;
    }
    heldCarts.push({
      id: Date.now(),
      cart: JSON.parse(JSON.stringify(cart)),
      discount: { ...discount },
      customer: selectedCustomer ? { ...selectedCustomer } : null,
      time: new Date().toISOString(),
    });
    saveHeldCarts();
    toast("📌 Carrito guardado (#" + heldCarts.length + ")");
    clearCart();
    renderHeldCartsIndicator();
  }

  function restoreHeldCart(heldId) {
    const idx = heldCarts.findIndex((h) => h.id === heldId);
    if (idx === -1) return;
    const held = heldCarts[idx];
    if (cart.length > 0) {
      showConfirm("¿Reemplazar carrito?", "El carrito actual se descartará.", () => {
        doRestoreHeld(held, idx);
      });
    } else {
      doRestoreHeld(held, idx);
    }
  }

  function doRestoreHeld(held, idx) {
    cart = held.cart;
    discount = held.discount;
    selectedCustomer = held.customer;
    heldCarts.splice(idx, 1);
    saveHeldCarts();
    renderCart();
    renderHeldCartsIndicator();
    refreshGridBadges();
    toast("📌 Carrito restaurado");
  }

  function deleteHeldCart(heldId) {
    heldCarts = heldCarts.filter((h) => h.id !== heldId);
    saveHeldCarts();
    renderHeldCartsIndicator();
    toast("🗑 Carrito descartado");
  }

  function saveHeldCarts() {
    try {
      localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(heldCarts));
    } catch (e) {
      /* */
    }
  }

  function restoreHeldCarts() {
    try {
      const saved = localStorage.getItem(HELD_CARTS_KEY);
      heldCarts = saved ? JSON.parse(saved) : [];
    } catch (e) {
      heldCarts = [];
    }
  }

  function renderHeldCartsIndicator() {
    const indicator = $("#posHeldCount");
    if (indicator) {
      indicator.textContent = heldCarts.length > 0 ? heldCarts.length : "";
      indicator.style.display = heldCarts.length > 0 ? "" : "none";
    }
    const list = $("#posHeldList");
    if (!list) return;
    if (heldCarts.length === 0) {
      list.innerHTML = "";
      list.style.display = "none";
      return;
    }
    list.style.display = "";
    let html = '<div class="jewd-pos-held-title">📌 Carritos guardados</div>';
    heldCarts.forEach((h) => {
      const totalItems = h.cart.reduce((s, i) => s + i.qty, 0);
      const totalAmount = h.cart.reduce((s, i) => s + i.price * i.qty, 0);
      const time = new Date(h.time).toLocaleTimeString("es-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      html +=
        '<div class="jewd-pos-held-item">' +
        '<div class="jewd-pos-held-info">' +
        '<span class="jewd-pos-held-time">' +
        time +
        "</span>" +
        "<span>" +
        totalItems +
        " item" +
        (totalItems > 1 ? "s" : "") +
        " — " +
        fmtCurrency(totalAmount) +
        "</span>" +
        '</div><div class="jewd-pos-held-actions">' +
        '<button class="jewd-pos-held-restore" data-held="' +
        h.id +
        '" title="Restaurar">↩️</button>' +
        '<button class="jewd-pos-held-delete" data-held="' +
        h.id +
        '" title="Eliminar">🗑</button>' +
        "</div></div>";
    });
    list.innerHTML = html;
    list.querySelectorAll(".jewd-pos-held-restore").forEach((btn) => {
      btn.addEventListener("click", () => restoreHeldCart(parseInt(btn.dataset.held)));
    });
    list.querySelectorAll(".jewd-pos-held-delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteHeldCart(parseInt(btn.dataset.held)));
    });
  }

  // ── Cart Rendering ──────────────────────────────────────────────────
  function renderCart() {
    const container = $("#posCartItems");
    const countEl = $("#posCartCount");
    if (!container) return;

    const totalItems = cart.reduce((s, i) => s + i.qty, 0);
    if (countEl) countEl.textContent = totalItems > 0 ? "(" + totalItems + ")" : "";

    if (cart.length === 0) {
      container.innerHTML =
        '<div class="jewd-pos-cart-empty">' +
        '<span class="jewd-pos-cart-empty-icon">🛒</span>' +
        "<p>Agrega productos para iniciar la venta</p>" +
        '<p class="jewd-pos-text-muted jewd-pos-text-sm">Busca o selecciona del catálogo</p></div>';
      updateTotals();
      return;
    }

    let html = "";
    cart.forEach((item, index) => {
      const lineTotal = item.price * item.qty;
      const hasCustomPrice = Math.abs(item.price - item.originalPrice) > 0.001;

      html +=
        '<div class="jewd-pos-cart-item" data-item-id="' +
        esc(item.id) +
        '">' +
        '<div class="jewd-pos-cart-item-num">' +
        (index + 1) +
        "</div>" +
        '<div class="jewd-pos-cart-item-img">' +
        (item.img ? '<img src="' + esc(item.img) + '" alt="">' : "💎") +
        "</div>" +
        '<div class="jewd-pos-cart-item-info">' +
        '<div class="jewd-pos-cart-item-name" title="' +
        esc(item.name) +
        '">' +
        esc(item.name) +
        "</div>" +
        (item.attrs ? '<div class="jewd-pos-cart-item-attrs">' + esc(item.attrs) + "</div>" : "") +
        (item.sku ? '<div class="jewd-pos-cart-item-sku">SKU: ' + esc(item.sku) + "</div>" : "") +
        '<div class="jewd-pos-cart-item-price-row">' +
        '<span class="jewd-pos-cart-item-price ' +
        (hasCustomPrice ? "jewd-pos-price-custom" : "") +
        '">' +
        fmtCurrency(item.price) +
        " c/u</span>" +
        (hasCustomPrice
          ? '<span class="jewd-pos-cart-item-orig">' + fmtCurrency(item.originalPrice) + "</span>"
          : "") +
        '<button class="jewd-pos-edit-price-btn" data-id="' +
        esc(item.id) +
        '" title="Editar precio">✏️</button>' +
        "</div></div>" +
        '<div class="jewd-pos-cart-item-qty">' +
        '<button class="jewd-pos-qty-btn" data-action="minus" data-id="' +
        esc(item.id) +
        '">−</button>' +
        '<input type="number" class="jewd-pos-qty-input" value="' +
        item.qty +
        '" min="1"' +
        (item.maxQty ? ' max="' + item.maxQty + '"' : "") +
        ' data-id="' +
        esc(item.id) +
        '">' +
        '<button class="jewd-pos-qty-btn" data-action="plus" data-id="' +
        esc(item.id) +
        '">+</button>' +
        "</div>" +
        '<div class="jewd-pos-cart-item-total">' +
        fmtCurrency(lineTotal) +
        "</div>" +
        '<button class="jewd-pos-cart-item-remove" data-id="' +
        esc(item.id) +
        '" title="Quitar">✕</button>' +
        "</div>";
    });

    container.innerHTML = html;

    container.querySelectorAll(".jewd-pos-qty-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        updateQty(btn.dataset.id, btn.dataset.action === "plus" ? 1 : -1),
      );
    });
    container.querySelectorAll(".jewd-pos-qty-input").forEach((input) => {
      input.addEventListener("change", () => setQty(input.dataset.id, input.value));
    });
    container.querySelectorAll(".jewd-pos-cart-item-remove").forEach((btn) => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
    });
    container.querySelectorAll(".jewd-pos-edit-price-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = cart.find((i) => i.id === btn.dataset.id);
        if (item) showPriceEditor(item);
      });
    });

    updateTotals();
  }

  function showPriceEditor(item) {
    const overlay = document.createElement("div");
    overlay.className = "jewd-pos-modal-overlay jewd-pos-modal-sm";
    overlay.innerHTML =
      '<div class="jewd-pos-modal">' +
      '<div class="jewd-pos-modal-header"><h4>Editar precio</h4><button class="jewd-pos-modal-close">✕</button></div>' +
      '<div class="jewd-pos-modal-body">' +
      '<div class="jewd-pos-price-editor">' +
      '<p class="jewd-pos-text-muted">' +
      esc(item.name) +
      "</p>" +
      "<label>Precio original: <strong>" +
      fmtCurrency(item.originalPrice) +
      "</strong></label>" +
      '<div class="jewd-pos-price-input-row"><span class="jewd-pos-price-prefix">$</span>' +
      '<input type="number" class="jewd-input jewd-pos-price-input" value="' +
      fmtN(item.price) +
      '" min="0" step="0.01"></div>' +
      '<div class="jewd-pos-price-presets">' +
      '<button class="jewd-pos-preset-btn" data-pct="10">-10%</button>' +
      '<button class="jewd-pos-preset-btn" data-pct="15">-15%</button>' +
      '<button class="jewd-pos-preset-btn" data-pct="20">-20%</button>' +
      '<button class="jewd-pos-preset-btn" data-pct="25">-25%</button>' +
      '<button class="jewd-pos-preset-btn" data-pct="0">Original</button>' +
      "</div></div></div>" +
      '<div class="jewd-pos-modal-footer">' +
      '<button class="jewd-btn jewd-btn-outline jewd-pos-price-cancel">Cancelar</button>' +
      '<button class="jewd-btn jewd-btn-gold jewd-pos-price-save">Aplicar</button>' +
      "</div></div>";

    document.body.appendChild(overlay);
    const input = overlay.querySelector(".jewd-pos-price-input");
    input.focus();
    input.select();

    overlay.querySelectorAll(".jewd-pos-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pct = parseInt(btn.dataset.pct);
        input.value =
          pct === 0 ? fmtN(item.originalPrice) : fmtN(item.originalPrice * (1 - pct / 100));
      });
    });
    overlay.querySelector(".jewd-pos-price-save").addEventListener("click", () => {
      setItemPrice(item.id, input.value);
      overlay.remove();
    });
    overlay
      .querySelector(".jewd-pos-price-cancel")
      .addEventListener("click", () => overlay.remove());
    overlay
      .querySelector(".jewd-pos-modal-close")
      .addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        setItemPrice(item.id, input.value);
        overlay.remove();
      }
      if (e.key === "Escape") overlay.remove();
    });
  }

  // ── Totals ──────────────────────────────────────────────────────────
  function calcSubtotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function calcDiscount(subtotal) {
    if (!discount.value || discount.value <= 0) return 0;
    if (discount.type === "percent")
      return Math.round(subtotal * (Math.min(discount.value, 100) / 100) * 100) / 100;
    return Math.min(discount.value, subtotal);
  }

  function calcTotals() {
    const subtotal = calcSubtotal();
    const disc = calcDiscount(subtotal);
    const afterDiscount = subtotal - disc;
    const tax = Math.round(afterDiscount * TAX_RATE * 100) / 100;
    const total = Math.round((afterDiscount + tax) * 100) / 100;
    return { subtotal, disc, afterDiscount, tax, total };
  }

  function updateTotals() {
    const { subtotal, disc, tax, total } = calcTotals();
    const subEl = $("#posSubtotal");
    const discEl = $("#posDiscount");
    const discRow = $(".jewd-pos-discount-row");
    const taxEl = $("#posTax");
    const totalEl = $("#posTotal");
    const itemsEl = $("#posTotalItems");

    if (subEl) subEl.textContent = fmtCurrency(subtotal);
    if (discEl) discEl.textContent = "-" + fmtCurrency(disc);
    if (discRow) discRow.style.display = disc > 0 ? "" : "none";
    if (taxEl) taxEl.textContent = fmtCurrency(tax);
    if (totalEl) totalEl.textContent = fmtCurrency(total);
    if (itemsEl) itemsEl.textContent = cart.reduce((s, i) => s + i.qty, 0) + " artículos";
    updateCheckoutState();
  }

  function updateCheckoutState() {
    const checkBtn = $("#posCheckout");
    if (checkBtn) checkBtn.disabled = cart.length === 0;
  }

  // ── Discount Panel ──────────────────────────────────────────────────
  function toggleDiscountPanel() {
    const panel = $("#posDiscountPanel");
    if (panel) panel.classList.toggle("open");
  }

  function applyDiscount() {
    const type = $("#posDiscountType").value;
    const value = parseFloat($("#posDiscountValue").value) || 0;
    if (value <= 0) {
      toast("⚠️ Ingresa un valor");
      return;
    }
    if (type === "percent" && value > 100) {
      toast("⚠️ Máximo 100%");
      return;
    }
    discount = { type, value };
    updateTotals();
    const panel = $("#posDiscountPanel");
    if (panel) panel.classList.remove("open");
    const label = $("#posDiscountLabel");
    if (label) {
      label.textContent = type === "percent" ? value + "% desc." : "$" + fmtN(value) + " desc.";
      label.style.display = "";
    }
    toast("✅ Descuento aplicado");
  }

  function removeDiscount() {
    discount = { type: "percent", value: 0 };
    const dv = $("#posDiscountValue");
    if (dv) dv.value = "";
    const label = $("#posDiscountLabel");
    if (label) label.style.display = "none";
    updateTotals();
    const panel = $("#posDiscountPanel");
    if (panel) panel.classList.remove("open");
    toast("Descuento eliminado");
  }

  // ── Payment Modal ───────────────────────────────────────────────────
  function resetPayments() {
    payments = [];
  }

  function openPaymentModal() {
    if (cart.length === 0 || processing) return;
    if (!window.JewdAuth || !window.JewdAuth.can("create_orders")) {
      toast("🚫 No tienes permiso para crear ventas");
      return;
    }

    const { total } = calcTotals();
    const overlay = document.createElement("div");
    overlay.className = "jewd-pos-modal-overlay";
    overlay.id = "posPaymentOverlay";

    overlay.innerHTML =
      '<div class="jewd-pos-modal jewd-pos-payment-modal">' +
      '<div class="jewd-pos-modal-header"><h4>💳 Cobrar Venta</h4><button class="jewd-pos-modal-close" id="posPayClose">✕</button></div>' +
      '<div class="jewd-pos-modal-body">' +
      '<div class="jewd-pos-pay-total-display">' +
      '<span class="jewd-pos-pay-total-label">Total a cobrar</span>' +
      '<span class="jewd-pos-pay-total-amount">' +
      fmtCurrency(total) +
      "</span></div>" +
      '<div class="jewd-pos-pay-quick">' +
      '<button class="jewd-pos-pay-quick-btn" data-method="cash"><span class="jewd-pos-pay-method-icon">💵</span><span>Efectivo</span></button>' +
      '<button class="jewd-pos-pay-quick-btn" data-method="card"><span class="jewd-pos-pay-method-icon">💳</span><span>Tarjeta</span></button>' +
      '<button class="jewd-pos-pay-quick-btn" data-method="zelle"><span class="jewd-pos-pay-method-icon">📱</span><span>Zelle</span></button>' +
      '<button class="jewd-pos-pay-quick-btn" data-method="other"><span class="jewd-pos-pay-method-icon">🔄</span><span>Otro</span></button>' +
      "</div>" +
      '<div class="jewd-pos-cash-section" id="posCashSection" style="display:none">' +
      '<div class="jewd-pos-cash-calculator">' +
      "<label>💵 Monto recibido:</label>" +
      '<div class="jewd-pos-cash-input-row"><span class="jewd-pos-price-prefix">$</span>' +
      '<input type="number" class="jewd-input jewd-pos-cash-input" id="posCashReceived" min="0" step="0.01" placeholder="' +
      fmtN(total) +
      '"></div>' +
      '<div class="jewd-pos-cash-presets" id="posCashPresets"></div>' +
      '<div class="jewd-pos-cash-change" id="posCashChange">' +
      '<span>Cambio:</span><span class="jewd-pos-change-amount" id="posCashChangeAmount">$0.00</span></div>' +
      "</div></div>" +
      '<details class="jewd-pos-split-details"><summary>🔀 Pago dividido</summary>' +
      '<div class="jewd-pos-split-section" id="posSplitSection">' +
      '<div class="jewd-pos-split-rows" id="posSplitRows"></div>' +
      '<button class="jewd-btn jewd-btn-sm jewd-btn-outline" id="posSplitAdd">+ Agregar método</button>' +
      '<div class="jewd-pos-split-remaining" id="posSplitRemaining">Restante: <strong>' +
      fmtCurrency(total) +
      "</strong></div>" +
      "</div></details>" +
      '<div class="jewd-pos-ref-section" id="posRefSection" style="display:none">' +
      "<label>Referencia / aprobación:</label>" +
      '<input type="text" class="jewd-input" id="posPayReference" placeholder="Número de referencia"></div>' +
      "</div>" +
      '<div class="jewd-pos-modal-footer">' +
      '<button class="jewd-btn jewd-btn-outline" id="posPayCancel">Cancelar</button>' +
      '<button class="jewd-btn jewd-btn-gold jewd-btn-lg jewd-pos-confirm-pay" id="posPayConfirm" disabled>💎 Confirmar Pago</button>' +
      "</div></div>";

    document.body.appendChild(overlay);
    bindPaymentModal(overlay, total);
  }

  function bindPaymentModal(overlay, total) {
    let selectedMethod = "";
    let isSplit = false;
    let splitPayments = [];

    const cashSection = overlay.querySelector("#posCashSection");
    const refSection = overlay.querySelector("#posRefSection");
    const confirmBtn = overlay.querySelector("#posPayConfirm");
    const cashInput = overlay.querySelector("#posCashReceived");
    const changeDisplay = overlay.querySelector("#posCashChangeAmount");
    const cashPresetsEl = overlay.querySelector("#posCashPresets");

    function renderCashPresets() {
      const rounded = [
        Math.ceil(total),
        Math.ceil(total / 5) * 5,
        Math.ceil(total / 10) * 10,
        Math.ceil(total / 20) * 20,
        Math.ceil(total / 50) * 50,
        Math.ceil(total / 100) * 100,
      ];
      const unique = [];
      rounded.forEach((v) => {
        if (v >= total && unique.indexOf(v) === -1) unique.push(v);
      });
      cashPresetsEl.innerHTML = unique
        .slice(0, 5)
        .map(
          (v) =>
            '<button class="jewd-pos-cash-preset" data-amount="' +
            v +
            '">' +
            fmtCurrency(v) +
            "</button>",
        )
        .join("");
      cashPresetsEl.querySelectorAll(".jewd-pos-cash-preset").forEach((btn) => {
        btn.addEventListener("click", () => {
          cashInput.value = fmtN(parseFloat(btn.dataset.amount));
          updateCashChange();
        });
      });
    }

    function updateCashChange() {
      const received = parseFloat(cashInput.value) || 0;
      const change = received - total;
      changeDisplay.textContent = fmtCurrency(Math.max(0, change));
      changeDisplay.className =
        "jewd-pos-change-amount" +
        (change >= 0 ? " jewd-pos-change-positive" : " jewd-pos-change-negative");
      confirmBtn.disabled = received < total;
    }

    overlay.querySelectorAll(".jewd-pos-pay-quick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        overlay
          .querySelectorAll(".jewd-pos-pay-quick-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedMethod = btn.dataset.method;
        isSplit = false;

        if (selectedMethod === "cash") {
          cashSection.style.display = "";
          refSection.style.display = "none";
          renderCashPresets();
          cashInput.value = "";
          cashInput.focus();
          updateCashChange();
        } else {
          cashSection.style.display = "none";
          refSection.style.display =
            selectedMethod === "card" || selectedMethod === "zelle" ? "" : "none";
          confirmBtn.disabled = false;
        }
      });
    });

    if (cashInput) {
      cashInput.addEventListener("input", updateCashChange);
      cashInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !confirmBtn.disabled) confirmBtn.click();
      });
    }

    // Split payment
    const splitAdd = overlay.querySelector("#posSplitAdd");
    const splitRows = overlay.querySelector("#posSplitRows");
    const splitRemaining = overlay.querySelector("#posSplitRemaining");

    function renderSplitRows() {
      let html = "";
      splitPayments.forEach((sp, i) => {
        html +=
          '<div class="jewd-pos-split-row">' +
          '<select class="jewd-select jewd-pos-split-method" data-idx="' +
          i +
          '">' +
          '<option value="cash"' +
          (sp.method === "cash" ? " selected" : "") +
          ">💵 Efectivo</option>" +
          '<option value="card"' +
          (sp.method === "card" ? " selected" : "") +
          ">💳 Tarjeta</option>" +
          '<option value="zelle"' +
          (sp.method === "zelle" ? " selected" : "") +
          ">📱 Zelle</option>" +
          '<option value="other"' +
          (sp.method === "other" ? " selected" : "") +
          ">🔄 Otro</option>" +
          "</select>" +
          '<div class="jewd-pos-split-amount-wrap"><span>$</span>' +
          '<input type="number" class="jewd-input jewd-pos-split-amount" value="' +
          (sp.amount > 0 ? fmtN(sp.amount) : "") +
          '" placeholder="0.00" min="0" step="0.01" data-idx="' +
          i +
          '">' +
          "</div>" +
          '<button class="jewd-pos-split-remove" data-idx="' +
          i +
          '">✕</button></div>';
      });
      splitRows.innerHTML = html;
      splitRows.querySelectorAll(".jewd-pos-split-method").forEach((sel) => {
        sel.addEventListener("change", () => {
          splitPayments[parseInt(sel.dataset.idx)].method = sel.value;
        });
      });
      splitRows.querySelectorAll(".jewd-pos-split-amount").forEach((inp) => {
        inp.addEventListener("input", () => {
          splitPayments[parseInt(inp.dataset.idx)].amount = parseFloat(inp.value) || 0;
          updateSplitRemaining();
        });
      });
      splitRows.querySelectorAll(".jewd-pos-split-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          splitPayments.splice(parseInt(btn.dataset.idx), 1);
          renderSplitRows();
          updateSplitRemaining();
        });
      });
    }

    function updateSplitRemaining() {
      const paid = splitPayments.reduce((s, p) => s + p.amount, 0);
      const remaining = total - paid;
      splitRemaining.innerHTML =
        'Restante: <strong class="' +
        (remaining <= 0.01 ? "jewd-pos-text-success" : "jewd-pos-text-danger") +
        '">' +
        fmtCurrency(Math.max(0, remaining)) +
        "</strong>";
      isSplit = true;
      selectedMethod = "split";
      confirmBtn.disabled = remaining > 0.01;
    }

    if (splitAdd) {
      splitAdd.addEventListener("click", () => {
        splitPayments.push({ method: "cash", amount: 0 });
        renderSplitRows();
        updateSplitRemaining();
      });
    }

    overlay.querySelector("#posPayClose").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#posPayCancel").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    confirmBtn.addEventListener("click", () => {
      if (isSplit) {
        payments = splitPayments
          .filter((p) => p.amount > 0)
          .map((p) => ({ method: p.method, amount: p.amount, reference: "" }));
      } else {
        const ref = (overlay.querySelector("#posPayReference") || {}).value || "";
        const cashReceived =
          selectedMethod === "cash" ? parseFloat(cashInput.value) || total : total;
        payments = [{ method: selectedMethod, amount: cashReceived, reference: ref }];
      }
      overlay.remove();
      processCheckout();
    });
  }

  function closePaymentModal() {
    const overlay = $("#posPaymentOverlay");
    if (overlay) overlay.remove();
  }

  // ── Checkout ────────────────────────────────────────────────────────
  async function processCheckout() {
    if (cart.length === 0 || processing) return;
    processing = true;
    const checkBtn = $("#posCheckout");
    if (checkBtn) {
      checkBtn.disabled = true;
      checkBtn.innerHTML = '<span class="jewd-spinner-sm"></span> Procesando...';
    }

    try {
      const { subtotal, disc, tax, total } = calcTotals();
      const primaryPayment = payments[0] || { method: "cash", amount: total };

      const lineItems = cart.map((item) => {
        const li = {
          product_id: item.productId,
          quantity: item.qty,
          subtotal: String(item.price * item.qty),
          total: String(item.price * item.qty),
        };
        if (item.variationId) li.variation_id = item.variationId;
        return li;
      });

      const orderData = {
        status: "completed",
        payment_method: primaryPayment.method,
        payment_method_title: getPaymentTitle(primaryPayment.method),
        set_paid: true,
        line_items: lineItems,
        meta_data: [
          { key: "_pos_sale", value: "yes" },
          { key: "_pos_seller", value: window.JewdAuth.currentUser().username || "unknown" },
          { key: "_pos_seller_name", value: window.JewdAuth.currentUser().display_name || "" },
          { key: "_pos_payment_method", value: primaryPayment.method },
          { key: "_pos_timestamp", value: new Date().toISOString() },
        ],
      };

      if (payments.length > 1) {
        orderData.meta_data.push({
          key: "_pos_payments",
          value: JSON.stringify(
            payments.map((p) => ({
              method: p.method,
              title: getPaymentTitle(p.method),
              amount: p.amount,
              reference: p.reference,
            })),
          ),
        });
      }
      if (primaryPayment.reference) {
        orderData.meta_data.push({
          key: "_pos_payment_reference",
          value: primaryPayment.reference,
        });
      }
      if (primaryPayment.method === "cash" && primaryPayment.amount > total) {
        orderData.meta_data.push(
          { key: "_pos_cash_received", value: String(primaryPayment.amount) },
          { key: "_pos_cash_change", value: String(primaryPayment.amount - total) },
        );
      }
      if (disc > 0) {
        orderData.fee_lines = [
          {
            name:
              discount.type === "percent"
                ? "Descuento " + discount.value + "%"
                : "Descuento manual",
            total: "-" + fmtN(disc),
          },
        ];
      }

      const custName = ($("#posCustName") || {}).value || "";
      const custEmail = ($("#posCustEmail") || {}).value || "";
      const custPhone = ($("#posCustPhone") || {}).value || "";
      if (custName.trim() || custEmail.trim() || custPhone.trim()) {
        const nameParts = custName.trim().split(" ");
        orderData.billing = {
          first_name: nameParts[0] || "",
          last_name: nameParts.slice(1).join(" ") || "",
          email: custEmail.trim(),
          phone: custPhone.trim(),
        };
      }

      const notes = ($("#posNotes") || {}).value || "";
      const orderRes = await JewdAPI.createOrder(orderData);
      const order = orderRes && orderRes.data ? orderRes.data : orderRes;
      if (notes.trim() && order.id)
        await JewdAPI.createOrderNote(order.id, "[POS] " + notes.trim());

      addTodaySale({
        id: order.id,
        number: order.number || order.id,
        total: order.total,
        items: cart.length,
        qty: cart.reduce((s, i) => s + i.qty, 0),
        method: primaryPayment.method,
        customer: custName.trim() || "Cliente general",
        time: new Date().toISOString(),
        seller: window.JewdAuth.currentUser().display_name || "",
      });

      showReceipt(order, primaryPayment);
      clearCart();
      renderTodaySummary();
      toast(
        "✅ Venta #" + (order.number || order.id) + " completada — " + fmtCurrency(order.total),
      );
    } catch (e) {
      console.error("[POS] Checkout error:", e);
      toast("❌ Error: " + (e.message || "Error desconocido"));
    } finally {
      processing = false;
      if (checkBtn) {
        checkBtn.disabled = cart.length === 0;
        checkBtn.innerHTML = "💎 Completar Venta";
      }
    }
  }

  // ── Receipt ─────────────────────────────────────────────────────────
  function showReceipt(order, payment) {
    const overlay = document.createElement("div");
    overlay.className = "jewd-pos-modal-overlay";
    overlay.id = "posReceiptOverlay";

    const items = (order.line_items || [])
      .map(
        (li) =>
          '<tr><td class="jewd-pos-receipt-item-name">' +
          esc(li.name) +
          (li.quantity > 1
            ? ' <small class="jewd-pos-text-muted">×' + li.quantity + "</small>"
            : "") +
          '</td><td class="jewd-right">' +
          fmtCurrency(li.total) +
          "</td></tr>",
      )
      .join("");

    const fees = (order.fee_lines || [])
      .map(
        (f) =>
          '<tr class="jewd-pos-receipt-discount"><td>' +
          esc(f.name) +
          '</td><td class="jewd-right">' +
          fmtCurrency(f.total) +
          "</td></tr>",
      )
      .join("");

    const cashReceived =
      payment.method === "cash" && payment.amount > parseFloat(order.total) ? payment.amount : null;
    const change = cashReceived ? cashReceived - parseFloat(order.total) : 0;

    overlay.innerHTML =
      '<div class="jewd-pos-modal jewd-pos-receipt">' +
      '<div class="jewd-pos-receipt-header"><div class="jewd-pos-receipt-icon">✅</div>' +
      "<h3>¡Venta Completada!</h3>" +
      '<p class="jewd-pos-receipt-number">Pedido #' +
      (order.number || order.id) +
      "</p></div>" +
      '<div class="jewd-pos-receipt-body">' +
      '<table class="jewd-pos-receipt-table"><tbody>' +
      items +
      fees +
      "</tbody>" +
      "<tfoot>" +
      '<tr><td>Subtotal</td><td class="jewd-right">' +
      fmtCurrency(order.subtotal || 0) +
      "</td></tr>" +
      '<tr class="jewd-pos-text-muted"><td>Impuesto (7%)</td><td class="jewd-right">' +
      fmtCurrency(order.total_tax || 0) +
      "</td></tr>" +
      '<tr class="jewd-pos-receipt-total"><td><strong>TOTAL</strong></td><td class="jewd-right"><strong>' +
      fmtCurrency(order.total) +
      "</strong></td></tr>" +
      (cashReceived
        ? '<tr><td colspan="2" style="border:none;height:6px"></td></tr><tr><td>💵 Recibido</td><td class="jewd-right">' +
          fmtCurrency(cashReceived) +
          '</td></tr><tr class="jewd-pos-receipt-change"><td><strong>Cambio</strong></td><td class="jewd-right"><strong>' +
          fmtCurrency(change) +
          "</strong></td></tr>"
        : "") +
      "</tfoot></table>" +
      '<div class="jewd-pos-receipt-meta">' +
      '<div class="jewd-pos-receipt-meta-row"><span>' +
      getPaymentIcon(payment.method) +
      " " +
      esc(order.payment_method_title || getPaymentTitle(payment.method)) +
      "</span>" +
      (payment.reference ? "<span>Ref: " + esc(payment.reference) + "</span>" : "") +
      "</div>" +
      (order.billing && order.billing.first_name
        ? '<div class="jewd-pos-receipt-meta-row"><span>👤 ' +
          esc(order.billing.first_name) +
          " " +
          esc(order.billing.last_name || "") +
          "</span></div>"
        : "") +
      '<div class="jewd-pos-receipt-meta-row"><span>📅 ' +
      new Date().toLocaleString("es-US", { dateStyle: "medium", timeStyle: "short" }) +
      "</span></div>" +
      '<div class="jewd-pos-receipt-meta-row"><span>🏷️ Vendedor: ' +
      esc(window.JewdAuth.currentUser().display_name || "—") +
      "</span></div>" +
      "</div></div>" +
      '<div class="jewd-pos-receipt-actions">' +
      '<button class="jewd-btn jewd-btn-outline" id="posReceiptPrint">🖨 Imprimir</button>' +
      '<button class="jewd-btn jewd-btn-gold" id="posReceiptClose">➕ Nueva Venta</button>' +
      "</div></div>";

    document.body.appendChild(overlay);
    overlay.querySelector("#posReceiptClose").addEventListener("click", () => overlay.remove());
    overlay
      .querySelector("#posReceiptPrint")
      .addEventListener("click", () => printReceipt(overlay.querySelector(".jewd-pos-receipt")));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  function closeReceiptOverlay() {
    const o = $("#posReceiptOverlay");
    if (o) o.remove();
  }

  function printReceipt(receiptEl) {
    const pw = window.open("", "_blank", "width=400,height=700");
    if (!pw) {
      toast("⚠️ Permite ventanas emergentes");
      return;
    }
    pw.document.write(
      "<!DOCTYPE html><html><head><title>Recibo - Jewelry Miami</title>" +
        '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Courier New",monospace;font-size:12px;padding:12px;color:#000;max-width:300px;margin:0 auto}' +
        "table{width:100%;border-collapse:collapse;margin:8px 0}th,td{padding:3px 2px;text-align:left;font-size:11px}" +
        ".jewd-right{text-align:right}tfoot td{font-size:12px}tfoot tr:first-child td{border-top:1px dashed #000;padding-top:6px}" +
        "h3{text-align:center;margin:4px 0;font-size:16px}.jewd-pos-receipt-header{text-align:center;margin-bottom:10px;border-bottom:1px dashed #000;padding-bottom:8px}" +
        ".jewd-pos-receipt-icon{font-size:24px}.jewd-pos-receipt-number{font-size:13px}" +
        ".jewd-pos-receipt-total td{font-size:14px;border-top:2px solid #000;padding-top:6px}" +
        ".jewd-pos-receipt-change td{font-size:14px}.jewd-pos-receipt-meta{margin-top:10px;border-top:1px dashed #000;padding-top:8px;text-align:center;font-size:10px}" +
        ".jewd-pos-receipt-meta-row{margin:2px 0}.jewd-pos-receipt-actions{display:none}.jewd-pos-receipt-discount td{color:#c00}" +
        ".store-footer{text-align:center;margin-top:12px;border-top:1px dashed #000;padding-top:8px;font-size:10px}</style></head>" +
        '<body><div style="text-align:center;margin-bottom:8px"><h3>💎 JEWELRY MIAMI</h3><div style="font-size:10px">Miami, Florida</div></div>' +
        receiptEl.querySelector(".jewd-pos-receipt-body").innerHTML +
        '<div class="store-footer"><p>¡Gracias por su compra!</p><p>Thank you for your purchase!</p><p style="margin-top:4px">www.tujoyita.com</p></div></body></html>',
    );
    pw.document.close();
    setTimeout(() => pw.print(), 300);
  }

  // ── Today's Sales ───────────────────────────────────────────────────
  function addTodaySale(sale) {
    // sale object must include seller field for per-seller tracking
    todaySales.push(sale);
    saveTodaySales();
  }

  function saveTodaySales() {
    try {
      localStorage.setItem(
        salesKey(),
        JSON.stringify({ date: new Date().toDateString(), sales: todaySales }),
      );
    } catch (e) {
      /* */
    }
  }

  function restoreTodaySales() {
    // Load from localStorage first as immediate fallback
    try {
      const saved = localStorage.getItem(salesKey());
      if (saved) {
        const data = JSON.parse(saved);
        todaySales = data.date === new Date().toDateString() ? data.sales || [] : [];
        if (todaySales.length === 0) localStorage.removeItem(salesKey());
      }
    } catch (e) {
      todaySales = [];
    }
    // Then load from server (async)
    loadTodaySalesFromServer();
  }

  async function loadTodaySalesFromServer() {
    try {
      const user = window.JewdAuth ? window.JewdAuth.currentUser() : null;
      const seller = user ? user.user_login || user.username || "" : "";
      const res = await JewdAPI.getSalesToday({ seller });
      const orders = Array.isArray(res) ? res : res && res.data ? res.data : [];
      if (orders.length > 0 || todaySales.length === 0) {
        todaySales = orders.map(function (o) {
          return {
            id: o.id,
            number: o.number || o.id,
            total: parseFloat(o.total || 0),
            qty: o.qty || 0,
            method: o.method || "pos",
            seller: o.seller || seller,
            time: o.time || o.date_created || new Date().toISOString(),
          };
        });
        saveTodaySales();
        renderTodaySummary();
      }
    } catch (e) {
      console.warn("[POS] loadTodaySalesFromServer failed, using localStorage:", e.message);
    }
  }

  function renderTodaySummary() {
    const container = $("#posTodaySummary");
    if (!container) return;

    if (todaySales.length === 0) {
      container.innerHTML = '<div class="jewd-pos-today-empty">Sin ventas hoy</div>';
      return;
    }

    const totalSales = todaySales.reduce((s, sale) => s + parseFloat(sale.total || 0), 0);
    const totalItems = todaySales.reduce((s, sale) => s + (sale.qty || 0), 0);

    let html =
      '<div class="jewd-pos-today-stats">' +
      '<div class="jewd-pos-today-stat"><span class="jewd-pos-today-stat-value">' +
      todaySales.length +
      '</span><span class="jewd-pos-today-stat-label">Ventas</span></div>' +
      '<div class="jewd-pos-today-stat"><span class="jewd-pos-today-stat-value">' +
      totalItems +
      '</span><span class="jewd-pos-today-stat-label">Artículos</span></div>' +
      '<div class="jewd-pos-today-stat"><span class="jewd-pos-today-stat-value">' +
      fmtCurrency(totalSales) +
      '</span><span class="jewd-pos-today-stat-label">Total</span></div>' +
      '</div><div class="jewd-pos-today-list">';

    todaySales
      .slice()
      .reverse()
      .forEach((sale) => {
        const time = new Date(sale.time).toLocaleTimeString("es-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        html +=
          '<div class="jewd-pos-today-item">' +
          '<span class="jewd-pos-today-time">' +
          time +
          "</span>" +
          '<span class="jewd-pos-today-order">#' +
          sale.number +
          "</span>" +
          '<span class="jewd-pos-today-method">' +
          getPaymentIcon(sale.method) +
          "</span>" +
          '<span class="jewd-pos-today-amount">' +
          fmtCurrency(sale.total) +
          "</span></div>";
      });
    html += "</div>";
    container.innerHTML = html;
  }

  function toggleTodaySales() {
    const panel = $("#posTodayPanel");
    if (panel) panel.classList.toggle("open");
  }

  // ── Seller Summary for Gerente/Admin (Ticket #26) ───────────────────
  async function loadPosSellerSummary() {
    const container = $("#posSellerSummary");
    if (!container) return;
    try {
      const res = await JewdAPI.getSalesBySeller({ period: "today" });
      const sellers = Array.isArray(res) ? res : res && res.data ? res.data : [];
      renderPosSellerSummary(sellers);
    } catch (e) {
      console.warn("[POS] loadPosSellerSummary failed:", e.message);
    }
  }

  function renderPosSellerSummary(sellers) {
    const container = $("#posSellerSummary");
    if (!container) return;
    if (!sellers.length) {
      container.style.display = "none";
      return;
    }
    container.style.display = "";
    const total = sellers.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    let html =
      '<div class="jewd-pos-seller-summary">' +
      '<div class="jewd-pos-seller-summary-header" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--jewd-border,#333);margin-top:8px">' +
      "<strong>👥 Resumen Vendedores</strong>" +
      "<span>" +
      fmtCurrency(total) +
      "</span></div>";
    sellers.forEach(function (s) {
      const name = s.display_name || s.username || s.seller || "Vendedor";
      const amount = parseFloat(s.total || 0);
      const count = parseInt(s.count || s.orders || 0);
      html +=
        '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">' +
        "<span>" +
        esc(name) +
        ' <small style="opacity:.6">(' +
        count +
        ")</small></span>" +
        "<span>" +
        fmtCurrency(amount) +
        "</span></div>";
    });
    html += "</div>";
    container.innerHTML = html;
  }

  // ── Confirm Dialog ──────────────────────────────────────────────────
  function showConfirm(title, message, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "jewd-pos-modal-overlay jewd-pos-modal-sm";
    overlay.innerHTML =
      '<div class="jewd-pos-modal">' +
      '<div class="jewd-pos-modal-header"><h4>' +
      esc(title) +
      "</h4></div>" +
      '<div class="jewd-pos-modal-body"><p>' +
      esc(message) +
      "</p></div>" +
      '<div class="jewd-pos-modal-footer">' +
      '<button class="jewd-btn jewd-btn-outline jewd-pos-confirm-no">Cancelar</button>' +
      '<button class="jewd-btn jewd-btn-gold jewd-pos-confirm-yes">Confirmar</button>' +
      "</div></div>";
    document.body.appendChild(overlay);
    overlay.querySelector(".jewd-pos-confirm-yes").addEventListener("click", () => {
      overlay.remove();
      onConfirm();
    });
    overlay.querySelector(".jewd-pos-confirm-no").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ── Utilities ───────────────────────────────────────────────────────
  function getProductPrice(product) {
    if (product.sale_price && product.sale_price !== "") return parseFloat(product.sale_price);
    if (product.price) return parseFloat(product.price);
    if (product.regular_price) return parseFloat(product.regular_price);
    return 0;
  }

  function getStockInfo(product) {
    const qty = product.stock_quantity;
    const status = product.stock_status;
    if (status === "outofstock")
      return { label: "Agotado", cls: "jewd-pos-stock-out", outOfStock: true };
    if (qty !== null && qty !== undefined) {
      if (qty <= 0) return { label: "Agotado", cls: "jewd-pos-stock-out", outOfStock: true };
      if (qty <= 3)
        return { label: "¡Solo " + qty + "!", cls: "jewd-pos-stock-low", outOfStock: false };
      return { label: qty + " disp.", cls: "jewd-pos-stock-ok", outOfStock: false };
    }
    return { label: "En stock", cls: "jewd-pos-stock-ok", outOfStock: false };
  }

  function getPaymentTitle(method) {
    return (
      {
        cash: "Efectivo",
        card: "Tarjeta crédito/débito",
        zelle: "Zelle",
        other: "Otro método",
        split: "Pago dividido",
      }[method] || method
    );
  }

  function getPaymentIcon(method) {
    return { cash: "💵", card: "💳", zelle: "📱", other: "🔄", split: "🔀" }[method] || "💰";
  }

  function toast(msg) {
    const t = document.querySelector("#toast");
    if (t) {
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(t._tid);
      t._tid = setTimeout(() => t.classList.remove("show"), 3000);
    }
  }

  return {
    init,
    addToCart,
    removeFromCart,
    clearCart,
    calcTotals,
    cart: function () {
      return cart;
    },
  };
})();

window.JewdPOS = JewdPOS;

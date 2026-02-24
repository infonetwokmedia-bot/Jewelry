/**
 * Jewelry Dashboard — Main Application
 * Standalone SPA — zero jQuery, zero WordPress dependency.
 * Uses WooCommerce REST API via JewdAPI layer.
 *
 * @version 3.0.0
 */
(function () {
  "use strict";

  /* ===== STATE ===== */
  const state = {
    products: [],
    variations: {}, // productId -> variations[]
    stats: null,
    opened: {},
    page: 1,
    perPage: 50,
    totalPages: 1,
    total: 0,
    totalAll: 0,
    loading: false,
    allExpanded: false,
    categories: [],
    connected: false,
    // Routing
    activeSection: "products",
    sectionLoaded: { products: false, orders: false, reports: false, settings: false },
    // Orders
    orders: [],
    ordersPage: 1,
    ordersPerPage: 20,
    ordersTotalPages: 1,
    ordersTotal: 0,
    ordersLoading: false,
    // Reports
    reportPeriod: 7,
    reportData: null,
    topSellers: [],
  };

  /* ===== DOM REFS ===== */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ===== INIT ===== */
  document.addEventListener("DOMContentLoaded", async () => {
    const cfg = window.JEWD_CONFIG || {};
    state.perPage = cfg.perPage || 50;

    $("#versionTag").textContent = "v" + (cfg.version || "3.0.0");
    $("#btnWPAdmin").href = cfg.adminUrl || "#";

    initTheme();
    initRouter();
    initAccessibility();
    bindEvents();
    initBulkActions();
    showStatSkeletons();
    await testConnection();
    loadCategories();
    loadStats();
    loadProducts();
    state.sectionLoaded.products = true;
  });

  /* ===== CONNECTION TEST ===== */
  async function testConnection() {
    const el = $("#connectionStatus");
    try {
      const ok = await JewdAPI.testConnection();
      state.connected = ok;
      el.className = "jewd-connection " + (ok ? "jewd-conn-ok" : "jewd-conn-err");
      $("#connText").textContent = ok
        ? "Conectado a WooCommerce REST API"
        : "Error de conexión — verifica API keys";
    } catch (e) {
      state.connected = false;
      el.className = "jewd-connection jewd-conn-err";
      $("#connText").textContent = "Sin conexión: " + e.message;
    }
  }

  /* ===== THEME ===== */
  function initTheme() {
    const saved = localStorage.getItem("jewd_theme");
    if (saved === "light") {
      $("#jewd-app").classList.add("jewd-light");
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    $("#jewd-app").classList.toggle("jewd-light");
    const isLight = $("#jewd-app").classList.contains("jewd-light");
    localStorage.setItem("jewd_theme", isLight ? "light" : "dark");
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isLight = $("#jewd-app").classList.contains("jewd-light");
    $("#btnTheme").textContent = isLight ? "☀️" : "🌙";
  }

  /* ===== SPA ROUTER (F4-UI-01) ===== */
  function initRouter() {
    // Sidebar toggle (mobile hamburger).
    const toggleBtn = $("#btnSidebarToggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const sidebar = $("#sidebar");
        sidebar.classList.toggle("open");
      });
    }

    // Close sidebar when clicking outside on mobile.
    document.addEventListener("click", (e) => {
      const sidebar = $("#sidebar");
      if (
        sidebar.classList.contains("open") &&
        !e.target.closest(".jewd-sidebar") &&
        !e.target.closest(".jewd-sidebar-toggle")
      ) {
        sidebar.classList.remove("open");
      }
    });

    // Listen for hash changes.
    window.addEventListener("hashchange", handleRoute);

    // Set initial route from hash or default.
    const hash = window.location.hash;
    if (hash && hash.startsWith("#/")) {
      handleRoute();
    } else {
      window.location.hash = "#/products";
    }
  }

  function handleRoute() {
    const hash = window.location.hash || "#/products";
    const section = hash.replace("#/", "") || "products";
    const validSections = ["products", "orders", "reports", "settings"];
    const target = validSections.includes(section) ? section : "products";

    navigateTo(target);
  }

  function navigateTo(section) {
    state.activeSection = section;

    // Update sidebar active state.
    $$(".jewd-nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.section === section);
    });

    // Show/hide sections.
    $$(".jewd-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === "section" + capitalize(section));
    });

    // Show/hide section-specific topbar actions.
    $$(".jewd-section-action").forEach((btn) => {
      btn.style.display = btn.dataset.section === section ? "" : "none";
    });

    // Close mobile sidebar.
    $("#sidebar").classList.remove("open");

    // Lazy-load section data on first visit.
    if (!state.sectionLoaded[section]) {
      state.sectionLoaded[section] = true;
      if (section === "orders") loadOrders();
      if (section === "reports") loadReports();
      if (section === "settings") loadSettingsPage();
    }
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ===== EVENTS ===== */
  function bindEvents() {
    $("#btnTheme").addEventListener("click", toggleTheme);
    $("#btnRefresh").addEventListener("click", () => {
      const s = state.activeSection;
      if (s === "products") {
        loadStats();
        loadProducts();
      } else if (s === "orders") {
        loadOrders();
      } else if (s === "reports") {
        loadReports();
      } else if (s === "settings") {
        loadSettingsPage();
      }
      toast("Datos actualizados");
    });
    $("#btnExpandAll").addEventListener("click", toggleExpandAll);
    $("#btnExportJSON").addEventListener("click", exportJSON);
    $("#btnExportCSV").addEventListener("click", exportCSV);

    // Product filters with debounce.
    let debounceTimer;
    $("#filterSearch").addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.page = 1;
        loadProducts();
      }, 400);
    });

    for (const sel of ["#filterCategory", "#filterType", "#filterStock", "#filterStatus"]) {
      const el = $(sel);
      if (el) {
        el.addEventListener("change", () => {
          state.page = 1;
          loadProducts();
        });
      }
    }

    // New product button.
    const btnNew = $("#btnNewProduct");
    if (btnNew) btnNew.addEventListener("click", openNewProductWizard);

    // Modal close.
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalCloseBtn").addEventListener("click", closeModal);
    $("#detailModal").addEventListener("click", (e) => {
      if (e.target === $("#detailModal")) closeModal();
    });

    // Edit modal.
    $("#editModalClose").addEventListener("click", closeEditModal);
    $("#editModalCancel").addEventListener("click", closeEditModal);
    $("#editModalSave").addEventListener("click", saveProduct);
    $("#editModal").addEventListener("click", (e) => {
      if (e.target === $("#editModal")) closeEditModal();
    });

    // Image modal — close on background click (not nav buttons).
    $("#imgModal").addEventListener("click", (e) => {
      if (e.target === $("#imgModal") || e.target === $("#imgModalSrc")) {
        $("#imgModal").classList.remove("active");
      }
    });

    // Order detail modal.
    const orderDetailClose = $("#orderDetailClose");
    if (orderDetailClose) orderDetailClose.addEventListener("click", closeOrderDetailModal);
    const orderDetailCloseBtn = $("#orderDetailCloseBtn");
    if (orderDetailCloseBtn) orderDetailCloseBtn.addEventListener("click", closeOrderDetailModal);
    const orderDetailModal = $("#orderDetailModal");
    if (orderDetailModal)
      orderDetailModal.addEventListener("click", (e) => {
        if (e.target === orderDetailModal) closeOrderDetailModal();
      });

    // Order filters.
    let orderDebounce;
    const orderSearchEl = $("#orderSearch");
    if (orderSearchEl) {
      orderSearchEl.addEventListener("input", () => {
        clearTimeout(orderDebounce);
        orderDebounce = setTimeout(() => {
          state.ordersPage = 1;
          loadOrders();
        }, 400);
      });
    }
    const orderStatusEl = $("#orderStatusFilter");
    if (orderStatusEl) {
      orderStatusEl.addEventListener("change", () => {
        state.ordersPage = 1;
        loadOrders();
      });
    }

    // Report period buttons.
    const rp7 = $("#reportPeriod7");
    const rp30 = $("#reportPeriod30");
    if (rp7)
      rp7.addEventListener("click", () => {
        state.reportPeriod = 7;
        rp7.classList.add("active");
        rp30.classList.remove("active");
        loadReports();
      });
    if (rp30)
      rp30.addEventListener("click", () => {
        state.reportPeriod = 30;
        rp30.classList.add("active");
        rp7.classList.remove("active");
        loadReports();
      });

    // Keyboard.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeEditModal();
        closeOrderDetailModal();
        $("#imgModal").classList.remove("active");
      }
      // Lightbox arrow navigation.
      if ($("#imgModal").classList.contains("active") && lightboxImages.length > 1) {
        if (e.key === "ArrowLeft") {
          lightboxIdx = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length;
          renderLightbox();
        } else if (e.key === "ArrowRight") {
          lightboxIdx = (lightboxIdx + 1) % lightboxImages.length;
          renderLightbox();
        }
      }
    });
  }

  /* ===== LOAD CATEGORIES ===== */
  async function loadCategories() {
    try {
      const res = await JewdAPI.getCategories();
      state.categories = res.data;
      populateCategoryFilter(res.data);
    } catch (e) {
      console.error("Error loading categories:", e);
    }
  }

  /* ===== LOAD STATS ===== */
  async function loadStats() {
    try {
      const res = await JewdAPI.getStats();
      state.stats = res.data;
      state.totalAll = res.data.total_products || 0;
      renderStats(res.data);
    } catch (e) {
      console.error("Error loading stats:", e);
      // Stats endpoint may not exist yet — show basic stats
      $("#statsContainer").innerHTML = statCard("Info", "—", "Stats endpoint no disponible");
    }
  }

  function renderStats(s) {
    let html = "";
    html += statCard(
      "Productos",
      s.total_products,
      s.total_variable + " variable · " + s.total_simple + " simple",
    );
    html += statCard("Variaciones", s.total_variations, "en " + s.total_variable + " productos");
    html += statCard(
      "Stock Total",
      s.total_stock,
      "unidades",
      s.total_stock > 0 ? "jewd-stat-success" : "",
    );
    html += statCard("Categorías", Object.keys(s.categories || {}).length, catNames(s.categories));
    html += statCard("Rango Precios", "$" + fmtN(s.min_price), "hasta $" + fmtN(s.max_price));
    html += statCard(
      "Valor Inventario",
      "$" + fmtN(s.total_value),
      "al precio actual",
      "jewd-stat-success",
    );
    html += statCard(
      "Stock Bajo",
      s.low_stock,
      "items ≤ 2 unidades",
      s.low_stock > 0 ? "jewd-stat-alert" : "",
    );
    html += statCard(
      "Sin Stock",
      s.out_of_stock,
      "items agotados",
      s.out_of_stock > 0 ? "jewd-stat-alert" : "",
    );

    $("#statsContainer").innerHTML = html;
  }

  function statCard(label, value, sub, extraClass) {
    return `<div class="jewd-stat ${extraClass || ""}">
            <div class="jewd-stat-label">${esc(label)}</div>
            <div class="jewd-stat-value">${value}</div>
            <div class="jewd-stat-sub">${sub || ""}</div>
        </div>`;
  }

  function catNames(cats) {
    if (!cats) return "";
    return Object.keys(cats)
      .map((k) => cats[k].name)
      .join(", ");
  }

  function populateCategoryFilter(cats) {
    const sel = $("#filterCategory");
    const current = sel.value;
    // Remove all except first option.
    while (sel.options.length > 1) sel.remove(1);
    cats
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = `${cat.name} (${cat.count})`;
        sel.appendChild(opt);
      });
    if (current) sel.value = current;
  }

  /* ===== LOAD PRODUCTS ===== */
  async function loadProducts() {
    if (state.loading) return;
    state.loading = true;

    const tb = $("#productsTable");
    tb.innerHTML =
      '<tr><td colspan="12" class="jewd-loading-row"><div class="jewd-spinner"></div> Cargando...</td></tr>';

    try {
      const statusFilter = $("#filterStatus") ? $("#filterStatus").value : "";
      const res = await JewdAPI.getProducts({
        search: $("#filterSearch").value,
        category: $("#filterCategory").value,
        type: $("#filterType").value,
        stock: $("#filterStock").value,
        status: statusFilter || undefined,
        page: state.page,
        perPage: state.perPage,
      });

      state.products = res.data;
      state.total = res.total || res.data.length;
      state.totalPages = res.totalPages || 1;

      // Prefetch variations for variable products.
      const varProds = res.data.filter((p) => p.type === "variable");
      await Promise.all(
        varProds.map(async (p) => {
          if (!state.variations[p.id]) {
            try {
              const vRes = await JewdAPI.getVariations(p.id);
              state.variations[p.id] = vRes.data;
            } catch (e) {
              state.variations[p.id] = [];
            }
          }
        }),
      );

      renderProducts();
      renderPagination();
      updateFilterCount();
      addTableDataLabels();
      checkStockAlerts();
    } catch (e) {
      tb.innerHTML = `<tr><td colspan="12" class="jewd-loading-row">Error: ${esc(e.message)}</td></tr>`;
    } finally {
      state.loading = false;
    }
  }

  /* ===== RENDER PRODUCTS ===== */
  function renderProducts() {
    const products = state.products;
    let html = "";
    const cfg = window.JEWD_CONFIG || {};

    if (!products.length) {
      html = '<tr><td colspan="12" class="jewd-empty">🔍<br>No se encontraron productos</td></tr>';
      $("#productsTable").innerHTML = html;
      return;
    }

    products.forEach((p, idx) => {
      const vs = state.variations[p.id] || [];
      const hasV = p.type === "variable";
      const isOpen = state.opened[p.id];

      // Stock total for variable products.
      let vStock = 0;
      if (hasV)
        vs.forEach((v) => {
          vStock += v.stock_quantity || 0;
        });

      // Attributes summary.
      let attrs = "";
      if (p.attributes && p.attributes.length) {
        attrs = p.attributes.map((a) => `${a.name}: ${a.options.join(", ")}`).join(" | ");
      }

      // Image.
      const imgSrcRaw = p.images && p.images.length ? p.images[0].src : "";
      const imgSrc = normalizeMediaUrl(imgSrcRaw);
      const imgHtml = imgSrc
        ? `<img class="jewd-thumb" src="${esc(imgSrc)}" data-full="${esc(imgSrc)}" onerror="this.outerHTML='<span class=jewd-nopic>N/A</span>'">`
        : '<span class="jewd-nopic">N/A</span>';

      // Price.
      let priceHtml = "";
      if (hasV) {
        priceHtml = `$${fmtN(p.price)}`;
        if (vs.length) {
          const prices = vs.map((v) => parseFloat(v.price) || 0).filter((x) => x > 0);
          if (prices.length) {
            priceHtml = `$${fmtN(Math.min(...prices))} – $${fmtN(Math.max(...prices))}`;
          }
        }
      } else {
        if (p.sale_price && p.sale_price !== p.regular_price) {
          priceHtml = `<span class="jewd-price-sale">$${fmtN(p.regular_price)}</span><span class="jewd-price-current">$${fmtN(p.sale_price)}</span>`;
        } else {
          priceHtml = `<span class="jewd-price-current">$${fmtN(p.price)}</span>`;
        }
      }

      // Sale column.
      let saleHtml = "—";
      if (!hasV && p.sale_price && p.sale_price !== p.regular_price) {
        saleHtml = `<span class="jewd-price-current">$${fmtN(p.sale_price)}</span>`;
      }

      // Categories.
      const catStr = (p.categories || []).map((c) => c.name).join(", ");

      // Stock.
      let stockHtml = "";
      if (hasV) {
        const sc =
          vStock > 0 ? (vStock <= 5 ? "jewd-stock-low" : "jewd-stock-in") : "jewd-stock-out";
        stockHtml = `<span class="${sc}">${vStock}</span>`;
      } else if (p.stock_quantity !== null && p.stock_quantity !== undefined) {
        const sc =
          p.stock_quantity > 0
            ? p.stock_quantity <= 2
              ? "jewd-stock-low"
              : "jewd-stock-in"
            : "jewd-stock-out";
        stockHtml = `<span class="${sc}">${p.stock_quantity}</span>`;
      } else {
        stockHtml = `<span class="jewd-stock-in">${esc(p.stock_status)}</span>`;
      }

      // Status badge.
      const statusBadge =
        p.status !== "publish"
          ? ` <span class="jewd-badge jewd-badge-draft">${esc(p.status)}</span>`
          : "";

      // Edit URL.
      const editUrl = `${cfg.adminUrl}/post.php?post=${p.id}&action=edit`;

      // Build row.
      html += '<tr class="jewd-prow">';
      html += `<td class="jewd-checkbox-col"><input type="checkbox" class="jewd-row-check" data-id="${p.id}" data-idx="${idx}"></td>`;
      html += `<td>${hasV ? `<button class="jewd-expand-btn${isOpen ? " open" : ""}" data-id="${p.id}" title="${vs.length} variaciones">▶</button>` : ""}</td>`;
      html += `<td>${imgHtml}</td>`;
      html += `<td class="jewd-sku">${esc(p.sku || "")}</td>`;
      html += `<td><strong>${esc(p.name)}</strong>${statusBadge}`;
      if (attrs)
        html += `<br><span style="font-size:.7rem;color:var(--jewd-text2)">${esc(attrs)}</span>`;
      html += "</td>";
      html += `<td><span class="jewd-badge jewd-badge-${hasV ? "var" : "sim"}">${esc(p.type)}</span>`;
      if (hasV)
        html += `<span style="font-size:.7rem;color:var(--jewd-text2);margin-left:4px">(${vs.length})</span>`;
      html += "</td>";
      html += `<td>${esc(catStr)}</td>`;
      html += `<td class="jewd-right">${priceHtml}</td>`;
      html += `<td class="jewd-right">${saleHtml}</td>`;
      html += `<td class="jewd-right">${stockHtml}</td>`;
      html += `<td class="jewd-right">${esc(p.weight || "—")}</td>`;
      html += '<td class="jewd-center">';
      if (p.status === "trash") {
        html += `<button class="jewd-action-btn jewd-action-restore" data-action="restore" data-idx="${idx}" title="Restaurar">♻️</button>`;
        html += `<button class="jewd-action-btn jewd-action-danger" data-action="permadelete" data-idx="${idx}" title="Eliminar permanentemente">💀</button>`;
      } else {
        html += `<button class="jewd-action-btn" data-action="detail" data-idx="${idx}" title="Ver detalle">👁</button>`;
        html += `<button class="jewd-action-btn" data-action="edit" data-idx="${idx}" title="Editar producto">✏️</button>`;
        html += `<button class="jewd-action-btn" data-action="duplicate" data-idx="${idx}" title="Duplicar producto">📋</button>`;
        html += `<button class="jewd-action-btn jewd-action-danger" data-action="delete" data-idx="${idx}" title="Eliminar producto">🗑</button>`;
        html += `<a class="jewd-action-btn" href="${esc(p.permalink || "#")}" title="Ver en tienda" target="_blank">🔗</a>`;
      }
      html += "</td>";
      html += "</tr>";

      // Variation rows.
      if (hasV && isOpen && vs.length) {
        vs.forEach((v) => {
          let vAttr = "";
          if (v.attributes) {
            vAttr = v.attributes.map((a) => `${a.name}: ${a.option}`).join(", ");
          }

          let vPriceHtml;
          if (v.sale_price && v.sale_price !== v.regular_price) {
            vPriceHtml = `<span class="jewd-price-sale">$${fmtN(v.regular_price)}</span><span class="jewd-price-current">$${fmtN(v.sale_price)}</span>`;
          } else {
            vPriceHtml = `<span class="jewd-price-current">$${fmtN(v.price)}</span>`;
          }

          const vSaleHtml =
            v.sale_price && v.sale_price !== v.regular_price
              ? `<span class="jewd-price-current">$${fmtN(v.sale_price)}</span>`
              : "—";

          let vStockHtml;
          if (v.stock_quantity !== null && v.stock_quantity !== undefined) {
            const vsc =
              v.stock_quantity > 0
                ? v.stock_quantity <= 2
                  ? "jewd-stock-low"
                  : "jewd-stock-in"
                : "jewd-stock-out";
            vStockHtml = `<span class="${vsc}">${v.stock_quantity}</span>`;
          } else {
            vStockHtml = "—";
          }

          html += '<tr class="jewd-vrow">';
          html += "<td></td><td></td><td></td>";
          html += `<td class="jewd-sku jewd-var-indent">↳ ${esc(v.sku || "")}</td>`;
          html += `<td><span class="jewd-var-attr">${esc(vAttr)}</span></td>`;
          html += '<td><span class="jewd-badge jewd-badge-v">var</span></td>';
          html += "<td></td>";
          html += `<td class="jewd-right">${vPriceHtml}</td>`;
          html += `<td class="jewd-right">${vSaleHtml}</td>`;
          html += `<td class="jewd-right">${vStockHtml}</td>`;
          html += `<td class="jewd-right">${esc(v.weight || "—")}</td>`;
          html += "<td></td>";
          html += "</tr>";
        });
      }
    });

    const tb = $("#productsTable");
    tb.innerHTML = html;

    // Bind expand buttons.
    tb.querySelectorAll(".jewd-expand-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id);
        state.opened[id] ? delete state.opened[id] : (state.opened[id] = true);
        renderProducts();
      });
    });

    // Bind thumbnail clicks.
    tb.querySelectorAll(".jewd-thumb").forEach((img) => {
      img.addEventListener("click", () => showImage(img.dataset.full || img.src));
    });

    // Bind detail buttons.
    tb.querySelectorAll('[data-action="detail"]').forEach((btn) => {
      btn.addEventListener("click", () => showDetail(state.products[parseInt(btn.dataset.idx)]));
    });

    // Bind edit buttons.
    tb.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.addEventListener("click", () => showEditModal(state.products[parseInt(btn.dataset.idx)]));
    });

    // Bind duplicate buttons.
    tb.querySelectorAll('[data-action="duplicate"]').forEach((btn) => {
      btn.addEventListener("click", () =>
        duplicateProduct(state.products[parseInt(btn.dataset.idx)]),
      );
    });

    // Bind delete buttons.
    tb.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", () =>
        deleteProductAction(state.products[parseInt(btn.dataset.idx)]),
      );
    });

    // Bind restore buttons (trash view).
    tb.querySelectorAll('[data-action="restore"]').forEach((btn) => {
      btn.addEventListener("click", () =>
        restoreProduct(state.products[parseInt(btn.dataset.idx)]),
      );
    });

    // Bind permanent delete buttons (trash view).
    tb.querySelectorAll('[data-action="permadelete"]').forEach((btn) => {
      btn.addEventListener("click", () =>
        permanentDeleteProduct(state.products[parseInt(btn.dataset.idx)]),
      );
    });
  }

  /* ===== PAGINATION ===== */
  function renderPagination() {
    const pg = $("#pagination");
    if (state.totalPages <= 1) {
      pg.innerHTML = `<span>Mostrando ${state.products.length} de ${state.total} productos</span>`;
      return;
    }

    let html = `<span>Página ${state.page} de ${state.totalPages} (${state.total} productos)</span> `;
    html += `<button ${state.page <= 1 ? "disabled" : ""} data-page="${state.page - 1}">« Anterior</button>`;

    const start = Math.max(1, state.page - 2);
    const end = Math.min(state.totalPages, state.page + 2);
    for (let i = start; i <= end; i++) {
      html += `<button data-page="${i}"${i === state.page ? ' class="active"' : ""}>${i}</button>`;
    }

    html += `<button ${state.page >= state.totalPages ? "disabled" : ""} data-page="${state.page + 1}">Siguiente »</button>`;

    pg.innerHTML = html;
    pg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.dataset.page);
        if (p && p !== state.page) {
          state.page = p;
          loadProducts();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }

  function updateFilterCount() {
    const total = state.totalAll || state.total;
    $("#filterCount").textContent = `${state.total} de ${total}`;
  }

  /* ===== EXPAND ALL ===== */
  function toggleExpandAll() {
    if (state.allExpanded) {
      state.opened = {};
      state.allExpanded = false;
      $("#btnExpandAll").innerHTML = "⊞ Expandir Todo";
    } else {
      state.products.forEach((p) => {
        if (p.type === "variable") state.opened[p.id] = true;
      });
      state.allExpanded = true;
      $("#btnExpandAll").innerHTML = "⊟ Colapsar Todo";
    }
    renderProducts();
  }

  /* ===== DETAIL MODAL ===== */
  function showDetail(p) {
    if (!p) return;
    const cfg = window.JEWD_CONFIG || {};
    const vs = state.variations[p.id] || [];

    $("#modalTitle").textContent = p.name;
    $("#modalEditLink").href = `${cfg.adminUrl}/post.php?post=${p.id}&action=edit`;
    $("#modalViewLink").href = p.permalink || "#";

    let html = '<div class="jewd-detail-grid">';
    html += detailField("ID", p.id);
    html += detailField("Tipo", p.type);
    html += detailField("SKU", p.sku || "—", true, "sku");
    html += detailField("Estado", p.status);
    html += detailField("Categorías", (p.categories || []).map((c) => c.name).join(", ") || "—");
    html += detailField("Tags", (p.tags || []).map((t) => t.name).join(", ") || "—");

    if (p.type === "variable" && vs.length) {
      const prices = vs.map((v) => parseFloat(v.price) || 0).filter((x) => x > 0);
      html += detailField(
        "Precio Rango",
        prices.length ? `$${fmtN(Math.min(...prices))} — $${fmtN(Math.max(...prices))}` : "—",
      );
      html += detailField("Variaciones", vs.length);
    } else {
      html += detailField("Precio Regular", `$${fmtN(p.regular_price)}`);
      html += detailField("Precio Oferta", p.sale_price ? `$${fmtN(p.sale_price)}` : "—");
      html += detailField("Stock", p.stock_quantity !== null ? p.stock_quantity : p.stock_status);
      html += detailField("Peso", p.weight || "—");
    }

    html += detailField("Fecha Creación", p.date_created ? p.date_created.split("T")[0] : "—");

    // Image gallery — show ALL images.
    if (p.images && p.images.length) {
      html += `<div class="jewd-detail-field wide"><div class="jewd-detail-label">Galería (${p.images.length} imágenes)</div>`;
      html += '<div class="jewd-img-gallery">';
      p.images.forEach((img, i) => {
        const src = normalizeMediaUrl(img.src);
        html += `<div class="jewd-img-gallery-item${i === 0 ? " jewd-img-featured" : ""}">`;
        html += `<img src="${esc(src)}" data-full="${esc(src)}" data-idx="${i}" class="jewd-gallery-thumb" alt="${esc(img.alt || "")}">`;
        if (i === 0) html += '<span class="jewd-img-badge">Principal</span>';
        html += "</div>";
      });
      html += "</div></div>";
    }

    // Attributes.
    if (p.attributes && p.attributes.length) {
      const attrStr = p.attributes
        .map((a) => `<strong>${esc(a.name)}:</strong> ${a.options.join(", ")}`)
        .join("<br>");
      html += `<div class="jewd-detail-field wide"><div class="jewd-detail-label">Atributos</div>
                <div class="jewd-detail-value">${attrStr}</div></div>`;
    }

    // Short description.
    if (p.short_description) {
      html += detailField("Descripción Corta", p.short_description, true);
    }

    // Variations table.
    if (vs.length) {
      html += `<div class="jewd-detail-field wide"><div class="jewd-detail-label">Variaciones (${vs.length})</div>`;
      html +=
        '<div style="overflow-x:auto;margin-top:6px"><table class="jewd-table" style="font-size:.78rem">';
      html +=
        '<thead><tr><th>SKU</th><th>Atributos</th><th class="jewd-right">Precio</th><th class="jewd-right">Oferta</th><th class="jewd-right">Stock</th><th class="jewd-right">Peso</th></tr></thead><tbody>';
      vs.forEach((v) => {
        const va = v.attributes ? v.attributes.map((a) => `${a.name}: ${a.option}`).join(", ") : "";
        html += "<tr>";
        html += `<td class="jewd-sku">${esc(v.sku || "")}</td>`;
        html += `<td class="jewd-var-attr">${esc(va)}</td>`;
        html += `<td class="jewd-right">${v.regular_price ? "$" + fmtN(v.regular_price) : "$" + fmtN(v.price)}</td>`;
        html += `<td class="jewd-right">${v.sale_price ? "$" + fmtN(v.sale_price) : "—"}</td>`;
        html += `<td class="jewd-right">${v.stock_quantity !== null ? v.stock_quantity : "—"}</td>`;
        html += `<td class="jewd-right">${v.weight || "—"}</td>`;
        html += "</tr>";
      });
      html += "</tbody></table></div></div>";
    }

    html += "</div>";
    $("#modalBody").innerHTML = html;
    $("#detailModal").classList.add("active");

    // Bind gallery thumbnail clicks → lightbox with navigation.
    const galleryThumbs = $("#modalBody").querySelectorAll(".jewd-gallery-thumb");
    if (galleryThumbs.length) {
      const srcs = Array.from(galleryThumbs).map((t) => t.dataset.full || t.src);
      galleryThumbs.forEach((thumb) => {
        thumb.addEventListener("click", () => {
          showLightbox(srcs, parseInt(thumb.dataset.idx) || 0);
        });
      });
    }
  }

  function detailField(label, value, wide, extraClass) {
    return `<div class="jewd-detail-field${wide ? " wide" : ""}">
            <div class="jewd-detail-label">${esc(label)}</div>
            <div class="jewd-detail-value${extraClass ? " " + extraClass : ""}">${esc(String(value != null ? value : ""))}</div>
        </div>`;
  }

  function closeModal() {
    $("#detailModal").classList.remove("active");
  }

  /* ===== EDIT MODAL ===== */
  let editingProduct = null;
  let editTags = []; // [{id, name}]

  function showEditModal(p) {
    if (!p) return;
    editingProduct = p;
    editTags = (p.tags || []).map((t) => ({ id: t.id, name: t.name }));
    const vs = state.variations[p.id] || [];

    $("#editModalTitle").textContent = "✏️ Editar: " + p.name;

    // === TAB NAVIGATION ===
    const hasVars = p.type === "variable" && vs.length;
    let html = '<div class="jewd-tabs" id="editTabs">';
    html += '<button type="button" class="jewd-tab active" data-tab="general">📋 General</button>';
    html += '<button type="button" class="jewd-tab" data-tab="images">📷 Imágenes</button>';
    if (hasVars)
      html +=
        '<button type="button" class="jewd-tab" data-tab="variations">🔀 Variaciones (' +
        vs.length +
        ")</button>";
    html += "</div>";

    html += '<form id="editForm" class="jewd-edit-form">';

    // ========== TAB: GENERAL ==========
    html += '<div class="jewd-tab-panel active" data-panel="general">';

    // Product fields
    html += '<div class="jewd-edit-section">';
    html += '<h3 class="jewd-edit-section-title">Datos del Producto</h3>';
    html += '<div class="jewd-edit-grid">';
    html += editField("Nombre", "edit_name", p.name, "text");
    html += editField("SKU", "edit_sku", p.sku || "", "text");
    html += editField("Estado", "edit_status", p.status, "select", [
      { value: "publish", label: "Publicado" },
      { value: "draft", label: "Borrador" },
      { value: "private", label: "Privado" },
    ]);
    html += editField("Peso (oz)", "edit_weight", p.weight || "", "text");

    if (p.type === "simple") {
      html += editField(
        "Precio Regular ($)",
        "edit_regular_price",
        p.regular_price || "",
        "number",
      );
      html += editField("Precio Oferta ($)", "edit_sale_price", p.sale_price || "", "number");
      html += editField("Stock", "edit_stock_quantity", p.stock_quantity ?? "", "number");
    }

    html += "</div>";
    html += editFieldWide(
      "Descripción Corta",
      "edit_short_description",
      p.short_description || "",
      "textarea",
    );
    html += "</div>";

    // --- Description full (HTML) ---
    html += '<div class="jewd-edit-section">';
    html += '<h3 class="jewd-edit-section-title">📝 Descripción Completa</h3>';
    html +=
      '<textarea class="jewd-edit-input jewd-edit-textarea jewd-edit-desc-full" name="edit_description" rows="6" placeholder="HTML permitido — descripción detallada del producto">' +
      esc(p.description || "") +
      "</textarea>";
    html +=
      '<p class="jewd-edit-hint">Soporta HTML básico: &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;p&gt;, &lt;br&gt;</p>';
    html += "</div>";

    // --- Categories Checkboxes ---
    html += '<div class="jewd-edit-section">';
    html += '<h3 class="jewd-edit-section-title">🏷️ Categorías</h3>';
    html += '<div class="jewd-cat-grid" id="editCatGrid">';
    const pCatIds = (p.categories || []).map((c) => c.id);
    if (state.categories.length) {
      state.categories.forEach((cat) => {
        const checked = pCatIds.includes(cat.id) ? " checked" : "";
        html += `<label class="jewd-cat-checkbox"><input type="checkbox" name="edit_cat" value="${cat.id}"${checked}><span class="jewd-cat-name">${esc(cat.name)}</span><span class="jewd-cat-count">(${cat.count})</span></label>`;
      });
    } else {
      html += '<span class="jewd-text-muted">Cargando categorías...</span>';
    }
    html += "</div></div>";

    // --- Tags with chips ---
    html += '<div class="jewd-edit-section">';
    html += '<h3 class="jewd-edit-section-title">🔖 Etiquetas</h3>';
    html += '<div class="jewd-tags-wrap" id="editTagsWrap">';
    html += '<div class="jewd-tags-chips" id="editTagsChips">';
    editTags.forEach((t) => {
      html += `<span class="jewd-tag-chip" data-tag-id="${t.id}">${esc(t.name)} <button type="button" class="jewd-tag-remove" data-tag-id="${t.id}">✕</button></span>`;
    });
    html += "</div>";
    html += '<div class="jewd-tags-input-wrap">';
    html +=
      '<input type="text" class="jewd-edit-input jewd-tags-input" id="editTagInput" placeholder="Escribir etiqueta..." autocomplete="off">';
    html += '<div class="jewd-tags-dropdown" id="editTagDropdown"></div>';
    html += "</div></div></div>";

    // --- Attributes section ---
    if (p.attributes && p.attributes.length) {
      html += '<div class="jewd-edit-section">';
      html += '<h3 class="jewd-edit-section-title">🧩 Atributos</h3>';
      html += '<div class="jewd-attr-list" id="editAttrList">';
      p.attributes.forEach((attr, ai) => {
        const isVar = attr.variation;
        html += `<div class="jewd-attr-row" data-attr-idx="${ai}">`;
        html += `<div class="jewd-attr-header">`;
        html += `<span class="jewd-attr-name">${esc(attr.name)}</span>`;
        if (isVar) html += ' <span class="jewd-attr-badge">variación</span>';
        html += "</div>";
        html += `<div class="jewd-attr-options">`;
        (attr.options || []).forEach((opt) => {
          html += `<span class="jewd-attr-option">${esc(opt)}</span>`;
        });
        html += "</div>";
        html += `<input type="text" class="jewd-edit-input jewd-edit-sm jewd-attr-edit-input" name="edit_attr_options_${ai}" value="${esc((attr.options || []).join(", "))}" placeholder="Opciones separadas por coma" data-attr-idx="${ai}" data-attr-name="${esc(attr.name)}" data-attr-variation="${isVar ? "1" : "0"}">`;
        html += "</div>";
      });
      html += "</div></div>";
    }

    html += "</div>"; // END TAB GENERAL

    // ========== TAB: IMAGES ==========
    html += '<div class="jewd-tab-panel" data-panel="images">';
    html += '<div class="jewd-edit-section">';
    html += '<h3 class="jewd-edit-section-title">📷 Imágenes del Producto</h3>';
    html += '<div class="jewd-img-edit-zone" id="editImageZone">';

    // Existing images.
    if (p.images && p.images.length) {
      p.images.forEach((img, i) => {
        const src = normalizeMediaUrl(img.src);
        html += `<div class="jewd-img-edit-card" draggable="true" data-img-id="${img.id}" data-img-idx="${i}">`;
        html += `<img src="${esc(src)}" class="jewd-img-edit-thumb" alt="${esc(img.alt || "")}">`;
        html += `<div class="jewd-img-edit-actions">`;
        if (i === 0) html += '<span class="jewd-img-badge-sm">★ Principal</span>';
        html += `<button type="button" class="jewd-img-remove-btn" data-img-id="${img.id}" title="Quitar imagen">✕</button>`;
        html += "</div></div>";
      });
    }

    // Add image button.
    html += '<div class="jewd-img-edit-add" id="editImageAdd">';
    html += '<span class="jewd-img-add-icon">＋</span>';
    html += '<span class="jewd-img-add-text">Añadir imagen</span>';
    html += "</div>";
    html += "</div>";
    html +=
      '<p class="jewd-img-hint">Arrastra para reordenar · Primera imagen = destacada · Máx 5MB por imagen (JPG, PNG, WebP)</p>';
    html +=
      '<input type="file" id="editImageInput" accept="image/jpeg,image/png,image/gif,image/webp" multiple style="display:none">';
    html += "</div></div>"; // END TAB IMAGES

    // ========== TAB: VARIATIONS ==========
    if (hasVars) {
      html += '<div class="jewd-tab-panel" data-panel="variations">';
      html += '<div class="jewd-edit-section">';
      html += `<h3 class="jewd-edit-section-title">🔀 Variaciones (${vs.length})</h3>`;
      html += '<div class="jewd-edit-vtable"><table class="jewd-table" style="font-size:.82rem">';
      html +=
        "<thead><tr><th style='width:50px'>Img</th><th>Atributos</th><th>SKU</th><th>Precio Regular</th><th>Precio Oferta</th><th>Stock</th><th>Peso</th></tr></thead><tbody>";
      vs.forEach((v, vi) => {
        const vAttr = v.attributes
          ? v.attributes.map((a) => `${a.name}: ${a.option}`).join(", ")
          : "";
        const vImgSrc = v.image ? normalizeMediaUrl(v.image.src) : "";
        html += "<tr>";
        html += `<td class="jewd-center">`;
        if (vImgSrc) {
          html += `<img src="${esc(vImgSrc)}" class="jewd-var-img-thumb" data-vidx="${vi}" data-vid="${v.id}" title="Click para cambiar">`;
        } else {
          html += `<span class="jewd-var-img-placeholder" data-vidx="${vi}" data-vid="${v.id}" title="Click para añadir imagen">＋</span>`;
        }
        html += `<input type="file" class="jewd-var-img-input" data-vidx="${vi}" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none">`;
        html += "</td>";
        html += `<td class="jewd-var-attr">${esc(vAttr)}</td>`;
        html += `<td><input class="jewd-edit-input jewd-edit-sm" name="v_sku_${vi}" value="${esc(v.sku || "")}" data-vid="${v.id}"></td>`;
        html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="0.01" name="v_regular_price_${vi}" value="${esc(v.regular_price || v.price || "")}" data-vid="${v.id}"></td>`;
        html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="0.01" name="v_sale_price_${vi}" value="${esc(v.sale_price || "")}" data-vid="${v.id}"></td>`;
        html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="1" name="v_stock_quantity_${vi}" value="${v.stock_quantity ?? ""}" data-vid="${v.id}"></td>`;
        html += `<td><input class="jewd-edit-input jewd-edit-sm" name="v_weight_${vi}" value="${esc(v.weight || "")}" data-vid="${v.id}"></td>`;
        html += "</tr>";
      });
      html += "</tbody></table></div>";

      // --- New Variation Form ---
      const varAttrs = (p.attributes || []).filter((a) => a.variation);
      if (varAttrs.length) {
        html += '<div class="jewd-new-var-section" id="newVarSection">';
        html += '<h4 class="jewd-edit-section-subtitle">➕ Nueva Variación</h4>';
        html += '<div class="jewd-new-var-grid">';
        varAttrs.forEach((attr) => {
          html += '<div class="jewd-new-var-field">';
          html += `<label class="jewd-edit-label">${esc(attr.name)}</label>`;
          html += `<select class="jewd-edit-input jewd-edit-sm jewd-new-var-attr" data-attr-name="${esc(attr.name)}">`;
          html += '<option value="">— Seleccionar —</option>';
          (attr.options || []).forEach((opt) => {
            html += `<option value="${esc(opt)}">${esc(opt)}</option>`;
          });
          html += "</select></div>";
        });
        // Image upload field for the new variation.
        html += '<div class="jewd-new-var-field">';
        html += '<label class="jewd-edit-label">Imagen (opcional)</label>';
        html += '<div class="jewd-new-var-img-wrap" id="newVarImgWrap">';
        html += '<input type="file" accept="image/*" id="newVarImgInput" style="display:none">';
        html +=
          '<button type="button" class="jewd-btn jewd-btn-outline jewd-btn-sm" id="newVarImgBtn">📷 Seleccionar</button>';
        html +=
          '<span id="newVarImgName" style="font-size:.78rem;color:var(--jewd-text2);margin-left:8px"></span>';
        html += "</div></div>";
        html += "</div>";
        html += '<div class="jewd-new-var-actions">';
        html +=
          '<button type="button" class="jewd-btn jewd-btn-sm jewd-btn-success" id="btnCreateVariation" disabled>➕ Crear Variación</button>';
        html += "</div></div>";
      } else {
        html +=
          '<p class="jewd-edit-hint">Para crear variaciones, primero agrega atributos marcados como "variación" en la pestaña General.</p>';
      }

      html += "</div>"; // end edit-section
      html += "</div>"; // END TAB VARIATIONS
    }

    html += "</form>";

    $("#editModalBody").innerHTML = html;
    $("#editModal").classList.add("active");

    // ---- Bind tab navigation ----
    initEditTabs();

    // ---- Bind image management events ----
    initEditImageHandlers(p);

    // ---- Bind tags events ----
    initEditTagHandlers();

    // ---- Bind new variation events ----
    initNewVariationHandlers(p);
  }

  /* ===== EDIT TABS ===== */
  function initEditTabs() {
    const tabs = $$("#editTabs .jewd-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        // Switch active tab button.
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        // Switch active panel.
        $$("#editModalBody .jewd-tab-panel").forEach((panel) => {
          panel.classList.toggle("active", panel.dataset.panel === target);
        });
      });
    });
  }

  /* ===== NEW VARIATION HANDLERS ===== */
  function initNewVariationHandlers(product) {
    const btn = $("#btnCreateVariation");
    if (!btn) return;

    // Enable button only when all attribute selects have a value.
    const selects = $$("#newVarSection .jewd-new-var-attr");
    function checkSelects() {
      const allFilled = Array.from(selects).every((s) => s.value !== "");
      btn.disabled = !allFilled;
    }
    selects.forEach((s) => s.addEventListener("change", checkSelects));

    // Image file input for new variation.
    let newVarImageFile = null;
    const imgBtn = $("#newVarImgBtn");
    const imgInput = $("#newVarImgInput");
    const imgName = $("#newVarImgName");
    if (imgBtn && imgInput) {
      imgBtn.addEventListener("click", () => imgInput.click());
      imgInput.addEventListener("change", () => {
        newVarImageFile = imgInput.files[0] || null;
        if (imgName) imgName.textContent = newVarImageFile ? newVarImageFile.name : "";
      });
    }

    btn.addEventListener("click", async () => {
      // Build attributes array from selects.
      const attributes = [];
      selects.forEach((s) => {
        if (s.value) {
          attributes.push({ name: s.dataset.attrName, option: s.value });
        }
      });

      // Check for duplicate combination.
      const vs = state.variations[product.id] || [];
      const newKey = attributes
        .map((a) => `${a.name}:${a.option}`)
        .sort()
        .join("|");
      const isDuplicate = vs.some((v) => {
        const vKey = (v.attributes || [])
          .map((a) => `${a.name}:${a.option}`)
          .sort()
          .join("|");
        return vKey === newKey;
      });

      if (isDuplicate) {
        toast("⚠️ Esa combinación de atributos ya existe");
        return;
      }

      btn.disabled = true;
      btn.textContent = "⏳ Creando...";

      try {
        const varData = {
          attributes,
          regular_price: "",
          status: "publish",
        };

        // Upload image if provided (F3-UI-05).
        if (newVarImageFile) {
          toast("📷 Subiendo imagen de variación...");
          const imgResult = await JewdAPI.uploadImage(newVarImageFile);
          varData.image = { id: imgResult.data.id };
        }

        const result = await JewdAPI.createVariation(product.id, varData);
        toast("✅ Variación creada (ID: " + result.data.id + ")");

        // Refresh variations in state and re-open modal.
        const vRes = await JewdAPI.getVariations(product.id);
        state.variations[product.id] = vRes.data;

        // Refresh product data to get updated count.
        const pRes = await JewdAPI.getProduct(product.id);
        const updatedProduct = pRes.data;

        // Update product in state.
        const idx = state.products.findIndex((pr) => pr.id === product.id);
        if (idx !== -1) state.products[idx] = updatedProduct;

        // Re-render edit modal with updated variations.
        showEditModal(updatedProduct);

        // Switch to variations tab.
        const varTab = $('[data-tab="variations"]');
        if (varTab) varTab.click();
      } catch (e) {
        toast("❌ Error creando variación: " + e.message);
        console.error("Create variation failed:", e);
        btn.disabled = false;
        btn.textContent = "➕ Crear Variación";
      }
    });
  }

  /* ===== EDIT TAG HANDLERS ===== */
  let tagCache = null; // lazy-loaded tags list
  let tagDebounce = null;

  function initEditTagHandlers() {
    // Remove tag chips.
    $$("#editTagsChips .jewd-tag-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const tagId = parseInt(btn.dataset.tagId);
        editTags = editTags.filter((t) => t.id !== tagId);
        btn.closest(".jewd-tag-chip").remove();
      });
    });

    // Tag input — autocomplete.
    const input = $("#editTagInput");
    const dropdown = $("#editTagDropdown");
    if (!input || !dropdown) return;

    input.addEventListener("input", () => {
      clearTimeout(tagDebounce);
      tagDebounce = setTimeout(() => searchTags(input.value.trim()), 250);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        // Check if it matches a dropdown item.
        const first = dropdown.querySelector(".jewd-tag-option");
        if (first) {
          first.click();
        } else {
          // Add as new tag (name only, no ID — WC will create it).
          addTagChip({ id: 0, name: val });
          input.value = "";
          dropdown.innerHTML = "";
          dropdown.classList.remove("active");
        }
      }
      if (e.key === "Escape") {
        dropdown.innerHTML = "";
        dropdown.classList.remove("active");
      }
    });

    // Close dropdown on outside click.
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".jewd-tags-input-wrap")) {
        dropdown.innerHTML = "";
        dropdown.classList.remove("active");
      }
    });
  }

  async function searchTags(query) {
    const dropdown = $("#editTagDropdown");
    if (!dropdown) return;
    if (!query) {
      dropdown.innerHTML = "";
      dropdown.classList.remove("active");
      return;
    }

    // Lazy-load all tags on first search.
    if (!tagCache) {
      try {
        const res = await JewdAPI.getTags();
        tagCache = res.data || [];
      } catch (e) {
        console.error("Error loading tags:", e);
        tagCache = [];
      }
    }

    const lower = query.toLowerCase();
    const existing = editTags.map((t) => t.id);
    const matches = tagCache
      .filter((t) => t.name.toLowerCase().includes(lower) && !existing.includes(t.id))
      .slice(0, 8);

    if (!matches.length) {
      dropdown.innerHTML = `<div class="jewd-tag-option jewd-tag-option-new">Crear: "${esc(query)}"</div>`;
      dropdown.classList.add("active");
      dropdown.querySelector(".jewd-tag-option-new").addEventListener("click", () => {
        addTagChip({ id: 0, name: query });
        $("#editTagInput").value = "";
        dropdown.innerHTML = "";
        dropdown.classList.remove("active");
      });
      return;
    }

    dropdown.innerHTML = matches
      .map(
        (t) =>
          `<div class="jewd-tag-option" data-tag-id="${t.id}" data-tag-name="${esc(t.name)}">${esc(t.name)} <span class="jewd-text-muted">(${t.count})</span></div>`,
      )
      .join("");
    dropdown.classList.add("active");

    dropdown.querySelectorAll(".jewd-tag-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        addTagChip({ id: parseInt(opt.dataset.tagId), name: opt.dataset.tagName });
        $("#editTagInput").value = "";
        dropdown.innerHTML = "";
        dropdown.classList.remove("active");
      });
    });
  }

  function addTagChip(tag) {
    // Avoid duplicates.
    if (editTags.find((t) => t.name.toLowerCase() === tag.name.toLowerCase())) return;
    editTags.push(tag);
    const chips = $("#editTagsChips");
    if (!chips) return;
    const span = document.createElement("span");
    span.className = "jewd-tag-chip";
    span.dataset.tagId = tag.id;
    span.innerHTML = `${esc(tag.name)} <button type="button" class="jewd-tag-remove" data-tag-id="${tag.id}">✕</button>`;
    span.querySelector(".jewd-tag-remove").addEventListener("click", (e) => {
      e.preventDefault();
      editTags = editTags.filter((t) => t.name !== tag.name);
      span.remove();
    });
    chips.appendChild(span);
  }

  /* ===== EDIT IMAGE HANDLERS ===== */

  /** State for images being edited (tracks adds/removes/reorder). */
  let editImages = []; // [{id, src, file?, isNew?}]
  let editVarImages = {}; // vidx -> {id?, file?, src}

  function initEditImageHandlers(p) {
    // Initialize image state from product.
    editImages = (p.images || []).map((img) => ({
      id: img.id,
      src: normalizeMediaUrl(img.src),
    }));
    editVarImages = {};

    const zone = $("#editImageZone");
    const addBtn = $("#editImageAdd");
    const fileInput = $("#editImageInput");

    // Click "add" button → trigger file input.
    if (addBtn && fileInput) {
      addBtn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", handleImageSelect);
    }

    // Click remove buttons.
    zone.querySelectorAll(".jewd-img-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const imgId = parseInt(btn.dataset.imgId);
        editImages = editImages.filter((img) => img.id !== imgId);
        btn.closest(".jewd-img-edit-card").remove();
        updateImageBadges();
      });
    });

    // Drag & drop reorder.
    initImageDragDrop(zone);

    // Variation image handlers.
    const varThumbs = $$(
      "#editModalBody .jewd-var-img-thumb, #editModalBody .jewd-var-img-placeholder",
    );
    varThumbs.forEach((el) => {
      el.addEventListener("click", () => {
        const vidx = el.dataset.vidx;
        const input = $$(`.jewd-var-img-input[data-vidx="${vidx}"]`)[0];
        if (input) input.click();
      });
    });

    $$("#editModalBody .jewd-var-img-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const vidx = input.dataset.vidx;
        const reader = new FileReader();
        reader.onload = (ev) => {
          editVarImages[vidx] = { file, src: ev.target.result };
          // Update visual preview.
          const td = input.closest("td");
          const existing = td.querySelector(".jewd-var-img-thumb");
          const placeholder = td.querySelector(".jewd-var-img-placeholder");
          if (existing) {
            existing.src = ev.target.result;
          } else if (placeholder) {
            const img = document.createElement("img");
            img.src = ev.target.result;
            img.className = "jewd-var-img-thumb";
            placeholder.replaceWith(img);
          }
        };
        reader.readAsDataURL(file);
      });
    });
  }

  function handleImageSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast("❌ " + file.name + " excede 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const tempId = "new_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        editImages.push({ id: tempId, src: ev.target.result, file, isNew: true });

        // Insert card before the add button.
        const addBtn = $("#editImageAdd");
        const card = document.createElement("div");
        card.className = "jewd-img-edit-card jewd-img-new";
        card.draggable = true;
        card.dataset.imgId = tempId;
        card.innerHTML = `
          <img src="${ev.target.result}" class="jewd-img-edit-thumb" alt="Nueva imagen">
          <div class="jewd-img-edit-actions">
            <span class="jewd-img-badge-sm jewd-img-badge-new">Nueva</span>
            <button type="button" class="jewd-img-remove-btn" data-img-id="${tempId}" title="Quitar imagen">✕</button>
          </div>`;

        card.querySelector(".jewd-img-remove-btn").addEventListener("click", (ev) => {
          ev.preventDefault();
          editImages = editImages.filter((img) => img.id !== tempId);
          card.remove();
          updateImageBadges();
        });

        addBtn.parentNode.insertBefore(card, addBtn);
        initImageDragDrop($("#editImageZone"));
        updateImageBadges();
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be re-selected.
    e.target.value = "";
  }

  function updateImageBadges() {
    const cards = $$("#editImageZone .jewd-img-edit-card");
    cards.forEach((card, i) => {
      const badge = card.querySelector(".jewd-img-badge-sm");
      if (badge && !badge.classList.contains("jewd-img-badge-new")) {
        badge.textContent = i === 0 ? "★ Principal" : "";
        badge.style.display = i === 0 ? "" : "none";
      }
      // Add principal badge if first and doesn't have one yet.
      if (i === 0 && !card.querySelector(".jewd-img-badge-sm:not(.jewd-img-badge-new)")) {
        const actions = card.querySelector(".jewd-img-edit-actions");
        if (actions && !actions.querySelector(".jewd-img-badge-sm:not(.jewd-img-badge-new)")) {
          const span = document.createElement("span");
          span.className = "jewd-img-badge-sm";
          span.textContent = "★ Principal";
          actions.prepend(span);
        }
      }
    });
  }

  /** Simple HTML5 drag & drop for image reorder. */
  function initImageDragDrop(zone) {
    if (!zone) return;
    let draggedEl = null;

    zone.querySelectorAll(".jewd-img-edit-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        draggedEl = card;
        card.classList.add("jewd-img-dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      card.addEventListener("dragend", () => {
        if (draggedEl) draggedEl.classList.remove("jewd-img-dragging");
        draggedEl = null;
        // Sync editImages order with DOM order.
        const ids = Array.from(zone.querySelectorAll(".jewd-img-edit-card")).map(
          (c) => c.dataset.imgId,
        );
        editImages.sort((a, b) => {
          const aStr = String(a.id);
          const bStr = String(b.id);
          return ids.indexOf(aStr) - ids.indexOf(bStr);
        });
        updateImageBadges();
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!draggedEl || draggedEl === card) return;
        const rect = card.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        if (e.clientX < mid) {
          zone.insertBefore(draggedEl, card);
        } else {
          zone.insertBefore(draggedEl, card.nextSibling);
        }
      });
    });
  }

  function editField(label, name, value, type, options) {
    let input;
    if (type === "select") {
      input = `<select class="jewd-edit-input" name="${name}">`;
      (options || []).forEach((o) => {
        input += `<option value="${esc(o.value)}"${o.value === value ? " selected" : ""}>${esc(o.label)}</option>`;
      });
      input += "</select>";
    } else if (type === "number") {
      input = `<input class="jewd-edit-input" type="number" step="0.01" name="${name}" value="${esc(String(value))}"/>`;
    } else {
      input = `<input class="jewd-edit-input" type="text" name="${name}" value="${esc(String(value))}"/>`;
    }
    return `<div class="jewd-edit-field">
            <label class="jewd-edit-label">${esc(label)}</label>
            ${input}
        </div>`;
  }

  function editFieldWide(label, name, value, type) {
    let input;
    if (type === "textarea") {
      input = `<textarea class="jewd-edit-input jewd-edit-textarea" name="${name}" rows="3">${esc(value)}</textarea>`;
    } else {
      input = `<input class="jewd-edit-input" type="text" name="${name}" value="${esc(value)}"/>`;
    }
    return `<div class="jewd-edit-field jewd-edit-wide">
            <label class="jewd-edit-label">${esc(label)}</label>
            ${input}
        </div>`;
  }

  async function saveProduct() {
    if (!editingProduct) return;
    const form = $("#editForm");
    if (!form) return;

    const btn = $("#editModalSave");
    btn.disabled = true;
    btn.textContent = "⏳ Guardando...";

    try {
      // Build product payload
      const fd = new FormData(form);
      const payload = {};
      const nameVal = fd.get("edit_name");
      if (nameVal !== editingProduct.name) payload.name = nameVal;

      const skuVal = fd.get("edit_sku");
      if (skuVal !== (editingProduct.sku || "")) payload.sku = skuVal;

      const statusVal = fd.get("edit_status");
      if (statusVal !== editingProduct.status) payload.status = statusVal;

      const weightVal = fd.get("edit_weight");
      if (weightVal !== (editingProduct.weight || "")) payload.weight = weightVal;

      const descVal = fd.get("edit_short_description");
      if (descVal !== (editingProduct.short_description || "")) payload.short_description = descVal;

      // Full description.
      const descFull = fd.get("edit_description");
      if (descFull !== (editingProduct.description || "")) payload.description = descFull;

      // ---- CATEGORIES ----
      const checkedCats = Array.from(form.querySelectorAll('input[name="edit_cat"]:checked')).map(
        (cb) => ({ id: parseInt(cb.value) }),
      );
      const origCatIds = (editingProduct.categories || []).map((c) => c.id).sort();
      const newCatIds = checkedCats.map((c) => c.id).sort();
      if (JSON.stringify(origCatIds) !== JSON.stringify(newCatIds)) {
        payload.categories = checkedCats;
      }

      // ---- TAGS ----
      const origTagNames = (editingProduct.tags || []).map((t) => t.name.toLowerCase()).sort();
      const newTagNames = editTags.map((t) => t.name.toLowerCase()).sort();
      if (JSON.stringify(origTagNames) !== JSON.stringify(newTagNames)) {
        // Tags with id:0 are new — WC will create them by name.
        payload.tags = editTags.map((t) => (t.id ? { id: t.id } : { name: t.name }));
      }

      // ---- ATTRIBUTES ----
      const attrInputs = form.querySelectorAll(".jewd-attr-edit-input");
      if (attrInputs.length) {
        const newAttrs = [];
        let attrsChanged = false;
        attrInputs.forEach((input, ai) => {
          const newOpts = input.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const origOpts = (editingProduct.attributes[ai]?.options || []).map((o) =>
            String(o).trim(),
          );
          const attrName = input.dataset.attrName;
          const isVar = input.dataset.attrVariation === "1";
          if (JSON.stringify(newOpts.slice().sort()) !== JSON.stringify(origOpts.slice().sort())) {
            attrsChanged = true;
          }
          newAttrs.push({
            name: attrName,
            options: newOpts,
            visible: true,
            variation: isVar,
          });
        });
        if (attrsChanged) {
          payload.attributes = newAttrs;
        }
      }

      if (editingProduct.type === "simple") {
        const rpVal = fd.get("edit_regular_price");
        if (rpVal !== (editingProduct.regular_price || "")) payload.regular_price = rpVal;
        const spVal = fd.get("edit_sale_price");
        if (spVal !== (editingProduct.sale_price || "")) payload.sale_price = spVal;
        const sqVal = fd.get("edit_stock_quantity");
        const curStock = editingProduct.stock_quantity ?? "";
        if (sqVal !== String(curStock)) {
          payload.stock_quantity = sqVal === "" ? null : parseInt(sqVal, 10);
          payload.manage_stock = sqVal !== "";
        }
      }

      // ---- IMAGE MANAGEMENT ----
      // Upload new images first, then build the images array.
      let imgUploaded = 0;
      const finalImages = [];
      for (let i = 0; i < editImages.length; i++) {
        const img = editImages[i];
        if (img.isNew && img.file) {
          btn.textContent = `⏳ Subiendo imagen ${imgUploaded + 1}...`;
          try {
            const result = await JewdAPI.uploadImage(img.file);
            finalImages.push({ id: result.data.id });
            imgUploaded++;
          } catch (uploadErr) {
            toast("❌ Error subiendo imagen: " + uploadErr.message);
            console.error("Image upload failed:", uploadErr);
            throw uploadErr;
          }
        } else {
          // Existing image — keep by ID.
          finalImages.push({ id: img.id });
        }
      }

      // Compare images: check if order changed, images added, or images removed.
      const origIds = (editingProduct.images || []).map((img) => img.id);
      const newIds = finalImages.map((img) => img.id);
      const imagesChanged =
        origIds.length !== newIds.length || origIds.some((id, idx) => id !== newIds[idx]);

      if (imagesChanged) {
        payload.images = finalImages;
      }

      // Save product if changed
      let saved = false;
      if (Object.keys(payload).length > 0) {
        btn.textContent = "⏳ Guardando producto...";
        await JewdAPI.updateProduct(editingProduct.id, payload);
        saved = true;
      }

      // Save variations if changed
      const vs = state.variations[editingProduct.id] || [];
      let vSaved = 0;
      for (let vi = 0; vi < vs.length; vi++) {
        const v = vs[vi];
        const vPayload = {};
        const vSku = fd.get(`v_sku_${vi}`);
        if (vSku !== (v.sku || "")) vPayload.sku = vSku;
        const vRp = fd.get(`v_regular_price_${vi}`);
        if (vRp !== (v.regular_price || v.price || "")) vPayload.regular_price = vRp;
        const vSp = fd.get(`v_sale_price_${vi}`);
        if (vSp !== (v.sale_price || "")) vPayload.sale_price = vSp;
        const vSq = fd.get(`v_stock_quantity_${vi}`);
        const curVStock = v.stock_quantity ?? "";
        if (vSq !== String(curVStock)) {
          vPayload.stock_quantity = vSq === "" ? null : parseInt(vSq, 10);
          vPayload.manage_stock = vSq !== "";
        }
        const vWt = fd.get(`v_weight_${vi}`);
        if (vWt !== (v.weight || "")) vPayload.weight = vWt;

        // Variation image upload.
        if (editVarImages[vi] && editVarImages[vi].file) {
          btn.textContent = `⏳ Subiendo imagen variación ${vi + 1}...`;
          try {
            const vImgResult = await JewdAPI.uploadImage(editVarImages[vi].file);
            vPayload.image = { id: vImgResult.data.id };
          } catch (vImgErr) {
            console.error("Variation image upload failed:", vImgErr);
            toast("⚠️ Error subiendo imagen de variación " + (vi + 1));
          }
        }

        if (Object.keys(vPayload).length > 0) {
          btn.textContent = `⏳ Guardando variación ${vi + 1}/${vs.length}...`;
          await JewdAPI.updateVariation(editingProduct.id, v.id, vPayload);
          vSaved++;
        }
      }

      // Build summary message.
      const parts = [];
      if (saved) parts.push("producto");
      if (imgUploaded > 0)
        parts.push(
          imgUploaded +
            " imagen" +
            (imgUploaded > 1 ? "es" : "") +
            " subida" +
            (imgUploaded > 1 ? "s" : ""),
        );
      if (imagesChanged && imgUploaded === 0) parts.push("imágenes reordenadas");
      if (vSaved > 0) parts.push(vSaved + " variacion" + (vSaved > 1 ? "es" : ""));

      if (parts.length > 0) {
        toast("✅ Guardado: " + parts.join(" + "));
        // Refresh data
        delete state.variations[editingProduct.id];
        await loadProducts();
        loadStats();
      } else {
        toast("Sin cambios");
      }

      closeEditModal();
    } catch (e) {
      toast("❌ Error: " + e.message);
      console.error("Save failed:", e);
    } finally {
      btn.disabled = false;
      btn.textContent = "💾 Guardar Cambios";
    }
  }

  function closeEditModal() {
    $("#editModal").classList.remove("active");
    editingProduct = null;
  }

  /* ===== NEW PRODUCT WIZARD (F3-UI-01) ===== */
  function openNewProductWizard() {
    let wizardStep = 0;
    const wizardData = {
      type: "simple",
      name: "",
      sku: "",
      short_description: "",
      regular_price: "",
      sale_price: "",
      manage_stock: true,
      stock_quantity: "",
      weight: "",
      categories: [],
      images: [],
      imageFiles: [],
    };

    const overlay = document.createElement("div");
    overlay.className = "jewd-modal active";
    overlay.innerHTML = `
      <div class="jewd-modal-dialog jewd-modal-lg">
        <div class="jewd-modal-header">
          <h2>➕ Nuevo Producto</h2>
          <button class="jewd-modal-close" id="wizardClose">&times;</button>
        </div>
        <div class="jewd-modal-body" style="padding:20px">
          <div class="jewd-wizard-steps">
            <div class="jewd-wizard-step active" data-step="0">① Datos</div>
            <div class="jewd-wizard-step" data-step="1">② Precios</div>
            <div class="jewd-wizard-step" data-step="2">③ Imágenes</div>
          </div>

          <!-- Step 0: Basic Data -->
          <div class="jewd-wizard-panel active" id="wizStep0">
            <div class="jewd-wizard-type-grid">
              <div class="jewd-wizard-type-card selected" data-type="simple">
                <div class="icon">📦</div>
                <div class="label">Simple</div>
                <div class="desc">Producto sin variaciones</div>
              </div>
              <div class="jewd-wizard-type-card" data-type="variable">
                <div class="icon">🔀</div>
                <div class="label">Variable</div>
                <div class="desc">Con tallas, colores, etc.</div>
              </div>
            </div>
            <div class="jewd-edit-field jewd-edit-wide"><label class="jewd-edit-label">Nombre *</label><input class="jewd-edit-input" id="wizName" placeholder="Nombre del producto"></div>
            <div class="jewd-edit-field jewd-edit-wide"><label class="jewd-edit-label">SKU</label><input class="jewd-edit-input" id="wizSku" placeholder="Código único (opcional)"></div>
            <div class="jewd-edit-field jewd-edit-wide"><label class="jewd-edit-label">Descripción corta</label><textarea class="jewd-edit-input jewd-edit-textarea" id="wizDesc" rows="3" placeholder="Breve descripción..."></textarea></div>
            <div class="jewd-edit-section" style="margin-top:12px">
              <div class="jewd-edit-section-title">Categorías</div>
              <div class="jewd-cat-grid" id="wizCatGrid">
                ${state.categories.map((c) => `<label class="jewd-cat-checkbox"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join("")}
              </div>
            </div>
          </div>

          <!-- Step 1: Pricing -->
          <div class="jewd-wizard-panel" id="wizStep1">
            <div class="jewd-edit-field jewd-edit-wide"><label class="jewd-edit-label">Precio regular *</label><input class="jewd-edit-input" id="wizPrice" type="number" step="0.01" placeholder="0.00"></div>
            <div class="jewd-edit-field jewd-edit-wide"><label class="jewd-edit-label">Precio oferta</label><input class="jewd-edit-input" id="wizSalePrice" type="number" step="0.01" placeholder="0.00 (opcional)"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="jewd-edit-field"><label class="jewd-edit-label">Stock</label><input class="jewd-edit-input" id="wizStock" type="number" placeholder="Cantidad"></div>
              <div class="jewd-edit-field"><label class="jewd-edit-label">Peso (oz)</label><input class="jewd-edit-input" id="wizWeight" placeholder="0.00"></div>
            </div>
          </div>

          <!-- Step 2: Images -->
          <div class="jewd-wizard-panel" id="wizStep2">
            <div class="jewd-edit-section-title">Imágenes del producto</div>
            <p style="color:var(--jewd-text2);font-size:.82rem;margin:0 0 12px">
              Arrastra imágenes aquí o haz clic para seleccionar.
            </p>
            <div id="wizImageDropzone" class="jewd-img-dropzone" style="border:2px dashed var(--jewd-border);border-radius:8px;padding:30px;text-align:center;cursor:pointer;min-height:100px">
              <span style="font-size:2rem">📷</span><br>
              <span style="color:var(--jewd-text2)">Click o arrastra imágenes</span>
              <input type="file" id="wizImageInput" accept="image/*" multiple style="display:none">
            </div>
            <div id="wizImagePreview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"></div>
          </div>
        </div>
        <div class="jewd-wizard-footer">
          <button class="jewd-btn jewd-btn-outline" id="wizPrev" style="visibility:hidden">← Anterior</button>
          <button class="jewd-btn jewd-btn-gold" id="wizNext">Siguiente →</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Type selection.
    overlay.querySelectorAll(".jewd-wizard-type-card").forEach((card) => {
      card.addEventListener("click", () => {
        overlay
          .querySelectorAll(".jewd-wizard-type-card")
          .forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        wizardData.type = card.dataset.type;
      });
    });

    // Image dropzone.
    const dropzone = overlay.querySelector("#wizImageDropzone");
    const fileInput = overlay.querySelector("#wizImageInput");
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--jewd-accent)";
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.style.borderColor = "var(--jewd-border)";
    });
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--jewd-border)";
      addWizardImages(Array.from(e.dataTransfer.files));
    });
    fileInput.addEventListener("change", () => {
      addWizardImages(Array.from(fileInput.files));
      fileInput.value = "";
    });

    function addWizardImages(files) {
      files
        .filter((f) => f.type.startsWith("image/"))
        .forEach((f) => {
          wizardData.imageFiles.push(f);
          const reader = new FileReader();
          reader.onload = (e) => {
            const wrap = document.createElement("div");
            wrap.style.cssText =
              "position:relative;width:70px;height:70px;border-radius:6px;overflow:hidden";
            wrap.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">
            <button style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;line-height:18px;text-align:center" data-rmidx="${wizardData.imageFiles.length - 1}">×</button>`;
            wrap.querySelector("button").addEventListener("click", (ev) => {
              const idx = parseInt(ev.target.dataset.rmidx);
              wizardData.imageFiles[idx] = null;
              wrap.remove();
            });
            overlay.querySelector("#wizImagePreview").appendChild(wrap);
          };
          reader.readAsDataURL(f);
        });
    }

    // Navigation.
    function goToStep(step) {
      wizardStep = step;
      overlay.querySelectorAll(".jewd-wizard-panel").forEach((p, i) => {
        p.classList.toggle("active", i === step);
      });
      overlay.querySelectorAll(".jewd-wizard-step").forEach((s, i) => {
        s.classList.remove("active", "done");
        if (i === step) s.classList.add("active");
        else if (i < step) s.classList.add("done");
      });
      overlay.querySelector("#wizPrev").style.visibility = step === 0 ? "hidden" : "visible";
      overlay.querySelector("#wizNext").textContent =
        step === 2 ? "💾 Crear Producto" : "Siguiente →";
    }

    overlay.querySelector("#wizPrev").addEventListener("click", () => {
      if (wizardStep > 0) goToStep(wizardStep - 1);
    });

    overlay.querySelector("#wizNext").addEventListener("click", async () => {
      if (wizardStep < 2) {
        // Validate step 0.
        if (wizardStep === 0) {
          const name = overlay.querySelector("#wizName").value.trim();
          if (!name) {
            toast("⚠️ El nombre es obligatorio");
            return;
          }
          wizardData.name = name;
          wizardData.sku = overlay.querySelector("#wizSku").value.trim();
          wizardData.short_description = overlay.querySelector("#wizDesc").value.trim();
          wizardData.categories = Array.from(
            overlay.querySelectorAll("#wizCatGrid input:checked"),
          ).map((cb) => ({ id: parseInt(cb.value) }));
        }
        // Validate step 1.
        if (wizardStep === 1) {
          const price = overlay.querySelector("#wizPrice").value.trim();
          if (wizardData.type === "simple" && !price) {
            toast("⚠️ El precio es obligatorio para productos simples");
            return;
          }
          wizardData.regular_price = price;
          wizardData.sale_price = overlay.querySelector("#wizSalePrice").value.trim();
          wizardData.stock_quantity = overlay.querySelector("#wizStock").value.trim();
          wizardData.weight = overlay.querySelector("#wizWeight").value.trim();
        }
        goToStep(wizardStep + 1);
      } else {
        // Create product.
        await createNewProduct(wizardData, overlay);
      }
    });

    // Close.
    overlay.querySelector("#wizardClose").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  async function createNewProduct(data, overlay) {
    const btn = overlay.querySelector("#wizNext");
    btn.disabled = true;
    btn.textContent = "⏳ Creando...";

    try {
      // Upload images first.
      const uploadedImages = [];
      const validFiles = data.imageFiles.filter((f) => f !== null);
      for (let i = 0; i < validFiles.length; i++) {
        toast(`📷 Subiendo imagen ${i + 1}/${validFiles.length}...`);
        const result = await JewdAPI.uploadImage(validFiles[i]);
        uploadedImages.push({ id: result.data.id });
      }

      const productData = {
        name: data.name,
        type: data.type,
        status: "draft",
        short_description: data.short_description,
        regular_price: data.regular_price || undefined,
        sale_price: data.sale_price || undefined,
        manage_stock: data.manage_stock,
        stock_quantity: data.stock_quantity ? parseInt(data.stock_quantity) : null,
        weight: data.weight || undefined,
        categories: data.categories,
        images: uploadedImages,
      };

      if (data.sku) productData.sku = data.sku;

      // Remove undefined values.
      Object.keys(productData).forEach((k) => {
        if (productData[k] === undefined) delete productData[k];
      });

      toast("💾 Creando producto...");
      const result = await JewdAPI.createProduct(productData);
      overlay.remove();
      toast(`✅ Producto creado: "${result.data.name}" (ID: ${result.data.id})`);

      // Refresh and open edit modal for the new product.
      await loadProducts();
      loadStats();

      // Open the newly created product in edit modal.
      const newProduct = state.products.find((p) => p.id === result.data.id);
      if (newProduct) showEditModal(newProduct);
    } catch (err) {
      console.error("Create product failed:", err);
      toast("❌ Error al crear: " + err.message);
      btn.disabled = false;
      btn.textContent = "💾 Crear Producto";
    }
  }

  /* ===== BULK ACTIONS (F3-UI-03) ===== */
  let selectedProducts = new Set();

  function initBulkActions() {
    const selectAll = $("#selectAll");
    if (selectAll) {
      selectAll.addEventListener("change", () => {
        const checked = selectAll.checked;
        $$(".jewd-row-check[data-id]").forEach((cb) => {
          cb.checked = checked;
          const id = parseInt(cb.dataset.id);
          if (checked) selectedProducts.add(id);
          else selectedProducts.delete(id);
        });
        updateBulkBar();
      });
    }

    // Delegate checkbox changes in table.
    $("#productsTable").addEventListener("change", (e) => {
      if (e.target.classList.contains("jewd-row-check")) {
        const id = parseInt(e.target.dataset.id);
        if (e.target.checked) selectedProducts.add(id);
        else selectedProducts.delete(id);
        updateBulkBar();
      }
    });

    // Bulk action buttons.
    const bind = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener("click", fn);
    };
    bind("#bulkChangeStatus", bulkChangeStatus);
    bind("#bulkChangePrice", bulkChangePrice);
    bind("#bulkChangeStock", bulkChangeStock);
    bind("#bulkDelete", bulkDeleteProducts);
    bind("#bulkCancel", () => {
      selectedProducts.clear();
      $$(".jewd-row-check").forEach((cb) => (cb.checked = false));
      updateBulkBar();
    });
  }

  function updateBulkBar() {
    const bar = $("#bulkBar");
    const count = selectedProducts.size;
    if (bar) {
      bar.classList.toggle("active", count > 0);
      const countEl = $("#bulkCount");
      if (countEl) countEl.textContent = `${count} seleccionado${count !== 1 ? "s" : ""}`;
    }
  }

  async function bulkChangeStatus() {
    const status = prompt("Nuevo estado:\n• publish\n• draft\n• private\n• trash");
    if (!status || !["publish", "draft", "private", "trash"].includes(status)) return;
    await executeBulkAction("Estado → " + status, (id) => JewdAPI.updateProductStatus(id, status));
  }

  async function bulkChangePrice() {
    const input = prompt("Cambiar precio:\n• Número fijo: 99.99\n• Porcentaje: +10% o -15%");
    if (!input) return;

    const isPercent = /^[+-]\d+(\.\d+)?%$/.test(input.trim());

    await executeBulkAction("Precio", async (id) => {
      if (isPercent) {
        const pct = parseFloat(input) / 100;
        const product = state.products.find((p) => p.id === id);
        if (!product) return;
        const currentPrice = parseFloat(product.regular_price) || parseFloat(product.price) || 0;
        const newPrice = (currentPrice * (1 + pct)).toFixed(2);
        return JewdAPI.updateProduct(id, { regular_price: newPrice });
      } else {
        return JewdAPI.updateProduct(id, { regular_price: input.trim() });
      }
    });
  }

  async function bulkChangeStock() {
    const input = prompt("Nuevo stock (número):\nEj: 10");
    const qty = parseInt(input);
    if (isNaN(qty)) return;
    await executeBulkAction("Stock → " + qty, (id) =>
      JewdAPI.updateProduct(id, { manage_stock: true, stock_quantity: qty }),
    );
  }

  async function bulkDeleteProducts() {
    if (!confirm(`¿Mover ${selectedProducts.size} productos a la papelera?`)) return;
    await executeBulkAction("Papelera", (id) => JewdAPI.updateProductStatus(id, "trash"));
  }

  async function executeBulkAction(label, actionFn) {
    const ids = Array.from(selectedProducts);
    const total = ids.length;
    let done = 0;
    let errors = 0;

    toast(`⏳ ${label}: 0/${total}...`);

    for (const id of ids) {
      try {
        await actionFn(id);
        done++;
      } catch (e) {
        errors++;
        console.error(`Bulk ${label} failed for ${id}:`, e);
      }
      toast(`⏳ ${label}: ${done + errors}/${total}...`);
    }

    selectedProducts.clear();
    $$(".jewd-row-check").forEach((cb) => (cb.checked = false));
    updateBulkBar();

    toast(`✅ ${label}: ${done} OK${errors ? `, ${errors} errores` : ""}`);
    await loadProducts();
    loadStats();
  }

  /* ===== DUPLICATE PRODUCT ===== */
  async function duplicateProduct(p) {
    if (!confirm(`¿Duplicar "${p.name}"?\nSe creará una copia en borrador.`)) return;

    toast("📋 Duplicando producto...");
    try {
      // Build new product data from the original.
      const newData = {
        name: p.name + " (copia)",
        type: p.type || "simple",
        status: "draft",
        catalog_visibility: p.catalog_visibility || "visible",
        description: p.description || "",
        short_description: p.short_description || "",
        sku: p.sku ? p.sku + "-COPY" : "",
        regular_price: p.regular_price || "",
        sale_price: p.sale_price || "",
        manage_stock: p.manage_stock || false,
        stock_quantity: p.stock_quantity ?? null,
        stock_status: p.stock_status || "instock",
        weight: p.weight || "",
        categories: (p.categories || []).map((c) => ({ id: c.id })),
        tags: (p.tags || []).map((t) => ({ id: t.id })),
        attributes: (p.attributes || []).map((a) => ({
          name: a.name,
          options: a.options || [],
          visible: true,
          variation: a.variation || false,
        })),
        // Copy images by referencing existing media IDs.
        images: (p.images || []).map((img) => ({ id: img.id })),
      };

      // Remove empty SKU to avoid conflicts.
      if (!newData.sku) delete newData.sku;

      const result = await JewdAPI.createProduct(newData);
      toast(`✅ Producto duplicado: ID ${result.data.id} (borrador)`);

      // Refresh product list.
      await loadProducts();
    } catch (err) {
      console.error("Duplicate failed:", err);
      toast("❌ Error al duplicar: " + err.message);
    }
  }

  /* ===== DELETE / TRASH / RESTORE ===== */
  async function deleteProductAction(p) {
    if (!p) return;
    const action = await showDeleteConfirm(p);
    if (!action) return;

    try {
      if (action === "trash") {
        toast("🗑 Moviendo a papelera...");
        await JewdAPI.updateProductStatus(p.id, "trash");
        toast(`✅ "${p.name}" movido a papelera`);
      } else if (action === "permanent") {
        toast("💀 Eliminando permanentemente...");
        await JewdAPI.deleteProduct(p.id, true);
        toast(`✅ "${p.name}" eliminado permanentemente`);
      }
      await loadProducts();
      loadStats();
    } catch (err) {
      console.error("Delete failed:", err);
      toast("❌ Error al eliminar: " + err.message);
    }
  }

  async function restoreProduct(p) {
    if (!p) return;
    if (!confirm(`¿Restaurar "${p.name}"?\nVolverá a estado borrador.`)) return;

    try {
      toast("♻️ Restaurando...");
      await JewdAPI.updateProductStatus(p.id, "draft");
      toast(`✅ "${p.name}" restaurado como borrador`);
      await loadProducts();
      loadStats();
    } catch (err) {
      console.error("Restore failed:", err);
      toast("❌ Error al restaurar: " + err.message);
    }
  }

  async function permanentDeleteProduct(p) {
    if (!p) return;
    if (!confirm(`⚠️ ELIMINAR PERMANENTEMENTE "${p.name}"?\n\nEsta acción NO se puede deshacer.`))
      return;

    try {
      toast("💀 Eliminando...");
      await JewdAPI.deleteProduct(p.id, true);
      toast(`✅ "${p.name}" eliminado permanentemente`);
      await loadProducts();
      loadStats();
    } catch (err) {
      console.error("Permanent delete failed:", err);
      toast("❌ Error: " + err.message);
    }
  }

  /**
   * Show delete confirmation modal with two options.
   * Returns: 'trash' | 'permanent' | null
   */
  function showDeleteConfirm(p) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "jewd-modal active";
      overlay.style.zIndex = "10001";
      overlay.innerHTML = `
        <div class="jewd-modal-dialog jewd-modal-sm">
          <div class="jewd-modal-header">
            <h2>🗑 Eliminar Producto</h2>
            <button class="jewd-modal-close" data-action="close">&times;</button>
          </div>
          <div class="jewd-modal-body" style="padding:20px">
            <p style="margin:0 0 16px;font-size:.95rem">
              ¿Qué deseas hacer con <strong>${esc(p.name)}</strong>?
            </p>
            <div style="display:flex;flex-direction:column;gap:10px">
              <button class="jewd-btn jewd-btn-outline" data-action="trash" style="text-align:left;padding:12px 16px">
                🗑 <strong>Mover a papelera</strong>
                <br><span style="font-size:.78rem;color:var(--jewd-text2)">Se puede restaurar después</span>
              </button>
              <button class="jewd-btn jewd-btn-danger" data-action="permanent" style="text-align:left;padding:12px 16px">
                💀 <strong>Eliminar permanentemente</strong>
                <br><span style="font-size:.78rem;opacity:.8">No se puede deshacer</span>
              </button>
            </div>
          </div>
          <div class="jewd-modal-footer">
            <button class="jewd-btn jewd-btn-outline" data-action="close">Cancelar</button>
          </div>
        </div>
      `;

      function cleanup(action) {
        overlay.remove();
        resolve(action);
      }

      overlay.addEventListener("click", (e) => {
        const action = e.target.closest("[data-action]")?.dataset?.action;
        if (action === "close") cleanup(null);
        else if (action === "trash") cleanup("trash");
        else if (action === "permanent") cleanup("permanent");
        else if (e.target === overlay) cleanup(null);
      });

      document.body.appendChild(overlay);
    });
  }

  /* ===== IMAGE LIGHTBOX WITH NAVIGATION ===== */
  let lightboxImages = [];
  let lightboxIdx = 0;

  function showLightbox(images, startIdx) {
    lightboxImages = images || [];
    lightboxIdx = startIdx || 0;
    if (!lightboxImages.length) return;
    renderLightbox();
    $("#imgModal").classList.add("active");
  }

  function renderLightbox() {
    const src = lightboxImages[lightboxIdx] || "";
    $("#imgModalSrc").src = src;

    // Counter.
    let counter = $("#imgModalCounter");
    if (!counter) {
      counter = document.createElement("span");
      counter.id = "imgModalCounter";
      counter.className = "jewd-lightbox-counter";
      $("#imgModal").appendChild(counter);
    }
    counter.textContent =
      lightboxImages.length > 1 ? `${lightboxIdx + 1} / ${lightboxImages.length}` : "";

    // Navigation arrows.
    let prevBtn = $("#imgModalPrev");
    let nextBtn = $("#imgModalNext");
    if (!prevBtn) {
      prevBtn = document.createElement("button");
      prevBtn.id = "imgModalPrev";
      prevBtn.className = "jewd-lightbox-nav jewd-lightbox-prev";
      prevBtn.innerHTML = "‹";
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        lightboxIdx = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length;
        renderLightbox();
      });
      $("#imgModal").appendChild(prevBtn);

      nextBtn = document.createElement("button");
      nextBtn.id = "imgModalNext";
      nextBtn.className = "jewd-lightbox-nav jewd-lightbox-next";
      nextBtn.innerHTML = "›";
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        lightboxIdx = (lightboxIdx + 1) % lightboxImages.length;
        renderLightbox();
      });
      $("#imgModal").appendChild(nextBtn);
    }

    const multi = lightboxImages.length > 1;
    prevBtn.style.display = multi ? "" : "none";
    nextBtn.style.display = multi ? "" : "none";
  }

  /** Backwards-compat wrapper for single image (table thumbnail clicks). */
  function showImage(src) {
    showLightbox([src], 0);
  }

  /* ===== ORDERS MODULE (F4-UI-02/03) ===== */
  async function loadOrders() {
    if (state.ordersLoading) return;
    state.ordersLoading = true;

    const tb = $("#ordersTable");
    if (tb)
      tb.innerHTML =
        '<tr><td colspan="7" class="jewd-loading-row"><div class="jewd-spinner"></div> Cargando pedidos...</td></tr>';

    try {
      const searchVal = $("#orderSearch") ? $("#orderSearch").value : "";
      const statusVal = $("#orderStatusFilter") ? $("#orderStatusFilter").value : "";

      const res = await JewdAPI.getOrders({
        search: searchVal || undefined,
        status: statusVal || undefined,
        page: state.ordersPage,
        perPage: state.ordersPerPage,
      });

      state.orders = res.data;
      state.ordersTotal = res.total || res.data.length;
      state.ordersTotalPages = res.totalPages || 1;

      renderOrders();
      renderOrdersPagination();
      updateOrderFilterCount();
      updateOrderBadge();
    } catch (e) {
      if (tb)
        tb.innerHTML = `<tr><td colspan="7" class="jewd-loading-row">Error: ${esc(e.message)}</td></tr>`;
    } finally {
      state.ordersLoading = false;
    }
  }

  function renderOrders() {
    const tb = $("#ordersTable");
    if (!tb) return;

    if (!state.orders.length) {
      tb.innerHTML =
        '<tr><td colspan="7" class="jewd-empty">🔍<br>No se encontraron pedidos</td></tr>';
      return;
    }

    let html = "";
    state.orders.forEach((o) => {
      const name = o.billing
        ? `${o.billing.first_name || ""} ${o.billing.last_name || ""}`.trim()
        : "—";
      const email = o.billing ? o.billing.email || "" : "";
      const items = (o.line_items || []).length;
      const date = o.date_created ? o.date_created.split("T")[0] : "—";
      const statusLabel = orderStatusLabel(o.status);

      html += "<tr>";
      html += `<td><strong>#${o.id}</strong></td>`;
      html += `<td>${esc(name)}${email ? '<br><span class="jewd-text-sm">' + esc(email) + "</span>" : ""}</td>`;
      html += `<td class="jewd-center">${items}</td>`;
      html += `<td class="jewd-right"><strong>$${fmtN(o.total)}</strong></td>`;
      html += `<td><span class="jewd-order-status jewd-order-${esc(o.status)}">${statusLabel}</span></td>`;
      html += `<td>${esc(date)}</td>`;
      html += '<td class="jewd-center">';
      html += `<button class="jewd-action-btn" data-action="order-detail" data-order-id="${o.id}" title="Ver detalle">👁</button>`;
      html += `<button class="jewd-action-btn" data-action="order-status" data-order-id="${o.id}" title="Cambiar estado">📝</button>`;
      html += "</td></tr>";
    });

    tb.innerHTML = html;

    // Bind order action buttons.
    tb.querySelectorAll('[data-action="order-detail"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = state.orders.find((o) => o.id === parseInt(btn.dataset.orderId));
        if (order) showOrderDetail(order);
      });
    });

    tb.querySelectorAll('[data-action="order-status"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = state.orders.find((o) => o.id === parseInt(btn.dataset.orderId));
        if (order) changeOrderStatus(order);
      });
    });
  }

  function renderOrdersPagination() {
    const pg = $("#ordersPagination");
    if (!pg) return;
    if (state.ordersTotalPages <= 1) {
      pg.innerHTML = `<span>Mostrando ${state.orders.length} de ${state.ordersTotal} pedidos</span>`;
      return;
    }
    let html = `<span>Página ${state.ordersPage} de ${state.ordersTotalPages} (${state.ordersTotal} pedidos)</span> `;
    html += `<button ${state.ordersPage <= 1 ? "disabled" : ""} data-page="${state.ordersPage - 1}">« Anterior</button>`;
    const start = Math.max(1, state.ordersPage - 2);
    const end = Math.min(state.ordersTotalPages, state.ordersPage + 2);
    for (let i = start; i <= end; i++) {
      html += `<button data-page="${i}"${i === state.ordersPage ? ' class="active"' : ""}>${i}</button>`;
    }
    html += `<button ${state.ordersPage >= state.ordersTotalPages ? "disabled" : ""} data-page="${state.ordersPage + 1}">Siguiente »</button>`;
    pg.innerHTML = html;
    pg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.dataset.page);
        if (p && p !== state.ordersPage) {
          state.ordersPage = p;
          loadOrders();
        }
      });
    });
  }

  function updateOrderFilterCount() {
    const el = $("#orderFilterCount");
    if (el) el.textContent = `${state.ordersTotal} pedido${state.ordersTotal !== 1 ? "s" : ""}`;
  }

  function orderStatusLabel(status) {
    const labels = {
      pending: "Pendiente",
      processing: "Procesando",
      "on-hold": "En espera",
      completed: "Completado",
      cancelled: "Cancelado",
      refunded: "Reembolsado",
      failed: "Fallido",
      trash: "Papelera",
    };
    return labels[status] || status;
  }

  /** Show order detail modal (F4-UI-03). */
  async function showOrderDetail(order) {
    const modal = $("#orderDetailModal");
    if (!modal) return;
    $("#orderDetailTitle").textContent = `Pedido #${order.id}`;

    const b = order.billing || {};
    const s = order.shipping || {};
    const items = order.line_items || [];
    const date = order.date_created ? order.date_created.split("T")[0] : "—";

    let html = '<div class="jewd-order-detail-grid">';

    // Order info
    html += '<div class="jewd-order-info-card">';
    html += `<h4>📋 Información</h4>`;
    html += `<div class="jewd-detail-row"><strong>Estado:</strong> <span class="jewd-order-status jewd-order-${esc(order.status)}">${orderStatusLabel(order.status)}</span></div>`;
    html += `<div class="jewd-detail-row"><strong>Fecha:</strong> ${esc(date)}</div>`;
    html += `<div class="jewd-detail-row"><strong>Método de pago:</strong> ${esc(order.payment_method_title || "—")}</div>`;
    html += `<div class="jewd-detail-row"><strong>Moneda:</strong> ${esc(order.currency || "USD")}</div>`;
    html += "</div>";

    // Customer info
    html += '<div class="jewd-order-info-card">';
    html += `<h4>👤 Cliente</h4>`;
    html += `<div class="jewd-detail-row"><strong>Nombre:</strong> ${esc(b.first_name || "")} ${esc(b.last_name || "")}</div>`;
    html += `<div class="jewd-detail-row"><strong>Email:</strong> ${esc(b.email || "—")}</div>`;
    html += `<div class="jewd-detail-row"><strong>Teléfono:</strong> ${esc(b.phone || "—")}</div>`;
    if (b.address_1) {
      html += `<div class="jewd-detail-row"><strong>Dirección:</strong> ${esc(b.address_1)}${b.city ? ", " + esc(b.city) : ""}${b.state ? " " + esc(b.state) : ""} ${esc(b.postcode || "")}</div>`;
    }
    html += "</div>";

    // Shipping info
    if (s.address_1) {
      html += '<div class="jewd-order-info-card">';
      html += `<h4>📦 Envío</h4>`;
      html += `<div class="jewd-detail-row">${esc(s.first_name || "")} ${esc(s.last_name || "")}</div>`;
      html += `<div class="jewd-detail-row">${esc(s.address_1)}${s.city ? ", " + esc(s.city) : ""}${s.state ? " " + esc(s.state) : ""} ${esc(s.postcode || "")}</div>`;
      html += "</div>";
    }

    html += "</div>"; // end grid

    // Line items
    html += '<div class="jewd-order-items">';
    html += "<h4>🛍️ Artículos</h4>";
    html += '<table class="jewd-table" style="font-size:.85rem">';
    html +=
      '<thead><tr><th>Producto</th><th class="jewd-center">Cant.</th><th class="jewd-right">Precio</th><th class="jewd-right">Total</th></tr></thead><tbody>';
    items.forEach((item) => {
      html += "<tr>";
      html += `<td>${esc(item.name)}${item.sku ? '<br><span class="jewd-text-sm">SKU: ' + esc(item.sku) + "</span>" : ""}</td>`;
      html += `<td class="jewd-center">${item.quantity}</td>`;
      html += `<td class="jewd-right">$${fmtN(item.price)}</td>`;
      html += `<td class="jewd-right"><strong>$${fmtN(item.total)}</strong></td>`;
      html += "</tr>";
    });
    html += "</tbody></table>";
    html += "</div>";

    // Totals
    html += '<div class="jewd-order-totals">';
    html += `<div class="jewd-detail-row"><span>Subtotal:</span> <strong>$${fmtN(order.total - (parseFloat(order.shipping_total) || 0) - (parseFloat(order.total_tax) || 0))}</strong></div>`;
    if (parseFloat(order.shipping_total))
      html += `<div class="jewd-detail-row"><span>Envío:</span> <strong>$${fmtN(order.shipping_total)}</strong></div>`;
    if (parseFloat(order.total_tax))
      html += `<div class="jewd-detail-row"><span>Impuestos:</span> <strong>$${fmtN(order.total_tax)}</strong></div>`;
    if (parseFloat(order.discount_total))
      html += `<div class="jewd-detail-row"><span>Descuento:</span> <strong>-$${fmtN(order.discount_total)}</strong></div>`;
    html += `<div class="jewd-detail-row jewd-order-grand-total"><span>Total:</span> <strong>$${fmtN(order.total)}</strong></div>`;
    html += "</div>";

    // Status change buttons
    html += '<div class="jewd-order-actions">';
    html += "<h4>📝 Cambiar Estado</h4>";
    html += '<div class="jewd-order-status-btns">';
    const statuses = ["pending", "processing", "on-hold", "completed", "cancelled"];
    statuses.forEach((s) => {
      const isCurrent = s === order.status;
      html += `<button class="jewd-btn jewd-btn-sm ${isCurrent ? "jewd-btn-gold" : "jewd-btn-outline"}" data-new-status="${s}" data-order-id="${order.id}" ${isCurrent ? "disabled" : ""}>${orderStatusLabel(s)}</button>`;
    });
    html += "</div></div>";

    // Notes
    html += '<div class="jewd-order-notes" id="orderNotesSection">';
    html += "<h4>📝 Notas</h4>";
    html +=
      '<div id="orderNotesList" class="jewd-order-notes-list"><div class="jewd-loading-pulse">Cargando notas...</div></div>';
    html += '<div class="jewd-order-note-form">';
    html +=
      '<textarea class="jewd-edit-input jewd-edit-textarea" id="orderNoteInput" rows="2" placeholder="Agregar nota..."></textarea>';
    html += `<button class="jewd-btn jewd-btn-sm jewd-btn-outline" id="btnAddOrderNote" data-order-id="${order.id}">Agregar Nota</button>`;
    html += "</div></div>";

    $("#orderDetailBody").innerHTML = html;
    modal.classList.add("active");

    // Bind status change buttons.
    modal.querySelectorAll("[data-new-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const newStatus = btn.dataset.newStatus;
        const oid = parseInt(btn.dataset.orderId);
        try {
          toast("⏳ Cambiando estado...");
          await JewdAPI.updateOrder(oid, { status: newStatus });
          toast(`✅ Pedido #${oid} → ${orderStatusLabel(newStatus)}`);
          closeOrderDetailModal();
          loadOrders();
        } catch (e) {
          toast("❌ Error: " + e.message);
        }
      });
    });

    // Bind add note button.
    const noteBtn = $("#btnAddOrderNote");
    if (noteBtn) {
      noteBtn.addEventListener("click", async () => {
        const noteInput = $("#orderNoteInput");
        const note = noteInput ? noteInput.value.trim() : "";
        if (!note) return;
        try {
          await JewdAPI.createOrderNote(order.id, note);
          noteInput.value = "";
          toast("✅ Nota agregada");
          loadOrderNotes(order.id);
        } catch (e) {
          toast("❌ Error: " + e.message);
        }
      });
    }

    // Load notes async.
    loadOrderNotes(order.id);
  }

  async function loadOrderNotes(orderId) {
    const container = $("#orderNotesList");
    if (!container) return;
    try {
      const res = await JewdAPI.getOrderNotes(orderId);
      const notes = res.data || [];
      if (!notes.length) {
        container.innerHTML = '<p class="jewd-text-muted">Sin notas</p>';
        return;
      }
      let html = "";
      notes.forEach((n) => {
        const date = n.date_created ? n.date_created.split("T")[0] : "";
        html += `<div class="jewd-order-note ${n.customer_note ? "jewd-note-customer" : ""}">`;
        html += `<div class="jewd-note-text">${esc(n.note)}</div>`;
        html += `<div class="jewd-note-meta">${date}${n.customer_note ? " · Cliente" : " · Sistema"}</div>`;
        html += "</div>";
      });
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<p class="jewd-text-muted">Error cargando notas</p>';
    }
  }

  function closeOrderDetailModal() {
    const modal = $("#orderDetailModal");
    if (modal) modal.classList.remove("active");
  }

  async function changeOrderStatus(order) {
    const statuses = ["pending", "processing", "on-hold", "completed", "cancelled"];
    const labels = statuses.map((s) => `${s === order.status ? "► " : ""}${s}`);
    const choice = prompt(
      `Cambiar estado del pedido #${order.id}:\nActual: ${order.status}\n\nOpciones:\n${labels.join("\n")}\n\nEscribe el nuevo estado:`,
    );
    if (!choice || !statuses.includes(choice.trim())) return;
    try {
      toast("⏳ Cambiando estado...");
      await JewdAPI.updateOrder(order.id, { status: choice.trim() });
      toast(`✅ Pedido #${order.id} → ${orderStatusLabel(choice.trim())}`);
      loadOrders();
    } catch (e) {
      toast("❌ Error: " + e.message);
    }
  }

  /* ===== REPORTS MODULE (F4-UI-04) ===== */
  async function loadReports() {
    const days = state.reportPeriod;
    const now = new Date();
    const dateMax = now.toISOString().split("T")[0];
    const dateMinObj = new Date(now);
    dateMinObj.setDate(dateMinObj.getDate() - days);
    const dateMin = dateMinObj.toISOString().split("T")[0];

    // Load sales and top sellers in parallel.
    try {
      const [salesRes, topRes] = await Promise.all([
        JewdAPI.getReportSales({ dateMin, dateMax }).catch(() => ({ data: [] })),
        JewdAPI.getTopSellers({ period: days <= 7 ? "week" : "month" }).catch(() => ({ data: [] })),
      ]);

      state.reportData = salesRes.data;
      state.topSellers = topRes.data || [];

      renderReportSummary(salesRes.data);
      renderSalesChart(salesRes.data, dateMin, dateMax, days);
      renderTopSellers(topRes.data || []);
    } catch (e) {
      console.error("Reports load error:", e);
      toast("❌ Error cargando reportes");
    }
  }

  function renderReportSummary(data) {
    const el = $("#reportSummary");
    if (!el) return;

    // WC reports/sales returns an array with one element containing totals.
    const report = Array.isArray(data) && data.length ? data[0] : {};
    const totals = report.totals || {};

    // Aggregate from totals object (keyed by date).
    let totalSales = 0,
      totalOrders = 0,
      totalItems = 0;
    Object.values(totals).forEach((d) => {
      totalSales += parseFloat(d.sales || 0);
      totalOrders += parseInt(d.orders || 0);
      totalItems += parseInt(d.items || 0);
    });

    // Fallback to report-level data.
    if (!totalSales && report.total_sales) totalSales = parseFloat(report.total_sales);
    if (!totalOrders && report.total_orders) totalOrders = parseInt(report.total_orders);
    if (!totalItems && report.total_items) totalItems = parseInt(report.total_items);

    let html = "";
    html += `<div class="jewd-report-stat"><div class="jewd-report-stat-value">$${fmtN(totalSales)}</div><div class="jewd-report-stat-label">Ventas totales</div></div>`;
    html += `<div class="jewd-report-stat"><div class="jewd-report-stat-value">${totalOrders}</div><div class="jewd-report-stat-label">Pedidos</div></div>`;
    html += `<div class="jewd-report-stat"><div class="jewd-report-stat-value">${totalItems}</div><div class="jewd-report-stat-label">Artículos vendidos</div></div>`;
    html += `<div class="jewd-report-stat"><div class="jewd-report-stat-value">$${totalOrders ? fmtN(totalSales / totalOrders) : "0"}</div><div class="jewd-report-stat-label">Promedio por pedido</div></div>`;
    el.innerHTML = html;
  }

  function renderSalesChart(data, dateMin, dateMax, days) {
    const canvas = $("#salesChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    // Set canvas resolution.
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    ctx.clearRect(0, 0, W, H);

    // Extract daily sales from totals.
    const report = Array.isArray(data) && data.length ? data[0] : {};
    const totals = report.totals || {};

    // Build data points for each day.
    const points = [];
    const d = new Date(dateMin);
    const endDate = new Date(dateMax);
    while (d <= endDate) {
      const key = d.toISOString().split("T")[0];
      const val = totals[key] ? parseFloat(totals[key].sales || 0) : 0;
      points.push({ date: key, sales: val });
      d.setDate(d.getDate() + 1);
    }

    if (!points.length) {
      ctx.fillStyle =
        getComputedStyle(document.documentElement).getPropertyValue("--jewd-text2").trim() ||
        "#999";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Sin datos de ventas", W / 2, H / 2);
      return;
    }

    const maxSales = Math.max(...points.map((p) => p.sales), 1);
    const padLeft = 60,
      padRight = 20,
      padTop = 20,
      padBottom = 40;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;
    const barW = Math.max(4, (chartW / points.length) * 0.7);
    const gap = chartW / points.length;

    // Colors from CSS vars.
    const root = getComputedStyle(document.documentElement);
    const goldColor = root.getPropertyValue("--jewd-gold").trim() || "#d4a843";
    const textColor = root.getPropertyValue("--jewd-text2").trim() || "#999";
    const borderColor = root.getPropertyValue("--jewd-border").trim() || "#333";

    // Grid lines.
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(W - padRight, y);
      ctx.stroke();
      // Y-axis labels.
      ctx.fillStyle = textColor;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      const val = maxSales - (maxSales / 4) * i;
      ctx.fillText("$" + fmtN(val), padLeft - 8, y + 4);
    }

    // Bars.
    points.forEach((p, i) => {
      const x = padLeft + i * gap + (gap - barW) / 2;
      const barHeight = (p.sales / maxSales) * chartH;
      const y = padTop + chartH - barHeight;

      // Gradient bar.
      const grad = ctx.createLinearGradient(x, y, x, padTop + chartH);
      grad.addColorStop(0, goldColor);
      grad.addColorStop(1, goldColor + "44");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barHeight, [3, 3, 0, 0]);
      ctx.fill();

      // X-axis labels (show every Nth).
      const showLabel = points.length <= 10 || i % Math.ceil(points.length / 10) === 0;
      if (showLabel) {
        ctx.fillStyle = textColor;
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        const label = p.date.slice(5); // MM-DD
        ctx.fillText(label, x + barW / 2, H - 8);
      }
    });
  }

  function renderTopSellers(data) {
    const el = $("#topSellers");
    if (!el) return;

    if (!data.length) {
      el.innerHTML = '<p class="jewd-text-muted" style="padding:12px">Sin datos de ventas</p>';
      return;
    }

    let html = '<div class="jewd-top-list">';
    data.slice(0, 5).forEach((item, i) => {
      html += `<div class="jewd-top-item">`;
      html += `<span class="jewd-top-rank">${i + 1}</span>`;
      html += `<div class="jewd-top-info"><div class="jewd-top-name">${esc(item.name || "Producto #" + item.product_id)}</div><div class="jewd-top-meta">${item.quantity || 0} vendidos</div></div>`;
      html += "</div>";
    });
    html += "</div>";
    el.innerHTML = html;
  }

  /* ===== SETTINGS MODULE (F4-UI-05) ===== */
  async function loadSettingsPage() {
    // Load store settings, display API config, show system info, load origins.
    loadStoreSettings();
    renderAPISettings();
    loadSystemInfo();
    loadOriginsSettings();
  }

  async function loadStoreSettings() {
    const el = $("#settingsStore");
    if (!el) return;
    try {
      const res = await JewdAPI.getSettings("general");
      const settings = res.data || [];
      let html = '<div class="jewd-settings-list">';
      const importantSettings = [
        "woocommerce_store_address",
        "woocommerce_store_city",
        "woocommerce_default_country",
        "woocommerce_currency",
        "woocommerce_price_thousand_sep",
        "woocommerce_price_decimal_sep",
        "woocommerce_price_num_decimals",
      ];
      settings.forEach((s) => {
        if (
          !importantSettings.includes(s.id) &&
          !s.id.includes("currency") &&
          !s.id.includes("store")
        )
          return;
        const val = s.value || "—";
        html += `<div class="jewd-settings-row">`;
        html += `<span class="jewd-settings-label">${esc(s.label || s.id)}</span>`;
        html += `<span class="jewd-settings-value">${esc(String(val))}</span>`;
        html += "</div>";
      });
      html += "</div>";
      el.innerHTML = html || '<p class="jewd-text-muted">No hay configuraciones disponibles</p>';
    } catch (e) {
      el.innerHTML = `<p class="jewd-text-muted">Error: ${esc(e.message)}</p>`;
    }
  }

  function renderAPISettings() {
    const el = $("#settingsAPI");
    if (!el) return;
    const cfg = window.JEWD_CONFIG || {};
    const maskedKey = cfg.consumerKey
      ? cfg.consumerKey.slice(0, 8) + "..." + cfg.consumerKey.slice(-4)
      : "—";
    const maskedSecret = cfg.consumerSecret
      ? cfg.consumerSecret.slice(0, 8) + "..." + cfg.consumerSecret.slice(-4)
      : "—";

    let html = '<div class="jewd-settings-list">';
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">WC Base URL</span><span class="jewd-settings-value jewd-text-mono">${esc(cfg.wcBaseUrl || "—")}</span></div>`;
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">Consumer Key</span><span class="jewd-settings-value jewd-text-mono">${esc(maskedKey)}</span></div>`;
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">Consumer Secret</span><span class="jewd-settings-value jewd-text-mono">${esc(maskedSecret)}</span></div>`;
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">Per Page</span><span class="jewd-settings-value">${cfg.perPage || 50}</span></div>`;
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">Admin URL</span><span class="jewd-settings-value jewd-text-mono">${esc(cfg.adminUrl || "—")}</span></div>`;
    html += "</div>";
    html +=
      '<p class="jewd-edit-hint" style="margin-top:12px">Las API keys se configuran en el archivo <code>.env.js</code></p>';
    el.innerHTML = html;
  }

  async function loadSystemInfo() {
    const el = $("#settingsSystem");
    if (!el) return;
    try {
      const res = await JewdAPI.getSystemStatus();
      const d = res.data || {};
      const env = d.environment || {};
      const wp = d.settings || {};
      let html = '<div class="jewd-settings-list">';
      html += settingsRow("WordPress", env.wp_version || "—");
      html += settingsRow("WooCommerce", env.version || "—");
      html += settingsRow("PHP", env.php_version || "—");
      html += settingsRow("MySQL", env.mysql_version || "—");
      html += settingsRow("Memoria PHP", env.php_max_memory || "—");
      html += settingsRow("Moneda", wp.currency || "—");
      html += settingsRow("Tema activo", (d.active_plugins || []).length + " plugins activos");
      html += settingsRow("Dashboard", "v3.0.0");
      html += "</div>";
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = `<p class="jewd-text-muted">Error: ${esc(e.message)}</p>`;
    }
  }

  function settingsRow(label, value) {
    return `<div class="jewd-settings-row"><span class="jewd-settings-label">${esc(label)}</span><span class="jewd-settings-value">${esc(String(value))}</span></div>`;
  }

  /* ===== CORS ORIGINS MANAGEMENT (BE-04) ===== */
  async function loadOriginsSettings() {
    const el = $("#settingsOrigins");
    if (!el) return;
    try {
      const res = await JewdAPI.getOrigins();
      const data = res.data || {};
      const defaults = data.defaults || [];
      const custom = data.custom || [];

      let html = "";

      // Default origins (read-only).
      html += '<p class="jewd-text-muted" style="margin:0 0 8px">Origins por defecto (siempre activos):</p>';
      html += '<div class="jewd-origins-list jewd-origins-defaults">';
      defaults.forEach((o) => {
        html += `<div class="jewd-origin-row jewd-origin-default"><code>${esc(o)}</code> <span class="jewd-badge jewd-badge-default">default</span></div>`;
      });
      html += "</div>";

      // Custom origins (editable).
      html += '<p class="jewd-text-muted" style="margin:12px 0 8px">Origins personalizados:</p>';
      html += '<div id="originsCustomList" class="jewd-origins-list">';
      if (custom.length === 0) {
        html += '<p class="jewd-text-muted" style="font-style:italic">Ninguno configurado</p>';
      }
      custom.forEach((o, i) => {
        html += `<div class="jewd-origin-row" data-idx="${i}">`;
        html += `<code>${esc(o)}</code>`;
        html += `<button class="jewd-btn-icon jewd-btn-danger-sm" data-remove-origin="${i}" title="Eliminar">✕</button>`;
        html += "</div>";
      });
      html += "</div>";

      // Add new origin input.
      html += '<div class="jewd-origin-add" style="margin-top:10px;display:flex;gap:8px">';
      html += '<input type="url" id="newOriginInput" class="jewd-input" placeholder="https://example.com" style="flex:1">';
      html += '<button class="jewd-btn jewd-btn-sm" id="btnAddOrigin">+ Agregar</button>';
      html += "</div>";

      // Save button.
      html += '<div style="margin-top:12px;text-align:right">';
      html += '<button class="jewd-btn jewd-btn-primary jewd-btn-sm" id="btnSaveOrigins">💾 Guardar Origins</button>';
      html += "</div>";

      el.innerHTML = html;

      // Track custom origins in a local array for editing.
      el._customOrigins = [...custom];

      // Event: remove origin.
      el.querySelectorAll("[data-remove-origin]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.removeOrigin, 10);
          el._customOrigins.splice(idx, 1);
          loadOriginsSettings(); // Re-render.
        });
      });

      // Event: add origin.
      const btnAdd = $("#btnAddOrigin");
      const inputOrigin = $("#newOriginInput");
      if (btnAdd && inputOrigin) {
        btnAdd.addEventListener("click", () => {
          const val = inputOrigin.value.trim();
          if (!val) return;
          if (!/^https?:\/\/.+/.test(val)) {
            toast("⚠️ Origin debe comenzar con http:// o https://");
            return;
          }
          if (el._customOrigins.includes(val) || defaults.includes(val)) {
            toast("⚠️ Este origin ya existe");
            return;
          }
          el._customOrigins.push(val.replace(/\/+$/, ""));
          loadOriginsSettings();
        });
        inputOrigin.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            btnAdd.click();
          }
        });
      }

      // Event: save origins.
      const btnSave = $("#btnSaveOrigins");
      if (btnSave) {
        btnSave.addEventListener("click", async () => {
          btnSave.disabled = true;
          btnSave.textContent = "Guardando...";
          try {
            await JewdAPI.updateOrigins(el._customOrigins);
            toast("✅ Origins actualizados correctamente");
            loadOriginsSettings();
          } catch (err) {
            toast("❌ Error guardando origins: " + err.message);
          } finally {
            btnSave.disabled = false;
            btnSave.textContent = "💾 Guardar Origins";
          }
        });
      }
    } catch (e) {
      el.innerHTML = `<p class="jewd-text-muted">Error: ${esc(e.message)}</p>`;
    }
  }

  /* ===== EXPORT ===== */
  function exportJSON() {
    toast("Exportando JSON...");
    const data = state.products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      type: p.type,
      status: p.status,
      price: p.price,
      regular_price: p.regular_price,
      sale_price: p.sale_price,
      stock_status: p.stock_status,
      stock_quantity: p.stock_quantity,
      weight: p.weight,
      categories: (p.categories || []).map((c) => c.name),
      variations: (state.variations[p.id] || []).map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        stock_quantity: v.stock_quantity,
      })),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    download(blob, `jewelry-catalog-${dateStr()}.json`);
    toast(`JSON exportado: ${data.length} productos`);
  }

  function exportCSV() {
    toast("Exportando CSV...");
    const rows = [];
    rows.push(
      [
        "ID",
        "SKU",
        "Nombre",
        "Tipo",
        "Estado",
        "Precio",
        "Precio Regular",
        "Precio Oferta",
        "Stock",
        "Peso",
        "Categorías",
      ].join(","),
    );

    state.products.forEach((p) => {
      rows.push(
        [
          p.id,
          csvEsc(p.sku),
          csvEsc(p.name),
          p.type,
          p.status,
          p.price,
          p.regular_price,
          p.sale_price || "",
          p.stock_quantity ?? "",
          p.weight || "",
          csvEsc((p.categories || []).map((c) => c.name).join("; ")),
        ].join(","),
      );

      // Include variations.
      (state.variations[p.id] || []).forEach((v) => {
        const vAttr = v.attributes
          ? v.attributes.map((a) => `${a.name}:${a.option}`).join("; ")
          : "";
        rows.push(
          [
            v.id,
            csvEsc(v.sku),
            csvEsc("  ↳ " + vAttr),
            "variation",
            "",
            v.price,
            v.regular_price,
            v.sale_price || "",
            v.stock_quantity ?? "",
            v.weight || "",
            "",
          ].join(","),
        );
      });
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    download(blob, `jewelry-catalog-${dateStr()}.csv`);
    toast(`CSV exportado: ${rows.length - 1} registros`);
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ===== TOAST ===== */
  /* ===== TYPED TOAST (F5-UX-06) ===== */
  let toastTimer = null;
  function toast(msg, type) {
    const t = $("#toast");
    // Auto-detect type from emoji prefixes.
    if (!type) {
      if (msg.startsWith("✅")) type = "success";
      else if (msg.startsWith("❌")) type = "error";
      else if (msg.startsWith("⚠️")) type = "warning";
      else if (msg.startsWith("⏳") || msg.startsWith("📷") || msg.startsWith("💾")) type = "info";
    }
    t.className = "jewd-toast show";
    if (type) t.classList.add("jewd-toast-" + type);
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => {
        t.className = "jewd-toast";
      },
      type === "error" ? 5000 : 3000,
    );
  }

  /* ===== SKELETON LOADERS (F5-UX-01) ===== */
  function showStatSkeletons() {
    const el = $("#statsContainer");
    if (!el) return;
    let html = "";
    for (let i = 0; i < 8; i++) {
      html += '<div class="jewd-stat jewd-skeleton jewd-skeleton-stat"></div>';
    }
    el.innerHTML = html;
  }

  function showTableSkeleton(tbId, cols) {
    const tb = $(tbId || "#productsTable");
    if (!tb) return;
    let html = "";
    for (let i = 0; i < 8; i++) {
      html += "<tr>";
      for (let c = 0; c < (cols || 12); c++) {
        html +=
          '<td><div class="jewd-skeleton jewd-skeleton-text' +
          (c % 3 === 0 ? " short" : "") +
          '"></div></td>';
      }
      html += "</tr>";
    }
    tb.innerHTML = html;
  }

  /* ===== GENERIC CONFIRMATION MODAL (F5-UX-02) ===== */
  /**
   * Show a generic confirmation dialog.
   * @param {Object} opts - { title, message, confirmText, cancelText, danger }
   * @returns {Promise<boolean>}
   */
  function showConfirm(opts = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "jewd-confirm-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", opts.title || "Confirmación");
      overlay.innerHTML = `
        <div class="jewd-confirm-dialog">
          <div class="jewd-confirm-title">${esc(opts.title || "¿Estás seguro?")}</div>
          <div class="jewd-confirm-message">${esc(opts.message || "")}</div>
          <div class="jewd-confirm-actions">
            <button class="jewd-btn jewd-btn-outline" data-confirm="cancel">${esc(opts.cancelText || "Cancelar")}</button>
            <button class="jewd-btn ${opts.danger ? "jewd-btn-danger" : "jewd-btn-gold"}" data-confirm="ok">${esc(opts.confirmText || "Confirmar")}</button>
          </div>
        </div>
      `;

      function cleanup(result) {
        overlay.remove();
        resolve(result);
      }

      // Focus trap.
      const focusable = () => overlay.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          cleanup(false);
          return;
        }
        if (e.key === "Tab") {
          const els = focusable();
          if (!els.length) return;
          const first = els[0],
            last = els[els.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });

      overlay.addEventListener("click", (e) => {
        const action = e.target.closest("[data-confirm]")?.dataset?.confirm;
        if (action === "ok") cleanup(true);
        else if (action === "cancel" || e.target === overlay) cleanup(false);
      });

      document.body.appendChild(overlay);
      // Focus the confirm button.
      const confirmBtn = overlay.querySelector('[data-confirm="ok"]');
      if (confirmBtn) confirmBtn.focus();
    });
  }

  /* ===== FORM VALIDATION (F5-UX-03) ===== */
  function validateField(input, rules) {
    const field = input.closest(".jewd-edit-field") || input.parentElement;
    // Remove existing error.
    const existingErr = field.querySelector(".jewd-error-msg");
    if (existingErr) existingErr.remove();
    field.classList.remove("jewd-field-error", "jewd-field-valid");

    const value = input.value.trim();

    if (rules.required && !value) {
      field.classList.add("jewd-field-error");
      const err = document.createElement("span");
      err.className = "jewd-error-msg";
      err.textContent = rules.requiredMsg || "Este campo es obligatorio";
      field.appendChild(err);
      return false;
    }

    if (rules.min !== undefined && value && parseFloat(value) < rules.min) {
      field.classList.add("jewd-field-error");
      const err = document.createElement("span");
      err.className = "jewd-error-msg";
      err.textContent = `Valor mínimo: ${rules.min}`;
      field.appendChild(err);
      return false;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      field.classList.add("jewd-field-error");
      const err = document.createElement("span");
      err.className = "jewd-error-msg";
      err.textContent = rules.patternMsg || "Formato inválido";
      field.appendChild(err);
      return false;
    }

    if (value) field.classList.add("jewd-field-valid");
    return true;
  }

  function validateForm(form, rules) {
    let valid = true;
    for (const [name, fieldRules] of Object.entries(rules)) {
      const input = form.querySelector(`[name="${name}"]`);
      if (input && !validateField(input, fieldRules)) valid = false;
    }
    return valid;
  }

  /* ===== ACCESSIBILITY (F5-UX-04) ===== */
  function initAccessibility() {
    // Add skip link.
    const skipLink = document.createElement("a");
    skipLink.href = "#sectionProducts";
    skipLink.className = "jewd-skip-link";
    skipLink.textContent = "Saltar al contenido";
    document.body.prepend(skipLink);

    // Add aria-labels to icon-only buttons.
    $$(".jewd-action-btn").forEach((btn) => {
      if (!btn.getAttribute("aria-label") && btn.title) {
        btn.setAttribute("aria-label", btn.title);
      }
    });

    // Add role="dialog" and aria-modal to modals.
    $$(".jewd-modal").forEach((modal) => {
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
    });

    // Add landmark roles.
    const sidebar = $("#sidebar");
    if (sidebar) sidebar.setAttribute("role", "navigation");
    const main = $(".jewd-main");
    if (main) main.setAttribute("role", "main");

    // Focus trap for modals.
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const activeModal = $(".jewd-modal.active");
      if (!activeModal) return;

      const focusable = activeModal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ===== RESPONSIVE HELPERS (F5-UX-05) ===== */
  function addTableDataLabels() {
    // Add data-label attributes for responsive card layout.
    const headers = $$("#sectionProducts .jewd-table thead th");
    const labels = Array.from(headers).map((th) => th.textContent.trim());
    $$("#sectionProducts .jewd-table tbody tr.jewd-prow td").forEach((td, i) => {
      if (labels[i]) td.setAttribute("data-label", labels[i]);
    });
    // Orders table.
    const oHeaders = $$("#sectionOrders .jewd-table thead th");
    const oLabels = Array.from(oHeaders).map((th) => th.textContent.trim());
    $$("#sectionOrders .jewd-table tbody tr td").forEach((td, i) => {
      const colIdx = i % oLabels.length;
      if (oLabels[colIdx]) td.setAttribute("data-label", oLabels[colIdx]);
    });
  }

  /* ===== NOTIFICATIONS & ALERTS (F5-UX-06) ===== */
  let notificationSoundEnabled = false;

  function checkStockAlerts() {
    if (!state.products.length) return;
    const lowStock = state.products.filter((p) => {
      if (p.type === "variable") {
        const vs = state.variations[p.id] || [];
        const total = vs.reduce((s, v) => s + (v.stock_quantity || 0), 0);
        return total > 0 && total <= 3;
      }
      return p.stock_quantity !== null && p.stock_quantity > 0 && p.stock_quantity <= 3;
    });

    if (lowStock.length > 0) {
      toast(
        `⚠️ ${lowStock.length} producto${lowStock.length > 1 ? "s" : ""} con stock bajo (≤3)`,
        "warning",
      );
    }
  }

  function updateOrderBadge() {
    const badge = $("#ordersBadge");
    if (!badge) return;
    // Show badge for processing orders.
    const processing = state.orders.filter((o) => o.status === "processing").length;
    if (processing > 0) {
      badge.textContent = processing;
      badge.style.display = "inline-block";
    } else {
      badge.textContent = "";
      badge.style.display = "none";
    }
  }

  function playNotificationSound() {
    if (!notificationSoundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      /* ignore audio errors */
    }
  }

  /* ===== HELPERS ===== */
  function esc(s) {
    if (!s) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(s)));
    return div.innerHTML;
  }

  function fmtN(n) {
    const v = parseFloat(n);
    if (isNaN(v)) return "0";
    return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function csvEsc(s) {
    if (!s) return "";
    s = String(s);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function dateStr() {
    return new Date().toISOString().split("T")[0];
  }

  function getStoreOrigin() {
    const cfg = window.JEWD_CONFIG || {};
    const currentHost = window.location.hostname || "";

    if (currentHost.endsWith("dev.tujoyita.com")) {
      return "https://dev.tujoyita.com";
    }

    try {
      if (cfg.siteUrl) {
        return new URL(cfg.siteUrl).origin;
      }
    } catch (e) {}

    return window.location.origin;
  }

  function normalizeMediaUrl(url) {
    if (!url) {
      return "";
    }

    try {
      const parsed = new URL(url, window.location.origin);
      const localHosts = [
        "jewelry.local.dev",
        "dashboard.jewelry.local.dev",
        "localhost",
        "127.0.0.1",
      ];
      const isExternalPublic = (window.location.hostname || "").endsWith("dev.tujoyita.com");

      if (isExternalPublic && localHosts.includes(parsed.hostname)) {
        const storeOrigin = getStoreOrigin();
        return `${storeOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      return parsed.toString();
    } catch (e) {
      return url;
    }
  }
})();

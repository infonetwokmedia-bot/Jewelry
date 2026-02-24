/**
 * Jewelry Dashboard — Main Application
 * Standalone SPA — zero jQuery, zero WordPress dependency.
 * Uses WooCommerce REST API via JewdAPI layer.
 *
 * @version 2.0.0
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
  };

  /* ===== DOM REFS ===== */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ===== INIT ===== */
  document.addEventListener("DOMContentLoaded", async () => {
    const cfg = window.JEWD_CONFIG || {};
    state.perPage = cfg.perPage || 50;

    $("#versionTag").textContent = "v" + (cfg.version || "2.0.0");
    $("#btnWPAdmin").href = cfg.adminUrl || "#";

    initTheme();
    bindEvents();
    await testConnection();
    loadCategories();
    loadStats();
    loadProducts();
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

  /* ===== EVENTS ===== */
  function bindEvents() {
    $("#btnTheme").addEventListener("click", toggleTheme);
    $("#btnRefresh").addEventListener("click", () => {
      loadStats();
      loadProducts();
      toast("Datos actualizados");
    });
    $("#btnExpandAll").addEventListener("click", toggleExpandAll);
    $("#btnExportJSON").addEventListener("click", exportJSON);
    $("#btnExportCSV").addEventListener("click", exportCSV);

    // Filters with debounce.
    let debounceTimer;
    $("#filterSearch").addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.page = 1;
        loadProducts();
      }, 400);
    });

    for (const sel of ["#filterCategory", "#filterType", "#filterStock"]) {
      $(sel).addEventListener("change", () => {
        state.page = 1;
        loadProducts();
      });
    }

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

    // Keyboard.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeEditModal();
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
      '<tr><td colspan="11" class="jewd-loading-row"><div class="jewd-spinner"></div> Cargando...</td></tr>';

    try {
      const res = await JewdAPI.getProducts({
        search: $("#filterSearch").value,
        category: $("#filterCategory").value,
        type: $("#filterType").value,
        stock: $("#filterStock").value,
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
    } catch (e) {
      tb.innerHTML = `<tr><td colspan="11" class="jewd-loading-row">Error: ${esc(e.message)}</td></tr>`;
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
      html = '<tr><td colspan="11" class="jewd-empty">🔍<br>No se encontraron productos</td></tr>';
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
      html += `<button class="jewd-action-btn" data-action="detail" data-idx="${idx}" title="Ver detalle">👁</button>`;
      html += `<button class="jewd-action-btn" data-action="edit" data-idx="${idx}" title="Editar producto">✏️</button>`;
      html += `<button class="jewd-action-btn" data-action="duplicate" data-idx="${idx}" title="Duplicar producto">📋</button>`;
      html += `<a class="jewd-action-btn" href="${esc(p.permalink || "#")}" title="Ver en tienda" target="_blank">🔗</a>`;
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
          html += "<td></td><td></td>";
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
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
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

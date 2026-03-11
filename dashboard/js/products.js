/**
 * Tu Joyita Miami Dashboard — Products Module
 *
 * Categories, stats, product CRUD, edit modal, new product wizard,
 * bulk actions, duplicate, delete/restore, lightbox, and export.
 */
(function (J) {
  "use strict";
  const { state, $, $$, esc, fmtN, csvEsc, dateStr, normalizePermalink, normalizeMediaUrl, download } = J;
  const { toast, showConfirm, addTableDataLabels, checkStockAlerts } = J;

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

  /* ===== LOAD SALES STATS (Ticket #15) ===== */

  /**
   * Fetch sales stats from jewd/v1/sales/stats and render cards.
   * Shows today, week, and month totals in the salesStatsContainer.
   */
  async function loadSalesStats() {
    try {
      const res = await JewdAPI.getSalesStats();
      const d = res.data || {};
      const container = $("#salesStatsContainer");
      if (!container) return;

      let html = '<h3 class="jewd-sales-title">💰 Ventas</h3><div class="jewd-stats">';
      html += statCard("Hoy", "$" + fmtN(d.today?.total || 0), (d.today?.count || 0) + " pedidos");
      html += statCard("Semana", "$" + fmtN(d.week?.total || 0), (d.week?.count || 0) + " pedidos");
      html += statCard("Mes", "$" + fmtN(d.month?.total || 0), (d.month?.count || 0) + " pedidos");
      html += "</div>";
      container.innerHTML = html;
    } catch (e) {
      console.error("Error loading sales stats:", e);
      const container = $("#salesStatsContainer");
      if (container) container.innerHTML = "";
    }
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
      .map((k) => esc(cats[k].name))
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
      const editUrl = normalizePermalink(`${cfg.adminUrl}/post.php?post=${p.id}&action=edit`);

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
      html += `<td class="jewd-right">${p.weight ? esc(p.weight) + " g" : "—"}</td>`;
      html += '<td class="jewd-center">';
      const canEdit = window.JewdAuth && window.JewdAuth.can("edit_products");
      if (p.status === "trash") {
        if (canEdit)
          html += `<button class="jewd-action-btn jewd-action-restore" data-action="restore" data-idx="${idx}" title="Restaurar">♻️</button>`;
        if (canEdit)
          html += `<button class="jewd-action-btn jewd-action-danger" data-action="permadelete" data-idx="${idx}" title="Eliminar permanentemente">💀</button>`;
      } else {
        html += `<button class="jewd-action-btn" data-action="detail" data-idx="${idx}" title="Ver detalle">👁</button>`;
        if (canEdit)
          html += `<button class="jewd-action-btn" data-action="edit" data-idx="${idx}" title="Editar producto">✏️</button>`;
        if (canEdit)
          html += `<button class="jewd-action-btn" data-action="duplicate" data-idx="${idx}" title="Duplicar producto">📋</button>`;
        if (canEdit)
          html += `<button class="jewd-action-btn jewd-action-danger" data-action="delete" data-idx="${idx}" title="Eliminar producto">🗑</button>`;
        html += `<a class="jewd-action-btn" href="${esc(normalizePermalink(p.permalink || "#"))}" title="Ver en tienda" target="_blank">🔗</a>`;
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
          html += `<td class="jewd-right">${v.weight ? esc(v.weight) + " g" : "—"}</td>`;
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
    const editLink = $("#modalEditLink");
    if (window.JewdAuth && window.JewdAuth.can("edit_products")) {
      editLink.href = normalizePermalink(`${cfg.adminUrl}/post.php?post=${p.id}&action=edit`);
      editLink.style.display = "";
    } else {
      editLink.style.display = "none";
    }
    $("#modalViewLink").href = normalizePermalink(p.permalink || "#");

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
      html += detailField("Peso", p.weight ? p.weight + " g" : "—");
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
        .map((a) => `<strong>${esc(a.name)}:</strong> ${a.options.map((o) => esc(o)).join(", ")}`)
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
        '<thead><tr><th>SKU</th><th>Atributos</th><th class="jewd-right">Precio</th><th class="jewd-right">Oferta</th><th class="jewd-right">Stock</th><th class="jewd-right">Peso (g)</th></tr></thead><tbody>';
      vs.forEach((v) => {
        const va = v.attributes ? v.attributes.map((a) => `${a.name}: ${a.option}`).join(", ") : "";
        html += "<tr>";
        html += `<td class="jewd-sku">${esc(v.sku || "")}</td>`;
        html += `<td class="jewd-var-attr">${esc(va)}</td>`;
        html += `<td class="jewd-right">${v.regular_price ? "$" + fmtN(v.regular_price) : "$" + fmtN(v.price)}</td>`;
        html += `<td class="jewd-right">${v.sale_price ? "$" + fmtN(v.sale_price) : "—"}</td>`;
        html += `<td class="jewd-right">${v.stock_quantity !== null ? v.stock_quantity : "—"}</td>`;
        html += `<td class="jewd-right">${v.weight ? v.weight + " g" : "—"}</td>`;
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
  let editInitialSnapshot = null; // Dirty-form tracking

  function showEditModal(p) {
    if (!p) return;
    if (!window.JewdAuth || !window.JewdAuth.can("edit_products")) {
      toast("🚫 No tienes permiso para editar productos");
      return;
    }
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
    // ---- DYNAMIC PRICING SECTION ----
    const jp = p.jewelry_pricing || {};
    const pricingMode = jp.mode || "fixed";
    const metalType = jp.metal_type || "gold_14k";
    const metalWeight = jp.weight_g || "";
    const markupPct = jp.markup_pct || "";

    // Unified weight field — used for BOTH WooCommerce shipping weight and dynamic pricing
    const weightValue = p.weight || metalWeight || "";
    html += '<div class="jewd-edit-field">';
    html += '<label class="jewd-edit-label">Peso (g)</label>';
    html += `<input class="jewd-edit-input" type="number" name="edit_weight" id="editProductWeight" value="${esc(String(weightValue))}" step="0.01" min="0" max="9999.99" placeholder="Peso en gramos"/>`;
    html += '</div>';

    if (p.type === "simple" || p.type === "variable") {
      html += '<div class="jewd-edit-field">';
      html += '<label class="jewd-edit-label">Modo de Precio</label>';
      html += `<select class="jewd-edit-input" name="edit_pricing_mode" id="editPricingMode">`;
      html += `<option value="fixed"${pricingMode === "fixed" ? " selected" : ""}>💲 Fijo (manual)</option>`;
      html += `<option value="by_weight"${pricingMode === "by_weight" ? " selected" : ""}>⚖️ Por peso del metal</option>`;
      html += "</select></div>";

      // Dynamic pricing fields (shown/hidden by JS)
      const dpDisplay = pricingMode === "by_weight" ? "" : ' style="display:none"';
      html += `<div id="editDynamicPricingFields"${dpDisplay}>`;

      html += '<div class="jewd-edit-field">';
      html += '<label class="jewd-edit-label">Tipo de Metal</label>';
      html += '<select class="jewd-edit-input" name="edit_metal_type" id="editMetalType">';
      const metalTypes = [
        ["gold_24k", "Oro 24K (99.9%)"], ["gold_22k", "Oro 22K (91.7%)"],
        ["gold_18k", "Oro 18K (75.0%)"], ["gold_14k", "Oro 14K (58.3%)"],
        ["gold_10k", "Oro 10K (41.7%)"], ["silver_999", "Plata 999 (99.9%)"],
        ["silver_925", "Plata 925 (92.5%)"],
      ];
      metalTypes.forEach(([val, label]) => {
        html += `<option value="${val}"${metalType === val ? " selected" : ""}>${label}</option>`;
      });
      html += "</select></div>";

      html += '<div class="jewd-edit-field">';
      html += '<label class="jewd-edit-label">Markup (%)</label>';
      html += `<input class="jewd-edit-input" type="number" name="edit_markup_pct" id="editMarkupPct" value="${esc(String(markupPct))}" step="0.01" min="0" max="500" placeholder="% sobre valor metal"/>`;
      html += "</div>";

      // Labor cost info (read-only)
      html += '<div class="jewd-edit-field jewd-edit-wide">';
      html += '<div class="jewd-labor-info">🔧 Mano de obra: <strong>$3.00/g</strong> — se aplica automáticamente al precio calculado</div>';
      html += "</div>";

      // Price preview (simple products only — variable prices are per-variation)
      if (p.type === "simple") {
        html += '<div class="jewd-edit-field jewd-edit-wide" id="editDynamicPricePreview">';
        if (pricingMode === "by_weight" && jp.calculated_price) {
          html += `<div class="jewd-dynamic-price-preview">`;
          html += `<span class="jewd-price-label">💰 Precio calculado:</span> `;
          html += `<strong class="jewd-price-value">$${parseFloat(jp.calculated_price).toFixed(2)}</strong>`;
          if (jp.metal_price_per_g) {
            html += ` <small>(${metalWeight}g × $${parseFloat(jp.metal_price_per_g).toFixed(2)}/g`;
            if (jp.labor_value > 0) html += ` + $${parseFloat(jp.labor_value).toFixed(2)} mano de obra`;
            if (markupPct > 0) html += ` + ${markupPct}%`;
            html += ")</small>";
          }
          html += "</div>";
        }
        html += "</div>";
      } else {
        html += '<div class="jewd-edit-field jewd-edit-wide" id="editDynamicPricePreview">';
        html += '<p class="jewd-edit-hint">⚖️ Para productos variables, el precio se calcula por variación en la pestaña Variaciones. Metal y Markup aquí son los defaults que heredan las variaciones.</p>';
        html += "</div>";
      }

      html += "</div>"; // close #editDynamicPricingFields
    }

    if (p.type === "simple") {
      // Fixed price fields (shown/hidden opposite to dynamic)
      const fpDisplay = pricingMode === "fixed" ? "" : ' style="display:none"';
      html += `<div id="editFixedPriceFields"${fpDisplay}>`;
      html += editField(
        "Precio Regular ($)",
        "edit_regular_price",
        p.regular_price || "",
        "number",
      );
      html += editField("Precio Oferta ($)", "edit_sale_price", p.sale_price || "", "number");
      html += "</div>";

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

      // Check if parent product uses dynamic pricing
      const parentPricingMode = (p.jewelry_pricing || {}).mode || "fixed";
      const parentIsByWeight = parentPricingMode === "by_weight";

      if (parentIsByWeight) {
        html += '<div class="jewd-edit-hint" style="margin-bottom:8px;padding:6px 10px;background:var(--jewd-bg2);border-radius:6px">';
        html += `⚖️ Precio por peso — Metal: <strong>${esc((p.jewelry_pricing || {}).metal_type || "gold_14k")}</strong>, Markup: <strong>${(p.jewelry_pricing || {}).markup_pct || 0}%</strong> (default del producto padre)`;
        html += '</div>';
      }

      html += '<div class="jewd-edit-vtable"><table class="jewd-table" style="font-size:.82rem">';
      if (parentIsByWeight) {
        html += "<thead><tr><th style='width:50px'>Img</th><th>Atributos</th><th>SKU</th><th>Peso (g)</th><th>Tipo Metal</th><th>Markup (%)</th><th>Precio Calc.</th><th>Stock</th></tr></thead><tbody>";
      } else {
        html += "<thead><tr><th style='width:50px'>Img</th><th>Atributos</th><th>SKU</th><th>Precio Regular</th><th>Precio Oferta</th><th>Stock</th><th>Peso (g)</th></tr></thead><tbody>";
      }

      const metalTypeOptions = [
        ["", "— Heredar del padre —"],
        ["gold_24k", "Oro 24K"], ["gold_22k", "Oro 22K"],
        ["gold_18k", "Oro 18K"], ["gold_14k", "Oro 14K"],
        ["gold_10k", "Oro 10K"], ["silver_999", "Plata 999"],
        ["silver_925", "Plata 925"],
      ];

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

        if (parentIsByWeight) {
          // Dynamic pricing columns for by_weight variations
          const vjp = v.jewelry_pricing || {};
          const vWeight = vjp.weight_g || parseFloat(v.weight) || "";
          const vMetalType = vjp.metal_type || "";
          const vMarkup = vjp.markup_pct !== null && vjp.markup_pct !== undefined ? vjp.markup_pct : "";
          const calcPrice = vjp.calculated_price || 0;

          html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="0.01" min="0" name="v_metal_weight_${vi}" value="${esc(String(vWeight))}" data-vid="${v.id}" placeholder="Requerido"></td>`;
          html += `<td><select class="jewd-edit-input jewd-edit-sm" name="v_metal_type_${vi}" data-vid="${v.id}">`;
          metalTypeOptions.forEach(([val, label]) => {
            html += `<option value="${val}"${vMetalType === val ? " selected" : ""}>${label}</option>`;
          });
          html += `</select></td>`;
          html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="0.01" min="0" max="500" name="v_markup_pct_${vi}" value="${esc(String(vMarkup))}" data-vid="${v.id}" placeholder="Heredar"></td>`;
          html += `<td class="jewd-right" style="font-weight:600;color:${calcPrice > 0 ? "var(--jewd-success)" : "var(--jewd-text2)"}">`;
          html += calcPrice > 0 ? `$${parseFloat(calcPrice).toFixed(2)}` : "—";
          html += `</td>`;
          html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="1" name="v_stock_quantity_${vi}" value="${v.stock_quantity ?? ""}" data-vid="${v.id}"></td>`;
        } else {
          // Fixed pricing columns
          html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="0.01" name="v_regular_price_${vi}" value="${esc(v.regular_price || v.price || "")}" data-vid="${v.id}"></td>`;
          html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="0.01" name="v_sale_price_${vi}" value="${esc(v.sale_price || "")}" data-vid="${v.id}"></td>`;
          html += `<td><input class="jewd-edit-input jewd-edit-sm jewd-edit-num" type="number" step="1" name="v_stock_quantity_${vi}" value="${v.stock_quantity ?? ""}" data-vid="${v.id}"></td>`;
          html += `<td><input class="jewd-edit-input jewd-edit-sm" name="v_weight_${vi}" value="${esc(v.weight || "")}" data-vid="${v.id}"></td>`;
        }
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

    // ---- Bind dynamic pricing toggle ----
    initDynamicPricingHandlers();

    // ---- Bind new variation events ----
    initNewVariationHandlers(p);

    // ---- Capture initial snapshot for dirty-form detection ----
    editInitialSnapshot = getEditFormSnapshot();
  }

  /** Capture current edit form state as a serializable string for dirty-checking. */
  function getEditFormSnapshot() {
    const form = $("#editForm");
    if (!form) return "";
    const inputs = Array.from(form.querySelectorAll("input, select, textarea"));
    const values = inputs.map(
      (el) => `${el.id || el.name}=${el.type === "checkbox" ? el.checked : el.value}`,
    );
    // Include image IDs and tag IDs.
    values.push("imgs=" + editImages.map((i) => i.id).join(","));
    values.push("tags=" + editTags.map((t) => t.id).join(","));
    return values.join("|");
  }

  /* ===== DYNAMIC PRICING HANDLERS ===== */
  function initDynamicPricingHandlers() {
    const modeSelect = $("#editPricingMode");
    if (!modeSelect) return;

    const dynamicFields = $("#editDynamicPricingFields");
    const fixedFields = $("#editFixedPriceFields");

    function toggleFields() {
      const isByWeight = modeSelect.value === "by_weight";
      if (dynamicFields) dynamicFields.style.display = isByWeight ? "" : "none";
      if (fixedFields) fixedFields.style.display = isByWeight ? "none" : "";
    }

    modeSelect.addEventListener("change", toggleFields);

    // Live price preview
    const metalTypeSelect = $("#editMetalType");
    const metalWeightInput = $("#editProductWeight");
    const markupInput = $("#editMarkupPct");
    const previewEl = $("#editDynamicPricePreview");

    async function updatePricePreview() {
      if (modeSelect.value !== "by_weight") return;
      const mt = metalTypeSelect ? metalTypeSelect.value : "gold_14k";
      const wt = metalWeightInput ? parseFloat(metalWeightInput.value) : 0;
      const mk = markupInput ? parseFloat(markupInput.value) || 0 : 0;
      if (!wt || wt <= 0) {
        if (previewEl) previewEl.innerHTML = '<small class="jewd-text-muted">Ingresa peso para ver precio</small>';
        return;
      }
      try {
        const res = await JewdAPI.calculateDynamicPrice(mt, wt, mk);
        const d = res.data;
        if (d && d.success && previewEl) {
          let html = '<div class="jewd-dynamic-price-preview">';
          html += '<span class="jewd-price-label">💰 Precio calculado:</span> ';
          html += `<strong class="jewd-price-value">$${parseFloat(d.total).toFixed(2)}</strong>`;
          html += ` <small>(${wt}g × $${parseFloat(d.price_per_gram).toFixed(2)}/g`;
          if (d.labor_value > 0) html += ` + $${parseFloat(d.labor_value).toFixed(2)} mano de obra`;
          if (mk > 0) html += ` + ${mk}%`;
          html += ")</small></div>";
          previewEl.innerHTML = html;
        }
      } catch (e) {
        if (previewEl) previewEl.innerHTML = '<small class="jewd-text-muted">Error calculando precio</small>';
      }
    }

    if (metalTypeSelect) metalTypeSelect.addEventListener("change", updatePricePreview);
    if (metalWeightInput) metalWeightInput.addEventListener("input", updatePricePreview);
    if (markupInput) markupInput.addEventListener("input", updatePricePreview);
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

    // Close dropdown on outside click (remove previous to avoid leak).
    if (initEditTagHandlers._docClickHandler) {
      document.removeEventListener("click", initEditTagHandlers._docClickHandler);
    }
    initEditTagHandlers._docClickHandler = (e) => {
      if (!e.target.closest(".jewd-tags-input-wrap")) {
        dropdown.innerHTML = "";
        dropdown.classList.remove("active");
      }
    };
    document.addEventListener("click", initEditTagHandlers._docClickHandler);
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
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const imgId = parseInt(btn.dataset.imgId);
        const card = btn.closest(".jewd-img-edit-card");
        const thumbSrc = card?.querySelector("img")?.src || "";
        const imgPreview = thumbSrc
          ? `<div style="text-align:center;margin-bottom:10px"><img src="${thumbSrc}" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--jewd-border)"></div>`
          : "";
        const ok = await showConfirm({
          title: "🗑 Quitar imagen",
          html: `${imgPreview}<span>¿Quitar esta imagen del producto?</span>`,
          confirmText: "Quitar",
          danger: true,
        });
        if (!ok) return;
        editImages = editImages.filter((img) => img.id !== imgId);
        card.remove();
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

        card.querySelector(".jewd-img-remove-btn").addEventListener("click", async (ev) => {
          ev.preventDefault();
          const ok = await showConfirm({
            title: "🗑 Quitar imagen",
            html: `<div style="text-align:center;margin-bottom:10px"><img src="${ev.target.closest(".jewd-img-edit-card").querySelector("img")?.src || ""}" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid var(--jewd-border)"></div><span>¿Quitar esta imagen del producto?</span>`,
            confirmText: "Quitar",
            danger: true,
          });
          if (!ok) return;
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
      // Skip cards that already have drag handlers to prevent accumulation.
      if (card._dragInit) return;
      card._dragInit = true;

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
    if (!window.JewdAuth || !window.JewdAuth.can("edit_products")) {
      toast("🚫 No tienes permiso para guardar cambios");
      return;
    }
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

      // ---- DYNAMIC PRICING ----
      const pricingMode = fd.get("edit_pricing_mode");
      if (pricingMode) {
        const origPricing = editingProduct.jewelry_pricing || {};
        const newPricing = {
          mode: pricingMode,
          metal_type: fd.get("edit_metal_type") || "gold_14k",
          weight_g: parseFloat(fd.get("edit_weight")) || 0,
          markup_pct: parseFloat(fd.get("edit_markup_pct")) || 0,
        };
        if (
          newPricing.mode !== (origPricing.mode || "fixed") ||
          newPricing.metal_type !== (origPricing.metal_type || "gold_14k") ||
          newPricing.weight_g !== (origPricing.weight_g || 0) ||
          newPricing.markup_pct !== (origPricing.markup_pct || 0)
        ) {
          payload.jewelry_pricing = newPricing;
        }
      }

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
      const parentIsByWeight = ((editingProduct.jewelry_pricing || {}).mode || "fixed") === "by_weight";
      let vSaved = 0;
      for (let vi = 0; vi < vs.length; vi++) {
        const v = vs[vi];
        const vPayload = {};
        const vSku = fd.get(`v_sku_${vi}`);
        if (vSku !== (v.sku || "")) vPayload.sku = vSku;

        if (parentIsByWeight) {
          // Dynamic pricing fields for by_weight variations
          const vjp = v.jewelry_pricing || {};
          const vMetalWeight = fd.get(`v_metal_weight_${vi}`);
          const vMetalType = fd.get(`v_metal_type_${vi}`);
          const vMarkupPct = fd.get(`v_markup_pct_${vi}`);

          const origWeight = vjp.weight_g || parseFloat(v.weight) || 0;
          const origMetalType = vjp.metal_type || "";
          const origMarkup = vjp.markup_pct !== null && vjp.markup_pct !== undefined ? String(vjp.markup_pct) : "";

          const newWeight = parseFloat(vMetalWeight) || 0;
          const pricingChanged =
            newWeight !== origWeight ||
            (vMetalType || "") !== origMetalType ||
            (vMarkupPct || "") !== origMarkup;

          if (pricingChanged) {
            vPayload.jewelry_pricing = {
              weight_g: newWeight,
              metal_type: vMetalType || "",
              markup_pct: vMarkupPct === "" ? null : parseFloat(vMarkupPct),
            };
            // Also set WC weight for shipping
            vPayload.weight = vMetalWeight || "";
          }

          const vSq = fd.get(`v_stock_quantity_${vi}`);
          const curVStock = v.stock_quantity ?? "";
          if (vSq !== String(curVStock)) {
            vPayload.stock_quantity = vSq === "" ? null : parseInt(vSq, 10);
            vPayload.manage_stock = vSq !== "";
          }
        } else {
          // Fixed pricing fields
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
        }

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

      closeEditModal(true);
    } catch (e) {
      toast("❌ Error: " + e.message);
      console.error("Save failed:", e);
    } finally {
      btn.disabled = false;
      btn.textContent = "💾 Guardar Cambios";
    }
  }

  let _closingEditModal = false;
  async function closeEditModal(force) {
    if (_closingEditModal) return; // Prevent re-entrancy while confirm is shown
    if (!force && editingProduct && editInitialSnapshot !== null) {
      const currentSnapshot = getEditFormSnapshot();
      if (currentSnapshot !== editInitialSnapshot) {
        _closingEditModal = true;
        try {
          const ok = await showConfirm({
            title: "⚠️ Cambios sin guardar",
            html: "<span>Tienes cambios sin guardar. ¿Descartar los cambios?</span>",
            confirmText: "Descartar",
            danger: true,
          });
          if (!ok) return;
        } finally {
          _closingEditModal = false;
        }
      }
    }
    $("#editModal").classList.remove("active");
    editingProduct = null;
    editInitialSnapshot = null;
  }

  /** Warn before leaving the page if edit modal or wizard has unsaved data. */
  window.addEventListener("beforeunload", (e) => {
    const editDirty =
      editingProduct &&
      editInitialSnapshot !== null &&
      getEditFormSnapshot() !== editInitialSnapshot;
    const wizardOpen = document.querySelector(".jewd-modal.active #wizardClose");
    if (editDirty || wizardOpen) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

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
              <div class="jewd-edit-field"><label class="jewd-edit-label">Peso (g)</label><input class="jewd-edit-input" id="wizWeight" placeholder="0.00"></div>
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
    async function wizardClose() {
      const hasData =
        wizardData.name ||
        wizardData.sku ||
        wizardData.regular_price ||
        wizardData.imageFiles.length;
      if (hasData) {
        const ok = await showConfirm({
          title: "⚠️ Cerrar asistente",
          html: "<span>Tienes datos ingresados. ¿Descartar y cerrar?</span>",
          confirmText: "Descartar",
          danger: true,
        });
        if (!ok) return;
      }
      overlay.remove();
    }
    overlay.querySelector("#wizardClose").addEventListener("click", wizardClose);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) wizardClose();
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

  /** Build HTML summary of selected products for bulk action dialogs. */
  function bulkSelectionSummary() {
    const ids = Array.from(selectedProducts);
    const names = ids.map((id) => {
      const p = state.products.find((x) => x.id === id);
      return p ? p.name : `#${id}`;
    });
    const MAX = 5;
    let list = names
      .slice(0, MAX)
      .map((n) => `<li>${esc(n)}</li>`)
      .join("");
    if (names.length > MAX) list += `<li><em>...y ${names.length - MAX} más</em></li>`;
    return `<ul style="margin:8px 0;padding-left:18px;font-size:.85rem;max-height:150px;overflow-y:auto">${list}</ul>`;
  }

  async function bulkChangeStatus() {
    const count = selectedProducts.size;
    const status = await showConfirm({
      title: `📦 Cambiar estado — ${count} producto${count !== 1 ? "s" : ""}`,
      html: `Selecciona el nuevo estado para:${bulkSelectionSummary()}`,
      select: {
        options: [
          { value: "publish", label: "✅ Publicado" },
          { value: "draft", label: "📝 Borrador" },
          { value: "private", label: "🔒 Privado" },
          { value: "trash", label: "🗑 Papelera" },
        ],
      },
      confirmText: "Aplicar",
      danger: false,
    });
    if (!status || !["publish", "draft", "private", "trash"].includes(status)) return;
    if (status === "trash") {
      const sure = await showConfirm({
        title: "⚠️ Confirmar mover a papelera",
        message: `Esto moverá ${count} producto${count !== 1 ? "s" : ""} a la papelera.`,
        confirmText: "Sí, mover a papelera",
        danger: true,
      });
      if (!sure) return;
    }
    await executeBulkAction("Estado → " + status, (id) => JewdAPI.updateProductStatus(id, status));
  }

  async function bulkChangePrice() {
    const count = selectedProducts.size;
    const input = await showConfirm({
      title: `💰 Cambiar precio — ${count} producto${count !== 1 ? "s" : ""}`,
      html: `Ingresa el nuevo precio para:${bulkSelectionSummary()}
        <p style="font-size:.8rem;color:var(--jewd-text2);margin-top:8px">
          Número fijo: <code>99.99</code> · Porcentaje: <code>+10%</code> o <code>-15%</code>
        </p>`,
      input: { placeholder: "99.99 o +10%", type: "text" },
      confirmText: "Aplicar precio",
    });
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
    const count = selectedProducts.size;
    const input = await showConfirm({
      title: `📊 Cambiar stock — ${count} producto${count !== 1 ? "s" : ""}`,
      html: `Ingresa la nueva cantidad de stock para:${bulkSelectionSummary()}`,
      input: { placeholder: "Cantidad (ej: 10)", type: "number", value: "" },
      confirmText: "Aplicar stock",
    });
    const qty = parseInt(input);
    if (isNaN(qty)) return;
    await executeBulkAction("Stock → " + qty, (id) =>
      JewdAPI.updateProduct(id, { manage_stock: true, stock_quantity: qty }),
    );
  }

  async function bulkDeleteProducts() {
    const count = selectedProducts.size;
    const confirmed = await showConfirm({
      title: `🗑 Mover a papelera — ${count} producto${count !== 1 ? "s" : ""}`,
      html: `<strong>Esta acción moverá a la papelera:</strong>${bulkSelectionSummary()}`,
      confirmText: "Sí, mover a papelera",
      danger: true,
    });
    if (!confirmed) return;
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
    if (!window.JewdAuth || !window.JewdAuth.can("edit_products")) {
      toast("🚫 No tienes permiso para duplicar productos");
      return;
    }
    const ok = await showConfirm({
      title: "📋 Duplicar producto",
      html: `<span>¿Duplicar <strong>${esc(p.name)}</strong>?<br>Se creará una copia en borrador.</span>`,
      confirmText: "Duplicar",
    });
    if (!ok) return;

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
    if (!window.JewdAuth || !window.JewdAuth.can("edit_products")) {
      toast("🚫 No tienes permiso para eliminar productos");
      return;
    }
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
    if (!window.JewdAuth || !window.JewdAuth.can("edit_products")) {
      toast("🚫 No tienes permiso para restaurar productos");
      return;
    }
    const ok = await showConfirm({
      title: "♻️ Restaurar producto",
      html: `<span>¿Restaurar <strong>${esc(p.name)}</strong>?<br>Volverá a estado borrador.</span>`,
      confirmText: "Restaurar",
    });
    if (!ok) return;

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
    if (!window.JewdAuth || !window.JewdAuth.can("edit_products")) {
      toast("🚫 No tienes permiso para eliminar productos");
      return;
    }
    const ok = await showConfirm({
      title: "⚠️ Eliminar permanentemente",
      html: `<span>¿Eliminar permanentemente <strong>${esc(p.name)}</strong>?<br><strong style="color:var(--jewd-danger)">Esta acción NO se puede deshacer.</strong></span>`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;

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
      overlay.style.zIndex = "500000";
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
        "Peso (g)",
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

  /* ===== IMPORT FROM SUPPLIER URL (F4-IMPORT-01) ===== */

  /**
   * Open a modal to import a product from a supplier URL.
   * Supports Shopify stores (pochyjewelry.com, etc.) and generic sites with OG/JSON-LD.
   */
  function openImportFromURL() {
    const catCheckboxes = state.categories.map((c) =>
      '<label class="jewd-cat-checkbox"><input type="checkbox" value="' + c.id + '"> ' + esc(c.name) + '</label>'
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'jewd-modal active';
    overlay.innerHTML = `
      <div class="jewd-modal-dialog jewd-modal-lg">
        <div class="jewd-modal-header">
          <h2>🔗 Importar Producto desde URL</h2>
          <button class="jewd-modal-close" id="importClose">&times;</button>
        </div>
        <div class="jewd-modal-body" style="padding:20px">
          <!-- Step 1: URL input -->
          <div id="importStep1">
            <p style="color:var(--jewd-text2);margin:0 0 12px;font-size:.88rem">
              Pega la URL del producto del proveedor. Soporta tiendas Shopify y sitios con datos estructurados.
            </p>
            <div style="display:flex;gap:8px;align-items:flex-start">
              <input class="jewd-edit-input" id="importUrl" type="url"
                placeholder="https://pochyjewelry.com/products/..."
                style="flex:1;font-size:.95rem">
              <button class="jewd-btn jewd-btn-gold" id="importFetch" style="white-space:nowrap">
                🔍 Obtener datos
              </button>
            </div>
            <div id="importError" style="display:none;color:var(--jewd-danger);margin-top:8px;font-size:.85rem"></div>
            <div id="importLoading" style="display:none;text-align:center;padding:30px">
              <div style="font-size:2rem">⏳</div>
              <p style="color:var(--jewd-text2)">Obteniendo datos del producto...</p>
            </div>
          </div>

          <!-- Step 2: Preview & Edit -->
          <div id="importStep2" style="display:none">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <span class="jewd-badge jewd-badge-info" id="importPlatform"></span>
              <button class="jewd-btn jewd-btn-outline jewd-btn-sm" id="importBack">← Otra URL</button>
            </div>

            <div id="importPreviewImages" style="display:flex;gap:8px;overflow-x:auto;padding:8px 0;margin-bottom:16px"></div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="jewd-edit-field jewd-edit-wide" style="grid-column:1/-1">
                <label class="jewd-edit-label">Nombre *</label>
                <input class="jewd-edit-input" id="importName">
              </div>
              <div class="jewd-edit-field jewd-edit-wide" style="grid-column:1/-1">
                <label class="jewd-edit-label">Descripción</label>
                <textarea class="jewd-edit-input jewd-edit-textarea" id="importDesc" rows="3"></textarea>
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Precio proveedor</label>
                <input class="jewd-edit-input" id="importPrice" type="number" step="0.01" readonly
                  style="background:var(--jewd-bg2);opacity:.7" title="Precio del proveedor (referencia)">
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Tu precio de venta *</label>
                <input class="jewd-edit-input" id="importSalePrice" type="number" step="0.01"
                  placeholder="Tu precio">
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Quilates</label>
                <input class="jewd-edit-input" id="importKarat" placeholder="10K, 14K...">
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Peso (g)</label>
                <input class="jewd-edit-input" id="importWeight" placeholder="0.00">
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Metal</label>
                <input class="jewd-edit-input" id="importMetal" placeholder="Gold, Silver...">
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Proveedor</label>
                <input class="jewd-edit-input" id="importVendor" readonly
                  style="background:var(--jewd-bg2);opacity:.7">
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Tipo de producto</label>
                <input class="jewd-edit-input" id="importProductType">
              </div>
              <div class="jewd-edit-field">
                <label class="jewd-edit-label">Tags</label>
                <input class="jewd-edit-input" id="importTags" placeholder="tag1, tag2...">
              </div>
            </div>

            <!-- Variants editable table -->
            <div id="importVariantsSection" style="display:none;margin-top:16px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div class="jewd-edit-section-title" style="margin:0">Variaciones del proveedor</div>
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="jewd-btn jewd-btn-outline jewd-btn-sm" id="importVarSelectAll" title="Seleccionar/deseleccionar todas">☑ Todas</button>
                  <button class="jewd-btn jewd-btn-outline jewd-btn-sm" id="importVarApplyPrice" title="Aplicar tu precio de venta a todas las variaciones">💲 Aplicar precio</button>
                </div>
              </div>
              <div style="overflow-x:auto;margin-top:8px">
                <table class="jewd-import-var-table" id="importVariantsTable">
                  <thead>
                    <tr>
                      <th style="width:36px">☑</th>
                      <th>Opción</th>
                      <th style="width:100px">Precio</th>
                      <th style="width:100px">SKU</th>
                      <th style="width:50px">Stock</th>
                    </tr>
                  </thead>
                  <tbody id="importVariantsBody"></tbody>
                </table>
              </div>
              <p style="font-size:.78rem;color:var(--jewd-text2);margin-top:6px">
                ☑ = se importará. Edita precios individuales o usa "Aplicar precio" para override masivo.
              </p>
            </div>

            <!-- Categories -->
            <div class="jewd-edit-section" style="margin-top:16px">
              <div class="jewd-edit-section-title">Categorías</div>
              <div class="jewd-cat-grid" id="importCatGrid">
                ${catCheckboxes}
              </div>
            </div>

            <div style="margin-top:12px;padding:10px;background:var(--jewd-bg2);border-radius:8px;font-size:.82rem;color:var(--jewd-text2)">
              📎 Fuente: <a href="#" id="importSourceLink" target="_blank" style="color:var(--jewd-accent)"></a>
            </div>
          </div>
        </div>
        <div class="jewd-modal-footer" style="display:flex;justify-content:flex-end;gap:8px;padding:16px 20px;border-top:1px solid var(--jewd-border)">
          <button class="jewd-btn jewd-btn-outline" id="importCancel">Cancelar</button>
          <button class="jewd-btn jewd-btn-gold" id="importCreate" style="display:none">
            💾 Crear Producto
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let scrapedData = null;
    let selectedImages = [];

    const $url = overlay.querySelector('#importUrl');
    const $fetch = overlay.querySelector('#importFetch');
    const $error = overlay.querySelector('#importError');
    const $loading = overlay.querySelector('#importLoading');
    const $step1 = overlay.querySelector('#importStep1');
    const $step2 = overlay.querySelector('#importStep2');
    const $create = overlay.querySelector('#importCreate');

    // --- Fetch product data ---
    $fetch.addEventListener('click', async () => {
      const url = $url.value.trim();
      if (!url) { showImportError('Ingresa una URL'); return; }

      try { new URL(url); } catch { showImportError('URL no válida'); return; }

      $error.style.display = 'none';
      $fetch.disabled = true;
      $loading.style.display = 'block';

      try {
        const res = await JewdAPI.scrapeSupplierProduct(url);
        scrapedData = res.data;

        if (!scrapedData.success || !scrapedData.data) {
          showImportError('No se pudieron extraer datos del producto.');
          return;
        }

        populateImportPreview(scrapedData.data, scrapedData.platform);
        $step1.style.display = 'none';
        $step2.style.display = 'block';
        $create.style.display = 'inline-flex';
      } catch (err) {
        showImportError(err.message || 'Error al obtener datos');
      } finally {
        $fetch.disabled = false;
        $loading.style.display = 'none';
      }
    });

    // Allow Enter key in URL field
    $url.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $fetch.click(); }
    });

    function showImportError(msg) {
      $error.textContent = '⚠️ ' + msg;
      $error.style.display = 'block';
      $fetch.disabled = false;
      $loading.style.display = 'none';
    }

    // --- Populate preview ---
    function populateImportPreview(data, platform) {
      overlay.querySelector('#importPlatform').textContent =
        platform === 'shopify' ? '🛍 Shopify' : '🌐 Web';

      overlay.querySelector('#importName').value = data.name || '';
      overlay.querySelector('#importDesc').value = data.description || '';
      overlay.querySelector('#importPrice').value = data.price || '';
      overlay.querySelector('#importSalePrice').value = '';
      overlay.querySelector('#importKarat').value = data.specs?.karat || '';
      overlay.querySelector('#importWeight').value = data.specs?.weight || '';
      overlay.querySelector('#importMetal').value = data.specs?.metal || '';
      overlay.querySelector('#importVendor').value = data.vendor || data.source_store || '';
      overlay.querySelector('#importProductType').value = data.product_type || '';
      overlay.querySelector('#importTags').value = data.tags || '';

      const srcLink = overlay.querySelector('#importSourceLink');
      srcLink.href = data.source_url || '#';
      srcLink.textContent = data.source_store || data.source_url || '';

      // Images
      selectedImages = (data.images || []).map((img, i) => ({ ...img, selected: true, index: i }));
      renderImportImages();

      // Variants editable table
      if (data.variants && data.variants.length > 0) {
        const section = overlay.querySelector('#importVariantsSection');
        section.style.display = 'block';
        const tbody = overlay.querySelector('#importVariantsBody');

        // Show option name in title
        const optionNames = (data.options || []).map((o) => o.name).join(', ');
        if (optionNames) {
          section.querySelector('.jewd-edit-section-title').textContent =
            'Variaciones: ' + esc(optionNames);
        }

        tbody.innerHTML = data.variants.map(function(v, idx) {
          var label = v.title || [v.option1, v.option2, v.option3].filter(Boolean).join(' / ');
          var stockIcon = v.available !== false ? '✅' : '❌';
          var checked = v.available !== false ? ' checked' : '';
          return '<tr data-varidx="' + idx + '">' +
            '<td style="text-align:center"><input type="checkbox" class="import-var-check"' + checked + '></td>' +
            '<td>' + esc(label) + '</td>' +
            '<td><input type="number" step="0.01" class="jewd-edit-input import-var-price" value="' + (v.price || '') + '" style="padding:4px 6px;font-size:.82rem"></td>' +
            '<td><input type="text" class="jewd-edit-input import-var-sku" value="' + esc(v.sku || '') + '" style="padding:4px 6px;font-size:.82rem"></td>' +
            '<td style="text-align:center">' + stockIcon + '</td>' +
            '</tr>';
        }).join('');

        // Select all / deselect all toggle
        overlay.querySelector('#importVarSelectAll').addEventListener('click', function() {
          var checks = tbody.querySelectorAll('.import-var-check');
          var allChecked = Array.from(checks).every(function(cb) { return cb.checked; });
          checks.forEach(function(cb) { cb.checked = !allChecked; });
        });

        // Apply sale price to all variant prices
        overlay.querySelector('#importVarApplyPrice').addEventListener('click', function() {
          var sp = overlay.querySelector('#importSalePrice').value.trim();
          if (!sp) { toast('⚠️ Ingresa primero "Tu precio de venta"'); return; }
          tbody.querySelectorAll('.import-var-price').forEach(function(inp) { inp.value = sp; });
          toast('💲 Precio $' + sp + ' aplicado a todas las variaciones');
        });
      }
    }

    function renderImportImages() {
      const container = overlay.querySelector('#importPreviewImages');
      container.innerHTML = selectedImages.map(function(img, i) {
        const borderColor = img.selected ? 'var(--jewd-accent)' : 'var(--jewd-border)';
        const opacity = img.selected ? 1 : 0.4;
        const title = img.selected ? 'Click para excluir' : 'Click para incluir';
        const badge = (i === 0 && img.selected) ?
          '<div style="position:absolute;bottom:0;left:0;right:0;background:var(--jewd-accent);color:#fff;text-align:center;font-size:.65rem;padding:1px">Principal</div>' : '';
        return '<div style="position:relative;flex-shrink:0;width:90px;height:90px;border-radius:8px;overflow:hidden;' +
          'border:2px solid ' + borderColor + ';cursor:pointer;opacity:' + opacity + '"' +
          ' data-imgidx="' + i + '" title="' + title + '">' +
          '<img src="' + esc(img.src) + '" style="width:100%;height:100%;object-fit:cover" alt="' + esc(img.alt || '') + '">' +
          badge + '</div>';
      }).join('');

      container.querySelectorAll('[data-imgidx]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.imgidx);
          selectedImages[idx].selected = !selectedImages[idx].selected;
          renderImportImages();
        });
      });
    }

    // --- Back button ---
    overlay.querySelector('#importBack').addEventListener('click', () => {
      $step1.style.display = 'block';
      $step2.style.display = 'none';
      $create.style.display = 'none';
      scrapedData = null;
      selectedImages = [];
    });

    // --- Create product ---
    $create.addEventListener('click', async () => {
      const name = overlay.querySelector('#importName').value.trim();
      if (!name) { toast('⚠️ El nombre es obligatorio'); return; }

      $create.disabled = true;
      $create.textContent = '⏳ Creando...';

      try {
        // 1. Sideload selected images into WP media library
        //    (external CDN URLs fail with WC direct fetch — download via PHP)
        const imagesToUpload = selectedImages.filter((img) => img.selected);
        const uploadedImages = [];
        // Map: original image index → sideloaded attachment id
        const sideloadedMap = {};

        for (let i = 0; i < imagesToUpload.length; i++) {
          toast('📷 Descargando imagen ' + (i + 1) + '/' + imagesToUpload.length + '...');
          try {
            const imgRes = await JewdAPI.sideloadSupplierImage(
              imagesToUpload[i].src,
              imagesToUpload[i].alt || name
            );
            uploadedImages.push({ id: imgRes.data.id });
            sideloadedMap[imagesToUpload[i].index] = imgRes.data.id;
          } catch (imgErr) {
            console.warn('Image sideload failed:', imagesToUpload[i].src, imgErr);
            // Fallback: let WooCommerce try the external URL directly
            uploadedImages.push({ src: imagesToUpload[i].src, alt: imagesToUpload[i].alt || name });
          }
        }

        // 2. Build product data
        const salePrice = overlay.querySelector('#importSalePrice').value.trim();
        const supplierPrice = overlay.querySelector('#importPrice').value.trim();
        const weight = overlay.querySelector('#importWeight').value.trim();
        const karat = overlay.querySelector('#importKarat').value.trim();
        const metal = overlay.querySelector('#importMetal').value.trim();
        const tags = overlay.querySelector('#importTags').value.trim();
        const categories = Array.from(
          overlay.querySelectorAll('#importCatGrid input:checked')
        ).map((cb) => ({ id: parseInt(cb.value) }));

        const hasVariants = scrapedData.data.variants && scrapedData.data.variants.length > 1;
        const hasMultipleOptions = scrapedData.data.options && scrapedData.data.options.length > 0
          && scrapedData.data.options[0].values && scrapedData.data.options[0].values.length > 1;

        // Read selected variants from the editable table
        var checkedVariants = [];
        if (hasVariants && hasMultipleOptions) {
          var varRows = overlay.querySelectorAll('#importVariantsBody tr[data-varidx]');
          varRows.forEach(function(row) {
            var cb = row.querySelector('.import-var-check');
            if (cb && cb.checked) {
              var idx = parseInt(row.dataset.varidx);
              var orig = scrapedData.data.variants[idx];
              checkedVariants.push({
                index: idx,
                price: row.querySelector('.import-var-price').value.trim() || orig.price || '',
                sku: row.querySelector('.import-var-sku').value.trim() || '',
                weight: orig.weight ? String(orig.weight) : '',
                option1: orig.option1 || '',
                option2: orig.option2 || '',
                option3: orig.option3 || '',
                available: orig.available !== false,
                image_index: orig.image_index != null ? orig.image_index : null,
              });
            }
          });
        }

        // Build unique attribute values from SELECTED variants only
        var selectedOptionValues = {};
        if (checkedVariants.length > 0) {
          (scrapedData.data.options || []).forEach(function(opt, oi) {
            var key = 'option' + (oi + 1);
            var vals = [];
            checkedVariants.forEach(function(cv) {
              if (cv[key] && vals.indexOf(cv[key]) === -1) vals.push(cv[key]);
            });
            selectedOptionValues[opt.name] = vals;
          });
        }

        const productData = {
          name: name,
          type: (hasVariants && hasMultipleOptions) ? 'variable' : 'simple',
          status: 'draft',
          description: overlay.querySelector('#importDesc').value.trim(),
          short_description: overlay.querySelector('#importDesc').value.trim().substring(0, 200),
          regular_price: salePrice || supplierPrice || undefined,
          weight: weight || undefined,
          categories: categories,
          images: uploadedImages,
          tags: tags ? tags.split(',').map((t) => ({ name: t.trim() })).filter((t) => t.name) : [],
          meta_data: [
            { key: '_supplier_url', value: scrapedData.data.source_url || '' },
            { key: '_supplier_store', value: scrapedData.data.source_store || '' },
            { key: '_supplier_price', value: supplierPrice || '' },
            { key: '_jewelry_karat', value: karat },
            { key: '_jewelry_metal', value: metal },
          ],
        };

        // For variable products, set up attributes from selected variants only
        if (productData.type === 'variable' && scrapedData.data.options) {
          productData.regular_price = undefined;
          productData.attributes = scrapedData.data.options.map(function(opt) {
            return {
              name: opt.name,
              options: selectedOptionValues[opt.name] || opt.values,
              visible: true,
              variation: true,
            };
          });
        }

        // Clean undefined
        Object.keys(productData).forEach((k) => {
          if (productData[k] === undefined) delete productData[k];
        });

        toast('💾 Creando producto...');
        const result = await JewdAPI.createProduct(productData);
        const newProductId = result.data.id;

// 3. Create variations for variable products (only selected ones)
        if (productData.type === 'variable' && checkedVariants.length > 0) {
          toast('🔀 Creando ' + checkedVariants.length + ' variaciones...');
          var created = 0;
          var opts = scrapedData.data.options || [];
          for (var vi = 0; vi < checkedVariants.length; vi++) {
            var cv = checkedVariants[vi];
            var varData = {
              regular_price: cv.price,
              weight: cv.weight || (weight || ''),
              sku: cv.sku || '',
              stock_status: cv.available ? 'instock' : 'outofstock',
              attributes: [],
            };
            if (cv.option1 && opts[0]) varData.attributes.push({ name: opts[0].name, option: cv.option1 });
            if (cv.option2 && opts[1]) varData.attributes.push({ name: opts[1].name, option: cv.option2 });
            if (cv.option3 && opts[2]) varData.attributes.push({ name: opts[2].name, option: cv.option3 });

            // Assign variant-specific image if available
            if (cv.image_index != null && sideloadedMap[cv.image_index] != null) {
              varData.image = { id: sideloadedMap[cv.image_index] };
            }

            try {
              await JewdAPI.createVariation(newProductId, varData);
              created++;
            } catch (varErr) {
              console.warn('Variation failed:', cv.option1, varErr);
            }
          }
          if (created < checkedVariants.length) {
            toast('⚠️ Variaciones: ' + created + '/' + checkedVariants.length + ' creadas');
          }
        }

        overlay.remove();
        toast('✅ Producto importado: "' + result.data.name + '" (ID: ' + newProductId + ')');

        // Refresh and open edit modal
        await loadProducts();
        loadStats();
        const newProduct = state.products.find((p) => p.id === newProductId);
        if (newProduct) showEditModal(newProduct);

      } catch (err) {
        console.error('Import create failed:', err);
        toast('❌ Error al crear: ' + err.message);
        $create.disabled = false;
        $create.textContent = '💾 Crear Producto';
      }
    });

    // --- Close ---
    function closeImport() { overlay.remove(); }
    overlay.querySelector('#importClose').addEventListener('click', closeImport);
    overlay.querySelector('#importCancel').addEventListener('click', closeImport);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeImport(); });
  }

  /* ===== REGISTER ON NAMESPACE ===== */
  J.loadCategories = loadCategories;
  J.loadStats = loadStats;
  J.loadSalesStats = loadSalesStats;
  J.loadProducts = loadProducts;
  J.renderProducts = renderProducts;
  J.initBulkActions = initBulkActions;
  J.showDetail = showDetail;
  J.showEditModal = showEditModal;
  J.closeModal = closeModal;
  J.closeEditModal = closeEditModal;
  J.openNewProductWizard = openNewProductWizard;
  J.openImportFromURL = openImportFromURL;
  J.saveProduct = saveProduct;
  J.toggleExpandAll = toggleExpandAll;
  J.exportJSON = exportJSON;
  J.exportCSV = exportCSV;

  // Lightbox — expose for keyboard nav from app.js
  J.openLightbox = showLightbox;
  J.renderLightbox = renderLightbox;
  J.getLightboxState = () => ({ images: lightboxImages, idx: lightboxIdx });
  J.setLightboxIdx = (i) => { lightboxIdx = i; };

})(window.Jewd);

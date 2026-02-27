/**
 * Tu Joyita Miami Dashboard — Orders Module
 *
 * Order listing, detail modal, status changes, notes.
 */
(function (J) {
  "use strict";
  const { state, $, $$, esc, fmtN } = J;
  const { toast, showConfirm, updateOrderBadge } = J;

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
        const ok = await showConfirm({
          title: "📝 Cambiar estado",
          html: `<span>¿Cambiar pedido <strong>#${oid}</strong> a <strong>${orderStatusLabel(newStatus)}</strong>?</span>`,
          confirmText: "Cambiar",
        });
        if (!ok) return;
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
        noteBtn.disabled = true;
        try {
          await JewdAPI.createOrderNote(order.id, note);
          noteInput.value = "";
          toast("✅ Nota agregada");
          loadOrderNotes(order.id);
        } catch (e) {
          toast("❌ Error: " + e.message);
        } finally {
          noteBtn.disabled = false;
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
    const newStatus = await showConfirm({
      title: "📝 Cambiar estado",
      html: `<span>Pedido <strong>#${order.id}</strong> — Estado actual: <strong>${orderStatusLabel(order.status)}</strong></span>`,
      select: {
        options: statuses.map((s) => ({
          value: s,
          label: orderStatusLabel(s),
          selected: s === order.status,
        })),
      },
      confirmText: "Cambiar",
    });
    if (!newStatus || newStatus === order.status) return;
    try {
      toast("⏳ Cambiando estado...");
      await JewdAPI.updateOrder(order.id, { status: newStatus });
      toast(`✅ Pedido #${order.id} → ${orderStatusLabel(newStatus)}`);
      loadOrders();
    } catch (e) {
      toast("❌ Error: " + e.message);
    }
  }


  /* ===== REGISTER ON NAMESPACE ===== */
  J.loadOrders = loadOrders;
  J.closeOrderDetailModal = closeOrderDetailModal;

})(window.Jewd);

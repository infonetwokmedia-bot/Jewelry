/**
 * Tu Joyita Miami Dashboard — Reports Module
 *
 * Sales reports, charts, top sellers, seller sales breakdown.
 */
(function (J) {
  "use strict";
  const { state, $, $$, esc, fmtN } = J;
  const { toast } = J;

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

      // Ticket #22/#24: Load seller sales for owner/gerente/consultor
      if (
        window.JewdAuth &&
        (window.JewdAuth.can("manage_woocommerce") ||
          window.JewdAuth.can("manage_options") ||
          window.JewdAuth.can("view_reports"))
      ) {
        loadSellerSales(days <= 7 ? "week" : "month");
      }
    } catch (e) {
      console.error("Reports load error:", e);
      toast("❌ Error cargando reportes");
    }
  }

  function renderReportSummary(data) {
    const el = $("#reportSummary");
    if (!el) return;

    // wc-analytics/reports/revenue/stats returns { totals: {...}, intervals: [...] }
    const totals = data && data.totals ? data.totals : {};

    const totalSales = parseFloat(totals.total_sales || 0);
    const totalOrders = parseInt(totals.orders_count || 0);
    const totalItems = parseInt(totals.num_items_sold || 0);

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

    // Extract daily sales from wc-analytics intervals.
    const intervals = data && data.intervals ? data.intervals : [];

    // Build data points for each day.
    const points = [];
    const d = new Date(dateMin);
    const endDate = new Date(dateMax);
    while (d <= endDate) {
      const key = d.toISOString().split("T")[0];
      // Find matching interval from wc-analytics
      const interval = intervals.find((iv) => iv.interval === key);
      const val =
        interval && interval.subtotals ? parseFloat(interval.subtotals.total_sales || 0) : 0;
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
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barW, barHeight, [3, 3, 0, 0]);
      } else {
        // Fallback for older browsers without roundRect.
        ctx.rect(x, y, barW, barHeight);
      }
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

  /* ===== SELLER SALES (Ticket #22) ===== */
  async function loadSellerSales(period) {
    const card = $("#sellerSalesCard");
    if (card) card.style.display = "";
    try {
      const res = await JewdAPI.getSalesBySeller({ period: period || "month" });
      const sellers = res.data || res.sellers || res || [];
      renderSellerSales(Array.isArray(sellers) ? sellers : []);
    } catch (e) {
      console.error("Seller sales load error:", e);
      const el = $("#sellerSalesContainer");
      if (el) el.innerHTML = '<p class="jewd-text-muted">Error cargando datos</p>';
    }
  }

  function renderSellerSales(sellers) {
    const el = $("#sellerSalesContainer");
    if (!el) return;

    if (!sellers.length) {
      el.innerHTML = '<p class="jewd-text-muted" style="padding:12px">Sin datos de vendedores</p>';
      return;
    }

    // Compute grand total for percentage bars
    const grandTotal = sellers.reduce((s, v) => s + parseFloat(v.total || 0), 0);

    const methodLabels = {
      cash: "💵 Efectivo",
      card: "💳 Tarjeta",
      zelle: "⚡ Zelle",
      pos: "🏪 POS",
      other: "📋 Otro",
    };

    let html = '<div class="jewd-seller-detail-list">';
    sellers.forEach((s, i) => {
      const name = s.display_name || s.username || s.seller || "Vendedor";
      const total = parseFloat(s.total || 0);
      const count = parseInt(s.count || s.orders || 0);
      const avgTicket = parseFloat(s.avg_ticket || (count > 0 ? total / count : 0));
      const items = parseInt(s.items || 0);
      const pct = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : 0;
      const methods = Array.isArray(s.methods) ? s.methods : [];
      const orders = Array.isArray(s.orders) ? s.orders : [];
      const uid = "seller_" + i;

      html += '<div class="jewd-seller-card">';

      // Header row (clickable to expand)
      html += `<div class="jewd-seller-header" onclick="document.getElementById('${uid}').classList.toggle('jewd-hidden')">`;
      html += `<span class="jewd-seller-rank">${i + 1}</span>`;
      html += '<div class="jewd-seller-info">';
      html += `<div class="jewd-seller-name">${esc(name)} <span class="jewd-seller-user">@${esc(s.username || "")}</span></div>`;
      html += `<div class="jewd-seller-bar"><div class="jewd-seller-bar-fill" style="width:${pct}%"></div></div>`;
      html += "</div>";
      html += `<div class="jewd-seller-total">$${fmtN(total)}<div class="jewd-seller-pct">${pct}%</div></div>`;
      html += '<span class="jewd-seller-toggle">▼</span>';
      html += "</div>";

      // Detail panel (collapsed by default)
      html += `<div id="${uid}" class="jewd-seller-detail jewd-hidden">`;

      // Stats row
      html += '<div class="jewd-seller-stats">';
      html += `<div class="jewd-seller-stat"><span class="jewd-stat-val">${count}</span><span class="jewd-stat-lbl">Ventas</span></div>`;
      html += `<div class="jewd-seller-stat"><span class="jewd-stat-val">${items}</span><span class="jewd-stat-lbl">Artículos</span></div>`;
      html += `<div class="jewd-seller-stat"><span class="jewd-stat-val">$${fmtN(avgTicket)}</span><span class="jewd-stat-lbl">Ticket Prom.</span></div>`;
      html += "</div>";

      // Payment methods breakdown
      if (methods.length) {
        html += '<div class="jewd-seller-methods">';
        html += '<div class="jewd-seller-subtitle">Métodos de pago</div>';
        methods.forEach((m) => {
          const label = methodLabels[m.method] || m.method;
          html += `<div class="jewd-method-row"><span>${label}</span><span>${m.count} · $${fmtN(m.total)}</span></div>`;
        });
        html += "</div>";
      }

      // Individual orders table
      if (orders.length) {
        html += '<div class="jewd-seller-orders">';
        html += '<div class="jewd-seller-subtitle">Órdenes</div>';
        html +=
          '<table class="jewd-seller-table"><thead><tr><th>#</th><th>Total</th><th>Items</th><th>Método</th><th>Hora</th></tr></thead><tbody>';
        orders.forEach((o) => {
          const mLabel = methodLabels[o.method] || o.method;
          const time = o.time
            ? new Date(o.time + "Z").toLocaleTimeString("es", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          html += `<tr><td>${o.id}</td><td>$${fmtN(o.total)}</td><td>${o.qty || 0}</td><td>${mLabel}</td><td>${time}</td></tr>`;
        });
        html += "</tbody></table>";
        html += "</div>";
      }

      html += "</div>"; // .jewd-seller-detail
      html += "</div>"; // .jewd-seller-card
    });
    html += "</div>";
    el.innerHTML = html;
  }


  /* ===== REGISTER ON NAMESPACE ===== */
  J.loadReports = loadReports;

})(window.Jewd);

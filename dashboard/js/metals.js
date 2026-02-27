/**
 * Tu Joyita Miami Dashboard — Metals Module
 *
 * Live gold & silver prices, karat tables, calculator,
 * ticker bar, auto-refresh.
 */
(function (J) {
  "use strict";
  const { state, $, $$, esc, fmtN, fmtGold, setTxt, formatDateTime } = J;
  const { toast } = J;

  // ═══════════════════════════════════════════════════════════════════════════
  // METALS SECTION — Full price detail, calculator, data source info
  // ═══════════════════════════════════════════════════════════════════════════

  /** Cached metals data for calculator */
  let metalsData = null;

  /**
   * Load the metals section: fetch prices, render everything, bind calculator.
   */
  async function loadMetalsSection() {
    bindMetalsEvents();
    await fetchAndRenderMetals();
  }

  /**
   * Bind calculator and refresh events (once).
   */
  function bindMetalsEvents() {
    const btn = $("#btnMetalsRefresh");
    if (btn && !btn._metalsBound) {
      btn._metalsBound = true;
      btn.addEventListener("click", handleMetalsRefresh);
    }

    // Calculator inputs
    const calcWeight = $("#calcWeight");
    const calcMetal = $("#calcMetal");
    const calcKarat = $("#calcKarat");
    const calcPurity = $("#calcPurity");

    if (calcWeight && !calcWeight._metalsBound) {
      calcWeight._metalsBound = true;
      calcWeight.addEventListener("input", updateCalcResult);
      calcMetal.addEventListener("change", () => {
        const isGold = calcMetal.value === "gold";
        $("#calcKaratGroup").style.display = isGold ? "" : "none";
        $("#calcPurityGroup").style.display = isGold ? "none" : "";
        updateCalcResult();
      });
      calcKarat.addEventListener("change", updateCalcResult);
      calcPurity.addEventListener("change", updateCalcResult);
    }
  }

  /**
   * Fetch gold/silver data and render all panels.
   */
  async function fetchAndRenderMetals() {
    try {
      const res = await JewdAPI.getGoldPrices();
      const d = res.data || res;
      if (d.success === false) {
        console.warn("Metals section: API error", d.error);
        return;
      }
      metalsData = d;
      renderMetalsPriceCards(d);
      renderMetalsKaratTable(d);
      renderMetalsCacheInfo(d);
      renderMetalsSourceBadge(d);
      updateCalcResult();
    } catch (e) {
      console.error("Metals section: fetch error", e);
    }
  }

  /**
   * Render price cards for all metals/karats.
   */
  function renderMetalsPriceCards(data) {
    const g = data.gold || {};
    const s = data.silver || {};
    const k = g.karats || {};

    // Gold spot
    setTxt("#metalsGoldSpot", g.spot_oz ? "$" + fmtGold(g.spot_oz) : "—");
    renderMetalChange("#metalsGoldChange", g.change_pct);

    // Gold karats
    const karats = [
      { key: "22k", oz: "#metals22kOz", g: "#metals22kG" },
      { key: "18k", oz: "#metals18kOz", g: "#metals18kG" },
      { key: "14k", oz: "#metals14kOz", g: "#metals14kG" },
      { key: "10k", oz: "#metals10kOz", g: "#metals10kG" },
    ];
    karats.forEach(({ key, oz, g: gSel }) => {
      const kd = k[key];
      setTxt(oz, kd ? "$" + fmtGold(kd.per_oz) : "—");
      setTxt(gSel, kd ? "$" + fmtGold(kd.per_gram) : "—");
    });

    // Silver
    setTxt("#metalsSilverSpot", s.spot_oz ? "$" + fmtGold(s.spot_oz) : "—");
    setTxt("#metalsSilver925", s.per_gram_925 ? "$" + fmtGold(s.per_gram_925) : "—");
    renderMetalChange("#metalsSilverChange", s.change_pct);
  }

  /**
   * Render change badge for metals section.
   */
  function renderMetalChange(selector, pct) {
    const el = $(selector);
    if (!el) return;
    pct = pct || 0;
    if (pct === 0) {
      el.textContent = "Sin cambio";
      el.className = "jewd-metals-card-change jewd-gold-flat";
    } else {
      const arrow = pct > 0 ? "▲" : "▼";
      el.textContent = arrow + " " + Math.abs(pct).toFixed(2) + "%";
      el.className = "jewd-metals-card-change " + (pct > 0 ? "jewd-gold-up" : "jewd-gold-down");
    }
  }

  /**
   * Render the karat comparison table.
   */
  function renderMetalsKaratTable(data) {
    const tbody = $("#metalsKaratTableBody");
    if (!tbody) return;

    const g = data.gold || {};
    const karatDefs = [
      { label: "24K", purity: "99.9%", key: "24k", highlight: false },
      { label: "22K", purity: "91.7%", key: "22k", highlight: false },
      { label: "18K", purity: "75.0%", key: "18k", highlight: false },
      { label: "14K", purity: "58.3%", key: "14k", highlight: true },
      { label: "10K", purity: "41.7%", key: "10k", highlight: true },
    ];

    let html = "";
    karatDefs.forEach((kd) => {
      const k = (g.karats || {})[kd.key];
      const cls = kd.highlight ? ' class="jewd-metals-table-highlight"' : "";
      if (k) {
        const per10g = (k.per_gram * 10).toFixed(2);
        html += `<tr${cls}>
          <td><strong>${kd.label}</strong></td>
          <td>${kd.purity}</td>
          <td>$${fmtGold(k.per_oz)}</td>
          <td>$${fmtGold(k.per_gram)}</td>
          <td>$${fmtGold(per10g)}</td>
          <td>$${fmtGold(k.per_oz)}</td>
        </tr>`;
      } else {
        html += `<tr${cls}><td><strong>${kd.label}</strong></td><td>${kd.purity}</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`;
      }
    });

    // Silver rows
    const s = data.silver || {};
    html += `<tr class="jewd-metals-table-silver">
      <td><strong>Plata 999</strong></td>
      <td>99.9%</td>
      <td>$${s.spot_oz ? fmtGold(s.spot_oz) : "—"}</td>
      <td>$${s.per_gram_999 ? fmtGold(s.per_gram_999) : "—"}</td>
      <td>$${s.per_gram_999 ? fmtGold(s.per_gram_999 * 10) : "—"}</td>
      <td>$${s.spot_oz ? fmtGold(s.spot_oz) : "—"}</td>
    </tr>`;
    html += `<tr class="jewd-metals-table-silver">
      <td><strong>Plata 925</strong></td>
      <td>92.5%</td>
      <td>$${s.spot_oz ? fmtGold(s.spot_oz * 0.925) : "—"}</td>
      <td>$${s.per_gram_925 ? fmtGold(s.per_gram_925) : "—"}</td>
      <td>$${s.per_gram_925 ? fmtGold(s.per_gram_925 * 10) : "—"}</td>
      <td>$${s.spot_oz ? fmtGold(s.spot_oz * 0.925) : "—"}</td>
    </tr>`;

    tbody.innerHTML = html;
  }

  /**
   * Render cache / source info panel.
   */
  function renderMetalsCacheInfo(data) {
    setTxt("#metalsCacheTime", data.fetched_at ? formatDateTime(data.fetched_at) : "—");
    setTxt("#metalsCacheExpires", data.cache_expires ? formatDateTime(data.cache_expires) : "—");
    setTxt("#metalsCacheSource", data.source || "—");
    setTxt(
      "#metalsCacheMode",
      data.demo ? "Demo (sin API key)" : data.stale ? "Caché expirada (anterior)" : "En vivo",
    );
  }

  /**
   * Render source badge in header.
   */
  function renderMetalsSourceBadge(data) {
    const el = $("#metalsSourceBadge");
    if (!el) return;
    if (data.demo) {
      el.textContent = "🟠 Datos Demo";
      el.className = "jewd-metals-source-badge jewd-metals-badge-demo";
    } else if (data.stale) {
      el.textContent = "🟡 Caché anterior";
      el.className = "jewd-metals-source-badge jewd-metals-badge-stale";
    } else {
      el.textContent = "🟢 En vivo";
      el.className = "jewd-metals-source-badge jewd-metals-badge-live";
    }
  }

  /**
   * Calculator: compute metal value from weight + karat/purity.
   */
  function updateCalcResult() {
    if (!metalsData) return;

    const weight = parseFloat($("#calcWeight")?.value) || 0;
    const metal = $("#calcMetal")?.value || "gold";
    const resultEl = $("#calcResult");
    const detailEl = $("#calcDetail");
    if (!resultEl) return;

    let pricePerGram = 0;
    let label = "";

    if (metal === "gold") {
      const karat = $("#calcKarat")?.value || "14k";
      const kData = metalsData.gold?.karats?.[karat];
      pricePerGram = kData?.per_gram || 0;
      label = karat.toUpperCase() + " ($" + fmtGold(pricePerGram) + "/g)";
    } else {
      const purity = $("#calcPurity")?.value || "925";
      if (purity === "999") {
        pricePerGram = metalsData.silver?.per_gram_999 || 0;
        label = "Plata 999 ($" + fmtGold(pricePerGram) + "/g)";
      } else {
        pricePerGram = metalsData.silver?.per_gram_925 || 0;
        label = "Plata 925 ($" + fmtGold(pricePerGram) + "/g)";
      }
    }

    const total = weight * pricePerGram;
    resultEl.textContent = "$" + fmtGold(total);
    if (detailEl) {
      detailEl.textContent = weight.toFixed(1) + "g × " + label + " = $" + fmtGold(total);
    }
  }

  /**
   * Handle metals refresh button.
   */
  async function handleMetalsRefresh() {
    const btn = $("#btnMetalsRefresh");
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = "🔄 Actualizando...";
    btn.disabled = true;
    try {
      const res = await JewdAPI.refreshGoldPrices();
      const d = res.data || res;
      if (d.success !== false) {
        metalsData = d;
        renderMetalsPriceCards(d);
        renderMetalsKaratTable(d);
        renderMetalsCacheInfo(d);
        renderMetalsSourceBadge(d);
        updateCalcResult();
        // Also update ticker
        renderGoldTicker(d);
        toast("Precios de metales actualizados");
      }
    } catch (e) {
      console.error("Metals refresh error:", e);
      toast("Error actualizando precios", "error");
    } finally {
      btn.textContent = orig;
      btn.disabled = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GOLD & SILVER TICKER
  // ═══════════════════════════════════════════════════════════════════════════

  /** Gold ticker refresh interval ID */
  let goldTickerInterval = null;

  /**
   * Load gold & silver prices and render the ticker bar.
   * Called once from initAfterAuth(), then auto-refreshes.
   */
  async function loadGoldTicker() {
    const cfg = window.JEWD_CONFIG || {};
    if (cfg.goldTickerEnabled === false) return;

    const bar = $("#goldTickerBar");
    if (!bar) return;

    // Bind refresh button (admin/manager only)
    const btnRefresh = $("#btnGoldRefresh");
    if (btnRefresh && !btnRefresh._goldBound) {
      btnRefresh._goldBound = true;
      const canManage = JewdAuth.can("manage_settings") || JewdAuth.can("manage_woocommerce");
      btnRefresh.style.display = canManage ? "" : "none";
      btnRefresh.addEventListener("click", handleGoldRefresh);
    }

    // Initial load
    await fetchAndRenderGold();

    // Auto-refresh interval
    const interval = cfg.goldRefreshInterval || 1800000; // 30 min default
    if (goldTickerInterval) clearInterval(goldTickerInterval);
    goldTickerInterval = setInterval(fetchAndRenderGold, interval);
  }

  /**
   * Fetch gold prices from API and render into ticker.
   */
  async function fetchAndRenderGold() {
    const bar = $("#goldTickerBar");
    try {
      const res = await JewdAPI.getGoldPrices();
      const d = res.data || res;
      if (d.success !== false) {
        if (bar) bar.style.display = "";
        renderGoldTicker(d);
      } else {
        if (bar) bar.style.display = "none";
        console.warn("Gold ticker:", d.error || "API error");
      }
    } catch (e) {
      if (bar) bar.style.display = "none";
      console.warn("Gold ticker unavailable:", e.message);
    }
  }

  /**
   * Render metal prices into the ticker bar.
   * @param {Object} data — normalized price data from the API.
   */
  function renderGoldTicker(data) {
    const bar = $("#goldTickerBar");
    if (!bar) return;

    // Gold spot
    const goldSpot = data.gold?.spot_oz;
    $("#goldSpotPrice").textContent = goldSpot ? "$" + fmtGold(goldSpot) : "—";

    // Gold change %
    const goldChange = data.gold?.change_pct || 0;
    renderChange($("#goldSpotChange"), goldChange);

    // Gold 14K per gram
    const k14 = data.gold?.karats?.["14k"];
    $("#gold14kPrice").textContent = k14 ? "$" + fmtGold(k14.per_gram) : "—";

    // Gold 10K per gram
    const k10 = data.gold?.karats?.["10k"];
    $("#gold10kPrice").textContent = k10 ? "$" + fmtGold(k10.per_gram) : "—";

    // Silver 925 per gram
    const s925 = data.silver?.per_gram_925;
    $("#silver925Price").textContent = s925 ? "$" + fmtGold(s925) : "—";

    // Silver change %
    const silverChange = data.silver?.change_pct || 0;
    renderChange($("#silverSpotChange"), silverChange);

    // Timestamp
    renderGoldTimestamp(data);

    // Toggle demo/stale classes
    bar.classList.toggle("jewd-gold-demo", !!data.demo);
    bar.classList.toggle("jewd-gold-stale", !!data.stale);
  }

  /**
   * Render a change percentage badge.
   */
  function renderChange(el, pct) {
    if (!el) return;
    if (pct === 0) {
      el.textContent = "0%";
      el.className = "jewd-gold-change jewd-gold-flat";
    } else {
      const arrow = pct > 0 ? "▲" : "▼";
      el.textContent = arrow + " " + Math.abs(pct).toFixed(2) + "%";
      el.className = "jewd-gold-change " + (pct > 0 ? "jewd-gold-up" : "jewd-gold-down");
    }
  }

  /**
   * Render the "updated X ago" timestamp.
   */
  function renderGoldTimestamp(data) {
    const el = $("#goldTimestamp");
    if (!el) return;

    let text = "";
    if (data.demo) {
      text = "Datos demo";
    } else if (data.stale) {
      text = "⚠ " + (data.note || "Datos anteriores");
    } else if (data.timestamp) {
      const ts = new Date(data.timestamp);
      const diff = Math.floor((Date.now() - ts.getTime()) / 60000);
      if (diff < 1) text = "Justo ahora";
      else if (diff < 60) text = "Hace " + diff + " min";
      else text = "Hace " + Math.floor(diff / 60) + "h";
    }

    if (data.cached) text += " (cache)";
    el.textContent = text;
  }

  /**
   * Show error state in ticker.
   */
  function renderGoldError(msg) {
    const el = $("#goldSpotPrice");
    if (el) el.textContent = "—";
    const ts = $("#goldTimestamp");
    if (ts) ts.textContent = msg;
  }

  /**
   * Handle manual refresh button click.
   */
  async function handleGoldRefresh() {
    const btn = $("#btnGoldRefresh");
    if (!btn || btn.classList.contains("jewd-spinning")) return;

    btn.classList.add("jewd-spinning");
    try {
      const res = await JewdAPI.refreshGoldPrices();
      const d = res.data || res;
      if (d.success !== false) {
        renderGoldTicker(d);
      }
    } catch (e) {
      console.error("Gold refresh error:", e);
    } finally {
      btn.classList.remove("jewd-spinning");
    }
  }

  /* ===== REGISTER ON NAMESPACE ===== */
  J.loadMetalsSection = loadMetalsSection;
  J.loadGoldTicker    = loadGoldTicker;
  J.renderGoldTicker  = renderGoldTicker;
  J.renderGoldError   = renderGoldError;

})(window.Jewd);


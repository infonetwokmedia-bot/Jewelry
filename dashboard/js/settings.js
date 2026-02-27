/**
 * Tu Joyita Miami Dashboard — Settings Module
 *
 * Store settings, API config display, system info, CORS origins management.
 */
(function (J) {
  "use strict";
  const { $, $$, esc } = J;
  const { toast } = J;

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

    let html = '<div class="jewd-settings-list">';
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">WC Base URL</span><span class="jewd-settings-value jewd-text-mono">${esc(cfg.wcBaseUrl || "—")}</span></div>`;
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">WC Auth</span><span class="jewd-settings-value jewd-text-mono">Server-side proxy (Nginx)</span></div>`;
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">Per Page</span><span class="jewd-settings-value">${cfg.perPage || 50}</span></div>`;
    html += `<div class="jewd-settings-row"><span class="jewd-settings-label">Admin URL</span><span class="jewd-settings-value jewd-text-mono">${esc(cfg.adminUrl || "—")}</span></div>`;
    html += "</div>";
    html +=
      '<p class="jewd-edit-hint" style="margin-top:12px">Las API keys WooCommerce se configuran en el servidor (Nginx <code>wc-auth.conf</code>), no en el navegador.</p>';
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
      html +=
        '<p class="jewd-text-muted" style="margin:0 0 8px">Origins por defecto (siempre activos):</p>';
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
      html +=
        '<input type="url" id="newOriginInput" class="jewd-input" placeholder="https://example.com" style="flex:1">';
      html += '<button class="jewd-btn jewd-btn-sm" id="btnAddOrigin">+ Agregar</button>';
      html += "</div>";

      // Save button.
      html += '<div style="margin-top:12px;text-align:right">';
      html +=
        '<button class="jewd-btn jewd-btn-primary jewd-btn-sm" id="btnSaveOrigins">💾 Guardar Origins</button>';
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


  /* ===== REGISTER ON NAMESPACE ===== */
  J.loadSettingsPage = loadSettingsPage;

})(window.Jewd);

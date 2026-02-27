/**
 * Tu Joyita Miami Dashboard — UI Helpers Module
 *
 * Toast notifications, confirmation dialogs, skeleton loaders,
 * form validation, accessibility, and responsive helpers.
 */
(function (J) {
  "use strict";
  const { $, $$, esc } = J;

  /* ===== TOAST ===== */
  let toastTimer = null;
  function toast(msg, type) {
    const t = $("#toast");
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
      () => { t.className = "jewd-toast"; },
      type === "error" ? 5000 : 3000,
    );
  }

  /* ===== SKELETON LOADERS ===== */
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

  /* ===== GENERIC CONFIRMATION MODAL ===== */
  /**
   * Show a styled confirmation dialog (replaces native confirm/prompt).
   * @param {Object} opts
   *   title, message, html, confirmText, cancelText, danger, input, select
   * @returns {Promise<boolean|string|null>}
   */
  function showConfirm(opts = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "jewd-confirm-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", opts.title || "Confirmación");

      let bodyHtml = "";
      if (opts.html) {
        bodyHtml = opts.html;
      } else if (opts.message) {
        bodyHtml = `<span>${esc(opts.message)}</span>`;
      }

      let inputHtml = "";
      if (opts.input) {
        inputHtml = `<input class="jewd-confirm-input jewd-edit-input" type="${opts.input.type || "text"}" placeholder="${esc(opts.input.placeholder || "")}" value="${esc(opts.input.value || "")}" style="width:100%;margin-top:12px">`;
      }
      if (opts.select) {
        const optionsHtml = opts.select.options
          .map(
            (o) =>
              `<option value="${esc(o.value)}"${o.selected ? " selected" : ""}>${esc(o.label)}</option>`,
          )
          .join("");
        inputHtml = `<select class="jewd-confirm-input jewd-edit-input" style="width:100%;margin-top:12px">${optionsHtml}</select>`;
      }

      overlay.innerHTML = `
        <div class="jewd-confirm-dialog">
          <div class="jewd-confirm-title">${esc(opts.title || "¿Estás seguro?")}</div>
          <div class="jewd-confirm-message">${bodyHtml}${inputHtml}</div>
          <div class="jewd-confirm-actions">
            <button class="jewd-btn jewd-btn-outline" data-confirm="cancel">${esc(opts.cancelText || "Cancelar")}</button>
            <button class="jewd-btn ${opts.danger ? "jewd-btn-danger" : "jewd-btn-gold"}" data-confirm="ok">${esc(opts.confirmText || "Confirmar")}</button>
          </div>
        </div>
      `;

      function getResult(confirmed) {
        if (!confirmed) return opts.input || opts.select ? null : false;
        if (opts.input || opts.select) {
          const el = overlay.querySelector(".jewd-confirm-input");
          return el ? el.value.trim() : null;
        }
        return true;
      }

      function cleanup(confirmed) {
        overlay.remove();
        resolve(getResult(confirmed));
      }

      const focusable = () =>
        overlay.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])');
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          cleanup(false);
          return;
        }
        if (
          e.key === "Enter" &&
          (opts.input || opts.select) &&
          document.activeElement?.classList.contains("jewd-confirm-input")
        ) {
          cleanup(true);
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
      const inputEl = overlay.querySelector(".jewd-confirm-input");
      if (inputEl) {
        inputEl.focus();
        if (inputEl.select) inputEl.select();
      } else {
        const confirmBtn = overlay.querySelector('[data-confirm="ok"]');
        if (confirmBtn) confirmBtn.focus();
      }
    });
  }

  /* ===== FORM VALIDATION ===== */
  function validateField(input, rules) {
    const field = input.closest(".jewd-edit-field") || input.parentElement;
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

  /* ===== ACCESSIBILITY ===== */
  function initAccessibility() {
    $$(".jewd-action-btn").forEach((btn) => {
      if (!btn.getAttribute("aria-label") && btn.title) {
        btn.setAttribute("aria-label", btn.title);
      }
    });

    $$(".jewd-modal").forEach((modal) => {
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
    });

    const sidebar = $("#sidebar");
    if (sidebar) sidebar.setAttribute("role", "navigation");
    const main = $(".jewd-main");
    if (main) main.setAttribute("role", "main");

    // Focus trap for modals (skip if confirm overlay is open).
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      if (document.querySelector(".jewd-confirm-overlay")) return;
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

  /* ===== RESPONSIVE HELPERS ===== */
  function addTableDataLabels() {
    const headers = $$("#sectionProducts .jewd-table thead th");
    const labels = Array.from(headers).map((th) => th.textContent.trim());
    $$("#sectionProducts .jewd-table tbody tr.jewd-prow td").forEach((td, i) => {
      if (labels[i]) td.setAttribute("data-label", labels[i]);
    });
    $$("#sectionProducts .jewd-table tbody tr.jewd-vrow td").forEach((td, i) => {
      if (labels[i]) td.setAttribute("data-label", labels[i]);
    });
    const oHeaders = $$("#sectionOrders .jewd-table thead th");
    const oLabels = Array.from(oHeaders).map((th) => th.textContent.trim());
    $$("#sectionOrders .jewd-table tbody tr td").forEach((td, i) => {
      const colIdx = i % oLabels.length;
      if (oLabels[colIdx]) td.setAttribute("data-label", oLabels[colIdx]);
    });
  }

  /* ===== NOTIFICATIONS & ALERTS ===== */
  let notificationSoundEnabled = false;

  function checkStockAlerts() {
    const { state } = J;
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
    const { state } = J;
    const badge = $("#ordersBadge");
    if (!badge) return;
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

  /* ===== REGISTER ON NAMESPACE ===== */
  J.toast = toast;
  J.showConfirm = showConfirm;
  J.showStatSkeletons = showStatSkeletons;
  J.showTableSkeleton = showTableSkeleton;
  J.validateField = validateField;
  J.validateForm = validateForm;
  J.initAccessibility = initAccessibility;
  J.addTableDataLabels = addTableDataLabels;
  J.checkStockAlerts = checkStockAlerts;
  J.updateOrderBadge = updateOrderBadge;
  J.playNotificationSound = playNotificationSound;
})(window.Jewd);

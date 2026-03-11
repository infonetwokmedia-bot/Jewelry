/**
 * Tu Joyita Miami Dashboard — App Module
 *
 * Bootstrap, authentication, connection test, theme toggle,
 * SPA router, global event binding.
 *
 * @version 3.0.0
 */
(function (J) {
  "use strict";
  const {
    state, $, $$, capitalize,
    toast, showStatSkeletons, initAccessibility,
    loadCategories, loadStats, loadSalesStats, loadProducts,
    initBulkActions, toggleExpandAll, exportJSON, exportCSV,
    openNewProductWizard, openImportFromURL, closeModal, closeEditModal, saveProduct,
    loadOrders, closeOrderDetailModal,
    loadReports,
    loadSettingsPage,
    loadMetalsSection, loadGoldTicker,
    loadGBPSection,
    renderLightbox, getLightboxState, setLightboxIdx,
  } = J;

  /* ===== INIT ===== */
  document.addEventListener("DOMContentLoaded", async () => {
    const cfg = window.JEWD_CONFIG || {};
    state.perPage = cfg.perPage || 50;

    $("#versionTag").textContent = "v" + (cfg.version || "3.0.0");
    $("#btnWPAdmin").href = J.normalizePermalink((cfg.adminUrl || "#"));

    initTheme();

    // ── Auth: login form handler ──
    const loginForm = $("#loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = $("#loginUsername").value.trim();
        const pass = $("#loginPassword").value;
        if (user && pass) await JewdAuth.login(user, pass);
        // If login succeeded, continue init
        if (JewdAuth.isAuthenticated()) initAfterAuth();
      });
    }
    const logoutBtn = $("#btnLogout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => JewdAuth.logout());
    }

    // ── Password visibility toggles (login + user modal) ──
    initPasswordToggles();

    // ── Auth: check existing session ──
    const authed = await JewdAuth.init();
    if (authed) initAfterAuth();
  });

  /** Run after successful authentication. */
  async function initAfterAuth() {
    initRouter();
    initAccessibility();
    bindEvents();
    initBulkActions();
    showStatSkeletons();
    await testConnection();
    loadCategories();
    loadStats();
    loadSalesStats();
    loadGoldTicker();
    loadProducts();
    state.sectionLoaded.products = true;

    // Init user management module
    if (typeof JewdUsers !== "undefined") {
      JewdUsers.bindEvents();
    }
  }

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
    const validSections = ["products", "orders", "pos", "reports", "settings", "users", "metals", "gbp"];
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
    const sectionEls = $$(".jewd-section");
    sectionEls.forEach((sec) => {
      const isTarget = sec.id === "section" + capitalize(section);
      sec.classList.toggle("active", isTarget);
    });

    // Show/hide section-specific topbar actions.
    $$(".jewd-section-action").forEach((btn) => {
      btn.style.display = btn.dataset.section === section ? "" : "none";
    });

    // Close mobile sidebar.
    $("#sidebar").classList.remove("open");

    // Reset scroll so the new section starts from the top.
    window.scrollTo(0, 0);

    // Lazy-load section data on first visit.
    // Reports always reloads (sales change throughout the day).
    if (section === "reports") {
      loadReports();
    } else if (!state.sectionLoaded[section]) {
      state.sectionLoaded[section] = true;
      if (section === "orders") loadOrders();
      if (section === "settings") loadSettingsPage();
      if (section === "users" && typeof JewdUsers !== "undefined") JewdUsers.init();
      if (section === "pos" && typeof JewdPOS !== "undefined") JewdPOS.init();
      if (section === "metals") loadMetalsSection();
      if (section === "gbp") loadGBPSection();
    }
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
      } else if (s === "gbp") {
        loadGBPSection();
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

    // Import from URL button.
    const btnImport = $("#btnImportURL");
    if (btnImport) btnImport.addEventListener("click", openImportFromURL);

    // Product detail modal (read-only) — safe to close on backdrop.
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalCloseBtn").addEventListener("click", closeModal);
    $("#detailModal").addEventListener("click", (e) => {
      if (e.target === $("#detailModal")) closeModal();
    });

    // Edit product modal — DISABLE backdrop close to prevent data loss.
    $("#editModalClose").addEventListener("click", closeEditModal);
    $("#editModalCancel").addEventListener("click", closeEditModal);
    $("#editModalSave").addEventListener("click", saveProduct);
    $("#editModal").addEventListener("click", (e) => {
      if (e.target === $("#editModal")) { /* no-op: require explicit close */ }
    });

    // Image modal — close on background click (not nav buttons).
    $("#imgModal").addEventListener("click", (e) => {
      if (e.target === $("#imgModal") || e.target === $("#imgModalSrc")) {
        $("#imgModal").classList.remove("active");
      }
    });

    // Order detail modal — DISABLE backdrop close, protect unsaved notes (#71).
    const orderDetailClose = $("#orderDetailClose");
    if (orderDetailClose) orderDetailClose.addEventListener("click", safeCloseOrderDetail);
    const orderDetailCloseBtn = $("#orderDetailCloseBtn");
    if (orderDetailCloseBtn) orderDetailCloseBtn.addEventListener("click", safeCloseOrderDetail);
    const orderDetailModal = $("#orderDetailModal");
    if (orderDetailModal)
      orderDetailModal.addEventListener("click", (e) => {
        if (e.target === orderDetailModal) { /* no-op: require explicit close */ }
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
        // If a confirm dialog is open, let its own Escape handler deal with it.
        if (document.querySelector(".jewd-confirm-overlay")) return;

        // userModal has its own Escape handler in users.js (#72)
        const userModal = $("#userModal");
        if (userModal && userModal.classList.contains("active")) return;

        closeModal();
        closeEditModal();
        safeCloseOrderDetail();
        $("#imgModal").classList.remove("active");
      }
      // Lightbox arrow navigation.
      if ($("#imgModal").classList.contains("active")) {
        const lb = getLightboxState();
        if (lb.images.length > 1) {
          if (e.key === "ArrowLeft") {
            setLightboxIdx((lb.idx - 1 + lb.images.length) % lb.images.length);
            renderLightbox();
          } else if (e.key === "ArrowRight") {
            setLightboxIdx((lb.idx + 1) % lb.images.length);
            renderLightbox();
          }
        }
      }
    });
  }

  /* ===== PASSWORD VISIBILITY TOGGLE ===== */
  /**
   * Binds click events on all .jewd-pw-toggle buttons (current & future).
   * Uses document-level delegation so dynamically-rendered toggles work too.
   * Each button needs data-target="<inputId>".
   * SVG icons inside the button have pointer-events:none via CSS.
   */
  function initPasswordToggles() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.jewd-pw-toggle');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      var targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      var input = document.getElementById(targetId);
      if (!input) return;

      var showing = input.type === 'password';
      input.type = showing ? 'text' : 'password';

      // Toggle SVG icons
      var eyeOpen = btn.querySelector('.jewd-pw-eye-open');
      var eyeClosed = btn.querySelector('.jewd-pw-eye-closed');
      if (eyeOpen) eyeOpen.style.display = showing ? 'none' : '';
      if (eyeClosed) eyeClosed.style.display = showing ? '' : 'none';

      // Accessibility
      btn.setAttribute('aria-pressed', String(showing));
      btn.title = showing ? 'Ocultar contrase\u00f1a' : 'Mostrar contrase\u00f1a';
      btn.setAttribute('aria-label', btn.title);
    }, true); // useCapture=true to ensure we catch it before anything else
  }

  /* ===== SAFE CLOSE: ORDER DETAIL MODAL (#71) ===== */
  /**
   * Close orderDetailModal, but warn if the notes textarea has unsaved text.
   */
  function safeCloseOrderDetail() {
    const noteInput = $("#orderNoteInput");
    if (noteInput && noteInput.value.trim() !== '') {
      if (!confirm('Tienes una nota sin guardar. \u00bfDescartar y cerrar?')) return;
    }
    closeOrderDetailModal();
  }

})(window.Jewd);

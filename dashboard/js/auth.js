/**
 * Jewelry Dashboard — Authentication Module
 * Manages login, session persistence, logout, and role-based access.
 *
 * @version 1.0.0
 */
const JewdAuth = (function () {
  "use strict";

  const STORAGE_KEY = "jewd_session";
  const TOKEN_KEY = "jewd_token";

  let _currentUser = null;
  let _token = null;

  /**
   * Initialize auth — check for existing session.
   * @returns {Promise<boolean>} true if authenticated
   */
  async function init() {
    _token = sessionStorage.getItem(TOKEN_KEY);
    const cached = sessionStorage.getItem(STORAGE_KEY);

    if (!_token) {
      showLogin();
      return false;
    }

    // Verify token with server
    try {
      const verifyUrl = _apiUrl("/jewd/v1/auth/verify");
      const res = await fetch(verifyUrl, {
        headers: { Authorization: "Bearer " + _token },
      });
      if (!res.ok) {
        clearSession();
        showLogin();
        return false;
      }
      const vCt = (res.headers.get("content-type") || "").toLowerCase();
      if (!vCt.includes("application/json")) {
        console.error("[JEWD Auth] Verify got non-JSON response");
        clearSession();
        showLogin();
        return false;
      }
      _currentUser = await res.json();
      hideLogin();
      applyPermissions();
      updateUserUI();
      return true;
    } catch (e) {
      // Network error — require re-login for security.
      // Never fall back to cached data as sessionStorage can be tampered with.
      console.warn("[JEWD Auth] Network error verifying token:", e.message);
      clearSession();
      showLogin();
      return false;
    }
  }

  /**
   * Login with username/password.
   */
  async function login(username, password) {
    const btn = document.querySelector("#loginBtn");
    const errEl = document.querySelector("#loginError");
    if (btn) btn.disabled = true;
    if (errEl) errEl.textContent = "";

    try {
      const url = _apiUrl("/jewd/v1/auth/login");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("application/json")) {
        const text = await res.text();
        console.error(
          "[JEWD Auth] Non-JSON response (" + res.status + "):",
          text.substring(0, 300),
        );
        if (errEl)
          errEl.textContent =
            "Error: el servidor respondió HTML en vez de JSON (status " +
            res.status +
            "). Limpia caché (Ctrl+Shift+R).";
        return false;
      }

      const data = await res.json();

      if (!res.ok) {
        if (errEl) errEl.textContent = data.error || "Error de autenticación";
        return false;
      }

      _token = data.token;
      _currentUser = data;

      sessionStorage.setItem(TOKEN_KEY, _token);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      hideLogin();
      applyPermissions();
      updateUserUI();
      return true;
    } catch (e) {
      if (errEl) errEl.textContent = "Error de conexión: " + e.message;
      return false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Logout — clear session and reload page for a clean slate.
   * Full reload ensures zero in-memory state leakage between users
   * (dashboard state, POS cart, cached products, event listeners, etc.).
   */
  async function logout() {
    try {
      if (_token) {
        await fetch(_apiUrl("/jewd/v1/auth/logout"), {
          method: "POST",
          headers: { Authorization: "Bearer " + _token },
        });
      }
    } catch (e) {
      // Ignore — we're logging out anyway
    }
    clearSession();
    // Reset to default section and reload — ensures all modules
    // start from scratch with no stale data from previous user.
    window.location.hash = "#/products";
    window.location.reload();
  }

  /**
   * Get auth headers for API calls.
   */
  function authHeaders() {
    if (!_token) return {};
    return { Authorization: "Bearer " + _token };
  }

  /**
   * Get current user info.
   */
  function currentUser() {
    return _currentUser;
  }

  /**
   * Check if user has a specific permission.
   */
  function can(permission) {
    if (!_currentUser || !_currentUser.permissions) return false;
    return !!_currentUser.permissions[permission];
  }

  /**
   * Check if user is logged in.
   */
  function isAuthenticated() {
    return !!_token && !!_currentUser;
  }

  // ── Internal Functions ──────────────────────────────────────────────

  function _apiUrl(path) {
    const cfg = window.JEWD_CONFIG || {};
    let base = cfg.wpBaseUrl || "/api";

    // If base is a relative path, apply the same /dashboard prefix logic as api.js
    if (!/^https?:\/\//i.test(base)) {
      const loc = window.location.pathname || "/";
      const isDashboardPath = loc === "/dashboard" || loc.startsWith("/dashboard/");
      if (isDashboardPath && base.startsWith("/api")) {
        base = "/dashboard" + base;
      }
    }

    return base + path;
  }

  function clearSession() {
    _token = null;
    _currentUser = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function showLogin() {
    const overlay = document.querySelector("#loginOverlay");
    const app = document.querySelector("#jewd-app");
    if (overlay) overlay.classList.add("active");
    if (app) app.classList.add("jewd-locked");
    // Clear previous credentials
    const userInput = document.querySelector("#loginUsername");
    const passInput = document.querySelector("#loginPassword");
    const errEl = document.querySelector("#loginError");
    if (userInput) userInput.value = "";
    if (passInput) passInput.value = "";
    if (errEl) errEl.textContent = "";
    // Focus username field
    setTimeout(() => {
      if (userInput) userInput.focus();
    }, 100);
  }

  function hideLogin() {
    const overlay = document.querySelector("#loginOverlay");
    const app = document.querySelector("#jewd-app");
    if (overlay) overlay.classList.remove("active");
    if (app) app.classList.remove("jewd-locked");
  }

  /**
   * Apply role-based visibility to UI elements.
   * Elements with data-permission="xxx" are shown/hidden.
   */
  function applyPermissions() {
    if (!_currentUser || !_currentUser.permissions) {
      console.warn("[JEWD Auth] applyPermissions: no user or permissions!", _currentUser);
      return;
    }
    document.querySelectorAll("[data-permission]").forEach((el) => {
      const perm = el.getAttribute("data-permission");
      const allowed = can(perm);
      if (allowed) {
        el.style.display = "";
        el.removeAttribute("aria-hidden");
      } else {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
      }
    });

    // Show/hide nav items based on section permissions
    const permMap = {
      products: "view_products",
      orders: "view_orders",
      pos: "create_orders",
      reports: "view_reports",
      settings: "manage_settings",
      users: "manage_users",
    };

    document.querySelectorAll(".jewd-nav-item").forEach((el) => {
      const section = el.getAttribute("data-section");
      const reqPerm = permMap[section];
      if (reqPerm && !can(reqPerm)) {
        el.style.display = "none";
      } else {
        el.style.display = "";
      }
    });
  }

  /**
   * Update user display in topbar and sidebar.
   */
  function updateUserUI() {
    const nameEl = document.querySelector("#currentUserName");
    const roleEl = document.querySelector("#currentUserRole");
    const avatarEl = document.querySelector("#currentUserAvatar");
    const logoutBtn = document.querySelector("#btnLogout");

    // Sidebar elements
    const sidebarFooter = document.querySelector("#sidebarFooter");
    const sidebarName = document.querySelector("#sidebarUserName");
    const sidebarRole = document.querySelector("#sidebarUserRole");
    const sidebarLogout = document.querySelector("#btnSidebarLogout");

    if (_currentUser) {
      const displayName = _currentUser.display_name || _currentUser.username;
      const roleLabel = _currentUser.role_label || _currentUser.role;

      // Topbar
      if (nameEl) nameEl.textContent = displayName;
      if (roleEl) roleEl.textContent = roleLabel;
      if (avatarEl && _currentUser.avatar_url) {
        avatarEl.src = _currentUser.avatar_url;
        avatarEl.style.display = "";
      }
      if (logoutBtn) logoutBtn.style.display = "";

      // Sidebar footer
      if (sidebarFooter) sidebarFooter.style.display = "";
      if (sidebarName) sidebarName.textContent = displayName;
      if (sidebarRole) sidebarRole.textContent = roleLabel;
      if (sidebarLogout) {
        sidebarLogout.addEventListener("click", () => logout());
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  return {
    init,
    login,
    logout,
    authHeaders,
    currentUser,
    can,
    isAuthenticated,
  };
})();

// Expose globally so other scripts can use window.JewdAuth.can()
window.JewdAuth = JewdAuth;

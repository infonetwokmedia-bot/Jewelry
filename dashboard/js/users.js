/**
 * Jewelry Dashboard — User Management Module
 * CRUD operations for users from the dashboard.
 *
 * @version 1.0.0
 */
const JewdUsers = (function () {
  "use strict";

  let _users = [];
  let _roles = [];
  let _loaded = false;

  // Role badges colors
  const ROLE_COLORS = {
    administrator: "#d4af37",
    shop_manager: "#2ecc71",
    jewelry_seller: "#3498db",
    jewelry_viewer: "#95a5a6",
  };

  const ROLE_ICONS = {
    administrator: "👑",
    shop_manager: "🏪",
    jewelry_seller: "💎",
    jewelry_viewer: "👁",
  };

  /**
   * Initialize — load users and roles.
   */
  async function init() {
    if (!JewdAuth.can("manage_users")) return;

    try {
      await Promise.all([loadUsers(), loadRoles()]);
      _loaded = true;
      render();
    } catch (e) {
      showError("Error cargando usuarios: " + e.message);
    }
  }

  /**
   * Reload data and re-render.
   */
  async function refresh() {
    await Promise.all([loadUsers(), loadRoles()]);
    render();
  }

  // ── API Calls ──────────────────────────────────────────────────────

  /** Resolve base URL, handling /dashboard/ path prefix. */
  function _baseUrl() {
    const cfg = window.JEWD_CONFIG || {};
    let base = cfg.wpBaseUrl || "/api";
    if (!/^https?:\/\//i.test(base)) {
      const loc = window.location.pathname || "/";
      if ((loc === "/dashboard" || loc.startsWith("/dashboard/")) && base.startsWith("/api")) {
        base = "/dashboard" + base;
      }
    }
    return base;
  }

  function _authQuery() {
    const cfg = window.JEWD_CONFIG || {};
    return (
      "consumer_key=" +
      encodeURIComponent(cfg.consumerKey) +
      "&consumer_secret=" +
      encodeURIComponent(cfg.consumerSecret)
    );
  }

  async function loadUsers() {
    const url = _baseUrl() + "/jewd/v1/users?" + _authQuery();

    const res = await fetch(url, {
      headers: { ...JewdAuth.authHeaders() },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    _users = await res.json();
  }

  async function loadRoles() {
    const url = _baseUrl() + "/jewd/v1/roles?" + _authQuery();

    const res = await fetch(url, {
      headers: { ...JewdAuth.authHeaders() },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    _roles = await res.json();
  }

  async function apiCreateUser(data) {
    const url = _baseUrl() + "/jewd/v1/users?" + _authQuery();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...JewdAuth.authHeaders(),
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error creando usuario");
    return json;
  }

  async function apiUpdateUser(id, data) {
    const url = _baseUrl() + "/jewd/v1/users/" + id + "?" + _authQuery();

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...JewdAuth.authHeaders(),
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error actualizando usuario");
    return json;
  }

  async function apiDeleteUser(id) {
    const url = _baseUrl() + "/jewd/v1/users/" + id + "?" + _authQuery();

    const res = await fetch(url, {
      method: "DELETE",
      headers: { ...JewdAuth.authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error eliminando usuario");
    return json;
  }

  // ── Render ─────────────────────────────────────────────────────────

  function render() {
    const container = document.querySelector("#usersTable");
    if (!container) return;

    if (_users.length === 0) {
      container.innerHTML =
        '<tr><td colspan="7" class="jewd-empty">No hay usuarios registrados</td></tr>';
      return;
    }

    container.innerHTML = _users
      .map(
        (u) => `
      <tr class="jewd-user-row${u.is_protected ? " jewd-user-protected" : ""}">
        <td>
          <img src="${esc(u.avatar_url)}" alt="${esc(u.display_name)}"
               class="jewd-user-avatar" width="32" height="32"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><circle cx=%2216%22 cy=%2216%22 r=%2216%22 fill=%22%23555%22/><text x=%2216%22 y=%2221%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2214%22>${esc(u.display_name.charAt(0))}</text></svg>'"/>
        </td>
        <td>
          <strong>${esc(u.display_name)}</strong>
          <div class="jewd-user-username">@${esc(u.username)}</div>
        </td>
        <td>${esc(u.email)}</td>
        <td>
          <span class="jewd-role-badge" style="background:${ROLE_COLORS[u.role] || "#666"}">
            ${ROLE_ICONS[u.role] || "👤"} ${esc(u.role_label)}
          </span>
        </td>
        <td>${esc(u.phone || "—")}</td>
        <td>${formatDate(u.registered)}</td>
        <td class="jewd-center">
          <button class="jewd-btn jewd-btn-sm jewd-btn-outline jewd-user-edit"
                  data-id="${u.id}" title="Editar">✏️</button>
          ${
            u.is_protected
              ? '<span class="jewd-user-shield" title="Protegido">🛡️</span>'
              : `<button class="jewd-btn jewd-btn-sm jewd-btn-danger jewd-user-delete"
                         data-id="${u.id}" data-name="${esc(u.display_name)}"
                         title="Eliminar">🗑</button>`
          }
        </td>
      </tr>`,
      )
      .join("");

    // Bind events
    container.querySelectorAll(".jewd-user-edit").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(Number(btn.dataset.id)));
    });
    container.querySelectorAll(".jewd-user-delete").forEach((btn) => {
      btn.addEventListener("click", () => confirmDelete(Number(btn.dataset.id), btn.dataset.name));
    });

    // Update role summary cards
    renderRoleSummary();
  }

  function renderRoleSummary() {
    const container = document.querySelector("#userRoleSummary");
    if (!container || !_roles.length) return;

    container.innerHTML = _roles
      .map(
        (r) => `
      <div class="jewd-role-card">
        <div class="jewd-role-card-icon" style="color:${ROLE_COLORS[r.slug] || "#666"}">
          ${ROLE_ICONS[r.slug] || "👤"}
        </div>
        <div class="jewd-role-card-info">
          <div class="jewd-role-card-name">${esc(r.name)}</div>
          <div class="jewd-role-card-count">${r.user_count} usuario${r.user_count !== 1 ? "s" : ""}</div>
        </div>
      </div>`,
      )
      .join("");
  }

  // ── Modals ─────────────────────────────────────────────────────────

  function openCreateModal() {
    const modal = document.querySelector("#userModal");
    if (!modal) return;

    document.querySelector("#userModalTitle").textContent = "➕ Nuevo Usuario";
    document.querySelector("#userModalForm").reset();
    document.querySelector("#userModalId").value = "";
    document.querySelector("#userModalPassword").required = true;
    document.querySelector("#userModalPassword").placeholder = "Contraseña (obligatoria)";
    // Show password field for new users
    document.querySelector("#userPasswordGroup").style.display = "";
    document.querySelector("#generatedPasswordInfo").style.display = "none";

    modal.classList.add("active");
    document.querySelector("#userModalUsername").focus();
  }

  function openEditModal(userId) {
    const user = _users.find((u) => u.id === userId);
    if (!user) return;

    const modal = document.querySelector("#userModal");
    if (!modal) return;

    document.querySelector("#userModalTitle").textContent = "✏️ Editar: " + user.display_name;
    document.querySelector("#userModalId").value = user.id;
    document.querySelector("#userModalUsername").value = user.username;
    document.querySelector("#userModalUsername").disabled = true; // Can't change username
    document.querySelector("#userModalEmail").value = user.email;
    document.querySelector("#userModalDisplayName").value = user.display_name;
    document.querySelector("#userModalFirstName").value = user.first_name || "";
    document.querySelector("#userModalLastName").value = user.last_name || "";
    document.querySelector("#userModalPhone").value = user.phone || "";
    document.querySelector("#userModalRole").value = user.role;
    document.querySelector("#userModalPassword").value = "";
    document.querySelector("#userModalPassword").required = false;
    document.querySelector("#userModalPassword").placeholder = "Dejar vacío para no cambiar";
    document.querySelector("#generatedPasswordInfo").style.display = "none";

    // Protect admin role change for user ID 1
    if (user.is_protected) {
      document.querySelector("#userModalRole").disabled = true;
    } else {
      document.querySelector("#userModalRole").disabled = false;
    }

    modal.classList.add("active");
    document.querySelector("#userModalEmail").focus();
  }

  function closeModal() {
    const modal = document.querySelector("#userModal");
    if (modal) modal.classList.remove("active");
    document.querySelector("#userModalUsername").disabled = false;
    document.querySelector("#userModalRole").disabled = false;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.querySelector("#userModalId").value;
    const isEdit = !!id;

    const data = {
      email: document.querySelector("#userModalEmail").value.trim(),
      display_name: document.querySelector("#userModalDisplayName").value.trim(),
      first_name: document.querySelector("#userModalFirstName").value.trim(),
      last_name: document.querySelector("#userModalLastName").value.trim(),
      phone: document.querySelector("#userModalPhone").value.trim(),
      role: document.querySelector("#userModalRole").value,
    };

    if (!isEdit) {
      data.username = document.querySelector("#userModalUsername").value.trim();
    }

    const pwd = document.querySelector("#userModalPassword").value;
    if (pwd) {
      data.password = pwd;
    }

    const saveBtn = document.querySelector("#userModalSave");
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";

    try {
      if (isEdit) {
        await apiUpdateUser(Number(id), data);
        showToast("✅ Usuario actualizado");
      } else {
        const result = await apiCreateUser(data);
        if (result.generated_password) {
          // Show generated password
          const infoEl = document.querySelector("#generatedPasswordInfo");
          infoEl.style.display = "block";
          infoEl.innerHTML = `
            <div class="jewd-generated-pw">
              <strong>⚠️ Contraseña generada:</strong>
              <code>${esc(result.generated_password)}</code>
              <button class="jewd-btn jewd-btn-sm jewd-btn-outline jewd-copy-pw"
                      title="Copiar">📋</button>
            </div>
            <p class="jewd-pw-warning">Guarda esta contraseña. No se mostrará de nuevo.</p>`;
          infoEl.querySelector(".jewd-copy-pw").addEventListener("click", () => {
            navigator.clipboard.writeText(result.generated_password);
            showToast("📋 Copiado al portapapeles");
          });
        }
        showToast("✅ Usuario creado: " + result.display_name);
      }

      await refresh();
      if (isEdit) closeModal();
    } catch (e) {
      showToast("❌ " + e.message, true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Guardar";
    }
  }

  function confirmDelete(userId, name) {
    if (
      !confirm(
        `¿Eliminar al usuario "${name}"?\n\nSu contenido será reasignado al administrador principal.`,
      )
    ) {
      return;
    }
    performDelete(userId);
  }

  async function performDelete(userId) {
    try {
      await apiDeleteUser(userId);
      showToast("🗑 Usuario eliminado");
      await refresh();
    } catch (e) {
      showToast("❌ " + e.message, true);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  function esc(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function showToast(msg, isError) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "jewd-toast show" + (isError ? " jewd-toast-error" : "");
    setTimeout(() => (toast.className = "jewd-toast"), 3000);
  }

  function showError(msg) {
    const container = document.querySelector("#usersTable");
    if (container) {
      container.innerHTML = `<tr><td colspan="7" class="jewd-error">${esc(msg)}</td></tr>`;
    }
  }

  /**
   * Bind events after DOM is ready.
   */
  function bindEvents() {
    const createBtn = document.querySelector("#btnNewUser");
    if (createBtn) createBtn.addEventListener("click", openCreateModal);

    const form = document.querySelector("#userModalForm");
    if (form) form.addEventListener("submit", handleFormSubmit);

    const closeBtn = document.querySelector("#userModalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    const cancelBtn = document.querySelector("#userModalCancel");
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    // Close on overlay click
    const modal = document.querySelector("#userModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  return {
    init,
    refresh,
    bindEvents,
    openCreateModal,
  };
})();

/**
 * Tu Joyita Miami Dashboard — Google Business Profile Module
 *
 * Manages reviews, posts, metrics, media, Q&A, and business info
 * via the PHP proxy at /jewd/v1/gbp/*.
 *
 * @version 2.0.0
 */
(function (J) {
  "use strict";

  const { state, $, $$, esc } = J;
  const { toast } = J;

  /* ===== GBP STATE ===== */
  const gbpState = {
    connected: false,
    activeTab: "overview",
    reviews: { items: [], nextPageToken: null, pageSize: 10, totalCount: 0, averageRating: 0 },
    reviewFilter: { stars: "all", unanswered: false },
    posts: [],
    metrics: {},
    metricsDateRange: { start: null, end: null, label: "30" },
    keywords: [],
    info: null,
    media: [],
    questions: [],
    loading: false,
    pendingRequests: new Map(),
  };

  /* ===== REQUEST DEDUPLICATION (A3) ===== */

  async function dedupRequest(key, fn) {
    if (gbpState.pendingRequests.has(key)) {
      return gbpState.pendingRequests.get(key);
    }
    const promise = fn().finally(() => gbpState.pendingRequests.delete(key));
    gbpState.pendingRequests.set(key, promise);
    return promise;
  }

  /* ===== HELPERS ===== */

  function daysAgo(n) {
    return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function showSkeleton(container, type) {
    const skeletons = {
      cards: `<div class="gbp-kpi-grid">${'<div class="gbp-skeleton gbp-skeleton-card"></div>'.repeat(4)}</div>`,
      list: Array.from({ length: 5 }, (_, i) =>
        `<div class="gbp-skeleton gbp-skeleton-line" style="width:${75 + i * 4}%"></div>`
      ).join(""),
      chart: '<div class="gbp-skeleton gbp-skeleton-chart"></div>',
    };
    container.innerHTML = skeletons[type] || skeletons.list;
  }

  const STAR_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  function starCount(rating) {
    return STAR_MAP[rating] || 0;
  }
  function starsHtml(n, cls) {
    return `<span class="${cls || "gbp-stars-sm"}">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`;
  }

  /* ===== MAIN SECTION LOADER ===== */

  async function loadGBPSection() {
    if (gbpState.loading) return;
    gbpState.loading = true;

    const container = $("#sectionGbp .gbp-content");
    if (!container) {
      gbpState.loading = false;
      return;
    }

    try {
      const { data: status } = await dedupRequest("status", () => JewdAPI.getGBPStatus());
      gbpState.connected = status.connected;

      if (!status.connected) {
        renderSetup(container);
      } else {
        renderTabs(container);
        await loadTab(gbpState.activeTab);
      }
    } catch (err) {
      container.innerHTML = `<div class="jewd-alert jewd-alert-error">
        Error loading GBP: ${esc(err.message)}</div>`;
    } finally {
      gbpState.loading = false;
    }
  }

  /* ===== SETUP (not connected) ===== */

  function renderSetup(container) {
    container.innerHTML = `
      <div class="gbp-setup">
        <div class="jewd-card" style="max-width:600px;margin:2rem auto;text-align:center">
          <h3>Conectar Google Business Profile</h3>
          <p style="color:var(--jewd-text-muted);margin:1rem 0">
            Conecta tu perfil de Google Business para gestionar reseñas, publicaciones,
            métricas y más directamente desde el dashboard.
          </p>
          <div style="text-align:left;margin:1.5rem 0">
            <label class="jewd-label">Client ID</label>
            <input type="text" id="gbpClientId" class="jewd-input" placeholder="xxxx.apps.googleusercontent.com">
            <label class="jewd-label" style="margin-top:.75rem">Client Secret</label>
            <input type="password" id="gbpClientSecret" class="jewd-input" placeholder="GOCSPX-...">
          </div>
          <button id="gbpConnectBtn" class="jewd-btn jewd-btn-primary">
            Conectar con Google
          </button>
          <p style="font-size:.85rem;color:var(--jewd-text-muted);margin-top:1rem">
            Necesitas crear credenciales OAuth en
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">
              Google Cloud Console</a>.
          </p>
        </div>
      </div>`;

    const btn = $("#gbpConnectBtn");
    if (btn) btn.addEventListener("click", handleConnect);
  }

  async function handleConnect() {
    const clientId = ($("#gbpClientId") || {}).value?.trim();
    const clientSecret = ($("#gbpClientSecret") || {}).value?.trim();

    if (!clientId || !clientSecret) {
      toast("Ingresa Client ID y Client Secret", "error");
      return;
    }

    const btn = $("#gbpConnectBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Conectando..."; }

    try {
      const { data } = await JewdAPI.initGBPOAuth(clientId, clientSecret);
      window.open(data.authUrl, "gbp-auth", "width=600,height=700");
      toast("Autoriza en la ventana de Google y luego recarga esta página", "info");
    } catch (err) {
      toast("Error: " + err.message, "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Conectar con Google"; }
    }
  }

  /* ===== TABBED INTERFACE ===== */

  const TABS = [
    { id: "overview", label: "Resumen", icon: "📊" },
    { id: "reviews", label: "Reseñas", icon: "⭐" },
    { id: "posts", label: "Publicaciones", icon: "📝" },
    { id: "metrics", label: "Métricas", icon: "📈" },
    { id: "media", label: "Fotos", icon: "📷" },
    { id: "qanda", label: "Preguntas", icon: "❓" },
    { id: "info", label: "Negocio", icon: "🏪" },
  ];

  function renderTabs(container) {
    const tabsHtml = TABS.map(
      (t) =>
        `<button class="gbp-tab${t.id === gbpState.activeTab ? " active" : ""}" data-tab="${t.id}">
          ${t.icon} ${t.label}
        </button>`
    ).join("");

    container.innerHTML = `
      <div class="gbp-tabs">${tabsHtml}</div>
      <div class="gbp-tab-content" id="gbpTabContent"></div>`;

    container.querySelectorAll(".gbp-tab").forEach((tabEl) => {
      tabEl.addEventListener("click", () => {
        const tab = tabEl.dataset.tab;
        gbpState.activeTab = tab;
        container.querySelectorAll(".gbp-tab").forEach((t) => t.classList.remove("active"));
        tabEl.classList.add("active");
        loadTab(tab);
      });
    });
  }

  async function loadTab(tab) {
    const content = $("#gbpTabContent");
    if (!content) return;

    showSkeleton(content, tab === "overview" || tab === "metrics" ? "cards" : "list");

    try {
      switch (tab) {
        case "overview": await loadOverview(content); break;
        case "reviews":  await loadReviews(content); break;
        case "posts":    await loadPosts(content); break;
        case "metrics":  await loadMetrics(content); break;
        case "media":    await loadMedia(content); break;
        case "qanda":    await loadQAndA(content); break;
        case "info":     await loadInfo(content); break;
      }
    } catch (err) {
      content.innerHTML = `<div class="jewd-alert jewd-alert-error">Error: ${esc(err.message)}</div>`;
    }
  }

  /* ===== OVERVIEW TAB (B) ===== */

  async function loadOverview(content) {
    const startDate = daysAgo(30);
    const endDate = today();

    const [reviewsRes, postsRes, metricsRes] = await Promise.all([
      dedupRequest("reviews_overview", () => JewdAPI.getGBPReviews({ pageSize: 50 })),
      dedupRequest("posts_overview", () => JewdAPI.getGBPPosts({ pageSize: 20 })),
      dedupRequest("metrics_overview", () => JewdAPI.getGBPMetrics({ startDate, endDate })),
    ]);

    const reviews = reviewsRes.data?.reviews || [];
    const avgRating = reviewsRes.data?.averageRating || 0;
    const totalReviews = reviewsRes.data?.totalReviewCount || reviews.length;
    const activePosts = (postsRes.data?.localPosts || []).length;
    const impressions = countMetricTotal(metricsRes.data);
    const dailyValues = extractDailyValues(metricsRes.data);
    const pendingReviews = reviews.filter((r) => !r.reviewReply).slice(0, 5);

    let html = `
      <div class="gbp-kpi-grid">
        <div class="gbp-kpi-card">
          <div class="gbp-kpi-value">${avgRating.toFixed(1)}</div>
          <div class="gbp-kpi-label">⭐ Rating Promedio</div>
        </div>
        <div class="gbp-kpi-card">
          <div class="gbp-kpi-value">${totalReviews}</div>
          <div class="gbp-kpi-label">📝 Reseñas Totales</div>
        </div>
        <div class="gbp-kpi-card">
          <div class="gbp-kpi-value">${activePosts}</div>
          <div class="gbp-kpi-label">📋 Posts Activos</div>
        </div>
        <div class="gbp-kpi-card">
          <div class="gbp-kpi-value">${formatNumber(impressions)}</div>
          <div class="gbp-kpi-label">👁 Impresiones 30d</div>
        </div>
      </div>

      <div class="gbp-overview-chart jewd-card">
        <h4>Impresiones — Últimos 30 días</h4>
        <div class="gbp-chart-container">
          <canvas id="gbpOverviewChart"></canvas>
        </div>
      </div>`;

    if (pendingReviews.length > 0) {
      html += `<div class="gbp-pending-reviews jewd-card">
        <h4>⭐ Reseñas sin responder (${pendingReviews.length})</h4>`;
      for (const r of pendingReviews) {
        const n = starCount(r.starRating);
        const name = r.reviewer?.displayName || "Anónimo";
        const text = (r.comment || "").slice(0, 100) + ((r.comment || "").length > 100 ? "…" : "");
        html += `<div class="gbp-pending-item">
          <strong>${esc(name)}</strong> ${starsHtml(n)}
          <p>${esc(text)}</p>
        </div>`;
      }
      html += `<button class="jewd-btn jewd-btn-sm gbp-link-btn" data-goto="reviews">Ver todas →</button></div>`;
    }

    content.innerHTML = html;

    // Draw chart
    if (dailyValues.length > 0) {
      requestAnimationFrame(() => drawLineChart("gbpOverviewChart", dailyValues, "#4285F4"));
    }

    // "Ver todas" link
    content.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => {
        gbpState.activeTab = btn.dataset.goto;
        gbpState.reviewFilter = { stars: "all", unanswered: true };
        const container = $("#sectionGbp .gbp-content");
        if (container) { renderTabs(container); loadTab(btn.dataset.goto); }
      });
    });
  }

  /* ===== REVIEWS TAB (C) ===== */

  async function loadReviews(content) {
    const { data } = await dedupRequest("reviews_full", () =>
      JewdAPI.getGBPReviews({ pageSize: 50 })
    );
    const allReviews = data.reviews || [];
    gbpState.reviews.items = allReviews;
    gbpState.reviews.averageRating = data.averageRating || 0;
    gbpState.reviews.totalCount = data.totalReviewCount || allReviews.length;
    gbpState.reviews.nextPageToken = data.nextPageToken || null;

    renderReviewsUI(content);
  }

  function renderReviewsUI(content) {
    const all = gbpState.reviews.items;
    const avg = gbpState.reviews.averageRating;
    const total = gbpState.reviews.totalCount;

    if (all.length === 0) {
      content.innerHTML = '<div class="gbp-empty">No hay reseñas aún.</div>';
      return;
    }

    // Build distribution
    const dist = [0, 0, 0, 0, 0]; // index 0=1star, 4=5stars
    for (const r of all) { dist[starCount(r.starRating) - 1]++; }

    // Apply filters
    const f = gbpState.reviewFilter;
    let filtered = all;
    if (f.stars !== "all") {
      filtered = filtered.filter((r) => starCount(r.starRating) === parseInt(f.stars));
    }
    if (f.unanswered) {
      filtered = filtered.filter((r) => !r.reviewReply);
    }

    // Summary + Distribution
    const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
    let html = `
      <div class="gbp-review-summary">
        <span class="gbp-rating-big">${avg.toFixed(1)}</span>
        <span class="gbp-stars">${stars}</span>
        <span class="gbp-review-count">${total} reseñas</span>
      </div>
      <div class="gbp-rating-distribution">
        ${[5, 4, 3, 2, 1].map((s) => {
          const count = dist[s - 1];
          const pct = all.length ? Math.round((count / all.length) * 100) : 0;
          const colors = ["#EA4335", "#FF9800", "#FFC107", "#8BC34A", "#34A853"];
          return `<div class="gbp-rating-row">
            <span class="gbp-rating-label">${s} ★</span>
            <div class="gbp-rating-bar-container">
              <div class="gbp-rating-bar" style="width:${pct}%;background:${colors[s - 1]}"></div>
            </div>
            <span class="gbp-rating-count">${count} (${pct}%)</span>
          </div>`;
        }).join("")}
      </div>`;

    // Filters
    html += `<div class="gbp-rating-filter">
      ${["all", "5", "4", "3", "2", "1"].map((v) =>
        `<button class="gbp-filter-btn${f.stars === v ? " active" : ""}" data-stars="${v}">
          ${v === "all" ? "Todas" : "★".repeat(parseInt(v))} ${v !== "all" ? `(${dist[parseInt(v) - 1]})` : ""}
        </button>`
      ).join("")}
      <label class="gbp-filter-checkbox">
        <input type="checkbox" id="gbpFilterUnanswered" ${f.unanswered ? "checked" : ""}>
        Solo sin responder
      </label>
    </div>`;

    // Review list
    html += `<div class="gbp-review-list">`;
    for (const review of filtered) {
      const numStars = starCount(review.starRating);
      const name = review.reviewer?.displayName || "Anónimo";
      const comment = review.comment || "";
      const date = review.updateTime ? new Date(review.updateTime).toLocaleDateString("es-US") : "";
      const reviewId = (review.name || "").split("/").pop();
      const hasReply = !!review.reviewReply;

      html += `
        <div class="gbp-review-card" data-review-id="${esc(reviewId)}">
          <div class="gbp-review-header">
            <strong>${esc(name)}</strong>
            ${starsHtml(numStars)}
            <span class="gbp-review-date">${esc(date)}</span>
          </div>
          ${comment ? `<p class="gbp-review-text">${esc(comment)}</p>` : ""}
          ${hasReply
            ? `<div class="gbp-reply">
                <strong>Tu respuesta:</strong>
                <p>${esc(review.reviewReply.comment)}</p>
                <button class="jewd-btn jewd-btn-sm jewd-btn-danger gbp-delete-reply" data-id="${esc(reviewId)}">Eliminar respuesta</button>
              </div>`
            : `<div class="gbp-reply-form">
                <textarea class="jewd-input gbp-reply-input" placeholder="Escribe tu respuesta..." rows="2"></textarea>
                <div class="gbp-ai-suggest" title="Próximamente: sugerencias con IA">
                  <button class="jewd-btn jewd-btn-sm" disabled>🤖 Sugerir (pronto)</button>
                </div>
                <button class="jewd-btn jewd-btn-sm jewd-btn-primary gbp-send-reply" data-id="${esc(reviewId)}">Responder</button>
              </div>`
          }
        </div>`;
    }
    html += `</div>`;

    // Pagination
    if (gbpState.reviews.nextPageToken) {
      html += `<div class="gbp-pagination">
        <button class="jewd-btn jewd-btn-sm" id="gbpLoadMoreReviews">Cargar más reseñas →</button>
      </div>`;
    }

    content.innerHTML = html;

    // Filter handlers
    content.querySelectorAll("[data-stars]").forEach((btn) => {
      btn.addEventListener("click", () => {
        gbpState.reviewFilter.stars = btn.dataset.stars;
        renderReviewsUI(content);
      });
    });
    const unansweredCb = content.querySelector("#gbpFilterUnanswered");
    if (unansweredCb) {
      unansweredCb.addEventListener("change", () => {
        gbpState.reviewFilter.unanswered = unansweredCb.checked;
        renderReviewsUI(content);
      });
    }

    // Reply handlers
    content.querySelectorAll(".gbp-send-reply").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest(".gbp-review-card");
        const input = card.querySelector(".gbp-reply-input");
        const comment = input?.value?.trim();
        if (!comment) return;
        btn.disabled = true;
        try {
          await JewdAPI.replyGBPReview(btn.dataset.id, comment);
          toast("Respuesta enviada", "success");
          await loadReviews(content);
        } catch (err) {
          toast("Error: " + err.message, "error");
          btn.disabled = false;
        }
      });
    });

    content.querySelectorAll(".gbp-delete-reply").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta respuesta?")) return;
        btn.disabled = true;
        try {
          await JewdAPI.deleteGBPReply(btn.dataset.id);
          toast("Respuesta eliminada", "success");
          await loadReviews(content);
        } catch (err) {
          toast("Error: " + err.message, "error");
          btn.disabled = false;
        }
      });
    });

    // Load more
    const loadMoreBtn = content.querySelector("#gbpLoadMoreReviews");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", async () => {
        loadMoreBtn.disabled = true;
        try {
          const { data } = await JewdAPI.getGBPReviews({
            pageSize: 50,
            pageToken: gbpState.reviews.nextPageToken,
          });
          gbpState.reviews.items = gbpState.reviews.items.concat(data.reviews || []);
          gbpState.reviews.nextPageToken = data.nextPageToken || null;
          renderReviewsUI(content);
        } catch (err) {
          toast("Error: " + err.message, "error");
          loadMoreBtn.disabled = false;
        }
      });
    }
  }

  /* ===== POSTS TAB (D) ===== */

  async function loadPosts(content) {
    const { data } = await dedupRequest("posts_list", () => JewdAPI.getGBPPosts({ pageSize: 20 }));
    const posts = data.localPosts || [];
    gbpState.posts = posts;

    let html = `
      <div class="gbp-posts-header">
        <button id="gbpNewPostBtn" class="jewd-btn jewd-btn-primary">+ Nueva Publicación</button>
      </div>
      <div id="gbpNewPostForm" style="display:none" class="jewd-card gbp-post-form">
        <label class="jewd-label">Tipo de publicación</label>
        <select id="gbpPostType" class="jewd-input gbp-select">
          <option value="STANDARD">📰 Novedad</option>
          <option value="EVENT">📅 Evento</option>
          <option value="OFFER">🏷️ Oferta</option>
        </select>

        <div class="gbp-lang-toggle">
          <button class="gbp-lang-btn active" data-lang="es">🇪🇸 ES</button>
          <button class="gbp-lang-btn" data-lang="en">🇺🇸 EN</button>
        </div>
        <label class="jewd-label gbp-lang-indicator">Redactando en: 🇪🇸 Español</label>
        <textarea id="gbpPostSummary" class="jewd-input" rows="3" placeholder="Escribe tu publicación..."></textarea>

        <div id="gbpEventFields" class="gbp-conditional-fields" style="display:none">
          <label class="jewd-label">Nombre del evento</label>
          <input type="text" id="gbpEventTitle" class="jewd-input" placeholder="Nombre del evento">
          <div class="gbp-date-range">
            <div><label class="jewd-label">Inicio</label><input type="datetime-local" id="gbpEventStart" class="jewd-input"></div>
            <div><label class="jewd-label">Fin</label><input type="datetime-local" id="gbpEventEnd" class="jewd-input"></div>
          </div>
        </div>

        <div id="gbpOfferFields" class="gbp-conditional-fields" style="display:none">
          <label class="jewd-label">Título de la oferta</label>
          <input type="text" id="gbpOfferTitle" class="jewd-input" placeholder="Título de la oferta">
          <label class="jewd-label">Código de cupón (opcional)</label>
          <input type="text" id="gbpCouponCode" class="jewd-input" placeholder="DESCUENTO10">
          <label class="jewd-label">URL de redención (opcional)</label>
          <input type="url" id="gbpRedeemUrl" class="jewd-input" placeholder="https://tujoyita.com/...">
          <div class="gbp-date-range">
            <div><label class="jewd-label">Válida desde</label><input type="datetime-local" id="gbpOfferStart" class="jewd-input"></div>
            <div><label class="jewd-label">Válida hasta</label><input type="datetime-local" id="gbpOfferEnd" class="jewd-input"></div>
          </div>
        </div>

        <div class="gbp-cta-section">
          <label class="jewd-label">Botón de acción (opcional)</label>
          <select id="gbpCtaType" class="jewd-input gbp-select">
            <option value="">Sin botón</option>
            <option value="LEARN_MORE">Más información</option>
            <option value="BOOK">Reservar</option>
            <option value="ORDER">Pedir</option>
            <option value="SHOP">Comprar</option>
            <option value="SIGN_UP">Registrarse</option>
            <option value="CALL">Llamar</option>
          </select>
          <input type="url" id="gbpCtaUrl" class="jewd-input" placeholder="https://tujoyita.com/..." style="display:none">
        </div>

        <div class="gbp-post-actions">
          <button id="gbpPublishPost" class="jewd-btn jewd-btn-primary">Publicar</button>
          <button id="gbpCancelPost" class="jewd-btn">Cancelar</button>
        </div>
      </div>`;

    if (posts.length === 0) {
      html += '<div class="gbp-empty">No hay publicaciones.</div>';
    } else {
      html += '<div class="gbp-posts-list">';
      for (const post of posts) {
        const summary = post.summary || "";
        const type = post.topicType || "STANDARD";
        const date = post.createTime ? new Date(post.createTime).toLocaleDateString("es-US") : "";
        const postId = (post.name || "").split("/").pop();
        const cta = post.callToAction;

        html += `
          <div class="gbp-post-card">
            <div class="gbp-post-header">
              <span class="gbp-post-type gbp-type-${type.toLowerCase()}">${esc(type)}</span>
              ${cta ? `<span class="gbp-cta-badge">${esc(cta.actionType)}</span>` : ""}
              <span class="gbp-post-date">${esc(date)}</span>
              <button class="jewd-btn jewd-btn-sm jewd-btn-danger gbp-delete-post" data-id="${esc(postId)}">Eliminar</button>
            </div>
            <p class="gbp-post-text">${esc(summary)}</p>
          </div>`;
      }
      html += "</div>";
    }

    content.innerHTML = html;

    // Post type toggle
    const typeSelect = content.querySelector("#gbpPostType");
    if (typeSelect) {
      typeSelect.addEventListener("change", () => {
        const v = typeSelect.value;
        const ef = content.querySelector("#gbpEventFields");
        const of = content.querySelector("#gbpOfferFields");
        if (ef) ef.style.display = v === "EVENT" ? "block" : "none";
        if (of) of.style.display = v === "OFFER" ? "block" : "none";
      });
    }

    // CTA toggle
    const ctaSelect = content.querySelector("#gbpCtaType");
    const ctaUrl = content.querySelector("#gbpCtaUrl");
    if (ctaSelect && ctaUrl) {
      ctaSelect.addEventListener("change", () => {
        ctaUrl.style.display = ctaSelect.value && ctaSelect.value !== "CALL" ? "block" : "none";
      });
    }

    // Language toggle
    const postDraft = { es: "", en: "" };
    let activeLang = "es";
    content.querySelectorAll(".gbp-lang-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const textarea = content.querySelector("#gbpPostSummary");
        const indicator = content.querySelector(".gbp-lang-indicator");
        postDraft[activeLang] = textarea?.value || "";
        activeLang = btn.dataset.lang;
        content.querySelectorAll(".gbp-lang-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (textarea) {
          textarea.value = postDraft[activeLang];
          textarea.placeholder = activeLang === "es" ? "Escribe tu publicación..." : "Write your post here...";
        }
        if (indicator) {
          indicator.textContent = activeLang === "es" ? "Redactando en: 🇪🇸 Español" : "Writing in: 🇺🇸 English";
        }
      });
    });

    // Toggle new post form
    const newBtn = content.querySelector("#gbpNewPostBtn");
    const form = content.querySelector("#gbpNewPostForm");
    if (newBtn && form) {
      newBtn.addEventListener("click", () => {
        form.style.display = form.style.display === "none" ? "block" : "none";
      });
    }
    const cancelBtn = content.querySelector("#gbpCancelPost");
    if (cancelBtn && form) {
      cancelBtn.addEventListener("click", () => { form.style.display = "none"; });
    }

    // Publish post
    const publishBtn = content.querySelector("#gbpPublishPost");
    if (publishBtn) {
      publishBtn.addEventListener("click", async () => {
        const summary = (content.querySelector("#gbpPostSummary") || {}).value?.trim();
        const topicType = (content.querySelector("#gbpPostType") || {}).value;
        if (!summary) { toast("Escribe el texto de la publicación", "error"); return; }

        const payload = { summary, topicType, languageCode: activeLang };

        // Event fields
        if (topicType === "EVENT") {
          const eventTitle = (content.querySelector("#gbpEventTitle") || {}).value?.trim();
          if (eventTitle) payload.eventTitle = eventTitle;
          const start = (content.querySelector("#gbpEventStart") || {}).value;
          const end = (content.querySelector("#gbpEventEnd") || {}).value;
          if (start) payload.eventStartDate = start.slice(0, 10);
          if (end) payload.eventEndDate = end.slice(0, 10);
        }

        // Offer fields
        if (topicType === "OFFER") {
          const code = (content.querySelector("#gbpCouponCode") || {}).value?.trim();
          const url = (content.querySelector("#gbpRedeemUrl") || {}).value?.trim();
          if (code) payload.couponCode = code;
          if (url) payload.redeemUrl = url;
        }

        // CTA
        const ctaType = (content.querySelector("#gbpCtaType") || {}).value;
        if (ctaType) {
          payload.callToActionType = ctaType;
          if (ctaType !== "CALL") {
            const ctaUrlVal = (content.querySelector("#gbpCtaUrl") || {}).value?.trim();
            if (ctaUrlVal) payload.callToActionUrl = ctaUrlVal;
          }
        }

        publishBtn.disabled = true;
        try {
          await JewdAPI.createGBPPost(payload);
          toast("Publicación creada", "success");
          await loadPosts(content);
        } catch (err) {
          toast("Error: " + err.message, "error");
          publishBtn.disabled = false;
        }
      });
    }

    // Delete post
    content.querySelectorAll(".gbp-delete-post").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta publicación?")) return;
        btn.disabled = true;
        try {
          await JewdAPI.deleteGBPPost(btn.dataset.id);
          toast("Publicación eliminada", "success");
          await loadPosts(content);
        } catch (err) {
          toast("Error: " + err.message, "error");
          btn.disabled = false;
        }
      });
    });
  }

  /* ===== METRICS TAB (E) ===== */

  const METRIC_TYPES = [
    { key: "BUSINESS_IMPRESSIONS_DESKTOP_MAPS", label: "Maps (Desktop)", color: "#34A853" },
    { key: "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", label: "Search (Desktop)", color: "#4285F4" },
    { key: "BUSINESS_IMPRESSIONS_MOBILE_MAPS", label: "Maps (Móvil)", color: "#0F9D58" },
    { key: "BUSINESS_IMPRESSIONS_MOBILE_SEARCH", label: "Search (Móvil)", color: "#4FC3F7" },
    { key: "WEBSITE_CLICKS", label: "Clicks al sitio", color: "#FBBC04" },
    { key: "CALL_CLICKS", label: "Clicks llamar", color: "#EA4335" },
    { key: "BUSINESS_DIRECTION_REQUESTS", label: "Direcciones", color: "#9C27B0" },
  ];

  async function loadMetrics(content) {
    const range = gbpState.metricsDateRange;
    if (!range.start) range.start = daysAgo(30);
    if (!range.end) range.end = today();

    // Fetch all metrics in parallel
    const metricsPromises = METRIC_TYPES.map((m) =>
      dedupRequest("metric_" + m.key + "_" + range.start + "_" + range.end, () =>
        JewdAPI.getGBPMetrics({ startDate: range.start, endDate: range.end, metric: m.key })
      ).catch(() => ({ data: null }))
    );
    const keywordsPromise = dedupRequest("keywords_" + range.start, () =>
      JewdAPI.getGBPKeywords({ startDate: range.start, endDate: range.end })
    ).catch(() => ({ data: {} }));

    const [keywordsRes, ...metricsResults] = await Promise.all([keywordsPromise, ...metricsPromises]);
    gbpState.keywords = keywordsRes.data?.searchKeywordsCounts || [];

    // Compute totals
    const metricData = METRIC_TYPES.map((m, i) => ({
      ...m,
      total: countMetricTotal(metricsResults[i].data),
      daily: extractDailyValues(metricsResults[i].data),
    }));
    gbpState.metrics = metricData;

    // Compute Maps vs Search totals
    const mapsTotal = metricData.filter((m) => m.key.includes("MAPS")).reduce((s, m) => s + m.total, 0);
    const searchTotal = metricData.filter((m) => m.key.includes("SEARCH")).reduce((s, m) => s + m.total, 0);

    // Date range picker
    let html = `<div class="gbp-date-range-picker">
      ${["7", "30", "90"].map((d) =>
        `<button class="gbp-range-btn${range.label === d ? " active" : ""}" data-range="${d}">${d} días</button>`
      ).join("")}
      <button class="gbp-range-btn${range.label === "custom" ? " active" : ""}" data-range="custom">Personalizado</button>
    </div>
    <div class="gbp-custom-range" style="display:${range.label === "custom" ? "flex" : "none"}">
      <input type="date" id="gbpDateStart" value="${range.start}">
      <span>—</span>
      <input type="date" id="gbpDateEnd" value="${range.end}">
      <button class="jewd-btn jewd-btn-sm jewd-btn-primary" id="gbpApplyRange">Aplicar</button>
    </div>`;

    // Metric KPI cards
    html += `<div class="gbp-kpi-grid">`;
    for (const m of metricData) {
      html += `<div class="gbp-kpi-card">
        <div class="gbp-kpi-value" style="color:${m.color}">${formatNumber(m.total)}</div>
        <div class="gbp-kpi-label">${esc(m.label)}</div>
      </div>`;
    }
    html += `</div>`;

    // Chart
    html += `<div class="gbp-overview-chart jewd-card">
      <h4>Tendencia de métricas</h4>
      <div class="gbp-chart-legend" id="gbpChartLegend"></div>
      <div class="gbp-chart-container"><canvas id="gbpMetricsChart"></canvas></div>
    </div>`;

    // Maps vs Search donut
    if (mapsTotal + searchTotal > 0) {
      html += `<div class="gbp-comparison jewd-card">
        <h4>📍 Google Maps vs 🔍 Search</h4>
        <div class="gbp-donut-layout">
          <div class="gbp-chart-container gbp-donut-container"><canvas id="gbpDonutChart"></canvas></div>
          <div class="gbp-comparison-cards">
            <div class="gbp-comparison-item" style="border-left:4px solid #34A853">
              <strong>${formatNumber(mapsTotal)}</strong>
              <span>Maps (${Math.round((mapsTotal / (mapsTotal + searchTotal)) * 100)}%)</span>
            </div>
            <div class="gbp-comparison-item" style="border-left:4px solid #4285F4">
              <strong>${formatNumber(searchTotal)}</strong>
              <span>Search (${Math.round((searchTotal / (mapsTotal + searchTotal)) * 100)}%)</span>
            </div>
          </div>
        </div>
      </div>`;
    }

    // Keywords
    if (gbpState.keywords.length > 0) {
      html += `<div class="jewd-card"><h4>Keywords de búsqueda</h4>
        <div class="gbp-keywords-list">`;
      for (const kw of gbpState.keywords.slice(0, 20)) {
        html += `<div class="gbp-keyword">
          <span class="gbp-keyword-text">${esc(kw.searchKeyword || "")}</span>
          <span class="gbp-keyword-count">${kw.insightsValue?.value || 0}</span>
        </div>`;
      }
      html += "</div></div>";
    }

    content.innerHTML = html;

    // Draw charts
    requestAnimationFrame(() => {
      // Multi-line chart — use impressions metrics that have daily data
      const chartMetrics = metricData.filter((m) => m.daily.length > 0);
      if (chartMetrics.length > 0) {
        drawMultiLineChart("gbpMetricsChart", chartMetrics);
        renderChartLegend("gbpChartLegend", chartMetrics);
      }
      // Donut
      if (mapsTotal + searchTotal > 0) {
        drawDonutChart("gbpDonutChart", [
          { label: "Maps", value: mapsTotal, color: "#34A853" },
          { label: "Search", value: searchTotal, color: "#4285F4" },
        ]);
      }
    });

    // Date range handlers
    content.querySelectorAll("[data-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.dataset.range;
        gbpState.metricsDateRange.label = v;
        if (v !== "custom") {
          gbpState.metricsDateRange.start = daysAgo(parseInt(v));
          gbpState.metricsDateRange.end = today();
          gbpState.pendingRequests.clear();
          loadMetrics(content);
        } else {
          const cr = content.querySelector(".gbp-custom-range");
          if (cr) cr.style.display = "flex";
        }
      });
    });

    const applyBtn = content.querySelector("#gbpApplyRange");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const s = (content.querySelector("#gbpDateStart") || {}).value;
        const e = (content.querySelector("#gbpDateEnd") || {}).value;
        if (s && e && s < e) {
          gbpState.metricsDateRange.start = s;
          gbpState.metricsDateRange.end = e;
          gbpState.pendingRequests.clear();
          loadMetrics(content);
        } else {
          toast("Fecha inicio debe ser anterior a fecha fin", "error");
        }
      });
    }
  }

  /* ===== MEDIA TAB ===== */

  async function loadMedia(content) {
    const { data } = await dedupRequest("media_list", () => JewdAPI.getGBPMedia({ pageSize: 50 }));
    const items = data.mediaItems || [];
    gbpState.media = items;

    if (items.length === 0) {
      content.innerHTML = '<div class="gbp-empty">No hay fotos.</div>';
      return;
    }

    // Category filter
    const categories = [...new Set(items.map((i) => i.locationAssociation?.category || i.mediaFormat || "OTHER"))];

    let html = `<div class="gbp-media-filters">
      <button class="gbp-filter-btn active" data-cat="all">Todas</button>
      ${categories.map((c) =>
        `<button class="gbp-filter-btn" data-cat="${esc(c)}">${esc(c)} (${items.filter((i) => (i.locationAssociation?.category || i.mediaFormat || "OTHER") === c).length})</button>`
      ).join("")}
    </div>`;

    html += '<div class="gbp-media-grid" id="gbpMediaGrid">';
    for (const item of items) {
      const url = item.googleUrl || item.thumbnailUrl || "";
      const category = item.locationAssociation?.category || item.mediaFormat || "";
      html += `
        <div class="gbp-media-item" data-cat="${esc(category)}">
          ${url ? `<img src="${esc(url)}" alt="GBP Media" loading="lazy">` : '<div class="gbp-media-placeholder">📷</div>'}
          <span class="gbp-media-label">${esc(category)}</span>
        </div>`;
    }
    html += "</div>";
    content.innerHTML = html;

    // Filter handlers
    content.querySelectorAll(".gbp-media-filters [data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        content.querySelectorAll(".gbp-media-filters .gbp-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const cat = btn.dataset.cat;
        content.querySelectorAll(".gbp-media-item").forEach((item) => {
          item.style.display = cat === "all" || item.dataset.cat === cat ? "" : "none";
        });
      });
    });
  }

  /* ===== Q&A TAB (G) ===== */

  async function loadQAndA(content) {
    const { data } = await dedupRequest("qa_list", () => JewdAPI.getGBPQuestions({ pageSize: 50 }));
    const questions = data.questions || [];
    gbpState.questions = questions;

    if (questions.length === 0) {
      content.innerHTML = '<div class="gbp-empty">No hay preguntas.</div>';
      return;
    }

    const unanswered = questions.filter((q) => !(q.topAnswers || []).length);
    const answered = questions.filter((q) => (q.topAnswers || []).length > 0);

    let html = `<div class="gbp-qa-filters">
      <div class="gbp-qa-filter-buttons">
        <button class="gbp-filter-btn active" data-filter="all">Todas <span class="gbp-count">(${questions.length})</span></button>
        <button class="gbp-filter-btn" data-filter="unanswered">❓ Sin responder <span class="gbp-count${unanswered.length ? " gbp-count-alert" : ""}">(${unanswered.length})</span></button>
        <button class="gbp-filter-btn" data-filter="answered">✅ Respondidas <span class="gbp-count">(${answered.length})</span></button>
      </div>
      <div class="gbp-qa-search">
        <input type="text" placeholder="Buscar pregunta..." id="gbpQaSearch" class="jewd-input">
      </div>
    </div>`;

    html += '<div class="gbp-qa-list" id="gbpQaList">';
    for (const q of questions) {
      const qText = q.text || "";
      const qDate = q.createTime ? new Date(q.createTime).toLocaleDateString("es-US") : "";
      const qId = (q.name || "").split("/").pop();
      const answers = q.topAnswers || [];
      const hasAnswer = answers.length > 0;

      html += `
        <div class="gbp-qa-card" data-question-id="${esc(qId)}" data-answered="${hasAnswer}">
          <div class="gbp-qa-question">
            <strong>P:</strong> <span class="gbp-qa-text">${esc(qText)}</span>
            <span class="gbp-qa-date">${esc(qDate)}</span>
          </div>
          ${hasAnswer
            ? `<div class="gbp-qa-answer"><strong>R:</strong> ${esc(answers[0].text || "")}</div>`
            : `<div class="gbp-qa-answer-form">
                <textarea class="jewd-input gbp-answer-input" placeholder="Escribe tu respuesta..." rows="2"></textarea>
                <button class="jewd-btn jewd-btn-sm jewd-btn-primary gbp-send-answer" data-id="${esc(qId)}">Responder</button>
              </div>`
          }
        </div>`;
    }
    html += "</div>";
    content.innerHTML = html;

    // Filter handlers
    let activeFilter = "all";
    content.querySelectorAll(".gbp-qa-filter-buttons [data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        content.querySelectorAll(".gbp-qa-filter-buttons .gbp-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        applyQaFilters();
      });
    });

    // Search with debounce
    let searchTimeout;
    const searchInput = content.querySelector("#gbpQaSearch");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyQaFilters, 300);
      });
    }

    function applyQaFilters() {
      const term = (searchInput?.value || "").toLowerCase();
      content.querySelectorAll(".gbp-qa-card").forEach((card) => {
        const isAnswered = card.dataset.answered === "true";
        const text = (card.querySelector(".gbp-qa-text")?.textContent || "").toLowerCase();
        let show = true;
        if (activeFilter === "unanswered") show = !isAnswered;
        else if (activeFilter === "answered") show = isAnswered;
        if (show && term) show = text.includes(term);
        card.style.display = show ? "" : "none";
      });
    }

    // Answer handlers
    content.querySelectorAll(".gbp-send-answer").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest(".gbp-qa-card");
        const input = card.querySelector(".gbp-answer-input");
        const text = input?.value?.trim();
        if (!text) return;
        btn.disabled = true;
        try {
          await JewdAPI.answerGBPQuestion(btn.dataset.id, text);
          toast("Respuesta enviada", "success");
          await loadQAndA(content);
        } catch (err) {
          toast("Error: " + err.message, "error");
          btn.disabled = false;
        }
      });
    });
  }

  /* ===== INFO TAB (H) ===== */

  async function loadInfo(content) {
    const { data: info } = await dedupRequest("info", () => JewdAPI.getGBPInfo());
    gbpState.info = info;

    const title = info.title || "";
    const phone = info.phoneNumbers?.primaryPhone || "";
    const website = info.websiteUri || "";
    const addr = info.storefrontAddress;
    const address = addr
      ? `${(addr.addressLines || []).join(", ")}, ${addr.locality || ""}, ${addr.administrativeArea || ""} ${addr.postalCode || ""}`
      : "";
    const desc = info.profile?.description || "";

    const hours = info.regularHours?.periods || [];
    const DAYS = [
      { key: "MONDAY", label: "Lunes" },
      { key: "TUESDAY", label: "Martes" },
      { key: "WEDNESDAY", label: "Miércoles" },
      { key: "THURSDAY", label: "Jueves" },
      { key: "FRIDAY", label: "Viernes" },
      { key: "SATURDAY", label: "Sábado" },
      { key: "SUNDAY", label: "Domingo" },
    ];

    // Current hours display
    let hoursDisplayHtml = "";
    for (const d of DAYS) {
      const period = hours.find((h) => h.openDay === d.key);
      hoursDisplayHtml += `<div class="gbp-hour-row">
        <span class="gbp-day">${d.label}</span>
        <span class="gbp-time">${period ? `${fmtTime(period.openTime)} - ${fmtTime(period.closeTime)}` : "Cerrado"}</span>
      </div>`;
    }

    // Hours editor
    let hoursEditorHtml = `<div class="gbp-hours-editor">`;
    for (const d of DAYS) {
      const period = hours.find((h) => h.openDay === d.key);
      const isOpen = !!period;
      const openT = period ? fmtTime(period.openTime) : "10:00";
      const closeT = period ? fmtTime(period.closeTime) : "18:00";
      hoursEditorHtml += `
        <div class="gbp-hours-row" data-day="${d.key}">
          <span class="gbp-day-label">${d.label}</span>
          <label class="gbp-hours-toggle">
            <input type="checkbox" class="gbp-day-open" ${isOpen ? "checked" : ""}> Abierto
          </label>
          <div class="gbp-hours-times" ${isOpen ? "" : 'style="display:none"'}>
            <input type="time" class="gbp-time-start jewd-input" value="${openT}">
            <span>—</span>
            <input type="time" class="gbp-time-end jewd-input" value="${closeT}">
          </div>
        </div>`;
    }
    hoursEditorHtml += `
      <div class="gbp-hours-actions">
        <button class="jewd-btn jewd-btn-sm" id="gbpCopyHours">📋 Copiar a todos los días</button>
      </div>
    </div>`;

    content.innerHTML = `
      <div class="gbp-info-grid">
        <div class="jewd-card">
          <h3>${esc(title)}</h3>
          <div class="gbp-info-field"><strong>Dirección:</strong> ${esc(address)}</div>
          <div class="gbp-info-field"><strong>Teléfono:</strong> ${esc(phone)}</div>
          <div class="gbp-info-field"><strong>Sitio web:</strong> <a href="${esc(website)}" target="_blank" rel="noopener">${esc(website)}</a></div>
          <div class="gbp-info-field"><strong>Descripción:</strong></div>
          <p class="gbp-info-desc">${esc(desc)}</p>
        </div>
        <div class="jewd-card">
          <h3>Horario</h3>
          ${hoursDisplayHtml}
        </div>
      </div>
      <div class="jewd-card" style="margin-top:1rem">
        <h3>Editar Información</h3>
        <label class="jewd-label">Teléfono</label>
        <input type="tel" id="gbpEditPhone" class="jewd-input" value="${esc(phone)}">
        <label class="jewd-label" style="margin-top:.5rem">Sitio Web</label>
        <input type="url" id="gbpEditWebsite" class="jewd-input" value="${esc(website)}">
        <label class="jewd-label" style="margin-top:.5rem">Descripción</label>
        <textarea id="gbpEditDesc" class="jewd-input" rows="4">${esc(desc)}</textarea>
        <h4 style="margin-top:1rem">Editar Horario</h4>
        ${hoursEditorHtml}
        <button id="gbpSaveInfo" class="jewd-btn jewd-btn-primary" style="margin-top:.75rem">Guardar Cambios</button>
      </div>`;

    // Toggle hours times visibility
    content.querySelectorAll(".gbp-day-open").forEach((cb) => {
      cb.addEventListener("change", () => {
        const row = cb.closest(".gbp-hours-row");
        const times = row.querySelector(".gbp-hours-times");
        if (times) times.style.display = cb.checked ? "flex" : "none";
      });
    });

    // Copy hours to all days
    const copyBtn = content.querySelector("#gbpCopyHours");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const firstRow = content.querySelector(".gbp-hours-row");
        if (!firstRow) return;
        const open = firstRow.querySelector(".gbp-day-open").checked;
        const start = firstRow.querySelector(".gbp-time-start").value;
        const end = firstRow.querySelector(".gbp-time-end").value;
        content.querySelectorAll(".gbp-hours-row").forEach((row) => {
          row.querySelector(".gbp-day-open").checked = open;
          row.querySelector(".gbp-time-start").value = start;
          row.querySelector(".gbp-time-end").value = end;
          const times = row.querySelector(".gbp-hours-times");
          if (times) times.style.display = open ? "flex" : "none";
        });
        toast("Horario copiado a todos los días", "info");
      });
    }

    // Save
    const saveBtn = content.querySelector("#gbpSaveInfo");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        saveBtn.disabled = true;
        try {
          await JewdAPI.updateGBPInfo({
            phone: (content.querySelector("#gbpEditPhone") || {}).value,
            website: (content.querySelector("#gbpEditWebsite") || {}).value,
            description: (content.querySelector("#gbpEditDesc") || {}).value,
          });
          toast("Información actualizada", "success");
          await loadInfo(content);
        } catch (err) {
          toast("Error: " + err.message, "error");
          saveBtn.disabled = false;
        }
      });
    }
  }

  function fmtTime(timeObj) {
    if (!timeObj) return "";
    const h = String(timeObj.hours || 0).padStart(2, "0");
    const m = String(timeObj.minutes || 0).padStart(2, "0");
    return `${h}:${m}`;
  }

  /* ===== METRIC HELPERS ===== */

  function countMetricTotal(data) {
    if (!data?.timeSeries?.datedValues) return 0;
    return data.timeSeries.datedValues.reduce((sum, dv) => sum + (parseInt(dv.value) || 0), 0);
  }

  function extractDailyValues(data) {
    if (!data?.timeSeries?.datedValues) return [];
    return data.timeSeries.datedValues.map((dv) => ({
      date: `${dv.date.year}-${String(dv.date.month).padStart(2, "0")}-${String(dv.date.day).padStart(2, "0")}`,
      value: parseInt(dv.value) || 0,
    }));
  }

  function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  /* ===== CANVAS 2D CHARTS ===== */

  function setupCanvas(canvasEl) {
    const rect = canvasEl.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || 600;
    const h = 250;
    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    canvasEl.style.width = w + "px";
    canvasEl.style.height = h + "px";
    const ctx = canvasEl.getContext("2d");
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  function drawLineChart(canvasId, dailyValues, color) {
    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl || dailyValues.length === 0) return;

    const { ctx, w, h } = setupCanvas(canvasEl);
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const vals = dailyValues.map((d) => d.value);
    const maxVal = Math.max(...vals, 1);

    // Grid lines
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = "#999";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(Math.round(maxVal * (1 - i / 4))), pad.left - 8, y + 4);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < vals.length; i++) {
      const x = pad.left + (cw / Math.max(vals.length - 1, 1)) * i;
      const y = pad.top + ch - (vals[i] / maxVal) * ch;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill area
    const lastX = pad.left + cw;
    ctx.lineTo(lastX, pad.top + ch);
    ctx.lineTo(pad.left, pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = color + "20";
    ctx.fill();

    // X-axis labels (every ~7 days)
    ctx.fillStyle = "#999";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(dailyValues.length / 5));
    for (let i = 0; i < dailyValues.length; i += step) {
      const x = pad.left + (cw / Math.max(dailyValues.length - 1, 1)) * i;
      ctx.fillText(dailyValues[i].date.slice(5), x, h - 5);
    }
  }

  function drawMultiLineChart(canvasId, metricsArray) {
    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;

    const { ctx, w, h } = setupCanvas(canvasEl);
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    // Find global max
    let maxVal = 1;
    let maxLen = 0;
    let labelsRef = [];
    for (const m of metricsArray) {
      if (m.daily.length > maxLen) { maxLen = m.daily.length; labelsRef = m.daily; }
      for (const d of m.daily) if (d.value > maxVal) maxVal = d.value;
    }

    // Grid
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = "#999";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(formatNumber(Math.round(maxVal * (1 - i / 4))), pad.left - 8, y + 4);
    }

    // Lines
    for (const m of metricsArray) {
      if (m.daily.length === 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < m.daily.length; i++) {
        const x = pad.left + (cw / Math.max(m.daily.length - 1, 1)) * i;
        const y = pad.top + ch - (m.daily[i].value / maxVal) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // X-axis labels
    ctx.fillStyle = "#999";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const step = Math.max(1, Math.floor(maxLen / 5));
    for (let i = 0; i < labelsRef.length; i += step) {
      const x = pad.left + (cw / Math.max(labelsRef.length - 1, 1)) * i;
      ctx.fillText(labelsRef[i].date.slice(5), x, h - 5);
    }
  }

  function renderChartLegend(containerId, metricsArray) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = metricsArray.map((m) =>
      `<div class="gbp-chart-legend-item">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${m.color}"></span>
        ${esc(m.label)}
      </div>`
    ).join("");
  }

  function drawDonutChart(canvasId, segments) {
    const canvasEl = document.getElementById(canvasId);
    if (!canvasEl) return;

    const { ctx, w, h } = setupCanvas(canvasEl);
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 20;
    const innerR = r * 0.6;
    const total = segments.reduce((s, seg) => s + seg.value, 0);

    let startAngle = -Math.PI / 2;
    for (const seg of segments) {
      const sliceAngle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += sliceAngle;
    }

    // Center text
    ctx.fillStyle = "#333";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatNumber(total), cx, cy - 8);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#999";
    ctx.fillText("Total vistas", cx, cy + 12);
  }

  /* ===== EXPORT ===== */
  J.loadGBPSection = loadGBPSection;

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("#btnRefreshGbp");
    if (btn) {
      btn.addEventListener("click", () => {
        gbpState.pendingRequests.clear();
        loadGBPSection();
      });
    }
  });

})(window.Jewd);

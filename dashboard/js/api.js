/**
 * Jewelry Dashboard — API Layer
 * Connects to WooCommerce REST API and custom stats endpoint.
 * Zero jQuery dependency — pure fetch().
 *
 * @version 2.0.0
 */
const JewdAPI = (function () {
  "use strict";

  const cfg = () => {
    const c = { ...(window.JEWD_CONFIG || {}) };
    c.wcBaseUrl = resolveBasePath(c.wcBaseUrl || "/api/wc/v3");
    c.wpBaseUrl = resolveBasePath(c.wpBaseUrl || "/api");
    return c;
  };

  function resolveBasePath(basePath) {
    if (!basePath || typeof basePath !== "string") {
      return "/api";
    }

    if (/^https?:\/\//i.test(basePath)) {
      return basePath;
    }

    const path = window.location.pathname || "/";
    const isDashboardPath = path === "/dashboard" || path.startsWith("/dashboard/");

    if (isDashboardPath && basePath.startsWith("/api")) {
      return `/dashboard${basePath}`;
    }

    return basePath;
  }

  /**
   * Build auth query params for WC REST API.
   */
  function authParams() {
    const c = cfg();
    return `consumer_key=${encodeURIComponent(c.consumerKey)}&consumer_secret=${encodeURIComponent(c.consumerSecret)}`;
  }

  /**
   * Generic fetch wrapper with error handling.
   */
  async function request(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API Error ${res.status}: ${text}`);
    }

    // Extract pagination headers
    const totalItems = res.headers.get("X-WP-Total");
    const totalPages = res.headers.get("X-WP-TotalPages");
    const data = await res.json();

    return {
      data,
      total: totalItems ? parseInt(totalItems, 10) : null,
      totalPages: totalPages ? parseInt(totalPages, 10) : null,
    };
  }

  /**
   * GET products from WC REST API with filters.
   */
  async function getProducts({ search, category, type, stock, page, perPage } = {}) {
    const c = cfg();
    const params = new URLSearchParams();
    params.set("consumer_key", c.consumerKey);
    params.set("consumer_secret", c.consumerSecret);
    params.set("per_page", perPage || c.perPage || 50);
    params.set("page", page || 1);
    params.set("orderby", "date");
    params.set("order", "desc");
    params.set("status", "any");

    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (type) params.set("type", type);
    if (stock) params.set("stock_status", stock);

    const url = `${c.wcBaseUrl}/products?${params.toString()}`;
    return request(url);
  }

  /**
   * GET a single product with variations.
   */
  async function getProduct(id) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/${id}?${authParams()}`;
    return request(url);
  }

  /**
   * GET variations for a product.
   */
  async function getVariations(productId) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/${productId}/variations?${authParams()}&per_page=100&orderby=id&order=asc`;
    return request(url);
  }

  /**
   * GET all product categories.
   */
  async function getCategories() {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/categories?${authParams()}&per_page=100&hide_empty=true`;
    return request(url);
  }

  /**
   * GET dashboard stats from custom WP REST endpoint.
   */
  async function getStats() {
    const c = cfg();
    const url = `${c.wpBaseUrl}${c.statsEndpoint}?${authParams()}`;
    return request(url);
  }

  /**
   * Test connection to WooCommerce.
   */
  async function testConnection() {
    const c = cfg();
    const url = `${c.wcBaseUrl}/system_status?${authParams()}`;
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  }

  /**
   * UPDATE a product (PUT).
   */
  async function updateProduct(id, data) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/${id}?${authParams()}`;
    return request(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * UPDATE a variation (PUT).
   */
  async function updateVariation(productId, variationId, data) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/${productId}/variations/${variationId}?${authParams()}`;
    return request(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Public API
  return {
    getProducts,
    getProduct,
    getVariations,
    getCategories,
    getStats,
    testConnection,
    updateProduct,
    updateVariation,
  };
})();

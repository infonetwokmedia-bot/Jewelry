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
  async function getProducts({ search, category, type, stock, status, page, perPage } = {}) {
    const c = cfg();
    const params = new URLSearchParams();
    params.set("consumer_key", c.consumerKey);
    params.set("consumer_secret", c.consumerSecret);
    params.set("per_page", perPage || c.perPage || 50);
    params.set("page", page || 1);
    params.set("orderby", "date");
    params.set("order", "desc");
    params.set("status", status || "any");

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
   * GET all product tags.
   */
  async function getTags() {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/tags?${authParams()}&per_page=100&orderby=count&order=desc`;
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
   * CREATE a new product (POST).
   */
  async function createProduct(data) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products?${authParams()}`;
    return request(url, {
      method: "POST",
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

  /**
   * CREATE a new variation (POST).
   */
  async function createVariation(productId, data) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/${productId}/variations?${authParams()}`;
    return request(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE a product (move to trash or force-delete).
   * @param {number} id - Product ID.
   * @param {boolean} [force=false] - If true, permanently delete.
   */
  async function deleteProduct(id, force = false) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/${id}?${authParams()}&force=${force}`;
    return request(url, { method: "DELETE" });
  }

  /**
   * UPDATE a product status (e.g. restore from trash).
   */
  async function updateProductStatus(id, status) {
    return updateProduct(id, { status });
  }

  /**
   * Batch update products.
   * @param {Object} data - { update: [], delete: [], create: [] }
   */
  async function batchProducts(data) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/batch?${authParams()}`;
    return request(url, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE a variation (DELETE).
   */
  async function deleteVariation(productId, variationId) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/products/${productId}/variations/${variationId}?${authParams()}&force=true`;
    return request(url, {
      method: "DELETE",
    });
  }

  /**
   * UPLOAD an image to the media library.
   * Uses multipart/form-data (no JSON Content-Type).
   *
   * @param {File} file - The image file to upload.
   * @returns {Promise<{id:number, url:string, thumbnail:string, medium:string, filename:string, width:number, height:number, filesize:number}>}
   */
  async function uploadImage(file) {
    const c = cfg();
    const url = `${c.wpBaseUrl}/jewd/v1/media?${authParams()}`;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
      // NOTE: Do NOT set Content-Type — browser sets it with boundary for multipart.
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload Error ${res.status}: ${text}`);
    }

    return { data: await res.json() };
  }

  /**
   * DELETE an image from the media library.
   *
   * @param {number} id - The attachment ID to delete.
   * @returns {Promise<{deleted:boolean, id:number}>}
   */
  async function deleteImage(id) {
    const c = cfg();
    const url = `${c.wpBaseUrl}/jewd/v1/media/${id}?${authParams()}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Delete Error ${res.status}: ${text}`);
    }

    return { data: await res.json() };
  }

  /* ===== ORDERS (Phase 4) ===== */

  /**
   * GET orders from WC REST API with filters.
   */
  async function getOrders({ search, status, page, perPage } = {}) {
    const c = cfg();
    const params = new URLSearchParams();
    params.set("consumer_key", c.consumerKey);
    params.set("consumer_secret", c.consumerSecret);
    params.set("per_page", perPage || 20);
    params.set("page", page || 1);
    params.set("orderby", "date");
    params.set("order", "desc");
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const url = `${c.wcBaseUrl}/orders?${params.toString()}`;
    return request(url);
  }

  /**
   * GET a single order.
   */
  async function getOrder(id) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/orders/${id}?${authParams()}`;
    return request(url);
  }

  /**
   * UPDATE an order (PUT).
   */
  async function updateOrder(id, data) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/orders/${id}?${authParams()}`;
    return request(url, { method: "PUT", body: JSON.stringify(data) });
  }

  /**
   * GET order notes.
   */
  async function getOrderNotes(orderId) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/orders/${orderId}/notes?${authParams()}`;
    return request(url);
  }

  /**
   * CREATE order note.
   */
  async function createOrderNote(orderId, note) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/orders/${orderId}/notes?${authParams()}`;
    return request(url, { method: "POST", body: JSON.stringify({ note }) });
  }

  /* ===== REPORTS (Phase 4) ===== */

  /**
   * GET sales report.
   */
  async function getReportSales({ dateMin, dateMax } = {}) {
    const c = cfg();
    const params = new URLSearchParams();
    params.set("consumer_key", c.consumerKey);
    params.set("consumer_secret", c.consumerSecret);
    if (dateMin) params.set("date_min", dateMin);
    if (dateMax) params.set("date_max", dateMax);
    const url = `${c.wcBaseUrl}/reports/sales?${params.toString()}`;
    return request(url);
  }

  /**
   * GET top selling products.
   */
  async function getTopSellers({ period } = {}) {
    const c = cfg();
    const params = new URLSearchParams();
    params.set("consumer_key", c.consumerKey);
    params.set("consumer_secret", c.consumerSecret);
    params.set("period", period || "month");
    const url = `${c.wcBaseUrl}/reports/top_sellers?${params.toString()}`;
    return request(url);
  }

  /* ===== SETTINGS (Phase 4) ===== */

  /**
   * GET WC settings for a group.
   */
  async function getSettings(group) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/settings/${group}?${authParams()}`;
    return request(url);
  }

  /**
   * UPDATE a WC setting.
   */
  async function updateSetting(group, id, value) {
    const c = cfg();
    const url = `${c.wcBaseUrl}/settings/${group}/${id}?${authParams()}`;
    return request(url, { method: "PUT", body: JSON.stringify({ value }) });
  }

  /**
   * GET WC system status.
   */
  async function getSystemStatus() {
    const c = cfg();
    const url = `${c.wcBaseUrl}/system_status?${authParams()}`;
    return request(url);
  }

  // Public API
  return {
    getProducts,
    getProduct,
    getVariations,
    getCategories,
    getTags,
    getStats,
    testConnection,
    createProduct,
    updateProduct,
    updateVariation,
    createVariation,
    deleteProduct,
    deleteVariation,
    updateProductStatus,
    batchProducts,
    uploadImage,
    deleteImage,
    getOrders,
    getOrder,
    updateOrder,
    getOrderNotes,
    createOrderNote,
    getReportSales,
    getTopSellers,
    getSettings,
    updateSetting,
    getSystemStatus,
  };
})();

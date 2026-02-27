/**
 * Tu Joyita Miami Dashboard — Core Module
 *
 * Creates the global Jewd namespace with shared state,
 * DOM selectors, and utility functions.
 *
 * Must load FIRST before all other dashboard modules.
 */
"use strict";

window.Jewd = (function () {
  /* ===== SHARED STATE ===== */
  const state = {
    products: [],
    variations: {},
    stats: {},
    opened: {},
    page: 1,
    perPage: 50,
    total: 0,
    totalAll: 0,
    totalPages: 0,
    categories: [],
    loading: false,
    connected: false,
    allExpanded: false,
    activeSection: "products",
    sectionLoaded: {},
    // Orders
    orders: [],
    ordersPage: 1,
    ordersPerPage: 20,
    ordersTotal: 0,
    ordersTotalPages: 0,
    ordersLoading: false,
    // Reports
    reportPeriod: 7,
    reportData: null,
    topSellers: [],
  };

  /* ===== DOM SELECTORS ===== */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ===== HTML ESCAPE ===== */
  const _escMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, (c) => _escMap[c]);
  }

  /* ===== NUMBER FORMATTING ===== */
  function fmtN(n) {
    const v = parseFloat(n);
    if (isNaN(v)) return "0";
    const hasDec = v % 1 !== 0;
    return v.toLocaleString("en-US", {
      minimumFractionDigits: hasDec ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }

  function fmtGold(n) {
    const v = parseFloat(n);
    if (isNaN(v)) return "0.00";
    return v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /* ===== CSV ESCAPE ===== */
  function csvEsc(s) {
    if (!s) return "";
    s = String(s);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  /* ===== DATE HELPERS ===== */
  function dateStr() {
    return new Date().toISOString().split("T")[0];
  }

  function formatDateTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("es-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  }

  /* ===== TEXT HELPERS ===== */
  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  function setTxt(sel, txt) {
    const el = $(sel);
    if (el) el.textContent = txt;
  }

  /* ===== URL HELPERS ===== */
  function getStoreOrigin() {
    const cfg = window.JEWD_CONFIG || {};
    const currentHost = window.location.hostname || "";
    if (currentHost.endsWith("dev.tujoyita.com")) {
      return "https://dev.tujoyita.com";
    }
    try {
      if (cfg.siteUrl) {
        return new URL(cfg.siteUrl).origin;
      }
    } catch (e) {}
    return window.location.origin;
  }

  function normalizePermalink(url) {
    if (!url || url === "#") return url;
    try {
      const parsed = new URL(url);
      const cfg = window.JEWD_CONFIG || {};
      let storeHost = "";
      try {
        storeHost = cfg.siteUrl ? new URL(cfg.siteUrl).hostname : "";
      } catch (_) {}
      const wpHosts = [storeHost, "tujoyita.local", "jewelry.local.dev", "localhost", "127.0.0.1"].filter(Boolean);
      if (wpHosts.includes(parsed.hostname)) {
        const pub = getStoreOrigin();
        return `${pub}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return url;
    } catch (_) {
      return url;
    }
  }

  function normalizeMediaUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url, window.location.origin);
      const cfg = window.JEWD_CONFIG || {};
      let storeHost = "";
      try {
        storeHost = cfg.siteUrl ? new URL(cfg.siteUrl).hostname : "";
      } catch (_) {}
      const wpHosts = [storeHost, "tujoyita.local", "jewelry.local.dev", "localhost", "127.0.0.1"].filter(Boolean);
      if (wpHosts.includes(parsed.hostname)) {
        const uploadsPrefix = "/wp-content/uploads/";
        const idx = parsed.pathname.indexOf(uploadsPrefix);
        if (idx !== -1) {
          const relativePath = parsed.pathname.substring(idx + uploadsPrefix.length);
          const basePath = window.location.pathname.includes("/dashboard") ? "/dashboard/media/" : "/media/";
          return `${basePath}${relativePath}`;
        }
      }
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }

  /* ===== DOWNLOAD HELPER ===== */
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ===== PUBLIC API ===== */
  return {
    state,
    $,
    $$,
    esc,
    fmtN,
    fmtGold,
    csvEsc,
    dateStr,
    formatDateTime,
    capitalize,
    setTxt,
    getStoreOrigin,
    normalizePermalink,
    normalizeMediaUrl,
    download,
  };
})();

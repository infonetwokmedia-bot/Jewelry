/**
 * 01 — PHP Structure Tests
 * Ticket #15: Verify the mu-plugin has the required hooks and functions
 * for auto-syncing WC order stats and the custom sales endpoints.
 *
 * These tests read the PHP source file directly — no Docker needed.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileExists, MU_PLUGINS, readMuPlugin } from "./helpers.mjs";

const PLUGIN_FILE = "jewelry-roles.php";

describe("PHP — mu-plugin file exists", () => {
  it("jewelry-roles.php exists in mu-plugins", () => {
    assert.ok(
      fileExists(MU_PLUGINS, PLUGIN_FILE),
      "jewelry-roles.php not found",
    );
  });
});

describe("PHP — Order stats sync hook", () => {
  let php;

  it("can read jewelry-roles.php", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.ok(php.length > 100, "File too short");
  });

  it("registers a hook on woocommerce_new_order or woocommerce_order_status_changed", () => {
    php = readMuPlugin(PLUGIN_FILE);
    const hasNewOrder = /add_action\s*\(\s*['"]woocommerce_new_order['"]/.test(
      php,
    );
    const hasStatusChanged =
      /add_action\s*\(\s*['"]woocommerce_order_status_changed['"]/.test(php);
    const hasUpdateOrder =
      /add_action\s*\(\s*['"]woocommerce_update_order['"]/.test(php);
    assert.ok(
      hasNewOrder || hasStatusChanged || hasUpdateOrder,
      "Must hook into woocommerce_new_order, woocommerce_order_status_changed, or woocommerce_update_order",
    );
  });

  it("calls sync_order from WC Analytics DataStore", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.match(
      php,
      /sync_order/,
      "Must call sync_order() to populate wp_wc_order_stats",
    );
  });

  it("references the WC Analytics OrdersStats DataStore class", () => {
    php = readMuPlugin(PLUGIN_FILE);
    // Accept either full namespace or use statement
    const hasClass =
      php.includes("Reports\\Orders\\Stats\\DataStore") ||
      php.includes("OrdersStatsDataStore") ||
      php.includes("Stats\\DataStore::sync_order");
    assert.ok(hasClass, "Must reference WC Analytics Orders Stats DataStore");
  });

  it("has a sync function with jewelry_ prefix", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.match(
      php,
      /function\s+jewelry_sync_order_stats/,
      "Sync function must follow jewelry_ naming convention",
    );
  });
});

describe("PHP — Sales stats endpoint registration", () => {
  let php;

  it("registers jewd/v1/sales/stats route", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.match(
      php,
      /register_rest_route\s*\(\s*['"]jewd\/v1['"]\s*,\s*['"]\/sales\/stats['"]/,
      "Must register /jewd/v1/sales/stats endpoint",
    );
  });

  it("sales/stats endpoint accepts GET method", () => {
    php = readMuPlugin(PLUGIN_FILE);
    // Find the block around "sales/stats" registration
    const idx =
      php.indexOf("'/sales/stats'") !== -1
        ? php.indexOf("'/sales/stats'")
        : php.indexOf('"/sales/stats"');
    assert.ok(idx > 0, "sales/stats route not found");
    const block = php.substring(idx, idx + 300);
    assert.match(block, /GET|READABLE/, "sales/stats must accept GET requests");
  });

  it("sales/stats has a permission_callback", () => {
    php = readMuPlugin(PLUGIN_FILE);
    const idx = php.indexOf("sales/stats");
    assert.ok(idx > 0);
    const block = php.substring(idx, idx + 500);
    assert.match(block, /permission_callback/, "Must have permission_callback");
  });
});

describe("PHP — Sales by seller endpoint registration", () => {
  let php;

  it("registers jewd/v1/sales/by-seller route", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.match(
      php,
      /register_rest_route\s*\(\s*['"]jewd\/v1['"]\s*,\s*['"]\/sales\/by-seller['"]/,
      "Must register /jewd/v1/sales/by-seller endpoint",
    );
  });

  it("by-seller endpoint has permission check for admin/manager", () => {
    php = readMuPlugin(PLUGIN_FILE);
    const idx = php.indexOf("by-seller");
    assert.ok(idx > 0, "by-seller route not found");
    const block = php.substring(idx, idx + 500);
    assert.match(block, /permission_callback/, "Must have permission_callback");
    // Should check for manage_woocommerce or administrator capability
    const hasCapCheck =
      block.includes("manage_woocommerce") ||
      block.includes("administrator") ||
      block.includes("manage_options");
    assert.ok(hasCapCheck, "by-seller must require admin/manager capabilities");
  });
});

describe("PHP — Sales callback functions", () => {
  let php;

  it("has jewelry_get_sales_stats function", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.match(
      php,
      /function\s+jewelry_get_sales_stats/,
      "Must define jewelry_get_sales_stats callback",
    );
  });

  it("has jewelry_get_sales_by_seller function", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.match(
      php,
      /function\s+jewelry_get_sales_by_seller/,
      "Must define jewelry_get_sales_by_seller callback",
    );
  });

  it("sales stats queries by _pos_seller meta", () => {
    php = readMuPlugin(PLUGIN_FILE);
    assert.match(php, /_pos_seller/, "Must filter by _pos_seller meta key");
  });

  it("sales stats returns today, week, month periods", () => {
    php = readMuPlugin(PLUGIN_FILE);
    const hasToday = /today|hoy/i.test(php);
    const hasWeek = /week|semana/i.test(php);
    const hasMonth = /month|mes/i.test(php);
    assert.ok(
      hasToday && hasWeek && hasMonth,
      "Must return today, week, and month periods",
    );
  });
});

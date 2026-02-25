/**
 * 11 — Auth-based seller isolation (Bug fix: all users see same sales)
 *
 * Root cause: wp_get_current_user() returns ID=0 with WC API key auth,
 * so the security check was always skipped. Fix uses
 * jewelry_authenticate_dashboard_token() instead.
 *
 * Also verifies:
 * - api.js sends JWT token via Authorization header
 * - pos.js uses per-user localStorage key for today sales
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile, readMuPlugin } from "./helpers.mjs";

// ─── PHP: uses JWT-based auth instead of wp_get_current_user ────────

describe("PHP — JWT-based seller isolation (sales/today)", () => {
  let php, block;

  it("loads jewelry-roles.php", () => {
    php = readMuPlugin("jewelry-roles.php");
    assert.ok(php.length > 0);
  });

  it("jewelry_get_sales_today uses jewelry_authenticate_dashboard_token", () => {
    const fnStart = php.indexOf("function jewelry_get_sales_today");
    assert.ok(fnStart > 0, "function must exist");
    block = php.substring(fnStart, fnStart + 1500);
    assert.ok(
      block.includes("jewelry_authenticate_dashboard_token"),
      "Must use JWT token auth, not wp_get_current_user alone",
    );
  });

  it("checks auth_user capabilities (manage_options / manage_woocommerce)", () => {
    assert.ok(
      block.includes("user_can") &&
        block.includes("manage_options") &&
        block.includes("manage_woocommerce"),
      "Must check user_can for manage_options and manage_woocommerce",
    );
  });

  it("forces seller to auth_user->user_login for non-admin", () => {
    assert.ok(
      block.includes("user_login"),
      "Must set seller to authenticated user login",
    );
  });

  it("does NOT rely solely on wp_get_current_user for sales/today", () => {
    // The old pattern: $current_user = wp_get_current_user(); if ($current_user->ID && ...)
    // This fails with WC API keys because ID=0.
    const oldPattern =
      /wp_get_current_user\(\);\s*\n\s*if\s*\(\s*\$current_user->ID/;
    assert.ok(
      !oldPattern.test(block),
      "Must NOT use wp_get_current_user()->ID pattern (returns 0 with API keys)",
    );
  });
});

describe("PHP — JWT-based seller isolation (sales/stats)", () => {
  let php, block;

  it("loads jewelry-roles.php", () => {
    php = readMuPlugin("jewelry-roles.php");
    assert.ok(php.length > 0);
  });

  it("jewelry_get_sales_stats uses jewelry_authenticate_dashboard_token", () => {
    const fnStart = php.indexOf("function jewelry_get_sales_stats");
    assert.ok(fnStart > 0, "function must exist");
    block = php.substring(fnStart, fnStart + 1200);
    assert.ok(
      block.includes("jewelry_authenticate_dashboard_token"),
      "Must use JWT token auth for stats too",
    );
  });

  it("does NOT rely solely on wp_get_current_user for stats", () => {
    const oldPattern =
      /wp_get_current_user\(\);\s*\n\s*if\s*\(\s*\$current_user->ID/;
    assert.ok(
      !oldPattern.test(block),
      "Must NOT use wp_get_current_user()->ID pattern",
    );
  });
});

// ─── JS: api.js sends JWT Authorization header ─────────────────────

describe("JS — api.js sends JWT Authorization header", () => {
  let apiJs;

  it("loads api.js", () => {
    apiJs = readDashFile("js/api.js");
    assert.ok(apiJs.length > 0);
  });

  it("request() includes JewdAuth.authHeaders()", () => {
    assert.ok(
      apiJs.includes("authHeaders"),
      "request() must call JewdAuth.authHeaders() for JWT token",
    );
  });

  it("request() references window.JewdAuth for auth", () => {
    assert.ok(
      apiJs.includes("JewdAuth") && apiJs.includes("Authorization"),
      "Must use JewdAuth and set Authorization header",
    );
  });
});

// ─── JS: pos.js per-user sales localStorage key ────────────────────

describe("JS — per-user localStorage key for today sales", () => {
  let posJs;

  it("loads pos.js", () => {
    posJs = readDashFile("js/pos.js");
    assert.ok(posJs.length > 0);
  });

  it("uses salesKey() function instead of static SALES_KEY", () => {
    assert.ok(
      posJs.includes("function salesKey()"),
      "Must have salesKey() function for per-user key",
    );
  });

  it("salesKey includes username in the key", () => {
    // The function should reference username or user_login
    const fnStart = posJs.indexOf("function salesKey()");
    assert.ok(fnStart > 0);
    const block = posJs.substring(fnStart, fnStart + 300);
    assert.ok(
      block.includes("username") || block.includes("user_login"),
      "salesKey must include the username in the localStorage key",
    );
  });

  it("does NOT use a static shared SALES_KEY constant", () => {
    // Old pattern: const SALES_KEY = "jewd_pos_today";
    assert.ok(
      !posJs.includes('const SALES_KEY = "jewd_pos_today"'),
      "Must NOT use a shared static SALES_KEY — each user needs their own key",
    );
  });

  it("saveTodaySales uses salesKey()", () => {
    const fnStart = posJs.indexOf("function saveTodaySales()");
    assert.ok(fnStart > 0);
    const block = posJs.substring(fnStart, fnStart + 300);
    assert.ok(
      block.includes("salesKey()"),
      "saveTodaySales must use salesKey() for per-user storage",
    );
  });

  it("restoreTodaySales uses salesKey()", () => {
    const fnStart = posJs.indexOf("function restoreTodaySales()");
    assert.ok(fnStart > 0);
    const block = posJs.substring(fnStart, fnStart + 400);
    assert.ok(
      block.includes("salesKey()"),
      "restoreTodaySales must use salesKey() for per-user storage",
    );
  });
});

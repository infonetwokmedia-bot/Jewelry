/**
 * 05 — POS Today Sales Tests (Ticket #20)
 * Verify POS loads today's sales from the server instead of only localStorage.
 *
 * Tests cover:
 * - PHP: New /jewd/v1/sales/today endpoint returning order list
 * - JS pos.js: restoreTodaySales fetches from server
 * - Integration: endpoint returns correct data
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containersUp,
  jewdApiGet,
  readDashFile,
  readMuPlugin,
} from "./helpers.mjs";

// ── PHP Structure ─────────────────────────────────────────────────────

describe("PHP — /jewd/v1/sales/today endpoint", () => {
  let php;

  it("registers jewd/v1/sales/today route", () => {
    php = readMuPlugin("jewelry-roles.php");
    assert.match(
      php,
      /register_rest_route\s*\(\s*['"]jewd\/v1['"]\s*,\s*['"]\/sales\/today['"]/,
      "Must register /jewd/v1/sales/today endpoint",
    );
  });

  it("sales/today endpoint accepts GET method", () => {
    php = readMuPlugin("jewelry-roles.php");
    const idx =
      php.indexOf("'/sales/today'") !== -1
        ? php.indexOf("'/sales/today'")
        : php.indexOf('"/sales/today"');
    assert.ok(idx > 0, "sales/today route not found");
    const block = php.substring(idx, idx + 300);
    assert.match(block, /GET|READABLE/, "sales/today must accept GET requests");
  });

  it("has jewelry_get_sales_today callback function", () => {
    php = readMuPlugin("jewelry-roles.php");
    assert.match(
      php,
      /function\s+jewelry_get_sales_today/,
      "Must define jewelry_get_sales_today callback",
    );
  });

  it("accepts seller parameter", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_today");
    assert.ok(fnStart > 0);
    const block = php.substring(fnStart, fnStart + 800);
    assert.match(block, /seller/, "Must accept seller parameter");
  });

  it("queries orders with _pos_seller meta", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_today");
    assert.ok(fnStart > 0);
    const block = php.substring(fnStart, fnStart + 1500);
    assert.match(block, /_pos_seller/, "Must filter by _pos_seller meta");
  });

  it("returns order list with required fields", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_today");
    assert.ok(fnStart > 0);
    const block = php.substring(fnStart, fnStart + 4000);
    // Must return id, total, and time/date fields
    const hasId = block.includes("'id'") || block.includes('"id"');
    const hasTotal =
      block.includes("'total'") ||
      block.includes('"total"') ||
      block.includes("total_amount") ||
      block.includes("order_total");
    assert.ok(hasId && hasTotal, "Must return id and total fields");
  });
});

// ── JS POS ────────────────────────────────────────────────────────────

describe("POS.js — Server-backed today sales", () => {
  let pos;

  it("restoreTodaySales calls API or fetches from server", () => {
    pos = readDashFile("js/pos.js");
    const fnStart = pos.indexOf("function restoreTodaySales");
    assert.ok(fnStart > 0, "restoreTodaySales must exist");
    const block = pos.substring(fnStart, fnStart + 800);
    const callsApi =
      block.includes("getSalesStats") ||
      block.includes("getSalesToday") ||
      block.includes("jewd/v1/sales") ||
      block.includes("loadTodaySalesFromServer") ||
      block.includes("fetchTodaySales");
    assert.ok(callsApi, "restoreTodaySales must fetch from server");
  });

  it("has a function to load today sales from server", () => {
    pos = readDashFile("js/pos.js");
    const hasServerLoad =
      /function\s+(loadTodaySalesFromServer|fetchTodaySales|loadServerSales)/.test(
        pos,
      ) || pos.includes("getSalesToday");
    assert.ok(
      hasServerLoad,
      "Must have a server-fetch function for today sales",
    );
  });
});

// ── API.js ────────────────────────────────────────────────────────────

describe("API.js — getSalesToday function", () => {
  let api;

  it("exports getSalesToday function", () => {
    api = readDashFile("js/api.js");
    assert.match(
      api,
      /function\s+getSalesToday/,
      "Must define getSalesToday function",
    );
  });

  it("getSalesToday calls jewd/v1/sales/today endpoint", () => {
    api = readDashFile("js/api.js");
    const fnStart = api.indexOf("function getSalesToday");
    assert.ok(fnStart > 0);
    const block = api.substring(fnStart, fnStart + 400);
    assert.match(block, /sales\/today/, "Must call sales/today endpoint");
  });

  it("getSalesToday accepts seller parameter", () => {
    api = readDashFile("js/api.js");
    const fnStart = api.indexOf("function getSalesToday");
    assert.ok(fnStart > 0);
    const block = api.substring(fnStart, fnStart + 400);
    assert.match(block, /seller/, "Must accept seller parameter");
  });

  it("getSalesToday is in JewdAPI public API", () => {
    api = readDashFile("js/api.js");
    const exportBlock = api.substring(api.lastIndexOf("return {"));
    assert.ok(
      exportBlock.includes("getSalesToday"),
      "getSalesToday must be exported from JewdAPI",
    );
  });
});

// ── Integration ───────────────────────────────────────────────────────

describe(
  "Integration — /jewd/v1/sales/today endpoint",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("returns valid JSON from /jewd/v1/sales/today", () => {
      const data = jewdApiGet("sales/today?seller=ppcapiro");
      assert.ok(data, "Must return data");
    });

    it("response is an array of orders", () => {
      const data = jewdApiGet("sales/today?seller=ppcapiro");
      const orders = Array.isArray(data) ? data : data.orders;
      assert.ok(Array.isArray(orders), "Must return array of orders");
    });

    it("each order has id, total, and time", () => {
      const data = jewdApiGet("sales/today?seller=ppcapiro");
      const orders = Array.isArray(data) ? data : data.orders;
      if (orders.length === 0) return; // No sales today is valid
      const o = orders[0];
      assert.ok("id" in o, "Must have id");
      assert.ok("total" in o, "Must have total");
      assert.ok(
        "time" in o || "date" in o || "date_created" in o,
        "Must have time/date",
      );
    });
  },
);

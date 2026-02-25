/**
 * 02 — JS API Functions Tests
 * Ticket #15: Verify dashboard JS has the required API functions
 * for fetching sales data from the new endpoints.
 *
 * Static analysis — no Docker needed.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile } from "./helpers.mjs";

describe("API.js — Sales API functions exist", () => {
  let api;

  it("can read api.js", () => {
    api = readDashFile("js/api.js");
    assert.ok(api.length > 100);
  });

  it("exports getSalesStats function", () => {
    api = readDashFile("js/api.js");
    assert.match(
      api,
      /function\s+getSalesStats/,
      "Must define getSalesStats function",
    );
  });

  it("exports getSalesBySeller function", () => {
    api = readDashFile("js/api.js");
    assert.match(
      api,
      /function\s+getSalesBySeller/,
      "Must define getSalesBySeller function",
    );
  });

  it("getSalesStats is in window.JewdAPI public API", () => {
    api = readDashFile("js/api.js");
    assert.match(api, /getSalesStats/, "getSalesStats must be in public API");
    // Check it's in the return/export object
    const exportBlock = api.substring(
      api.lastIndexOf("return {") || api.lastIndexOf("window.JewdAPI"),
    );
    assert.ok(
      exportBlock.includes("getSalesStats"),
      "getSalesStats must be exported from JewdAPI",
    );
  });

  it("getSalesBySeller is in window.JewdAPI public API", () => {
    api = readDashFile("js/api.js");
    const exportBlock = api.substring(
      api.lastIndexOf("return {") || api.lastIndexOf("window.JewdAPI"),
    );
    assert.ok(
      exportBlock.includes("getSalesBySeller"),
      "getSalesBySeller must be exported from JewdAPI",
    );
  });

  it("getSalesStats calls jewd/v1/sales/stats endpoint", () => {
    api = readDashFile("js/api.js");
    assert.match(
      api,
      /jewd\/v1\/sales\/stats|sales\/stats/,
      "Must call sales/stats endpoint",
    );
  });

  it("getSalesBySeller calls jewd/v1/sales/by-seller endpoint", () => {
    api = readDashFile("js/api.js");
    assert.match(
      api,
      /jewd\/v1\/sales\/by-seller|sales\/by-seller/,
      "Must call sales/by-seller endpoint",
    );
  });

  it("getSalesStats accepts optional seller parameter", () => {
    api = readDashFile("js/api.js");
    // Function signature or body should handle seller param
    const fnStart = api.indexOf("function getSalesStats");
    assert.ok(fnStart > 0, "getSalesStats function not found");
    const fnBlock = api.substring(fnStart, fnStart + 400);
    assert.match(
      fnBlock,
      /seller/,
      "getSalesStats must accept seller parameter",
    );
  });
});

describe("API.js — Report functions use correct endpoints", () => {
  let api;

  it("getReportSales uses wc-analytics or jewd endpoint (not legacy wc/v3/reports)", () => {
    api = readDashFile("js/api.js");
    const fnStart = api.indexOf("function getReportSales");
    if (fnStart < 0) return; // Function may be removed/renamed — not fatal
    const fnBlock = api.substring(fnStart, fnStart + 400);
    // Should NOT use the legacy endpoint
    const usesLegacy =
      fnBlock.includes("wc/v3/reports/sales") ||
      fnBlock.includes("wcBaseUrl}/reports/sales");
    // Should use wc-analytics or custom jewd endpoint
    const usesNew =
      fnBlock.includes("wc-analytics") ||
      fnBlock.includes("jewd/v1/sales") ||
      fnBlock.includes("wpBaseUrl");
    assert.ok(
      usesNew || !usesLegacy,
      "Should use wc-analytics or jewd endpoint instead of legacy wc/v3/reports/sales",
    );
  });
});

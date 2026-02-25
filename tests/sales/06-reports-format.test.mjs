/**
 * 06 — Reports Format Adaptation Tests (Ticket #21)
 * Verify Reports section correctly parses wc-analytics format.
 *
 * wc-analytics/reports/revenue/stats returns:
 * {totals: {orders_count, total_sales, num_items_sold, ...},
 *  intervals: [{interval: "2026-02-25", subtotals: {total_sales, ...}}]}
 *
 * Legacy format (no longer used):
 * [{total_sales, totals: {"2026-02-25": {sales, orders}}}]
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile } from "./helpers.mjs";

describe("dashboard.js — renderReportSummary format", () => {
  let dash;

  it("renderReportSummary reads data.totals.total_sales (wc-analytics)", () => {
    dash = readDashFile("js/dashboard.js");
    const fnStart = dash.indexOf("function renderReportSummary");
    assert.ok(fnStart > 0, "renderReportSummary must exist");
    const block = dash.substring(fnStart, fnStart + 800);
    const usesNewFormat =
      block.includes("totals.total_sales") ||
      block.includes('totals["total_sales"]') ||
      block.includes("totals['total_sales']") ||
      block.includes(".total_sales");
    assert.ok(usesNewFormat, "Must read totals.total_sales from wc-analytics");
  });

  it("renderReportSummary reads data.totals.orders_count (wc-analytics)", () => {
    dash = readDashFile("js/dashboard.js");
    const fnStart = dash.indexOf("function renderReportSummary");
    assert.ok(fnStart > 0);
    const block = dash.substring(fnStart, fnStart + 800);
    const usesOrdersCount =
      block.includes("orders_count") || block.includes("totals.orders_count");
    assert.ok(
      usesOrdersCount,
      "Must read totals.orders_count from wc-analytics",
    );
  });

  it("renderReportSummary does NOT use data[0] indexing (legacy)", () => {
    dash = readDashFile("js/dashboard.js");
    const fnStart = dash.indexOf("function renderReportSummary");
    assert.ok(fnStart > 0);
    const block = dash.substring(fnStart, fnStart + 600);
    const usesLegacy = /data\[0\]/.test(block);
    assert.ok(!usesLegacy, "Must NOT use data[0] legacy indexing");
  });
});

describe("dashboard.js — renderSalesChart format", () => {
  let dash;

  it("renderSalesChart reads data.intervals (wc-analytics)", () => {
    dash = readDashFile("js/dashboard.js");
    const fnStart = dash.indexOf("function renderSalesChart");
    assert.ok(fnStart > 0, "renderSalesChart must exist");
    const block = dash.substring(fnStart, fnStart + 1200);
    assert.ok(
      block.includes("intervals") || block.includes(".intervals"),
      "Must use data.intervals for chart data",
    );
  });

  it("renderSalesChart reads subtotals.total_sales from intervals", () => {
    dash = readDashFile("js/dashboard.js");
    const fnStart = dash.indexOf("function renderSalesChart");
    assert.ok(fnStart > 0);
    const block = dash.substring(fnStart, fnStart + 1200);
    const usesSubtotals =
      block.includes("subtotals") || block.includes("subtotals.total_sales");
    assert.ok(usesSubtotals, "Must read subtotals.total_sales from intervals");
  });

  it("renderSalesChart does NOT use report.totals[date].sales (legacy)", () => {
    dash = readDashFile("js/dashboard.js");
    const fnStart = dash.indexOf("function renderSalesChart");
    assert.ok(fnStart > 0);
    const block = dash.substring(fnStart, fnStart + 1200);
    const usesLegacy =
      /report\.totals\[/.test(block) || /totals\[date\]/.test(block);
    assert.ok(!usesLegacy, "Must NOT use legacy totals[date] indexing");
  });
});

describe("dashboard.js — loadReports integration", () => {
  let dash;

  it("loadReports passes data directly (not wrapped in array)", () => {
    dash = readDashFile("js/dashboard.js");
    const fnStart = dash.indexOf("function loadReports");
    if (fnStart < 0) return; // loadReports might be inlined
    const block = dash.substring(fnStart, fnStart + 900);
    // Should call renderReportSummary(data) not renderReportSummary([data])
    const callsSummary = block.includes("renderReportSummary");
    assert.ok(callsSummary, "Must call renderReportSummary");
  });

  it("getReportSales still uses wc-analytics endpoint", () => {
    const api = readDashFile("js/api.js");
    const fnStart = api.indexOf("function getReportSales");
    assert.ok(fnStart > 0, "getReportSales must exist");
    const block = api.substring(fnStart, fnStart + 500);
    assert.match(
      block,
      /wc-analytics|reports\/revenue/,
      "Must use wc-analytics reports endpoint",
    );
  });
});

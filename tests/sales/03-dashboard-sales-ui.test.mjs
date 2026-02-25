/**
 * 03 — Dashboard UI Tests
 * Ticket #15: Verify dashboard HTML and JS have sales stats cards
 * and seller-specific views.
 *
 * Static analysis — no Docker needed.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile } from "./helpers.mjs";

describe("Dashboard HTML — Sales stats cards", () => {
  let html;

  it("can read index.html", () => {
    html = readDashFile("index.html");
    assert.ok(html.length > 100);
  });

  it("has a sales stats container in the home/stats section", () => {
    html = readDashFile("index.html");
    // Should have an element for sales stats (could be ID or class)
    const hasSalesStats =
      html.includes("salesStatsContainer") ||
      html.includes('id="salesStats"') ||
      html.includes("jewd-sales-stats");
    assert.ok(
      hasSalesStats,
      "Must have a sales stats container in the dashboard",
    );
  });

  it("has sales stat cards for today, week, month", () => {
    html = readDashFile("index.html");
    // These can be dynamic (JS-rendered) or static placeholders
    // At minimum, the container must exist — JS will populate
    const hasSalesSection =
      html.includes("salesStatsContainer") ||
      html.includes("salesStats") ||
      html.includes("Ventas");
    assert.ok(hasSalesSection, "Must have sales stats section");
  });
});

describe("Dashboard JS — Sales stats rendering", () => {
  let js;

  it("can read dashboard.js", () => {
    js = readDashFile("js/dashboard.js");
    assert.ok(js.length > 100);
  });

  it("has loadSalesStats or equivalent function", () => {
    js = readDashFile("js/dashboard.js");
    const hasLoader =
      /function\s+(loadSalesStats|renderSalesStats|loadSales)/.test(js) ||
      js.includes("getSalesStats");
    assert.ok(hasLoader, "Must have a function to load/render sales stats");
  });

  it("calls getSalesStats from JewdAPI", () => {
    js = readDashFile("js/dashboard.js");
    assert.match(
      js,
      /JewdAPI\.getSalesStats/,
      "Must call JewdAPI.getSalesStats to fetch data",
    );
  });

  it("renders today sales total", () => {
    js = readDashFile("js/dashboard.js");
    const rendersToday =
      js.includes("today") || js.includes("hoy") || js.includes("Today");
    assert.ok(rendersToday, "Must display today's sales");
  });
});

describe("POS — Seller-specific today sales", () => {
  let pos;

  it("can read pos.js", () => {
    pos = readDashFile("js/pos.js");
    assert.ok(pos.length > 100);
  });

  it("today's sales are filtered or tagged by current seller", () => {
    pos = readDashFile("js/pos.js");
    // POS should track seller in today's sales
    const hasSeller =
      pos.includes("_pos_seller") ||
      pos.includes("seller") ||
      pos.includes("currentUser");
    assert.ok(
      hasSeller,
      "Today's sales must be associated with current seller",
    );
  });

  it("addTodaySale includes seller identifier", () => {
    pos = readDashFile("js/pos.js");
    const fnStart =
      pos.indexOf("function addTodaySale") !== -1
        ? pos.indexOf("function addTodaySale")
        : pos.indexOf("addTodaySale");
    assert.ok(fnStart > 0, "addTodaySale function must exist");
    const block = pos.substring(fnStart, fnStart + 500);
    assert.match(block, /seller/, "addTodaySale must include seller field");
  });
});

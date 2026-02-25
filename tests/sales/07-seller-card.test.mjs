/**
 * 07 — Sales By Seller Card Tests (Ticket #22)
 * Verify Reports section has a card showing sales breakdown by seller.
 *
 * Uses existing /jewd/v1/sales/by-seller endpoint.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile, readDashHtml } from "./helpers.mjs";

describe("index.html — Seller Sales Card", () => {
  let html;

  it("has a sellerSalesContainer element", () => {
    html = readDashHtml();
    assert.match(
      html,
      /id=["']sellerSalesContainer["']/,
      "Must have #sellerSalesContainer element",
    );
  });

  it("sellerSalesContainer is in the reports section", () => {
    html = readDashHtml();
    const reportsStart = html.indexOf('id="sectionReports"');
    const sellerCard = html.indexOf('sellerSalesContainer');
    assert.ok(reportsStart > 0, "sectionReports section must exist");
    assert.ok(sellerCard > reportsStart, "sellerSalesContainer must be inside reports section");
  });

  it("has Ventas por Vendedor heading", () => {
    html = readDashHtml();
    const hasHeading =
      html.includes("Ventas por Vendedor") ||
      html.includes("ventas por vendedor") ||
      html.includes("Sales by Seller");
    assert.ok(hasHeading, "Must have 'Ventas por Vendedor' heading");
  });
});

describe("dashboard.js — loadSellerSales function", () => {
  let dash;

  it("has loadSellerSales or loadSalesBySeller function", () => {
    dash = readDashFile("js/dashboard.js");
    const hasFunc =
      /function\s+(loadSellerSales|loadSalesBySeller|loadSellersSales)/.test(dash);
    assert.ok(hasFunc, "Must have a function to load seller sales");
  });

  it("calls getSalesBySeller from api", () => {
    dash = readDashFile("js/dashboard.js");
    assert.ok(
      dash.includes("getSalesBySeller"),
      "Must call getSalesBySeller API function",
    );
  });

  it("has renderSellerSales or renderSalesBySeller function", () => {
    dash = readDashFile("js/dashboard.js");
    const hasRender =
      /function\s+(renderSellerSales|renderSalesBySeller|renderSellersSales)/.test(dash);
    assert.ok(hasRender, "Must have a render function for seller sales");
  });

  it("renders into sellerSalesContainer", () => {
    dash = readDashFile("js/dashboard.js");
    assert.ok(
      dash.includes("sellerSalesContainer"),
      "Must target sellerSalesContainer element",
    );
  });
});

describe("dashboard.js — loadReports calls seller sales", () => {
  let dash;

  it("loadReports (or reports tab handler) calls loadSellerSales", () => {
    dash = readDashFile("js/dashboard.js");
    const callsSellerSales =
      dash.includes("loadSellerSales") ||
      dash.includes("loadSalesBySeller") ||
      dash.includes("loadSellersSales");
    assert.ok(callsSellerSales, "Reports loading must include seller sales");
  });

  it("seller sales is only shown to owner/gerente roles", () => {
    dash = readDashFile("js/dashboard.js");
    // Find the function that calls loadSellerSales
    const loadIdx = dash.indexOf("loadSellerSales") !== -1
      ? dash.indexOf("loadSellerSales")
      : dash.indexOf("loadSalesBySeller") !== -1
        ? dash.indexOf("loadSalesBySeller")
        : dash.indexOf("loadSellersSales");
    assert.ok(loadIdx > 0, "Must call seller sales loading function");
    // Get 500 chars before the call to check for role guard
    const before = dash.substring(Math.max(0, loadIdx - 500), loadIdx + 100);
    const hasRoleGuard =
      before.includes("owner") ||
      before.includes("gerente") ||
      before.includes("admin") ||
      before.includes("role") ||
      before.includes("canView") ||
      before.includes("isOwner") ||
      before.includes("isAdmin");
    assert.ok(hasRoleGuard, "Seller sales must be guarded by role check");
  });
});

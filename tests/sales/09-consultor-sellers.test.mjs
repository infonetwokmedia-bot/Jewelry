/**
 * 09 — Consultor sees seller breakdown (Ticket #24)
 * Verify the seller sales card is visible to users with view_reports permission.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile } from "./helpers.mjs";

describe("dashboard.js — seller card visibility includes view_reports", () => {
  let dash;

  it("loadSellerSales guard includes view_reports check", () => {
    dash = readDashFile("js/dashboard.js");
    // Find the guard around loadSellerSales call
    const callIdx = dash.indexOf("loadSellerSales");
    assert.ok(callIdx > 0, "Must have loadSellerSales call");
    // Look at 600 chars before the call for the guard
    const before = dash.substring(Math.max(0, callIdx - 600), callIdx + 50);
    assert.ok(
      before.includes("view_reports"),
      "Guard must include view_reports permission check",
    );
  });

  it("guard still includes manage_woocommerce for gerente", () => {
    dash = readDashFile("js/dashboard.js");
    const callIdx = dash.indexOf("loadSellerSales");
    const before = dash.substring(Math.max(0, callIdx - 600), callIdx + 50);
    assert.ok(
      before.includes("manage_woocommerce"),
      "Guard must still include manage_woocommerce for gerente",
    );
  });

  it("guard still includes manage_options for admin", () => {
    dash = readDashFile("js/dashboard.js");
    const callIdx = dash.indexOf("loadSellerSales");
    const before = dash.substring(Math.max(0, callIdx - 600), callIdx + 50);
    assert.ok(
      before.includes("manage_options"),
      "Guard must still include manage_options for admin",
    );
  });
});

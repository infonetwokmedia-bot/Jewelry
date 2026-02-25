/**
 * 10 — Gerente sees seller summary in POS (Ticket #26)
 * Verify POS has a seller summary section visible to gerente/admin.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile, readDashHtml } from "./helpers.mjs";

describe("POS HTML — seller summary section", () => {
  let html;

  it("has posSellerSummary container element", () => {
    html = readDashHtml();
    assert.match(
      html,
      /id=["']posSellerSummary["']/,
      "Must have #posSellerSummary element in HTML",
    );
  });

  it("posSellerSummary is inside the POS section", () => {
    html = readDashHtml();
    const posStart = html.indexOf('id="sectionPos"');
    const sellerSummary = html.indexOf("posSellerSummary");
    assert.ok(posStart > 0, "sectionPos must exist");
    assert.ok(
      sellerSummary > posStart,
      "posSellerSummary must be inside POS section",
    );
  });
});

describe("pos.js — loadPosSellerSummary function", () => {
  let pos;

  it("has loadPosSellerSummary or renderPosSellerSummary function", () => {
    pos = readDashFile("js/pos.js");
    const hasFunc =
      /function\s+(loadPosSellerSummary|renderPosSellerSummary|loadSellerSummary)/.test(
        pos,
      );
    assert.ok(
      hasFunc,
      "Must have a function to load/render seller summary in POS",
    );
  });

  it("calls getSalesBySeller API", () => {
    pos = readDashFile("js/pos.js");
    assert.ok(
      pos.includes("getSalesBySeller"),
      "Must call getSalesBySeller API to get seller data",
    );
  });

  it("has role guard for manage_woocommerce or manage_options", () => {
    pos = readDashFile("js/pos.js");
    const funcMatch = pos.match(
      /function\s+(loadPosSellerSummary|renderPosSellerSummary|loadSellerSummary)/,
    );
    if (!funcMatch) return;
    const funcIdx = pos.indexOf(funcMatch[0]);
    // Check 800 chars before the function call (not definition) for role guard
    const callPattern = funcMatch[1];
    const callIdx = pos.indexOf(callPattern + "(");
    if (callIdx < 0) return;
    // Find the first call (not definition)
    let searchFrom = 0;
    let foundCallIdx = -1;
    while (searchFrom < pos.length) {
      const idx = pos.indexOf(callPattern, searchFrom);
      if (idx < 0) break;
      if (idx !== funcIdx) {
        foundCallIdx = idx;
        break;
      }
      searchFrom = idx + 1;
    }
    if (foundCallIdx < 0) return;
    const before = pos.substring(
      Math.max(0, foundCallIdx - 500),
      foundCallIdx + 50,
    );
    const hasGuard =
      before.includes("manage_woocommerce") ||
      before.includes("manage_options") ||
      before.includes("can(");
    assert.ok(hasGuard, "Must have role guard for seller summary");
  });

  it("renders into posSellerSummary container", () => {
    pos = readDashFile("js/pos.js");
    assert.ok(
      pos.includes("posSellerSummary"),
      "Must target posSellerSummary element",
    );
  });
});

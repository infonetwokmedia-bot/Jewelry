/**
 * 01 — HTML Structure Tests
 * Verify index.html has all required POS elements, IDs, and navigation.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile } from "./helpers.mjs";

const html = readDashFile("index.html");

describe("POS HTML — Section structure", () => {
  it("has a POS section with id=sectionPos", () => {
    assert.match(html, /id=["']sectionPos["']/);
  });

  it("section contains jewd-pos-layout wrapper", () => {
    assert.match(html, /class=["'][^"']*jewd-pos-layout/);
  });

  it("has catalog area (jewd-pos-catalog)", () => {
    assert.match(html, /class=["'][^"']*jewd-pos-catalog/);
  });

  it("has cart area (jewd-pos-cart)", () => {
    assert.match(html, /class=["'][^"']*jewd-pos-cart/);
  });
});

describe("POS HTML — Required input IDs", () => {
  const requiredIds = [
    "posSearch",
    "posResults",
    "posCategories",
    "posGrid",
    "posCartItems",
    "posClearCart",
    "posSubtotal",
    "posDiscount",
    "posDiscountBtn",
    "posDiscountPanel",
    "posDiscountType",
    "posDiscountValue",
    "posDiscountApply",
    "posDiscountLabel",
    "posDiscountRemove",
    "posTax",
    "posTotal",
    "posCustName",
    "posCustEmail",
    "posCustPhone",
    "posNotes",
    "posCheckout",
    "posCartCount",
    "posTotalItems",
    "posHoldCart",
    "posHeldList",
    "posHeldCount",
    "posTodayToggle",
    "posTodaySummary",
    "posTodayPanel",
    "posSellerSummary",
  ];

  for (const id of requiredIds) {
    it(`contains element with id="${id}"`, () => {
      assert.match(html, new RegExp(`id=["']${id}["']`), `Missing #${id}`);
    });
  }
});

describe("POS HTML — Navigation", () => {
  it("has nav item linking to #/pos", () => {
    assert.match(html, /href=["']#\/pos["']/);
  });

  it("nav item has data-section=pos", () => {
    assert.match(html, /data-section=["']pos["']/);
  });

  it('nav item has data-permission="create_orders"', () => {
    assert.match(html, /data-permission=["']create_orders["']/);
  });

  it("nav item starts hidden (style=display:none)", () => {
    // The POS nav item should have display:none so it only shows for permitted users
    const posNavBlock = html.match(/data-section=["']pos["'][^>]*>/s);
    assert.ok(posNavBlock, "POS nav item found");
    assert.match(
      posNavBlock[0],
      /display:\s*none/i,
      "POS nav should start hidden",
    );
  });
});

describe("POS HTML — Payment methods (handled via modal)", () => {
  it("pos.js defines payment methods (cash, card, zelle, other)", () => {
    const posJs = readDashFile("js/pos.js");
    assert.match(posJs, /cash.*Efectivo/s);
    assert.match(posJs, /card.*Tarjeta/s);
    assert.match(posJs, /zelle.*Zelle/s);
    assert.match(posJs, /other.*Otro/s);
  });

  it("payment is triggered via posCheckout button (modal flow)", () => {
    assert.match(html, /id=["']posCheckout["']/);
  });
});

describe("POS HTML — Script tags", () => {
  it("includes pos.js script", () => {
    assert.match(html, /src=["']js\/pos\.js/);
  });

  it("pos.js loads before dashboard.js", () => {
    const posIdx = html.indexOf("pos.js");
    const dashIdx = html.indexOf("dashboard.js");
    assert.ok(posIdx > 0, "pos.js found");
    assert.ok(dashIdx > 0, "dashboard.js found");
    assert.ok(posIdx < dashIdx, "pos.js must load before dashboard.js");
  });

  it("pos.js loads after api.js", () => {
    const apiIdx = html.indexOf("api.js");
    const posIdx = html.indexOf("pos.js");
    assert.ok(apiIdx > 0 && posIdx > 0);
    assert.ok(apiIdx < posIdx, "api.js must load before pos.js");
  });

  it("pos.js loads after auth.js", () => {
    const authIdx = html.indexOf("auth.js");
    const posIdx = html.indexOf("pos.js");
    assert.ok(authIdx > 0 && posIdx > 0);
    assert.ok(authIdx < posIdx, "auth.js must load before pos.js");
  });
});

describe("POS HTML — Cache bust versions", () => {
  it("all scripts use the same version parameter", () => {
    const versions = [...html.matchAll(/\?v=([0-9.]+)["']/g)].map((m) => m[1]);
    assert.ok(
      versions.length >= 5,
      `Expected >=5 versioned assets, got ${versions.length}`,
    );
    const unique = [...new Set(versions)];
    assert.equal(
      unique.length,
      1,
      `All versions should match, got: ${unique.join(", ")}`,
    );
  });
});

describe("POS HTML — Customer fields", () => {
  it("customer section is inside a <details> element", () => {
    assert.match(html, /<details>[\s\S]*posCustName[\s\S]*<\/details>/);
  });

  it("has name, email, and phone inputs", () => {
    assert.match(html, /id=["']posCustName["']/);
    assert.match(html, /id=["']posCustEmail["']/);
    assert.match(html, /id=["']posCustPhone["']/);
  });
});

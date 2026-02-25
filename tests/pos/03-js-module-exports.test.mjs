/**
 * 03 — JS Module Exports Tests
 * Verify pos.js, api.js, auth.js expose the correct globals and functions.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile } from "./helpers.mjs";

const posJs = readDashFile("js/pos.js");
const apiJs = readDashFile("js/api.js");
const authJs = readDashFile("js/auth.js");
const dashJs = readDashFile("js/dashboard.js");

describe("pos.js — Module structure", () => {
  it("is an IIFE (immediately invoked function expression)", () => {
    assert.match(posJs, /const\s+JewdPOS\s*=\s*\(function\s*\(\)/);
  });

  it("uses strict mode", () => {
    assert.match(posJs, /["']use strict["']/);
  });

  it("exposes window.JewdPOS", () => {
    assert.match(posJs, /window\.JewdPOS\s*=\s*JewdPOS/);
  });

  it("returns an object with init method", () => {
    assert.match(posJs, /return\s*\{\s*init\s*\}/);
  });
});

describe("pos.js — Required internal functions exist", () => {
  const requiredFunctions = [
    "init",
    "bindEvents",
    "loadCategories",
    "renderCategories",
    "loadCategoryProducts",
    "searchProducts",
    "renderSearchItem",
    "renderProductGrid",
    "showVariationPicker",
    "addToCart",
    "removeFromCart",
    "updateQty",
    "setQty",
    "clearCart",
    "renderCart",
    "calcSubtotal",
    "calcDiscount",
    "updateTotals",
    "toggleDiscountForm",
    "applyDiscount",
    "checkout",
    "showReceipt",
    "printReceipt",
    "getProductPrice",
    "getStockLabel",
    "getPaymentTitle",
    "toast",
  ];

  for (const fn of requiredFunctions) {
    it(`defines function ${fn}()`, () => {
      const pattern = new RegExp(`(async\\s+)?function\\s+${fn}\\s*\\(`);
      assert.match(posJs, pattern, `Function ${fn}() not found in pos.js`);
    });
  }
});

describe("pos.js — Tax and constants", () => {
  it("defines TAX_RATE as 0.07 (7% Florida)", () => {
    assert.match(posJs, /TAX_RATE\s*=\s*0\.07/);
  });

  it("uses 300ms debounce for search", () => {
    assert.match(posJs, /setTimeout\(.*,\s*300\)/s);
  });
});

describe("pos.js — XSS protection", () => {
  it("has an esc() function for HTML escaping", () => {
    assert.match(posJs, /function\s+esc|const\s+esc\s*=|esc\s*=\s*\(s\)/);
  });

  it("escapes & < > characters", () => {
    assert.match(posJs, /&amp;/);
    assert.match(posJs, /&lt;/);
    assert.match(posJs, /&gt;/);
    assert.match(posJs, /&quot;/);
  });
});

describe("pos.js — POS metadata in orders", () => {
  it("sets _pos_sale meta to 'yes'", () => {
    assert.match(posJs, /_pos_sale.*yes/);
  });

  it("sets _pos_seller meta", () => {
    assert.match(posJs, /_pos_seller/);
  });

  it("sets _pos_payment_method meta", () => {
    assert.match(posJs, /_pos_payment_method/);
  });
});

describe("pos.js — Payment methods", () => {
  it("supports cash method", () => {
    assert.match(posJs, /cash.*Efectivo/s);
  });

  it("supports card method", () => {
    assert.match(posJs, /card.*Tarjeta/s);
  });

  it("supports zelle method", () => {
    assert.match(posJs, /zelle.*Zelle/s);
  });

  it("supports other method", () => {
    assert.match(posJs, /other.*Otro/s);
  });
});

describe("api.js — POS-related functions exported", () => {
  it("defines createOrder function", () => {
    assert.match(apiJs, /async\s+function\s+createOrder\s*\(/);
  });

  it("defines searchProducts function", () => {
    assert.match(apiJs, /async\s+function\s+searchProducts\s*\(/);
  });

  it("exports createOrder in return object", () => {
    assert.match(apiJs, /createOrder[,\s\n]/);
  });

  it("exports searchProducts in return object", () => {
    assert.match(apiJs, /searchProducts[,\s\n]/);
  });

  it("searchProducts filters by stock_status=instock", () => {
    assert.match(apiJs, /stock_status.*instock/);
  });

  it("searchProducts filters by status=publish", () => {
    assert.match(apiJs, /status.*publish/);
  });
});

describe("auth.js — Permission system supports POS", () => {
  it("has applyPermissions function", () => {
    assert.match(authJs, /function\s+applyPermissions/);
  });

  it("processes data-permission attributes", () => {
    assert.match(authJs, /data-permission/);
  });

  it("has can() function exported", () => {
    assert.match(authJs, /function\s+can\s*\(/);
  });
});

describe("dashboard.js — POS integration in navigateTo", () => {
  it("handles section === 'pos' in navigateTo", () => {
    assert.match(dashJs, /section\s*===\s*["']pos["']/);
  });

  it("calls JewdPOS.init() for pos section", () => {
    assert.match(dashJs, /JewdPOS\.init\(\)/);
  });

  it("checks typeof JewdPOS before calling init", () => {
    assert.match(dashJs, /typeof\s+JewdPOS\s*!==\s*["']undefined["']/);
  });
});

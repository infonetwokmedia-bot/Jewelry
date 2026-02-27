/**
 * 02 — CSS Completeness Tests
 * Verify all POS CSS classes used in HTML and JS are defined in the stylesheet.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cssHasClass, readDashFile } from "./helpers.mjs";

const css = readDashFile("css/dashboard.css");
const html = readDashFile("index.html");
const posJs = readDashFile("js/pos.js");

describe("POS CSS — Layout classes exist", () => {
  const layoutClasses = [
    "jewd-pos-layout",
    "jewd-pos-catalog",
    "jewd-pos-cart",
    "jewd-pos-search",
    "jewd-pos-search-input",
    "jewd-pos-results",
    "jewd-pos-categories",
    "jewd-pos-grid",
  ];

  for (const cls of layoutClasses) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Search result classes", () => {
  const classes = [
    "jewd-pos-result-item",
    "jewd-pos-result-img",
    "jewd-pos-result-info",
    "jewd-pos-result-name",
    "jewd-pos-result-meta",
    "jewd-pos-result-price",
    "jewd-pos-result-loading",
    "jewd-pos-result-empty",
  ];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Category bar classes", () => {
  const classes = ["jewd-pos-cat-btn"];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }

  it("has .jewd-pos-cat-btn.active style", () => {
    assert.match(css, /\.jewd-pos-cat-btn\.active/);
  });
});

describe("POS CSS — Product grid classes", () => {
  const classes = [
    "jewd-pos-product-card",
    "jewd-pos-product-img",
    "jewd-pos-product-name",
    "jewd-pos-product-price",
    "jewd-pos-no-img",
    "jewd-pos-var-badge",
    "jewd-pos-grid-empty",
    "jewd-pos-grid-loading",
  ];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Cart classes", () => {
  const classes = [
    "jewd-pos-cart-header",
    "jewd-pos-cart-items",
    "jewd-pos-cart-empty",
    "jewd-pos-cart-empty-icon",
    "jewd-pos-cart-item",
    "jewd-pos-cart-item-img",
    "jewd-pos-cart-item-name",
    "jewd-pos-cart-item-attrs",
    "jewd-pos-cart-item-sku",
    "jewd-pos-cart-item-price",
    "jewd-pos-cart-item-qty",
    "jewd-pos-cart-item-total",
    "jewd-pos-cart-item-remove",
    "jewd-pos-qty-btn",
    "jewd-pos-qty-input",
  ];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Summary/totals classes", () => {
  const classes = [
    "jewd-pos-cart-summary",
    "jewd-pos-summary-row",
    "jewd-pos-total-row",
    "jewd-pos-discount-row",
    "jewd-pos-tax-row",
    "jewd-pos-discount-btn",
    "jewd-pos-discount-panel",
    "jewd-pos-discount-select",
    "jewd-pos-discount-input",
    "jewd-pos-discount-label",
    "jewd-pos-discount-remove-btn",
  ];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Customer & payment classes", () => {
  const classes = [
    "jewd-pos-customer",
    "jewd-pos-customer-fields",
    "jewd-pos-payment-modal",
    "jewd-pos-pay-quick",
    "jewd-pos-pay-quick-btn",
    "jewd-pos-pay-total-display",
    "jewd-pos-pay-total-label",
    "jewd-pos-pay-total-amount",
    "jewd-pos-notes",
    "jewd-pos-notes-input",
    "jewd-pos-checkout-btn",
    "jewd-pos-confirm-pay",
  ];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Variation picker classes", () => {
  const classes = [
    "jewd-pos-var-picker",
    "jewd-pos-var-list",
    "jewd-pos-var-option",
    "jewd-pos-var-attrs",
    "jewd-pos-var-sku",
    "jewd-pos-var-price",
    "jewd-pos-var-badge",
    "jewd-pos-var-stock",
    "jewd-pos-var-details",
    "jewd-pos-var-product-img",
    "jewd-pos-var-product-info",
  ];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Receipt classes", () => {
  const classes = [
    "jewd-pos-receipt",
    "jewd-pos-receipt-header",
    "jewd-pos-receipt-icon",
    "jewd-pos-receipt-number",
    "jewd-pos-receipt-table",
    "jewd-pos-receipt-total",
    "jewd-pos-receipt-discount",
    "jewd-pos-receipt-meta",
    "jewd-pos-receipt-meta-row",
    "jewd-pos-receipt-actions",
    "jewd-pos-receipt-body",
    "jewd-pos-receipt-change",
    "jewd-pos-receipt-item-name",
  ];

  for (const cls of classes) {
    it(`defines .${cls}`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} not found in CSS`);
    });
  }
});

describe("POS CSS — Responsive", () => {
  it("has a @media query for POS at max-width 900px", () => {
    assert.match(css, /@media\s*\(\s*max-width:\s*900px\s*\)/);
  });

  it("responsive rule adjusts .jewd-pos-layout grid", () => {
    // Look for grid-template-columns: 1fr inside @media block
    const mediaBlock = css.match(
      /@media\s*\(\s*max-width:\s*900px\s*\)\s*\{[\s\S]*?\n\}/,
    );
    assert.ok(mediaBlock, "Media block found");
    assert.match(mediaBlock[0], /grid-template-columns:\s*1fr/);
  });
});

describe("POS CSS — Cross-reference HTML classes used in JS", () => {
  // Extract class names from pos.js string literals
  const jsClasses = [...posJs.matchAll(/["']jewd-pos-([\w-]+)["']/g)].map(
    (m) => "jewd-pos-" + m[1],
  );
  const uniqueJsClasses = [...new Set(jsClasses)];

  // Classes used in JS for DOM manipulation but styled via parent/inherited rules
  const jsOnlyClasses = [
    "jewd-pos-held-restore",
    "jewd-pos-held-delete",
    "jewd-pos-split-rows",
    "jewd-pos-seller-summary",
    "jewd-pos-seller-summary-header",
  ];

  for (const cls of uniqueJsClasses) {
    it(`JS-used class .${cls} exists in CSS`, () => {
      if (jsOnlyClasses.includes(cls)) return; // styled via parent selectors
      assert.ok(
        cssHasClass(css, cls),
        `.${cls} used in pos.js but not defined in CSS`,
      );
    });
  }
});

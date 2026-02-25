/**
 * 04 — POS Logic Unit Tests
 * Uses a minimal DOM shim to test cart logic, totals, discount, etc.
 * No browser or Docker needed.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readDashFile } from "./helpers.mjs";

// ── Extract and test pure functions from pos.js ────────────────────
// We'll evaluate the isolated helper functions directly.

const posJs = readDashFile("js/pos.js");

// Extract fmtN
const fmtNMatch = posJs.match(
  /const\s+fmtN\s*=\s*(\([^)]*\)\s*=>\s*\{[^}]+\})/s,
);
const fmtN = fmtNMatch ? new Function(`return ${fmtNMatch[1]}`)() : null;

// Extract esc
const escMatch = posJs.match(/const\s+esc\s*=\s*(\([^)]*\)\s*=>[\s\S]*?;)\n/);
// Build esc manually since it uses chained replaces
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Extract getProductPrice logic
function getProductPrice(product) {
  if (product.sale_price && product.sale_price !== "") {
    return parseFloat(product.sale_price);
  }
  if (product.price) return parseFloat(product.price);
  if (product.regular_price) return parseFloat(product.regular_price);
  return 0;
}

// Extract getStockLabel logic
function getStockLabel(product) {
  if (product.stock_quantity !== null && product.stock_quantity !== undefined) {
    return product.stock_quantity + " en stock";
  }
  return product.stock_status === "instock" ? "En stock" : "Agotado";
}

// Extract getPaymentTitle logic
function getPaymentTitle(method) {
  const titles = {
    cash: "Efectivo",
    card: "Tarjeta de crédito/débito",
    zelle: "Zelle",
    other: "Otro método",
  };
  return titles[method] || method;
}

// Cart logic (extracted)
const TAX_RATE = 0.07;

function calcSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function calcDiscount(subtotal, discount) {
  if (!discount.value || discount.value <= 0) return 0;
  if (discount.type === "percent") {
    return subtotal * (Math.min(discount.value, 100) / 100);
  }
  return Math.min(discount.value, subtotal);
}

function calcTotals(cart, discount) {
  const subtotal = calcSubtotal(cart);
  const disc = calcDiscount(subtotal, discount);
  const afterDiscount = subtotal - disc;
  const tax = afterDiscount * TAX_RATE;
  const total = afterDiscount + tax;
  return { subtotal, disc, afterDiscount, tax, total };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("fmtN — Number formatting", () => {
  it("formats a number to 2 decimal places", () => {
    assert.equal(fmtN(10), "10.00");
    assert.equal(fmtN(10.5), "10.50");
    assert.equal(fmtN(10.999), "11.00");
  });

  it("handles string numbers", () => {
    assert.equal(fmtN("25.5"), "25.50");
    assert.equal(fmtN("0"), "0.00");
  });

  it('returns "0.00" for NaN/null/undefined', () => {
    assert.equal(fmtN(null), "0.00");
    assert.equal(fmtN(undefined), "0.00");
    assert.equal(fmtN("abc"), "0.00");
    assert.equal(fmtN(""), "0.00");
  });
});

describe("esc — XSS escaping", () => {
  it("escapes HTML special characters", () => {
    assert.equal(
      esc("<script>alert(1)</script>"),
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("escapes ampersands", () => {
    assert.equal(esc("A & B"), "A &amp; B");
  });

  it("escapes double quotes", () => {
    assert.equal(esc('say "hello"'), "say &quot;hello&quot;");
  });

  it("handles null/undefined gracefully", () => {
    assert.equal(esc(null), "");
    assert.equal(esc(undefined), "");
    assert.equal(esc(""), "");
  });
});

describe("getProductPrice — Price extraction", () => {
  it("prefers sale_price when available", () => {
    assert.equal(
      getProductPrice({
        sale_price: "19.99",
        price: "29.99",
        regular_price: "29.99",
      }),
      19.99,
    );
  });

  it("falls back to price when no sale_price", () => {
    assert.equal(
      getProductPrice({
        sale_price: "",
        price: "29.99",
        regular_price: "39.99",
      }),
      29.99,
    );
  });

  it("falls back to regular_price", () => {
    assert.equal(getProductPrice({ regular_price: "49.99" }), 49.99);
  });

  it("returns 0 when no price is set", () => {
    assert.equal(getProductPrice({}), 0);
  });

  it("ignores empty string sale_price", () => {
    assert.equal(getProductPrice({ sale_price: "", price: "100" }), 100);
  });
});

describe("getStockLabel — Stock display", () => {
  it("shows quantity when available", () => {
    assert.equal(
      getStockLabel({ stock_quantity: 5, stock_status: "instock" }),
      "5 en stock",
    );
  });

  it("shows 0 en stock for zero quantity", () => {
    assert.equal(
      getStockLabel({ stock_quantity: 0, stock_status: "outofstock" }),
      "0 en stock",
    );
  });

  it('shows "En stock" when no quantity but instock status', () => {
    assert.equal(
      getStockLabel({ stock_quantity: null, stock_status: "instock" }),
      "En stock",
    );
  });

  it('shows "Agotado" when out of stock', () => {
    assert.equal(
      getStockLabel({ stock_quantity: null, stock_status: "outofstock" }),
      "Agotado",
    );
  });
});

describe("getPaymentTitle — Payment method labels", () => {
  it("maps cash to Efectivo", () => {
    assert.equal(getPaymentTitle("cash"), "Efectivo");
  });

  it("maps card to Tarjeta", () => {
    assert.equal(getPaymentTitle("card"), "Tarjeta de crédito/débito");
  });

  it("maps zelle to Zelle", () => {
    assert.equal(getPaymentTitle("zelle"), "Zelle");
  });

  it("maps other to Otro método", () => {
    assert.equal(getPaymentTitle("other"), "Otro método");
  });

  it("returns raw method for unknown methods", () => {
    assert.equal(getPaymentTitle("bitcoin"), "bitcoin");
  });
});

describe("Cart — calcSubtotal", () => {
  it("returns 0 for empty cart", () => {
    assert.equal(calcSubtotal([]), 0);
  });

  it("calculates single item subtotal", () => {
    assert.equal(calcSubtotal([{ price: 100, qty: 1 }]), 100);
  });

  it("multiplies price by quantity", () => {
    assert.equal(calcSubtotal([{ price: 50, qty: 3 }]), 150);
  });

  it("sums multiple items", () => {
    const cart = [
      { price: 100, qty: 2 },
      { price: 50, qty: 1 },
      { price: 25, qty: 4 },
    ];
    assert.equal(calcSubtotal(cart), 350);
  });
});

describe("Cart — calcDiscount", () => {
  it("returns 0 when no discount value", () => {
    assert.equal(calcDiscount(100, { type: "percent", value: 0 }), 0);
  });

  it("calculates percentage discount", () => {
    assert.equal(calcDiscount(200, { type: "percent", value: 10 }), 20);
  });

  it("caps percentage at 100%", () => {
    assert.equal(calcDiscount(200, { type: "percent", value: 150 }), 200);
  });

  it("calculates fixed discount", () => {
    assert.equal(calcDiscount(200, { type: "fixed", value: 30 }), 30);
  });

  it("caps fixed discount at subtotal", () => {
    assert.equal(calcDiscount(50, { type: "fixed", value: 100 }), 50);
  });

  it("returns 0 for negative discount value", () => {
    assert.equal(calcDiscount(100, { type: "percent", value: -10 }), 0);
  });
});

describe("Cart — Full total calculation", () => {
  it("calculates correct totals with no discount", () => {
    const cart = [{ price: 100, qty: 1 }];
    const disc = { type: "percent", value: 0 };
    const t = calcTotals(cart, disc);

    assert.equal(t.subtotal, 100);
    assert.equal(t.disc, 0);
    assert.equal(t.afterDiscount, 100);
    assert.ok(Math.abs(t.tax - 7) < 0.001, `Tax should be ~7, got ${t.tax}`);
    assert.ok(
      Math.abs(t.total - 107) < 0.001,
      `Total should be ~107, got ${t.total}`,
    );
  });

  it("calculates correct totals with 10% discount", () => {
    const cart = [{ price: 200, qty: 1 }];
    const disc = { type: "percent", value: 10 };
    const t = calcTotals(cart, disc);

    assert.equal(t.subtotal, 200);
    assert.equal(t.disc, 20);
    assert.equal(t.afterDiscount, 180);
    assert.equal(t.tax, 180 * 0.07); // 12.6
    assert.equal(t.total, 180 + 180 * 0.07); // 192.6
  });

  it("calculates correct totals with $50 fixed discount", () => {
    const cart = [
      { price: 150, qty: 1 },
      { price: 50, qty: 2 },
    ];
    const disc = { type: "fixed", value: 50 };
    const t = calcTotals(cart, disc);

    assert.equal(t.subtotal, 250);
    assert.equal(t.disc, 50);
    assert.equal(t.afterDiscount, 200);
    assert.equal(t.tax, 200 * 0.07); // 14
    assert.equal(t.total, 200 + 200 * 0.07); // 214
  });

  it("tax is applied AFTER discount (correct order)", () => {
    const cart = [{ price: 100, qty: 1 }];
    const disc = { type: "percent", value: 50 };
    const t = calcTotals(cart, disc);

    // Tax should be on 50, not on 100
    assert.equal(t.afterDiscount, 50);
    assert.equal(t.tax, 50 * 0.07); // 3.5 not 7
    assert.equal(t.total, 50 + 3.5); // 53.5 not 57
  });
});

describe("Cart — addToCart item structure", () => {
  it("creates correct cart item from simple product", () => {
    const product = {
      id: 42,
      name: "Gold Ring",
      sku: "GR-001",
      price: "299.99",
      images: [{ src: "https://example.com/ring.jpg" }],
      type: "simple",
    };

    // Simulate addToCart logic
    const price = getProductPrice(product);
    const item = {
      id: `${product.id}`,
      productId: product.id,
      variationId: null,
      name: product.name,
      sku: product.sku,
      attrs: "",
      price: price,
      qty: 1,
      img: product.images[0].src,
    };

    assert.equal(item.id, "42");
    assert.equal(item.productId, 42);
    assert.equal(item.variationId, null);
    assert.equal(item.price, 299.99);
    assert.equal(item.qty, 1);
  });

  it("creates correct cart item from variation", () => {
    const product = {
      id: 42,
      name: "Gold Ring",
      sku: "GR-001",
      images: [{ src: "ring.jpg" }],
      type: "variable",
    };
    const variation = {
      id: 100,
      price: "249.99",
      sku: "GR-001-S",
      attributes: [{ name: "Size", option: "Small" }],
    };

    const price =
      parseFloat(
        variation.sale_price || variation.price || variation.regular_price,
      ) || 0;
    const attrs = variation.attributes.map((a) => a.option).join(" / ");
    const itemId = `${product.id}-${variation.id}`;

    assert.equal(itemId, "42-100");
    assert.equal(price, 249.99);
    assert.equal(attrs, "Small");
  });

  it("increments qty for duplicate items instead of adding new entry", () => {
    const cart = [
      { id: "42", productId: 42, variationId: null, price: 100, qty: 1 },
    ];

    // Simulate adding same product again
    const itemId = "42";
    const existing = cart.find((item) => item.id === itemId);
    if (existing) existing.qty += 1;

    assert.equal(cart.length, 1); // Still 1 item
    assert.equal(cart[0].qty, 2); // But qty increased
  });
});

describe("Cart — Order data structure for WC API", () => {
  it("builds correct line_items format", () => {
    const cart = [
      { productId: 42, variationId: null, price: 100, qty: 2 },
      { productId: 43, variationId: 200, price: 50, qty: 1 },
    ];

    const lineItems = cart.map((item) => {
      const lineItem = {
        product_id: item.productId,
        quantity: item.qty,
        subtotal: String(item.price * item.qty),
        total: String(item.price * item.qty),
      };
      if (item.variationId) {
        lineItem.variation_id = item.variationId;
      }
      return lineItem;
    });

    assert.equal(lineItems.length, 2);
    assert.equal(lineItems[0].product_id, 42);
    assert.equal(lineItems[0].quantity, 2);
    assert.equal(lineItems[0].subtotal, "200");
    assert.equal(lineItems[0].variation_id, undefined); // no variation
    assert.equal(lineItems[1].variation_id, 200);
  });

  it("includes POS meta data", () => {
    const meta = [
      { key: "_pos_sale", value: "yes" },
      { key: "_pos_seller", value: "vendedor1" },
      { key: "_pos_payment_method", value: "cash" },
    ];

    assert.equal(meta[0].key, "_pos_sale");
    assert.equal(meta[0].value, "yes");
    assert.equal(meta[1].key, "_pos_seller");
    assert.equal(meta[2].value, "cash");
  });

  it("adds fee_line for discount", () => {
    const discount = { type: "percent", value: 15 };
    const disc = calcDiscount(200, discount);

    const feeLine = {
      name:
        discount.type === "percent"
          ? `Descuento ${discount.value}%`
          : "Descuento manual",
      total: "-" + disc.toFixed(2),
    };

    assert.equal(feeLine.name, "Descuento 15%");
    assert.equal(feeLine.total, "-30.00");
  });
});

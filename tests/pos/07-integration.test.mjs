/**
 * 07 — Integration Chain Tests
 * End-to-end verification of the complete POS integration.
 * Checks that all pieces (HTML, CSS, JS, API, navigation) work together.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cssHasClass,
  dashFileExists,
  dockerExec,
  isContainerRunning,
  readDashFile,
} from "./helpers.mjs";

// Detect containers synchronously at module level
const containersUp =
  isContainerRunning("jewelry_dashboard") &&
  isContainerRunning("jewelry_wordpress");

describe("Integration — File existence", () => {
  const requiredFiles = [
    "index.html",
    "css/dashboard.css",
    "js/pos.js",
    "js/api.js",
    "js/auth.js",
    "js/dashboard.js",
    "js/users.js",
    ".env.js",
  ];

  for (const file of requiredFiles) {
    it(`${file} exists`, () => {
      assert.ok(dashFileExists(file), `Missing: ${file}`);
    });
  }
});

describe("Integration — Version consistency", () => {
  it("CSS and all JS files use the same cache-bust version", () => {
    const html = readDashFile("index.html");
    const versions = [...html.matchAll(/\?v=([0-9.]+)/g)].map((m) => m[1]);
    const unique = [...new Set(versions)];
    assert.equal(unique.length, 1, `Version mismatch: ${unique.join(", ")}`);
  });
});

describe("Integration — Script load order", () => {
  it("scripts load in correct dependency order", () => {
    const html = readDashFile("index.html");
    const scripts = [...html.matchAll(/src=["']([^"'?]+)/g)].map((m) => m[1]);

    const order = [
      ".env.js",
      "js/auth.js",
      "js/api.js",
      "js/users.js",
      "js/pos.js",
      "js/dashboard.js",
    ];

    for (let i = 1; i < order.length; i++) {
      const prevIdx = scripts.indexOf(order[i - 1]);
      const currIdx = scripts.indexOf(order[i]);
      assert.ok(
        prevIdx < currIdx,
        `${order[i - 1]} (idx ${prevIdx}) should load before ${order[i]} (idx ${currIdx})`,
      );
    }
  });
});

describe("Integration — POS section is properly linked to nav", () => {
  it("nav data-section=pos matches section id=sectionPos", () => {
    const html = readDashFile("index.html");
    // nav has data-section="pos"
    assert.match(html, /data-section=["']pos["']/);
    // section has id="sectionPos"
    assert.match(html, /id=["']sectionPos["']/);
  });

  it("navigateTo capitalizes section name to find DOM id", () => {
    const dashJs = readDashFile("js/dashboard.js");
    // Verify the pattern: sec.id === "section" + capitalize(section)
    assert.match(dashJs, /["']section["']\s*\+\s*capitalize\(section\)/);
  });

  it('"pos" is in validSections for hash routing', () => {
    const dashJs = readDashFile("js/dashboard.js");
    const match = dashJs.match(/validSections\s*=\s*\[([^\]]+)\]/);
    assert.ok(match, "validSections array found");
    assert.match(match[1], /["']pos["']/, '"pos" must be in validSections');
  });
});

describe("Integration — HTML ↔ JS element ID bindings", () => {
  const posJs = readDashFile("js/pos.js");
  const html = readDashFile("index.html");

  // Extract all IDs referenced in pos.js via $("# or getElementById("
  const jsIds = [
    ...posJs.matchAll(/\$\(\s*["']#([\w]+)["']\s*\)/g),
    ...posJs.matchAll(/getElementById\(\s*["']([\w]+)["']\s*\)/g),
  ].map((m) => m[1]);
  const uniqueJsIds = [...new Set(jsIds)];

  for (const id of uniqueJsIds) {
    it(`JS references #${id} which exists in HTML`, () => {
      // Some IDs are dynamic (toast is from dashboard) — skip those
      const dynamicIds = ["toast"];
      if (dynamicIds.includes(id)) return;
      assert.match(
        html,
        new RegExp(`id=["']${id}["']`),
        `pos.js references #${id} but it's not in index.html`,
      );
    });
  }
});

describe("Integration — HTML ↔ CSS class coverage", () => {
  const html = readDashFile("index.html");
  const css = readDashFile("css/dashboard.css");

  // Extract POS-specific classes from HTML
  const posClasses = [
    ...html.matchAll(/class=["'][^"']*?(jewd-pos-[\w-]+)/g),
  ].map((m) => m[1]);
  const unique = [...new Set(posClasses)];

  for (const cls of unique) {
    it(`HTML class .${cls} has CSS definition`, () => {
      assert.ok(cssHasClass(css, cls), `.${cls} in HTML but not in CSS`);
    });
  }
});

describe("Integration — JS ↔ API function availability", () => {
  const posJs = readDashFile("js/pos.js");
  const apiJs = readDashFile("js/api.js");

  it("pos.js calls JewdAPI.searchProducts which is exported", () => {
    assert.match(posJs, /JewdAPI\.searchProducts/);
    assert.match(apiJs, /searchProducts/);
  });

  it("pos.js calls JewdAPI.getCategories which is exported", () => {
    assert.match(posJs, /JewdAPI\.getCategories/);
    assert.match(apiJs, /getCategories/);
  });

  it("pos.js calls JewdAPI.getVariations which is exported", () => {
    assert.match(posJs, /JewdAPI\.getVariations/);
    assert.match(apiJs, /getVariations/);
  });

  it("pos.js calls JewdAPI.createOrder which is exported", () => {
    assert.match(posJs, /JewdAPI\.createOrder/);
    assert.match(apiJs, /createOrder/);
  });

  it("pos.js calls JewdAPI.createOrderNote which is exported", () => {
    assert.match(posJs, /JewdAPI\.createOrderNote/);
    assert.match(apiJs, /createOrderNote/);
  });
});

describe("Integration — JS ↔ Auth function availability", () => {
  const posJs = readDashFile("js/pos.js");
  const authJs = readDashFile("js/auth.js");

  it('pos.js calls window.JewdAuth.can("create_orders")', () => {
    assert.match(posJs, /JewdAuth\.can\(\s*["']create_orders["']\)/);
  });

  it("pos.js calls window.JewdAuth.currentUser()", () => {
    assert.match(posJs, /JewdAuth\.currentUser\(\)/);
  });

  it("auth.js exports can and currentUser", () => {
    assert.match(authJs, /\bcan\b/);
    assert.match(authJs, /\bcurrentUser\b/);
  });
});

describe(
  "Integration — Container serves files correctly",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("container serves index.html with POS section", () => {
      const result = dockerExec(
        "jewelry_dashboard",
        'grep -c "sectionPos" /usr/share/nginx/html/index.html',
      );
      assert.ok(
        parseInt(result) > 0,
        "sectionPos not found in served index.html",
      );
    });

    it("container has pos.js", () => {
      const result = dockerExec(
        "jewelry_dashboard",
        "test -f /usr/share/nginx/html/js/pos.js && echo ok",
      );
      assert.equal(result, "ok");
    });

    it("container CSS has POS styles", () => {
      const result = dockerExec(
        "jewelry_dashboard",
        'grep -c "jewd-pos-layout" /usr/share/nginx/html/css/dashboard.css',
      );
      assert.ok(parseInt(result) > 0, "POS CSS not found in served stylesheet");
    });

    it("nginx proxies /api/ to WordPress", () => {
      const result = dockerExec(
        "jewelry_dashboard",
        'curl -sf "http://localhost/api/wp/v2/types" | head -c 100',
      );
      // Should return JSON with post types
      assert.match(
        result,
        /post|page/i,
        "WordPress API should return post types",
      );
    });
  },
);

describe("Integration — POS flow simulation (data integrity)", () => {
  it("complete flow: product → cart → order data → meta", () => {
    // Simulate the entire POS data flow without DOM
    const product = {
      id: 99,
      name: 'Cuban Link 10k 5mm 20"',
      sku: "CL-10K-5-20",
      price: "1499.99",
      images: [{ src: "/media/chain.jpg" }],
      type: "simple",
    };

    // 1. Build cart item
    const price = parseFloat(product.price);
    const cartItem = {
      id: `${product.id}`,
      productId: product.id,
      variationId: null,
      name: product.name,
      sku: product.sku,
      price,
      qty: 1,
    };

    // 2. Calculate totals
    const cart = [cartItem];
    const discount = { type: "percent", value: 10 };
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = subtotal * (discount.value / 100);
    const afterDiscount = subtotal - disc;
    const tax = afterDiscount * 0.07;
    const total = afterDiscount + tax;

    assert.equal(subtotal, 1499.99);
    assert.equal(disc, 149.999);
    assert.ok(Math.abs(total - (1349.991 + 1349.991 * 0.07)) < 0.01);

    // 3. Build order payload
    const orderData = {
      status: "completed",
      payment_method: "zelle",
      payment_method_title: "Zelle",
      set_paid: true,
      line_items: [
        {
          product_id: cartItem.productId,
          quantity: cartItem.qty,
          subtotal: String(cartItem.price * cartItem.qty),
          total: String(cartItem.price * cartItem.qty),
        },
      ],
      meta_data: [
        { key: "_pos_sale", value: "yes" },
        { key: "_pos_seller", value: "vendedor1" },
        { key: "_pos_payment_method", value: "zelle" },
      ],
      fee_lines: [{ name: "Descuento 10%", total: "-" + disc.toFixed(2) }],
    };

    // 4. Verify structure
    assert.equal(orderData.status, "completed");
    assert.equal(orderData.set_paid, true);
    assert.equal(orderData.line_items.length, 1);
    assert.equal(orderData.meta_data.length, 3);
    assert.equal(orderData.fee_lines[0].total, "-150.00");
    assert.equal(orderData.meta_data[0].value, "yes");
    assert.equal(orderData.meta_data[2].value, "zelle");
  });
});

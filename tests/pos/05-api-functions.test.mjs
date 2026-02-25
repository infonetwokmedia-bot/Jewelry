/**
 * 05 — API Functions Tests
 * Tests the WooCommerce REST API endpoints through the Docker nginx proxy.
 * Requires running containers: jewelry_dashboard, jewelry_wordpress, jewelry_mysql
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isContainerRunning,
  readDashFile,
  wcApiDelete,
  wcApiGet,
  wcApiPost,
} from "./helpers.mjs";

// Detect containers synchronously at module level so skip works
const containersUp =
  isContainerRunning("jewelry_dashboard") &&
  isContainerRunning("jewelry_wordpress") &&
  isContainerRunning("jewelry_mysql");

describe("API — Container health", () => {
  it("jewelry_dashboard is running", () => {
    assert.ok(
      isContainerRunning("jewelry_dashboard"),
      "Dashboard container not running",
    );
  });

  it("jewelry_wordpress is running", () => {
    assert.ok(
      isContainerRunning("jewelry_wordpress"),
      "WordPress container not running",
    );
  });

  it("jewelry_mysql is running", () => {
    assert.ok(
      isContainerRunning("jewelry_mysql"),
      "MySQL container not running",
    );
  });
});

describe("API — .env.js configuration", () => {
  it("has valid WooCommerce consumer key", () => {
    const env = readDashFile(".env.js");
    assert.match(env, /consumerKey:\s*["']ck_[a-f0-9]+/);
  });

  it("has valid WooCommerce consumer secret", () => {
    const env = readDashFile(".env.js");
    assert.match(env, /consumerSecret:\s*["']cs_[a-f0-9]+/);
  });

  it("uses proxied wcBaseUrl (/api/wc/v3)", () => {
    const env = readDashFile(".env.js");
    assert.match(env, /wcBaseUrl:\s*["']\/api\/wc\/v3/);
  });
});

describe(
  "API — Product search endpoint",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("returns an array of products", () => {
      const products = wcApiGet("products", "per_page=2&status=publish");
      assert.ok(Array.isArray(products), "Expected array response");
      assert.ok(products.length > 0, "Expected at least 1 product");
    });

    it("product has required fields (id, name, price, type)", () => {
      const [p] = wcApiGet("products", "per_page=1");
      assert.ok(p.id, "Missing id");
      assert.ok(p.name, "Missing name");
      assert.ok(p.type, "Missing type");
      // price can be "" for variable products
      assert.ok("price" in p, "Missing price field");
    });

    it("can filter by stock_status=instock", () => {
      const products = wcApiGet("products", "per_page=5&stock_status=instock");
      assert.ok(Array.isArray(products));
      for (const p of products) {
        // Variable parents may not have stock_status themselves
        if (p.type !== "variable") {
          assert.equal(
            p.stock_status,
            "instock",
            `Product ${p.id} is not instock`,
          );
        }
      }
    });

    it("can search by keyword", () => {
      const products = wcApiGet("products", "per_page=5&search=ring");
      assert.ok(Array.isArray(products));
      // We don't assert length since search term may not match; just no error
    });

    it("can filter by category", () => {
      // First get a category
      const cats = wcApiGet("products/categories", "per_page=1");
      if (cats.length > 0) {
        const catId = cats[0].id;
        const products = wcApiGet("products", `per_page=5&category=${catId}`);
        assert.ok(Array.isArray(products));
      }
    });
  },
);

describe(
  "API — Categories endpoint",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("returns array of categories", () => {
      const cats = wcApiGet("products/categories", "per_page=50");
      assert.ok(Array.isArray(cats));
      assert.ok(cats.length > 0, "Expected at least 1 category");
    });

    it("category has id, name, count", () => {
      const [c] = wcApiGet("products/categories", "per_page=1");
      assert.ok(c.id, "Missing id");
      assert.ok(c.name, "Missing name");
      assert.ok("count" in c, "Missing count field");
    });
  },
);

describe(
  "API — Order creation endpoint",
  { skip: !containersUp && "Containers not running" },
  () => {
    let testOrderId = null;

    it("can create a minimal order", () => {
      const order = wcApiPost("orders", {
        status: "pending",
        set_paid: false,
        meta_data: [{ key: "_pos_test", value: "true" }],
      });

      assert.ok(order.id, "Order should have an id");
      assert.equal(order.status, "pending");
      testOrderId = order.id;
    });

    it("can create a POS order with line items", () => {
      // Get a simple product first
      const products = wcApiGet(
        "products",
        "per_page=1&type=simple&stock_status=instock",
      );
      if (products.length === 0) {
        // Skip if no simple products available
        return;
      }

      const p = products[0];
      const order = wcApiPost("orders", {
        status: "completed",
        payment_method: "cash",
        payment_method_title: "Efectivo",
        set_paid: true,
        line_items: [
          {
            product_id: p.id,
            quantity: 1,
          },
        ],
        meta_data: [
          { key: "_pos_sale", value: "yes" },
          { key: "_pos_seller", value: "test_runner" },
          { key: "_pos_payment_method", value: "cash" },
          { key: "_pos_test", value: "true" },
        ],
      });

      assert.ok(order.id);
      assert.equal(order.status, "completed");
      assert.ok(order.line_items.length > 0, "Order should have line items");

      // Verify POS meta
      const posMeta = order.meta_data.find((m) => m.key === "_pos_sale");
      assert.ok(posMeta, "_pos_sale meta should exist");
      assert.equal(posMeta.value, "yes");

      // Clean up
      wcApiDelete(`orders/${order.id}`);
    });

    it("can add a note to an order", () => {
      if (!testOrderId) return;

      const note = wcApiPost(`orders/${testOrderId}/notes`, {
        note: "[POS TEST] This is a test note",
      });

      assert.ok(note.id, "Note should have an id");
      assert.match(note.note, /POS TEST/);
    });

    // Cleanup test order
    it("cleanup: delete test order", () => {
      if (testOrderId) {
        const deleted = wcApiDelete(`orders/${testOrderId}`);
        assert.ok(deleted.id, "Deleted order should return its id");
      }
    });
  },
);

describe(
  "API — Variations endpoint",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("can fetch variations for a variable product", () => {
      // Find a variable product
      const products = wcApiGet("products", "per_page=20&type=variable");
      if (products.length === 0) {
        // No variable products — skip gracefully
        return;
      }

      const varProduct = products[0];
      const variations = wcApiGet(
        `products/${varProduct.id}/variations`,
        "per_page=50",
      );
      assert.ok(Array.isArray(variations));
      assert.ok(
        variations.length > 0,
        `Variable product ${varProduct.id} should have variations`,
      );

      // Check variation structure
      const v = variations[0];
      assert.ok(v.id, "Variation should have id");
      assert.ok("price" in v, "Variation should have price");
      assert.ok("attributes" in v, "Variation should have attributes");
    });
  },
);

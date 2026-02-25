/**
 * 04 — Integration Tests (requires Docker)
 * Ticket #15: End-to-end verification that:
 *   1. Creating a POS order syncs wp_wc_order_stats
 *   2. Sales stats endpoint returns correct data
 *   3. Sales by-seller endpoint returns per-seller breakdown
 *
 * REQUIRES: jewelry_dashboard, jewelry_wordpress, jewelry_mysql running
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isContainerRunning,
  jewdApiGet,
  mysqlQuery,
  wcApiDelete,
  wcApiPost,
} from "./helpers.mjs";

const containersUp =
  isContainerRunning("jewelry_dashboard") &&
  isContainerRunning("jewelry_wordpress") &&
  isContainerRunning("jewelry_mysql");

let testOrderId = null;

describe(
  "Integration — Order stats sync",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("creates a POS order via WC API", async () => {
      const order = wcApiPost("orders", {
        status: "completed",
        payment_method: "cash",
        payment_method_title: "Efectivo",
        set_paid: true,
        line_items: [
          {
            product_id: 2843, // Known product in dev
            quantity: 1,
          },
        ],
        meta_data: [
          { key: "_pos_sale", value: "yes" },
          { key: "_pos_seller", value: "vendedor1" },
          { key: "_pos_seller_name", value: "Vendedor 1" },
          { key: "_pos_payment_method", value: "cash" },
          { key: "_pos_timestamp", value: new Date().toISOString() },
        ],
      });

      assert.ok(order.id, "Order must have an ID");
      assert.equal(order.status, "completed");
      testOrderId = order.id;
    });

    it("order is reflected in wp_wc_order_stats table", () => {
      assert.ok(testOrderId, "Need test order ID");
      // Give WP a moment to process the hook
      const result = mysqlQuery(
        `SELECT order_id, status, total_sales FROM wp_wc_order_stats WHERE order_id = ${testOrderId}`,
      );
      assert.ok(
        result.length > 0,
        `Order #${testOrderId} must exist in wp_wc_order_stats`,
      );
      assert.ok(result.includes(String(testOrderId)), "Order ID must match");
      assert.ok(result.includes("wc-completed"), "Status must be wc-completed");
    });

    it("wp_wc_order_product_lookup is also populated", { todo: "WC Analytics product lookup sync requires scheduler — tracked separately" }, () => {
      assert.ok(testOrderId, "Need test order ID");
      const result = mysqlQuery(
        `SELECT order_id FROM wp_wc_order_product_lookup WHERE order_id = ${testOrderId}`,
      );
      assert.ok(result.length > 0, "Order product lookup must be populated");
    });
  },
);

describe(
  "Integration — Sales stats endpoint",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("returns valid JSON from /jewd/v1/sales/stats", () => {
      const data = jewdApiGet("sales/stats");
      assert.ok(data, "Must return data");
      assert.equal(typeof data, "object", "Must return an object");
    });

    it("response includes today period", () => {
      const data = jewdApiGet("sales/stats");
      assert.ok(
        data.today !== undefined || data.periods?.today !== undefined,
        "Must include today period",
      );
    });

    it("response includes week period", () => {
      const data = jewdApiGet("sales/stats");
      assert.ok(
        data.week !== undefined || data.periods?.week !== undefined,
        "Must include week period",
      );
    });

    it("response includes month period", () => {
      const data = jewdApiGet("sales/stats");
      assert.ok(
        data.month !== undefined || data.periods?.month !== undefined,
        "Must include month period",
      );
    });

    it("each period has total, count, and items fields", () => {
      const data = jewdApiGet("sales/stats");
      const period = data.today || data.periods?.today;
      assert.ok(period, "Today period must exist");
      assert.ok("total" in period, "Period must have total");
      assert.ok("count" in period, "Period must have count (order count)");
      assert.ok("items" in period, "Period must have items (item count)");
    });

    it("today total is > 0 after creating test order", () => {
      const data = jewdApiGet("sales/stats");
      const period = data.today || data.periods?.today;
      assert.ok(period, "Today period must exist");
      assert.ok(parseFloat(period.total) > 0, "Today total must be > 0");
    });

    it("accepts seller filter parameter", () => {
      const data = jewdApiGet("sales/stats", "seller=vendedor1");
      assert.ok(data, "Must return data with seller filter");
      const period = data.today || data.periods?.today;
      assert.ok(period, "Today period must exist for seller filter");
    });
  },
);

describe(
  "Integration — Sales by-seller endpoint",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("returns valid JSON from /jewd/v1/sales/by-seller", () => {
      const data = jewdApiGet("sales/by-seller");
      assert.ok(data, "Must return data");
    });

    it("response is an array or has sellers array", () => {
      const data = jewdApiGet("sales/by-seller");
      const sellers = Array.isArray(data) ? data : data.sellers;
      assert.ok(Array.isArray(sellers), "Must return sellers array");
    });

    it("each seller entry has username, total, count", () => {
      const data = jewdApiGet("sales/by-seller");
      const sellers = Array.isArray(data) ? data : data.sellers;
      if (sellers.length === 0) return; // No sales yet is valid
      const s = sellers[0];
      assert.ok("username" in s || "seller" in s, "Must have username/seller");
      assert.ok("total" in s, "Must have total");
      assert.ok("count" in s, "Must have count");
    });

    it("includes vendedor1 from the test order", () => {
      const data = jewdApiGet("sales/by-seller");
      const sellers = Array.isArray(data) ? data : data.sellers;
      const v1 = sellers.find((s) => (s.username || s.seller) === "vendedor1");
      assert.ok(v1, "vendedor1 must appear in by-seller results");
    });
  },
);

describe(
  "Integration — Cleanup",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("deletes the test order", () => {
      if (!testOrderId) return;
      const deleted = wcApiDelete(`orders/${testOrderId}`);
      assert.ok(deleted.id === testOrderId, "Order deleted");
      testOrderId = null;
    });
  },
);

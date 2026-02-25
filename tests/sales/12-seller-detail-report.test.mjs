/**
 * 12 — Detailed seller sales report (Reports tab)
 *
 * Verify the /jewd/v1/sales/by-seller endpoint returns detailed data:
 * display_name, avg_ticket, items, payment methods breakdown, and orders list.
 *
 * Also verify the dashboard.js renderSellerSales() uses the detail format.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containersUp,
  jewdApiGet,
  readDashFile,
  readMuPlugin,
} from "./helpers.mjs";

// ─── PHP: enriched by-seller endpoint ───────────────────────────────

describe("PHP — /jewd/v1/sales/by-seller returns detailed data", () => {
  let php, block;

  it("loads jewelry-roles.php and finds jewelry_get_sales_by_seller", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_by_seller");
    assert.ok(fnStart > 0, "function must exist");
    block = php.substring(fnStart, fnStart + 5000);
  });

  it("returns display_name from WP user", () => {
    assert.ok(
      block.includes("display_name") && block.includes("get_user_by"),
      "Must resolve display_name from WordPress user",
    );
  });

  it("calculates avg_ticket", () => {
    assert.ok(
      block.includes("avg_ticket"),
      "Must include avg_ticket in response",
    );
  });

  it("returns items count", () => {
    assert.ok(
      block.includes("'items'") || block.includes('"items"'),
      "Must include items (total qty) in response",
    );
  });

  it("includes payment methods breakdown", () => {
    assert.ok(
      block.includes("'methods'") || block.includes('"methods"'),
      "Must include methods array in response",
    );
    assert.ok(
      block.includes("payment_method"),
      "Must group by payment_method",
    );
  });

  it("includes individual orders list", () => {
    assert.ok(
      block.includes("'orders'") || block.includes('"orders"'),
      "Must include orders array in response",
    );
  });
});

// ─── Integration: endpoint returns expected shape ───────────────────

describe("Integration — by-seller endpoint shape", function () {
  if (!containersUp) {
    it("SKIP — containers not running", () => {
      assert.ok(true);
    });
    return;
  }

  let data;

  it("GET /jewd/v1/sales/by-seller returns array", () => {
    const res = jewdApiGet("sales/by-seller", "period=today");
    data = Array.isArray(res) ? res : res.data || [];
    assert.ok(Array.isArray(data), "Response must be an array");
  });

  it("each seller has display_name field", () => {
    if (!data || !data.length) return;
    data.forEach((s) => {
      assert.ok("display_name" in s, `Seller ${s.username} must have display_name`);
    });
  });

  it("each seller has avg_ticket field", () => {
    if (!data || !data.length) return;
    data.forEach((s) => {
      assert.ok("avg_ticket" in s, `Seller ${s.username} must have avg_ticket`);
      assert.ok(typeof s.avg_ticket === "number", "avg_ticket must be a number");
    });
  });

  it("each seller has items count", () => {
    if (!data || !data.length) return;
    data.forEach((s) => {
      assert.ok("items" in s, `Seller ${s.username} must have items`);
    });
  });

  it("each seller has methods array with method/total/count", () => {
    if (!data || !data.length) return;
    data.forEach((s) => {
      assert.ok(Array.isArray(s.methods), `Seller ${s.username} must have methods array`);
      s.methods.forEach((m) => {
        assert.ok("method" in m, "Each method must have method name");
        assert.ok("total" in m, "Each method must have total");
        assert.ok("count" in m, "Each method must have count");
      });
    });
  });

  it("each seller has orders array with id/total/time", () => {
    if (!data || !data.length) return;
    data.forEach((s) => {
      assert.ok(Array.isArray(s.orders), `Seller ${s.username} must have orders array`);
      s.orders.forEach((o) => {
        assert.ok("id" in o, "Each order must have id");
        assert.ok("total" in o, "Each order must have total");
        assert.ok("time" in o, "Each order must have time");
      });
    });
  });

  it("avg_ticket equals total / count", () => {
    if (!data || !data.length) return;
    data.forEach((s) => {
      if (s.count > 0) {
        const expected = Math.round((s.total / s.count) * 100) / 100;
        assert.strictEqual(s.avg_ticket, expected, `avg_ticket for ${s.username}`);
      }
    });
  });
});

// ─── JS: renderSellerSales shows detailed UI ────────────────────────

describe("JS — renderSellerSales detailed UI", () => {
  let dash, block;

  it("loads dashboard.js", () => {
    dash = readDashFile("js/dashboard.js");
    assert.ok(dash.length > 0);
  });

  it("renderSellerSales handles display_name", () => {
    const fnStart = dash.indexOf("function renderSellerSales");
    assert.ok(fnStart > 0);
    block = dash.substring(fnStart, fnStart + 4000);
    assert.ok(
      block.includes("display_name"),
      "Must use display_name for seller labels",
    );
  });

  it("renders avg_ticket / ticket promedio", () => {
    assert.ok(
      block.includes("avg_ticket") || block.includes("Ticket"),
      "Must show average ticket",
    );
  });

  it("renders payment methods breakdown", () => {
    assert.ok(
      block.includes("methods") && block.includes("method"),
      "Must render payment methods breakdown",
    );
  });

  it("renders individual orders table", () => {
    assert.ok(
      block.includes("<table") || block.includes("<th>"),
      "Must render an orders table",
    );
  });

  it("renders expandable/collapsible detail cards", () => {
    assert.ok(
      block.includes("toggle") || block.includes("hidden") || block.includes("classList"),
      "Must have expand/collapse functionality",
    );
  });

  it("shows percentage bar per seller", () => {
    assert.ok(
      block.includes("pct") || block.includes("bar-fill") || block.includes("width"),
      "Must show percentage bar for each seller",
    );
  });
});

// ─── CSS: seller detail styles ──────────────────────────────────────

describe("CSS — Seller detail styles", () => {
  let css;

  it("loads dashboard.css", () => {
    css = readDashFile("css/dashboard.css");
    assert.ok(css.length > 0);
  });

  it("has .jewd-seller-card class", () => {
    assert.ok(css.includes(".jewd-seller-card"), "Must define .jewd-seller-card");
  });

  it("has .jewd-seller-stats class", () => {
    assert.ok(css.includes(".jewd-seller-stats"), "Must define .jewd-seller-stats");
  });

  it("has .jewd-seller-table class", () => {
    assert.ok(css.includes(".jewd-seller-table"), "Must define .jewd-seller-table");
  });

  it("has .jewd-seller-bar-fill class", () => {
    assert.ok(css.includes(".jewd-seller-bar-fill"), "Must define .jewd-seller-bar-fill");
  });
});

/**
 * 08 — API Security: seller isolation (Ticket #23)
 * Verify PHP endpoints enforce seller filtering for non-admin users.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readMuPlugin } from "./helpers.mjs";

describe("PHP — sales/today seller enforcement", () => {
  let php;

  it("jewelry_get_sales_today checks user role before accepting seller param", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_today");
    assert.ok(fnStart > 0);
    const block = php.substring(fnStart, fnStart + 1200);
    // Must check if user can manage_woocommerce or manage_options
    const checksRole =
      block.includes("manage_woocommerce") ||
      block.includes("manage_options") ||
      block.includes("jewelry_api_can_manage_sales") ||
      block.includes("current_user_can");
    assert.ok(
      checksRole,
      "Must check user role before allowing seller param override",
    );
  });

  it("forces seller to current user login for non-admin", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_today");
    assert.ok(fnStart > 0);
    const block = php.substring(fnStart, fnStart + 1200);
    // Must reference user_login or get_current_user or wp_get_current_user
    const forcesUser =
      block.includes("user_login") ||
      block.includes("wp_get_current_user") ||
      block.includes("get_current_user");
    assert.ok(
      forcesUser,
      "Must force seller to current user login for sellers",
    );
  });
});

describe("PHP — sales/stats seller enforcement", () => {
  let php;

  it("jewelry_get_sales_stats checks user role before accepting seller param", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_stats");
    assert.ok(fnStart > 0);
    const block = php.substring(fnStart, fnStart + 800);
    const checksRole =
      block.includes("manage_woocommerce") ||
      block.includes("manage_options") ||
      block.includes("current_user_can");
    assert.ok(
      checksRole,
      "Must check user role before allowing seller param override",
    );
  });

  it("forces seller to current user login for non-admin in stats", () => {
    php = readMuPlugin("jewelry-roles.php");
    const fnStart = php.indexOf("function jewelry_get_sales_stats");
    assert.ok(fnStart > 0);
    const block = php.substring(fnStart, fnStart + 800);
    const forcesUser =
      block.includes("user_login") ||
      block.includes("wp_get_current_user") ||
      block.includes("get_current_user");
    assert.ok(
      forcesUser,
      "Must force seller to current user login for sellers",
    );
  });
});

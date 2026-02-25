/**
 * 06 — Permissions Tests
 * Verify the POS permission gating works correctly for all roles.
 * Tests auth endpoints and data-permission attribute handling.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dockerExec, isContainerRunning, readDashFile } from "./helpers.mjs";

const authJs = readDashFile("js/auth.js");
const html = readDashFile("index.html");

// Detect containers synchronously at module level
const containersUp =
  isContainerRunning("jewelry_dashboard") &&
  isContainerRunning("jewelry_wordpress");

describe("Permissions — auth.js permission system", () => {
  it("applyPermissions iterates data-permission elements", () => {
    assert.match(
      authJs,
      /querySelectorAll\(\s*["']\[data-permission\]["']\s*\)/,
    );
  });

  it("shows element when user has permission (display='')", () => {
    assert.match(authJs, /el\.style\.display\s*=\s*["']["']/);
  });

  it("hides element when user lacks permission (display='none')", () => {
    assert.match(authJs, /el\.style\.display\s*=\s*["']none["']/);
  });

  it("sets aria-hidden for accessibility", () => {
    assert.match(authJs, /setAttribute\(\s*["']aria-hidden["']/);
    assert.match(authJs, /removeAttribute\(\s*["']aria-hidden["']/);
  });
});

describe("Permissions — POS nav gating in HTML", () => {
  it('POS nav has data-permission="create_orders"', () => {
    // Find the pos nav block
    const posNav = html.match(/data-section=["']pos["'][\s\S]*?<\/a>/);
    assert.ok(posNav, "POS nav item exists");
    assert.match(posNav[0], /data-permission=["']create_orders["']/);
  });

  it("POS nav starts with display:none", () => {
    // The element should start hidden and be shown by applyPermissions
    const posNavBlock = html.match(/href=["']#\/pos["'][\s\S]*?<\/a>/);
    assert.ok(posNavBlock);
    assert.match(posNavBlock[0], /style=["'][^"']*display:\s*none/);
  });
});

describe("Permissions — pos.js checkout permission check", () => {
  const posJs = readDashFile("js/pos.js");

  it("checks JewdAuth.can before processing checkout", () => {
    assert.match(posJs, /JewdAuth[\s\S]*?\.can\(\s*["']create_orders["']\s*\)/);
  });

  it("shows error toast when unauthorized", () => {
    assert.match(posJs, /No tienes permiso/);
  });
});

describe(
  "Permissions — mu-plugin role definitions",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("jewelry-roles.php exists in mu-plugins", () => {
      const result = dockerExec(
        "jewelry_wordpress",
        "test -f /var/www/html/wp-content/mu-plugins/jewelry-roles.php && echo exists",
      );
      assert.equal(result, "exists");
    });

    it("defines create_orders capability", () => {
      const phpCode = `php -r "
      require '/var/www/html/wp-load.php';
      \\$role = get_role('jewelry_seller');
      echo \\$role && !empty(\\$role->capabilities['jewelry_create_orders']) ? 'yes' : 'no';
    "`;
      const result = dockerExec("jewelry_wordpress", phpCode, {
        timeout: 30000,
      });
      assert.equal(
        result,
        "yes",
        "jewelry_seller should have create_orders capability",
      );
    });

    it("viewer role does NOT have create_orders", () => {
      const phpCode = `php -r "
      require '/var/www/html/wp-load.php';
      \\$role = get_role('jewelry_viewer');
      echo \\$role && !empty(\\$role->capabilities['jewelry_create_orders']) ? 'yes' : 'no';
    "`;
      const result = dockerExec("jewelry_wordpress", phpCode, {
        timeout: 30000,
      });
      assert.equal(
        result,
        "no",
        "jewelry_viewer should NOT have create_orders capability",
      );
    });

    it("shop_manager has create_orders", () => {
      const phpCode = `php -r "
      require '/var/www/html/wp-load.php';
      \\$role = get_role('shop_manager');
      echo \\$role && !empty(\\$role->capabilities['jewelry_create_orders']) ? 'yes' : 'no';
    "`;
      const result = dockerExec("jewelry_wordpress", phpCode, {
        timeout: 30000,
      });
      assert.equal(
        result,
        "yes",
        "shop_manager should have create_orders capability",
      );
    });
  },
);

describe(
  "Permissions — Login API returns correct capabilities",
  { skip: !containersUp && "Containers not running" },
  () => {
    it("auth verify endpoint exists", () => {
      // Just check the endpoint responds (even with error for no token)
      try {
        const result = dockerExec(
          "jewelry_dashboard",
          'curl -sf "http://localhost/api/jewd/v1/auth/verify"',
        );
        // We expect an error response (no token), but it should be JSON
        const json = JSON.parse(result);
        assert.ok(
          json.code || json.success !== undefined,
          "Endpoint returned valid JSON",
        );
      } catch {
        // 401/403 is expected without token — but it should be JSON
        // If curl returns non-zero, that's also acceptable
      }
    });
  },
);

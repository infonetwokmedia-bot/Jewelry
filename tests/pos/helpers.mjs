/**
 * Test Helpers — shared across all POS test suites.
 * Provides file readers, DOM-like parsing, and Docker exec wrappers.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "../..");
export const DASH = resolve(ROOT, "dashboard");

// ── File helpers ────────────────────────────────────────────────────

export function readDashFile(relPath) {
  const full = resolve(DASH, relPath);
  if (!existsSync(full)) throw new Error(`File not found: ${relPath}`);
  return readFileSync(full, "utf-8");
}

export function dashFileExists(relPath) {
  return existsSync(resolve(DASH, relPath));
}

// ── Simple HTML helpers (no DOM library needed) ─────────────────────

/**
 * Find all occurrences of an attribute value in HTML.
 * e.g. findAttrValues(html, 'id') => ['posSearch', 'posGrid', ...]
 */
export function findAttrValues(html, attr) {
  const re = new RegExp(`${attr}=["']([^"']+)["']`, "g");
  const values = [];
  let m;
  while ((m = re.exec(html))) values.push(m[1]);
  return values;
}

/**
 * Check if a CSS class is defined in a stylesheet string.
 */
export function cssHasClass(css, className) {
  // Match .className with optional pseudo/combinator after it
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\.${escaped}[\\s{,:]`).test(css);
}

/**
 * Extract all CSS class selectors from a stylesheet.
 */
export function extractCssClasses(css) {
  const re = /\.([\w-]+)/g;
  const classes = new Set();
  let m;
  while ((m = re.exec(css))) classes.add(m[1]);
  return classes;
}

// ── Docker helpers ──────────────────────────────────────────────────

export function dockerExec(container, cmd, { timeout = 15000 } = {}) {
  try {
    return execSync(`docker exec ${container} ${cmd}`, {
      timeout,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    throw new Error(
      `Docker exec failed (${container}): ${e.stderr || e.message}`,
    );
  }
}

export function isContainerRunning(name) {
  try {
    const out = execSync(
      `docker ps --filter name=^${name}$ --format "{{.Status}}"`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
    return out.startsWith("Up");
  } catch {
    return false;
  }
}

// ── WooCommerce API helper (through Docker nginx proxy) ───────────────────
// Nginx injects WC Basic Auth server-side, so no consumer keys are needed.

export function wcApiGet(endpoint, extraParams = "") {
  const sep = endpoint.includes("?") ? "&" : "?";
  const extra = extraParams ? `${sep}${extraParams}` : "";
  const url = `http://localhost/api/wc/v3/${endpoint}${extra}`;

  return JSON.parse(dockerExec("jewelry_dashboard", `curl -sf "${url}"`));
}

export function wcApiPost(endpoint, data) {
  const url = `http://localhost/api/wc/v3/${endpoint}`;
  const json = JSON.stringify(data).replace(/'/g, "'\\''");

  return JSON.parse(
    dockerExec(
      "jewelry_dashboard",
      `curl -sf -X POST "${url}" -H "Content-Type: application/json" -d '${json}'`,
      { timeout: 30000 },
    ),
  );
}

export function wcApiDelete(endpoint) {
  const url = `http://localhost/api/wc/v3/${endpoint}?force=true`;
  return JSON.parse(
    dockerExec("jewelry_dashboard", `curl -sf -X DELETE "${url}"`, {
      timeout: 15000,
    }),
  );
}

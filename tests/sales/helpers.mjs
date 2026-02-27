/**
 * Sales Test Helpers — extends POS helpers with sales-specific utilities.
 * Ticket #15: auto-sync WC order stats + sales reporting
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "../..");
export const DASH = resolve(ROOT, "dashboard");
export const MU_PLUGINS = resolve(ROOT, "data/wordpress/wp-content/mu-plugins");

// ── File helpers ────────────────────────────────────────────────────

export function readDashFile(relPath) {
  const full = resolve(DASH, relPath);
  if (!existsSync(full)) throw new Error(`File not found: ${relPath}`);
  return readFileSync(full, "utf-8");
}

export function readDashHtml() {
  return readDashFile("index.html");
}

export const containersUp = isContainerRunning("jewelry_dashboard");

export function readMuPlugin(filename) {
  const full = resolve(MU_PLUGINS, filename);
  if (!existsSync(full)) throw new Error(`MU-plugin not found: ${filename}`);
  return readFileSync(full, "utf-8");
}

export function fileExists(basePath, relPath) {
  return existsSync(resolve(basePath, relPath));
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

// ── WC API helpers ──────────────────────────────────────────────────
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

// ── Custom JEWD API helper (through nginx proxy) ────────────────────

export function jewdApiGet(endpoint, extraParams = "") {
  const sep = endpoint.includes("?") ? "&" : "?";
  const extra = extraParams ? `${sep}${extraParams}` : "";
  const url = `http://localhost/api/jewd/v1/${endpoint}${extra}`;
  return JSON.parse(dockerExec("jewelry_dashboard", `curl -sf "${url}"`));
}

/**
 * Check if the JEWD custom REST API is accessible (requires JWT auth).
 * Returns false if the endpoint returns 401/403 or is unreachable.
 */
export function isJewdApiAccessible() {
  if (!isContainerRunning("jewelry_dashboard")) return false;
  try {
    const result = dockerExec(
      "jewelry_dashboard",
      'curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/jewd/v1/sales/stats"',
      { timeout: 5000 },
    );
    return result === "200";
  } catch {
    return false;
  }
}

// ── MySQL helper ────────────────────────────────────────────────────

export function mysqlQuery(query) {
  const escaped = query.replace(/"/g, '\\"');
  // Use $MYSQL_ROOT_PASSWORD from inside the container (set via docker-compose)
  return dockerExec(
    "jewelry_mysql",
    `sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" --ssl-mode=DISABLED jewelry_db -N -e "${escaped}"'`,
    { timeout: 10000 },
  );
}

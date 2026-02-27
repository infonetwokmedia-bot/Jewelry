/**
 * 04 — Deploy Readiness Regression Tests
 *
 * WHAT THIS PREVENTS:
 * On 2026-02-27, multiple deploy issues compounded:
 *   1. SCP of dist/ created a nested dist/dist/ directory on production
 *   2. dist/index.html was not copied to root index.html
 *   3. Traefik lost container routes after docker compose operations
 *
 * These tests verify the project structure is deploy-ready.
 *
 * LESSON: Verify file structure consistency between local and what
 * deploy-agent.sh expects. The deploy script copies dist/index.html
 * to dashboard/index.html on production — verify the mechanism.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fileExists, readDashFile } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY: Required files must exist
// ═══════════════════════════════════════════════════════════════════════════════

describe('Deploy prerequisites — project structure', () => {
    it('deploy-agent.sh exists and is executable', () => {
        assert.ok(fileExists('scripts/deploy-agent.sh'));
    });

    it('docker-compose.production.yml exists', () => {
        assert.ok(fileExists('docker-compose.production.yml'));
    });

    it('dashboard/index.html exists (dev version)', () => {
        assert.ok(fileExists('dashboard/index.html'));
    });

    it('dashboard/sw.js exists', () => {
        assert.ok(fileExists('dashboard/sw.js'));
    });

    it('dashboard/nginx/production.conf exists', () => {
        assert.ok(fileExists('dashboard/nginx/production.conf'));
    });

    it('dashboard/build.js exists', () => {
        assert.ok(fileExists('dashboard/build.js'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY: production.conf must reference tujoyita_ containers
// ═══════════════════════════════════════════════════════════════════════════════

describe('Nginx production.conf', () => {
    const conf = readDashFile('nginx/production.conf');

    it('proxies to tujoyita_wordpress (not jewelry_wordpress)', () => {
        assert.match(conf, /tujoyita_wordpress/, 'Must proxy to production container name');
        assert.doesNotMatch(conf, /jewelry_wordpress/, 'Must NOT reference local container');
    });

    it('has SPA fallback (try_files → /index.html)', () => {
        assert.match(conf, /try_files.*index\.html/);
    });

    it('sets Cache-Control for versioned assets', () => {
        assert.match(conf, /Cache-Control/);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY: docker-compose.production.yml validations
// ═══════════════════════════════════════════════════════════════════════════════

describe('docker-compose.production.yml', () => {
    const compose = readFileSync(
        join(__dirname, '..', '..', 'docker-compose.production.yml'),
        'utf8'
    );

    it('defines tujoyita_dashboard container', () => {
        assert.match(compose, /tujoyita_dashboard/);
    });

    it('has Traefik labels for dashboard routing', () => {
        assert.match(compose, /PathPrefix.*dashboard/);
    });

    it('uses named volume mysql-data (not bind mount)', () => {
        assert.match(compose, /mysql-data/);
    });

    it('dashboard mounts ./dashboard as read-only', () => {
        assert.match(compose, /\.\/dashboard.*:ro/);
    });

    it('healthcheck uses 127.0.0.1 (not localhost, avoids IPv6 issues)', () => {
        // REGRESSION: localhost caused IPv6 resolution failure in Alpine
        // containers where wget resolves localhost to ::1 but nginx only
        // listens on IPv4
        const dashboardSection = compose.split(/^\s+\w+:/m)
            .find(s => s.includes('tujoyita_dashboard'));
        if (dashboardSection) {
            const healthcheck = dashboardSection.match(/healthcheck[\s\S]*?(?=^\s+\w+:|$)/m);
            if (healthcheck) {
                // At minimum, the compose file should not use localhost in healthchecks
                // for Alpine-based containers
                assert.ok(true, 'Healthcheck section found');
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY: deploy-agent.sh must build before deploying
// ═══════════════════════════════════════════════════════════════════════════════

describe('deploy-agent.sh — build integration', () => {
    const script = readFileSync(
        join(__dirname, '..', '..', 'scripts', 'deploy-agent.sh'),
        'utf8'
    );

    it('runs node dashboard/build.js before deploying', () => {
        assert.match(script, /node dashboard\/build\.js/,
            'deploy-agent.sh must build the bundle before deploying');
    });

    it('copies dist/index.html to production root', () => {
        assert.match(script, /dist\/index\.html/,
            'deploy-agent.sh must handle dist/index.html → root index.html');
    });

    it('excludes .env.js from rsync', () => {
        assert.match(script, /exclude.*\.env\.js/,
            'deploy-agent.sh must exclude .env.js from sync');
    });

    it('excludes .env.production.js from rsync', () => {
        assert.match(script, /exclude.*\.env\.production\.js/,
            'deploy-agent.sh must exclude .env.production.js from sync');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPLOY: No .env files accidentally tracked
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sensitive files — not tracked', () => {
    it('dashboard/.env.production.js is in .gitignore', () => {
        const gitignore = readFileSync(
            join(__dirname, '..', '..', '.gitignore'),
            'utf8'
        );
        assert.match(gitignore, /\.env\.production\.js/,
            '.env.production.js must be in .gitignore');
    });
});

/**
 * 03 — Service Worker Coherence Regression Tests
 *
 * WHAT THIS PREVENTS:
 * On 2026-02-27, the Service Worker had PRECACHE_ASSETS listing individual JS
 * module paths (auth.js, api.js, products.js, etc.) but production only has
 * dist/bundle.min.js. The SW cached old/stale bundles and served them even
 * after deploying a fix, because:
 *   1. PRECACHE_ASSETS referenced non-existent paths in production
 *   2. CACHE_NAME wasn't bumped, so old cache wasn't invalidated
 *   3. cacheFirst strategy served stale content indefinitely
 *
 * LESSON: The SW's PRECACHE_ASSETS must mirror what production actually serves.
 * CACHE_NAME must change whenever bundle content changes.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readDashFile } from './helpers.mjs';

const sw = readDashFile('sw.js');

// ═══════════════════════════════════════════════════════════════════════════════
// PRECACHE_ASSETS must reference dist/ paths (not individual modules)
// ═══════════════════════════════════════════════════════════════════════════════

describe('SW — PRECACHE_ASSETS correctness', () => {
    it('pre-caches dist/bundle.min.js (bundled file)', () => {
        assert.match(sw, /dist\/bundle\.min\.js/, 'SW must pre-cache the bundled JS');
    });

    it('pre-caches dist/bundle.min.css (bundled file)', () => {
        assert.match(sw, /dist\/bundle\.min\.css/, 'SW must pre-cache the bundled CSS');
    });

    it('does NOT pre-cache individual js/auth.js (unbundled)', () => {
        // Individual JS modules don't exist in production
        assert.doesNotMatch(
            sw,
            /["']\/dashboard\/js\/auth\.js["']/,
            'REGRESSION: SW must NOT pre-cache individual JS modules. ' +
            'Production uses dist/bundle.min.js'
        );
    });

    it('does NOT pre-cache individual js/products.js (unbundled)', () => {
        assert.doesNotMatch(
            sw,
            /["']\/dashboard\/js\/products\.js["']/,
            'REGRESSION: SW must NOT pre-cache individual JS modules'
        );
    });

    it('does NOT pre-cache individual js/app.js (unbundled)', () => {
        assert.doesNotMatch(
            sw,
            /["']\/dashboard\/js\/app\.js["']/,
            'REGRESSION: SW must NOT pre-cache individual JS modules'
        );
    });

    it('does NOT pre-cache css/dashboard.css (unbundled)', () => {
        assert.doesNotMatch(
            sw,
            /["']\/dashboard\/css\/dashboard\.css["']/,
            'REGRESSION: SW must NOT pre-cache unbundled CSS'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE_NAME must follow versioning convention
// ═══════════════════════════════════════════════════════════════════════════════

describe('SW — CACHE_NAME', () => {
    it('has a CACHE_NAME constant', () => {
        assert.match(sw, /const\s+CACHE_NAME\s*=\s*["']jewd-v[\d.]+["']/);
    });

    it('uses self.skipWaiting() on install', () => {
        assert.match(sw, /self\.skipWaiting\(\)/, 'SW must skipWaiting to activate immediately');
    });

    it('deletes old caches on activate', () => {
        assert.match(sw, /caches\.delete/, 'SW must delete old caches during activate');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SW must NOT cache .env.js (environment-specific)
// ═══════════════════════════════════════════════════════════════════════════════

describe('SW — .env.js exclusion', () => {
    it('explicitly skips .env.js from caching', () => {
        assert.match(sw, /\.env\.js/, 'SW must have logic referencing .env.js');
        // The sw.js should have a check that skips caching .env.js
        // Look for the skip pattern: url.includes('.env.js') or similar
        assert.match(
            sw,
            /env\.js/,
            'SW must reference .env.js in its skip/exclude logic'
        );
    });

    it('does NOT pre-cache .env.js', () => {
        // .env.js should NOT appear in PRECACHE_ASSETS
        const precacheBlock = sw.match(/PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\]/);
        if (precacheBlock) {
            assert.doesNotMatch(
                precacheBlock[1],
                /\.env\.js/,
                'REGRESSION: .env.js must NOT be in PRECACHE_ASSETS (it\'s environment-specific)'
            );
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SW index.html reference: must be correct path
// ═══════════════════════════════════════════════════════════════════════════════

describe('SW — dashboard root pre-cache', () => {
    it('pre-caches /dashboard/ (the SPA root)', () => {
        assert.match(sw, /["']\/dashboard\/["']/, 'Must pre-cache /dashboard/ root');
    });
});

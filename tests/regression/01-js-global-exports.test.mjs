/**
 * 01 — JS Global Exports Regression Tests
 *
 * WHAT THIS PREVENTS:
 * On 2026-02-27, a ReferenceError "openLightbox is not defined" in products.js
 * crashed the ENTIRE dashboard bundle before the login form's submit handler
 * was registered. This meant clicking "Login" did a standard GET form submit
 * (credentials in URL!) instead of the async POST. Login was 100% broken.
 *
 * ROOT CAUSE: products.js line ~2428 had `J.openLightbox = openLightbox` but
 * the function was actually named `showLightbox`. A typo during modularization.
 *
 * LESSON: Every JS module's public exports MUST reference actually-defined
 * functions. One bad reference crashes the entire global-scope IIFE chain.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readDashFile } from './helpers.mjs';

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESSION: products.js — openLightbox must reference showLightbox
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION #1: products.js global exports', () => {
    const src = readDashFile('js/products.js');

    it('showLightbox() function is defined', () => {
        assert.match(src, /function\s+showLightbox\s*\(/, 'showLightbox function must exist');
    });

    it('J.openLightbox references showLightbox (NOT a non-existent function)', () => {
        // The critical fix: must be `J.openLightbox = showLightbox`
        assert.match(
            src,
            /J\.openLightbox\s*=\s*showLightbox/,
            'J.openLightbox must equal showLightbox — NOT openLightbox (was ReferenceError)'
        );
    });

    it('does NOT have J.openLightbox = openLightbox (the old broken code)', () => {
        assert.doesNotMatch(
            src,
            /J\.openLightbox\s*=\s*openLightbox\b/,
            'REGRESSION: J.openLightbox = openLightbox would cause ReferenceError'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC: Every IIFE module's public exports must reference defined functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * For each JS module that uses the IIFE pattern `(function(J) { ... })(window.Jewd...)`,
 * extract all `J.xxx = yyy` assignments and verify that `yyy` is either:
 *   - A function defined in the same file: `function yyy(` or `const yyy =`
 *   - A literal value: string, number, boolean, object, array, arrow function
 *   - A reference to another module: `window.JewdXxx`
 */
const jsModules = [
    'js/products.js',
    'js/orders.js',
    'js/reports.js',
    'js/settings.js',
    'js/metals.js',
    'js/users.js',
    'js/pos.js',
    'js/core.js',
    'js/ui-helpers.js',
];

for (const mod of jsModules) {
    describe(`${mod} — all public exports reference defined symbols`, () => {
        let src;
        try {
            src = readDashFile(mod);
        } catch {
            it(`${mod} not found — skipping`, { skip: true }, () => {});
            return;
        }

        // Find all J.xxx = yyy patterns
        const exportPattern = /J\.(\w+)\s*=\s*(\w+)\s*[;,]/g;
        const matches = [...src.matchAll(exportPattern)];

        if (matches.length === 0) {
            it('has no J.xxx exports (OK)', () => assert.ok(true));
            return;
        }

        for (const [, propName, value] of matches) {
            // Skip if value is a keyword (true/false/null/undefined/this)
            if (['true', 'false', 'null', 'undefined', 'this', 'window'].includes(value)) continue;
            // Skip if value is clearly a number-like identifier
            if (/^\d+$/.test(value)) continue;

            it(`J.${propName} = ${value} → ${value} must be defined in ${mod}`, () => {
                // Check: function yyy(  OR  const/let/var yyy  OR  async function yyy
                const defPattern = new RegExp(
                    `(?:(?:async\\s+)?function\\s+${value}\\s*\\()|` +
                    `(?:(?:const|let|var)\\s+${value}\\s*[=,;])|` +
                    `(?:class\\s+${value}\\b)`,
                );
                assert.match(
                    src,
                    defPattern,
                    `REGRESSION RISK: J.${propName} = ${value} but '${value}' is not defined in ${mod}. ` +
                    `This will cause ReferenceError at runtime, crashing the dashboard.`
                );
            });
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auth + App: Login form binding must not be blocked by upstream errors
// ═══════════════════════════════════════════════════════════════════════════════

describe('app.js — login form binding', () => {
    const src = readDashFile('js/app.js');

    it('binds loginForm submit event listener', () => {
        assert.match(src, /loginForm.*addEventListener.*submit|addEventListener.*submit.*loginForm/s);
    });

    it('calls preventDefault on login submit', () => {
        assert.match(src, /preventDefault/);
    });
});

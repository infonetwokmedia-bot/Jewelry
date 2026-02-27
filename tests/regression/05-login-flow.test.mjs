/**
 * 05 — Login Flow Integrity Regression Tests
 *
 * WHAT THIS PREVENTS:
 * On 2026-02-27, the login form in the dashboard was entirely non-functional
 * because a JS error in products.js (loaded before app.js) crashed the execution
 * chain. The form's submit handler was never registered, so clicking "Login"
 * did a standard HTML form GET submission. This caused:
 *   - Credentials visible in the URL bar (?username=xxx&password=yyy)
 *   - No actual authentication (no POST to /jewd/v1/auth/login)
 *   - Infinite loop: page reloads → shows login → click → page reloads
 *
 * LESSON: The login form must always bind its submit handler, and the auth
 * endpoint must handle authentication correctly. Verify the entire chain:
 * HTML form → JS handler → API endpoint → PHP auth.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readDashFile } from './helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════════
// HTML: Login form structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Login HTML structure', () => {
    const html = readDashFile('index.html');

    it('has loginForm form element', () => {
        assert.match(html, /id="loginForm"/, 'Login form must have id="loginForm"');
    });

    it('has username input field', () => {
        assert.match(html, /id="loginUsername"/, 'Must have username input');
    });

    it('has password input field', () => {
        assert.match(html, /id="loginPassword"/, 'Must have password input');
    });

    it('form does NOT have action attribute (must be handled by JS)', () => {
        // If the form has an action, it would do a server-side submit
        const formTag = html.match(/<form[^>]*id="loginForm"[^>]*>/);
        if (formTag) {
            assert.doesNotMatch(
                formTag[0],
                /action="/,
                'Login form must NOT have action attribute — JS handles submit'
            );
        }
    });

    it('form does NOT have method="get" (credentials in URL!)', () => {
        const formTag = html.match(/<form[^>]*id="loginForm"[^>]*>/);
        if (formTag) {
            assert.doesNotMatch(
                formTag[0],
                /method="get"/i,
                'Login form must NOT use method="get" — would expose credentials in URL'
            );
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JS: Auth module login function
// ═══════════════════════════════════════════════════════════════════════════════

describe('auth.js — login function', () => {
    const src = readDashFile('js/auth.js');

    it('has a login function', () => {
        assert.match(src, /function\s+login\s*\(|login\s*[:=]\s*(async\s+)?function/);
    });

    it('posts to auth/login endpoint', () => {
        assert.match(src, /auth\/login/);
    });

    it('uses POST method (not GET)', () => {
        assert.match(src, /method.*POST|POST.*method/i);
    });

    it('sends JSON body', () => {
        assert.match(src, /Content-Type.*application\/json|JSON\.stringify/);
    });

    it('stores token on success', () => {
        assert.match(src, /localStorage|sessionStorage|token/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHP: Auth endpoint exists and handles POST
// ═══════════════════════════════════════════════════════════════════════════════

describe('jewelry-auth.php — login endpoint', () => {
    const muDir = join(__dirname, '..', '..', 'data', 'wordpress', 'wp-content', 'mu-plugins');
    const authFile = join(muDir, 'jewelry-auth.php');

    it('jewelry-auth.php exists', () => {
        assert.ok(existsSync(authFile), 'jewelry-auth.php must exist in mu-plugins');
    });

    it('registers jewd/v1/auth/login REST route', () => {
        const php = readFileSync(authFile, 'utf8');
        assert.match(php, /auth\/login/, 'Must register auth/login endpoint');
    });

    it('uses wp_authenticate()', () => {
        const php = readFileSync(authFile, 'utf8');
        assert.match(php, /wp_authenticate/, 'Must use WordPress authentication');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CRITICAL: No JS file loaded before app.js should crash the global scope
// ═══════════════════════════════════════════════════════════════════════════════

describe('JS load order — no undefined references in pre-app modules', () => {
    // These modules load BEFORE app.js. If any of them crash,
    // app.js never executes, and the login handler is never bound.
    const preAppModules = [
        'js/auth.js', 'js/api.js', 'js/core.js', 'js/ui-helpers.js',
        'js/products.js', 'js/orders.js', 'js/reports.js', 'js/settings.js',
        'js/metals.js', 'js/users.js', 'js/pos.js',
    ];

    for (const mod of preAppModules) {
        it(`${mod} — no assignment of undefined-in-file function to window/J`, () => {
            const src = readDashFile(mod);
            // Find all Module.xxx = identifier patterns
            const assigns = [...src.matchAll(/(?:J|window\.\w+)\.(\w+)\s*=\s*([a-zA-Z_]\w*)\s*[;,]/g)];

            for (const [full, prop, value] of assigns) {
                // Skip known safe patterns
                if (['true', 'false', 'null', 'undefined', 'this', 'window', 'document'].includes(value)) continue;

                // Check if `value` is defined in the same file
                const defRegex = new RegExp(
                    `(?:function\\s+${value}\\s*\\()|` +
                    `(?:(?:const|let|var)\\s+${value}\\b)|` +
                    `(?:class\\s+${value}\\b)|` +
                    `(?:async\\s+function\\s+${value}\\s*\\()`,
                );

                assert.match(
                    src,
                    defRegex,
                    `REGRESSION RISK in ${mod}: '${value}' assigned to public export ` +
                    `but not defined in this file. Will cause ReferenceError, ` +
                    `preventing login form binding.`
                );
            }
        });
    }
});

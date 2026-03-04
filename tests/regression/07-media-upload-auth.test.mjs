/**
 * 07 — Media Upload Authentication Regression Tests
 *
 * WHAT THIS PREVENTS:
 * POST /jewd/v1/media returns 401 for ALL dashboard users because the
 * permission_callback `jewd_media_permission_check()` never authenticates
 * the JWT token — it only checks WC API keys (not sent) and falls back to
 * `current_user_can('upload_files')` which is always false because no user
 * context is set for JWT-authenticated REST requests.
 *
 * ROOT CAUSE:
 * - `jewd_media_permission_check()` in jewelry-dashboard.php did NOT call
 *   `jewelry_authenticate_dashboard_token()` to extract the user from JWT.
 * - It used `current_user_can()` instead of `user_can($user, ...)`.
 * - The `jewelry_seller` role lacked the `upload_files` capability.
 *
 * RELATED FILES:
 * - data/wordpress/wp-content/plugins/jewelry-dashboard/jewelry-dashboard.php
 * - data/wordpress/wp-content/mu-plugins/jewelry-auth.php
 * - data/wordpress/wp-content/mu-plugins/jewelry-roles.php
 * - dashboard/js/api.js (uploadImage, deleteImage)
 *
 * PATTERN REFERENCE (correct implementation):
 * - jewelry-api-users.php → jewelry_api_can_manage_users()
 * - jewelry-dashboard.php → /stats permission_callback (lines 121-140)
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const PLUGIN = join(ROOT, 'data', 'wordpress', 'wp-content', 'plugins',
    'jewelry-dashboard', 'jewelry-dashboard.php');
const MU_ROLES = join(ROOT, 'data', 'wordpress', 'wp-content', 'mu-plugins',
    'jewelry-roles.php');
const API_JS = join(ROOT, 'dashboard', 'js', 'api.js');

const readPlugin = () => readFileSync(PLUGIN, 'utf8');
const readRoles  = () => readFileSync(MU_ROLES, 'utf8');
const readApiJs  = () => readFileSync(API_JS, 'utf8');

// ═══════════════════════════════════════════════════════════════════════════════
// PHP: jewd_media_permission_check() must authenticate JWT
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION: jewd_media_permission_check() authenticates JWT', () => {
    const php = readPlugin();

    it('plugin file exists', () => {
        assert.ok(existsSync(PLUGIN), 'jewelry-dashboard.php must exist');
    });

    it('calls jewelry_authenticate_dashboard_token()', () => {
        // Extract the permission check function body
        const fnStart = php.indexOf('function jewd_media_permission_check()');
        assert.ok(fnStart !== -1, 'jewd_media_permission_check function must exist');

        // Get the function body (up to next function or 500 chars)
        const fnBody = php.slice(fnStart, fnStart + 800);

        assert.match(
            fnBody,
            /jewelry_authenticate_dashboard_token\s*\(/,
            'jewd_media_permission_check MUST call jewelry_authenticate_dashboard_token() for JWT auth'
        );
    });

    it('uses user_can($user, ...) NOT current_user_can()', () => {
        const fnStart = php.indexOf('function jewd_media_permission_check()');
        const fnBody = php.slice(fnStart, fnStart + 800);

        // Must use user_can with explicit user object
        assert.match(
            fnBody,
            /user_can\s*\(\s*\$user/,
            'Must use user_can($user, ...) to check capabilities with the authenticated user'
        );

        // Must NOT use current_user_can as sole fallback (footgun: always false for JWT)
        // It's OK if current_user_can exists as a final cookie-session fallback,
        // but jewelry_authenticate_dashboard_token MUST come first.
        const jwtCallPos = fnBody.indexOf('jewelry_authenticate_dashboard_token');
        const currentUserPos = fnBody.indexOf('current_user_can');

        if (currentUserPos !== -1 && jwtCallPos !== -1) {
            assert.ok(
                jwtCallPos < currentUserPos,
                'JWT auth must be checked BEFORE current_user_can fallback'
            );
        }
    });

    it('falls back to WC API key authentication', () => {
        const fnStart = php.indexOf('function jewd_media_permission_check()');
        const fnBody = php.slice(fnStart, fnStart + 800);

        assert.match(
            fnBody,
            /jewelry_authenticate_api_request\s*\(|jewd_validate_wc_keys\s*\(/,
            'Must support WC API key auth as fallback (jewelry_authenticate_api_request or jewd_validate_wc_keys)'
        );
    });

    it('checks upload_files capability specifically', () => {
        const fnStart = php.indexOf('function jewd_media_permission_check()');
        const fnBody = php.slice(fnStart, fnStart + 800);

        assert.match(
            fnBody,
            /upload_files/,
            'Must check upload_files capability for media operations'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHP: jewelry_seller role must have upload_files capability
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION: jewelry_seller has upload_files capability', () => {
    const roles = readRoles();

    it('jewelry-roles.php exists', () => {
        assert.ok(existsSync(MU_ROLES), 'jewelry-roles.php must exist');
    });

    it('jewelry_seller role definition includes upload_files', () => {
        // Find the add_role call for jewelry_seller (not the guard/get_role call)
        const addRoleStart = roles.indexOf("add_role(\n        'jewelry_seller'");
        if (addRoleStart === -1) {
            // Alternate format: add_role with different spacing
            const altStart = roles.indexOf("add_role(");
            const sellerAddRole = roles.indexOf("'jewelry_seller'", altStart);
            assert.ok(sellerAddRole !== -1, 'jewelry_seller must be in an add_role() call');
            const block = roles.slice(sellerAddRole, sellerAddRole + 1500);
            assert.match(
                block,
                /'upload_files'\s*=>\s*true/,
                'jewelry_seller MUST have upload_files => true to allow image uploads in POS and product creation'
            );
            return;
        }

        // Get the capability array (up to the closing paren of add_role)
        const sellerBlock = roles.slice(addRoleStart, addRoleStart + 1500);

        assert.match(
            sellerBlock,
            /'upload_files'\s*=>\s*true/,
            'jewelry_seller MUST have upload_files => true to allow image uploads in POS and product creation'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JS: uploadImage() sends JWT auth headers
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION: JS uploadImage sends JWT auth', () => {
    const js = readApiJs();

    it('uploadImage function exists', () => {
        assert.match(js, /async\s+function\s+uploadImage/, 'uploadImage must be defined');
    });

    it('uploadImage sends JWT via jwtAuthHeaders()', () => {
        // Extract uploadImage function
        const fnStart = js.indexOf('async function uploadImage');
        assert.ok(fnStart !== -1);
        const fnBody = js.slice(fnStart, fnStart + 500);

        assert.match(
            fnBody,
            /jwtAuthHeaders\s*\(\)/,
            'uploadImage must send JWT auth via jwtAuthHeaders()'
        );
    });

    it('uploadImage does NOT set Content-Type (browser handles multipart boundary)', () => {
        const fnStart = js.indexOf('async function uploadImage');
        const fnBody = js.slice(fnStart, fnStart + 500);

        // Should NOT have Content-Type in the headers for this function
        assert.doesNotMatch(
            fnBody,
            /["']Content-Type["']/,
            'uploadImage must NOT set Content-Type — browser auto-sets multipart boundary'
        );
    });

    it('deleteImage function exists and sends auth', () => {
        assert.match(js, /async\s+function\s+deleteImage/, 'deleteImage must be defined');

        const fnStart = js.indexOf('async function deleteImage');
        const fnBody = js.slice(fnStart, fnStart + 500);

        assert.match(
            fnBody,
            /jwtAuthHeaders\s*\(\)/,
            'deleteImage must send JWT auth via jwtAuthHeaders()'
        );
    });
});

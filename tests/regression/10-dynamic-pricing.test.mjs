/**
 * 10 — Dynamic Pricing Regression Tests
 *
 * WHAT THIS PREVENTS:
 * Ensures the dynamic metal-weight-based pricing feature is properly
 * integrated across: PHP mu-plugin, REST API, dashboard products.js,
 * and POS getProductPrice().
 *
 * Checks:
 * 1. mu-plugin exists and has all required functions
 * 2. products.js has pricing mode toggle UI and sends jewelry_pricing payload
 * 3. pos.js getProductPrice reads jewelry_pricing.calculated_price
 * 4. api.js exposes dynamic pricing endpoints
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readDashFile, readMuPlugin } from './helpers.mjs';

// ═══════════════════════════════════════════════════════════════════════════════
// PHP MU-PLUGIN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dynamic Pricing — PHP mu-plugin', () => {
    const php = readMuPlugin('jewelry-dynamic-pricing.php');

    it('defines JEWD_METAL_TYPES constant', () => {
        assert.match(php, /define\(\s*'JEWD_METAL_TYPES'/, 'JEWD_METAL_TYPES constant must exist');
    });

    it('registers pricing meta fields', () => {
        assert.match(php, /register_post_meta.*product.*_jewelry_pricing_mode/s, 'Must register _jewelry_pricing_mode');
    });

    it('has jewelry_calculate_dynamic_price function', () => {
        assert.match(php, /function\s+jewelry_calculate_dynamic_price\s*\(/, 'Calculate function must exist');
    });

    it('has jewelry_get_metal_price_per_gram function', () => {
        assert.match(php, /function\s+jewelry_get_metal_price_per_gram\s*\(/, 'Price per gram function must exist');
    });

    it('hooks into woocommerce_product_get_price filter', () => {
        assert.match(php, /add_filter.*woocommerce_product_get_price.*jewelry_dynamic_price_filter/, 'Must hook into WC price filter');
    });

    it('registers REST API routes under jewd/v1/pricing/', () => {
        assert.match(php, /pricing\/metal-types/, 'metal-types endpoint must exist');
        assert.match(php, /pricing\/calculate/, 'calculate endpoint must exist');
        assert.match(php, /pricing\/sync/, 'sync endpoint must exist');
    });

    it('has recursion guard in price filter', () => {
        assert.match(php, /jewd_price_filter_active/, 'Must have recursion guard variable');
    });

    it('has cron schedule for price sync', () => {
        assert.match(php, /jewelry_cron_sync_dynamic_prices/, 'Cron event name must exist');
        assert.match(php, /jewelry_sync_all_dynamic_prices/, 'Sync function must exist');
    });

    it('supports all expected metal types', () => {
        const expectedTypes = ['gold_24k', 'gold_22k', 'gold_18k', 'gold_14k', 'gold_10k', 'silver_999', 'silver_925'];
        for (const type of expectedTypes) {
            assert.match(php, new RegExp(`'${type}'`), `Metal type ${type} must be defined`);
        }
    });

    it('sanitizes all inputs', () => {
        assert.match(php, /function\s+jewelry_sanitize_pricing_mode/, 'Must sanitize pricing mode');
        assert.match(php, /function\s+jewelry_sanitize_metal_type/, 'Must sanitize metal type');
        assert.match(php, /function\s+jewelry_sanitize_metal_weight/, 'Must sanitize metal weight');
        assert.match(php, /function\s+jewelry_sanitize_markup_pct/, 'Must sanitize markup pct');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — products.js
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dynamic Pricing — products.js UI integration', () => {
    const src = readDashFile('js/products.js');

    it('has pricing mode select in edit modal', () => {
        assert.match(src, /editPricingMode/, 'Pricing mode select (editPricingMode) must exist');
    });

    it('has metal type select', () => {
        assert.match(src, /editMetalType/, 'Metal type select must exist');
    });

    it('has metal weight input', () => {
        assert.match(src, /editMetalWeight/, 'Metal weight input must exist');
    });

    it('has markup percentage input', () => {
        assert.match(src, /editMarkupPct/, 'Markup pct input must exist');
    });

    it('reads jewelry_pricing from product response', () => {
        assert.match(src, /jewelry_pricing/, 'Must reference jewelry_pricing from API response');
    });

    it('sends jewelry_pricing in save payload', () => {
        assert.match(src, /payload\.jewelry_pricing/, 'Must send jewelry_pricing in update payload');
    });

    it('has initDynamicPricingHandlers function', () => {
        assert.match(src, /function\s+initDynamicPricingHandlers/, 'Handler init function must exist');
    });

    it('toggles fixed/dynamic fields visibility', () => {
        assert.match(src, /editDynamicPricingFields/, 'Dynamic fields container must exist');
        assert.match(src, /editFixedPriceFields/, 'Fixed fields container must exist');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD — api.js
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dynamic Pricing — api.js endpoints', () => {
    const src = readDashFile('js/api.js');

    it('has getMetalTypes function', () => {
        assert.match(src, /function\s+getMetalTypes/, 'getMetalTypes must be defined');
    });

    it('has calculateDynamicPrice function', () => {
        assert.match(src, /function\s+calculateDynamicPrice/, 'calculateDynamicPrice must be defined');
    });

    it('has syncDynamicPrices function', () => {
        assert.match(src, /function\s+syncDynamicPrices/, 'syncDynamicPrices must be defined');
    });

    it('exports pricing functions in public API', () => {
        assert.match(src, /getMetalTypes,/, 'getMetalTypes must be exported');
        assert.match(src, /calculateDynamicPrice,/, 'calculateDynamicPrice must be exported');
        assert.match(src, /syncDynamicPrices,/, 'syncDynamicPrices must be exported');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POS — getProductPrice
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dynamic Pricing — POS integration', () => {
    const src = readDashFile('js/pos.js');

    it('getProductPrice checks jewelry_pricing before fixed price', () => {
        assert.match(src, /jewelry_pricing/, 'POS must reference jewelry_pricing');
        assert.match(src, /calculated_price/, 'POS must use calculated_price from jewelry_pricing');
    });

    it('getProductPrice still falls back to sale_price / price / regular_price', () => {
        assert.match(src, /sale_price/, 'Must still check sale_price as fallback');
        assert.match(src, /regular_price/, 'Must still check regular_price as fallback');
    });
});

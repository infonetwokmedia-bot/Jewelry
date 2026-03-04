/**
 * 06 — Modal Close Protection Regression Tests
 *
 * WHAT THIS PREVENTS:
 * Multiple modals close on backdrop click (or Escape) without any dirty-form
 * protection, causing users to lose unsaved data (user forms, payment data,
 * custom prices, order notes).
 *
 * ISSUES: #69, #70, #71, #72, #73, #74
 *
 * COVERED:
 * - #userModal: dirty detection + closeModal(force) pattern + Escape handler
 * - POS Payment Modal: backdrop click disabled, confirm before closing
 * - POS Price Editor: backdrop click disabled, confirm before closing
 * - #orderDetailModal: notes textarea check before closing
 * - Escape key: skips userModal (handled by users.js own handler)
 * - z-index: confirm overlay above all modals
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readDashFile } from './helpers.mjs';

// ═══════════════════════════════════════════════════════════════════════════════
// #73 + #72: userModal — dirty detection, closeModal(force), Escape handler
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION #73: userModal dirty-form protection', () => {
    const src = readDashFile('js/users.js');

    it('has _formDirty tracking variable', () => {
        assert.match(src, /let\s+_formDirty\s*=/, '_formDirty must be declared');
    });

    it('has _closingModal re-entrancy guard', () => {
        assert.match(src, /let\s+_closingModal\s*=/, '_closingModal must be declared');
    });

    it('closeModal accepts force parameter', () => {
        assert.match(
            src,
            /async\s+function\s+closeModal\s*\(\s*force\s*\)/,
            'closeModal must accept force parameter'
        );
    });

    it('closeModal checks _formDirty before closing', () => {
        assert.match(src, /_formDirty/, 'closeModal must reference _formDirty');
        assert.match(src, /showConfirm/, 'closeModal must use showConfirm for dirty warning');
    });

    it('resets _formDirty on modal open (create)', () => {
        // openCreateModal should set _formDirty = false
        const createSection = src.slice(
            src.indexOf('function openCreateModal'),
            src.indexOf('function openEditModal')
        );
        assert.match(createSection, /_formDirty\s*=\s*false/, 'openCreateModal must reset _formDirty');
    });

    it('resets _formDirty on modal open (edit)', () => {
        const editSection = src.slice(
            src.indexOf('function openEditModal'),
            src.indexOf('function _trackDirty') !== -1 ? src.indexOf('function _trackDirty') : src.indexOf('async function closeModal')
        );
        assert.match(editSection, /_formDirty\s*=\s*false/, 'openEditModal must reset _formDirty');
    });

    it('has _trackDirty function to attach input listeners', () => {
        assert.match(src, /function\s+_trackDirty/, '_trackDirty function must exist');
    });

    it('resets _formDirty after successful save', () => {
        assert.match(src, /_formDirty\s*=\s*false;\s*\/\/\s*Reset dirty/, 'Must reset _formDirty after save');
    });

    it('calls closeModal(true) after successful edit save (skip dirty check)', () => {
        assert.match(src, /closeModal\s*\(\s*true\s*\)/, 'Must call closeModal(true) after save');
    });
});

describe('REGRESSION #72: userModal Escape handler', () => {
    const src = readDashFile('js/users.js');

    it('registers its own Escape key handler', () => {
        assert.match(src, /keydown/, 'users.js must listen for keydown');
        assert.match(src, /Escape/, 'users.js must handle Escape key');
    });

    it('Escape handler calls closeModal(false) — not force', () => {
        // The Escape handler in users.js should call closeModal(false) to trigger dirty check
        assert.match(
            src,
            /closeModal\s*\(\s*false\s*\)/,
            'Escape handler must call closeModal(false)'
        );
    });

    it('Escape handler checks for confirm overlay before acting', () => {
        assert.match(
            src,
            /jewd-confirm-overlay/,
            'Escape handler must check for open confirm dialogs'
        );
    });
});

describe('REGRESSION #72: app.js Escape skips userModal', () => {
    const src = readDashFile('js/app.js');

    it('global Escape handler skips if userModal is active', () => {
        assert.match(
            src,
            /userModal.*classList\.contains.*active.*return/s,
            'Global Escape must skip if userModal is active (handled by users.js)'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// #69: POS Payment Modal — backdrop click protection
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION #69: POS Payment Modal protection', () => {
    const src = readDashFile('js/pos.js');

    it('has hasPaymentData() check function', () => {
        assert.match(src, /function\s+hasPaymentData/, 'hasPaymentData must exist');
    });

    it('has confirmClosePayment() with confirm dialog', () => {
        assert.match(src, /function\s+confirmClosePayment/, 'confirmClosePayment must exist');
        assert.match(src, /confirmClosePayment/, 'Close buttons must use confirmClosePayment');
    });

    it('backdrop click does NOT call overlay.remove() directly', () => {
        // Find the backdrop handler in the payment modal area
        const paymentSection = src.slice(
            src.indexOf('bindPaymentModal'),
            src.indexOf('function closePaymentModal')
        );
        // The backdrop click should have a no-op comment, not overlay.remove()
        assert.match(
            paymentSection,
            /if\s*\(\s*e\.target\s*===\s*overlay\s*\)\s*\{\s*\/\*.*no-op/,
            'Backdrop click must be a no-op in payment modal'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// #70: POS Price Editor — backdrop click protection
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION #70: POS Price Editor protection', () => {
    const src = readDashFile('js/pos.js');

    it('has priceChanged() check function', () => {
        assert.match(src, /function\s+priceChanged/, 'priceChanged must exist');
    });

    it('has confirmClosePrice() with confirm dialog', () => {
        assert.match(src, /function\s+confirmClosePrice/, 'confirmClosePrice must exist');
    });

    it('Escape key in price editor calls confirmClosePrice (not overlay.remove)', () => {
        const priceSection = src.slice(
            src.indexOf('function showPriceEditor'),
            src.indexOf('// ── Totals') !== -1 ? src.indexOf('// ── Totals') : src.indexOf('function calcSubtotal')
        );
        assert.match(
            priceSection,
            /Escape.*confirmClosePrice/s,
            'Escape in price editor must call confirmClosePrice'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// #71: orderDetailModal — notes textarea protection
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION #71: orderDetailModal notes protection', () => {
    const src = readDashFile('js/app.js');

    it('has safeCloseOrderDetail() function', () => {
        assert.match(src, /function\s+safeCloseOrderDetail/, 'safeCloseOrderDetail must exist');
    });

    it('safeCloseOrderDetail checks orderNoteInput value', () => {
        assert.match(
            src,
            /orderNoteInput.*value.*trim/s,
            'safeCloseOrderDetail must check if notes textarea has content'
        );
    });

    it('backdrop click uses safeCloseOrderDetail (not closeOrderDetailModal)', () => {
        // The backdrop click handler for orderDetailModal should call safeCloseOrderDetail
        assert.match(
            src,
            /orderDetailModal\).*safeCloseOrderDetail/s,
            'orderDetailModal backdrop must use safeCloseOrderDetail'
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// #74: z-index standardization
// ═══════════════════════════════════════════════════════════════════════════════

describe('REGRESSION #74: z-index confirm overlay', () => {
    const css = readDashFile('css/dashboard.css');

    it('confirm overlay z-index is higher than 500000 (modal base)', () => {
        const match = css.match(/\.jewd-confirm-overlay[\s\S]*?z-index:\s*(\d+)/);
        assert.ok(match, '.jewd-confirm-overlay must have z-index');
        const zIndex = parseInt(match[1], 10);
        assert.ok(zIndex > 500000, `z-index (${zIndex}) must be > 500000 to sit above modals`);
    });
});

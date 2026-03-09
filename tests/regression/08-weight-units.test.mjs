/**
 * 08 — Weight Unit Labels (grams)
 *
 * REG-008: All product weight references in the dashboard must use grams (g).
 * WooCommerce is configured with woocommerce_weight_unit = "g".
 *
 * Prevents regression to "oz" or unlabeled weight fields.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

const productsJs = readFileSync(resolve(root, 'dashboard/js/products.js'), 'utf-8');
const indexHtml  = readFileSync(resolve(root, 'dashboard/index.html'), 'utf-8');

describe('08 — Weight Unit Labels', () => {

  // ── No references to "oz" in weight labels ──────────────────────
  it('products.js must NOT contain "Peso (oz)"', () => {
    assert.ok(
      !productsJs.includes('Peso (oz)'),
      'Found "Peso (oz)" in products.js — must be "Peso (g)"'
    );
  });

  it('index.html must NOT contain weight label "Peso (oz)"', () => {
    assert.ok(
      !indexHtml.includes('Peso (oz)'),
      'Found "Peso (oz)" in index.html — must be "Peso (g)"'
    );
  });

  // ── Edit form and wizard use "Peso (g)" ─────────────────────────
  it('edit form label must be "Peso (g)"', () => {
    assert.ok(
      productsJs.includes('Peso (g)</label>'),
      'Edit form must have a label with "Peso (g)"'
    );
  });

  it('wizard label must be "Peso (g)"', () => {
    assert.ok(
      productsJs.includes('Peso (g)</label>'),
      'Wizard must have a <label> ending with "Peso (g)</label>"'
    );
  });

  // ── Table headers include "(g)" ──────────────────────────────────
  it('index.html product table header must say "Peso (g)"', () => {
    assert.ok(
      indexHtml.includes('>Peso (g)<'),
      'Product table header in index.html must be "Peso (g)"'
    );
  });

  it('detail view variation table header must include "(g)"', () => {
    assert.match(
      productsJs,
      /Peso \(g\)<\/th><\/tr><\/thead><tbody>/,
      'Detail variation table header should include "Peso (g)"'
    );
  });

  // ── Weight cells display "g" suffix ──────────────────────────────
  it('catalog table cell must append " g" to weight value', () => {
    assert.ok(
      productsJs.includes('+ " g" : "—"'),
      'Product table cell should show weight + " g" or "—"'
    );
  });

  it('detail view weight field must append " g"', () => {
    assert.ok(
      productsJs.includes('p.weight + " g"'),
      'Detail view detailField should show weight + " g"'
    );
  });

  // ── CSV export header ────────────────────────────────────────────
  it('CSV export header must be "Peso (g)"', () => {
    assert.ok(
      productsJs.includes('"Peso (g)"'),
      'CSV export header column must be "Peso (g)", not just "Peso"'
    );
  });

  // ── No "ounce" or "onza" references in product UI ────────────────
  it('products.js must NOT mention ounce/onza in UI labels', () => {
    // Check for whole-word occurrences only (avoid matching "debounce" etc.)
    const ounceUI = /\bounce\b/i.test(productsJs);
    const onzaUI  = /\bonza\b/i.test(productsJs);
    assert.ok(!ounceUI, 'Found standalone "ounce" in products.js');
    assert.ok(!onzaUI, 'Found standalone "onza" in products.js');
  });
});

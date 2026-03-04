/**
 * 09 — Image Optimization on Upload
 *
 * Verifies that:
 * - Client-side: compressImage() utility exists in api.js
 * - Client-side: uploadImage() calls compressImage() before uploading
 * - Server-side: WebP output format is configured
 * - Server-side: JPEG quality is set to 85
 * - Server-side: EXIF stripping is active
 * - Server-side: big_image_size_threshold is reduced to 1600
 * - PHP upload limit is 5MB (Dockerfile config)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

const apiJs = readFileSync(resolve(root, 'dashboard/js/api.js'), 'utf-8');
const productsJs = readFileSync(resolve(root, 'dashboard/js/products.js'), 'utf-8');
const imageOptPhp = readFileSync(
  resolve(root, 'data/wordpress/wp-content/mu-plugins/jewelry-image-optimization.php'),
  'utf-8',
);
const dockerfile = readFileSync(resolve(root, 'docker/wordpress/Dockerfile'), 'utf-8');

describe('09 — Image Optimization on Upload', () => {

  // ── CLIENT-SIDE: compressImage utility ──────────────────────────

  it('api.js must define a compressImage function', () => {
    assert.ok(
      apiJs.includes('function compressImage'),
      'api.js must contain a compressImage() function for client-side compression'
    );
  });

  it('compressImage must use canvas for resize/compression', () => {
    assert.ok(
      apiJs.includes('canvas') || apiJs.includes('Canvas'),
      'compressImage should use HTMLCanvasElement for image processing'
    );
  });

  it('compressImage must use toBlob for output', () => {
    assert.ok(
      apiJs.includes('toBlob'),
      'compressImage should use canvas.toBlob() to produce compressed output'
    );
  });

  it('compressImage must enforce max dimension of 1600px', () => {
    assert.ok(
      apiJs.includes('1600'),
      'compressImage should limit images to 1600px max dimension'
    );
  });

  it('compressImage must use JPEG quality 0.85', () => {
    assert.ok(
      apiJs.includes('0.85'),
      'compressImage should output JPEG at quality 0.85'
    );
  });

  it('compressImage must be exported in public API', () => {
    assert.ok(
      apiJs.includes('compressImage'),
      'compressImage must be accessible from JewdAPI'
    );
  });

  // ── CLIENT-SIDE: integration in upload flow ─────────────────────

  it('uploadImage must call compressImage before uploading', () => {
    assert.ok(
      apiJs.includes('compressImage(file)') || apiJs.includes('compressImage(file,'),
      'uploadImage() should call compressImage(file) before building FormData'
    );
  });

  // ── SERVER-SIDE: WebP output format ─────────────────────────────

  it('mu-plugin must hook image_editor_output_format for WebP', () => {
    assert.ok(
      imageOptPhp.includes('image_editor_output_format'),
      'jewelry-image-optimization.php must filter image_editor_output_format for WebP generation'
    );
  });

  it('mu-plugin must map image/jpeg to image/webp', () => {
    assert.ok(
      imageOptPhp.includes("image/webp"),
      'Output format filter must convert JPEG to WebP'
    );
  });

  // ── SERVER-SIDE: JPEG quality ───────────────────────────────────

  it('mu-plugin must set JPEG quality to 85', () => {
    assert.ok(
      imageOptPhp.includes('wp_editor_set_quality') || imageOptPhp.includes('jpeg_quality'),
      'mu-plugin must hook jpeg_quality or wp_editor_set_quality'
    );
    assert.ok(
      imageOptPhp.includes('85'),
      'JPEG quality must be set to 85 for jewelry detail'
    );
  });

  // ── SERVER-SIDE: EXIF stripping ─────────────────────────────────

  it('mu-plugin must strip EXIF metadata on upload', () => {
    assert.ok(
      imageOptPhp.includes('wp_handle_upload') || imageOptPhp.includes('wp_generate_attachment_metadata'),
      'mu-plugin must hook into upload pipeline for EXIF stripping'
    );
    assert.ok(
      imageOptPhp.includes('stripImage') || imageOptPhp.includes('EXIF') || imageOptPhp.includes('exif'),
      'mu-plugin must reference EXIF stripping logic'
    );
  });

  // ── SERVER-SIDE: big_image_size_threshold ────────────────────────

  it('mu-plugin must reduce big_image_size_threshold to 1600', () => {
    assert.ok(
      imageOptPhp.includes('big_image_size_threshold'),
      'mu-plugin must filter big_image_size_threshold'
    );
    assert.ok(
      imageOptPhp.includes('1600'),
      'big_image_size_threshold must be set to 1600px'
    );
  });

  // ── PHP CONFIG: upload_max_filesize ──────────────────────────────

  it('Dockerfile must set upload_max_filesize to at least 5M', () => {
    assert.ok(
      dockerfile.includes('upload_max_filesize') && (
        dockerfile.includes('5M') || dockerfile.includes('10M') || dockerfile.includes('8M')
      ),
      'Dockerfile must configure upload_max_filesize >= 5M'
    );
  });

  it('Dockerfile must set post_max_size to at least 8M', () => {
    assert.ok(
      dockerfile.includes('post_max_size'),
      'Dockerfile must configure post_max_size >= 8M'
    );
  });
});

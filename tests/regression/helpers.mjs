/**
 * Helper utilities for regression tests.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DASH = join(ROOT, 'dashboard');
const DIST = join(DASH, 'dist');
const MU   = join(ROOT, 'data', 'wordpress', 'wp-content', 'mu-plugins');

export const readDashFile   = (rel) => readFileSync(join(DASH, rel), 'utf8');
export const readDistFile   = (rel) => existsSync(join(DIST, rel)) ? readFileSync(join(DIST, rel), 'utf8') : null;
export const readMuPlugin   = (name) => readFileSync(join(MU, name), 'utf8');
export const fileExists     = (rel) => existsSync(join(ROOT, rel));
export const distFileExists = (rel) => existsSync(join(DIST, rel));
export const dashPath       = (rel) => join(DASH, rel);
export const rootPath       = (rel) => join(ROOT, rel);

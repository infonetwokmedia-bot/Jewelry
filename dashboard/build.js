/**
 * Build script for Tu Joyita Miami Dashboard
 *
 * Concatenates and minifies JS files into a single bundle.
 * CSS is also minified separately.
 *
 * Usage:
 *   node dashboard/build.js          # Production build (minified)
 *   node dashboard/build.js --dev    # Dev build (no minification, sourcemaps)
 *
 * Output:
 *   dashboard/dist/bundle.min.js     # All JS (except .env.js)
 *   dashboard/dist/bundle.min.css    # Minified CSS
 *
 * Note: .env.js is excluded — it's environment-specific and loaded separately.
 */

const { buildSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');
const dashboardDir = path.join(__dirname);
const distDir = path.join(dashboardDir, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// ── JS Bundle ────────────────────────────────────────────────────────────────
// Order matters: auth → api → users → pos → dashboard (dependency chain)
const jsFiles = [
    'js/auth.js',
    'js/api.js',
    'js/users.js',
    'js/pos.js',
    'js/dashboard.js',
].map(f => path.join(dashboardDir, f));

// Verify all source files exist
for (const file of jsFiles) {
    if (!fs.existsSync(file)) {
        console.error(`ERROR: Source file not found: ${file}`);
        process.exit(1);
    }
}

// Concatenate JS files (they use global scope, not ES modules)
const jsContent = jsFiles
    .map(f => {
        const content = fs.readFileSync(f, 'utf8');
        const basename = path.basename(f);
        return `\n/* ── ${basename} ── */\n${content}`;
    })
    .join('\n');

// Write temp concatenated file for esbuild
const tempJs = path.join(distDir, '_bundle.tmp.js');
fs.writeFileSync(tempJs, jsContent, 'utf8');

try {
    const jsResult = buildSync({
        entryPoints: [tempJs],
        outfile: path.join(distDir, 'bundle.min.js'),
        minify: !isDev,
        sourcemap: isDev ? 'inline' : false,
        target: ['es2020'],
        charset: 'utf8',
        logLevel: 'warning',
    });

    if (jsResult.errors.length > 0) {
        console.error('JS build errors:', jsResult.errors);
        process.exit(1);
    }
} finally {
    // Clean up temp file
    if (fs.existsSync(tempJs)) {
        fs.unlinkSync(tempJs);
    }
}

// ── CSS Bundle ───────────────────────────────────────────────────────────────
const cssFile = path.join(dashboardDir, 'css', 'dashboard.css');
if (fs.existsSync(cssFile)) {
    const cssResult = buildSync({
        entryPoints: [cssFile],
        outfile: path.join(distDir, 'bundle.min.css'),
        minify: !isDev,
        sourcemap: isDev ? 'inline' : false,
        charset: 'utf8',
        logLevel: 'warning',
        loader: { '.css': 'css' },
    });

    if (cssResult.errors.length > 0) {
        console.error('CSS build errors:', cssResult.errors);
        process.exit(1);
    }

// ── Production index.html ────────────────────────────────────────────────────
// Replace individual <script>/<link> tags with bundle references
const indexFile = path.join(dashboardDir, 'index.html');
const version = `${Date.now()}`;

let html = fs.readFileSync(indexFile, 'utf8');

// Replace CSS link
html = html.replace(
    /<link rel="stylesheet" href="css\/dashboard\.css[^"]*"\s*\/>/,
    `<link rel="stylesheet" href="dist/bundle.min.css?v=${version}" />`
);

// Replace individual JS scripts with single bundle
// Keep .env.js (environment-specific), replace the rest
html = html.replace(
    /\s*<script src="js\/auth\.js[^"]*"><\/script>\s*<script src="js\/api\.js[^"]*"><\/script>\s*<script src="js\/users\.js[^"]*"><\/script>\s*<script src="js\/pos\.js[^"]*"><\/script>\s*<script src="js\/dashboard\.js[^"]*"><\/script>/,
    `\n  <script src="dist/bundle.min.js?v=${version}"></script>`
);

// Update .env.js cache buster too
html = html.replace(
    /<script src="\.env\.js[^"]*"><\/script>/,
    `<script src=".env.js?v=${version}"></script>`
);

fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');
}

// ── Report ───────────────────────────────────────────────────────────────────
const bundleJs = path.join(distDir, 'bundle.min.js');
const bundleCss = path.join(distDir, 'bundle.min.css');

const originalJsSize = jsFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);
const bundledJsSize = fs.existsSync(bundleJs) ? fs.statSync(bundleJs).size : 0;
const originalCssSize = fs.existsSync(cssFile) ? fs.statSync(cssFile).size : 0;
const bundledCssSize = fs.existsSync(bundleCss) ? fs.statSync(bundleCss).size : 0;

const jsSaving = originalJsSize > 0 ? Math.round((1 - bundledJsSize / originalJsSize) * 100) : 0;
const cssSaving = originalCssSize > 0 ? Math.round((1 - bundledCssSize / originalCssSize) * 100) : 0;

console.log(`\n✅ Dashboard build complete (${isDev ? 'dev' : 'production'})`);
console.log(`   JS:  ${(originalJsSize / 1024).toFixed(1)}KB → ${(bundledJsSize / 1024).toFixed(1)}KB (${jsSaving}% reduction)`);
console.log(`   CSS: ${(originalCssSize / 1024).toFixed(1)}KB → ${(bundledCssSize / 1024).toFixed(1)}KB (${cssSaving}% reduction)`);
console.log(`   Output: dashboard/dist/\n`);

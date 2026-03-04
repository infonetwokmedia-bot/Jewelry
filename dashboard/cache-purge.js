/**
 * Cache Purge — runs on every page load BEFORE any other script.
 * When APP_VERSION changes, it unregisters all Service Workers,
 * deletes all caches, and forces a clean reload.
 *
 * This file MUST be loaded as the very first <script src="..."> tag.
 * It's external (not inline) so it passes CSP script-src 'self'.
 */
(function () {
  var APP_VERSION = '3.34.0';
  var STORAGE_KEY = 'jewd_app_version';

  var stored = localStorage.getItem(STORAGE_KEY);
  if (stored === APP_VERSION) return; // Already up to date

  console.log('[PURGE] Version changed:', stored, '→', APP_VERSION);
  localStorage.setItem(STORAGE_KEY, APP_VERSION);

  var promises = [];

  // Unregister ALL service workers
  if ('serviceWorker' in navigator) {
    promises.push(
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) {
          console.log('[PURGE] Unregistering SW:', r.scope);
          return r.unregister();
        }));
      })
    );
  }

  // Delete ALL caches
  if ('caches' in window) {
    promises.push(
      caches.keys().then(function (names) {
        return Promise.all(names.map(function (n) {
          console.log('[PURGE] Deleting cache:', n);
          return caches.delete(n);
        }));
      })
    );
  }

  // Wait for cleanup, then reload
  Promise.all(promises).then(function () {
    console.log('[PURGE] All caches cleared — reloading');
    window.location.reload(true);
  }).catch(function () {
    // Even on error, force reload
    window.location.reload(true);
  });

  // Halt page rendering while we wait for cleanup
  window.stop();
})();

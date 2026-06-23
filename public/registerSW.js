(function () {
  var cleanupVersion = 'supabase-env-fix-2026-06-23';
  var storageKey = 'nature-island-sw-cleanup-version';

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.getRegistration('/').then(function (registration) {
      if (!registration || window.localStorage.getItem(storageKey) === cleanupVersion) return;

      navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'APP_CACHE_CLEARED') {
          window.localStorage.setItem(storageKey, cleanupVersion);
        }
      });

      navigator.serviceWorker.register('/sw.js?v=' + cleanupVersion, { scope: '/' }).catch(function () {});
    }).catch(function () {});
  });
}());

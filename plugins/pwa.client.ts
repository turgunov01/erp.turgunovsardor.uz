// Registers the PWA service worker (production only) and captures the install prompt.
// In DEV we actively UNREGISTER any service worker and clear its caches — a cached app
// shell + hashed dev chunks that change every rebuild otherwise causes a white screen.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  if (import.meta.dev) {
    // Recovery: kill any SW + caches left over from a previous build.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    }
    if ('caches' in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    return;
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW register failed', e));
    });
  }
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    (window as any).__ttrInstallPrompt = e;
  });
});

// Resolve the API base on the client.
//  • localhost / LAN IP (development): derive from the current host on port 3000 so a
//    changing DHCP IP never breaks the dev app (open on localhost OR any LAN IP — both work).
//  • a real domain (production): trust the build-time NUXT_PUBLIC_API_BASE
//    (e.g. https://api.erp.turgunovsardor.uz/api/v1); if it is unset, fall back to
//    same-origin /api/v1 behind the reverse proxy.
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return;
  const cfg = useRuntimeConfig();
  const configured = (cfg.public.apiBase as string | undefined) || '';
  const { protocol, hostname } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname); // bare LAN IPv4

  if (isLocal) {
    cfg.public.apiBase = `${protocol}//${hostname}:3000/api/v1`;
  } else if (!configured) {
    cfg.public.apiBase = `${protocol}//${hostname}/api/v1`;
  }
  // else: production domain with NUXT_PUBLIC_API_BASE set → keep it as configured.
});

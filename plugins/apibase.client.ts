// Point the API base at whatever host the page is served from (port 3000). This makes the
// SPA work over localhost AND any LAN IP without a hardcoded address — so a DHCP IP change
// never breaks the app again. Overrides NUXT_PUBLIC_API_BASE at runtime on the client.
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return;
  const cfg = useRuntimeConfig();
  const { protocol, hostname } = window.location;
  cfg.public.apiBase = `${protocol}//${hostname}:3000/api/v1`;
});

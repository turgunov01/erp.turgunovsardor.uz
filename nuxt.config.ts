// TTR ONE — Nuxt SPA frontend. Talks to the Fastify API (API-first backend).
export default defineNuxtConfig({
  ssr: false, // pure SPA — matches JWT-in-localStorage client auth
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // Base URL of the Fastify API. Override with NUXT_PUBLIC_API_BASE in prod.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1',
    },
  },
  app: {
    head: {
      title: 'TTR ONE — Enterprise ERP',
      htmlAttrs: { lang: 'ru' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#2563eb' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'TTR ONE' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icon.svg' },
      ],
    },
  },
  devtools: { enabled: false },
  compatibilityDate: '2025-01-01',
});

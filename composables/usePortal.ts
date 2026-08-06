// Customer-portal auth (Stage 21) — a lightweight, self-contained realm separate from the
// internal PIN-vault auth. The portal is a low-sensitivity, read-only view, so the token is
// kept in localStorage and sent as a bearer. No refresh flow: re-login when it expires.
import { ref, computed } from 'vue';

const token = ref<string | null>(null);
const customer = ref<{ name: string; code: string } | null>(null);
const user = ref<{ email: string; fullName: string | null } | null>(null);
let hydrated = false;

export function usePortal() {
  if (!hydrated && import.meta.client) {
    hydrated = true;
    token.value = localStorage.getItem('portal_token');
    try { customer.value = JSON.parse(localStorage.getItem('portal_customer') || 'null'); } catch { customer.value = null; }
    try { user.value = JSON.parse(localStorage.getItem('portal_user') || 'null'); } catch { user.value = null; }
  }
  const base = () => useRuntimeConfig().public.apiBase as string;
  const isAuthed = computed(() => !!token.value);

  async function login(email: string, password: string, tenantSlug?: string) {
    const res = await fetch(`${base()}/portal/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, ...(tenantSlug ? { tenantSlug } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || 'Не удалось войти');
    token.value = data.token; customer.value = data.customer; user.value = data.user;
    localStorage.setItem('portal_token', data.token);
    localStorage.setItem('portal_customer', JSON.stringify(data.customer));
    localStorage.setItem('portal_user', JSON.stringify(data.user));
    return data;
  }

  function logout() {
    token.value = null; customer.value = null; user.value = null;
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_customer');
    localStorage.removeItem('portal_user');
  }

  async function api(path: string, opts: { method?: string; body?: unknown } = {}) {
    const res = await fetch(`${base()}/portal${path}`, {
      method: opts.method || 'GET',
      headers: { 'content-type': 'application/json', ...(token.value ? { authorization: `Bearer ${token.value}` } : {}) },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    });
    if (res.status === 401) { logout(); throw new Error('Сессия истекла — войдите снова'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || 'Ошибка запроса');
    return data;
  }

  return { token, customer, user, isAuthed, login, logout, api };
}

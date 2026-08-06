import { defineStore } from 'pinia';
import { deriveKey, encryptJSON, decryptJSON, randomBytes, b64, unb64, exportRawKey, importRawKey } from '~/utils/crypto';

export interface User {
  id: string; email: string; fullName: string; tenantId: string;
  roles: string[]; permissions: string[]; platformAdmin: boolean;
}

const VAULT_KEY = 'ttr_vault';   // localStorage: encrypted-at-rest tokens (cold)
const SESSION_KEY = 'ttr_sess';  // sessionStorage: warm working key+tokens for the active tab
export const GRACE_MS = 5 * 60 * 1000; // reload stays unlocked for this long after last activity

// Module-level (never persisted, cleared on lock/logout/reload).
let refreshing: Promise<boolean> | null = null;
let cryptoKey: CryptoKey | null = null;
let vaultSalt: Uint8Array | null = null;

function readVault(): { v: number; salt: string; iv: string; ct: string } | null {
  if (!import.meta.client) return null;
  const s = localStorage.getItem(VAULT_KEY);
  return s ? JSON.parse(s) : null;
}
function wipeLegacyPlaintext() {
  if (!import.meta.client) return;
  localStorage.removeItem('ttr_access');
  localStorage.removeItem('ttr_refresh');
  localStorage.removeItem('ttr_lastUnlock');
}

function normalizeError(e: any): Error & { code?: string; status?: number } {
  const d = e?.data?.error;
  let msg = d?.message || e?.message || 'Ошибка запроса';
  const fe = d?.details?.fieldErrors;
  if (fe) { const first = (Object.values(fe).flat() as any[])[0]; if (first) msg = String(first); }
  const err = new Error(msg) as Error & { code?: string; status?: number };
  err.code = d?.code; err.status = e?.status ?? e?.statusCode;
  return err;
}

export const useAuth = defineStore('auth', {
  state: () => ({
    access: null as string | null,   // in memory only
    refresh: null as string | null,  // in memory only
    user: null as User | null,
    tenant: null as any,
    subscription: null as any,
    enabledModules: [] as string[],
    booted: false,
    vaultExists: import.meta.client ? !!localStorage.getItem(VAULT_KEY) : false,
  }),
  getters: {
    // Authenticated if we hold a live token OR an encrypted vault exists on this device.
    isAuthed: (s) => !!s.access || s.vaultExists,
    can: (s) => (p: string) => s.user?.permissions?.includes(p) ?? false,
    moduleOn: (s) => (key: string) => s.enabledModules.includes(key),
  },
  actions: {
    async api<T = any>(path: string, opts: { method?: string; body?: any; retry?: boolean } = {}): Promise<T> {
      const base = useRuntimeConfig().public.apiBase as string;
      const { method = 'GET', body, retry = true } = opts;
      try {
        return await $fetch<T>(base + path, {
          method: method as any, body,
          headers: this.access ? { Authorization: 'Bearer ' + this.access } : {},
        });
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status ?? e?.statusCode;
        if (status === 401 && retry && this.refresh) {
          if (await this.doRefresh()) return this.api<T>(path, { ...opts, retry: false });
          await this.logout(); throw normalizeError(e);
        }
        throw normalizeError(e);
      }
    },
    async doRefresh(): Promise<boolean> {
      if (refreshing) return refreshing;
      const base = useRuntimeConfig().public.apiBase as string;
      refreshing = (async () => {
        try {
          const d = await $fetch<any>(base + '/auth/refresh', { method: 'POST', body: { refreshToken: this.refresh } });
          this.access = d.accessToken; this.refresh = d.refreshToken;
          await this.persistVault(); // keep the encrypted vault current after rotation
          return true;
        } catch { return false; }
      })();
      const ok = await refreshing; refreshing = null; return ok;
    },
    // Re-encrypt the current tokens into the vault (only if a PIN key is loaded in memory).
    async persistVault() {
      if (!import.meta.client || !cryptoKey || !vaultSalt) return;
      const { iv, ct } = await encryptJSON(cryptoKey, { access: this.access, refresh: this.refresh });
      localStorage.setItem(VAULT_KEY, JSON.stringify({ v: 1, salt: b64(vaultSalt), iv, ct }));
      wipeLegacyPlaintext();
      this.vaultExists = true;
      await this.saveSession(); // keep the warm session current too
    },
    // ---- Warm session (sessionStorage): survives reload, cleared on lock/idle/tab-close ----
    async saveSession() {
      if (!import.meta.client || !cryptoKey || !vaultSalt || !this.access) return;
      const payload = { access: this.access, refresh: this.refresh, key: await exportRawKey(cryptoKey), salt: b64(vaultSalt), exp: Date.now() + GRACE_MS };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    },
    bumpSession() {
      if (!import.meta.client) return;
      const s = sessionStorage.getItem(SESSION_KEY);
      if (!s) return;
      try { const p = JSON.parse(s); p.exp = Date.now() + GRACE_MS; sessionStorage.setItem(SESSION_KEY, JSON.stringify(p)); } catch { /* ignore */ }
    },
    clearSession() { if (import.meta.client) sessionStorage.removeItem(SESSION_KEY); },
    // Restore tokens + key from a still-valid warm session (so a reload doesn't ask for the PIN).
    async resumeSession(): Promise<boolean> {
      if (!import.meta.client) return false;
      const s = sessionStorage.getItem(SESSION_KEY);
      if (!s) return false;
      try {
        const p = JSON.parse(s);
        if (!p.exp || p.exp < Date.now()) { this.clearSession(); return false; }
        this.access = p.access; this.refresh = p.refresh;
        cryptoKey = await importRawKey(p.key); vaultSalt = unb64(p.salt);
        this.bumpSession();
        return true;
      } catch { this.clearSession(); return false; }
    },
    // Create the PIN vault: server hash + encrypt tokens with a PIN-derived key.
    async createVault(pin: string) {
      await this.api('/auth/pin/set', { method: 'POST', body: { pin } });
      vaultSalt = randomBytes(16);
      cryptoKey = await deriveKey(pin, vaultSalt);
      await this.persistVault();
    },
    // Unlock: derive key from PIN, decrypt the vault -> tokens. Wrong PIN => decrypt throws => false.
    async unlockVault(pin: string): Promise<boolean> {
      const vault = readVault();
      if (!vault) return false;
      const salt = unb64(vault.salt);
      const key = await deriveKey(pin, salt);
      try {
        const toks = await decryptJSON<{ access: string; refresh: string }>(key, vault.iv, vault.ct);
        this.access = toks.access; this.refresh = toks.refresh;
        cryptoKey = key; vaultSalt = salt; this.vaultExists = true;
        await this.saveSession();
        await this.boot();
        return true;
      } catch { return false; }
    },
    // Drop tokens + key from memory AND the warm session (L key / idle). Vault stays encrypted on disk.
    lockMemory() { this.access = null; this.refresh = null; this.booted = false; cryptoKey = null; vaultSalt = null; this.clearSession(); },
    // Remove the vault entirely (disable PIN) — falls back to needing a password login.
    clearVault() { if (import.meta.client) localStorage.removeItem(VAULT_KEY); cryptoKey = null; vaultSalt = null; this.vaultExists = false; },

    async login(email: string, password: string, mfaCode?: string) {
      const d = await this.api<any>('/auth/login', { method: 'POST', body: { email, password, mfaCode }, retry: false });
      this.access = d.accessToken; this.refresh = d.refreshToken; this.user = d.user;
      this.clearVault(); wipeLegacyPlaintext(); // fresh login -> user will (re)create the PIN vault
      await this.boot();
    },
    async register(payload: any) {
      const d = await this.api<any>('/auth/register', { method: 'POST', body: payload, retry: false });
      this.access = d.accessToken; this.refresh = d.refreshToken; this.user = d.user;
      this.clearVault(); wipeLegacyPlaintext();
      await this.boot();
    },
    async acceptInvite(token: string, fullName: string, password: string) {
      const d = await this.api<any>('/auth/accept-invite', { method: 'POST', body: { token, fullName, password }, retry: false });
      this.access = d.accessToken; this.refresh = d.refreshToken; this.user = d.user;
      this.clearVault(); wipeLegacyPlaintext();
      await this.boot();
    },
    async boot() {
      if (!this.user) { const d = await this.api<any>('/auth/me'); this.user = d.user; }
      try {
        const s = await this.api<any>('/tenant/settings');
        this.enabledModules = s.modules.filter((m: any) => m.enabled).map((m: any) => m.key);
        this.tenant = s.tenant;
      } catch { this.enabledModules = ['catalog', 'warehouse']; }
      try { this.subscription = await this.api('/billing/subscription'); } catch { /* ignore */ }
      this.booted = true;
    },
    async logout() {
      try { await this.api('/auth/logout', { method: 'POST', retry: false }); } catch { /* ignore */ }
      this.access = null; this.refresh = null;
      this.user = null; this.tenant = null; this.subscription = null; this.enabledModules = []; this.booted = false;
      this.clearVault(); this.clearSession(); wipeLegacyPlaintext();
      const lock = useLock(); lock.reset();
      await navigateTo('/login');
    },
  },
});

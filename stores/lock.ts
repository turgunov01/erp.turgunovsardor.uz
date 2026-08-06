import { defineStore } from 'pinia';

const IDLE_MS = 5 * 60 * 1000; // 5 minutes

// PIN app-lock backed by a crypto token-vault. Fail-secure: on every fresh page load the
// tokens live only as ciphertext (memory is empty) until the PIN decrypts them. "L" key,
// 5-min idle, and reload all lead to the PIN screen; there is no bypass via localStorage.
export const useLock = defineStore('lock', {
  state: () => ({
    locked: false,
    mode: 'enter' as 'create' | 'confirm' | 'enter',
    _idle: null as any,
  }),
  actions: {
    async enforce() {
      const auth = useAuth();
      if (auth.access) {
        // Tokens in memory (fresh login) but no PIN vault yet -> must create one.
        if (!auth.vaultExists) this.open('create');
        else { this.locked = false; this.startIdle(); }
        return;
      }
      // Reload with no tokens in memory: try the warm session first (no PIN if still valid).
      if (auth.vaultExists && await auth.resumeSession()) {
        try { await auth.boot(); this.locked = false; this.startIdle(); }
        catch { auth.lockMemory(); this.open('enter'); }
        return;
      }
      if (auth.vaultExists) this.open('enter'); // grace expired / tab closed -> require PIN
      else this.locked = false; // not authenticated; middleware sends to /login
    },
    open(mode: 'create' | 'confirm' | 'enter') { this.mode = mode; this.locked = true; this.stopIdle(); },
    unlock() { this.locked = false; this.startIdle(); },
    lockNow() {
      const auth = useAuth();
      if (auth.vaultExists && !this.locked) { auth.lockMemory(); this.open('enter'); }
    },
    touch() { if (!this.locked) { useAuth().bumpSession(); this.startIdle(); } },
    startIdle() {
      this.stopIdle();
      const auth = useAuth();
      if (auth.vaultExists && !this.locked && import.meta.client) this._idle = setTimeout(() => this.lockNow(), IDLE_MS);
    },
    stopIdle() { if (this._idle) { clearTimeout(this._idle); this._idle = null; } },
    reset() { this.locked = false; this.stopIdle(); },
  },
});

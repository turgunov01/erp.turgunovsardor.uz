// Web Crypto helpers for the PIN token-vault.
// PIN -> PBKDF2(SHA-256) -> AES-GCM-256 key. Tokens are encrypted at rest; a wrong PIN
// fails the AES-GCM auth tag, so it cannot decrypt (no oracle, no plaintext ever stored).
const enc = new TextEncoder();
const dec = new TextDecoder();

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}
export function b64(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}
export function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

const PBKDF2_ITERATIONS = 210_000;

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true, // extractable — so the working key can live in the per-tab warm session
    ['encrypt', 'decrypt'],
  );
}

// Export/import the raw AES key for the sessionStorage warm-session (cleared on lock/idle/tab-close).
export async function exportRawKey(key: CryptoKey): Promise<string> {
  return b64(await crypto.subtle.exportKey('raw', key));
}
export async function importRawKey(raw: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', unb64(raw), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export async function encryptJSON(key: CryptoKey, obj: unknown): Promise<{ iv: string; ct: string }> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(ct) };
}

export async function decryptJSON<T = any>(key: CryptoKey, iv: string, ct: string): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct));
  return JSON.parse(dec.decode(pt));
}

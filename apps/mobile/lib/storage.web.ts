/**
 * Web shim for `react-native-mmkv`.
 *
 * The native `storage.ts` sibling instantiates MMKV at module scope, which
 * throws synchronously on web at import time ("MMKV is not available on
 * web"). This file is resolved by Metro on web (`.web.ts` takes priority
 * over `.ts`) and backs the same API with `localStorage`, so any consumer
 * doing `import { storage, gpsStorage } from './storage'` keeps working.
 *
 * Scope: only the surface actually used in the codebase. Add methods here
 * as callers need them.
 *
 * Trade-offs vs. native MMKV:
 *   * localStorage is synchronous but capped at ~5 MB per origin. Fine for
 *     a GPS buffer during a single walk; not suitable for long-term
 *     persistence of large datasets.
 *   * No encryption (native passes `encryptionKey`). Acceptable for a
 *     dev-only web preview — real secrets stay on the native clients.
 *   * Keys are prefixed with the MMKV `id` so multiple stores on the same
 *     origin don't collide (localStorage is a flat keyspace).
 */

type Primitive = string | number | boolean;

class WebMMKV {
  private readonly prefix: string;

  constructor(opts: { id: string }) {
    this.prefix = `mmkv:${opts.id}:`;
  }

  private fullKey(key: string): string {
    return this.prefix + key;
  }

  getString(key: string): string | undefined {
    const v = localStorage.getItem(this.fullKey(key));
    return v === null ? undefined : v;
  }

  set(key: string, value: Primitive): void {
    localStorage.setItem(this.fullKey(key), String(value));
  }

  delete(key: string): void {
    localStorage.removeItem(this.fullKey(key));
  }

  contains(key: string): boolean {
    return localStorage.getItem(this.fullKey(key)) !== null;
  }

  clearAll(): void {
    // localStorage has no namespace API — enumerate and delete by prefix.
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) toDelete.push(k);
    }
    for (const k of toDelete) localStorage.removeItem(k);
  }

  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) keys.push(k.slice(this.prefix.length));
    }
    return keys;
  }
}

export const storage = new WebMMKV({ id: 'borkd-storage' });

// Separate namespace for the GPS route buffer — keeps walk data out of
// the general kv store and lets us clear one without touching the other.
export const gpsStorage = new WebMMKV({ id: 'borkd-gps-buffer' });

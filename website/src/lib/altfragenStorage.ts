/**
 * Browser storage helpers for Kreuzungsdaten.
 *
 * Progress lives in localStorage (no accounts). Some browsers — especially
 * private/incognito tabs — accept writes during the session but discard them
 * when the last tab of this origin closes. That looks like “Kreuzungen weg”
 * for one classmate while another user on a normal profile is fine.
 */

export type StorageWriteResult = { ok: true } | { ok: false; error: string };

export type StorageHealth = {
  /** localStorage get/set works right now */
  readable: boolean;
  writable: boolean;
  detail: string | null;
};

const PROBE_KEY = 'adalbert-storage-probe-v1';

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function safeGetItem(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): StorageWriteResult {
  if (!hasLocalStorage()) {
    return { ok: false, error: 'localStorage ist nicht verfügbar' };
  }
  try {
    localStorage.setItem(key, value);
    // Round-trip: some broken embeds accept setItem then drop the value.
    if (localStorage.getItem(key) !== value) {
      return { ok: false, error: 'Speicher hat den Wert nicht behalten' };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/quota/i.test(msg)) {
      return { ok: false, error: 'Browser-Speicher voll (Quota)' };
    }
    return { ok: false, error: msg || 'Speichern fehlgeschlagen' };
  }
}

export function safeRemoveItem(key: string): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Probe whether Kreuzungsdaten can be written in this browser context.
 * Safe to call on every page load.
 */
export function probeStorageHealth(): StorageHealth {
  if (!hasLocalStorage()) {
    return {
      readable: false,
      writable: false,
      detail: 'Kein localStorage — Fortschritt kann nicht gespeichert werden.',
    };
  }

  const token = `ok:${Date.now()}`;
  try {
    localStorage.setItem(PROBE_KEY, token);
    const roundTrip = localStorage.getItem(PROBE_KEY) === token;
    localStorage.removeItem(PROBE_KEY);
    if (!roundTrip) {
      return {
        readable: false,
        writable: false,
        detail: 'Browser-Speicher verwirft Werte sofort.',
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      readable: false,
      writable: false,
      detail: msg || 'Browser blockiert localStorage (oft Privatmodus).',
    };
  }

  return { readable: true, writable: true, detail: null };
}

/** Ask the browser to keep this origin's data (best-effort, often denied). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (navigator as any).storage;
    if (!storage?.persist) return false;
    return Boolean(await storage.persist());
  } catch {
    return false;
  }
}

/**
 * Rough private-mode / ephemeral detection using StorageManager quota.
 * Chrome private profiles often report a tiny quota (~0–few MB).
 */
export async function detectLikelyPrivateMode(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (navigator as any).storage;
    if (!storage?.estimate) return false;
    const est = await storage.estimate();
    const quota = Number(est?.quota || 0);
    if (quota > 0 && quota < 50 * 1024 * 1024) return true;
    return false;
  } catch {
    return false;
  }
}

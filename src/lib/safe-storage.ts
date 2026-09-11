/**
 * localStorage can throw synchronously in several real browser contexts —
 * Safari's "Block All Cookies", privacy-hardened browsers/extensions,
 * corporate device policies, or sandboxed iframes without
 * `allow-same-origin`. Reading it directly during render (e.g. inside a
 * `useState` initializer) with no guard crashes the whole app on mount,
 * and with no error boundary that means a silent, permanently blank page.
 *
 * Every storage access in this app should go through these helpers instead
 * of calling `localStorage` directly — they degrade to a harmless no-op
 * rather than throwing, so a blocked store means "sessions/preferences
 * don't persist," not "the site doesn't load."
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable/blocked — ignore, app continues in-memory only
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // storage unavailable/blocked — ignore
  }
}

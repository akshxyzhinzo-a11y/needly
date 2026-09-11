/**
 * Persistence layer ("database").
 *
 * A document-oriented store persisted to localStorage with a single versioned
 * root record. All access goes through this module so a hosted database
 * (Postgres/Mongo) can be swapped in later without touching business logic:
 * replace load/save + the collection accessors with async driver calls.
 */
import { DB_KEY, DB_VERSION } from "./config";
import type { Database } from "./types";
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/safe-storage";

let db: Database | null = null;

function emptyDatabase(): Database {
  return {
    version: DB_VERSION,
    users: [],
    categories: [],
    listings: [],
    bookings: [],
    reviews: [],
    notifications: [],
    sessions: [],
    favorites: [],
    passwordResets: [],
    seededAt: 0,
  };
}

function load(): Database {
  if (db) return db;
  try {
    const raw = safeGetItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed && parsed.version === DB_VERSION) {
        db = { ...emptyDatabase(), ...parsed };
        return db;
      }
    }
  } catch {
    // corrupted store — rebuild below
  }
  db = emptyDatabase();
  return db;
}

export function getDb(): Database {
  return load();
}

export function saveDb(): void {
  if (!db) return;
  safeSetItem(DB_KEY, JSON.stringify(db));
}

/** Replaces the whole store — used by the seeder and dev smoke tests. */
export function replaceDb(next: Database): void {
  db = next;
  saveDb();
}

/** Marks the store un-seeded so the next access re-runs the seed. */
export function wipeDb(): void {
  safeRemoveItem(DB_KEY);
  db = null;
}

export function isSeeded(): boolean {
  return load().seededAt > 0;
}

/* ---------- tiny id / time helpers (shared by server modules) ---------- */

export function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `${prefix}_${rand}`;
}

export function token(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const now = () => Date.now();

/* ------------------------- date helpers (day) ------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayStr(): string {
  const d = new Date();
  return toDayStr(d);
}

export function toDayStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dayStr: string, n: number): string {
  return toDayStr(new Date(dayValue(dayStr) + n * DAY_MS));
}

export function dayValue(dayStr: string): number {
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Inclusive day range used by the availability model. */
export function daysBetweenInclusive(start: string, end: string): number {
  return Math.round((dayValue(end) - dayValue(start)) / DAY_MS) + 1;
}

export function enumerateDays(start: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

export function isValidDayStr(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(dayValue(value))
  );
}

/** True when two inclusive day ranges intersect. */
export function rangesOverlap(
  aStart: string,
  aDays: number,
  bStart: string,
  bDays: number
): boolean {
  const a0 = dayValue(aStart);
  const a1 = a0 + (aDays - 1) * DAY_MS;
  const b0 = dayValue(bStart);
  const b1 = b0 + (bDays - 1) * DAY_MS;
  return a0 <= b1 && b0 <= a1;
}

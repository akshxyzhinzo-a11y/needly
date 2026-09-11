/**
 * Central platform configuration.
 *
 * All business constants live here (fees, limits, keys) instead of being
 * scattered through the code. Anything that would be supplied by a hosting
 * environment in a deployed backend is read from import.meta.env first and
 * documented in .env.example / README.
 */

export const DB_KEY = "needly.db.v2";
export const SESSION_KEY = "needly.session.v2";
export const DB_VERSION = 2;

/** Platform service fee charged to the renter on top of the listing price. */
export const PLATFORM_FEE_RATE = Number(
  (import.meta as any).env?.VITE_PLATFORM_FEE_RATE ?? 0.08
);

/** Sessions expire after 7 days of inactivity-by-expiry. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Password rules */
export const PASSWORD_MIN_LENGTH = 8;
export const BCRYPT_ROUNDS = 10;

/** Login brute-force protection (in-memory, per email). */
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 60 * 1000;

/** Listing constraints */
export const MAX_LISTING_IMAGES = 6;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // input file cap (downscaled after)
export const MAX_TITLE_LEN = 80;
export const MAX_DESC_LEN = 1200;
export const MIN_PRICE = 10;
export const MAX_PRICE = 100000;
export const MAX_BOOKING_DAYS = 30;

/** Payments — see README §Payments. */
export const PAYMENT_PROVIDER =
  (import.meta as any).env?.VITE_PAYMENT_PROVIDER ?? "pay-on-pickup";

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 48;

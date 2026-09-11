/**
 * Authentication + session management.
 *
 * Passwords are hashed with bcrypt (never stored or returned in plaintext).
 * Sessions are random opaque tokens with server-side expiry. The session
 * token returned to the client is the *only* credential the browser holds.
 */
import bcrypt from "bcryptjs";
import {
  BCRYPT_ROUNDS,
  LOGIN_LOCK_MS,
  LOGIN_MAX_ATTEMPTS,
  PASSWORD_MIN_LENGTH,
  SESSION_TTL_MS,
} from "./config";
import { getDb, now, saveDb, token as makeToken, uid } from "./db";
import type { User } from "./types";

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, bcrypt.genSaltSync(BCRYPT_ROUNDS));
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

/** Strip secrets before any user record crosses the API boundary. */
export function publicUser(u: User) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

export function validatePassword(pw: unknown): pw is string {
  return typeof pw === "string" && pw.length >= PASSWORD_MIN_LENGTH;
}

/* --------------------------- login lockout --------------------------- */

interface LockEntry {
  attempts: number;
  lockedUntil: number;
}
const loginGuards = new Map<string, LockEntry>();

function lockState(email: string): LockEntry {
  const entry = loginGuards.get(email);
  if (!entry) return { attempts: 0, lockedUntil: 0 };
  if (entry.lockedUntil && entry.lockedUntil < now()) {
    entry.attempts = 0;
    entry.lockedUntil = 0;
  }
  return entry;
}

/* ------------------------------ sessions ------------------------------ */

export function createSession(userId: string) {
  const db = getDb();
  const t = makeToken();
  db.sessions.push({
    token: t,
    userId,
    createdAt: now(),
    expiresAt: now() + SESSION_TTL_MS,
  });
  saveDb();
  return t;
}

export function destroySession(token: string | null): void {
  if (!token) return;
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  saveDb();
}

export function userFromToken(token: string | null): User | null {
  if (!token) return null;
  const db = getDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  if (session.expiresAt < now()) {
    db.sessions = db.sessions.filter((s) => s.token !== token);
    saveDb();
    return null;
  }
  const user = db.users.find((u) => u.id === session.userId) ?? null;
  if (!user || user.status !== "active") return null;
  return user;
}

/* ---------------------------- auth actions ---------------------------- */

export function registerUser(input: {
  name: string;
  email: string;
  phone: string;
  city: string;
  password: string;
}): { user: User; token: string } {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  if (db.users.some((u) => u.email === email)) {
    throw { status: 409, message: "An account with this email already exists.", field: "email" };
  }
  const user: User = {
    id: uid("usr"),
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    city: input.city.trim(),
    area: "",
    roles: ["user"],
    passwordHash: hashPassword(input.password),
    status: "active",
    avatarColor: pickAvatarColor(email),
    createdAt: now(),
  };
  db.users.push(user);
  const t = createSession(user.id);
  saveDb();
  return { user, token: t };
}

export function loginUser(emailRaw: string, password: string): {
  user: User;
  token: string;
} {
  const db = getDb();
  const email = emailRaw.trim().toLowerCase();
  const guard = lockState(email);
  if (guard.lockedUntil > now()) {
    const secs = Math.ceil((guard.lockedUntil - now()) / 1000);
    throw { status: 429, message: `Too many attempts. Try again in ${secs}s.` };
  }
  const user = db.users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    guard.attempts += 1;
    if (guard.attempts >= LOGIN_MAX_ATTEMPTS) {
      guard.lockedUntil = now() + LOGIN_LOCK_MS;
      guard.attempts = 0;
    }
    loginGuards.set(email, guard);
    throw { status: 401, message: "Incorrect email or password." };
  }
  if (user.status !== "active") {
    throw { status: 403, message: "This account has been suspended. Contact support." };
  }
  loginGuards.delete(email);
  const t = createSession(user.id);
  return { user, token: t };
}

export function requestPasswordReset(emailRaw: string): { devToken?: string } {
  const db = getDb();
  const email = emailRaw.trim().toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user) return {}; // never reveal whether the account exists
  const t = makeToken();
  db.passwordResets.push({ token: t, userId: user.id, expiresAt: now() + 30 * 60 * 1000 });
  saveDb();
  // No SMTP in this environment (documented) — the token is returned so the
  // demo reset flow can complete end-to-end.
  return { devToken: t };
}

export function resetPassword(resetToken: string, newPassword: string): void {
  const db = getDb();
  const entry = db.passwordResets.find((r) => r.token === resetToken);
  if (!entry || entry.expiresAt < now()) {
    throw { status: 400, message: "This reset link is invalid or has expired." };
  }
  const user = db.users.find((u) => u.id === entry.userId);
  if (!user) throw { status: 400, message: "This reset link is invalid." };
  user.passwordHash = hashPassword(newPassword);
  db.passwordResets = db.passwordResets.filter((r) => r.token !== resetToken);
  db.sessions = db.sessions.filter((s) => s.userId !== user.id); // force re-login
  saveDb();
}

export function changePassword(userId: string, current: string, next: string): void {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw { status: 404, message: "Account not found." };
  if (!verifyPassword(current, user.passwordHash)) {
    throw { status: 400, message: "Your current password is incorrect.", field: "current" };
  }
  user.passwordHash = hashPassword(next);
  saveDb();
}

function pickAvatarColor(seed: string): string {
  const palette = ["#30b8ef", "#7c5cff", "#f97362", "#12b886", "#e8590c", "#3b82f6"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

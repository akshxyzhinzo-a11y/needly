/**
 * API client. Talks to the embedded service layer via the same request shape
 * fetch() would use. To move to a hosted API later, keep these call sites and
 * change the implementation to `fetch(BASE_URL + path, ...)` — nothing else
 * in the UI needs to change.
 */
import { apiFetch, type ApiRequest } from "@/server/api";
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/safe-storage";

export class ApiError extends Error {
  status: number;
  field?: string;
  constructor(status: number, message: string, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => sleep(90 + Math.random() * 160); // realistic request feel

export function getToken(): string | null {
  return safeGetItem("needly.session.v2");
}

export function setToken(token: string | null): void {
  if (token) safeSetItem("needly.session.v2", token);
  else safeRemoveItem("needly.session.v2");
}

interface CallOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
}

export async function api<T = unknown>(path: string, opts: CallOptions = {}): Promise<T> {
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") query[k] = String(v);
  }
  const request: ApiRequest = {
    method: opts.method ?? "GET",
    path,
    query,
    body: opts.body,
    token: getToken(),
  };
  await latency();
  const result = await apiFetch(request);
  if (result.status >= 400) {
    const data = result.data as { error?: string; field?: string };
    throw new ApiError(result.status, data.error ?? "Request failed.", data.field);
  }
  return result.data as T;
}

/* ------------------------- typed convenience hooks ------------------------- */

/** Tiny data-fetching state machine shared by pages. */
export type LoadState<T> =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: T };

/**
 * Dev smoke test — runs the critical API flows end-to-end against a scratch
 * database, then restores the previous data. Run from the browser console:
 *
 *   await window.__needlySmoke()
 *
 * See README §Testing for the full QA checklist this complements.
 */
import { apiFetch, type ApiResult } from "./api";
import { getDb, replaceDb, saveDb, wipeDb } from "./db";
import { seedIfNeeded } from "./seed";
import type { Database } from "./types";

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

export async function runSmokeTests(): Promise<Check[]> {
  const original: Database = JSON.parse(JSON.stringify(getDb())) as Database;
  const checks: Check[] = [];
  const ok = (name: string, pass: boolean, detail?: string) =>
    checks.push({ name, pass, detail: pass ? detail : `expected check to pass — ${detail ?? ""}` });

  const call = (
    method: string,
    path: string,
    body?: unknown,
    token?: string | null,
    query?: Record<string, string>
  ): Promise<ApiResult> => apiFetch({ method, path, body, token, query });

  const expectStatus = async (
    name: string,
    status: number,
    fn: () => Promise<ApiResult>
  ) => {
    const res = await fn();
    ok(name, res.status === status, `expected HTTP ${status}, got ${res.status}`);
  };

  const login = async (email: string, password: string): Promise<string> => {
    const res = await call("POST", "/auth/login", { email, password });
    return (res.data as { token: string }).token;
  };

  const future = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  try {
    wipeDb();
    seedIfNeeded();

    /* ------------------------------ accounts ------------------------------ */
    const reg = await call("POST", "/auth/register", {
      name: "Smoke Tester", email: "smoke@test.dev", phone: "", city: "Coimbatore",
      password: "password123",
    });
    ok("register succeeds", reg.status === 201, `status ${reg.status}`);
    const t = (reg.data as { token: string }).token;

    await expectStatus("duplicate email rejected (409)", 409, () =>
      call("POST", "/auth/register", {
        name: "Again", email: "smoke@test.dev", phone: "", city: "CBE", password: "password123",
      })
    );
    await expectStatus("short password rejected (400)", 400, () =>
      call("POST", "/auth/register", {
        name: "Shorty", email: "s2@test.dev", phone: "", city: "CBE", password: "123",
      })
    );
    await expectStatus("wrong password rejected (401)", 401, () =>
      call("POST", "/auth/login", { email: "smoke@test.dev", password: "definitely-wrong" })
    );
    await expectStatus("unauthenticated /auth/me rejected (401)", 401, () => call("GET", "/auth/me"));

    /* ----------------------------- discovery ----------------------------- */
    const search = await call("GET", "/listings", undefined, null, { q: "drill" });
    ok("search finds seeded listings", (search.data as { total: number }).total >= 1,
      `total ${(search.data as { total: number }).total}`);
    const filtered = await call("GET", "/listings", undefined, null, {
      category: "vehicles", city: "Coimbatore",
    });
    const rows = (filtered.data as { items: { city: string; categoryId: string }[] }).items;
    ok("filters compose (city + category)", rows.length >= 1 && rows.every((l) => l.city === "Coimbatore" && l.categoryId === "vehicles"),
      `${rows.length} rows`);

    /* --------------------------- authorization --------------------------- */
    await expectStatus("plain user cannot create a listing (403)", 403, () =>
      call("POST", "/listings", {
        kind: "rent", categoryId: "tools", title: "Nope", description: "x".repeat(30),
        price: 100, city: "CBE", images: [],
      }, t)
    );
    await expectStatus("plain user cannot read admin stats (403)", 403, () =>
      call("GET", "/admin/stats", undefined, t)
    );

    /* ------------------------------- owner flow ------------------------------- */
    const arjunToken = await login("arjun@needly.in", "owner123");
    const meeraToken = await login("meera@needly.in", "owner123");
    const created = await call("POST", "/listings", {
      kind: "rent", categoryId: "tools", title: "Smoke Saw",
      description: "A test saw created by the smoke suite.", price: 180, city: "Coimbatore",
      area: "", images: ["/images/drill.jpg"], blockedDates: [],
    }, arjunToken);
    ok("owner creates a listing (201)", created.status === 201, `status ${created.status}`);
    const newListingId = (created.data as { listing: { id: string } }).listing.id;

    /* ------------------------------ booking rules ------------------------------ */
    await expectStatus("owners cannot book their own listing (400)", 400, () =>
      call("POST", "/bookings", { listingId: newListingId, startDate: future(60), days: 2 }, arjunToken)
    );
    await expectStatus("past start dates rejected (400)", 400, () =>
      call("POST", "/bookings", { listingId: newListingId, startDate: "2020-01-01", days: 1 }, t)
    );

    const start = future(45);
    const b1 = await call("POST", "/bookings", { listingId: "lst_drill", startDate: start, days: 2 }, t);
    ok("booking request created (201)", b1.status === 201, `status ${b1.status}`);
    const b1id = (b1.data as { booking: { id: string; total: number } }).booking.id;
    const b1total = (b1.data as { booking: { total: number } }).booking.total;
    ok("server-side pricing (₹150×2 + 8% = ₹324)", b1total === 324, `total ₹${b1total}`);

    // Overlapping request from a different renter is allowed while pending…
    const b2 = await call("POST", "/bookings", { listingId: "lst_drill", startDate: start, days: 3 }, meeraToken);
    ok("overlapping request accepted as pending (201)", b2.status === 201, `status ${b2.status}`);
    const b2id = (b2.data as { booking: { id: string } }).booking.id;

    await expectStatus("renter cannot accept their own request (403)", 403, () =>
      call("POST", `/bookings/${b1id}/accept`, undefined, t)
    );
    await expectStatus("owner accepts first request (200)", 200, () =>
      call("POST", `/bookings/${b1id}/accept`, undefined, arjunToken)
    );
    await expectStatus("overlapping confirm blocked on server re-check (409)", 409, () =>
      call("POST", `/bookings/${b2id}/accept`, undefined, arjunToken)
    );
    await expectStatus("owner can reject the clashing request (200)", 200, () =>
      call("POST", `/bookings/${b2id}/reject`, undefined, arjunToken)
    );
    await expectStatus("future booking cannot complete early (409)", 409, () =>
      call("POST", `/bookings/${b1id}/complete`, undefined, arjunToken)
    );
    await expectStatus("renter can cancel a confirmed booking (200)", 200, () =>
      call("POST", `/bookings/${b1id}/cancel`, undefined, t)
    );

    /* -------------------------------- reviews -------------------------------- */
    await expectStatus("review without completed booking rejected (400)", 400, () =>
      call("POST", "/listings/lst_camera/reviews", {
        bookingId: "bok_tent_pend", rating: 5, text: "this must not be allowed",
      }, t)
    );
    const demoToken = await login("demo@needly.in", "demo1234");
    await expectStatus("duplicate review rejected (409)", 409, () =>
      call("POST", "/listings/lst_camera/reviews", {
        bookingId: "bok_camera_done", rating: 5, text: "duplicate review attempt",
      }, demoToken)
    );

    /* ----------------------------- notifications ----------------------------- */
    const notifs = await call("GET", "/notifications", undefined, t);
    ok("cancel generated a notification", notifs.status === 200 &&
      (notifs.data as { items: unknown[] }).items.length >= 1,
      `status ${notifs.status}`);

    /* --------------------------------- admin --------------------------------- */
    const adminToken = await login("admin@needly.in", "admin123");
    await expectStatus("admin stats readable by admin (200)", 200, () =>
      call("GET", "/admin/stats", undefined, adminToken)
    );
    await expectStatus("admin creates a category (201)", 201, () =>
      call("POST", "/admin/categories", { label: "Garden" }, adminToken)
    );
    const suspendRes = await call("PATCH", "/admin/users/usr_arjun", { status: "suspended" }, adminToken);
    ok("admin can suspend a user", suspendRes.status === 200, `status ${suspendRes.status}`);
    await expectStatus("suspended user can no longer log in (403)", 403, () =>
      call("POST", "/auth/login", { email: "arjun@needly.in", password: "owner123" })
    );
  } catch (err) {
    checks.push({ name: "suite ran without crashing", pass: false, detail: String(err) });
  } finally {
    replaceDb(original);
    saveDb();
  }

  const passed = checks.filter((c) => c.pass).length;
  // eslint-disable-next-line no-console
  console.table(checks.map((c) => ({ check: c.name, pass: c.pass ? "PASS" : "FAIL", detail: c.detail ?? "" })));
  // eslint-disable-next-line no-console
  console.log(`[needly smoke] ${passed}/${checks.length} checks passed`);
  return checks;
}

declare global {
  interface Window {
    __needlySmoke?: typeof runSmokeTests;
  }
}

import { useCallback, useEffect, useState } from "react";
import {
  Ban, CheckCircle2, Loader2, Plus, Search, ShieldAlert, ShieldCheck,
} from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { Link, navigate } from "@/lib/router";
import { cn } from "@/utils/cn";
import {
  EmptyState, ErrorState, GhostButton, Pagination, StatusBadge, categoryIcon,
  fmtDateShort, inr, timeAgo, usePageTitle,
} from "@/components/ui";

interface AdminStats {
  usersTotal: number;
  usersActive: number;
  usersOwners: number;
  listingsTotal: number;
  listingsActive: number;
  bookingsTotal: number;
  bookingsPending: number;
  bookingsActive: number;
  bookingsCompleted: number;
  grossVolume: number;
  platformRevenue: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  city: string;
  roles: string[];
  status: "active" | "suspended";
  avatarColor: string;
  createdAt: number;
  listings: number;
  bookings: number;
}

interface AdminListing {
  id: string;
  title: string;
  price: number;
  unit: string;
  kind: string;
  city: string;
  status: string;
  images: string[];
  ratingAvg: number;
  ratingCount: number;
  owner: { name: string } | null;
  category: { label: string; icon: string } | null;
}

interface AdminBooking {
  id: string;
  startDate: string;
  endDate: string;
  total: number;
  status: string;
  createdAt: number;
  listing: { title: string } | null;
  renter: { name: string } | null;
  owner: { name: string } | null;
}

interface AdminCategory {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  order: number;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "listings", label: "Listings" },
  { id: "bookings", label: "Bookings" },
  { id: "categories", label: "Categories" },
];

export default function AdminPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Admin");
  const { user, booting } = useAuth();
  const isAdmin = !!user && user.roles.includes("admin");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!booting && !user) navigate("/login?next=/admin", { replace: true });
  }, [booting, user]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[520px] flex-col items-center justify-center px-5 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-[22px] font-extrabold text-ink">403 — admins only</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
          This area is restricted to platform administrators. Your account doesn't have admin
          rights, and the server checks this on every request — not just here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[1260px] px-5 py-9">
        <h1 className="flex items-center gap-2.5 text-[26px] font-extrabold tracking-[-0.02em] text-ink">
          Admin panel
          <ShieldCheck className="h-5 w-5 text-accent-deep" />
        </h1>
        <p className="mt-1 text-[13.5px] font-medium text-gray-500">
          Moderate users, listings and bookings. Every number here is live from the database.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-10 rounded-full border px-5 text-[13px] font-bold transition",
                tab === t.id
                  ? "border-ink bg-ink text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && <OverviewTab />}
          {tab === "users" && <UsersTab notify={notify} currentUserId={user.id} />}
          {tab === "listings" && <ListingsTab notify={notify} />}
          {tab === "bookings" && <BookingsTab />}
          {tab === "categories" && <CategoriesTab notify={notify} />}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- overview -------------------------------- */

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<AdminStats>("/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);
  useEffect(() => load(), [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!stats) {
    return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-100" />
    ))}</div>;
  }

  const cards = [
    { label: "Total users", value: String(stats.usersTotal), sub: `${stats.usersOwners} owners` },
    { label: "Active users", value: String(stats.usersActive), sub: `${stats.usersTotal - stats.usersActive} suspended` },
    { label: "Live listings", value: String(stats.listingsActive), sub: `${stats.listingsTotal} total` },
    { label: "Bookings", value: String(stats.bookingsTotal), sub: `${stats.bookingsPending} pending review` },
    { label: "Active rentals", value: String(stats.bookingsActive), sub: `${stats.bookingsCompleted} completed` },
    { label: "Gross volume", value: inr(stats.grossVolume), sub: "completed bookings" },
    { label: "Platform revenue", value: inr(stats.platformRevenue), sub: "service fees collected" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
          <p className="text-[11.5px] font-bold uppercase tracking-wide text-gray-400">{c.label}</p>
          <p className="mt-1.5 text-[26px] font-extrabold tracking-[-0.02em] text-ink">{c.value}</p>
          <p className="mt-0.5 text-[12px] font-medium text-gray-400">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- users --------------------------------- */

function UsersTab({ notify, currentUserId }: { notify: (t: string) => void; currentUserId: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ items: AdminUser[] }>("/admin/users", { query: { q } });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load users.");
    }
  }, [q]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  const setStatus = async (target: AdminUser, status: "active" | "suspended") => {
    setBusyId(target.id);
    try {
      await api(`/admin/users/${target.id}`, { method: "PATCH", body: { status } });
      notify(status === "suspended" ? `Suspended ${target.name}` : `Re-activated ${target.name}`);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
        className="mb-4 flex h-11 max-w-sm items-center rounded-full border border-gray-200 bg-white pl-4 shadow-card"
      >
        <Search className="h-4 w-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, city…"
          aria-label="Search users"
          className="min-w-0 flex-1 bg-transparent px-3 text-[13.5px] font-medium outline-none placeholder:text-gray-400"
        />
      </form>

      {items === null ? (
        <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No matching users" text="Try a different search term." />
      ) : (
        <ul className="space-y-2.5">
          {items.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: u.avatarColor }}>
                {u.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-extrabold text-ink">{u.name}</p>
                  {u.roles.includes("admin") && (
                    <span className="rounded-full bg-violet-50 px-2 py-[2px] text-[10px] font-extrabold uppercase tracking-wide text-violet-600">admin</span>
                  )}
                  {u.roles.includes("owner") && (
                    <span className="rounded-full bg-sky-50 px-2 py-[2px] text-[10px] font-extrabold uppercase tracking-wide text-sky-600">owner</span>
                  )}
                  <StatusBadge status={u.status} />
                </div>
                <p className="mt-0.5 truncate text-[12.5px] font-medium text-gray-500">
                  {u.email} · {u.city} · {u.listings} listings · {u.bookings} bookings · joined {fmtDateShort(new Date(u.createdAt).toISOString().slice(0, 10))}
                </p>
              </div>
              {!u.roles.includes("admin") && u.id !== currentUserId && (
                <button
                  onClick={() => void setStatus(u, u.status === "active" ? "suspended" : "active")}
                  disabled={busyId === u.id}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-bold transition disabled:opacity-60",
                    u.status === "active"
                      ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  )}
                >
                  {busyId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : u.status === "active" ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {u.status === "active" ? "Suspend" : "Re-activate"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- listings -------------------------------- */

function ListingsTab({ notify }: { notify: (t: string) => void }) {
  const [items, setItems] = useState<AdminListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ items: AdminListing[] }>("/listings", {
        query: { scope: "all", pageSize: 48 },
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load listings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = async (listing: AdminListing, status: "active" | "removed") => {
    setBusyId(listing.id);
    try {
      if (status === "removed") await api(`/admin/listings/${listing.id}`, { method: "PATCH", body: { status } });
      else await api(`/listings/${listing.id}/status`, { method: "POST", body: { status } });
      notify(status === "removed" ? `Removed “${listing.title}”` : `Restored “${listing.title}”`);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!items) {
    return <div className="space-y-2.5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}</div>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((l) => {
        const Icon = categoryIcon(l.category?.icon ?? "Package");
        return (
          <li key={l.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:flex-row sm:items-center">
            <span className="h-14 w-[72px] shrink-0 overflow-hidden rounded-xl bg-[#f3f4f6]">
              {l.images[0] ? (
                <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[#e8f3fb] text-accent-deep">
                  <Icon className="h-5 w-5" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/listing/${l.id}`} className="text-[14px] font-extrabold text-ink hover:underline">
                  {l.title}
                </Link>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-0.5 text-[12.5px] font-medium text-gray-500">
                {l.category?.label ?? "Other"} · {inr(l.price)}{l.unit === "job" ? " / job" : " / day"} ·
                by {l.owner?.name ?? "unknown"} · {l.city}
                {l.ratingCount > 0 && ` · ★${l.ratingAvg.toFixed(1)}`}
              </p>
            </div>
            <button
              onClick={() => void moderate(l, l.status === "removed" ? "active" : "removed")}
              disabled={busyId === l.id}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-bold transition disabled:opacity-60",
                l.status === "removed"
                  ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  : "border-rose-200 text-rose-600 hover:bg-rose-50"
              )}
            >
              {busyId === l.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {l.status === "removed" ? "Restore" : "Remove"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------- bookings -------------------------------- */

function BookingsTab() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminBooking[]; total: number; page: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ items: AdminBooking[]; total: number; page: number; pageSize: number }>(
        "/admin/bookings",
        { query: { status, page, pageSize: 10 } }
      );
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load bookings.");
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["", "pending", "confirmed", "completed", "cancelled", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              "h-9 rounded-full border px-4 text-[12.5px] font-bold capitalize transition",
              status === s ? "border-ink bg-ink text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : data === null ? (
        <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}</div>
      ) : data.items.length === 0 ? (
        <EmptyState title="No bookings in this state" text="Bookings appear here as renters and owners use the platform." />
      ) : (
        <>
          <ul className="space-y-2.5">
            {data.items.map((b) => (
              <li key={b.id} className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-extrabold text-ink">{b.listing?.title ?? "Removed listing"}</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-0.5 text-[12.5px] font-medium text-gray-500">
                    {b.renter?.name ?? "?"} → {b.owner?.name ?? "?"} · {fmtDateShort(b.startDate)} → {fmtDateShort(b.endDate)} · {timeAgo(b.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-[14px] font-extrabold text-ink">{inr(b.total)}</p>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
        </>
      )}
    </div>
  );
}

/* ------------------------------- categories ------------------------------- */

function CategoriesTab({ notify }: { notify: (t: string) => void }) {
  const [items, setItems] = useState<AdminCategory[] | null>(null);
  const [all, setAll] = useState<AdminCategory[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    // enabled categories are public; pull the full set via search scope trick
    const res = await api<{ categories: AdminCategory[] }>("/categories");
    setAll(res.categories);
    setItems(res.categories);
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (cat: AdminCategory) => {
    try {
      await api(`/admin/categories/${cat.id}`, { method: "PATCH", body: { enabled: !cat.enabled } });
      notify(cat.enabled ? `Disabled “${cat.label}”` : `Enabled “${cat.label}”`);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Action failed.");
    }
  };

  const create = async () => {
    if (label.trim().length < 2) return;
    setBusy(true);
    try {
      await api("/admin/categories", { method: "POST", body: { label: label.trim() } });
      notify(`Category “${label.trim()}” created`);
      setLabel("");
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Couldn't create category.");
    } finally {
      setBusy(false);
    }
  };

  if (!items) {
    return <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => (
      <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
    ))}</div>;
  }

  return (
    <div>
      <div className="mb-5 flex max-w-md gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void create()}
          placeholder="New category name…"
          aria-label="New category name"
          className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] font-medium outline-none focus:border-accent"
        />
        <GhostButton onClick={() => void create()} disabled={busy || label.trim().length < 2}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </GhostButton>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((c) => {
          const Icon = categoryIcon(c.icon);
          return (
            <li key={c.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
              <span className="flex items-center gap-3">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", c.enabled ? "bg-[#e8f4fc] text-accent-deep" : "bg-gray-100 text-gray-400")}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-[13.5px] font-extrabold text-ink">{c.label}</span>
                  <span className="text-[11px] font-medium text-gray-400">/{c.id}</span>
                </span>
              </span>
              <button
                onClick={() => void toggle(c)}
                aria-pressed={c.enabled}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  c.enabled ? "bg-accent" : "bg-gray-200"
                )}
                aria-label={`${c.enabled ? "Disable" : "Enable"} ${c.label}`}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", c.enabled ? "left-[22px]" : "left-0.5")} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2, CircleOff, Eye, Loader2, PackagePlus, Pencil,
  PauseCircle, PlayCircle, Trash2, XCircle,
} from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { Link, navigate } from "@/lib/router";
import { cn } from "@/utils/cn";
import {
  EmptyState, ErrorState, GhostButton, Modal, StatusBadge, categoryIcon,
  fmtDateShort, inr, timeAgo, usePageTitle,
} from "@/components/ui";
import type { CardListing } from "@/components/ListingCard";

interface OwnerStats {
  listingsTotal: number;
  listingsActive: number;
  requestsPending: number;
  upcoming: number;
  earningsTotal: number;
  earningsMonth: number;
}

interface OwnerBooking {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  total: number;
  subtotal: number;
  status: string;
  createdAt: number;
  listing: { id: string; title: string; images: string[]; category: { icon: string } | null } | null;
  renter: { id: string; name: string; avatarColor: string; phone?: string } | null;
}

interface MyListing extends CardListing {
  status: "active" | "paused" | "removed";
  description: string;
}

function dayVal(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}
const todayVal = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export default function OwnerPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Owner dashboard");
  const { user, booting, setUser } = useAuth();
  const isOwner = !!user && (user.roles.includes("owner") || user.roles.includes("admin"));
  const [becoming, setBecoming] = useState(false);

  useEffect(() => {
    if (!booting && !user) navigate("/login?next=/owner", { replace: true });
  }, [booting, user]);

  const becomeOwner = async () => {
    setBecoming(true);
    try {
      const res = await api<{ user: typeof user }>("/users/me/become-owner", { method: "POST" });
      if (res.user) setUser(res.user);
      notify("You're an owner now — publish your first listing");
      navigate("/owner/new");
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Couldn't switch right now.");
    } finally {
      setBecoming(false);
    }
  };

  if (!user) return null;

  if (!isOwner) {
    return (
      <div className="bg-[#fbfdfe]">
        <div className="mx-auto flex min-h-[60vh] max-w-[560px] flex-col items-center justify-center px-5 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e8f4fc] text-accent-deep">
            <PackagePlus className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.02em] text-ink">
            Turn your stuff into income
          </h1>
          <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-gray-500">
            List the things you barely use — tools, cameras, gear — or offer a service. You set the
            price and approve every request.
          </p>
          <button
            onClick={() => void becomeOwner()}
            disabled={becoming}
            className="mt-6 flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[14.5px] font-bold text-white transition hover:bg-[#26282d] disabled:opacity-60"
          >
            {becoming && <Loader2 className="h-4 w-4 animate-spin" />}
            Become an owner — it's free
          </button>
        </div>
      </div>
    );
  }

  return <OwnerDashboard notify={notify} />;
}

/* ------------------------------ dashboard ------------------------------ */

function OwnerDashboard({ notify }: { notify: (t: string) => void }) {
  const [tab, setTab] = useState<"bookings" | "listings">("bookings");
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [bookings, setBookings] = useState<OwnerBooking[] | null>(null);
  const [listings, setListings] = useState<MyListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MyListing | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, b, l] = await Promise.all([
        api<OwnerStats>("/owner/stats"),
        api<{ items: OwnerBooking[] }>("/owner/bookings"),
        api<{ items: MyListing[] }>("/listings", { query: { scope: "mine", pageSize: 48 } }),
      ]);
      setStats(s);
      setBookings(b.items);
      setListings(l.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bookingAction = async (booking: OwnerBooking, action: "accept" | "reject" | "cancel" | "complete") => {
    setBusyId(booking.id);
    try {
      await api(`/bookings/${booking.id}/${action}`, { method: "POST" });
      notify(
        action === "accept" ? "Request confirmed" :
        action === "reject" ? "Request declined" :
        action === "complete" ? "Marked completed" : "Booking cancelled"
      );
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleListingStatus = async (listing: MyListing) => {
    setBusyId(listing.id);
    try {
      await api(`/listings/${listing.id}/status`, {
        method: "POST",
        body: { status: listing.status === "active" ? "paused" : "active" },
      });
      notify(listing.status === "active" ? `Paused “${listing.title}”` : `Published “${listing.title}”`);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Couldn't update the listing.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteListing = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await api(`/listings/${deleteTarget.id}`, { method: "DELETE" });
      notify(`Deleted “${deleteTarget.title}”`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Couldn't delete.");
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-[980px] px-5 py-16">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }

  const pending = (bookings ?? []).filter((b) => b.status === "pending");
  const rest = (bookings ?? []).filter((b) => b.status !== "pending");

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[1260px] px-5 py-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">Owner dashboard</h1>
            <p className="mt-1 text-[13.5px] font-medium text-gray-500">
              Real numbers from your real listings — no fluff.
            </p>
          </div>
          <Link
            to="/owner/new"
            className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-bold text-white transition hover:bg-[#26282d]"
          >
            <PackagePlus className="h-4 w-4" /> New listing
          </Link>
        </div>

        {/* stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "Total earnings", value: stats ? inr(stats.earningsTotal) : "—" },
            { label: "This month", value: stats ? inr(stats.earningsMonth) : "—" },
            { label: "Pending requests", value: stats ? String(stats.requestsPending) : "—" },
            { label: "Upcoming bookings", value: stats ? String(stats.upcoming) : "—" },
            { label: "Active listings", value: stats ? `${stats.listingsActive}/${stats.listingsTotal}` : "—" },
          ].map((card) => (
            <div key={card.label} className="rounded-3xl border border-gray-100 bg-white p-4 shadow-card">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-gray-400">{card.label}</p>
              <p className="mt-1.5 text-[24px] font-extrabold tracking-[-0.02em] text-ink">{card.value}</p>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div className="mt-7 flex gap-2">
          {(["bookings", "listings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "h-10 rounded-full border px-5 text-[13.5px] font-bold capitalize transition",
                tab === t
                  ? "border-ink bg-ink text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              )}
            >
              {t === "bookings" ? "Requests & bookings" : "My listings"}
            </button>
          ))}
        </div>

        {/* ------------------------- bookings tab ------------------------- */}
        {tab === "bookings" && (
          <div className="mt-5 space-y-6">
            {bookings === null ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-100" />
              ))}</div>
            ) : bookings.length === 0 ? (
              <EmptyState
                title="No booking requests yet"
                text="When someone requests one of your listings it'll land here. Share your listings to get the ball rolling."
                action={
                  <Link to="/owner/new" className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white">
                    Create a listing
                  </Link>
                }
              />
            ) : (
              <>
                {pending.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-amber-600">
                      Needs your answer ({pending.length})
                    </h2>
                    <ul className="space-y-3">
                      {pending.map((b) => (
                        <BookingRow
                          key={b.id} booking={b} busy={busyId === b.id}
                          actions={
                            <>
                              <button
                                onClick={() => void bookingAction(b, "accept")}
                                disabled={busyId === b.id}
                                className="flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-[12.5px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Accept
                              </button>
                              <button
                                onClick={() => void bookingAction(b, "reject")}
                                disabled={busyId === b.id}
                                className="flex h-9 items-center gap-1.5 rounded-full border border-rose-200 px-4 text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                              >
                                <XCircle className="h-4 w-4" /> Decline
                              </button>
                            </>
                          }
                        />
                      ))}
                    </ul>
                  </section>
                )}
                <section>
                  <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-gray-400">
                    {pending.length > 0 ? "Everything else" : "All bookings"}
                  </h2>
                  {rest.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-gray-200 px-5 py-7 text-[13px] font-medium text-gray-400">
                      Nothing here yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {rest.map((b) => (
                        <BookingRow
                          key={b.id} booking={b} busy={busyId === b.id}
                          actions={
                            <>
                              {b.status === "confirmed" && dayVal(b.startDate) <= todayVal() && (
                                <button
                                  onClick={() => void bookingAction(b, "complete")}
                                  disabled={busyId === b.id}
                                  className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white transition hover:bg-[#26282d] disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Complete
                                </button>
                              )}
                              {b.status === "confirmed" && (
                                <button
                                  onClick={() => void bookingAction(b, "cancel")}
                                  disabled={busyId === b.id}
                                  className="flex h-9 items-center gap-1.5 rounded-full border border-rose-200 px-4 text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              )}
                            </>
                          }
                        />
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* ------------------------- listings tab ------------------------- */}
        {tab === "listings" && (
          <div className="mt-5">
            {listings === null ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-3xl bg-gray-100" />
              ))}</div>
            ) : listings.length === 0 ? (
              <EmptyState
                title="You haven't listed anything yet"
                text="Your first listing takes about two minutes — title, price, a photo and you're live."
                action={
                  <Link to="/owner/new" className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white">
                    Create your first listing
                  </Link>
                }
              />
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {listings.map((l) => {
                  const Icon = categoryIcon(l.category?.icon ?? "Package");
                  return (
                    <li
                      key={l.id}
                      className="flex gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-card"
                    >
                      <button
                        onClick={() => navigate(`/listing/${l.id}`)}
                        className="h-24 w-32 shrink-0 overflow-hidden rounded-2xl bg-[#f3f4f6]"
                        aria-label={`View ${l.title}`}
                      >
                        {l.images[0] ? (
                          <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-[#e8f3fb] text-accent-deep">
                            <Icon className="h-7 w-7" />
                          </span>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-[15px] font-extrabold text-ink">{l.title}</h3>
                          <StatusBadge status={l.status} />
                        </div>
                        <p className="mt-0.5 text-[12.5px] font-medium text-gray-500">
                          {inr(l.price)} {l.unit === "job" ? "/ job" : "/ day"} · {l.city}
                          {l.ratingCount > 0 && ` · ★ ${l.ratingAvg.toFixed(1)} (${l.ratingCount})`}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate(`/listing/${l.id}`)}
                            className="flex h-8 items-center gap-1 rounded-full border border-gray-200 px-3 text-[12px] font-bold text-gray-600 transition hover:border-gray-300 hover:text-ink"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button
                            onClick={() => navigate(`/owner/edit/${l.id}`)}
                            className="flex h-8 items-center gap-1 rounded-full border border-gray-200 px-3 text-[12px] font-bold text-gray-600 transition hover:border-gray-300 hover:text-ink"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => void toggleListingStatus(l)}
                            disabled={busyId === l.id}
                            className="flex h-8 items-center gap-1 rounded-full border border-gray-200 px-3 text-[12px] font-bold text-gray-600 transition hover:border-gray-300 hover:text-ink disabled:opacity-60"
                          >
                            {l.status === "active" ? (
                              <><PauseCircle className="h-3.5 w-3.5" /> Pause</>
                            ) : (
                              <><PlayCircle className="h-3.5 w-3.5" /> Publish</>
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(l)}
                            className="flex h-8 items-center gap-1 rounded-full border border-rose-200 px-3 text-[12px] font-bold text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this listing?">
        <p className="text-[13.5px] leading-relaxed text-gray-500">
          “{deleteTarget?.title}” will be removed from search and can't be booked anymore. This
          only works when there are no upcoming bookings.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setDeleteTarget(null)}>Keep it</GhostButton>
          <button
            onClick={() => void deleteListing()}
            disabled={busyId === deleteTarget?.id}
            className="flex h-11 items-center gap-2 rounded-full bg-rose-600 px-6 text-[14px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {busyId === deleteTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleOff className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

function BookingRow({
  booking: b, actions, busy,
}: { booking: OwnerBooking; actions: React.ReactNode; busy: boolean }) {
  const Icon = categoryIcon(b.listing?.category?.icon ?? "Package");
  return (
    <li className={cn("flex flex-col gap-4 rounded-3xl border bg-white p-4 shadow-card sm:flex-row sm:items-center", b.status === "pending" ? "border-amber-200" : "border-gray-100")}>
      <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f3f4f6]">
        {b.listing?.images[0] ? (
          <img src={b.listing.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[#e8f3fb] text-accent-deep">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14.5px] font-extrabold text-ink">{b.listing?.title ?? "Removed listing"}</h3>
          <StatusBadge status={b.status} />
        </div>
        <p className="mt-1 text-[12.5px] font-medium text-gray-500">
          {fmtDateShort(b.startDate)} → {fmtDateShort(b.endDate)} · {b.days} {b.days > 1 ? "days" : "day"} ·
          from <span className="font-bold text-gray-700">{b.renter?.name ?? "renter"}</span> · {timeAgo(b.createdAt)}
        </p>
        <p className="mt-1 text-[13px] font-bold text-ink">
          Earn {inr(b.subtotal)} <span className="font-medium text-gray-400">(total {inr(b.total)} incl. fee)</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : actions}
      </div>
    </li>
  );
}

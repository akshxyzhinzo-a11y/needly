import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, Check, Heart, Loader2, MapPin, ShieldCheck, Store,
} from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { Link, navigate, useRoute } from "@/lib/router";
import { PLATFORM_FEE_RATE } from "@/server/config";
import { cn } from "@/utils/cn";
import {
  AccentButton, ErrorState, GhostButton, Stars, categoryIcon,
  fmtDate, inr, timeAgo, usePageTitle,
} from "@/components/ui";

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  unit: "day" | "job";
  kind: "rent" | "hire" | "service";
  city: string;
  area: string;
  images: string[];
  status: "active" | "paused" | "removed";
  ratingAvg: number;
  ratingCount: number;
  saved: boolean;
  mine: boolean;
  blockedDates: string[];
  owner: {
    id: string; name: string; avatarColor: string; city: string; area: string; memberSince: number;
  } | null;
  category: { id: string; label: string; icon: string } | null;
}

interface ReviewItem {
  id: string;
  rating: number;
  text: string;
  createdAt: number;
  author: { name: string; avatarColor: string } | null;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function addDayStr(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

export default function ListingPage({ notify }: { notify: (t: string) => void }) {
  const route = useRoute();
  const id = route.segments[1] ?? "";
  const { user } = useAuth();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [error, setError] = useState("");

  const [imageIdx, setImageIdx] = useState(0);
  const [startDate, setStartDate] = useState(localToday());
  const [days, setDays] = useState(2);
  const [note, setNote] = useState("");
  const [bookingState, setBookingState] = useState<"idle" | "busy" | "done">("idle");
  const [bookingError, setBookingError] = useState<{ msg: string; field?: string } | null>(null);

  usePageTitle(listing ? listing.title : "Listing");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await api<{ listing: ListingDetail }>(`/listings/${id}`);
      setListing(res.listing);
      setStatus("done");
      api<{ items: ReviewItem[] }>(`/listings/${id}/reviews`)
        .then((r) => setReviews(r.items))
        .catch(() => {});
      api<{ unavailable: string[] }>(`/listings/${id}/calendar`)
        .then((r) => setUnavailable(r.unavailable))
        .catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this listing.");
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    setBookingState("idle");
    void load();
  }, [load]);

  const blockedSet = useMemo(() => new Set(unavailable), [unavailable]);
  const chosenDays = listing?.unit === "job" ? 1 : days;

  const selectedBlocked = useMemo(() => {
    const hits: string[] = [];
    for (let i = 0; i < chosenDays; i++) {
      const d = addDayStr(startDate, i);
      if (blockedSet.has(d)) hits.push(d);
    }
    return hits;
  }, [startDate, chosenDays, blockedSet]);

  const price = useMemo(() => {
    if (!listing) return { subtotal: 0, fee: 0, total: 0 };
    const subtotal = listing.unit === "job" ? listing.price : listing.price * chosenDays;
    const fee = Math.round(subtotal * PLATFORM_FEE_RATE);
    return { subtotal, fee, total: subtotal + fee };
  }, [listing, chosenDays]);

  const toggleSave = async () => {
    if (!listing) return;
    if (!user) {
      notify("Log in to save listings");
      navigate("/login");
      return;
    }
    try {
      const res = await api<{ saved: boolean }>(`/favorites/${listing.id}`, { method: "POST" });
      setListing((l) => (l ? { ...l, saved: res.saved } : l));
      notify(res.saved ? "Saved to favourites" : "Removed from favourites");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't update favourites");
    }
  };

  const book = async () => {
    if (!listing || !user) return;
    setBookingError(null);
    setBookingState("busy");
    try {
      await api("/bookings", {
        method: "POST",
        body: { listingId: listing.id, startDate, days: chosenDays, note },
      });
      setBookingState("done");
      notify(`Request sent to ${listing.owner?.name ?? "the owner"}`);
    } catch (err) {
      setBookingState("idle");
      if (err instanceof ApiError) setBookingError({ msg: err.message, field: err.field });
      else setBookingError({ msg: "Couldn't create the booking. Try again." });
    }
  };

  const canSubmit =
    !!user &&
    !!listing &&
    listing.status === "active" &&
    !listing.mine &&
    startDate >= localToday() &&
    selectedBlocked.length === 0 &&
    bookingState !== "busy";

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-[1160px] animate-pulse px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <div className="aspect-[16/10] rounded-3xl bg-gray-100" />
            <div className="mt-5 h-7 w-2/3 rounded bg-gray-100" />
            <div className="mt-3 h-4 w-1/3 rounded bg-gray-100" />
          </div>
          <div className="h-[420px] rounded-3xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (status === "error" || !listing) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-16">
        <ErrorState message={error || "Listing not found."} onRetry={() => void load()} />
      </div>
    );
  }

  const Icon = categoryIcon(listing.category?.icon ?? "Package");
  const isService = listing.unit === "job";

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[1160px] px-5 py-7">
        <button
          onClick={() => navigate("/search")}
          className="mb-5 flex items-center gap-1.5 text-[13px] font-bold text-gray-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to results
        </button>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          {/* ------------------------------- main ------------------------------- */}
          <div>
            {listing.status === "paused" && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-700">
                <Store className="h-4 w-4" /> This listing is currently paused and isn't bookable.
              </div>
            )}

            <div className="relative overflow-hidden rounded-3xl bg-[#f3f4f6] shadow-card">
              {listing.images.length > 0 ? (
                <img
                  src={listing.images[Math.min(imageIdx, listing.images.length - 1)]}
                  alt={listing.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/10] w-full items-center justify-center bg-[linear-gradient(150deg,#eef6fc,#d5eaf8)]">
                  <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/90 text-accent-deep shadow-[0_16px_40px_-12px_rgba(30,110,160,0.4)]">
                    <Icon className="h-11 w-11" strokeWidth={1.6} />
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => void toggleSave()}
                aria-pressed={listing.saved}
                aria-label="Save to favourites"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-md transition hover:scale-110 hover:text-rose-500"
              >
                <Heart className={cn("h-[18px] w-[18px]", listing.saved && "fill-rose-500 text-rose-500")} />
              </button>
            </div>

            {listing.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {listing.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIdx(i)}
                    aria-label={`Photo ${i + 1}`}
                    className={cn(
                      "h-16 w-20 overflow-hidden rounded-xl border-2 transition",
                      i === imageIdx ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                {listing.kind === "service" ? "Service" : listing.kind === "hire" ? "Hire" : "Rent"}
              </span>
              {listing.category && (
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold text-gray-600">
                  {listing.category.label}
                </span>
              )}
              {listing.ratingCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold text-gray-600">
                  <Stars value={listing.ratingAvg} size={11} />
                  {listing.ratingAvg.toFixed(1)} ({listing.ratingCount})
                </span>
              )}
            </div>

            <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.02em] text-ink">
              {listing.title}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13.5px] font-medium text-gray-500">
              <MapPin className="h-4 w-4 text-accent-deep" />
              {listing.area ? `${listing.area}, ` : ""}{listing.city}
            </p>

            <div className="mt-5 whitespace-pre-line rounded-3xl border border-gray-100 bg-white p-5 text-[14.5px] leading-relaxed text-gray-600 shadow-card">
              {listing.description}
            </div>

            {/* Owner card */}
            {listing.owner && (
              <div className="mt-5 flex items-center justify-between rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
                <div className="flex items-center gap-3.5">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-extrabold text-white"
                    style={{ background: listing.owner.avatarColor }}
                  >
                    {listing.owner.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <p className="text-[15px] font-extrabold text-ink">{listing.owner.name}</p>
                    <p className="text-[12.5px] font-medium text-gray-400">
                      On Needly since {new Date(listing.owner.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      {listing.owner.area ? ` · ${listing.owner.area}` : ""}
                    </p>
                  </div>
                </div>
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11.5px] font-bold text-emerald-700 sm:flex">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified owner
                </span>
              </div>
            )}

            {/* Reviews */}
            <section className="mt-8" aria-label="Reviews">
              <h2 className="flex items-center gap-3 text-[18px] font-extrabold text-ink">
                Reviews
                {listing.ratingCount > 0 && (
                  <span className="flex items-center gap-2 text-[13px] font-bold text-gray-500">
                    <Stars value={listing.ratingAvg} /> {listing.ratingAvg.toFixed(1)} · {listing.ratingCount}{" "}
                    {listing.ratingCount === 1 ? "review" : "reviews"}
                  </span>
                )}
              </h2>
              {reviews.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-7 text-[13.5px] font-medium text-gray-400">
                  No reviews yet — completed renters can leave one after their booking.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                            style={{ background: r.author?.avatarColor ?? "#9ca3af" }}
                          >
                            {(r.author?.name ?? "?").slice(0, 1)}
                          </span>
                          <span className="text-[13.5px] font-bold text-ink">{r.author?.name ?? "Renter"}</span>
                        </div>
                        <span className="flex items-center gap-2 text-[11.5px] font-medium text-gray-400">
                          <Stars value={r.rating} size={12} /> {timeAgo(r.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2.5 text-[13.5px] leading-relaxed text-gray-600">{r.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ------------------------- booking sidebar ------------------------- */}
          <aside>
            <div className="sticky top-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_48px_-20px_rgba(10,35,60,0.22)]">
              <p className="flex items-baseline gap-1.5">
                <span className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">
                  {inr(listing.price)}
                </span>
                <span className="text-[13.5px] font-semibold text-gray-400">
                  {isService ? "fixed / job" : "per day"}
                </span>
              </p>

              {listing.mine ? (
                <div className="mt-5 rounded-2xl bg-[#f0f7fc] p-4 text-[13.5px] font-semibold text-accent-deep">
                  This is your listing.
                  <Link to="/owner" className="mt-2 inline-block font-bold underline underline-offset-2">
                    Manage it in your dashboard
                  </Link>
                </div>
              ) : bookingState === "done" ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="flex items-center gap-2 text-[14px] font-extrabold text-emerald-700">
                    <Check className="h-4 w-4" /> Request sent
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-emerald-700/80">
                    {listing.owner?.name ?? "The owner"} will confirm shortly — you'll get a
                    notification the moment they respond.
                  </p>
                  <Link
                    to="/bookings"
                    className="mt-3 inline-flex h-10 items-center rounded-full bg-emerald-600 px-5 text-[13px] font-bold text-white transition hover:bg-emerald-700"
                  >
                    Track my booking
                  </Link>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-600">
                      <CalendarDays className="h-3.5 w-3.5" /> {isService ? "Preferred date" : "Start date"}
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      min={localToday()}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setBookingError(null);
                      }}
                      className={cn(
                        "h-11 w-full rounded-xl border px-3.5 text-[14px] font-medium outline-none focus:border-accent",
                        selectedBlocked.length > 0 || bookingError?.field === "startDate"
                          ? "border-rose-300 bg-rose-50/40"
                          : "border-gray-200"
                      )}
                    />
                  </label>

                  {!isService && (
                    <label className="block">
                      <span className="mb-1.5 block text-[12.5px] font-bold text-gray-600">Rental days</span>
                      <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] font-medium outline-none focus:border-accent"
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d} {d === 1 ? "day" : "days"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] font-bold text-gray-600">
                      Note for {listing.owner?.name?.split(" ")[0] ?? "owner"} <span className="font-medium text-gray-400">(optional)</span>
                    </span>
                    <textarea
                      value={note}
                      maxLength={300}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Pickup time, what it's for…"
                      className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13.5px] font-medium outline-none placeholder:text-gray-400 focus:border-accent"
                    />
                  </label>

                  {selectedBlocked.length > 0 && (
                    <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-600">
                      {selectedBlocked.length === 1 ? fmtDate(selectedBlocked[0]) : `${selectedBlocked.length} days`}{" "}
                      in your selection {selectedBlocked.length === 1 ? "is" : "are"} already
                      booked or blocked — pick other dates.
                    </p>
                  )}
                  {bookingError && (
                    <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-rose-600">
                      {bookingError.msg}
                    </p>
                  )}

                  <div className="space-y-1.5 border-t border-dashed border-gray-200 pt-4 text-[13px] font-medium text-gray-500">
                    <p className="flex justify-between">
                      <span>
                        {inr(listing.price)} × {isService ? "1 job" : `${chosenDays} ${chosenDays > 1 ? "days" : "day"}`}
                      </span>
                      <span className="font-bold text-ink">{inr(price.subtotal)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Service fee</span>
                      <span className="font-bold text-ink">{inr(price.fee)}</span>
                    </p>
                    <p className="flex justify-between border-t border-gray-100 pt-2 text-[15px] font-extrabold text-ink">
                      <span>Total</span>
                      <span>{inr(price.total)}</span>
                    </p>
                    <p className="pt-1 text-[11.5px] text-gray-400">
                      Pay {listing.owner?.name?.split(" ")[0] ?? "the owner"} directly on pickup — Needly never holds your money until a payment partner is configured.
                    </p>
                  </div>

                  {user ? (
                    <AccentButton
                      className="w-full"
                      disabled={!canSubmit}
                      onClick={() => void book()}
                    >
                      {bookingState === "busy" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isService ? "Request this service" : "Request booking"}
                    </AccentButton>
                  ) : (
                    <GhostButton className="w-full" onClick={() => navigate("/login")}>
                      Log in to book
                    </GhostButton>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-gray-50 p-3.5 text-[11.5px] leading-relaxed text-gray-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />
                Availability is re-checked by the server when the owner confirms, so you can never
                book the same dates twice.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

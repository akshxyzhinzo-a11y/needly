import { useCallback, useEffect, useState } from "react";
import { CalendarDays, PackageCheck, Store, XCircle } from "lucide-react";
import { ApiError, api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { navigate } from "@/lib/router";
import { cn } from "@/utils/cn";
import {
  AccentButton, CardSkeleton, EmptyState, ErrorState, GhostButton, Modal,
  StarPicker, StatusBadge, categoryIcon, fmtDateShort, inr, timeAgo, usePageTitle,
} from "@/components/ui";

export interface BookingItem {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  subtotal: number;
  fee: number;
  total: number;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  paymentStatus: string;
  note: string;
  reviewedByRenter: boolean;
  createdAt: number;
  listing: {
    id: string;
    title: string;
    images: string[];
    price: number;
    unit: "day" | "job";
    category: { id: string; label: string; icon: string } | null;
  } | null;
  owner: { id: string; name: string; avatarColor: string } | null;
}

const TABS = [
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function todayVal(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayVal(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export default function BookingsPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("My bookings");
  const { user, booting } = useAuth();
  const [tab, setTab] = useState("");
  const [items, setItems] = useState<BookingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingItem | null>(null);
  const [reviewTarget, setReviewTarget] = useState<BookingItem | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    if (!booting && !user) navigate("/login?next=/bookings", { replace: true });
  }, [booting, user]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ items: BookingItem[] }>("/bookings/mine", {
        query: { status: tab },
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load bookings.");
    }
  }, [tab]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const runAction = async (booking: BookingItem, action: "cancel" | "complete") => {
    setActionId(booking.id);
    try {
      await api(`/bookings/${booking.id}/${action}`, { method: "POST" });
      notify(action === "cancel" ? "Booking cancelled" : "Marked as completed");
      setCancelTarget(null);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActionId(null);
    }
  };

  const submitReview = async () => {
    if (!reviewTarget?.listing) return;
    setActionId(reviewTarget.id);
    try {
      await api(`/listings/${reviewTarget.listing.id}/reviews`, {
        method: "POST",
        body: { bookingId: reviewTarget.id, rating, text: reviewText },
      });
      notify("Thanks — review published");
      setReviewTarget(null);
      setReviewText("");
      setRating(5);
      await load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Couldn't save the review.");
    } finally {
      setActionId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[980px] px-5 py-9">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">My bookings</h1>
        <p className="mt-1 text-[13.5px] font-medium text-gray-500">
          Requests you've sent and rentals in progress.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-9 rounded-full border px-4 text-[13px] font-bold transition",
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
          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : items === null ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Store}
              title={tab ? `No ${tab} bookings` : "No bookings yet"}
              text={
                tab
                  ? "Nothing in this bucket right now."
                  : "Find something nearby, pick your dates and send the owner a request — it takes a minute."
              }
              action={
                <button
                  onClick={() => navigate("/search")}
                  className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white"
                >
                  Browse listings
                </button>
              }
            />
          ) : (
            <ul className="space-y-3.5">
              {items.map((b) => {
                const Icon = categoryIcon(b.listing?.category?.icon ?? "Package");
                const canCancel = b.status === "pending" || b.status === "confirmed";
                const canComplete = b.status === "confirmed" && dayVal(b.startDate) <= todayVal();
                const canReview = b.status === "completed" && !b.reviewedByRenter;
                return (
                  <li
                    key={b.id}
                    className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-card sm:flex-row sm:items-center"
                  >
                    <button
                      onClick={() => b.listing && navigate(`/listing/${b.listing.id}`)}
                      className="h-20 w-full shrink-0 overflow-hidden rounded-2xl bg-[#f3f4f6] sm:w-28"
                      aria-label={b.listing ? `Open ${b.listing.title}` : "Listing unavailable"}
                    >
                      {b.listing?.images[0] ? (
                        <img src={b.listing.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-[#e8f3fb] text-accent-deep">
                          <Icon className="h-6 w-6" />
                        </span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-extrabold text-ink">
                          {b.listing?.title ?? "Listing removed"}
                        </h3>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {fmtDateShort(b.startDate)} → {fmtDateShort(b.endDate)} · {b.days}{" "}
                          {b.days > 1 ? "days" : "day"}
                        </span>
                        {b.owner && <span>with {b.owner.name}</span>}
                        <span className="text-gray-300">·</span>
                        <span>requested {timeAgo(b.createdAt)}</span>
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-ink">
                        {inr(b.total)}{" "}
                        <span className="font-medium text-gray-400">
                          ({inr(b.subtotal)} + {inr(b.fee)} fee ·{" "}
                          {b.paymentStatus === "collected" ? "paid on pickup" : "pay on pickup"})
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {canReview && (
                        <AccentButton
                          className="h-9 px-4 text-[12.5px]"
                          onClick={() => {
                            setReviewTarget(b);
                            setRating(5);
                            setReviewText("");
                          }}
                        >
                          Write a review
                        </AccentButton>
                      )}
                      {canComplete && (
                        <GhostButton
                          className="h-9 px-4 text-[12.5px]"
                          disabled={actionId === b.id}
                          onClick={() => void runAction(b, "complete")}
                        >
                          <PackageCheck className="h-4 w-4" /> Complete
                        </GhostButton>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => setCancelTarget(b)}
                          className="flex h-9 items-center gap-1.5 rounded-full border border-rose-200 px-4 text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-50"
                        >
                          <XCircle className="h-4 w-4" /> Cancel
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* cancel confirm */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel this booking?"
      >
        <p className="text-[13.5px] leading-relaxed text-gray-500">
          {cancelTarget?.listing?.title ?? "This booking"} ·{" "}
          {cancelTarget ? fmtDateShort(cancelTarget.startDate) : ""}. The owner will be notified
          and the dates will open up again.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={() => setCancelTarget(null)}>Keep it</GhostButton>
          <button
            onClick={() => cancelTarget && void runAction(cancelTarget, "cancel")}
            disabled={actionId === cancelTarget?.id}
            className="h-11 rounded-full bg-rose-600 px-6 text-[14px] font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            Cancel booking
          </button>
        </div>
      </Modal>

      {/* review modal */}
      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={`Review ${reviewTarget?.listing?.title ?? ""}`}
      >
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[12.5px] font-bold text-gray-600">Your rating</span>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-bold text-gray-600">
              How was it? <span className="font-medium text-gray-400">(min 10 characters)</span>
            </span>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Condition, pickup experience, would you rent again…"
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13.5px] font-medium outline-none placeholder:text-gray-400 focus:border-accent"
            />
          </label>
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setReviewTarget(null)}>Not now</GhostButton>
            <AccentButton
              disabled={reviewText.trim().length < 10 || actionId === reviewTarget?.id}
              onClick={() => void submitReview()}
            >
              Publish review
            </AccentButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

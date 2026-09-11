import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import ListingCard, { type CardListing } from "@/components/ListingCard";
import { CardSkeleton, EmptyState, ErrorState, usePageTitle } from "@/components/ui";
import { ApiError, api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { navigate } from "@/lib/router";

export default function SavedPage({ notify }: { notify: (t: string) => void }) {
  usePageTitle("Saved listings");
  const { user, booting } = useAuth();
  const [items, setItems] = useState<CardListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!booting && !user) navigate("/login?next=/saved", { replace: true });
  }, [booting, user]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ items: CardListing[] }>("/favorites");
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load saved listings.");
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const toggleSave = async (listing: CardListing) => {
    try {
      const res = await api<{ saved: boolean }>(`/favorites/${listing.id}`, { method: "POST" });
      if (!res.saved) {
        setItems((prev) => (prev ? prev.filter((l) => l.id !== listing.id) : prev));
        notify(`Removed “${listing.title}”`);
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : "Couldn't update favourites");
    }
  };

  if (!user) return null;

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[1260px] px-5 py-9">
        <h1 className="flex items-center gap-2.5 text-[26px] font-extrabold tracking-[-0.02em] text-ink">
          Saved listings
          <Heart className="h-5 w-5 fill-rose-100 text-rose-400" />
        </h1>
        <p className="mt-1 text-[13.5px] font-medium text-gray-500">
          Things you've saved for later.
        </p>

        <div className="mt-7">
          {error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : items === null ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Nothing saved yet"
              text="Tap the heart on any listing and it'll wait for you here — handy when you're comparing options."
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
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  hearted
                  onHeart={toggleSave}
                  delay={Math.min(i, 8) * 40}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

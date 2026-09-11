import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Heart } from "lucide-react";
import { api } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { Link, navigate } from "@/lib/router";
import { cn } from "@/utils/cn";
import { CardSkeleton, ErrorState, inr } from "./ui";
import type { CardListing } from "./ListingCard";

interface PopularProps {
  city: string;
  notify: (text: string) => void;
}

export default function Popular({ city, notify }: PopularProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<CardListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ items: CardListing[] }>("/listings/popular", {
        query: { city },
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load listings.");
    }
  }, [city]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  const toggleSave = async (listing: CardListing) => {
    if (!user) {
      notify("Log in to save listings you love");
      navigate("/login");
      return;
    }
    try {
      const res = await api<{ saved: boolean }>(`/favorites/${listing.id}`, {
        method: "POST",
      });
      setItems((prev) =>
        prev
          ? prev.map((l) => (l.id === listing.id ? { ...l, saved: res.saved } : l))
          : prev
      );
      notify(res.saved ? `Saved “${listing.title}”` : `Removed “${listing.title}”`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't update favourites");
    }
  };

  return (
    <section id="popular" className="scroll-mt-4 bg-white">
      <div className="mx-auto max-w-[1260px] px-5 pb-[16px] pt-[22px]">
        <div className="relative flex items-end justify-center">
          <div className="anim-fade-up text-center" style={{ animationDelay: "60ms" }}>
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">
              Popular near you
            </h2>
            <p className="mt-1.5 text-[13.5px] font-medium text-gray-500">
              See what people are renting and offering in your area.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="absolute bottom-0 right-0 hidden items-center gap-1.5 text-[13.5px] font-bold text-ink transition-colors hover:text-accent-deep sm:flex"
          >
            See all
            <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>

        {error ? (
          <div className="mt-6"><ErrorState message={error} onRetry={() => void load()} /></div>
        ) : items === null ? (
          <ul className="mt-[22px] grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-6" aria-label="Loading popular listings">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i}><CardSkeleton /></li>
            ))}
          </ul>
        ) : (
          <ul className="mt-[22px] grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-6">
            {items.map((listing, index) => (
              <li
                key={listing.id}
                className="group anim-fade-up cursor-pointer"
                style={{ animationDelay: `${80 + index * 50}ms` }}
                onClick={() => navigate(`/listing/${listing.id}`)}
              >
                <div className="relative overflow-hidden rounded-2xl bg-[#f3f4f6] shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_16px_32px_-14px_rgba(10,35,60,0.25)]">
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
                  />
                  <button
                    type="button"
                    aria-pressed={!!listing.saved}
                    aria-label={`Save ${listing.title} to favourites`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleSave(listing);
                    }}
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-sm backdrop-blur transition-transform duration-200 hover:scale-110 hover:text-rose-500 active:scale-95"
                  >
                    <Heart
                      className={cn(
                        "h-[15px] w-[15px] transition-colors",
                        listing.saved && "fill-rose-500 text-rose-500"
                      )}
                      strokeWidth={2.4}
                    />
                  </button>
                </div>

                <div className="mt-3 px-0.5">
                  <h3 className="truncate text-[14.5px] font-bold leading-snug text-ink">
                    <Link
                      to={`/listing/${listing.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {listing.title}
                    </Link>
                  </h3>
                  <p className="mt-[3px] flex items-baseline gap-1 text-[13px]">
                    <span className="font-extrabold text-ink">{inr(listing.price)}</span>
                    <span className="font-medium text-gray-400">/ day</span>
                    <span aria-hidden="true" className="text-gray-300">•</span>
                    <span className="font-medium text-gray-500">
                      {listing.category?.label ?? "Other"}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => navigate("/search")}
          className="mt-6 flex w-full items-center justify-center gap-1.5 text-[13.5px] font-bold text-ink sm:hidden"
        >
          See all
          <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
        </button>
      </div>
    </section>
  );
}

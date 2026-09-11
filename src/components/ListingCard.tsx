import { useState } from "react";
import { Heart, MapPin, Star } from "lucide-react";
import { Link, navigate } from "@/lib/router";
import { cn } from "@/utils/cn";
import { categoryIcon, inr } from "./ui";

/** Listing shape consumed by cards (matches the API DTO). */
export interface CardListing {
  id: string;
  title: string;
  price: number;
  unit: "day" | "job";
  kind: "rent" | "hire" | "service";
  city: string;
  area: string;
  images: string[];
  ratingAvg: number;
  ratingCount: number;
  saved?: boolean;
  category: { id: string; label: string; icon: string } | null;
}

const KIND_LABEL: Record<CardListing["kind"], string> = {
  rent: "Rent",
  hire: "Hire",
  service: "Service",
};

interface Props {
  listing: CardListing;
  onHeart?: (listing: CardListing) => void;
  hearted?: boolean;
  delay?: number;
}

export default function ListingCard({ listing, onHeart, hearted, delay = 0 }: Props) {
  const [popped, setPopped] = useState(false);
  const Icon = categoryIcon(listing.category?.icon ?? "Package");
  const unitSuffix = listing.unit === "job" ? " / job" : " / day";

  const handleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPopped(true);
    onHeart?.(listing);
  };

  return (
    <article
      className="group anim-fade-up cursor-pointer"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => navigate(`/listing/${listing.id}`)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#f3f4f6] shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_16px_32px_-14px_rgba(10,35,60,0.25)]">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[4/3] w-full items-center justify-center bg-[linear-gradient(150deg,#eef6fc_0%,#ddeef9_55%,#cfe6f6_100%)]"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/85 text-accent-deep shadow-[0_10px_26px_-10px_rgba(30,110,160,0.35)] transition-transform duration-500 group-hover:scale-110">
              <Icon className="h-7 w-7" strokeWidth={1.8} />
            </span>
          </div>
        )}

        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-wide text-gray-600 shadow-sm backdrop-blur">
          {KIND_LABEL[listing.kind]}
        </span>

        <button
          type="button"
          aria-pressed={!!hearted}
          aria-label={`Save ${listing.title} to favourites`}
          onClick={handleHeart}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-sm backdrop-blur transition-transform duration-200 hover:scale-110 hover:text-rose-500 active:scale-95"
        >
          <Heart
            className={cn(
              "h-[15px] w-[15px] transition-colors",
              hearted && "fill-rose-500 text-rose-500",
              popped && "heart-pop"
            )}
            strokeWidth={2.4}
          />
        </button>
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[14.5px] font-bold leading-snug text-ink">
            <Link to={`/listing/${listing.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              {listing.title}
            </Link>
          </h3>
          {listing.ratingCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-ink">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {listing.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-[3px] flex flex-wrap items-baseline gap-x-1 text-[13px]">
          <span className="font-extrabold text-ink">{inr(listing.price)}</span>
          <span className="font-medium text-gray-400">{unitSuffix}</span>
          <span aria-hidden="true" className="text-gray-300">•</span>
          <span className="font-medium text-gray-500">
            {listing.category?.label ?? KIND_LABEL[listing.kind]}
          </span>
        </p>
        <p className="mt-[2px] flex items-center gap-1 text-[11.5px] font-medium text-gray-400">
          <MapPin className="h-3 w-3" />
          {listing.area ? `${listing.area}, ` : ""}{listing.city}
        </p>
      </div>
    </article>
  );
}

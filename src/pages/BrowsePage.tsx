import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import ListingCard, { type CardListing } from "@/components/ListingCard";
import {
  CardSkeleton, EmptyState, ErrorState, Pagination, Select, usePageTitle,
} from "@/components/ui";
import { api, ApiError } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { navigate, useRoute } from "@/lib/router";
import { CITIES } from "@/data/site";
import { cn } from "@/utils/cn";

interface CategoryOption {
  id: string;
  label: string;
}

const KIND_TABS = [
  { id: "", label: "All" },
  { id: "rent", label: "Rent" },
  { id: "hire", label: "Hire" },
  { id: "service", label: "Services" },
];

interface BrowsePageProps {
  city: string;
  notify: (text: string) => void;
}

interface ListingResponse {
  items: CardListing[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 12;

export default function BrowsePage({ city, notify }: BrowsePageProps) {
  usePageTitle("Browse nearby");
  const route = useRoute();
  const { user } = useAuth();
  const queryString = route.query.toString();

  const params = useMemo(() => new URLSearchParams(queryString), [queryString]);

  const [q, setQ] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState(params.get("kind") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [filterCity, setFilterCity] = useState(params.get("city") ?? city);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "done"; data: ListingResponse }
  >({ status: "loading" });

  // Re-sync when arriving with new URL params (e.g. from the hero).
  useEffect(() => {
    setQ(params.get("q") ?? "");
    setKind(params.get("kind") ?? "");
    setCategory(params.get("category") ?? "");
    setFilterCity(params.get("city") ?? city);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    api<{ categories: { id: string; label: string }[] }>("/categories")
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await api<ListingResponse>("/listings", {
        query: {
          q, kind, category, city: filterCity,
          min: minPrice, max: maxPrice, sort,
          page, pageSize: PAGE_SIZE,
        },
      });
      setState({ status: "done", data });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof ApiError ? err.message : "Couldn't load listings.",
      });
    }
  }, [q, kind, category, filterCity, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200); // debounced
    return () => window.clearTimeout(t);
  }, [load]);

  const toggleSave = async (listing: CardListing) => {
    if (!user) {
      notify("Log in to save listings");
      navigate("/login");
      return;
    }
    try {
      const res = await api<{ saved: boolean }>(`/favorites/${listing.id}`, {
        method: "POST",
      });
      setState((prev) =>
        prev.status === "done"
          ? {
              status: "done",
              data: {
                ...prev.data,
                items: prev.data.items.map((l) =>
                  l.id === listing.id ? { ...l, saved: res.saved } : l
                ),
              },
            }
          : prev
      );
      notify(res.saved ? `Saved “${listing.title}”` : `Removed “${listing.title}”`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't update favourites");
    }
  };

  const activeFilterCount =
    (kind ? 1 : 0) + (category ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  return (
    <div className="bg-[#fbfdfe]">
      <div className="mx-auto max-w-[1260px] px-5 py-8">
        {/* Search + sort bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              void load();
            }}
            className="flex h-12 flex-1 items-center rounded-full border border-gray-200 bg-white pl-4 pr-1.5 shadow-card transition focus-within:border-accent/60"
          >
            <Search className="h-[18px] w-[18px] shrink-0 text-gray-400" />
            <label htmlFor="browse-q" className="sr-only">Search listings</label>
            <input
              id="browse-q"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search drills, cameras, tutors…"
              className="min-w-0 flex-1 bg-transparent px-3 text-[14px] font-medium text-ink outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="flex h-9 items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition hover:bg-[#26282d] active:scale-95"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <Select
              aria-label="Sort results"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-12 w-[190px] rounded-full"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Top rated</option>
            </Select>
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              className={cn(
                "flex h-12 items-center gap-2 rounded-full border px-4 text-[13.5px] font-semibold transition",
                showFilters
                  ? "border-accent/50 bg-[#f0f9fe] text-accent-deep"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-extrabold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Kind tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Listing type">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={kind === tab.id}
              onClick={() => {
                setKind(tab.id);
                setPage(1);
              }}
              className={cn(
                "h-9 rounded-full border px-4 text-[13px] font-bold transition",
                kind === tab.id
                  ? "border-ink bg-ink text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-ink"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-card sm:grid-cols-5">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-gray-500">Category</span>
              <Select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-gray-500">City</span>
              <Select
                value={filterCity}
                onChange={(e) => {
                  setFilterCity(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Everywhere</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-gray-500">Min ₹</span>
              <input
                type="number" min={0} value={minPrice} inputMode="numeric"
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="0"
                className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[14px] font-medium outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-gray-500">Max ₹</span>
              <input
                type="number" min={0} value={maxPrice} inputMode="numeric"
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="Any"
                className="h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[14px] font-medium outline-none focus:border-accent"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setQ(""); setKind(""); setCategory("");
                  setMinPrice(""); setMaxPrice(""); setSort("newest");
                  setFilterCity(city); setPage(1);
                  navigate("/search");
                }}
                className="h-11 w-full rounded-xl border border-gray-200 text-[13px] font-bold text-gray-500 transition hover:border-gray-300 hover:text-ink"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mt-6">
          {state.status === "done" && (
            <p className="mb-4 text-[13px] font-semibold text-gray-500" aria-live="polite">
              {state.data.total === 0
                ? "No matches"
                : `${state.data.total} ${state.data.total === 1 ? "listing" : "listings"}`}
              {filterCity ? ` · ${filterCity}` : " · everywhere"}
            </p>
          )}

          {state.status === "loading" ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4" aria-label="Loading listings">
              {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : state.status === "error" ? (
            <ErrorState message={state.message} onRetry={() => void load()} />
          ) : state.data.items.length === 0 ? (
            <EmptyState
              title="Nothing found here — yet"
              text="Try a different search term, widen your filters, or look in a nearby city. New listings appear every day."
              action={
                <button
                  onClick={() => {
                    setQ(""); setKind(""); setCategory("");
                    setMinPrice(""); setMaxPrice(""); setFilterCity("");
                    setPage(1);
                  }}
                  className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white"
                >
                  Show everything
                </button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {state.data.items.map((listing, i) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    hearted={!!listing.saved}
                    onHeart={toggleSave}
                    delay={Math.min(i, 8) * 40}
                  />
                ))}
              </div>
              <Pagination
                page={state.data.page}
                total={state.data.total}
                pageSize={state.data.pageSize}
                onPage={setPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES } from "../data/site";
import { cn } from "../utils/cn";
import CitySelect from "./CitySelect";
import { CurveArrow, Spark, Ticks, Underline } from "./Doodles";
import { navigate } from "@/lib/router";

interface HeroProps {
  city: string;
  onCity: (city: string) => void;
}

/** Homepage category row → real discovery routes. */
const CATEGORY_ROUTES: Record<string, string> = {
  all: "/search",
  rent: "/search?kind=rent",
  hire: "/search?kind=hire",
  services: "/search?kind=service",
  electronics: "/search?category=electronics",
  vehicles: "/search?category=vehicles",
  events: "/search?category=events",
  home: "/search?category=home-living",
  more: "/search",
};

export default function Hero({ city, onCity }: HeroProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const runSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    navigate(`/search${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="relative">
      {/* Handwritten annotation — left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[clamp(12px,3.5vw,96px)] top-[96px] hidden w-[210px] -rotate-[5deg] xl:block"
      >
        <p className="font-hand text-[27px] leading-[1.24] text-gray-600">
          Real people.
          <br />
          Real things.
          <br />
          <span className="relative inline-block">
            Near you.
            <Underline className="absolute -bottom-[3px] left-0 h-[11px] w-[104%]" />
          </span>
        </p>
        <CurveArrow className="absolute -right-[92px] top-[64px] h-[84px] w-[104px] rotate-[6deg]" />
      </div>

      {/* Handwritten annotation — right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[clamp(12px,3.5vw,96px)] top-[88px] hidden w-[190px] rotate-[4deg] xl:block"
      >
        <Ticks className="absolute -left-[30px] top-[6px] h-[22px] w-[30px] -rotate-[14deg]" />
        <p className="font-hand text-[27px] leading-[1.24] text-gray-600">
          A more
          <br />
          resourceful
          <br />
          <span className="relative inline-block">
            tomorrow.
            <Underline className="absolute -bottom-[3px] left-0 h-[11px] w-[104%]" delay={560} />
          </span>
        </p>
        <Spark className="absolute -right-[26px] bottom-[44px] h-[26px] w-[26px] rotate-[18deg]" delay={900} />
      </div>

      <div className="mx-auto max-w-[1260px] px-5 pt-[34px] text-center">
        {/* Headline */}
        <div className="anim-fade-up">
          <h1 className="relative mx-auto inline-block text-[38px] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[48px] lg:text-[56px]">
            <Spark
              className="absolute -left-[54px] -top-[12px] hidden h-[30px] w-[30px] -rotate-[16deg] md:block"
              delay={280}
            />
            <span className="block">Need it?</span>
            <span className="relative block">
              Find it nearby.
              <Spark
                className="absolute -right-[56px] top-[10px] hidden h-[34px] w-[34px] rotate-[14deg] md:block"
                delay={420}
              />
            </span>
          </h1>
        </div>

        <p
          className="anim-fade-up mt-3.5 text-[15.5px] font-medium text-gray-500"
          style={{ animationDelay: "90ms" }}
        >
          Rent, hire or get services from people around you.
        </p>

        {/* Search bar */}
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch();
          }}
          className="anim-fade-up mx-auto mt-[26px] flex h-[60px] max-w-[660px] items-center rounded-full border border-gray-200 bg-white py-[7px] pl-5 pr-[7px] shadow-bar transition-all focus-within:border-accent/60 focus-within:shadow-[0_14px_44px_-12px_rgba(48,184,239,0.4)]"
          style={{ animationDelay: "170ms" }}
        >
          <label htmlFor="hero-search" className="sr-only">
            What do you need?
          </label>
          <input
            id="hero-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="What do you need?"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-1 text-[15px] font-medium text-ink outline-none placeholder:font-medium placeholder:text-gray-400"
          />
          <span aria-hidden="true" className="mx-2 hidden h-[26px] w-px shrink-0 bg-gray-200 sm:block" />
          <CitySelect city={city} onPick={onCity} variant="inline" className="hidden shrink-0 sm:block" />
          <button
            type="submit"
            aria-label="Search"
            className="ml-1.5 flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all hover:bg-accent-deep active:scale-90"
          >
            <Search className="h-[19px] w-[19px]" strokeWidth={2.6} />
          </button>
        </form>

        {/* Category row */}
        <ul
          className="anim-fade-up mt-[24px] flex flex-wrap items-start justify-center gap-x-4 gap-y-5 sm:gap-x-[22px]"
          style={{ animationDelay: "250ms" }}
        >
          {CATEGORIES.map(({ id, label, icon: Icon }) => {
            const active = id === category;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setCategory(id);
                    navigate(CATEGORY_ROUTES[id]);
                  }}
                  className="group flex w-[78px] flex-col items-center gap-2.5"
                >
                  <span
                    className={cn(
                      "flex h-[54px] w-[54px] items-center justify-center rounded-full border transition-all duration-200",
                      active
                        ? "border-accent bg-accent text-white shadow-[0_12px_22px_-6px_rgba(48,184,239,0.6)]"
                        : "border-gray-200 bg-white text-gray-500 hover:-translate-y-[3px] hover:border-accent/50 hover:text-accent-deep"
                    )}
                  >
                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[12.5px] font-semibold transition-colors",
                      active ? "text-ink" : "text-gray-500 group-hover:text-ink"
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pale blue city & mountain panorama */}
      <div aria-hidden="true" className="pointer-events-none relative mt-[14px] h-[124px] sm:h-[128px]">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#edf5fc] to-[#e6f1fa]" />
        <img
          src="/images/skyline.jpg"
          alt=""
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover object-bottom opacity-95 [mask-image:linear-gradient(to_top,black_58%,rgba(0,0,0,0.45)_80%,transparent_100%)]"
        />
      </div>
    </section>
  );
}

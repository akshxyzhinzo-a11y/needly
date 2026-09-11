import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { CITIES } from "../data/site";
import { cn } from "../utils/cn";

interface CitySelectProps {
  city: string;
  onPick: (city: string) => void;
  variant?: "pill" | "inline";
  className?: string;
}

export default function CitySelect({
  city,
  onPick,
  variant = "pill",
  className,
}: CitySelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Location: ${city}. Change location`}
        onClick={() => setOpen((value) => !value)}
        className={
          variant === "pill"
            ? "flex h-[40px] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-[13.5px] font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 active:scale-[.98]"
            : "flex h-[46px] items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink transition-colors hover:bg-gray-100 active:scale-[.98]"
        }
      >
        <MapPin
          className="h-[15px] w-[15px] shrink-0 text-accent"
          strokeWidth={2.5}
        />
        <span className="whitespace-nowrap">{city}</span>
        <ChevronDown
          className={cn(
            "h-[15px] w-[15px] shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={2.5}
        />
      </button>

      <div
        role="listbox"
        aria-label="Choose your city"
        className={cn(
          "absolute right-0 top-[calc(100%+8px)] z-[70] w-48 origin-top-right rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_20px_48px_-14px_rgba(6,30,55,0.28)] transition-all duration-150",
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-1 scale-[.97] opacity-0"
        )}
      >
        {CITIES.map((option) => (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={option === city}
            onClick={() => {
              onPick(option);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-gray-50",
              option === city ? "text-accent-deep" : "text-gray-600"
            )}
          >
            {option}
            {option === city && (
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

import { useEffect, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import {
  AlertCircle, Armchair, Car, CheckCircle2, ChevronLeft, ChevronRight,
  Package, PartyPopper, SearchX, Star, Tv, Wrench, type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";

/* ------------------------------ formatting ------------------------------ */

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function fmtDate(dayStr: string): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function fmtDateShort(dayStr: string): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} — Needly`;
    return () => {
      document.title = "Needly — Need it? Find it nearby.";
    };
  }, [title]);
}

/* ------------------------------ icon resolve ------------------------------ */

const ICONS: Record<string, LucideIcon> = {
  Wrench, Tv, Car, PartyPopper, Armchair, Package,
};

export function categoryIcon(name: string): LucideIcon {
  return ICONS[name] ?? Package;
}

/* -------------------------------- buttons -------------------------------- */

export function PrimaryButton({
  className, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[14px] font-semibold text-white transition-all hover:bg-[#26282d] active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  className, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-[14px] font-semibold text-ink transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function AccentButton({
  className, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[14px] font-bold text-white transition-all hover:bg-accent-deep active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------- fields -------------------------------- */

const inputBase =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:bg-gray-50";

export function Field({
  label, error, hint, children,
}: { label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold text-gray-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 flex items-center gap-1 text-[12.5px] font-medium text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-gray-400">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(inputBase, "h-auto min-h-[110px] resize-y py-2.5 leading-relaxed", props.className)}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(inputBase, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239ca3af%22 stroke-width=%222.5%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[position:right_14px_center] bg-no-repeat pr-9", props.className)}
    />
  );
}

/* --------------------------------- stars --------------------------------- */

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[2px]", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Choose a rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} star${i > 1 ? "s" : ""}`}
          className="rounded p-0.5 transition-transform hover:scale-110">
          <Star className={cn("h-7 w-7", i <= value ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200")} />
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- badge --------------------------------- */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-sky-50 text-sky-700 border-sky-200",
  rejected: "bg-rose-50 text-rose-600 border-rose-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-gray-100 text-gray-500 border-gray-200",
  suspended: "bg-rose-50 text-rose-600 border-rose-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] font-bold capitalize",
      STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
    )}>
      {status}
    </span>
  );
}

/* --------------------------------- modal --------------------------------- */

export function Modal({
  open, onClose, title, children, width = "max-w-md",
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#0a1626]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("toast-in relative w-full rounded-3xl bg-white p-6 shadow-[0_30px_80px_-20px_rgba(2,15,35,0.4)]", width)}>
        <h2 className="text-[18px] font-extrabold tracking-[-0.01em] text-ink">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* ----------------------------- loading states ----------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-label="Loading" />
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] rounded-2xl bg-gray-100" />
      <div className="mt-3 h-4 w-3/4 rounded bg-gray-100" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
    </div>
  );
}

export function EmptyState({
  icon: Icon = SearchX, title, text, action,
}: { icon?: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f7fc] text-accent-deep">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-[16px] font-extrabold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-gray-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-rose-100 bg-rose-50/50 px-6 py-12 text-center">
      <AlertCircle className="h-6 w-6 text-rose-500" />
      <p className="mt-3 text-[14px] font-semibold text-rose-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 text-[13px] font-bold text-accent-deep underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

/* ------------------------------ pagination ------------------------------ */

export function Pagination({
  page, total, pageSize, onPage,
}: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-accent hover:text-accent-deep disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p} onClick={() => onPage(p)} aria-current={p === page ? "page" : undefined}
          className={cn(
            "h-9 w-9 rounded-full text-[13px] font-bold transition-colors",
            p === page ? "bg-ink text-white" : "border border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-accent hover:text-accent-deep disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

/* --------------------------------- notice --------------------------------- */

export function InlineNotice({ kind, text }: { kind: "success" | "error"; text: string }) {
  return (
    <p className={cn(
      "flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[13px] font-medium leading-relaxed",
      kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-600"
    )}>
      {kind === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      {text}
    </p>
  );
}

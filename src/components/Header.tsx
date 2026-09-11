import { useEffect, useRef, useState } from "react";
import {
  Bell, ChevronDown, Heart, LayoutDashboard, LogOut, Package,
  ScrollText, Shield, UserRound,
} from "lucide-react";
import CitySelect from "./CitySelect";
import { useAuth } from "@/lib/auth-context";
import { Link, navigate, useRoute } from "@/lib/router";
import { api } from "@/lib/client";
import { cn } from "@/utils/cn";
import { timeAgo } from "./ui";

interface HeaderProps {
  city: string;
  onCity: (city: string) => void;
  notify: (text: string) => void;
}

interface NotificationItem {
  id: string;
  type: string;
  text: string;
  link: string;
  read: boolean;
  createdAt: number;
}

const navButtonClass =
  "text-[14px] font-semibold text-gray-500 transition-colors hover:text-ink";

export default function Header({ city, onCity, notify }: HeaderProps) {
  const { user, logout } = useAuth();
  const route = useRoute();

  const goHow = () => {
    const scroll = () =>
      document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
    if (route.path === "/") scroll();
    else {
      navigate("/");
      window.setTimeout(scroll, 120);
    }
  };

  return (
    <header className="relative z-40 border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1260px] items-center justify-between px-5">
        <div className="flex items-center gap-9">
          <Link
            to="/"
            aria-label="Needly — home"
            className="flex select-none items-end gap-[3px]"
          >
            <span className="text-[27px] font-extrabold leading-none tracking-[-0.03em] text-ink">
              Needly
            </span>
            <span className="mb-[4px] block h-[7px] w-[7px] rounded-full bg-accent" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            <button type="button" onClick={() => navigate("/search")} className={navButtonClass}>
              Browse
            </button>
            <button type="button" onClick={goHow} className={navButtonClass}>
              How it works
            </button>
            <button
              type="button"
              onClick={() => navigate("/owner")}
              className={navButtonClass}
            >
              For Owners
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <CitySelect city={city} onPick={onCity} variant="pill" className="hidden sm:block" />
          {user ? (
            <>
              <NotificationBell notify={notify} />
              <AccountMenu
                name={user.name}
                email={user.email}
                color={user.avatarColor}
                roles={user.roles}
                onLogout={async () => {
                  await logout();
                  notify("Logged out — see you soon");
                  navigate("/");
                }}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="hidden h-[42px] items-center rounded-full px-3.5 text-[14px] font-semibold text-ink transition-colors hover:bg-gray-100 sm:flex"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="flex h-[42px] items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white transition-all hover:bg-[#26282d] active:scale-[.97]"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------- notifications bell ------------------------- */

function NotificationBell({ notify }: { notify: (t: string) => void }) {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    api<{ items: NotificationItem[]; unread: number }>("/notifications")
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setUnread(res.unread);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [route.path, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAll = async () => {
    try {
      await api("/notifications/read", { method: "POST", body: { all: true } });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't update notifications");
    }
  };

  const openItem = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.read) {
      try {
        await api("/notifications/read", { method: "POST", body: { ids: [n.id] } });
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnread((u) => Math.max(0, u - 1));
      } catch {}
    }
    if (n.link) navigate(n.link.replace(/^#/, ""));
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <Bell className="h-[19px] w-[19px]" strokeWidth={2.2} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <div
        className={cn(
          "absolute right-0 top-[calc(100%+10px)] z-[70] w-[340px] origin-top-right rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_24px_60px_-16px_rgba(6,30,55,0.3)] transition-all duration-150",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-[.97] opacity-0"
        )}
      >
        <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1.5">
          <span className="text-[13.5px] font-extrabold text-ink">Notifications</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-[12px] font-bold text-accent-deep hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-2.5 py-8 text-center text-[12.5px] font-medium text-gray-400">
              Nothing yet — booking updates will land here.
            </p>
          ) : (
            items.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => void openItem(n)}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-gray-200" : "bg-accent")} />
                <span>
                  <span className={cn("block text-[12.5px] leading-snug", n.read ? "font-medium text-gray-500" : "font-semibold text-ink")}>
                    {n.text}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ account menu ------------------------------ */

function AccountMenu({
  name, email, color, roles, onLogout,
}: { name: string; email: string; color: string; roles: string[]; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-ink";

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full p-1 pr-2 transition-colors hover:bg-gray-100"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
          style={{ background: color }}
        >
          {initials}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      <div
        className={cn(
          "absolute right-0 top-[calc(100%+10px)] z-[70] w-60 origin-top-right rounded-2xl border border-gray-100 bg-white p-1.5 shadow-[0_24px_60px_-16px_rgba(6,30,55,0.3)] transition-all duration-150",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-[.97] opacity-0"
        )}
      >
        <div className="border-b border-gray-100 px-3 pb-2.5 pt-2">
          <p className="truncate text-[13.5px] font-extrabold text-ink">{name}</p>
          <p className="truncate text-[12px] text-gray-400">{email}</p>
        </div>
        <div className="pt-1.5">
          <button className={item} onClick={() => go("/profile")}>
            <UserRound className="h-4 w-4" /> Profile
          </button>
          <button className={item} onClick={() => go("/bookings")}>
            <ScrollText className="h-4 w-4" /> My bookings
          </button>
          <button className={item} onClick={() => go("/saved")}>
            <Heart className="h-4 w-4" /> Saved listings
          </button>
          <button className={item} onClick={() => go("/owner")}>
            {roles.includes("owner") ? (
              <LayoutDashboard className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            {roles.includes("owner") ? "Owner dashboard" : "Become an owner"}
          </button>
          {roles.includes("admin") && (
            <button className={item} onClick={() => go("/admin")}>
              <Shield className="h-4 w-4" /> Admin panel
            </button>
          )}
          <div className="my-1.5 h-px bg-gray-100" />
          <button className={cn(item, "text-rose-600 hover:bg-rose-50 hover:text-rose-600")} onClick={onLogout}>
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}

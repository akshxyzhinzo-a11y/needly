/**
 * Minimal hash router — every app state has a deep-linkable URL and the app
 * works when deployed as a static file (no server rewrites required).
 */
import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface Route {
  path: string; // "/listing/lst_drill"
  segments: string[];
  query: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: new URLSearchParams(queryPart ?? ""),
  };
}

let listeners: (() => void)[] = [];

export function navigate(to: string, opts?: { replace?: boolean }): void {
  const target = to.startsWith("#") ? to : `#${to}`;
  if (opts?.replace) {
    window.location.replace(target);
    notifyRoute();
  } else if (window.location.hash !== target) {
    window.location.hash = target;
  } else {
    notifyRoute();
  }
}

function notifyRoute(): void {
  listeners.forEach((fn) => fn());
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const update = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    listeners.push(update);
    window.addEventListener("hashchange", update);
    return () => {
      listeners = listeners.filter((fn) => fn !== update);
      window.removeEventListener("hashchange", update);
    };
  }, []);
  return route;
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, className, ...rest }: LinkProps) {
  return (
    <a href={`#${to}`} className={cn(className)} {...rest}>
      {children}
    </a>
  );
}

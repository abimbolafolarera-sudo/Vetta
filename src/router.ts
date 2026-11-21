import { useEffect, useState } from "react";

// One router for two homes:
//  - the real site uses clean paths (/apply, /brands/beauty, /c/amara)
//  - the preview link uses plain hashes (#apply, #brands-beauty, #c-amara)
export const HASH_MODE = !!import.meta.env.VITE_HASH_ROUTER;

export type Route = { page: string; arg?: string };

function parse(): Route {
  if (HASH_MODE) {
    const h = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!h) return { page: "home" };
    const i = h.indexOf("-");
    return i === -1 ? { page: h } : { page: h.slice(0, i), arg: h.slice(i + 1) };
  }
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (!parts.length) return { page: "home" };
  return { page: parts[0], arg: parts[1] ? decodeURIComponent(parts[1]) : undefined };
}

export function href(page: string, arg?: string) {
  if (HASH_MODE) return page === "home" ? "#" : `#${page}${arg ? "-" + arg : ""}`;
  return page === "home" ? "/" : `/${page}${arg ? "/" + encodeURIComponent(arg) : ""}`;
}

export function go(page: string, arg?: string) {
  const to = href(page, arg);
  if (HASH_MODE) {
    window.location.hash = to === "#" ? "" : to;
  } else {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new Event("vetta:nav"));
  }
  window.scrollTo(0, 0);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
    };
    window.addEventListener("hashchange", on);
    window.addEventListener("popstate", on);
    window.addEventListener("vetta:nav", on);
    return () => {
      window.removeEventListener("hashchange", on);
      window.removeEventListener("popstate", on);
      window.removeEventListener("vetta:nav", on);
    };
  }, []);
  useEffect(() => {
    if (HASH_MODE) window.scrollTo(0, 0);
  }, [route.page, route.arg]);
  return route;
}

// Intercept plain in-app links in path mode so pages switch without a reload.
export function onLinkClick(e: React.MouseEvent<HTMLAnchorElement>) {
  if (HASH_MODE) return;
  const a = e.currentTarget;
  const url = a.getAttribute("href") || "";
  if (!url.startsWith("/") || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  e.preventDefault();
  window.history.pushState({}, "", url);
  window.dispatchEvent(new Event("vetta:nav"));
  window.scrollTo(0, 0);
}

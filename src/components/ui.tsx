import React, { useEffect, useState } from "react";
import { href, onLinkClick } from "../router";
import type { Profile } from "../lib/types";

export function A(props: { page: string; arg?: string; className?: string; children: React.ReactNode; ariaLabel?: string; ariaCurrent?: boolean; title?: string }) {
  return (
    <a href={href(props.page, props.arg)} onClick={onLinkClick} className={props.className} title={props.title}
      aria-label={props.ariaLabel} aria-current={props.ariaCurrent ? "page" : undefined}>{props.children}</a>
  );
}

/** The verified-tick V: white tick in a violet rounded square. Draws itself on load. */
export function Mark({ size = 30, draw = false }: { size?: number; draw?: boolean }) {
  return (
    <svg className={`mark ${draw ? "mark--draw" : ""}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="var(--brand)" />
      <path className="mark__tick" d="M17 32.5 L28 44 L48 19.5" fill="none" stroke="var(--on-brand)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" pathLength={100} />
    </svg>
  );
}

export function Logo({ draw = false }: { draw?: boolean }) {
  return <span className="logo"><Mark size={30} draw={draw} /><span className="logo__word">vetta</span></span>;
}

export function Verified({ size = 16 }: { size?: number }) {
  return (
    <svg className="verified" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Vetted">
      <circle cx="12" cy="12" r="11" fill="var(--brand)" />
      <path d="M7 12.3 L10.5 15.6 L17.2 8.6" fill="none" stroke="var(--on-brand)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PAL = [["var(--brand)", "var(--accent)", "var(--feature)"], ["var(--accent)", "var(--brand)", "var(--feature)"], ["var(--brand-hi)", "var(--surface-2)", "var(--feature)"],
  ["var(--brand)", "var(--surface)", "var(--feature)"], ["var(--accent)", "var(--brand-hi)", "var(--feature)"], ["var(--surface-2)", "var(--brand)", "var(--feature)"]];
/** Generative, animated art used where there's no photo or video yet. No stock media anywhere. */
export function Art({ seed, className = "", children, style }: { seed: string; className?: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const p = PAL[h % PAL.length];
  return (
    <div className={`art ${className}`} style={{ ...style, ["--a" as any]: p[0], ["--b" as any]: p[1], ["--c" as any]: p[2], ["--x" as any]: `${(h % 60) + 10}%`, ["--y" as any]: `${((h >> 4) % 60) + 10}%` }}>
      <span className="art__b1" /><span className="art__b2" />{children}
    </div>
  );
}

export function Avatar({ p, size = 40 }: { p?: Pick<Profile, "avatar_url" | "display_name" | "handle"> | null; size?: number }) {
  if (!p) return <span className="avatar avatar--empty" style={{ width: size, height: size }} />;
  if (p.avatar_url) return <img className="avatar" src={p.avatar_url} alt="" style={{ width: size, height: size }} />;
  const ini = p.display_name.split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  return <Art seed={p.handle} className="avatar" style={{ width: size, height: size }}><span className="avatar__ini" style={{ fontSize: size * 0.38 }}>{ini}</span></Art>;
}

export function Field(props: { label: string; hint?: string; error?: string; children: React.ReactNode; optional?: boolean; id?: string }) {
  return (
    <div className={`field ${props.error ? "has-error" : ""}`}>
      <label htmlFor={props.id}>{props.label}{props.optional && <span className="field__opt"> (optional)</span>}</label>
      {props.hint && <p className="field__hint">{props.hint}</p>}
      {props.children}
      {props.error && <p className="field__err" role="alert">{props.error}</p>}
    </div>
  );
}

export function Chips(props: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; max?: number; name: string }) {
  const toggle = (v: string) => {
    const has = props.value.includes(v);
    if (!has && props.max === 1) return props.onChange([v]);
    if (!has && props.max && props.value.length >= props.max) return;
    props.onChange(has ? props.value.filter((x) => x !== v) : [...props.value, v]);
  };
  return (
    <div className="chips" role="group" aria-label={props.name}>
      {props.options.map((o) => (
        <button type="button" key={o.value} className={`chip ${props.value.includes(o.value) ? "is-on" : ""}`} aria-pressed={props.value.includes(o.value)} onClick={() => toggle(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return <p className="loading" aria-live="polite"><span className="spinner" />{label}</p>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head"><h2 className="h3">{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        {children}
      </div>
    </div>
  );
}

let toastSet: ((s: string) => void) | null = null;
export function toast(msg: string) { toastSet?.(msg); }
export function Toaster() {
  const [msg, setMsg] = useState("");
  useEffect(() => { toastSet = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2600); }; return () => { toastSet = null; }; }, []);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export async function share(url: string, text: string) {
  try { if ((navigator as any).share) { await (navigator as any).share({ url, text }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast("Link copied"); } catch { toast("Copy the link from the address bar"); }
}

export function formatDate(iso: string) {
  try { return new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch { return iso; }
}
export function timeAgo(iso: string) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`; return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
export const compact = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(n);

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const p: Record<string, React.ReactNode> = {
    home: <path d="M4 11 L12 4 L20 11 V20 H14.5 V14 H9.5 V20 H4 Z" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
    explore: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
    tasks: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M8.5 13l2.5 2.5L16 10.5" /></>,
    inbox: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z" /></>,
    user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" /></>,
    brands: <><path d="M4 8h16l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H6.7a1.5 1.5 0 0 1-1.5-1.3Z" /><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    heart: <path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
    share: <><path d="M14 5l6 6-6 6" /><path d="M20 11H11a7 7 0 0 0-7 7" /></>,
    bookmark: <path d="M6.5 4h11v16l-5.5-4-5.5 4Z" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
    upload: <><path d="M12 16V5M7 9.5L12 4.5l5 5" /><path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" /></>,
    shield: <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z" />,
    flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
    send: <path d="M4 12l16-8-6 16-2.5-6.5z" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    sound: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
    mute: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
    more: <><circle cx="5.5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18.5" cy="12" r="1.5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
    moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
    grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
    link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
    logout: <><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 16l-4-4 4-4M6 12h10" /></>,
    up: <path d="M6 14l6-6 6 6" />, down: <path d="M6 10l6 6 6-6" />, back: <path d="M15 5l-7 7 7 7" />,
    lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
    earn: <><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.9-2.8 2.1 0 2.9 5.8 1.5 5.8 4.3 0 1.2-1.3 2.1-3 2.1-1.4 0-2.6-.6-3.1-1.6M12 6v1.8M12 16.3V18" /></>,
    learn: <><path d="M3 8.5L12 4l9 4.5-9 4.5z" /><path d="M7 10.5v4.2c0 1.3 2.2 2.8 5 2.8s5-1.5 5-2.8v-4.2" /><path d="M21 8.5v5" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    file: <><path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7z" /><path d="M14 3v4h4" /></>,
    star: <path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.5L12 16l-5 2.9 1.2-5.5L4 9.6l5.6-.6z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>
  );
}

export function useNow(ms = 1000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

export function Countdown({ to }: { to: string }) {
  const now = useNow(); const diff = Math.max(0, new Date(to).getTime() - now);
  if (!diff) return <span className="countdown">Entries closed</span>;
  const c: [number, string][] = [[Math.floor(diff / 864e5), "days"], [Math.floor(diff / 36e5) % 24, "hrs"], [Math.floor(diff / 6e4) % 60, "min"], [Math.floor(diff / 1e3) % 60, "sec"]];
  return <span className="countdown" role="timer">{c.map(([v, l]) => <span key={l}><b>{String(v).padStart(2, "0")}</b><small>{l}</small></span>)}</span>;
}

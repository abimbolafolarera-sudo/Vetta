import { useEffect, useRef, useState } from "react";
import { Art } from "./ui";
import type { Video } from "../lib/types";

/** Plays a Vetta video. HLS streams (Cloudflare Stream) use hls.js where the browser needs it. */
export function Player({ v, active, muted, onTap, fit = "cover" }: { v: Video; active: boolean; muted: boolean; onTap?: () => void; fit?: "cover" | "contain" }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current; const url = v.playback_url; if (!el || !url) return;
    let hls: any = null; let cancelled = false;
    if (url.includes(".m3u8") && !el.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) { setFailed(true); return; }
        hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 10 }); hls.loadSource(url); hls.attachMedia(el);
        hls.on(Hls.Events.ERROR, (_: any, d: any) => d.fatal && setFailed(true));
      });
    } else { el.src = url; }
    return () => { cancelled = true; hls?.destroy(); };
  }, [v.playback_url]);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.muted = muted;
    if (active) el.play().catch(() => {}); else { el.pause(); }
  }, [active, muted]);

  if (!v.playback_url || failed) return <PreviewVideo v={v} active={active} onTap={onTap} />;
  return (
    <video ref={ref} className={`player player--${fit}`} loop playsInline muted={muted} preload={active ? "auto" : "metadata"}
      poster={v.thumbnail_url ?? undefined} onClick={onTap} aria-label={v.caption || "Video"} />
  );
}

/** Stand-in for sample and processing videos: animated, generated in code. */
export function PreviewVideo({ v, active, onTap }: { v: Video; active: boolean; onTap?: () => void }) {
  return (
    <Art seed={v.id + v.owner_id} className={`pv ${active ? "is-on" : ""}`}>
      <button className="pv__tap" onClick={onTap} aria-label="Pause or play" />
      <div className="pv__eq" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.13}s` }} />)}</div>
      <p className="pv__label">{v.status === "processing" ? "Processing your video…" : v.sample ? "Portfolio video" : "Video unavailable"}</p>
    </Art>
  );
}

export function Thumb({ v }: { v: Video }) {
  if (v.thumbnail_url) return <img className="thumb__img" src={v.thumbnail_url} alt="" loading="lazy" />;
  if (v.playback_url && !v.playback_url.includes(".m3u8")) return <video className="thumb__img" src={v.playback_url + "#t=0.5"} muted playsInline preload="metadata" />;
  return <Art seed={v.id + v.owner_id} className="thumb__img" />;
}

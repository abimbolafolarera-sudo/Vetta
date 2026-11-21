import { useEffect, useMemo, useRef, useState } from "react";
import { A, Avatar, Countdown, Icon, Loading, Mark, Sheet, Verified, compact, share, toast } from "../components/ui";
import { Player } from "../components/Video";
import { EARN, config, nicheName, TASK_TYPES } from "../config";
import { feedVideos, getProfilesByIds, myLikes, toggleLike } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Profile, Video } from "../lib/types";
import { go, href } from "../router";
import { ReportSheet, SaveSheet } from "./Shared";

type Item = { kind: "house"; key: string } | { kind: "video"; v: Video };
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function Feed() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [owners, setOwners] = useState<Record<string, Profile>>({});
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [saveFor, setSaveFor] = useState<Profile | null>(null);
  const [reportFor, setReportFor] = useState<Video | null>(null);
  const [hint, setHint] = useState(() => { try { return !localStorage.getItem("vetta-swiped"); } catch { return true; } });
  useEffect(() => { if (active > 0 && hint) { setHint(false); try { localStorage.setItem("vetta-swiped", "1"); } catch {} } }, [active]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedVideos().then(async (vs) => { setVideos(vs); setOwners(await getProfilesByIds(vs.map((v) => v.owner_id))); }).catch(() => setVideos([]));
  }, []);
  useEffect(() => { myLikes().then(setLikes).catch(() => {}); }, [user?.id]);

  const items: Item[] = useMemo(() => {
    const vs = (videos ?? []).map((v) => ({ kind: "video" as const, v }));
    const out: Item[] = [{ kind: "house", key: "drop" }];
    vs.forEach((x, i) => { out.push(x); if (i === 1) out.push({ kind: "house", key: "tasks" }); if (i === 4) out.push({ kind: "house", key: "learn" }); if (i === 6) out.push({ kind: "house", key: "brands" }); });
    if (vs.length < 2) out.push({ kind: "house", key: "tasks" });
    if (vs.length < 5) out.push({ kind: "house", key: "learn" });
    if (vs.length < 7) out.push({ kind: "house", key: "brands" });
    return out;
  }, [videos]);

  useEffect(() => {
    const root = ref.current; if (!root) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && e.intersectionRatio > 0.6) { setActive(Number((e.target as HTMLElement).dataset.i)); setPaused(false); }
    }), { root, threshold: [0.6] });
    root.querySelectorAll(".post").forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [items.length]);

  const scrollTo = (i: number) => {
    const el = ref.current?.querySelectorAll<HTMLElement>(".post")[Math.max(0, Math.min(items.length - 1, i))];
    el?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,[role=dialog]")) return;
      if (e.key === "ArrowDown") { e.preventDefault(); scrollTo(active + 1); }
      if (e.key === "ArrowUp") { e.preventDefault(); scrollTo(active - 1); }
      if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [active, items.length]);

  async function like(v: Video) {
    if (!user) { toast("Log in to like videos"); go("login"); return; }
    const on = !likes.has(v.id);
    const next = new Set(likes); on ? next.add(v.id) : next.delete(v.id); setLikes(next);
    setVideos((vs) => vs!.map((x) => x.id === v.id ? { ...x, like_count: Math.max(0, (x.like_count ?? 0) + (on ? 1 : -1)) } : x));
    try { await toggleLike(v.id, on); } catch (e: any) { toast(e.message); }
  }

  if (!videos) return <main id="main" className="page"><Loading /></main>;

  return (
    <main id="main" className="feed-wrap">
      <nav className="feed-top" aria-label="Sections">
        <A page="home" className="is-on" ariaCurrent>For You</A>
        <A page="explore">Creators</A>
        <A page="earn">{EARN.name}</A>
        <A page="learn">Learn</A>
        <A page="about">About</A>
      </nav>
      {hint && (
        <button className="swipe-hint" onClick={() => scrollTo(1)} aria-label="Next post">
          <span className="swipe-hint__chev" aria-hidden="true"><Icon name="up" size={22} /><Icon name="up" size={22} /></span>
          <span className="swipe-hint__m">Swipe up for more</span><span className="swipe-hint__d">Scroll or press the down arrow for more</span>
        </button>
      )}
      <div className="feed" ref={ref} aria-label="For You">
        {items.map((it, i) => {
          const isOn = i === active;
          if (it.kind === "house") return (
            <section key={it.key} className={`post ${isOn ? "is-on" : ""}`} data-i={i} aria-label="Vetta post">
              <div className="post__frame"><House k={it.key} active={isOn} signedIn={!!user} /></div>
              <div className="rail-actions">
                <A page="about" className="ra__avatar" ariaLabel="Vetta"><Mark size={46} /></A>
                <button className="ra" onClick={() => share(window.location.href.split("#")[0], `Vetta ${config.drop} is open.`)}><span className="ra__i"><Icon name="share" /></span><span>Share</span></button>
              </div>
            </section>
          );
          const v = it.v; const o = owners[v.owner_id];
          return (
            <section key={v.id} className={`post ${isOn ? "is-on" : ""}`} data-i={i} aria-label={`Video by ${o?.display_name ?? "a creator"}`}>
              <div className="post__frame">
                <Player v={v} active={isOn && !paused} muted={muted} onTap={() => setPaused((p) => !p)} />
                {isOn && paused && <span className="paused" aria-hidden="true" />}
                <button className="mute" onClick={() => setMuted(!muted)} aria-label={muted ? "Turn sound on" : "Mute"}><Icon name={muted ? "mute" : "sound"} size={20} /></button>
                <div className="cap">
                  {o && <A page="u" arg={o.handle} className="cap__who">@{o.handle} {o.vetted && <Verified size={15} />}</A>}
                  <p className="cap__text">{v.caption}</p>
                  <p className="cap__tags">{v.niches.map((n) => <A key={n} page="explore" arg={n}>#{nicheName(n).replace(/\s+and\s+/g, "").replace(/\s/g, "")}</A>)}{v.sample && <span className="tag tag--accent">Portfolio</span>}</p>
                </div>
              </div>
              <div className="rail-actions">
                {o && <A page="u" arg={o.handle} className="ra__avatar" ariaLabel={`${o.display_name}'s profile`}><Avatar p={o} size={46} /></A>}
                <button className={`ra ${likes.has(v.id) ? "is-on" : ""}`} aria-pressed={likes.has(v.id)} onClick={() => like(v)}>
                  <span className="ra__i"><Icon name="heart" /></span><span>{compact(v.like_count ?? 0)}</span>
                </button>
                <button className="ra" onClick={() => { if (!user) { toast("Log in as a brand to save creators"); go("login"); return; } if (user.role !== "brand") { toast("Saving creators is for brand accounts"); return; } setSaveFor(o ?? null); }}>
                  <span className="ra__i"><Icon name="bookmark" /></span><span>Save</span>
                </button>
                <button className="ra" onClick={() => o && share(window.location.origin + href("u", o.handle), `${o.display_name} on Vetta`)}><span className="ra__i"><Icon name="share" /></span><span>Share</span></button>
                <button className="ra" onClick={() => { if (!user) { go("login"); return; } setReportFor(v); }}><span className="ra__i"><Icon name="more" /></span><span>More</span></button>
              </div>
            </section>
          );
        })}
      </div>
      <div className="feed-nav">
        <button onClick={() => scrollTo(active - 1)} disabled={active === 0} aria-label="Previous"><Icon name="up" /></button>
        <button onClick={() => scrollTo(active + 1)} disabled={active === items.length - 1} aria-label="Next"><Icon name="down" /></button>
      </div>
      <SaveSheet creator={saveFor} onClose={() => setSaveFor(null)} />
      <Sheet open={!!reportFor} onClose={() => setReportFor(null)} title="Report this video">
        {reportFor && <ReportSheet type="video" id={reportFor.id} onDone={() => setReportFor(null)} />}
      </Sheet>
    </main>
  );
}

/* ---------- Vetta's own posts: motion drawn in code ---------- */
function House({ k, active, signedIn }: { k: string; active: boolean; signedIn: boolean }) {
  if (k === "drop") return (
    <div className="house house--drop">
      <div className="orbs" aria-hidden="true"><span /><span /><span /></div>
      <div className="house__mark"><Mark size={96} draw={active} /></div>
      <h2 className="house__title">Get vetted.</h2>
      <p className="house__sub">{config.drop} is open. One video, made your way. Selected creators get a public profile brands hire from.</p>
      <div className="house__count"><span className="live" /> Closes in <Countdown to={config.entriesClose} /></div>
      <div className="house__ctas">{signedIn
        ? <button className="btn btn--white" onClick={() => go("enter")}>Enter {config.drop}</button>
        : <><button className="btn btn--white" onClick={() => go("signup", "creator")}>Sign up as a creator</button><button className="btn btn--glass" onClick={() => go("signup", "brand")}>Sign up as a brand</button></>}</div>
    </div>
  );
  if (k === "tasks") return <TasksHouse active={active} />;
  if (k === "learn") return (
    <div className="house house--learn">
      <div className="orbs orbs--alt" aria-hidden="true"><span /><span /><span /></div>
      <p className="house__kicker">Learn</p>
      <h2 className="house__title house__title--sm">Vetted creators keep levelling up.</h2>
      <p className="house__sub">Pricing usage rights, hooks that hold, pitching brands, live sessions with working creators. Unlocked when you're vetted.</p>
      <div className="house__ctas"><button className="btn btn--white" onClick={() => go("learn")}>See what's inside</button><button className="btn btn--glass" onClick={() => go("enter")}>Get vetted</button></div>
    </div>
  );
  return (
    <div className="house house--brands">
      <div className="orbs orbs--alt" aria-hidden="true"><span /><span /><span /></div>
      <p className="house__kicker">For brands</p>
      <h2 className="house__title">Hire vetted.</h2>
      <p className="house__sub">Find creators by niche and city, shortlist them, then brief Vetta or post a campaign. We handle the introductions.</p>
      <div className="house__ctas"><button className="btn btn--white" onClick={() => go("explore")}>Browse creators</button><button className="btn btn--glass" onClick={() => go("brands")}>Post a campaign</button></div>
    </div>
  );
}

function TasksHouse({ active }: { active: boolean }) {
  const [i, setI] = useState(0); const [amt, setAmt] = useState(0);
  useEffect(() => {
    if (!active || reduced()) { setAmt(186.4); return; }
    const t = setInterval(() => setI((x) => (x + 1) % TASK_TYPES.length), 1400);
    let raf = 0; const s = performance.now();
    const step = (n: number) => { const p = Math.min(1, (n - s) / 2600); setAmt(186.4 * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => { clearInterval(t); cancelAnimationFrame(raf); };
  }, [active]);
  const tt = TASK_TYPES[i];
  return (
    <div className="house house--tasks">
      <div className="orbs" aria-hidden="true"><span /><span /><span /></div>
      <p className="house__kicker">{EARN.name}</p>
      <div className="task-pop" key={tt.slug}><b>{tt.name}</b><span>{tt.blurb}</span></div>
      <p className="house__amt">${amt.toFixed(2)}<small>example payout</small></p>
      <h2 className="house__title house__title--sm">Not vetted yet? Earn here. Vetted? Earn here too.</h2>
      <div className="house__ctas"><button className="btn btn--white" onClick={() => go("earn")}>See paid gigs</button></div>
    </div>
  );
}

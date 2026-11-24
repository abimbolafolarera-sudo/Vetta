import { useEffect, useState } from "react";
import { A, Avatar, Icon, Loading, Sheet, Verified, compact, share, toast } from "../components/ui";
import { Player, Thumb } from "../components/Video";
import { nicheName, tierName, workModeName } from "../config";
import { getProfile, placeOf, videosByOwner } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Profile, Video } from "../lib/types";
import { go, href } from "../router";
import { BriefForm, ReportSheet, SaveSheet, Scorecard, rateText } from "./Shared";

export default function ProfilePage({ handle }: { handle?: string }) {
  const { user } = useAuth();
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [videos, setVideos] = useState<Video[]>([]);
  const [tab, setTab] = useState<"videos" | "about">("videos");
  const [open, setOpen] = useState<number | null>(null);
  const [sheet, setSheet] = useState<"" | "save" | "brief" | "report">("");

  useEffect(() => {
    setP(undefined);
    if (!handle) { setP(null); return; }
    getProfile(handle).then(async (x) => { setP(x); if (x) setVideos(await videosByOwner(x.id)); }).catch(() => setP(null));
  }, [handle, user?.id]);

  if (p === undefined) return <main id="main" className="page"><Loading /></main>;
  if (!p) return (
    <main id="main" className="page empty-state">
      <Icon name="lock" size={36} />
      <h1 className="h2">This profile isn't public.</h1>
      <p className="muted">Creator profiles go public once they're vetted.</p>
      <A page="explore" className="btn btn--brand">Explore vetted creators</A>
    </main>
  );

  const own = user?.id === p.id;
  const likes = videos.reduce((n, v) => n + (v.like_count ?? 0), 0);
  const ready = videos.filter((v) => own || v.status === "ready");

  return (
    <main id="main" className="page profile">
      {own && p.role === "creator" && !p.vetted && (
        <div className="banner"><Icon name="lock" size={18} /><span>Your profile is private until you're vetted. Only you and the Vetta team can see it. <A page="enter">Enter the Drop</A> to be considered.</span></div>
      )}
      {p.status !== "active" && <div className="banner banner--warn"><Icon name="shield" size={18} /><span>This account is {p.status}.</span></div>}

      <header className="prof">
        <Avatar p={p} size={112} />
        <div className="prof__main">
          <h1 className="prof__name">{p.display_name} {p.vetted && p.role === "creator" && <Verified size={22} />}</h1>
          <p className="prof__handle">@{p.handle}{p.role === "brand" && <span className="tag">Brand</span>}{p.sample && <span className="tag tag--accent">Portfolio</span>}</p>
          <ul className="prof__stats">
            <li><b>{ready.length}</b> videos</li>
            <li><b>{compact(likes)}</b> likes</li>
            {p.metrics.slice(0, 2).map((m) => <li key={m.label}><b>{m.value}</b> {m.label.toLowerCase()}</li>)}
          </ul>
          {p.bio && <p className="prof__bio">{p.bio}</p>}
          {p.role === "creator" && p.vetted && (
            <div className="prof__card">
              <p className="prof__rate">{rateText(p)}</p>
              <Scorecard c={{ jobs_done: p.jobs_done ?? 0, on_time_pct: p.on_time_pct, brand_rating: p.brand_rating, hook_rate: p.hook_rate }} />
            </div>
          )}
          <p className="prof__meta">
            {placeOf(p) && <span className="prof__place"><Icon name="pin" size={14} /> {placeOf(p)}</span>}
            {p.tier && <span className="tier-pill">{tierName(p.tier)} creator</span>}
            {p.work_mode && <span>{workModeName(p.work_mode)}{p.open_to_travel ? ", open to travel" : ""}</span>}
            {p.vetted_drop && p.role === "creator" && <span>Vetted, {p.vetted_drop}</span>}
            {p.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer"><Icon name="link" size={14} /> {l.label}</a>)}
          </p>
          <div className="prof__actions">
            {own ? (
              <>
                <A page="settings" className="btn btn--soft">Edit profile</A>
                {p.role === "creator" && <A page="upload" className="btn btn--brand"><Icon name="plus" size={18} /> Upload</A>}
              </>
            ) : p.role === "creator" && (!user || user.role === "brand") ? (
              <>
                <button className="btn btn--brand" onClick={() => setSheet("brief")}>Book through Vetta</button>
                <button className="icon-btn icon-btn--soft" aria-label="Save to shortlist" onClick={() => { if (user?.role !== "brand") { toast("Log in as a brand to save creators"); go("login"); return; } setSheet("save"); }}><Icon name="bookmark" /></button>
              </>
            ) : null}
            <button className="icon-btn icon-btn--soft" aria-label="Share profile" onClick={() => share(window.location.origin + href("u", p.handle), `${p.display_name} on Vetta`)}><Icon name="share" /></button>
            {!own && user && <button className="icon-btn icon-btn--soft" aria-label="Report profile" onClick={() => setSheet("report")}><Icon name="flag" /></button>}
          </div>
        </div>
      </header>

      <div className="ptabs" role="tablist">
        <button role="tab" aria-selected={tab === "videos"} className={tab === "videos" ? "is-on" : ""} onClick={() => setTab("videos")}><Icon name="grid" size={18} /> Videos</button>
        <button role="tab" aria-selected={tab === "about"} className={tab === "about" ? "is-on" : ""} onClick={() => setTab("about")}><Icon name="info" size={18} /> About</button>
      </div>

      {tab === "videos" && (ready.length ? (
        <ul className="vgrid">
          {ready.map((v, i) => (
            <li key={v.id}>
              <button className="thumb" onClick={() => setOpen(i)} aria-label={v.caption || "Open video"}>
                <Thumb v={v} />
                <span className="thumb__meta"><Icon name="heart" size={14} /> {compact(v.like_count ?? 0)}</span>
                {v.status !== "ready" && <span className="thumb__status">{v.status === "processing" ? "Processing" : v.status === "hidden" ? "Hidden" : v.status}</span>}
                {v.kind === "entry" && own && <span className="thumb__status thumb__status--left">Drop entry</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : <div className="empty-state"><p className="muted">{own ? "No videos yet." : "No videos yet."}</p>{own && p.role === "creator" && <A page="upload" className="btn btn--brand">Upload your first video</A>}</div>)}

      {tab === "about" && (
        <dl className="facts">
          {placeOf(p) && <div><dt>Based in</dt><dd>{placeOf(p)}</dd></div>}
          {p.tier && <div><dt>Category</dt><dd>{tierName(p.tier)}</dd></div>}
          {p.work_mode && <div><dt>Works</dt><dd>{workModeName(p.work_mode)}{p.open_to_travel ? ", open to travel" : ""}</dd></div>}
          {p.niches.length > 0 && <div><dt>Niches</dt><dd>{p.niches.map((n) => <A key={n} page="explore" arg={n} className="chip chip--sm">{nicheName(n)}</A>)}</dd></div>}
          {p.formats.length > 0 && <div><dt>Formats</dt><dd>{p.formats.join(", ")}</dd></div>}
          {p.metrics.length > 0 && <div><dt>Results</dt><dd>{p.metrics.map((m) => `${m.value} ${m.label.toLowerCase()}`).join(", ")}</dd></div>}
          {p.company && <div><dt>Company</dt><dd>{p.company}</dd></div>}
          {p.website && <div><dt>Website</dt><dd><a href={p.website} target="_blank" rel="noreferrer">{p.website}</a></dd></div>}
        </dl>
      )}

      {open !== null && ready[open] && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label="Video">
          <button className="viewer__close icon-btn" onClick={() => setOpen(null)} aria-label="Close"><Icon name="x" /></button>
          <div className="viewer__stage"><Player v={ready[open]} active muted={false} fit="contain" /></div>
          <p className="viewer__cap">{ready[open].caption}</p>
          <div className="viewer__nav">
            <button className="icon-btn" disabled={open === 0} onClick={() => setOpen(open - 1)} aria-label="Previous"><Icon name="up" /></button>
            <button className="icon-btn" disabled={open === ready.length - 1} onClick={() => setOpen(open + 1)} aria-label="Next"><Icon name="down" /></button>
          </div>
        </div>
      )}

      <SaveSheet creator={sheet === "save" ? p : null} onClose={() => setSheet("")} />
      <Sheet open={sheet === "brief"} onClose={() => setSheet("")} title="Book through Vetta"><p className="muted">Your brief goes to the Vetta team, not to the creator. We confirm availability, handle the agreement and introduce you.</p><BriefForm creator={p} /></Sheet>
      <Sheet open={sheet === "report"} onClose={() => setSheet("")} title="Report this profile"><ReportSheet type="profile" id={p.id} onDone={() => setSheet("")} /></Sheet>
    </main>
  );
}

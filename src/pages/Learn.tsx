import { useEffect, useState } from "react";
import { A, Icon, Loading, Sheet, Verified } from "../components/ui";
import { EARN, config } from "../config";
import { listResources } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Resource } from "../lib/types";

const KIND: Record<Resource["kind"], string> = { guide: "Guide", template: "Template", video: "Video lesson", live: "Live session", checklist: "Checklist" };
const TEASER = ["Usage rights: what to charge when a brand runs your video as an ad", "Brief to shot list in 10 minutes", "Hook check: openings that hold the first 3 seconds", "Read your numbers like a brand does", "Pitch message that gets replies", "Live sessions with working creators"];

export default function Learn() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Resource[] | "locked" | null>(null);
  const [tag, setTag] = useState(""); const [open, setOpen] = useState<Resource | null>(null);
  useEffect(() => { listResources().then(setRows).catch(() => setRows("locked")); }, [user?.id]);
  if (loading || rows === null) return <main id="main" className="page"><Loading /></main>;

  if (rows === "locked") return (
    <main id="main" className="page page--narrow">
      <section className="card card--print learn-lock">
        <Icon name="lock" size={34} />
        <p className="kicker">Learn</p>
        <h1 className="h1">This is for vetted creators.</h1>
        <p className="lede">{user?.role === "creator" ? "You're not vetted yet, so Learn is locked for now." : "Learn opens when you're vetted."} It's where Vetta creators get the practical stuff: pricing, hooks, pitching, and live sessions with creators who do this for a living.</p>
        <p className="lede"><b>You can still earn while you wait.</b> Gigs marked Open to all in {EARN.name} are for every creator.</p>
        <div className="row-btns">
          {user?.role === "creator" ? <A page="enter" className="btn btn--brand">Enter {config.drop} to get vetted</A> : !user ? <A page="signup" arg="creator" className="btn btn--brand">Join as a creator</A> : null}
          <A page="earn" className="btn btn--soft">{EARN.name}</A>
        </div>
      </section>
      <h2 className="sec-title">What's inside</h2>
      <ul className="teaser">{TEASER.map((t) => <li key={t}><Icon name="lock" size={16} /> {t}</li>)}</ul>
    </main>
  );

  const tags = [...new Set(rows.flatMap((r) => r.tags))];
  const shown = rows.filter((r) => !tag || r.tags.includes(tag));
  return (
    <main id="main" className="page">
      <header className="card card--print learn-head">
        <p className="kicker"><Verified size={16} /> For vetted creators</p>
        <h1 className="h1">Learn</h1>
        <p className="lede">Practical, tested, no fluff. New guides and live sessions are added as the network grows.</p>
      </header>
      <nav className="pills"><button className={`pill ${!tag ? "is-on" : ""}`} onClick={() => setTag("")}>All</button>{tags.map((t) => <button key={t} className={`pill ${tag === t ? "is-on" : ""}`} onClick={() => setTag(t)}>{t}</button>)}</nav>
      {shown.length === 0 && <p className="muted">Nothing here yet.</p>}
      <ul className="res-grid">{shown.map((r) => (
        <li key={r.id}><button className="card res" onClick={() => setOpen(r)}>
          <span className="tag tag--brand">{KIND[r.kind]}</span>{r.sample && <span className="tag">Starter</span>}
          <h2 className="h3">{r.title}</h2><p className="muted">{r.summary}</p>
          <span className="res__more">Open <Icon name="back" size={14} /></span>
        </button></li>
      ))}</ul>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? KIND[open.kind] : ""}>{open && (
        <article className="res-body">
          <h2 className="h2">{open.title}</h2>
          <p className="lede">{open.summary}</p>
          {open.body.split("\n").map((para, i) => para.trim() ? <p key={i}>{para}</p> : null)}
          {open.url && <a className="btn btn--brand" href={open.url} target="_blank" rel="noreferrer">{open.kind === "live" ? "Join the session" : "Open the resource"}</a>}
        </article>
      )}</Sheet>
    </main>
  );
}

import { useEffect, useState } from "react";
import { A, Avatar, Icon, Loading, Verified, formatDate } from "../components/ui";
import { Thumb } from "../components/Video";
import { NICHES, TIERS, config, nicheName, tierName, workModeName } from "../config";
import { feedVideos, getProfilesByIds, listCreators, placeOf } from "../lib/api";
import type { Profile, Video } from "../lib/types";

export default function Explore({ niche }: { niche?: string }) {
  const [q, setQ] = useState(""); const [place, setPlace] = useState(""); const [mode, setMode] = useState(""); const [tier, setTier] = useState("");
  const [creators, setCreators] = useState<Profile[] | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [owners, setOwners] = useState<Record<string, Profile>>({});

  useEffect(() => {
    const t = setTimeout(() => { setCreators(null); listCreators({ niche, q, place, mode, tier }).then(setCreators).catch(() => setCreators([])); }, q || place ? 250 : 0);
    return () => clearTimeout(t);
  }, [niche, q, place, mode, tier]);
  useEffect(() => {
    feedVideos().then(async (vs) => { const f = vs.filter((v) => !niche || v.niches.includes(niche)); setVideos(f); setOwners(await getProfilesByIds(f.map((v) => v.owner_id))); });
  }, [niche]);

  return (
    <main id="main" className="page">
      <div className="searchbar">
        <Icon name="search" size={20} />
        <input type="search" placeholder="Search vetted creators" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search creators" />
      </div>
      <div className="filters">
        <div className="searchbar searchbar--sm"><Icon name="pin" size={18} /><input placeholder="City, state or country" value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Filter by location" /></div>
        <div className="seg">
          <button className={!mode ? "is-on" : ""} onClick={() => setMode("")}>Any</button>
          <button className={mode === "onsite" ? "is-on" : ""} onClick={() => setMode("onsite")}>Can work on-site</button>
        </div>
        <label className="tier-select"><span className="sr-only">Creator category</span>
          <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Creator category">
            <option value="">All categories</option>
            {TIERS.map((t) => <option key={t.slug} value={t.slug}>{t.name} ({t.range})</option>)}
          </select>
        </label>
      </div>
      <nav className="pills" aria-label="Niches">
        <A page="explore" className={`pill ${!niche ? "is-on" : ""}`}>All</A>
        {NICHES.map((n) => <A key={n.slug} page="explore" arg={n.slug} className={`pill ${niche === n.slug ? "is-on" : ""}`}>{n.name}</A>)}
      </nav>

      <section>
        <h2 className="sec-title">{niche ? `${nicheName(niche)} creators` : "Vetted creators"}</h2>
        {!creators && <Loading />}
        {creators && creators.length === 0 && (
          <div className="empty-state">
            <p className="muted">{q || place || mode || tier ? "No creators match those filters yet." : `The first class is revealed on ${formatDate(config.classAnnounced)}.`}</p>
            {!q && <A page="enter" className="btn btn--brand">Enter {config.drop}</A>}
          </div>
        )}
        {creators && creators.length > 0 && (
          <ul className="people">
            {creators.map((c) => (
              <li key={c.id}>
                <A page="u" arg={c.handle} className="person">
                  <Avatar p={c} size={64} />
                  <span className="person__name">{c.display_name} <Verified size={15} /></span>
                  <span className="person__handle">@{c.handle}</span>
                  <span className="person__bio">{c.bio}</span>
                  {placeOf(c) && <span className="person__place"><Icon name="pin" size={13} /> {c.city || placeOf(c)}{c.country && c.city ? `, ${c.country}` : ""}</span>}
                  <span className="person__niches">{c.niches.slice(0, 2).map(nicheName).join(", ")}</span>
                  {c.tier && <span className="person__mode">{tierName(c.tier)}</span>}
                  {c.work_mode && c.work_mode !== "remote" && <span className="person__mode">{workModeName(c.work_mode)}</span>}
                  {c.sample && <span className="tag tag--accent">Portfolio</span>}
                </A>
              </li>
            ))}
          </ul>
        )}
      </section>

      {videos.length > 0 && (
        <section>
          <h2 className="sec-title">Videos</h2>
          <ul className="vgrid vgrid--explore">
            {videos.map((v) => {
              const o = owners[v.owner_id];
              return (
                <li key={v.id}>
                  <A page="u" arg={o?.handle} className="thumb">
                    <Thumb v={v} />
                    <span className="thumb__cap">{v.caption}</span>
                    {o && <span className="thumb__who"><Avatar p={o} size={20} /> {o.handle}</span>}
                  </A>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

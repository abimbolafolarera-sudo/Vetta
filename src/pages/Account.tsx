import { useEffect, useState } from "react";
import { A, Avatar, Chips, Field, Icon, Loading, Sheet, Verified, formatDate, timeAgo, toast } from "../components/ui";
import { EARN, FORMATS, NICHES, TASK_TYPES, WORK_MODES, config, nicheName } from "../config";
import {
  changePassword, deleteShortlist, getProfilesByIds, myBriefs, myEntry, mySubmissions, myShortlists, myTasks, signOut, submissionsForMyCampaigns, updateMyProfile, uploadAvatar,
} from "../lib/api";
import { applyTheme, getTheme, setTheme, useAuth, type Theme } from "../lib/auth";
import type { Brief, Entry, Link, Metric, Profile, Shortlist, Task, TaskSubmission } from "../lib/types";
import { go } from "../router";
import ProfilePage from "./Profile";
import { Gate } from "./Create";

/* ---------------- "Me" tab ---------------- */
export function Me() {
  const { user, loading } = useAuth();
  if (loading) return <main id="main" className="page"><Loading /></main>;
  if (!user) return <Gate text="Log in to see your profile." />;
  if (user.role === "brand") return <BrandDashboard />;
  if (user.role === "admin") { go("admin"); return null; }
  return <><CreatorStrip /><ProfilePage handle={user.handle} /></>;
}

function CreatorStrip() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [subs, setSubs] = useState<TaskSubmission[]>([]);
  useEffect(() => { myEntry().then(setEntry); mySubmissions().then(setSubs); }, []);
  const pending = subs.filter((s) => s.status === "pending").length;
  return (
    <div className="page strip">
      <A page="enter" className="strip__item"><Icon name="star" size={20} /><span><b>{config.drop}</b><small>{entry ? (entry.status === "selected" ? "Selected" : entry.status === "declined" ? "Not selected" : "In review") : "Not entered yet"}</small></span></A>
      <A page="earn" className="strip__item"><Icon name="earn" size={20} /><span><b>{EARN.name}</b><small>{subs.length ? `${subs.length} submitted, ${pending} pending` : "Find paid gigs"}</small></span></A>
      <A page="learn" className="strip__item"><Icon name="learn" size={20} /><span><b>Learn</b><small>For vetted creators</small></span></A>
      <A page="inbox" className="strip__item"><Icon name="inbox" size={20} /><span><b>Inbox</b><small>Messages from brands</small></span></A>
    </div>
  );
}

/* ---------------- brand dashboard ---------------- */
function BrandDashboard() {
  const { user } = useAuth();
  const [lists, setLists] = useState<Shortlist[] | null>(null);
  const [people, setPeople] = useState<Record<string, Profile>>({});
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subs, setSubs] = useState<TaskSubmission[]>([]);
  const load = async () => {
    const l = await myShortlists(); setLists(l); setPeople(await getProfilesByIds(l.flatMap((x) => x.creator_ids)));
    setBriefs(await myBriefs()); const t = await myTasks(); setTasks(t);
    const sb = await submissionsForMyCampaigns(); setSubs(sb.filter((x) => t.some((k) => k.id === x.task_id)));
  };
  useEffect(() => { load(); }, []);
  if (!user) return null;
  return (
    <main id="main" className="page">
      <header className="dash-head">
        <Avatar p={user} size={64} />
        <div><h1 className="h2">{user.company || user.display_name}</h1><p className="muted">Brand account <span className={`tag ${user.plan === "pro" ? "tag--brand" : ""}`}>{user.plan === "pro" ? "Pro" : "Free"}</span></p></div>
        <div className="dash-head__acts"><A page="campaign" className="btn btn--brand"><Icon name="plus" size={18} /> Post a campaign</A><A page="explore" className="btn btn--soft">Find creators</A></div>
      </header>

      <section className="dash-sec">
        <div className="sec-row"><h2 className="sec-title">Shortlists</h2></div>
        {!lists ? <Loading /> : lists.length === 0 ? <p className="muted">Save creators from their profile or the feed with the bookmark button. Your lists appear here.</p> : (
          <div className="lists">
            {lists.map((l) => (
              <div key={l.id} className="card list-card">
                <div className="sec-row"><h3 className="h3">{l.name}</h3><button className="link-btn" onClick={async () => { await deleteShortlist(l.id); load(); }}>Delete</button></div>
                {l.creator_ids.length === 0 ? <p className="muted">Empty</p> : (
                  <ul className="mini-people">{l.creator_ids.map((id) => people[id] && (
                    <li key={id}><A page="u" arg={people[id].handle}><Avatar p={people[id]} size={40} /><span>{people[id].display_name} <Verified size={13} /></span></A></li>
                  ))}</ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dash-sec">
        <div className="sec-row"><h2 className="sec-title">Briefs</h2><A page="brief" className="btn btn--soft btn--sm">New brief</A></div>
        {briefs.length === 0 ? <p className="muted">No briefs yet.</p> : (
          <ul className="rows">{briefs.map((b) => (
            <li key={b.id}><span><b>{b.brief.slice(0, 70)}{b.brief.length > 70 ? "…" : ""}</b><small>{b.niches.map(nicheName).join(", ")} | {b.budget} | {formatDate(b.created_at)}</small></span><span className={`status status--${b.status}`}>{b.status.replace("_", " ")}</span></li>
          ))}</ul>
        )}
      </section>

      <section className="dash-sec">
        <div className="sec-row"><h2 className="sec-title">Campaigns</h2><A page="campaign" className="btn btn--soft btn--sm">Post a campaign</A></div>
        {tasks.length === 0 ? <p className="muted">Post a campaign and vetted creators come to you. Each one goes live in {EARN.name} after a quick review.</p> : (
          <ul className="camp-list">{tasks.map((t) => {
            const mine = subs.filter((x) => x.task_id === t.id);
            return (
              <li key={t.id} className="card">
                <div className="sec-row"><span><b>{t.title}</b><br /><small className="muted">{TASK_TYPES.find((x) => x.slug === t.type)?.name} | ${t.rate} {t.pay_model === "flat" ? "per creator" : "per 1k views"} | budget ${t.budget}</small></span><span className={`status status--${t.status}`}>{t.status === "pending" ? "In review" : t.status}</span></div>
                {mine.length === 0 ? <p className="muted small">No submissions yet.</p> : (
                  <ul className="rows">{mine.map((x) => <li key={x.id}><span><a className="break" href={x.post_url} target="_blank" rel="noreferrer">{x.post_url}</a><small>{formatDate(x.created_at)}</small></span><span className={`status status--${x.status}`}>{x.status}</span></li>)}</ul>
                )}
              </li>
            );
          })}</ul>
        )}
      </section>
    </main>
  );
}

/* ---------------- settings ---------------- */
export function Settings() {
  const { user, loading, refresh } = useAuth();
  const [f, setF] = useState<Profile | null>(null);
  const [theme, setT] = useState<Theme>(getTheme());
  const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { if (user) setF({ ...user, links: user.links.length ? user.links : [{ label: "", url: "" }], metrics: user.metrics.length ? user.metrics : [{ label: "", value: "" }] }); }, [user?.id]);
  if (loading) return <main id="main" className="page"><Loading /></main>;
  if (!user || !f) return <Gate text="Log in to change your settings." />;
  const set = (k: keyof Profile, v: any) => setF((p) => ({ ...p!, [k]: v }));

  async function save() {
    setBusy(true); setErr("");
    try {
      await updateMyProfile({ ...f!, links: f!.links.filter((l: Link) => l.url.trim()).map((l: Link) => ({ label: l.label.trim() || "Link", url: l.url.trim() })), metrics: f!.metrics.filter((m: Metric) => m.label && m.value) });
      await refresh(); toast("Profile saved");
    } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <main id="main" className="page page--narrow settings">
      <h1 className="h1">Settings</h1>

      <section className="card">
        <h2 className="h3">Profile</h2>
        <div className="avatar-edit">
          <Avatar p={f} size={84} />
          <label className="btn btn--soft btn--sm">Change photo
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { set("avatar_url", await uploadAvatar(file)); } catch (x: any) { toast(x.message); } }} />
          </label>
        </div>
        <div className="row2">
          <Field label={user.role === "brand" ? "Display name" : "Name"} id="sdn"><input id="sdn" value={f.display_name} onChange={(e) => set("display_name", e.target.value)} /></Field>
          <Field label="Username" id="sh" hint="vetta.co/@username"><input id="sh" value={f.handle} onChange={(e) => set("handle", e.target.value.toLowerCase())} /></Field>
        </div>
        <Field label="Bio" id="sb"><textarea id="sb" rows={3} maxLength={220} value={f.bio} onChange={(e) => set("bio", e.target.value)} /></Field>
        <div className="row3">
          <Field label="City" id="scity"><input id="scity" value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Port Harcourt" /></Field>
          <Field label="State or region" id="sreg"><input id="sreg" value={f.region ?? ""} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Rivers State" /></Field>
          <Field label="Country" id="scountry"><input id="scountry" value={f.country ?? ""} onChange={(e) => set("country", e.target.value)} /></Field>
        </div>
        {user.role === "creator" && <>
          <Field label="How you work" hint="Brands filter by this when they need someone in person.">
            <div className="radios radios--row">{WORK_MODES.map((w) => <label key={w.slug} className={`radio ${f.work_mode === w.slug ? "is-on" : ""}`}><input type="radio" name="wm" checked={f.work_mode === w.slug} onChange={() => set("work_mode", w.slug)} /> {w.name}</label>)}</div>
          </Field>
          <label className="check"><input type="checkbox" checked={!!f.open_to_travel} onChange={(e) => set("open_to_travel", e.target.checked)} /><span>Open to travel for paid gigs</span></label>
          <Field label="Your rate per video, in US dollars" hint="Brands see this range when you match their brief. Your scorecard (briefs delivered, on-time rate, ratings) is filled in by Vetta from real work.">
            <div className="row2">
              <input aria-label="Rate from" type="number" min={0} inputMode="numeric" placeholder="From, e.g. 150" value={f.rate_from ?? ""} onChange={(e) => set("rate_from", e.target.value === "" ? null : Math.max(0, Math.round(+e.target.value)))} />
              <input aria-label="Rate to" type="number" min={0} inputMode="numeric" placeholder="To, e.g. 400" value={f.rate_to ?? ""} onChange={(e) => set("rate_to", e.target.value === "" ? null : Math.max(0, Math.round(+e.target.value)))} />
            </div>
          </Field>
        </>}
        {user.role === "brand" && <div className="row2">
          <Field label="Company" id="sco"><input id="sco" value={f.company ?? ""} onChange={(e) => set("company", e.target.value)} /></Field>
          <Field label="Website" id="sw"><input id="sw" value={f.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
        </div>}
        <Field label="Niches"><Chips name="Niches" max={3} options={NICHES.map((n) => ({ value: n.slug, label: n.name }))} value={f.niches} onChange={(v) => set("niches", v)} /></Field>
        {user.role === "creator" && <>
          <Field label="Formats"><Chips name="Formats" options={FORMATS.map((x) => ({ value: x, label: x }))} value={f.formats} onChange={(v) => set("formats", v)} /></Field>
          <Field label="Results" hint="Numbers you can back up. Example: Avg. views / 38k">
            {f.metrics.map((m: Metric, i: number) => (
              <div className="row2" key={i}>
                <input aria-label="Result label" placeholder="Label" value={m.label} onChange={(e) => set("metrics", f.metrics.map((x: Metric, j: number) => j === i ? { ...x, label: e.target.value } : x))} />
                <input aria-label="Result value" placeholder="Value" value={m.value} onChange={(e) => set("metrics", f.metrics.map((x: Metric, j: number) => j === i ? { ...x, value: e.target.value } : x))} />
              </div>
            ))}
            {f.metrics.length < 4 && <button type="button" className="link-btn" onClick={() => set("metrics", [...f.metrics, { label: "", value: "" }])}>Add a result</button>}
          </Field>
        </>}
        <Field label="Links">
          {f.links.map((l: Link, i: number) => (
            <div className="row2" key={i}>
              <input aria-label="Link label" placeholder="Label, e.g. TikTok" value={l.label} onChange={(e) => set("links", f.links.map((x: Link, j: number) => j === i ? { ...x, label: e.target.value } : x))} />
              <input aria-label="Link URL" placeholder="https://" value={l.url} onChange={(e) => set("links", f.links.map((x: Link, j: number) => j === i ? { ...x, url: e.target.value } : x))} />
            </div>
          ))}
          {f.links.length < 4 && <button type="button" className="link-btn" onClick={() => set("links", [...f.links, { label: "", url: "" }])}>Add a link</button>}
        </Field>
        {err && <p className="form-fail">{err}</p>}
        <div className="form-nav"><button className="btn btn--brand" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</button><button className="btn btn--soft" onClick={() => go("u", user.handle)}>View profile</button></div>
      </section>

      <section className="card">
        <h2 className="h3">Appearance</h2>
        <div className="seg">
          {(["dark", "light", "system"] as Theme[]).map((t) => (
            <button key={t} className={theme === t ? "is-on" : ""} onClick={() => { setTheme(t); setT(t); applyTheme(t); }}>
              <Icon name={t === "dark" ? "moon" : t === "light" ? "sun" : "settings"} size={16} /> {t === "system" ? "Device" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h3">Account</h2>
        <dl className="facts"><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Account type</dt><dd>{user.role === "brand" ? `Brand, ${user.plan === "pro" ? "Pro" : "Free"} plan` : user.role === "admin" ? "Admin" : user.vetted ? <>Creator, vetted <Verified size={14} /></> : "Creator, not vetted yet"}</dd></div></dl>
        <Field label="New password" id="npw"><input id="npw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
        <button className="btn btn--soft btn--sm" onClick={async () => { try { await changePassword(pw); setPw(""); toast("Password changed"); } catch (x: any) { toast(x.message); } }}>Change password</button>
        <div className="form-nav">
          <button className="btn btn--soft" onClick={async () => { await signOut(); go("home"); }}><Icon name="logout" size={18} /> Log out</button>
          <a className="link-btn" href={`mailto:${config.contactEmail}?subject=Delete my Vetta account`}>Delete my account</a>
        </div>
      </section>
    </main>
  );
}


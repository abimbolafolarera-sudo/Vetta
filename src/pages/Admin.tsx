import { useEffect, useMemo, useState } from "react";
import { A, Avatar, Field, Icon, Loading, Sheet, Verified, formatDate, timeAgo, toast } from "../components/ui";
import { Player, Thumb } from "../components/Video";
import { NICHES, TASK_TYPES, nicheName } from "../config";
import { admin, getProfilesByIds, toCSV } from "./../lib/api";
import { useAuth } from "../lib/auth";
import type { AccountStatus, Brief, Conversation, Entry, Message, Profile, Report, Resource, Settings, Task, TaskSubmission, Video } from "../lib/types";
import { gigPlace } from "./Earn";
import { ThreadView } from "./Inbox";
import { PalettePicker } from "../components/PalettePicker";
import { Gate } from "./Create";

type Tab = "overview" | "entries" | "users" | "videos" | "briefs" | "tasks" | "learn" | "messages" | "reports" | "settings";
const TABS: [Tab, string, string][] = [["overview", "Overview", "grid"], ["entries", "Entries", "star"], ["users", "Users", "user"], ["videos", "Videos", "upload"],
  ["briefs", "Briefs", "brands"], ["tasks", "Campaigns", "earn"], ["learn", "Learn", "learn"], ["messages", "Messages", "inbox"], ["reports", "Reports", "flag"], ["settings", "Settings", "settings"]];

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  if (loading) return <main id="main" className="page"><Loading /></main>;
  if (!user || user.role !== "admin") return <Gate text="The admin console is for the Vetta team." />;
  return (
    <main id="main" className="page page--wide admin">
      <header className="sec-row"><h1 className="h1">Admin</h1><span className="muted">Signed in as {user.email}</span></header>
      <nav className="atabs" role="tablist">{TABS.map(([t, l, i]) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "is-on" : ""} onClick={() => setTab(t)}><Icon name={i} size={18} /> {l}</button>)}</nav>
      {tab === "overview" && <Overview go={setTab} />}
      {tab === "entries" && <Entries />}
      {tab === "users" && <Users />}
      {tab === "videos" && <Videos />}
      {tab === "briefs" && <Briefs />}
      {tab === "tasks" && <TasksAdmin />}
      {tab === "learn" && <LearnAdmin />}
      {tab === "messages" && <Messages />}
      {tab === "reports" && <Reports />}
      {tab === "settings" && <SettingsTab />}
    </main>
  );
}

function Csv({ rows, name }: { rows: Record<string, any>[]; name: string }) {
  return <button className="btn btn--soft btn--sm" disabled={!rows.length} onClick={async () => {
    const csv = toCSV(rows);
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `vetta-${name}.csv`; a.click(); } catch {}
    try { await navigator.clipboard.writeText(csv); toast("CSV copied"); } catch {}
  }}>Export CSV</button>;
}

function Overview({ go }: { go: (t: Tab) => void }) {
  const [s, setS] = useState<Awaited<ReturnType<typeof admin.stats>> | null>(null);
  useEffect(() => { admin.stats().then(setS); }, []);
  if (!s) return <Loading />;
  const cards: [string, number, Tab][] = [["New entries", s.newEntries, "entries"], ["All entries", s.entries, "entries"], ["Creators", s.creators, "users"], ["Vetted", s.vetted, "users"],
    ["Brands", s.brands, "users"], ["Live videos", s.videos, "videos"], ["New briefs", s.briefs, "briefs"], ["Open reports", s.reports, "reports"]];
  return <ul className="stat-grid">{cards.map(([l, n, t]) => <li key={l}><button className="card stat" onClick={() => go(t)}><b>{n}</b><span>{l}</span></button></li>)}</ul>;
}

/* ---------- entries ---------- */
function Entries() {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [people, setPeople] = useState<Record<string, Profile>>({});
  const [videos, setVideos] = useState<Record<string, Video>>({});
  const [filter, setFilter] = useState<Entry["status"] | "all">("all");
  const [open, setOpen] = useState<Entry | null>(null);
  const load = async () => {
    const e = await admin.entries(); setRows(e); setPeople(await getProfilesByIds(e.map((x) => x.user_id)));
    const vs = await admin.videos(); setVideos(Object.fromEntries(vs.map((v) => [v.id, v])));
  };
  useEffect(() => { load(); }, []);
  const total = (e: Entry) => (e.score_craft ?? 0) + (e.score_creativity ?? 0) + (e.score_proof ?? 0);
  const shown = useMemo(() => (rows ?? []).filter((r) => filter === "all" || r.status === filter).sort((a, b) => total(b) - total(a) || b.created_at.localeCompare(a.created_at)), [rows, filter]);
  if (!rows) return <Loading />;
  return (
    <section>
      <div className="sec-row">
        <div className="seg">{(["all", "new", "shortlisted", "selected", "declined"] as const).map((s) => <button key={s} className={filter === s ? "is-on" : ""} onClick={() => setFilter(s)}>{s === "all" ? `All ${rows.length}` : `${s[0].toUpperCase() + s.slice(1)} ${rows.filter((r) => r.status === s).length}`}</button>)}</div>
        <Csv rows={shown} name="entries" />
      </div>
      {!shown.length && <p className="muted">No entries here yet. Share the Drop link in UGC communities.</p>}
      <ul className="arows">{shown.map((e) => { const p = people[e.user_id]; return (
        <li key={e.id}><button className="arow" onClick={() => setOpen(e)}>
          <Avatar p={p} size={36} /><span className="arow__main"><b>{p?.display_name ?? "Unknown"}</b><small>{e.country} | {e.niches.map(nicheName).join(", ")}</small></span>
          <span className="muted">{timeAgo(e.created_at)}</span><span className={`status status--${e.status}`}>{e.status}</span><span className="arow__score">{total(e) ? `${total(e)}/15` : "Unscored"}</span>
        </button></li>
      ); })}</ul>
      <Sheet open={!!open} onClose={() => setOpen(null)} title="Entry">{open && <EntryDetail e={open} p={people[open.user_id]} v={open.showcase_video_id ? videos[open.showcase_video_id] : undefined} onChange={async () => { await load(); setOpen(null); }} />}</Sheet>
    </section>
  );
}

function EntryDetail({ e, p, v, onChange }: { e: Entry; p?: Profile; v?: Video; onChange: () => void }) {
  const [x, setX] = useState(e); const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<any>, msg: string) => { setBusy(true); try { await fn(); toast(msg); onChange(); } catch (err: any) { toast(err.message); } finally { setBusy(false); } };
  const score = async (k: "score_craft" | "score_creativity" | "score_proof", n: number) => { setX({ ...x, [k]: n }); await admin.updateEntry(e.id, { [k]: n }); };
  return (
    <div className="entry">
      <div className="entry__grid">
        <div className="entry__video">{v ? <Player v={v} active muted={false} fit="contain" /> : e.showcase_url ? <a className="btn btn--soft" href={e.showcase_url} target="_blank" rel="noreferrer">Open showcase link</a> : <p className="muted">No video</p>}</div>
        <div>
          {p && <A page="u" arg={p.handle} className="entry__who"><Avatar p={p} size={44} /><span><b>{p.display_name}</b><small>@{p.handle} | {p.email}</small></span></A>}
          <dl className="facts">
            <div><dt>Based in</dt><dd>{[e.city, e.country].filter(Boolean).join(", ")}</dd></div>
            <div><dt>Handles</dt><dd>{e.handles}</dd></div><div><dt>Level</dt><dd>{e.level}</dd></div>
            <div><dt>Formats</dt><dd>{e.formats.join(", ")}</dd></div>
            {e.brands_worked && <div><dt>Brands</dt><dd>{e.brands_worked}</dd></div>}
            {e.best_result && <div><dt>Best result</dt><dd>{e.best_result}</dd></div>}
            {e.showcase_note && <div><dt>Idea</dt><dd>{e.showcase_note}</dd></div>}
            {e.work_links.length > 0 && <div><dt>Work</dt><dd>{e.work_links.map((w, i) => <a key={i} href={w.url} target="_blank" rel="noreferrer" className="block">{w.brand || w.url}{w.result ? ` (${w.result})` : ""}</a>)}</dd></div>}
          </dl>
          {([["score_craft", "Craft"], ["score_creativity", "Creativity"], ["score_proof", "Proof"]] as const).map(([k, l]) => (
            <div key={k} className="score"><span>{l}</span><div className="seg seg--sm">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={x[k] === n ? "is-on" : ""} onClick={() => score(k, n)} aria-label={`${l} ${n}`}>{n}</button>)}</div></div>
          ))}
          <Field label="Notes" id="en" optional><textarea id="en" rows={2} defaultValue={e.notes ?? ""} onBlur={(ev) => admin.updateEntry(e.id, { notes: ev.target.value })} /></Field>
        </div>
      </div>
      <div className="form-nav">
        <button className="btn btn--brand" disabled={busy || e.status === "selected"} onClick={() => act(() => admin.vet(e), "Vetted. Their profile is now public.")}><Verified size={16} /> Vet this creator</button>
        <button className="btn btn--soft" disabled={busy} onClick={() => act(() => admin.updateEntry(e.id, { status: "shortlisted" }), "Shortlisted")}>Shortlist</button>
        <button className="link-btn" disabled={busy} onClick={() => act(() => admin.updateEntry(e.id, { status: "declined" }), "Declined")}>Decline</button>
      </div>
    </div>
  );
}

/* ---------- users ---------- */
function Users() {
  const [q, setQ] = useState(""); const [role, setRole] = useState<"" | "creator" | "brand" | "admin">("");
  const [rows, setRows] = useState<Profile[] | null>(null); const [edit, setEdit] = useState<Profile | null>(null);
  const [confirmBan, setConfirmBan] = useState<string | null>(null);
  const load = () => admin.users({ q, role }).then(setRows);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, role]);
  const setStatus = async (p: Profile, s: AccountStatus) => {
    if (s === "banned" && confirmBan !== p.id) { setConfirmBan(p.id); toast("Tap Confirm ban to ban this account"); return; }
    setConfirmBan(null);
    try { await admin.setStatus(p.id, s); toast(s === "active" ? "Restored" : s === "suspended" ? "Suspended" : "Banned"); load(); } catch (e: any) { toast(e.message); }
  };
  return (
    <section>
      <div className="sec-row">
        <div className="searchbar searchbar--sm"><Icon name="search" size={18} /><input type="search" placeholder="Search name, username or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" /></div>
        <div className="seg">{(["", "creator", "brand", "admin"] as const).map((r) => <button key={r} className={role === r ? "is-on" : ""} onClick={() => setRole(r)}>{r ? r[0].toUpperCase() + r.slice(1) + "s" : "Everyone"}</button>)}</div>
        {rows && <Csv rows={rows} name="users" />}
      </div>
      {!rows ? <Loading /> : (
        <ul className="arows">{rows.map((p) => (
          <li key={p.id} className="arow arow--static">
            <Avatar p={p} size={36} />
            <span className="arow__main"><b>{p.display_name} {p.vetted && p.role === "creator" && <Verified size={13} />}</b><small>@{p.handle} | {p.email}</small></span>
            <span className="tag">{p.role}{p.role === "brand" ? `, ${p.plan}` : ""}</span>
            <span className={`status status--${p.status}`}>{p.status}</span>
            <span className="arow__acts">
              <A page="u" arg={p.handle} className="link-btn">View</A>
              <button className="link-btn" onClick={() => setEdit(p)}>Edit</button>
              {p.role !== "admin" && (p.status === "active"
                ? <><button className="link-btn" onClick={() => setStatus(p, "suspended")}>Suspend</button><button className="link-btn link-btn--danger" onClick={() => setStatus(p, "banned")}>{confirmBan === p.id ? "Confirm ban" : "Ban"}</button></>
                : <button className="link-btn" onClick={() => setStatus(p, "active")}>Restore</button>)}
            </span>
          </li>
        ))}</ul>
      )}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit ${edit.display_name}` : ""}>{edit && <UserEditor p={edit} onDone={() => { setEdit(null); load(); }} />}</Sheet>
    </section>
  );
}

function UserEditor({ p, onDone }: { p: Profile; onDone: () => void }) {
  const [f, setF] = useState(p);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); try { await admin.updateUser(p.id, { display_name: f.display_name, handle: f.handle, bio: f.bio, location: f.location, vetted: f.vetted, vetted_drop: f.vetted ? f.vetted_drop || "Drop 01" : null, plan: f.plan, avatar_url: f.avatar_url, niches: f.niches }); toast("Saved"); onDone(); } catch (x: any) { toast(x.message); } }}>
      <div className="row2">
        <Field label="Name" id="un"><input id="un" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></Field>
        <Field label="Username" id="uh"><input id="uh" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value.toLowerCase() })} /></Field>
      </div>
      <Field label="Bio" id="ub"><textarea id="ub" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
      <Field label="Location" id="ul"><input id="ul" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
      {f.avatar_url && <button type="button" className="link-btn link-btn--danger" onClick={() => setF({ ...f, avatar_url: null })}>Remove profile photo</button>}
      {p.role === "creator" && <label className="check"><input type="checkbox" checked={f.vetted} onChange={(e) => setF({ ...f, vetted: e.target.checked })} /><span>Vetted (profile public with badge)</span></label>}
      {p.role === "brand" && <Field label="Plan"><select value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as any })}><option value="free">Free</option><option value="pro">Pro</option></select></Field>}
      <div className="form-nav"><button className="btn btn--brand">Save</button></div>
    </form>
  );
}

/* ---------- videos ---------- */
function Videos() {
  const [rows, setRows] = useState<Video[] | null>(null); const [people, setPeople] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<Video["status"] | "all">("all"); const [open, setOpen] = useState<Video | null>(null);
  const load = async () => { const v = await admin.videos(); setRows(v); setPeople(await getProfilesByIds(v.map((x) => x.owner_id))); };
  useEffect(() => { load(); }, []);
  const set = async (v: Video, s: Video["status"]) => { await admin.setVideoStatus(v.id, s); toast(s === "removed" ? "Removed" : s === "hidden" ? "Hidden" : "Restored"); setOpen(null); load(); };
  if (!rows) return <Loading />;
  const shown = rows.filter((v) => filter === "all" || v.status === filter);
  return (
    <section>
      <div className="seg">{(["all", "ready", "processing", "hidden", "removed"] as const).map((s) => <button key={s} className={filter === s ? "is-on" : ""} onClick={() => setFilter(s)}>{s} {s === "all" ? rows.length : rows.filter((v) => v.status === s).length}</button>)}</div>
      <ul className="vgrid vgrid--admin">{shown.map((v) => (
        <li key={v.id}><button className="thumb" onClick={() => setOpen(v)}><Thumb v={v} /><span className="thumb__cap">@{people[v.owner_id]?.handle} {v.caption}</span><span className="thumb__status">{v.kind === "entry" ? "entry, " : ""}{v.status}</span></button></li>
      ))}</ul>
      <Sheet open={!!open} onClose={() => setOpen(null)} title="Video">{open && (
        <div>
          <div className="entry__video"><Player v={open} active muted={false} fit="contain" /></div>
          <p>{open.caption}</p><p className="muted">By @{people[open.owner_id]?.handle} | {formatDate(open.created_at)} | {open.status}</p>
          <div className="form-nav">
            {open.status !== "hidden" && <button className="btn btn--soft" onClick={() => set(open, "hidden")}>Hide</button>}
            {open.status !== "ready" && <button className="btn btn--soft" onClick={() => set(open, "ready")}>Restore</button>}
            <button className="btn btn--danger" onClick={() => set(open, "removed")}>Remove</button>
          </div>
        </div>
      )}</Sheet>
    </section>
  );
}

/* ---------- briefs ---------- */
function Briefs() {
  const [rows, setRows] = useState<Brief[] | null>(null);
  const load = () => admin.briefs().then(setRows); useEffect(() => { load(); }, []);
  if (!rows) return <Loading />;
  return (
    <section>
      <div className="sec-row"><span className="muted">{rows.length} briefs</span><Csv rows={rows} name="briefs" /></div>
      {!rows.length && <p className="muted">No briefs yet.</p>}
      <ul className="arows">{rows.map((b) => (
        <li key={b.id} className="brief-row card">
          <div className="sec-row"><b>{b.company}</b><span className="muted">{b.contact_name} | <a href={`mailto:${b.email}`}>{b.email}</a> | {timeAgo(b.created_at)}</span>
            <select aria-label="Status" value={b.status} onChange={async (e) => { await admin.updateBrief(b.id, { status: e.target.value as any }); load(); }}><option value="new">New</option><option value="in_talks">In talks</option><option value="won">Won</option><option value="closed">Closed</option></select></div>
          <p className="muted">{b.creator_id ? "For one creator" : b.niches.map(nicheName).join(", ")} | {b.budget} | {b.timeline}{b.brand_id ? " | has account" : ""}</p>
          <p>{b.brief}</p>
        </li>
      ))}</ul>
    </section>
  );
}

/* ---------- tasks ---------- */
function TasksAdmin() {
  const [tasks, setTasks] = useState<Task[] | null>(null); const [subs, setSubs] = useState<TaskSubmission[]>([]);
  const [people, setPeople] = useState<Record<string, Profile>>({}); const [edit, setEdit] = useState<Partial<Task> | null>(null);
  const load = async () => { const t = await admin.tasks(); setTasks(t); const s = await admin.submissions(); setSubs(s); setPeople(await getProfilesByIds(s.map((x) => x.user_id))); };
  useEffect(() => { load(); }, []);
  if (!tasks) return <Loading />;
  const task = (id: string) => tasks.find((t) => t.id === id);
  return (
    <section>
      <div className="sec-row"><h2 className="sec-title">Campaigns and gigs</h2><button className="btn btn--brand btn--sm" onClick={() => setEdit({ brand: "", title: "", type: "clip", description: "", pay_model: "per_1k_views", rate: 1, budget: 0, min_views: 1000, platforms: ["TikTok", "Instagram"], rules: "Real posts and real views only. Disclose with #ad. Posts stay up 30 days.", status: "live", location_mode: "remote", vetted_only: false, niches: [] })}>New gig</button></div>
      <ul className="arows">{tasks.map((t) => (
        <li key={t.id} className="arow arow--static">
          <span className="arow__main"><b>{t.title}</b><small>{t.brand} | {TASK_TYPES.find((x) => x.slug === t.type)?.name} | ${t.rate} {t.pay_model === "flat" ? "per gig" : "per 1k views"} | budget ${t.budget} | {gigPlace(t)} | {t.vetted_only ? "Vetted only" : "Open to all"}{t.created_by ? " | posted by brand" : ""}</small>{!!t.assets?.length && <small>{t.assets.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer">{a.name} </a>)}</small>}</span>
          <span className={`status status--${t.status}`}>{t.status === "pending" ? "needs review" : t.status}</span>
          <span className="arow__acts">
            {t.status === "pending" && <><button className="link-btn" onClick={async () => { await admin.saveTask({ id: t.id, status: "live" }); load(); }}>Approve</button><button className="link-btn link-btn--danger" onClick={async () => { await admin.saveTask({ id: t.id, status: "rejected" }); load(); }}>Reject</button></>}
            {t.status === "live" && <button className="link-btn" onClick={async () => { await admin.saveTask({ id: t.id, status: "ended" }); load(); }}>End</button>}
            <button className="link-btn" onClick={() => setEdit(t)}>Edit</button>
          </span>
        </li>
      ))}</ul>
      <h2 className="sec-title">Submissions</h2>
      {!subs.length && <p className="muted">No posts submitted yet.</p>}
      <ul className="arows">{subs.map((s) => { const t = task(s.task_id); const owed = !t ? 0 : t.pay_model === "flat" ? (s.status === "approved" || s.status === "paid" ? t.rate : 0) : ((s.verified_views ?? 0) / 1000) * t.rate; return (
        <li key={s.id} className="arow arow--static">
          <span className="arow__main"><b>{t?.title}</b><small>@{people[s.user_id]?.handle} | <a href={s.post_url} target="_blank" rel="noreferrer">{s.post_url}</a> | claimed {s.claimed_views?.toLocaleString() ?? "n/a"}</small></span>
          {t?.pay_model === "per_1k_views" && <input className="input-sm" aria-label="Verified views" inputMode="numeric" placeholder="Verified views" defaultValue={s.verified_views ?? ""} onBlur={async (e) => { await admin.updateSubmission(s.id, { verified_views: e.target.value ? Number(e.target.value) : null }); load(); }} />}
          <span>{owed ? `Owed $${owed.toFixed(2)}` : ""}</span>
          <span className={`status status--${s.status}`}>{s.status}</span>
          <span className="arow__acts"><button className="link-btn" onClick={async () => { await admin.updateSubmission(s.id, { status: "approved" }); load(); }}>Approve</button><button className="link-btn" onClick={async () => { await admin.updateSubmission(s.id, { status: "paid" }); load(); }}>Paid</button><button className="link-btn link-btn--danger" onClick={async () => { await admin.updateSubmission(s.id, { status: "rejected" }); load(); }}>Reject</button></span>
        </li>
      ); })}</ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit task" : "New task"}>{edit && <TaskEditor t={edit} onDone={() => { setEdit(null); load(); }} />}</Sheet>
    </section>
  );
}

function TaskEditor({ t, onDone }: { t: Partial<Task>; onDone: () => void }) {
  const [f, setF] = useState(t); const set = (k: keyof Task, v: any) => setF((p) => ({ ...p, [k]: v }));
  return (
    <form onSubmit={async (e) => { e.preventDefault(); try { if (!f.title || !f.brand) throw new Error("Add a brand and title."); await admin.saveTask(f); toast("Saved"); onDone(); } catch (x: any) { toast(x.message); } }}>
      <div className="row2">
        <Field label="Brand" id="ab"><input id="ab" value={f.brand ?? ""} onChange={(e) => set("brand", e.target.value)} /></Field>
        <Field label="Title" id="at"><input id="at" value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Type"><select value={f.type} onChange={(e) => set("type", e.target.value)}>{TASK_TYPES.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></Field>
        <Field label="Pays"><select value={f.pay_model} onChange={(e) => set("pay_model", e.target.value)}><option value="per_1k_views">Per 1,000 views</option><option value="flat">Flat per task</option></select></Field>
        <Field label="Rate (USD)" id="ar"><input id="ar" inputMode="decimal" value={f.rate ?? ""} onChange={(e) => set("rate", Number(e.target.value) || 0)} /></Field>
        <Field label="Budget (USD)" id="abu"><input id="abu" inputMode="decimal" value={f.budget ?? ""} onChange={(e) => set("budget", Number(e.target.value) || 0)} /></Field>
      </div>
      <Field label="Description" id="ad"><textarea id="ad" rows={3} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label="Rules" id="aru"><textarea id="aru" rows={2} value={f.rules ?? ""} onChange={(e) => set("rules", e.target.value)} /></Field>
      <Field label="Platforms" id="ap" hint="Separate with commas"><input id="ap" value={(f.platforms ?? []).join(", ")} onChange={(e) => set("platforms", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
      <div className="row2">
        <Field label="Who can take it"><select value={f.vetted_only ? "v" : "a"} onChange={(e) => set("vetted_only", e.target.value === "v")}><option value="a">Open to all</option><option value="v">Vetted only</option></select></Field>
        <Field label="Where"><select value={f.location_mode ?? "remote"} onChange={(e) => set("location_mode", e.target.value)}><option value="remote">Remote</option><option value="onsite">On-site</option><option value="hybrid">Remote or on-site</option></select></Field>
      </div>
      {f.location_mode && f.location_mode !== "remote" && <Field label="City" id="acity"><input id="acity" value={f.location_city ?? ""} onChange={(e) => set("location_city", e.target.value)} /></Field>}
      <Field label="Status"><select value={f.status} onChange={(e) => set("status", e.target.value)}><option value="pending">Needs review</option><option value="live">Live</option><option value="ended">Ended</option><option value="rejected">Rejected</option></select></Field>
      <div className="form-nav"><button className="btn btn--brand">Save task</button></div>
    </form>
  );
}

/* ---------- messages ---------- */
function Messages() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conversation[] | null>(null); const [people, setPeople] = useState<Record<string, Profile>>({});
  const [open, setOpen] = useState<Conversation | null>(null);
  useEffect(() => { admin.conversations().then(async (c) => { setConvs(c); setPeople(await getProfilesByIds(c.map((x) => x.user_id))); }); }, [open]);
  if (!convs || !user) return <Loading />;
  return (
    <section>
      <p className="muted">Every brand and creator talks to the Vetta team here. Nobody can message each other directly.</p>
      {!convs.length && <p className="muted">No messages yet.</p>}
      <ul className="arows">{convs.map((c) => { const p = people[c.user_id]; return (
        <li key={c.id}><button className="arow" onClick={() => setOpen(c)}><Avatar p={p} size={34} />
          <span className="arow__main"><b>{p?.display_name ?? "Account"}</b><small>{p?.role === "brand" ? `Brand${p.company ? `, ${p.company}` : ""}` : `@${p?.handle ?? ""}`} | last message {timeAgo(c.last_at)}</small></span></button></li>
      ); })}</ul>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `Conversation with ${people[open.user_id]?.display_name ?? "account"}` : ""}>{open && <ThreadView conv={open} me={user} people={people} teamView />}</Sheet>
    </section>
  );
}

/* ---------- reports ---------- */
function Reports() {
  const [rows, setRows] = useState<Report[] | null>(null); const [people, setPeople] = useState<Record<string, Profile>>({});
  const load = async () => { const r = await admin.reports(); setRows(r); setPeople(await getProfilesByIds(r.flatMap((x) => [x.reporter_id, x.target_type === "profile" ? x.target_id : ""]).filter(Boolean))); };
  useEffect(() => { load(); }, []);
  if (!rows) return <Loading />;
  return (
    <section>
      {!rows.length && <p className="muted">No reports. When users report a profile, video or message, it lands here.</p>}
      <ul className="arows">{rows.map((r) => (
        <li key={r.id} className="arow arow--static">
          <span className="arow__main"><b>{r.reason}</b><small>{r.target_type}{r.target_type === "profile" && people[r.target_id] ? `: @${people[r.target_id].handle}` : ""} | reported by @{people[r.reporter_id]?.handle} | {timeAgo(r.created_at)}</small></span>
          <span className={`status status--${r.status === "open" ? "new" : "closed"}`}>{r.status}</span>
          <span className="arow__acts">
            {r.target_type === "video" && <button className="link-btn" onClick={async () => { await admin.setVideoStatus(r.target_id, "hidden"); toast("Video hidden"); }}>Hide video</button>}
            {r.target_type === "profile" && <button className="link-btn" onClick={async () => { await admin.setStatus(r.target_id, "suspended"); toast("Account suspended"); }}>Suspend account</button>}
            {r.status === "open" && <button className="link-btn" onClick={async () => { await admin.resolveReport(r.id); load(); }}>Mark resolved</button>}
          </span>
        </li>
      ))}</ul>
    </section>
  );
}

/* ---------- settings ---------- */
function SettingsTab() {
  const [s, setS] = useState<Settings | null>(null); const [email, setEmail] = useState(""); const [key, setKey] = useState("");
  useEffect(() => { admin.settings().then((x) => { setS(x); setEmail(x.notify_email); }); }, []);
  if (!s) return <Loading />;
  return (
    <section className="card settings-card">
      <h2 className="h3">Site colour</h2>
      <p className="muted">Tap a palette to see it across the whole app. It saves for every visitor.</p>
      <PalettePicker value={s.palette} onPick={async (id) => { setS({ ...s, palette: id }); try { await admin.saveSettings({ palette: id }); toast("Colour saved for everyone"); } catch (x: any) { toast(x.message); } }} />
      <h2 className="h3" style={{ marginTop: 24 }}>Email alerts</h2>
      <p className="muted">New entries, briefs, campaigns to review, messages and reports are emailed here. Change it any time.</p>
      <Field label="Send alerts to" id="ane"><input id="ane" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
      <Field label="Resend API key" id="ark" optional hint={s.resend_key_set ? "A key is saved. Paste a new one only to replace it." : "From resend.com, API Keys. Needed for alerts to send."}><input id="ark" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" /></Field>
      <div className="form-nav"><button className="btn btn--brand" onClick={async () => {
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Add a valid email"); return; }
        try { await admin.saveSettings({ notify_email: email.trim().toLowerCase(), ...(key ? { resend_key: key.trim() } : {}) }); setKey(""); toast("Settings saved"); setS(await admin.settings()); } catch (x: any) { toast(x.message); }
      }}>Save alert settings</button></div>
    </section>
  );
}

/* ---------- learn ---------- */
const KINDS: Resource["kind"][] = ["guide", "template", "checklist", "video", "live"];
function LearnAdmin() {
  const [rows, setRows] = useState<Resource[] | null>(null); const [edit, setEdit] = useState<Partial<Resource> | null>(null);
  const load = () => admin.resources().then(setRows); useEffect(() => { load(); }, []);
  if (!rows) return <Loading />;
  return (
    <section>
      <div className="sec-row"><p className="muted">Only vetted creators can see these. Everyone else sees a locked page that tells them how to get vetted.</p>
        <button className="btn btn--brand btn--sm" onClick={() => setEdit({ title: "", kind: "guide", summary: "", body: "", url: "", tags: [], published: true })}>New resource</button></div>
      <ul className="arows">{rows.map((r) => (
        <li key={r.id} className="arow arow--static">
          <span className="arow__main"><b>{r.title}</b><small>{r.kind} | {r.tags.join(", ")}{r.sample ? " | starter content" : ""}</small></span>
          <span className={`status status--${r.published ? "live" : "hidden"}`}>{r.published ? "Published" : "Draft"}</span>
          <span className="arow__acts"><button className="link-btn" onClick={() => setEdit(r)}>Edit</button><button className="link-btn link-btn--danger" onClick={async () => { await admin.deleteResource(r.id); toast("Deleted"); load(); }}>Delete</button></span>
        </li>
      ))}</ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit resource" : "New resource"}>{edit && <ResourceEditor r={edit} onDone={() => { setEdit(null); load(); }} />}</Sheet>
    </section>
  );
}
function ResourceEditor({ r, onDone }: { r: Partial<Resource>; onDone: () => void }) {
  const [f, setF] = useState(r); const set = (k: keyof Resource, v: any) => setF((p) => ({ ...p, [k]: v }));
  return (
    <form onSubmit={async (e) => { e.preventDefault(); try { await admin.saveResource(f); toast("Saved"); onDone(); } catch (x: any) { toast(x.message); } }}>
      <Field label="Title" id="rt"><input id="rt" value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} /></Field>
      <div className="row2">
        <Field label="Type"><select value={f.kind} onChange={(e) => set("kind", e.target.value)}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></Field>
        <Field label="Tags" id="rtg" hint="Separate with commas"><input id="rtg" value={(f.tags ?? []).join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></Field>
      </div>
      <Field label="One-line summary" id="rs"><input id="rs" value={f.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></Field>
      <Field label="Content" id="rb" hint="Plain text. New line for each paragraph."><textarea id="rb" rows={8} value={f.body ?? ""} onChange={(e) => set("body", e.target.value)} /></Field>
      <Field label="Link" id="ru" optional hint="A video, a Google Doc, a template, or the live-session link"><input id="ru" value={f.url ?? ""} onChange={(e) => set("url", e.target.value)} /></Field>
      <label className="check"><input type="checkbox" checked={!!f.published} onChange={(e) => set("published", e.target.checked)} /><span>Published</span></label>
      <div className="form-nav"><button className="btn btn--brand">Save</button></div>
    </form>
  );
}

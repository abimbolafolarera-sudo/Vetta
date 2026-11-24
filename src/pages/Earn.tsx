import { useEffect, useState } from "react";
import { A, Chips, Field, Icon, Loading, Sheet, formatDate, timeAgo, toast } from "../components/ui";
import { EARN, NICHES, TASK_TYPES, nicheName, taskTypeName } from "../config";
import { liveTasks, mySubmissions, proposeTask, submitTaskPost, uploadCampaignAsset } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Task, TaskSubmission } from "../lib/types";
import { go } from "../router";

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
export const payText = (t: Pick<Task, "pay_model" | "rate" | "base_fee">) => t.pay_model === "flat" ? <><b>{money(t.rate)}</b> per post</>
  : t.pay_model === "hybrid" ? <><b>{money(t.base_fee ?? 0)}</b> + {money(t.rate)} per 1k views</> : <><b>{money(t.rate)}</b> per 1k views</>;
export const gigPlace = (t: Task) => t.location_mode === "onsite" ? `On-site${t.location_city ? ` in ${t.location_city}` : ""}` : t.location_mode === "hybrid" ? `Remote or on-site${t.location_city ? ` in ${t.location_city}` : ""}` : "Remote";

export function Earn() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [subs, setSubs] = useState<TaskSubmission[]>([]);
  const [type, setType] = useState(""); const [where, setWhere] = useState<"" | "remote" | "near">(""); const [mine, setMine] = useState(false);
  const [open, setOpen] = useState<Task | null>(null);
  useEffect(() => { liveTasks().then(setTasks); if (user?.role === "creator") mySubmissions().then(setSubs); }, [user?.id]);
  const vetted = user?.role === "creator" && user.vetted;
  const city = (user?.city ?? "").toLowerCase();
  const shown = (tasks ?? []).filter((t) => (!type || t.type === type)
    && (!where || (where === "remote" ? t.location_mode !== "onsite" : !!city && (t.location_city ?? "").toLowerCase() === city))
    && (!mine || !t.vetted_only || vetted));

  return (
    <main id="main" className="page">
      <header className="earn-head card--print card">
        <p className="kicker">{EARN.name} <span className="earn-open">Open to every creator</span></p>
        <h1 className="h1">Paid gigs from brands.</h1>
        {user?.role === "creator" ? (vetted
          ? <p className="lede">You're vetted, so every gig is open to you, including the ones marked <b>Vetted only</b>.</p>
          : <p className="lede"><b>You're not vetted yet, and you can still earn here.</b> Every gig marked <b>Open to all</b> is yours to take. Get vetted to unlock the rest.</p>)
          : <p className="lede">Not vetted yet? You can earn here. Vetted? You earn here too. Clips, UGC videos, reviews, on-site events: each gig shows the pay up front.</p>}
        <p className="earn-quality"><b>Not drag and drop.</b> Every gig here is a real brand brief, reviewed by Vetta before it goes live. We don't copy jobs from other job boards, and we don't post click-farm tasks.</p>
        <p className="earn-path">Do great work here and we'll invite you to the next Drop. That's how many Vetta creators get in.</p>
        <div className="row-btns">
          {!user && <A page="signup" arg="creator" className="btn btn--brand">Create a creator account to start</A>}
          {user?.role === "creator" && !vetted && <A page="enter" className="btn btn--soft">Get vetted</A>}
          {(!user || user.role === "brand") && <A page="campaign" className="btn btn--soft">I'm a brand: post a campaign</A>}
        </div>
      </header>

      <nav className="pills"><button className={`pill ${!type ? "is-on" : ""}`} onClick={() => setType("")}>All gigs</button>{TASK_TYPES.map((t) => <button key={t.slug} className={`pill ${type === t.slug ? "is-on" : ""}`} onClick={() => setType(t.slug)}>{t.name}</button>)}</nav>
      <div className="filters">
        <div className="seg">
          <button className={!where ? "is-on" : ""} onClick={() => setWhere("")}>Anywhere</button>
          <button className={where === "remote" ? "is-on" : ""} onClick={() => setWhere("remote")}>Remote</button>
          <button className={where === "near" ? "is-on" : ""} onClick={() => { if (!city) { toast("Add your city in Settings to see gigs near you"); return; } setWhere("near"); }}>Near me{user?.city ? ` (${user.city})` : ""}</button>
        </div>
        {user?.role === "creator" && !vetted && <label className="check check--inline"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /><span>Only gigs I can take</span></label>}
      </div>

      {!tasks ? <Loading /> : shown.length === 0 ? <div className="empty-state"><Icon name="earn" size={34} /><p>No gigs match right now. New ones are added as brands post campaigns.</p></div> : (
        <ul className="task-cards">{shown.map((t) => {
          const locked = t.vetted_only && !vetted && user?.role !== "admin";
          return (
            <li key={t.id} className="card gig">
              <div className="gig__top">
                <span className="tag tag--brand">{taskTypeName(t.type)}</span>
                <span className={`tag ${t.vetted_only ? "tag--accent" : ""}`}>{t.vetted_only ? "Vetted only" : "Open to all"}</span>
                <span className="gig__pay">{payText(t)}</span>
              </div>
              <h2 className="h3">{t.title}</h2>
              <p className="muted gig__brand">{t.brand}</p>
              <p>{t.description}</p>
              {t.deliverables && <p className="gig__line"><Icon name="check" size={16} /> {t.deliverables}</p>}
              <p className="gig__line"><Icon name="pin" size={16} /> {gigPlace(t)}</p>
              {t.deadline && <p className="gig__line"><Icon name="calendar" size={16} /> Deliver by {formatDate(t.deadline)}</p>}
              {!!t.niches?.length && <p className="gig__line muted">{t.niches.map(nicheName).join(", ")}{t.slots ? ` | ${t.slots} spots` : ""}</p>}
              {!!t.assets?.length && <p className="gig__assets">{t.assets.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer"><Icon name="file" size={15} /> {a.name}</a>)}</p>}
              <details className="gig__rules"><summary>Rules</summary><p>{t.rules}</p></details>
              <button className="btn btn--brand btn--sm" disabled={locked} onClick={() => {
                if (!user) { toast("Create a creator account to take gigs"); go("signup", "creator"); return; }
                if (user.role !== "creator") { toast("Gigs are for creator accounts"); return; }
                setOpen(t);
              }}>{locked ? "Vetted creators only" : t.type === "ugc" || t.type === "event" ? "Apply or submit" : "Submit your post"}</button>
            </li>
          );
        })}</ul>
      )}

      {subs.length > 0 && (
        <section className="dash-sec">
          <h2 className="sec-title">Your submissions</h2>
          <ul className="rows">{subs.map((s) => (
            <li key={s.id}><span><b className="break">{s.post_url}</b><small>{tasks?.find((t) => t.id === s.task_id)?.title ?? "Gig"} | {timeAgo(s.created_at)}{s.verified_views ? ` | ${s.verified_views.toLocaleString()} verified views` : ""}</small></span><span className={`status status--${s.status}`}>{s.status}</span></li>
          ))}</ul>
        </section>
      )}
      <div className="card rules-card">
        <h2 className="h3">Rules that keep {EARN.name} paying</h2>
        <ul className="ticks"><li>Original, creative work only. Clips need your own edit and hook, not a straight re-upload.</li><li>Real posts and real views only. No bots, bought views or engagement groups, and no paid star ratings.</li><li>Vetta never pays for likes, comments or follows.</li><li>Disclose every paid post with #ad or the platform's paid-partnership label.</li><li>Posts stay up for at least 30 days.</li><li>Every submission is reviewed within 7 days. If one is rejected, you'll get the reason and can appeal through Message Vetta.</li></ul>
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? open.title : ""}>{open && <SubmitPost t={open} onDone={async () => { setOpen(null); setSubs(await mySubmissions()); }} />}</Sheet>
    </main>
  );
}

function SubmitPost({ t, onDone }: { t: Task; onDone: () => void }) {
  const [url, setUrl] = useState(""); const [views, setViews] = useState(""); const [err, setErr] = useState("");
  const delivered = t.type === "ugc" || t.type === "event";
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setErr(""); try { await submitTaskPost(t.id, url.trim(), views ? Number(views) : null); toast("Submitted. The brand and Vetta will review it."); onDone(); } catch (x: any) { setErr(x.message); } }}>
      <p className="muted">{delivered ? "Share a link to your video files (Google Drive or Dropbox, set to anyone with the link) or to your post." : "Post on your own account, then paste the link here."}</p>
      <Field label={delivered ? "Link to your work" : "Link to your post"} id="pu"><input id="pu" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
      {t.pay_model === "per_1k_views" && <Field label="Current views" id="pv" optional><input id="pv" inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value.replace(/\D/g, ""))} /></Field>}
      {err && <p className="form-fail">{err}</p>}
      <div className="form-nav"><button className="btn btn--brand">Submit</button></div>
    </form>
  );
}

/* ---------------- brands: post a campaign ---------------- */
export function CampaignNew() {
  const { user, loading } = useAuth();
  const [f, setF] = useState({
    title: "", type: "ugc", niches: [] as string[], description: "", deliverables: "",
    vetted_only: true, location_mode: "remote" as "remote" | "onsite" | "hybrid", location_city: "", slots: 10 as number | null,
    pay_model: "flat" as "flat" | "per_1k_views" | "hybrid", base_fee: 0, rate: 0, budget: 0, min_views: 0, deadline: "",
    platforms: ["TikTok", "Instagram"], rules: "Original work only. Disclose paid posts with #ad. Posts stay up for 30 days.", assets: [] as { name: string; url: string }[], link: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [up, setUp] = useState(false); const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  if (loading) return <main id="main" className="page"><Loading /></main>;
  if (!user || user.role !== "brand") return (
    <main id="main" className="page page--narrow">
      <div className="card card--print status-card">
        <Icon name="brands" size={36} />
        <h1 className="h2">Post a campaign on Vetta</h1>
        <p className="muted">Tell vetted creators what you need, set the pay, and let them come to you. You need a free brand account so you can review what creators send.</p>
        <div className="row-btns">{!user ? <><A page="signup" arg="brand" className="btn btn--brand">Create a brand account</A><A page="login" className="btn btn--soft">Log in</A></> : <A page="brands" className="btn btn--soft">Send a brief instead</A>}</div>
      </div>
    </main>
  );
  if (done) return (
    <main id="main" className="page page--narrow">
      <div className="card status-card"><span className="done-box__i"><Icon name="check" /></span><h1 className="h2">Campaign sent for review</h1>
        <p className="muted">The Vetta team checks every campaign before it goes live in {EARN.name}, usually within one working day. You'll see creators' submissions in your dashboard.</p>
        <div className="row-btns"><A page="me" className="btn btn--brand">Go to dashboard</A><A page="explore" className="btn btn--soft">Browse creators</A></div></div>
    </main>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.title.trim()) er.title = "Give the campaign a title creators will understand.";
    if (f.description.trim().length < 30) er.description = "Describe what you want made in a few sentences.";
    if (f.location_mode !== "remote" && !f.location_city.trim()) er.location_city = "Add the city for on-site work.";
    if (!f.rate) er.rate = "Set the pay.";
    if (!f.budget || f.budget < f.rate) er.budget = "Add your total budget. It must cover at least one creator.";
    setErrors(er); if (Object.keys(er).length) { window.scrollTo(0, 0); return; }
    setBusy(true);
    try {
      const assets = [...f.assets, ...(f.link.trim() ? [{ name: "Brand content link", url: f.link.trim() }] : [])];
      const { link: _l, ...rest } = f;
      await proposeTask({ ...rest, assets, brand: user!.company || user!.display_name, location_city: f.location_mode === "remote" ? null : f.location_city.trim(), deadline: f.deadline || null, source_url: f.link.trim() || null });
      setDone(true); window.scrollTo(0, 0);
    } catch (x: any) { toast(x.message); } finally { setBusy(false); }
  }

  return (
    <main id="main" className="page page--narrow">
      <h1 className="h1">Post a campaign</h1>
      <p className="lede">It goes live in {EARN.name} after a quick review. Creators apply or submit, and you see everything in your dashboard.</p>
      <form onSubmit={submit} noValidate>
        <section className="card">
          <h2 className="h3">What you need</h2>
          <Field label="Campaign title" id="ct" error={errors.title}><input id="ct" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 3 UGC videos for our sunscreen launch" /></Field>
          <Field label="Type of gig"><Chips name="Type" max={1} options={TASK_TYPES.map((t) => ({ value: t.slug, label: t.name }))} value={[f.type]} onChange={(v) => set("type", v[0] ?? "ugc")} /></Field>
          <Field label="Niches" hint="Up to three."><Chips name="Niches" max={3} options={NICHES.map((n) => ({ value: n.slug, label: n.name }))} value={f.niches} onChange={(v) => set("niches", v)} /></Field>
          <Field label="The brief" id="cd" error={errors.description} hint="The product, who it's for, the message, and the feel you want."><textarea id="cd" rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Deliverables" id="cdl" optional hint="e.g. 3 vertical videos, raw files, 2 hooks each"><input id="cdl" value={f.deliverables} onChange={(e) => set("deliverables", e.target.value)} /></Field>
        </section>

        <section className="card">
          <h2 className="h3">Who and where</h2>
          <Field label="Who can take it">
            <div className="radios radios--row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <label className={`radio ${f.vetted_only ? "is-on" : ""}`}><input type="radio" checked={f.vetted_only} onChange={() => set("vetted_only", true)} /> Vetted creators only</label>
              <label className={`radio ${!f.vetted_only ? "is-on" : ""}`}><input type="radio" checked={!f.vetted_only} onChange={() => set("vetted_only", false)} /> Open to all creators</label>
            </div>
          </Field>
          <Field label="Where the work happens">
            <div className="radios radios--row">
              {([["remote", "Remote"], ["onsite", "On-site"], ["hybrid", "Remote or on-site"]] as const).map(([v, l]) => <label key={v} className={`radio ${f.location_mode === v ? "is-on" : ""}`}><input type="radio" checked={f.location_mode === v} onChange={() => set("location_mode", v)} /> {l}</label>)}
            </div>
          </Field>
          {f.location_mode !== "remote" && <Field label="City" id="cc" error={errors.location_city}><input id="cc" value={f.location_city} onChange={(e) => set("location_city", e.target.value)} placeholder="e.g. Lagos" /></Field>}
          <Field label="How many creators" id="cs"><input id="cs" inputMode="numeric" value={f.slots ?? ""} onChange={(e) => set("slots", Number(e.target.value.replace(/\D/g, "")) || null)} /></Field>
        </section>

        <section className="card">
          <h2 className="h3">Pay</h2>
          <Field label="How it pays">
            <div className="radios radios--row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <label className={`radio ${f.pay_model === "flat" ? "is-on" : ""}`}><input type="radio" checked={f.pay_model === "flat"} onChange={() => set("pay_model", "flat")} /> Fixed fee per creator</label>
              <label className={`radio ${f.pay_model === "hybrid" ? "is-on" : ""}`}><input type="radio" checked={f.pay_model === "hybrid"} onChange={() => set("pay_model", "hybrid")} /> Fee plus views bonus</label>
              <label className={`radio ${f.pay_model === "per_1k_views" ? "is-on" : ""}`}><input type="radio" checked={f.pay_model === "per_1k_views"} onChange={() => set("pay_model", "per_1k_views")} /> Per 1,000 verified views</label>
            </div>
          </Field>
          <div className="row3">
            {f.pay_model === "hybrid" && <Field label="Base fee per creator (USD)" id="cbf"><input id="cbf" inputMode="decimal" value={f.base_fee || ""} onChange={(e) => set("base_fee", Number(e.target.value) || 0)} /></Field>}
            <Field label={f.pay_model === "flat" ? "Fee per creator (USD)" : f.pay_model === "hybrid" ? "Bonus per 1,000 views (USD)" : "Rate per 1,000 views (USD)"} id="cr" error={errors.rate}><input id="cr" inputMode="decimal" value={f.rate || ""} onChange={(e) => set("rate", Number(e.target.value) || 0)} /></Field>
            <Field label="Total budget (USD)" id="cb" error={errors.budget}><input id="cb" inputMode="decimal" value={f.budget || ""} onChange={(e) => set("budget", Number(e.target.value) || 0)} /></Field>
            <Field label="Deadline" id="cdd" optional><input id="cdd" type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
          </div>
          <p className="muted small">{f.pay_model === "flat" ? "A fixed fee is best for most campaigns, especially in Africa, where pay per view adds up slowly." : "Views are checked before payout. A base fee keeps quality creators interested; pay per view alone attracts bots."} Vetta adds a service fee on top of creator pay and confirms the total before the campaign goes live.</p>
        </section>

        <section className="card">
          <h2 className="h3">Brand content and references</h2>
          <p className="muted">Product shots, logos, your launch video, mood boards. Upload files (up to 50 MB each) or paste a link.</p>
          <div className="assets">
            {f.assets.map((a, i) => <span key={a.url} className="asset"><Icon name="file" size={16} /> {a.name}<button type="button" className="link-btn" onClick={() => set("assets", f.assets.filter((_, j) => j !== i))} aria-label={`Remove ${a.name}`}><Icon name="x" size={14} /></button></span>)}
            <label className="btn btn--soft btn--sm">{up ? "Uploading…" : "Upload files"}
              <input type="file" multiple className="sr-only" onChange={async (e) => {
                const files = Array.from(e.target.files ?? []); if (!files.length) return; setUp(true);
                try { const out = []; for (const file of files) out.push(await uploadCampaignAsset(file)); set("assets", [...f.assets, ...out]); } catch (x: any) { toast(x.message); } finally { setUp(false); }
              }} />
            </label>
          </div>
          <Field label="Or a link to your files" id="cl" optional><input id="cl" value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="Google Drive, Dropbox or WeTransfer" /></Field>
          <Field label="Rules for creators" id="cru"><textarea id="cru" rows={2} value={f.rules} onChange={(e) => set("rules", e.target.value)} /></Field>
        </section>
        <div className="form-nav"><button className="btn btn--brand" disabled={busy || up}>{busy ? "Sending…" : "Send for review"}</button></div>
      </form>
    </main>
  );
}

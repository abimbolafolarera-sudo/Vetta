import { useEffect, useState } from "react";
import { A, Avatar, Chips, Field, Icon, Sheet, Verified, toast } from "../components/ui";
import { NICHES, nicheName } from "../config";
import { confirmBrief, createShortlist, myShortlists, report, setInShortlist, startBrief, stopBriefEmails } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { BriefDraft, CreatorCard, Profile, Shortlist } from "../lib/types";

export function SaveSheet({ creator, onClose }: { creator: Profile | null; onClose: () => void }) {
  const [lists, setLists] = useState<Shortlist[] | null>(null);
  const [name, setName] = useState("");
  useEffect(() => { if (creator) myShortlists().then(setLists); }, [creator]);
  if (!creator) return null;
  return (
    <Sheet open onClose={onClose} title={`Save ${creator.display_name}`}>
      {!lists ? <p className="muted">Loading…</p> : (
        <>
          {lists.length === 0 && <p className="muted">No shortlists yet. Create one for a campaign.</p>}
          <ul className="list">
            {lists.map((l) => {
              const on = l.creator_ids.includes(creator.id);
              return (
                <li key={l.id}>
                  <label className="check">
                    <input type="checkbox" checked={on} onChange={async (e) => {
                      await setInShortlist(l.id, creator.id, e.target.checked);
                      setLists(lists.map((x) => x.id === l.id ? { ...x, creator_ids: e.target.checked ? [...x.creator_ids, creator.id] : x.creator_ids.filter((c) => c !== creator.id) } : x));
                      toast(e.target.checked ? `Saved to ${l.name}` : `Removed from ${l.name}`);
                    }} />
                    <span><b>{l.name}</b> <span className="muted">{l.creator_ids.length} creators</span></span>
                  </label>
                </li>
              );
            })}
          </ul>
          <form className="inline-form" onSubmit={async (e) => {
            e.preventDefault();
            try { const l = await createShortlist(name); await setInShortlist(l.id, creator.id, true); setLists([...lists, { ...l, creator_ids: [creator.id] }]); setName(""); toast(`Saved to ${l.name}`); }
            catch (x: any) { toast(x.message); }
          }}>
            <input aria-label="New shortlist name" placeholder="New list, e.g. Skincare launch" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn--brand btn--sm">Create and save</button>
          </form>
        </>
      )}
    </Sheet>
  );
}

const REASONS = ["Spam or scam", "Nudity or sexual content", "Hate or harassment", "Violence or dangerous acts", "Stolen content", "Fake views or engagement", "Something else"];
export function ReportSheet({ type, id, onDone }: { type: "profile" | "video" | "message"; id: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div>
      <p className="muted">Reports go to the Vetta team. The person you report isn't told who reported them.</p>
      <div className="radios">{REASONS.map((r) => (
        <label key={r} className={`radio ${reason === r ? "is-on" : ""}`}><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}</label>
      ))}</div>
      <div className="form-nav">
        <button className="btn btn--brand" disabled={!reason} onClick={async () => { try { await report(type, id, reason); toast("Reported. Thank you."); onDone(); } catch (e: any) { toast(e.message); } }}>Send report</button>
      </div>
    </div>
  );
}

const BUDGETS = ["Under $500", "$500 to $2,000", "$2,000 to $10,000", "$10,000+", "Not sure yet"];
const TIMELINES = ["This week", "Within a month", "1 to 3 months", "Just exploring"];
const WHERE = [{ value: "remote", label: "Remote is fine" }, { value: "onsite", label: "On-site, in my city" }, { value: "hybrid", label: "Either" }];

export const rateText = (c: Pick<CreatorCard, "rate_from" | "rate_to">) =>
  c.rate_from ? (c.rate_to && c.rate_to > c.rate_from ? `$${c.rate_from} to $${c.rate_to} per video` : `From $${c.rate_from} per video`) : "Rate on request";

/** The numbers Vetta tracks from delivered work. Shows nothing until there's a track record. */
export function Scorecard({ c, compact }: { c: Pick<CreatorCard, "jobs_done" | "on_time_pct" | "brand_rating" | "hook_rate">; compact?: boolean }) {
  const items: [string, string][] = [];
  if (c.jobs_done) items.push([String(c.jobs_done), c.jobs_done === 1 ? "brief delivered" : "briefs delivered"]);
  if (c.on_time_pct != null) items.push([`${c.on_time_pct}%`, "on time"]);
  if (c.brand_rating != null) items.push([Number(c.brand_rating).toFixed(1), "brand rating"]);
  if (c.hook_rate != null && !compact) items.push([`${c.hook_rate}%`, "avg. hook rate"]);
  if (!items.length) return <p className="score score--new">New to Vetta: no delivered briefs yet</p>;
  return <dl className={`score ${compact ? "score--compact" : ""}`}>{items.map(([v, l]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}</dl>;
}

function MatchCard({ c, picked, onPick }: { c: CreatorCard; picked: boolean; onPick: (on: boolean) => void }) {
  return (
    <li className={`match ${picked ? "is-on" : ""}`}>
      <label className="match__pick"><input type="checkbox" checked={picked} onChange={(e) => onPick(e.target.checked)} /><span className="sr-only">Pick {c.display_name}</span></label>
      <Avatar p={c} size={52} />
      <div className="match__main">
        <p className="match__name"><A page="u" arg={c.handle}>{c.display_name}</A> <Verified size={15} /></p>
        <p className="match__meta">{[c.niches.slice(0, 2).map(nicheName).join(", "), [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" | ")}</p>
        <p className="match__rate">{rateText(c)}</p>
        <Scorecard c={c} compact />
      </div>
    </li>
  );
}

/** Matched creators for a draft brief, with the "Book through Vetta" step. */
export function MatchView({ draft, email, resumed, onBooked }: { draft: BriefDraft; email: string; resumed?: boolean; onBooked?: () => void }) {
  const { user } = useAuth();
  const [picked, setPicked] = useState<string[]>(draft.matches.map((m) => m.id));
  const [busy, setBusy] = useState(false); const [booked, setBooked] = useState(draft.status ? draft.status !== "draft" : false);
  const [stopped, setStopped] = useState(!!draft.unsubscribed);
  if (booked) return (
    <div className="done-box"><span className="done-box__i"><Icon name="check" /></span><h3 className="h3">Booked through Vetta</h3>
      <p className="muted">We'll tailor your brief to {picked.length ? "the creators you picked" : "the right creators"} and reply to {email} within one working day with timelines and the final price, before anything is paid.</p>
      {user?.role === "brand" ? <p><A page="me">Track it in your dashboard</A></p> : <p><A page="signup" arg="brand">Create a free brand account</A> to save creators and track briefs.</p>}
    </div>
  );
  return (
    <div className="matches">
      <div className="matches__head">
        <h3 className="h3">{draft.matches.length ? `${draft.matches.length} vetted ${draft.matches.length === 1 ? "creator fits" : "creators fit"} your brief` : "We'll hand-pick creators for this one"}</h3>
        <p className="muted">{draft.matches.length ? "Matching is free. Nothing is booked until you tap Book through Vetta." : "Nobody on Vetta matches every detail yet. Book through Vetta and our team will put a shortlist together for you."}</p>
      </div>
      {draft.matches.length > 0 && <ul className="match-list">{draft.matches.map((c) => (
        <MatchCard key={c.id} c={c} picked={picked.includes(c.id)} onPick={(on) => setPicked(on ? [...picked, c.id] : picked.filter((x) => x !== c.id))} />
      ))}</ul>}
      <div className="matches__cta">
        <button className="btn btn--brand" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await confirmBrief(draft.id, draft.token, picked); setBooked(true); onBooked?.(); } catch (x: any) { toast(x.message); } finally { setBusy(false); }
        }}>{busy ? "Booking…" : "Book through Vetta"}</button>
        <p className="small muted">You pay the creator's rate plus a Vetta fee, shown before you pay. If a video misses the brief, we reshoot it or replace the creator.</p>
        {resumed && !stopped && <button className="link-btn small" onClick={async () => { await stopBriefEmails(draft.id, draft.token); setStopped(true); toast("We won't email you about this brief again"); }}>Stop these emails</button>}
      </div>
    </div>
  );
}

export function BriefForm({ creator, onDone }: { creator?: Profile | null; onDone?: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ company: user?.company ?? "", contact_name: user?.role === "brand" ? user.display_name : "", email: user?.email ?? "", niches: [] as string[], budget: "", timeline: "", brief: "",
    city: "", work_mode: "remote", whatsapp: "", whatsapp_optin: false, hp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [draft, setDraft] = useState<BriefDraft | null>(null); const [fail, setFail] = useState("");
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.company.trim()) er.company = "Add your company or brand name.";
    if (!f.contact_name.trim()) er.contact_name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = "Add a work email we can reply to.";
    if (!creator && !f.niches.length) er.niches = "Choose the niche you need.";
    if (!f.budget) er.budget = "Choose a budget range.";
    if (!f.timeline) er.timeline = "Choose a timeline.";
    if (f.brief.trim().length < 20) er.brief = "Tell us a little more: the product, the goal and what you'd like made.";
    if (f.whatsapp && !/^\+?[0-9 ()-]{7,20}$/.test(f.whatsapp.trim())) er.whatsapp = "Use a number with your country code, like +234 801 234 5678.";
    setErrors(er); if (Object.keys(er).length) return;
    if (f.hp) { setDraft({ id: "", token: "", matches: [] }); return; }
    setBusy(true); setFail("");
    try {
      const { hp: _h, ...rest } = f;
      const d = await startBrief({ ...rest, email: f.email.trim().toLowerCase(), creator_id: creator?.id ?? null, niches: creator ? creator.niches : f.niches,
        city: f.city.trim() || null, work_mode: f.work_mode as any, whatsapp: f.whatsapp.trim() || null, whatsapp_optin: !!f.whatsapp.trim() && f.whatsapp_optin });
      setDraft(d);
    } catch (x: any) { setFail(x.message || "Your brief didn't send. Try again."); } finally { setBusy(false); }
  }
  if (draft) return <MatchView draft={draft} email={f.email} onBooked={onDone} />;
  return (
    <form onSubmit={submit} noValidate>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.hp} onChange={(e) => set("hp", e.target.value)} />
      <Field label="The brief" id="bb" error={errors.brief} hint={creator ? `What you'd like ${creator.display_name.split(" ")[0]} to make, the product, the goal and timing.` : "Paste your brief, or write the product, who it's for, the goal and how many videos you need."}><textarea id="bb" rows={5} value={f.brief} onChange={(e) => set("brief", e.target.value)} /></Field>
      {!creator && <Field label="Niches you need" error={errors.niches}><Chips name="Niches" options={NICHES.map((n) => ({ value: n.slug, label: n.name }))} value={f.niches} onChange={(v) => set("niches", v)} /></Field>}
      <Field label="Budget" error={errors.budget}><Chips name="Budget" max={1} options={BUDGETS.map((b) => ({ value: b, label: b }))} value={f.budget ? [f.budget] : []} onChange={(v) => set("budget", v[0] ?? "")} /></Field>
      <Field label="Timeline" error={errors.timeline}><Chips name="Timeline" max={1} options={TIMELINES.map((b) => ({ value: b, label: b }))} value={f.timeline ? [f.timeline] : []} onChange={(v) => set("timeline", v[0] ?? "")} /></Field>
      <div className="row2">
        <Field label="Where they'll work"><Chips name="Where" max={1} options={WHERE} value={[f.work_mode]} onChange={(v) => set("work_mode", v[0] ?? "remote")} /></Field>
        <Field label="Your city" id="bci" optional><input id="bci" value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Lagos" /></Field>
      </div>
      <div className="row2">
        <Field label="Company or brand" id="bco" error={errors.company}><input id="bco" value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Your name" id="bcn" error={errors.contact_name}><input id="bcn" value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
      </div>
      <div className="row2">
        <Field label="Work email" id="bem" error={errors.email}><input id="bem" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="WhatsApp number" id="bwa" optional error={errors.whatsapp}><input id="bwa" type="tel" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+234 801 234 5678" /></Field>
      </div>
      {f.whatsapp.trim() && <label className="check"><input type="checkbox" checked={f.whatsapp_optin} onChange={(e) => set("whatsapp_optin", e.target.checked)} /><span>Vetta can message me on WhatsApp about this brief</span></label>}
      {fail && <p className="form-fail" role="alert">{fail}</p>}
      <div className="form-nav"><button className="btn btn--brand" disabled={busy}>{busy ? "Matching…" : "See my matches"}</button></div>
      <p className="small muted">Free, and you'll see matched creators straight away. We'll email you your matches too.</p>
    </form>
  );
}

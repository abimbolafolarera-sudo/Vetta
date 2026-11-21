import { useEffect, useState } from "react";
import { A, Chips, Field, Icon, Sheet, toast } from "../components/ui";
import { NICHES } from "../config";
import { createShortlist, myShortlists, report, setInShortlist, submitBrief } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Profile, Shortlist } from "../lib/types";

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

export function BriefForm({ creator, onDone }: { creator?: Profile | null; onDone?: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ company: user?.company ?? "", contact_name: user?.role === "brand" ? user.display_name : "", email: user?.email ?? "", niches: [] as string[], budget: "", timeline: "", brief: "", hp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [fail, setFail] = useState("");
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
    setErrors(er); if (Object.keys(er).length) return;
    if (f.hp) { setDone(true); return; }
    setBusy(true); setFail("");
    try { const { hp: _h, ...rest } = f; await submitBrief({ ...rest, email: f.email.trim().toLowerCase(), creator_id: creator?.id ?? null, niches: creator ? creator.niches : f.niches }); setDone(true); onDone?.(); }
    catch (x: any) { setFail(x.message || "Your brief didn't send. Try again."); } finally { setBusy(false); }
  }
  if (done) return (
    <div className="done-box"><span className="done-box__i"><Icon name="check" /></span><h3 className="h3">Brief sent to Vetta</h3>
      <p className="muted">The Vetta team will reply to {f.email} within two working days{creator ? ` about ${creator.display_name}` : " with a shortlist"}.{user?.role === "brand" ? " Track it in your dashboard and message us from your inbox." : ""}</p>
      {!user && <p><A page="signup" arg="brand">Create a free brand account</A> to save creators and track briefs.</p>}
    </div>
  );
  return (
    <form onSubmit={submit} noValidate>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.hp} onChange={(e) => set("hp", e.target.value)} />
      <div className="row2">
        <Field label="Company or brand" id="bco" error={errors.company}><input id="bco" value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Your name" id="bcn" error={errors.contact_name}><input id="bcn" value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
      </div>
      <Field label="Work email" id="bem" error={errors.email}><input id="bem" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
      {!creator && <Field label="Niches you need" error={errors.niches}><Chips name="Niches" options={NICHES.map((n) => ({ value: n.slug, label: n.name }))} value={f.niches} onChange={(v) => set("niches", v)} /></Field>}
      <Field label="Budget" error={errors.budget}><Chips name="Budget" max={1} options={BUDGETS.map((b) => ({ value: b, label: b }))} value={f.budget ? [f.budget] : []} onChange={(v) => set("budget", v[0] ?? "")} /></Field>
      <Field label="Timeline" error={errors.timeline}><Chips name="Timeline" max={1} options={TIMELINES.map((b) => ({ value: b, label: b }))} value={f.timeline ? [f.timeline] : []} onChange={(v) => set("timeline", v[0] ?? "")} /></Field>
      <Field label="The brief" id="bb" error={errors.brief} hint={creator ? `What you'd like ${creator.display_name.split(" ")[0]} to make, the product, the goal and timing.` : "The product, who it's for, the goal, and how many videos you need."}><textarea id="bb" rows={5} value={f.brief} onChange={(e) => set("brief", e.target.value)} /></Field>
      {fail && <p className="form-fail" role="alert">{fail}</p>}
      <div className="form-nav"><button className="btn btn--brand" disabled={busy}>{busy ? "Sending…" : "Send brief to Vetta"}</button></div>
    </form>
  );
}

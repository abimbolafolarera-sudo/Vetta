import { useEffect, useRef, useState } from "react";
import { A, Chips, Countdown, Field, Icon, Loading, Mark, formatDate, toast } from "../components/ui";
import { Player } from "../components/Video";
import { EARN, FORMATS, NICHES, WORK_MODES, config } from "../config";
import { myEntry, submitEntry, uploadVideo } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Entry, Video, WorkLink } from "../lib/types";
import { go } from "../router";

/* ---------------- shared video picker ---------------- */
function VideoPicker({ kind, caption, niches, onReady }: { kind: "entry" | "post"; caption: string; niches: string[]; onReady: (v: Video) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null); const [err, setErr] = useState(""); const [video, setVideo] = useState<Video | null>(null);
  async function pick(file?: File) {
    if (!file) return; setErr(""); setPct(0);
    try {
      const dur = await new Promise<number>((res) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => res(v.duration); v.onerror = () => res(0); v.src = URL.createObjectURL(file); });
      if (dur > config.maxVideoSeconds + 1) throw new Error(`Keep it under ${Math.round(config.maxVideoSeconds / 60)} minutes.`);
      const v = await uploadVideo(file, { caption, niches, kind }, setPct); setVideo(v); onReady(v);
    } catch (e: any) { setErr(e.message); } finally { setPct(null); }
  }
  return (
    <div className="picker">
      {video ? (
        <div className="picker__done">
          <div className="picker__preview"><Player v={video} active muted fit="cover" /></div>
          <div><p><b>{video.status === "processing" ? "Uploaded. Processing now." : "Video ready."}</b></p>
            <button type="button" className="btn btn--soft btn--sm" onClick={() => input.current?.click()}>Replace video</button></div>
        </div>
      ) : (
        <button type="button" className="drop" onClick={() => input.current?.click()} disabled={pct !== null}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}>
          <Icon name="upload" size={34} />
          <b>{pct !== null ? `Uploading ${pct}%` : "Select a video to upload"}</b>
          <span>Vertical 9:16 works best. MP4 or MOV, up to {Math.round(config.maxVideoSeconds / 60)} minutes and {config.maxVideoMB} MB.</span>
          {pct !== null && <span className="bar"><span style={{ width: `${pct}%` }} /></span>}
        </button>
      )}
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      {err && <p className="field__err" role="alert">{err}</p>}
    </div>
  );
}

/* ---------------- upload a post ---------------- */
export function Upload() {
  const { user, loading } = useAuth();
  const [caption, setCaption] = useState(""); const [niches, setNiches] = useState<string[]>([]);
  const [video, setVideo] = useState<Video | null>(null);
  if (loading) return <main id="main" className="page"><Loading /></main>;
  if (!user) return <Gate text="Log in to upload videos." />;
  if (user.role === "brand") return <Gate text="Uploading videos is for creator accounts. Brands can post a campaign instead." />;
  return (
    <main id="main" className="page page--narrow">
      <h1 className="h1">Upload</h1>
      {!user.vetted && <div className="banner"><Icon name="lock" size={18} /><span>Your videos stay private until you're vetted. They're also part of what the Vetta team reviews.</span></div>}
      <div className="card">
        <Field label="Caption" id="uc" hint="What's it about? Add the brand if it's brand work."><textarea id="uc" rows={3} maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
        <Field label="Niches" hint="Up to three."><Chips name="Niches" max={3} options={NICHES.map((n) => ({ value: n.slug, label: n.name }))} value={niches} onChange={setNiches} /></Field>
        <VideoPicker kind="post" caption={caption} niches={niches} onReady={setVideo} />
        {video && <div className="form-nav"><button className="btn btn--brand" onClick={() => { toast("Posted to your profile"); go("u", user.handle); }}>Done, view my profile</button></div>}
      </div>
    </main>
  );
}

/* ---------------- enter the drop ---------------- */
const LEVELS = ["Just starting (under 1 year)", "Growing (1 to 2 years)", "Established (2+ years)", "Full-time creator"];
const STEPS = ["About you", "Your craft", "Your entry", "Confirm"];

export function Enter() {
  const { user, loading } = useAuth();
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);
  useEffect(() => { if (user) myEntry().then(setEntry).catch(() => setEntry(null)); else setEntry(null); }, [user?.id]);
  if (loading || (user && entry === undefined)) return <main id="main" className="page"><Loading /></main>;

  if (!user) return (
    <main id="main" className="page page--narrow">
      <DropHero />
      <div className="card">
        <h2 className="h3">Create a free creator account to enter</h2>
        <p className="muted">Your account keeps your entry, your videos and your Tasks in one place. Your profile stays private until you're vetted.</p>
        <div className="row-btns"><A page="signup" arg="creator" className="btn btn--brand">Create creator account</A><A page="login" className="btn btn--soft">Log in</A></div>
      </div>
      <WhatToSubmit />
    </main>
  );
  if (user.role !== "creator") return <Gate text={`${config.drop} is for creator accounts. Brands can browse and brief vetted creators.`} />;
  if (entry) return (
    <main id="main" className="page page--narrow">
      <div className="card status-card">
        <Mark size={56} />
        <h1 className="h2">You've entered {config.drop}.</h1>
        <p className="muted">Status: <b>{entry.status === "selected" ? "Selected. Welcome to Vetta." : entry.status === "declined" ? "Not selected this time" : "In review"}</b></p>
        <p className="muted">The class is revealed on {formatDate(config.classAnnounced)}. Meanwhile, you can earn from paid gigs.</p>
        <div className="row-btns"><A page="earn" className="btn btn--brand">{EARN.name}</A><A page="u" arg={user.handle} className="btn btn--soft">My profile</A></div>
      </div>
    </main>
  );
  return <EntryForm />;
}

function DropHero() {
  return (
    <div className="drop-hero">
      <Mark size={64} draw />
      <h1 className="h1">Enter {config.drop}</h1>
      <p className="lede">One video, made your way. If you're selected, your profile goes public with the Vetta badge and brands can hire you.</p>
      <div className="drop-hero__count"><span className="live" /> Entries close in <Countdown to={config.entriesClose} /></div>
    </div>
  );
}

function WhatToSubmit() {
  return (
    <div className="card">
      <h2 className="h3">What you'll submit</h2>
      <ul className="ticks">
        <li>A showcase video, 30 to 90 seconds: a day in the life, a skit, a spec ad, anything that shows how you think</li>
        <li>Links to up to five pieces of past work, with results if you have them</li>
        <li>Your niches and the formats you make</li>
      </ul>
    </div>
  );
}

function EntryForm() {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [fail, setFail] = useState(""); const [done, setDone] = useState(false);
  const [f, setF] = useState({
    country: "", city: "", region: "", work_mode: "" as "" | "remote" | "onsite" | "hybrid", handles: "", level: "", niches: [] as string[], formats: [] as string[], brands_worked: "", best_result: "",
    showcase_video_id: null as string | null, showcase_url: "", showcase_note: "", work_links: [{ url: "", brand: "", result: "" }] as WorkLink[],
    consent_feature: false, consent_terms: false, useLink: false,
  });
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));
  const isUrl = (s: string) => /^https?:\/\/\S+\.\S+/.test(s.trim());

  function validate(s: number) {
    const e: Record<string, string> = {};
    if (s === 0) { if (!f.country.trim()) e.country = "Add the country you're based in."; if (!f.city.trim()) e.city = "Add your city. Brands look for creators near them."; if (!f.work_mode) e.work_mode = "Choose how you work."; if (!f.handles.trim()) e.handles = "Add at least one handle so we can see your page."; if (!f.level) e.level = "Choose the closest option."; }
    if (s === 1) { if (!f.niches.length) e.niches = "Choose at least one niche."; if (!f.formats.length) e.formats = "Choose at least one format."; }
    if (s === 2) {
      if (!f.showcase_video_id && !(f.useLink && isUrl(f.showcase_url))) e.showcase = f.useLink ? "Paste a full link, starting with https://" : "Upload your showcase video, or paste a link instead.";
      const links = f.work_links.filter((w) => w.url.trim()); if (links.some((w) => !isUrl(w.url))) e.work = "Each work link needs to start with https://";
    }
    if (s === 3) { if (!f.consent_feature) e.consent_feature = "Every Vetta creator's entry is posted. Tick this to enter."; if (!f.consent_terms) e.consent_terms = "Agree to the terms to enter."; }
    setErrors(e); return !Object.keys(e).length;
  }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate(step)) return;
    if (step < 3) { setStep(step + 1); window.scrollTo(0, 0); return; }
    setBusy(true); setFail("");
    try {
      const { useLink, work_mode, ...rest } = f;
      await submitEntry({ ...rest, work_mode: work_mode || undefined, showcase_url: useLink ? f.showcase_url.trim() : null, showcase_video_id: useLink ? null : f.showcase_video_id,
        work_links: f.work_links.filter((w) => w.url.trim()) });
      setDone(true); window.scrollTo(0, 0);
    } catch (x: any) { setFail(x.message); } finally { setBusy(false); }
  }

  if (done) return (
    <main id="main" className="page page--narrow">
      <div className="card status-card">
        <Mark size={64} draw />
        <h1 className="h2">You're in the running.</h1>
        <p className="muted">We've got your {config.drop} entry. The class is revealed on {formatDate(config.classAnnounced)}.</p>
        <div className="row-btns"><A page="earn" className="btn btn--brand">{EARN.name}</A><A page="home" className="btn btn--soft">Back to For You</A></div>
      </div>
    </main>
  );

  return (
    <main id="main" className="page page--narrow">
      <DropHero />
      <ol className="steps-bar">{STEPS.map((s, i) => <li key={s} className={i === step ? "is-on" : i < step ? "is-done" : ""}>{s}</li>)}</ol>
      <form className="card" onSubmit={submit} noValidate>
        {step === 0 && <>
          <div className="row3">
            <Field label="City" id="eci" error={errors.city}><input id="eci" value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Benin City" /></Field>
            <Field label="State or region" id="ereg" optional><input id="ereg" value={f.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Edo State" /></Field>
            <Field label="Country" id="ec" error={errors.country}><input id="ec" value={f.country} onChange={(e) => set("country", e.target.value)} autoComplete="country-name" /></Field>
          </div>
          <Field label="How you work" error={errors.work_mode}>
            <div className="radios radios--row">{WORK_MODES.map((w) => <label key={w.slug} className={`radio ${f.work_mode === w.slug ? "is-on" : ""}`}><input type="radio" name="ewm" checked={f.work_mode === w.slug} onChange={() => set("work_mode", w.slug)} /> {w.name}</label>)}</div>
          </Field>
          <Field label="Your handles" id="eh" error={errors.handles} hint="For example: TikTok @you, Instagram @you"><input id="eh" value={f.handles} onChange={(e) => set("handles", e.target.value)} /></Field>
          <Field label="How long have you been creating?" error={errors.level}>
            <div className="radios">{LEVELS.map((l) => <label key={l} className={`radio ${f.level === l ? "is-on" : ""}`}><input type="radio" name="lvl" checked={f.level === l} onChange={() => set("level", l)} /> {l}</label>)}</div>
          </Field>
        </>}
        {step === 1 && <>
          <Field label="Your niches" hint="Up to three. This is how brands find you." error={errors.niches}><Chips name="Niches" max={3} options={NICHES.map((n) => ({ value: n.slug, label: n.name }))} value={f.niches} onChange={(v) => set("niches", v)} /></Field>
          <Field label="Formats you make" error={errors.formats}><Chips name="Formats" options={FORMATS.map((x) => ({ value: x, label: x }))} value={f.formats} onChange={(v) => set("formats", v)} /></Field>
          <Field label="Brands you've worked with" id="ebw" optional hint="Separate with commas. Personal projects count."><input id="ebw" value={f.brands_worked} onChange={(e) => set("brands_worked", e.target.value)} /></Field>
          <Field label="Your best result so far" id="ebr" optional hint="For example: 1.2M views on a skincare review."><input id="ebr" value={f.best_result} onChange={(e) => set("best_result", e.target.value)} /></Field>
        </>}
        {step === 2 && <>
          <Field label="Showcase video" error={errors.showcase} hint="30 to 90 seconds. A day in the life, a skit, a spec ad: anything that shows how you think.">
            {!f.useLink
              ? <VideoPicker kind="entry" caption={`${config.drop} entry`} niches={f.niches} onReady={(v) => set("showcase_video_id", v.id)} />
              : <input type="url" placeholder="https://" value={f.showcase_url} onChange={(e) => set("showcase_url", e.target.value)} aria-label="Showcase video link" />}
            <button type="button" className="link-btn" onClick={() => set("useLink", !f.useLink)}>{f.useLink ? "Upload a file instead" : "Paste a TikTok, Instagram or YouTube link instead"}</button>
          </Field>
          <Field label="The idea behind it" id="esn" optional><textarea id="esn" rows={2} value={f.showcase_note} onChange={(e) => set("showcase_note", e.target.value)} /></Field>
          <Field label="Past work" optional hint="Up to five links. Add the brand and result where you have them." error={errors.work}>
            <div className="worklinks">
              {f.work_links.map((w, i) => (
                <div className="worklink" key={i}>
                  <input aria-label={`Work link ${i + 1}`} placeholder="https://" value={w.url} onChange={(e) => set("work_links", f.work_links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
                  <input aria-label="Brand" placeholder="Brand" value={w.brand} onChange={(e) => set("work_links", f.work_links.map((x, j) => j === i ? { ...x, brand: e.target.value } : x))} />
                  <input aria-label="Result" placeholder="Result" value={w.result} onChange={(e) => set("work_links", f.work_links.map((x, j) => j === i ? { ...x, result: e.target.value } : x))} />
                </div>
              ))}
              {f.work_links.length < 5 && <button type="button" className="btn btn--soft btn--sm" onClick={() => set("work_links", [...f.work_links, { url: "", brand: "", result: "" }])}>Add another</button>}
            </div>
          </Field>
        </>}
        {step === 3 && <>
          <label className={`check ${errors.consent_feature ? "has-error" : ""}`}><input type="checkbox" checked={f.consent_feature} onChange={(e) => set("consent_feature", e.target.checked)} /><span>If I'm selected, Vetta will post my entry video on Vetta and its social channels, credited to me. I agree to this.</span></label>
          {errors.consent_feature && <p className="field__err">{errors.consent_feature}</p>}
          <label className={`check ${errors.consent_terms ? "has-error" : ""}`}><input type="checkbox" checked={f.consent_terms} onChange={(e) => set("consent_terms", e.target.checked)} /><span>I agree to the <A page="terms">terms</A>, and the work I've shared is mine to share.</span></label>
          {errors.consent_terms && <p className="field__err">{errors.consent_terms}</p>}
        </>}
        {fail && <p className="form-fail" role="alert">{fail}</p>}
        <div className="form-nav">
          {step > 0 && <button type="button" className="btn btn--soft" onClick={() => { setErrors({}); setStep(step - 1); }}>Back</button>}
          <button className="btn btn--brand" disabled={busy}>{step < 3 ? "Continue" : busy ? "Sending…" : "Send my entry"}</button>
        </div>
      </form>
    </main>
  );
}

export function Gate({ text }: { text: string }) {
  return (
    <main id="main" className="page empty-state">
      <Icon name="lock" size={36} />
      <p className="lede">{text}</p>
      <div className="row-btns"><A page="login" className="btn btn--brand">Log in</A><A page="signup" className="btn btn--soft">Create account</A></div>
    </main>
  );
}

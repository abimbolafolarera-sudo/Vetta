import { useEffect, useState } from "react";
import { A, Icon, Loading, Mark } from "../components/ui";
import { config } from "../config";
import { getBrief, publicSettings } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { BriefDraft } from "../lib/types";
import { BriefForm, MatchView } from "./Shared";

export function Brands() {
  const { user } = useAuth();
  return (
    <main id="main" className="page">
      <section className="brands-hero card card--print">
        <h1 className="h1">Stop guessing who can deliver.</h1>
        <p className="lede">Paste your brief and see vetted creators who fit it in seconds, with their rates and track record. Book through Vetta and we tailor the brief to each creator, handle timelines and approvals, and stand behind the work.</p>
        <div className="row-btns">
          <a href="#brief" className="btn btn--brand">Get matched free</a>
          <A page="explore" className="btn btn--soft">Explore creators</A>
          {!user && <A page="signup" arg="brand" className="btn btn--soft">Create a free brand account</A>}
        </div>
      </section>
      <ul className="features">
        {[["search", "Matched in seconds", "Paste a brief, see who fits. Free, with no account needed."],
          ["chart", "Results, not follower counts", "Every creator shows briefs delivered, on-time rate, brand ratings and hook rate."],
          ["check", "Work we stand behind", "If a video misses the brief, we reshoot it or replace the creator."],
          ["inbox", "One point of contact", "Every brief and question goes to the Vetta team. Nobody ghosts you."],
          ["earn", "Clear pricing", "The creator's rate plus a Vetta fee, shown before you pay. No subscriptions, no lock-in."],
          ["plus", "Campaigns at scale", "Post UGC, clipping or event campaigns to Earn Now, open to every creator or vetted only."]].map(([i, t, d]) => (
          <li key={t} className="card"><span className="feat-i"><Icon name={i} /></span><h2 className="h3">{t}</h2><p className="muted">{d}</p></li>
        ))}
      </ul>
      <section className="card brief-card" id="brief">
        <h2 className="h2">Get matched now</h2>
        <p className="muted">Tell us what you're making. You'll see matching vetted creators straight away.</p>
        <BriefForm />
      </section>
    </main>
  );
}

/** /brief, and /brief/<id>.<token> to reopen matches from a follow-up email. */
export function BriefPage({ arg }: { arg?: string }) {
  const [draft, setDraft] = useState<BriefDraft | null>(null); const [err, setErr] = useState("");
  const [id, token] = (arg ?? "").split(".");
  useEffect(() => { if (id && token) getBrief(id, token).then(setDraft).catch((e) => setErr(e.message)); }, [id, token]);
  if (id && token) return (
    <main id="main" className="page page--narrow">
      <h1 className="h1">{draft?.company ? `Your matches for ${draft.company}` : "Your matches"}</h1>
      <div className="card">{err ? <p className="form-fail">{err} <A page="brief">Start a new brief</A></p> : !draft ? <Loading /> : <MatchView draft={draft} email={draft.email ?? ""} resumed />}</div>
    </main>
  );
  return (
    <main id="main" className="page page--narrow">
      <h1 className="h1">Get matched with vetted creators</h1>
      <p className="lede">Paste your brief. You'll see who fits, their rates and their track record, in seconds.</p>
      <div className="card"><BriefForm /></div>
    </main>
  );
}

const DIFFERENT: [string, string][] = [
  ["Vetted means bankable.", "Every Vetta creator is qualified, trusted and creative enough to deliver the brand's goal. Nano or massive, they get in on creativity and reliability, not follower count."],
  ["Trained, not just listed.", "Vetta creators learn how to read a brief, build a hook, handle usage rights and read their own results. They show up like professionals because we train them to."],
  ["Results on every profile.", "You see real work and real numbers: briefs delivered, on-time rate, brand ratings and hook rate. Not just followers."],
  ["Briefs tailored, not broadcast.", "Send your campaign brief to Vetta. We shape it and match it to the creators who can make it convert. We don't blast it to everyone or copy it from another job board."],
  ["Social first, global from day one.", "Explore creators in a feed that looks like the one your audience lives on, and stack your favourites into a shortlist. We work with brands and creators across Africa and beyond."],
];

const STEPS: [string, string][] = [
  ["Enter a Drop", "Creators apply in Drops, with one creative video made for Vetta and their best work for brands."],
  ["Reviewed on three things", "Craft: can they shoot, edit and hook in seconds. Creativity: an idea we haven't seen before. Proof: results, reliability and brands they've delivered for."],
  ["Trained before the first brief", "Selected creators go through Vetta training on briefs, hooks, usage rights and results."],
  ["Stay vetted by delivering", "Every brief adds to a creator's scorecard. Missed deadlines and off-brief work cost them the badge."],
];

export function About() {
  const [n, setN] = useState<{ drop_applied?: number; drop_accepted?: number }>({});
  useEffect(() => { publicSettings().then(setN).catch(() => {}); }, []);
  const applied = n.drop_applied ?? 0, accepted = n.drop_accepted ?? 0;
  return (
    <main id="main" className="page page--narrow about">
      <section className="about-hero card card--print">
        <Mark size={56} draw />
        <h1 className="h1">Brands don't have a creator problem. They have a choosing problem.</h1>
        <p className="lede">Every campaign starts the same way. The brief lands, the launch date is already fixed, and someone scrolls through hundreds of profiles hoping follower counts tell the truth. They usually don't. The wrong creator gets picked, the content misses, and the budget is gone.</p>
        <p className="lede"><b>Vetta exists so that choice is never a guess again.</b></p>
      </section>

      <section className="about-sec">
        <h2 className="h2">What makes Vetta different</h2>
        <div className="diff">{DIFFERENT.map(([t, d]) => <div key={t} className="diff__row"><h3 className="h3">{t}</h3><p>{d}</p></div>)}</div>
      </section>

      <section className="about-sec card">
        <h2 className="h2">How a creator becomes vetted</h2>
        <ol className="steps">{STEPS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ol>
        <p className="drop-stat">{applied > 0
          ? <><b>{config.drop}: {applied.toLocaleString()} applied. {accepted.toLocaleString()} made it.</b> That's {Math.max(1, Math.round((accepted / applied) * 100))}%. Getting in is hard on purpose.</>
          : <>Getting in is hard on purpose. After every Drop, we publish how many creators applied and how many made it.</>}</p>
      </section>

      <section className="about-sec card card--quiet">
        <h2 className="h3">Not vetted yet? You can still earn.</h2>
        <p className="muted">Earn Now has paid gigs open to every creator: UGC, clipping, event coverage and more. Our best performers get invited to the next Drop.</p>
        <A page="earn" className="btn btn--soft btn--sm">See Earn Now gigs</A>
      </section>

      {config.founder.show && (
        <A page="founder" className="card founder-link">
          <span className="founder-link__k">A note from our founder</span>
          <span className="founder-link__t">"The brief always arrives late."</span>
          <span className="founder-link__by">Read it, from {config.founder.name}</span>
        </A>
      )}

      <section className="about-close">
        <p className="about-close__t">Founded in Lagos. Built for brands everywhere.</p>
        <div className="row-btns"><A page="explore" className="btn btn--brand">Explore creators</A><A page="brief" className="btn btn--soft">Send a brief</A></div>
      </section>
    </main>
  );
}

export function Founder() {
  const f = config.founder;
  return (
    <main id="main" className="page page--narrow founder-note">
      <p className="founder-note__k">A note from our founder</p>
      <h1 className="h1">The brief always arrives late.</h1>
      <div className="founder-note__body">
        <p>Every brief I've worked on came with a clock on it. As a brand strategist I've run campaigns for Chicken Republic, Pie Xpress, Evolution, ADC and we.yan, and the scene was always the same. The brief lands, the launch date is fixed, and someone has to find the right creators by Friday. So you scroll. You shortlist by followers because there's no time to check anything else, and you hope.</p>
        <p>Sometimes it works. Often it doesn't. The creator posts late, or off-brief, or to an audience that was never going to buy. The money is gone, and the brand learns the wrong lesson: that creators don't work.</p>
        <p className="founder-note__pull">Creators do work. The choosing doesn't.</p>
        <p>I've seen the other options up close. Agencies send every client the same list. Marketplaces call you "vetted" because you signed up. Job boards repost the same gig from three other job boards. And then there's the DM, where nobody is accountable for anything.</p>
        <p>I've also seen what happens when creators are taught properly. I trained more than 20 people to become AI creators and creative strategists. Talent was never the gap, because they had it. The gap was knowing how to read a brief, build a hook and deliver work a brand can actually use.</p>
        <p>That is what Vetta is.</p>
        <p>A Vetta creator is someone a brand can bank on, whether they have 2,000 followers or 2 million. Getting in is hard on purpose. Once you're in, we train you, we show your results to the world, and we bring you briefs that fit.</p>
        <p>For brands, it means you stop guessing. Watch real work, shortlist the creators you love, and send your brief to us. We'll tailor it and match it to the people who can deliver it. Everything runs through Vetta, so someone is always accountable.</p>
        <p>Vetta started in Lagos, because Lagos taught me that social content moves culture and commerce at the same time. It's built for brands everywhere, because good creative doesn't need a passport.</p>
        <p><b>My promise to brands:</b> no untailored creators, no wasted budgets, no silence.<br /><b>My promise to creators:</b> if you're good, we'll make sure the world sees it.</p>
        <p>Vetta starts with creators. It won't end there.</p>
      </div>
      <div className="founder-note__sign">
        <Mark size={40} />
        <div><b>{f.name}</b><span>Founder, Vetta</span>{f.x && <a href={`https://x.com/${f.x}`} target="_blank" rel="noreferrer">@{f.x} on X</a>}</div>
      </div>
      <div className="row-btns"><A page="explore" className="btn btn--brand">Explore creators</A><A page="brief" className="btn btn--soft">Send a brief</A></div>
    </main>
  );
}

export function Terms() {
  return (
    <main id="main" className="page page--narrow legal">
      <h1 className="h1">Terms and privacy</h1>
      <p className="muted">Plain-language summary. Have a lawyer review this before launch.</p>
      <h2 className="h3">Accounts</h2><p>You're responsible for your account and what you post. Vetta can suspend, ban or remove accounts and content that break these rules, including spam, stolen work, fake engagement, harassment and sexual content.</p>
      <h2 className="h3">Creator profiles</h2><p>Creator profiles and videos are private until the creator is vetted. Once vetted, your profile, videos and the results you choose to share are public. Your email is never shown.</p>
      <h2 className="h3">Drops</h2><p>Entering is free and doesn't guarantee selection or paid work. If you're selected, Vetta will post your entry video on Vetta and its social channels, credited to you.</p>
      <h2 className="h3">Contact</h2><p>Brands and creators don't message each other directly. All briefs, bookings and messages go through the Vetta team.</p>
      <h2 className="h3">Briefs, matching and fees</h2><p>Matching is free. When you book, you pay the creator's rate plus a Vetta fee, and we show both before you pay. There are no subscriptions. If a video misses the agreed brief, we reshoot it or replace the creator.</p>
      <h2 className="h3">Emails about your brief</h2><p>If you get matches but don't book, we may send up to three emails about that brief over three days. Every email has a link to stop them. If you opt in, we may also message you on WhatsApp about that brief.</p>
      <h2 className="h3">Earn Now gigs</h2><p>Each gig states its pay. Gigs are for real creative work: videos, clips with your own edit, honest reviews of products you've used, and event coverage. Vetta never pays for likes, comments, follows, star ratings or bought views, and removes anyone who fakes them. Every paid post must be disclosed, for example with #ad.</p>
      <h2 className="h3">Your data</h2><p>We store what you give us to run Vetta. We don't sell it. To see, correct or delete your data, email {config.contactEmail}.</p>
    </main>
  );
}

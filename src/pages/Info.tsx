import { A, Art, Icon, Mark } from "../components/ui";
import { config } from "../config";
import { useAuth } from "../lib/auth";
import { BriefForm } from "./Shared";

export function Brands() {
  const { user } = useAuth();
  return (
    <main id="main" className="page">
      <section className="brands-hero card card--print">
        <h1 className="h1">Hire vetted creators.</h1>
        <p className="lede">Every creator on Vetta proved their craft before they got in. Find them by niche and city and shortlist them. Then brief Vetta or post a campaign: we match you, handle the agreement and make the introduction.</p>
        <div className="row-btns">
          <A page="campaign" className="btn btn--brand"><Icon name="plus" size={18} /> Post a campaign</A>
          <A page="explore" className="btn btn--soft">Browse creators</A>
          {!user && <A page="signup" arg="brand" className="btn btn--soft">Create a free brand account</A>}
        </div>
      </section>
      <ul className="features">
        {[["search", "Browse by niche", "Twelve niches, from beauty to fintech. No account needed."],
          ["bookmark", "Shortlist", "Save creators into lists for each campaign."],
          ["inbox", "One point of contact", "Every brief and question goes to the Vetta team. We handle the creators for you."],
          ["earn", "Post campaigns", "UGC videos, clips, reviews, on-site events. Set the pay, upload your assets, choose vetted only or open to all."]].map(([i, t, d]) => (
          <li key={t} className="card"><span className="feat-i"><Icon name={i} /></span><h2 className="h3">{t}</h2><p className="muted">{d}</p></li>
        ))}
      </ul>
      <section className="card brief-card" id="brief">
        <h2 className="h2">Send a brief to Vetta</h2>
        <p className="muted">No account needed. Tell us what you're making and the Vetta team comes back with a shortlist within two working days.</p>
        <BriefForm />
      </section>
    </main>
  );
}

export function BriefPage() {
  return (
    <main id="main" className="page page--narrow">
      <h1 className="h1">Send a brief</h1>
      <p className="lede">Tell us what you're making. We'll come back with vetted creators who fit, within two working days.</p>
      <div className="card"><BriefForm /></div>
    </main>
  );
}

export function About() {
  return (
    <main id="main" className="page page--narrow about">
      <div className="about-hero card card--print"><Mark size={64} draw />
      <h1 className="h1">A standard, not a marketplace.</h1>
      <p className="lede">Brands hire creators the slow way: scroll, guess, brief, hope. Vetta flips it. Creators prove their craft first, we select the ones who deliver, and brands hire from people they can trust.</p></div>
      <div className="pillars">
        <div className="card"><h2 className="h3">Craft over clout</h2><p className="muted">Follower count tells you who's popular, not who can sell a product in three seconds. We select on craft, creativity and proof.</p></div>
        <div className="card"><h2 className="h3">Open by design</h2><p className="muted">Any creator, any level, any country can enter a Drop. Every creator can earn with paid gigs in Earn Now, vetted or not.</p></div>
        <div className="card"><h2 className="h3">Built to grow creators</h2><p className="muted">Vetted creators get resources and sessions with working creators, so the standard keeps rising.</p></div>
      </div>
      {config.founder.show && (
        <section className="card founder">
          <Art seed="samuel-founder" className="founder__art"><span>SAF</span></Art>
          <div>
            <p className="founder__k">From the founder</p>
            <h2 className="h2">{config.founder.name}</h2>
            <p>I'm a brand strategist and AI creative strategist based in Lagos. I've built strategy and campaigns for brands across fashion, food, beauty and fintech, made AI video ads for them, and trained more than 20 young creatives to become creators and creative strategists themselves.</p>
            <p>I kept seeing the same gap. Brands had budgets and no way to tell who could actually deliver. Brilliant creators had the craft and no way to prove it beyond a follower count. Vetta closes that gap: one standard, proven in the work, open to anyone good enough to meet it.</p>
            <p className="founder__sign">Samuel</p>
            <p><a href={`https://x.com/${config.founder.x}`} target="_blank" rel="noreferrer">Follow the build on X, @{config.founder.x}</a></p>
          </div>
        </section>
      )}
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
      <h2 className="h3">Earn Now gigs</h2><p>Each gig states its pay. Vetta pays only for real, verified activity and never for likes, comments or follows. Paid posts must be disclosed.</p>
      <h2 className="h3">Your data</h2><p>We store what you give us to run Vetta. We don't sell it. To see, correct or delete your data, email {config.contactEmail}.</p>
    </main>
  );
}

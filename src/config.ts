// Everything you are likely to want to change lives here.
export const config = {
  brand: "Vetta",
  drop: "Drop 01",
  dropTag: "Drop01",
  entriesClose: "2027-01-31T23:59:00+01:00",
  classAnnounced: "2027-02-14",
  founder: { show: true, name: "Samuel Abimbola Folarera", role: "Founder, Vetta", x: "folareraSA" },
  contactEmail: "hello@vetta.co",
  maxVideoSeconds: 180,
  // 50 MB fits Supabase's free plan. With Cloudflare Stream switched on (see DEPLOY.md) you can raise this to 200.
  maxVideoMB: import.meta.env.VITE_VIDEO_PROVIDER === "cloudflare" ? 200 : 50,
};

export const NICHES: { slug: string; name: string }[] = [
  { slug: "beauty", name: "Beauty and skincare" }, { slug: "fashion", name: "Fashion" },
  { slug: "food", name: "Food and drink" }, { slug: "fintech", name: "Fintech" },
  { slug: "web3", name: "Web3 and crypto" }, { slug: "tech", name: "Tech and apps" },
  { slug: "fitness", name: "Health and fitness" }, { slug: "lifestyle", name: "Lifestyle" },
  { slug: "travel", name: "Travel" }, { slug: "gaming", name: "Gaming" },
  { slug: "family", name: "Parenting and family" }, { slug: "education", name: "Education" },
];

export const FORMATS = ["Talking head", "Voiceover", "Day in the life", "Skit", "Try-on", "Routine", "Unboxing",
  "Explainer", "Taste test", "Before and after", "Screen recording", "Gameplay", "Reaction", "ASMR"];

export const EARN = { name: "Earn Now", item: "gig", items: "gigs" };

export const WORK_MODES: { slug: "remote" | "onsite" | "hybrid"; name: string }[] = [
  { slug: "remote", name: "Remote only" }, { slug: "onsite", name: "Open to on-site" }, { slug: "hybrid", name: "Remote and on-site" },
];
export const workModeName = (m?: string | null) => WORK_MODES.find((w) => w.slug === m)?.name ?? "";

export const TIERS: { slug: "nano" | "micro" | "mid" | "macro" | "mega"; name: string; range: string }[] = [
  { slug: "nano", name: "Nano", range: "1k to 10k followers" },
  { slug: "micro", name: "Micro", range: "10k to 100k" },
  { slug: "mid", name: "Mid-tier", range: "100k to 500k" },
  { slug: "macro", name: "Macro", range: "500k to 1M" },
  { slug: "mega", name: "Mega", range: "1M+" },
];
export const tierName = (t?: string | null) => TIERS.find((x) => x.slug === t)?.name ?? "";

export const TASK_TYPES: { slug: string; name: string; blurb: string }[] = [
  { slug: "ugc", name: "UGC video", blurb: "Make original videos the brand can post or run as ads" },
  { slug: "clip", name: "Clip", blurb: "Cut a brand's video into short clips with your own edit and hook" },
  { slug: "post", name: "Brand post", blurb: "Make and post an original video about the product" },
  { slug: "review", name: "Review", blurb: "Use the product and post an honest, disclosed review" },
  { slug: "mention", name: "Tagged mention", blurb: "Feature or tag the brand in your own content" },
  { slug: "stitch", name: "Stitch or duet", blurb: "React to or build on the brand's video" },
  { slug: "repost", name: "Repost", blurb: "Share the brand's licensed content with your own caption and #ad" },
  { slug: "event", name: "On-site or event", blurb: "Show up in person: launches, stores, events, shoots" },
];

export const nicheName = (slug: string) => NICHES.find((n) => n.slug === slug)?.name ?? slug;
export const taskTypeName = (slug: string) => TASK_TYPES.find((n) => n.slug === slug)?.name ?? slug;

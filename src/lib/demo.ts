import type { Profile, Resource, Task, Video } from "./types";

// Preview-only seed data. Sample profiles and videos are marked sample and labelled "Preview".
// The live site starts empty: only real accounts and real uploads appear.
const t = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const base = {
  links: [], formats: [], status: "active" as const, plan: "free" as const, sample: true,
  avatar_url: null, company: null, website: null, job_title: null,
};

export const DEMO_PASSWORD = "demo";

export const SEED_PROFILES: (Profile & { email: string })[] = [
  { ...base, id: "u-admin", city: "Lagos", region: "Lagos State", country: "Nigeria", work_mode: "hybrid", open_to_travel: true, created_at: t(30), role: "admin", handle: "vetta", display_name: "Vetta", bio: "The team behind Vetta.",
    location: "Lagos, Nigeria", niches: [], metrics: [], vetted: true, vetted_drop: null, email: "admin@vetta.demo", sample: false },
  { ...base, id: "u-brand", city: "Lagos", region: "Lagos State", country: "Nigeria", work_mode: "hybrid", open_to_travel: true, created_at: t(5), role: "brand", handle: "glowlab", display_name: "Glow Lab", bio: "Skincare made for heat and humidity.",
    location: "Lagos, Nigeria", niches: ["beauty"], metrics: [], vetted: false, vetted_drop: null, company: "Glow Lab (sample)", website: "https://example.com",
    job_title: "Marketing lead", email: "brand@vetta.demo" },
  { ...base, id: "u-new", city: "Ibadan", region: "Oyo State", country: "Nigeria", work_mode: "remote", open_to_travel: false, created_at: t(1), role: "creator", handle: "tobi-new", display_name: "Tobi (new creator)", bio: "",
    location: "Ibadan, Nigeria", niches: [], metrics: [], vetted: false, vetted_drop: null, email: "creator@vetta.demo" },
  { ...base, id: "c1", rate_from: 150, rate_to: 400, jobs_done: 7, on_time_pct: 100, brand_rating: 4.9, hook_rate: 41, repeat_brands: 3, city: "Lagos", region: "Lagos State", country: "Nigeria", work_mode: "hybrid", open_to_travel: true, created_at: t(20), role: "creator", handle: "amara.k", display_name: "Amara K.", location: "Lagos, Nigeria",
    bio: "Skincare routines that read like short films. Problem, ritual, payoff.", niches: ["beauty", "lifestyle"], formats: ["Routine", "Talking head"],
    metrics: [{ label: "Hook rate", value: "41%" }, { label: "Avg. views", value: "38k" }], vetted: true, vetted_drop: "Drop 01",
    links: [{ label: "TikTok", url: "https://www.tiktok.com" }], email: "amara@vetta.demo" },
  { ...base, id: "c2", rate_from: 300, rate_to: 700, jobs_done: 5, on_time_pct: 100, brand_rating: 4.8, hook_rate: 38, repeat_brands: 2, city: "Mexico City", region: "CDMX", country: "Mexico", work_mode: "remote", open_to_travel: false, created_at: t(19), role: "creator", handle: "diego.r", display_name: "Diego R.", location: "Mexico City, Mexico",
    bio: "Fintech explainers people actually finish. One screen, one face, one promise.", niches: ["fintech", "tech"], formats: ["Explainer", "Screen recording"],
    metrics: [{ label: "Watch-through", value: "62%" }, { label: "Installs driven", value: "4.1k" }], vetted: true, vetted_drop: "Drop 01", email: "diego@vetta.demo" },
  { ...base, id: "c3", rate_from: 120, rate_to: 350, jobs_done: 4, on_time_pct: 92, brand_rating: 4.7, hook_rate: 35, repeat_brands: 1, city: "Nairobi", region: "Nairobi County", country: "Kenya", work_mode: "onsite", open_to_travel: true, created_at: t(18), role: "creator", handle: "zuri.m", display_name: "Zuri M.", location: "Nairobi, Kenya",
    bio: "Street-style try-ons with a point of view. Shot in the city, never the studio.", niches: ["fashion", "lifestyle"], formats: ["Try-on", "Day in the life"],
    metrics: [{ label: "Best post", value: "1.2M" }, { label: "Saves / post", value: "2.3k" }], vetted: true, vetted_drop: "Drop 01", email: "zuri@vetta.demo" },
  { ...base, id: "c4", rate_from: 250, rate_to: 600, jobs_done: 6, on_time_pct: 100, brand_rating: 4.9, hook_rate: 44, repeat_brands: 2, city: "London", region: "England", country: "UK", work_mode: "hybrid", open_to_travel: true, created_at: t(17), role: "creator", handle: "tomi.a", display_name: "Tomi A.", location: "London, UK",
    bio: "Food content that makes you hungry on mute.", niches: ["food"], formats: ["Taste test", "ASMR"],
    metrics: [{ label: "Avg. views", value: "54k" }, { label: "Engagement", value: "7.8%" }], vetted: true, vetted_drop: "Drop 01", email: "tomi@vetta.demo" },
  { ...base, id: "c5", rate_from: 100, rate_to: 300, jobs_done: 2, on_time_pct: 100, brand_rating: 4.6, hook_rate: 33, repeat_brands: 0, city: "Accra", region: "Greater Accra", country: "Ghana", work_mode: "remote", open_to_travel: false, created_at: t(16), role: "creator", handle: "kofi.b", display_name: "Kofi B.", location: "Accra, Ghana",
    bio: "Web3 and gaming, explained by a player.", niches: ["web3", "gaming"], formats: ["Gameplay", "Explainer"],
    metrics: [{ label: "Avg. views", value: "21k" }], vetted: true, vetted_drop: "Drop 01", email: "kofi@vetta.demo" },
];

const caps: [string, string, string[]][] = [
  ["c1", "3-step glow routine for 35° heat. Step two is the one everyone skips.", ["beauty"]],
  ["c2", "Splitting my salary in 20 seconds. Watch the second tab.", ["fintech"]],
  ["c3", "Lagos to Nairobi: one denim jacket, three outfits.", ["fashion"]],
  ["c4", "Rating jollof from four spots. Sound off, it still works.", ["food"]],
  ["c5", "This wallet setup took me 40 seconds. Here's how.", ["web3"]],
  ["c1", "Before and after, no filter, two weeks in.", ["beauty"]],
  ["c3", "Thrift flip in 30 seconds.", ["fashion"]],
  ["c2", "The money app feature nobody uses.", ["fintech"]],
];
export const SEED_VIDEOS: Video[] = caps.map(([owner, caption, niches], i) => ({
  id: `v${i + 1}`, created_at: t(10 - i), owner_id: owner, caption, niches, kind: "post", status: "ready",
  playback_url: null, thumbnail_url: null, duration: 30, like_count: 0, sample: true,
}));

export const SEED_TASKS: Task[] = [
  { id: "t0", created_at: t(1), created_by: "u-brand", brand: "Glow Lab (sample)", title: "3 UGC videos for our sunscreen launch", type: "ugc",
    description: "Film three 20 to 30 second videos showing how you use the sunscreen in Lagos heat. We'll run the best ones as ads.",
    deliverables: "3 vertical videos, raw files, 2 hooks each", pay_model: "flat", rate: 120, budget: 1200, slots: 10, min_views: 0,
    platforms: ["Delivered to brand"], rules: "Original footage only. Usage rights for 3 months of paid ads included in the fee.", status: "live",
    niches: ["beauty"], deadline: "2027-01-20", location_mode: "remote", location_city: null, vetted_only: true, assets: [] },
  { id: "t3", created_at: t(1), created_by: "u-brand", brand: "Glow Lab (sample)", title: "Store launch day in Lekki", type: "event",
    description: "Come to our Lekki pop-up on launch day, film the experience and post a recap on your page.",
    deliverables: "1 recap video posted, 10 stories", pay_model: "flat", rate: 80, budget: 400, slots: 5, min_views: 0,
    platforms: ["TikTok", "Instagram"], rules: "Disclose with #ad. Arrive by 11am.", status: "live",
    niches: ["beauty", "lifestyle"], deadline: "2027-01-10", location_mode: "onsite", location_city: "Lagos", vetted_only: false, assets: [] },
  { id: "t1", created_at: t(2), created_by: null, brand: "Sample app", title: "Clip the launch video", type: "clip", niches: ["tech"], location_mode: "remote", vetted_only: false,
    description: "Cut 15 to 45 second clips from the brand's launch video and post them on your own accounts.",
    pay_model: "per_1k_views", rate: 1.5, budget: 500, slots: null, min_views: 1000, platforms: ["TikTok", "Instagram", "YouTube"],
    rules: "Original cuts only. Tag the brand and use #ad. Posts stay up for 30 days.", status: "live" },
  { id: "t2", created_at: t(1), created_by: "u-brand", brand: "Glow Lab (sample)", title: "Honest 30-day review", type: "review", niches: ["beauty"], location_mode: "remote", vetted_only: false,
    description: "We send you the serum. Use it, then post an honest review on your page.",
    pay_model: "flat", rate: 40, budget: 800, slots: 20, min_views: 0, platforms: ["TikTok", "Instagram"],
    rules: "Disclose the gifted product. One video, 30 to 60 seconds. Keep it up for 30 days.", status: "live" },
];

// Starter resources for the Learn hub. Review and replace with your own; they're marked sample.
export const SEED_RESOURCES: Resource[] = [
  { id: "r1", created_at: t(3), kind: "guide", title: "Usage rights: what to charge when a brand runs your video as an ad", tags: ["Pricing", "Contracts"], published: true, sample: true,
    summary: "Organic posting and paid ads are different products. Price them separately or you'll undercharge every time.",
    body: "A brand paying you to post on your page is buying your audience. A brand running your video from their ad account is buying your content as an ad asset, often for months. Price them separately.\n\nStart from your base fee for the video. Add a usage fee for paid ads: a common starting point is 30% of the base fee per month of usage, or a flat 3-month package at about 80%. Exclusivity (you can't work with competitors) is extra again: 20% to 50% depending on the length and how wide the category is.\n\nPut three things in writing every time: how long they can run it, on which platforms, and whether they can edit it. If a brand says 'in perpetuity', that's the most expensive option, not a free extra." },
  { id: "r2", created_at: t(3), kind: "template", title: "Brief to shot list in 10 minutes", tags: ["Production"], published: true, sample: true,
    summary: "Turn any brand brief into a 3-shot plan before you pick up your phone.",
    body: "1. Find the one sentence the viewer should remember. If the brief has five messages, ask which one matters most.\n2. Write the hook as a problem the viewer has, not the product name. 'My makeup slides off by noon' beats 'Introducing Glow SPF'.\n3. Plan three shots: the problem (2 to 3 seconds), the product in use (the middle), the proof (a result, a reaction, a before and after).\n4. Write two alternative hooks for the same video. Brands test hooks; giving them options makes you easy to rehire.\n5. List every shot you need before filming, including b-roll of the product on its own." },
  { id: "r3", created_at: t(2), kind: "checklist", title: "Hook check: 12 openings that hold the first 3 seconds", tags: ["Hooks", "Performance"], published: true, sample: true,
    summary: "Patterns that stop the scroll in ads, with when to use each.",
    body: "Callout: name who it's for ('If you live somewhere this hot…').\nMistake: 'I was doing my skincare wrong for two years.'\nResult first: show the after, then explain.\nUnpopular opinion: say the thing people argue about.\nPrice shock: 'This costs less than your lunch.'\nPOV: put the viewer in the moment.\nComparison: two things side by side, no talking.\nQuestion they're already asking: 'Does sunscreen actually work on dark skin?'\nMid-action: start in the middle of doing something.\nStitch the doubt: answer a comment.\nList: '3 things I'd never buy again.'\nTexture or sound: a close-up that makes people feel it.\n\nTest two hooks on every brand video. Keep the one with the higher 3-second hold." },
  { id: "r4", created_at: t(2), kind: "guide", title: "Read your numbers like a brand does", tags: ["Analytics"], published: true, sample: true,
    summary: "Hook rate, hold rate and click-through: the three numbers brands judge you on.",
    body: "Hook rate: people who watched 3 seconds divided by people who saw it. Strong UGC ads sit around 30% or higher.\nHold rate: people who watched to the end (or 15 seconds) divided by people who watched 3 seconds. It tells you if the middle earns the hook.\nClick-through rate: clicks divided by impressions. This is the number most brands pay for.\n\nWhen you pitch, lead with one of these and what you did to get it. 'Hook rate 41% on a sunscreen ad by opening with the problem' is worth more than a follower count." },
  { id: "r5", created_at: t(1), kind: "template", title: "Pitch message that gets replies", tags: ["Pitching"], published: true, sample: true,
    summary: "A five-line pitch to a brand's marketing lead. Short, specific, easy to say yes to.",
    body: "Line 1: Who you are in one line, with one result. ('I make skincare ads for heat-heavy cities; my last one held a 41% hook rate.')\nLine 2: What you noticed about their brand. One specific observation.\nLine 3: One idea you'd make for them, in a sentence.\nLine 4: Your Vetta profile link.\nLine 5: A clear, small ask. ('Can I send you two hook options this week?')\n\nNever open with 'I hope you're well' and never attach a rate card in the first message." },
  { id: "r6", created_at: t(1), kind: "live", title: "Live: Building a portfolio brands hire from", tags: ["Live session", "Portfolio"], published: true, sample: true,
    summary: "A 45-minute session with a working creator. Bring your profile; we review three live.",
    body: "Date and link are shared with vetted creators by email a week before. Seats are limited to keep it practical: three profiles get reviewed live, everyone gets the recording." },
];

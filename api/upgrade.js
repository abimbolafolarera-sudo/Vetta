// Instant Brief Upgrade. Runs on Vercel, never in the browser.
// 1. Checks the Paystack payment for this brief is real and paid in full.
// 2. Researches the brand's category on the web and writes the upgrade with Claude.
// 3. Saves it on the brief, so the brand sees it on their matches page, and emails it if email is set up.
// Needs these in Vercel > Settings > Environment Variables:
//   PAYSTACK_SECRET_KEY, ANTHROPIC_API_KEY, plus the Supabase ones the Vercel connection adds.

const env = process.env;
const SB_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
const MODEL = env.UPGRADE_MODEL || "claude-sonnet-5-5";
const UUID = /^[0-9a-f-]{36}$/i;

const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
async function sb(path, init = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { ...init, headers: { ...sbHeaders, Prefer: "return=representation", ...(init.headers || {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(`Database error ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
const patchBrief = (id, row) => sb(`briefs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(row) });

async function verifyPayment(reference, brief, settings) {
  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } });
  const j = await r.json().catch(() => ({}));
  const t = j?.data;
  if (!r.ok || !j.status || t?.status !== "success") return "We couldn't confirm the payment yet. If you were charged, we'll finish your upgrade by email.";
  const want = Math.round(Number(settings.upgrade_amount) * 100);
  if (t.currency !== settings.upgrade_currency || Number(t.amount) < want) return "The payment amount doesn't match the Brief Upgrade price.";
  const meta = typeof t.metadata === "string" ? JSON.parse(t.metadata || "{}") : t.metadata || {};
  if (meta.brief_id && meta.brief_id !== brief.id) return "This payment belongs to a different brief.";
  return null;
}

function creatorLine(p) {
  const rate = p.rate_from ? `$${p.rate_from}${p.rate_to ? `-${p.rate_to}` : "+"} per video` : "rate on request";
  const where = [p.city, p.country].filter(Boolean).join(", ");
  return `- id ${p.id} | ${p.display_name} (@${p.handle}) | ${p.tier || "tier not set"} | niches: ${(p.niches || []).join(", ")} | formats: ${(p.formats || []).join(", ")} | ${where} | ${p.work_mode || ""} | ${rate} | briefs delivered ${p.jobs_done ?? 0}, on time ${p.on_time_pct ?? "n/a"}%, rating ${p.brand_rating ?? "n/a"}, hook rate ${p.hook_rate ?? "n/a"}% | bio: ${(p.bio || "").slice(0, 160)}`;
}

async function writeUpgrade(brief, creators) {
  const system = `You are Vetta's creative strategy engine. Vetta is a social-first platform of vetted, trained UGC and video creators, founded in Lagos and working with brands everywhere.
You write like a senior brand strategist: specific, plain, practical. No hype, no filler, no invented statistics. Every factual claim about the market or competitors must come from your web searches; when you can't verify something, say it's a judgement.
Return ONLY a JSON object, no other text, matching exactly:
{
 "headline": "one sentence: the single most important insight for this brief",
 "market": ["3-5 short points on the category right now: who's winning on social video and why"],
 "working": ["3-5 creative patterns that are working for this category on TikTok/Instagram/YouTube Shorts, specific (hooks, formats, angles)"],
 "gaps": ["3-5 gaps competitors are leaving open that this brand can own"],
 "brief": {
   "objective": "", "audience": "", "key_message": "", "proof_points": [""], "hooks": ["5 opening lines or visual hooks"],
   "deliverables": ["what to make, how many, formats, lengths"], "dos": [""], "donts": [""], "kpis": ["how to measure success"], "usage_rights": ""
 },
 "shortlist": [{"id": "creator id from the list", "why": "one sentence on why this creator fits"}],
 "next_step": "one sentence",
 "sources": [{"title": "", "url": ""}]
}
Shortlist 3 to 5 creators, only from the Vetta creator list provided, using their exact ids. If none fit well, return an empty shortlist and say so in next_step.`;
  const user = `Brand: ${brief.company}
Niches: ${(brief.niches || []).join(", ") || "not given"}
Budget: ${brief.budget} | Timeline: ${brief.timeline} | Where: ${brief.work_mode || "remote"}${brief.city ? `, ${brief.city}` : ""}
Their brief:
"""${brief.brief}"""

Vetta creators available:
${creators.map(creatorLine).join("\n") || "(none yet)"}

Research this brand's category and competitors on the web first (up to 5 searches), then return the JSON.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 6000, system,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      messages: [{ role: "user", content: user }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Writer error ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The writer didn't return a report.");
  const report = JSON.parse(text.slice(start, end + 1));
  const ids = new Set(creators.map((c) => c.id));
  report.shortlist = (report.shortlist || []).filter((s) => ids.has(s.id)).slice(0, 5)
    .map((s) => { const c = creators.find((x) => x.id === s.id); return { ...s, handle: c.handle, display_name: c.display_name }; });
  report.generated_at = new Date().toISOString();
  return report;
}

async function sendEmail(settings, brief) {
  if (!settings.resend_key || !settings.from_email || !settings.site_url) return;
  const link = `${settings.site_url.replace(/\/$/, "")}/brief/${brief.id}.${brief.token}`;
  await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${settings.resend_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: settings.from_email, to: [brief.email], ...(settings.notify_email ? { reply_to: settings.notify_email } : {}),
      subject: `Your Brief Upgrade for ${brief.company} is ready`,
      text: `Hi ${brief.contact_name.split(" ")[0]},\n\nYour Brief Upgrade is ready: the market, what's working, the gaps you can own, a sharper brief and your shortlist.\n\nRead it here: ${link}\n\nWhen you're ready, tap "Book through Vetta" on the same page and we'll take it from there.\n\nSamuel\nFounder, Vetta`,
    }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }
  if (!SB_URL || !SB_KEY || !env.PAYSTACK_SECRET_KEY || !env.ANTHROPIC_API_KEY) { res.status(503).json({ error: "The instant Brief Upgrade isn't switched on yet. We'll finish yours by email." }); return; }
  const { id, token, reference } = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!UUID.test(id || "") || !UUID.test(token || "") || !/^[\w.-]{6,100}$/.test(reference || "")) { res.status(400).json({ error: "Missing brief or payment details." }); return; }

  let brief;
  try {
    [brief] = await sb(`briefs?id=eq.${id}&token=eq.${token}&select=*`);
    if (!brief) { res.status(404).json({ error: "This brief link has expired." }); return; }
    if (brief.upgrade_status === "ready") { res.status(200).json({ status: "ready", report: brief.upgrade_report }); return; }
    if (brief.upgrade_status === "running" && brief.upgrade_started_at && Date.now() - Date.parse(brief.upgrade_started_at) < 5 * 60 * 1000) {
      res.status(202).json({ status: "running" }); return;
    }
    const [settings] = await sb("settings?id=eq.1&select=*");
    if (!(Number(settings.upgrade_amount) > 0)) { res.status(400).json({ error: "The Brief Upgrade isn't on sale right now." }); return; }

    if (brief.upgrade_ref !== reference) {
      const problem = await verifyPayment(reference, brief, settings);
      if (problem) { res.status(402).json({ error: problem }); return; }
      await patchBrief(id, { upgrade_ref: reference, upgrade_paid_at: new Date().toISOString(), upgrade_status: "paid", upgrade_requested: true });
    }
    await patchBrief(id, { upgrade_status: "running", upgrade_started_at: new Date().toISOString() });

    const niches = (brief.niches || []).filter((n) => /^[a-z-]+$/.test(n));
    let creators = await sb(`profiles?role=eq.creator&vetted=eq.true&status=eq.active&select=id,handle,display_name,tier,niches,formats,city,country,work_mode,rate_from,rate_to,jobs_done,on_time_pct,brand_rating,hook_rate,bio${niches.length ? `&niches=ov.{${niches.join(",")}}` : ""}&limit=40`);
    if (creators.length < 3) creators = await sb("profiles?role=eq.creator&vetted=eq.true&status=eq.active&select=id,handle,display_name,tier,niches,formats,city,country,work_mode,rate_from,rate_to,jobs_done,on_time_pct,brand_rating,hook_rate,bio&limit=40");

    const report = await writeUpgrade(brief, creators);
    await patchBrief(id, { upgrade_status: "ready", upgrade_report: report });
    await sendEmail(settings, brief);
    res.status(200).json({ status: "ready", report });
  } catch (err) {
    console.error("[upgrade]", err);
    if (brief?.id) await patchBrief(brief.id, { upgrade_status: brief.upgrade_ref || reference ? "failed" : brief.upgrade_status }).catch(() => {});
    if (brief?.id) await sb("rpc/send_alert", { method: "POST", body: JSON.stringify({ subject: `Brief Upgrade needs you: ${brief.company}`, body: `The automatic Brief Upgrade for ${brief.company} (${brief.email}) failed after payment. Finish it by hand. Error: ${String(err?.message || err).slice(0, 300)}` }) }).catch(() => {});
    res.status(500).json({ error: "Your payment is safe. The research took longer than expected, so our team will finish your upgrade and email it within 24 hours." });
  }
}

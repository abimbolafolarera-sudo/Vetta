import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AccountStatus, Brief, BriefDraft, Conversation, CreatorCard, Entry, Message, Profile, Report, Resource, Role, Settings, Shortlist, Task, TaskSubmission, Video,
} from "./types";
import { DEMO_PASSWORD, SEED_PROFILES, SEED_RESOURCES, SEED_TASKS, SEED_VIDEOS } from "./demo";
import { config } from "../config";

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const DEMO = !!import.meta.env.VITE_DEMO || !URL_ || !KEY;
const sb: SupabaseClient | null = DEMO ? null : createClient(URL_!, KEY!);

const uid = () => ((crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const now = () => new Date().toISOString();
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
function must<T>(r: { data: T | null; error: any }): T {
  if (r.error) throw new Error(r.error.message || "Something went wrong. Try again.");
  return r.data as T;
}
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s.-]/g, "").trim().replace(/[\s_]+/g, ".").replace(/\.+/g, ".").slice(0, 24) || "creator";

/* ============================ preview store ============================ */
type Store = {
  profiles: (Profile & { email: string; password: string })[];
  videos: Video[]; entries: Entry[]; likes: { user_id: string; video_id: string }[];
  shortlists: Shortlist[]; briefs: Brief[]; tasks: Task[]; submissions: TaskSubmission[];
  conversations: Conversation[]; messages: Message[]; reports: Report[]; resources: Resource[];
  settings: { notify_email: string; from_email: string; site_url: string; drop_applied: number; drop_accepted: number };
  session: string | null;
};
const KEY_STORE = "vetta-preview-v6";
const mem: { s: Store | null; blobs: Record<string, string> } = { s: null, blobs: {} };
function S(): Store {
  if (mem.s) return mem.s;
  let s: Store | null = null;
  try { const raw = localStorage.getItem(KEY_STORE); if (raw) s = JSON.parse(raw); } catch {}
  mem.s = s ?? {
    profiles: SEED_PROFILES.map((p) => ({ ...p, password: DEMO_PASSWORD })),
    videos: SEED_VIDEOS, entries: [], likes: [], shortlists: [], briefs: [], tasks: SEED_TASKS, submissions: [],
    conversations: [], messages: [], reports: [], resources: SEED_RESOURCES, settings: { notify_email: "", from_email: "", site_url: "", drop_applied: 0, drop_accepted: 0 }, session: null,
  };
  return mem.s!;
}
function save() { try { localStorage.setItem(KEY_STORE, JSON.stringify(mem.s)); } catch {} emit(); }
const strip = (p: Profile & { password?: string; email?: string }, withEmail = false): Profile => {
  const { password: _p, email, ...rest } = p as any; return withEmail ? { ...rest, email } : rest;
};
function me(): (Profile & { email: string; password: string }) | null { const s = S(); return s.profiles.find((p) => p.id === s.session) ?? null; }
function requireMe() { const m = me(); if (!m) throw new Error("Log in first."); if (m.status !== "active") throw new Error("Your account is " + m.status + "."); return m; }
function requireAdmin() { const m = requireMe(); if (m.role !== "admin") throw new Error("Admins only."); return m; }
const isPublicCreator = (p?: Profile) => !!p && p.role === "creator" && p.vetted && p.status === "active";

/* ============================ session ============================ */
type Listener = () => void;
const listeners = new Set<Listener>();
function emit() { listeners.forEach((l) => l()); }
export function onChange(l: Listener) { listeners.add(l); return () => listeners.delete(l); }
if (sb) sb.auth.onAuthStateChange(() => emit());

export async function currentUser(): Promise<Profile | null> {
  if (DEMO) { const m = me(); return m ? strip(m, true) : null; }
  const { data } = await sb!.auth.getSession();
  if (!data.session) return null;
  const p = must(await sb!.from("profiles").select("*").eq("id", data.session.user.id).maybeSingle()) as Profile | null;
  if (p?.status === "banned") { await sb!.auth.signOut(); return null; }
  return p ? { ...p, email: data.session.user.email ?? "" } : null;
}

export async function signUp(a: { email: string; password: string; role: "creator" | "brand"; display_name: string; company?: string }): Promise<"in" | "confirm"> {
  const email = a.email.trim().toLowerCase();
  if (a.password.length < 8 && !DEMO) throw new Error("Use at least 8 characters for your password.");
  if (DEMO) {
    const s = S();
    if (s.profiles.some((p) => p.email === email)) throw new Error("There's already an account with that email. Log in instead.");
    let handle = slugify(a.display_name); while (s.profiles.some((p) => p.handle === handle)) handle += Math.floor(Math.random() * 10);
    s.profiles.push({ id: uid(), created_at: now(), role: a.role, handle, display_name: a.display_name.trim(), avatar_url: null, bio: "", location: "",
      links: [], niches: [], formats: [], metrics: [], vetted: false, vetted_drop: null, status: "active", plan: "free",
      city: null, region: null, country: null, work_mode: null, open_to_travel: false,
      company: a.company ?? null, website: null, job_title: null, email, password: a.password });
    s.session = s.profiles[s.profiles.length - 1].id; save(); return "in";
  }
  const r = await sb!.auth.signUp({ email, password: a.password, options: { data: { role: a.role, display_name: a.display_name.trim(), company: a.company ?? "" }, emailRedirectTo: window.location.origin } });
  if (r.error) throw new Error(r.error.message);
  return r.data.session ? "in" : "confirm";
}

export async function signIn(email: string, password: string) {
  if (DEMO) {
    const p = S().profiles.find((x) => x.email === email.trim().toLowerCase());
    if (!p || p.password !== password) throw new Error("That email and password don't match.");
    if (p.status === "banned") throw new Error("This account has been banned.");
    S().session = p.id; save(); return;
  }
  const { data, error } = await sb!.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "That email and password don't match." : /banned/i.test(error.message) ? "This account has been banned." : error.message);
  const p = must(await sb!.from("profiles").select("status").eq("id", data.user!.id).maybeSingle()) as { status: string } | null;
  if (p?.status === "banned") { await sb!.auth.signOut(); throw new Error("This account has been banned."); }
}

export async function signOut() { if (DEMO) { S().session = null; save(); return; } await sb!.auth.signOut(); }

export async function resetPassword(email: string) {
  if (DEMO) return;
  const { error } = await sb!.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin + "/settings" });
  if (error) throw new Error(error.message);
}

export async function changePassword(password: string) {
  if (password.length < 8) throw new Error("Use at least 8 characters.");
  if (DEMO) { requireMe().password = password; save(); return; }
  const { error } = await sb!.auth.updateUser({ password }); if (error) throw new Error(error.message);
}

/* ============================ profiles ============================ */
export async function getProfile(handle: string): Promise<Profile | null> {
  if (DEMO) {
    const p = S().profiles.find((x) => x.handle === handle); const m = me();
    if (!p) return null;
    if (isPublicCreator(p) || p.role === "brand" && p.status === "active" || m?.id === p.id || m?.role === "admin") return strip(p);
    return null;
  }
  return must(await sb!.from("profiles").select("*").eq("handle", handle).maybeSingle()) as Profile | null;
}

export async function getProfilesByIds(ids: string[]): Promise<Record<string, Profile>> {
  const out: Record<string, Profile> = {}; if (!ids.length) return out;
  if (DEMO) { S().profiles.filter((p) => ids.includes(p.id)).forEach((p) => (out[p.id] = strip(p))); return out; }
  const rows = must(await sb!.from("profiles").select("*").in("id", [...new Set(ids)])) as Profile[];
  rows.forEach((p) => (out[p.id] = p)); return out;
}

export async function listCreators(opts: { niche?: string; q?: string; place?: string; mode?: string } = {}): Promise<Profile[]> {
  const q = (opts.q ?? "").trim().toLowerCase(); const place = (opts.place ?? "").trim().toLowerCase();
  const modeOk = (m?: string | null) => !opts.mode || (opts.mode === "remote" ? true : m === opts.mode || m === "hybrid");
  if (DEMO) {
    return S().profiles.filter(isPublicCreator).filter((p) => (!opts.niche || p.niches.includes(opts.niche)) &&
      (!q || (p.display_name + " " + p.handle + " " + p.bio).toLowerCase().includes(q)) &&
      (!place || placeOf(p).toLowerCase().includes(place)) && modeOk(p.work_mode)).map((p) => strip(p));
  }
  let r = sb!.from("profiles").select("*").eq("role", "creator").eq("vetted", true).eq("status", "active").order("created_at");
  if (opts.niche) r = r.contains("niches", [opts.niche]);
  if (q) r = r.or(`display_name.ilike.%${q}%,handle.ilike.%${q}%,bio.ilike.%${q}%`);
  if (place) r = r.or(`city.ilike.%${place}%,region.ilike.%${place}%,country.ilike.%${place}%`);
  if (opts.mode && opts.mode !== "remote") r = r.in("work_mode", [opts.mode, "hybrid"]);
  return must(await r) as Profile[];
}

const EDITABLE = ["display_name", "handle", "avatar_url", "bio", "location", "city", "region", "country", "work_mode", "open_to_travel", "links", "niches", "formats", "metrics", "company", "website", "job_title", "rate_from", "rate_to"] as const;
export const placeOf = (p: Pick<Profile, "city" | "region" | "country" | "location">) => [p.city, p.region, p.country].filter(Boolean).join(", ") || p.location || "";
export async function updateMyProfile(patch: Partial<Profile>) {
  const clean: any = {}; for (const k of EDITABLE) if (k in patch) clean[k] = (patch as any)[k];
  if ("city" in clean || "country" in clean || "region" in clean) clean.location = placeOf({ ...patch, location: "" } as Profile);
  if (clean.handle !== undefined && !/^[a-z0-9._]{3,24}$/.test(clean.handle)) throw new Error("Your username can use 3 to 24 lowercase letters, numbers, dots and underscores.");
  if (DEMO) {
    const m = requireMe();
    if (clean.handle && S().profiles.some((p) => p.handle === clean.handle && p.id !== m.id)) throw new Error("That username is taken.");
    Object.assign(m, clean); save(); return;
  }
  const { data } = await sb!.auth.getSession();
  const r = await sb!.from("profiles").update(clean).eq("id", data.session!.user.id);
  if (r.error?.code === "23505") throw new Error("That username is taken.");
  must(r);
}

async function shrinkImage(file: File, max = 640): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch { return file; }
}

export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Use a JPG, PNG or WebP image.");
  const blob = await shrinkImage(file);
  if (DEMO) return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob); });
  const { data } = await sb!.auth.getSession();
  const path = `${data.session!.user.id}/${uid()}.jpg`;
  const { error } = await sb!.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return sb!.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

/* ============================ videos ============================ */
export async function feedVideos(): Promise<Video[]> {
  if (DEMO) {
    const s = S();
    return clone(s.videos.filter((v) => v.status === "ready" && v.kind === "post" && isPublicCreator(s.profiles.find((p) => p.id === v.owner_id))))
      .map((v) => ({ ...v, playback_url: v.playback_url && v.playback_url.startsWith("blob:") && !mem.blobs[v.id] ? null : mem.blobs[v.id] ?? v.playback_url }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return must(await sb!.from("videos").select("*").eq("status", "ready").eq("kind", "post").order("created_at", { ascending: false }).limit(60)) as Video[];
}

export async function videosByOwner(ownerId: string): Promise<Video[]> {
  if (DEMO) {
    const m = me(); const own = m?.id === ownerId || m?.role === "admin";
    return clone(S().videos.filter((v) => v.owner_id === ownerId && v.status !== "removed" && (own || v.status === "ready")))
      .map((v) => ({ ...v, playback_url: mem.blobs[v.id] ?? (v.playback_url?.startsWith("blob:") ? null : v.playback_url) }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return must(await sb!.from("videos").select("*").eq("owner_id", ownerId).neq("status", "removed").order("created_at", { ascending: false })) as Video[];
}

export async function uploadVideo(file: File, meta: { caption: string; niches: string[]; kind: "entry" | "post" }, onProgress: (pct: number) => void): Promise<Video> {
  if (!file.type.startsWith("video/")) throw new Error("Choose a video file (MP4 or MOV).");
  if (file.size > config.maxVideoMB * 1024 * 1024) throw new Error(`That video is over ${config.maxVideoMB} MB. Trim it or export at 1080p.`);
  if (DEMO) {
    const m = requireMe(); if (m.role === "brand") throw new Error("Only creator accounts can upload videos.");
    for (let p = 0; p <= 100; p += 20) { onProgress(p); await new Promise((r) => setTimeout(r, 120)); }
    const v: Video = { id: uid(), created_at: now(), owner_id: m.id, caption: meta.caption, niches: meta.niches, kind: meta.kind, status: "ready",
      playback_url: "blob:", thumbnail_url: null, duration: null, like_count: 0 };
    mem.blobs[v.id] = URL.createObjectURL(file);
    S().videos.unshift(v); save(); return { ...v, playback_url: mem.blobs[v.id] };
  }
  if (import.meta.env.VITE_VIDEO_PROVIDER !== "cloudflare") {
    // Default: store the file in Supabase Storage, then register it.
    const { data } = await sb!.auth.getSession(); const userId = data.session!.user.id;
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const path = `${userId}/${uid()}.${ext}`;
    onProgress(5);
    const upr = await sb!.storage.from("videos").upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
    if (upr.error) throw new Error(upr.error.message.includes("exceeded") ? `That video is too big. Keep it under ${config.maxVideoMB} MB.` : upr.error.message);
    onProgress(100);
    const url = sb!.storage.from("videos").getPublicUrl(path).data.publicUrl;
    const r = await sb!.rpc("create_video", { p_url: url, p_caption: meta.caption, p_niches: meta.niches, p_kind: meta.kind });
    if (r.error) { await sb!.storage.from("videos").remove([path]); throw new Error(r.error.message); }
    return r.data as Video;
  }
  const r = await sb!.functions.invoke("vetta-api", { body: { action: "video_create", ...meta } });
  if (r.error) throw new Error((await r.error.context?.json?.().catch(() => null))?.error ?? r.error.message);
  const { uploadURL, video } = r.data as { uploadURL: string; video: Video };
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); const fd = new FormData(); fd.append("file", file);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("The upload didn't finish. Try again.")));
    xhr.onerror = () => reject(new Error("The upload was interrupted. Check your connection and try again."));
    xhr.open("POST", uploadURL); xhr.send(fd);
  });
  return await checkVideo(video.id);
}

export async function checkVideo(id: string): Promise<Video> {
  if (DEMO) return clone(S().videos.find((v) => v.id === id)!);
  if (import.meta.env.VITE_VIDEO_PROVIDER !== "cloudflare") return must(await sb!.from("videos").select("*").eq("id", id).single()) as Video;
  const r = await sb!.functions.invoke("vetta-api", { body: { action: "video_check", video_id: id } });
  if (r.error) throw new Error(r.error.message);
  return (r.data as { video: Video }).video;
}

export async function updateMyVideo(id: string, patch: { caption?: string; status?: "ready" | "hidden" }) {
  if (DEMO) { const m = requireMe(); const v = S().videos.find((x) => x.id === id && x.owner_id === m.id); if (v) Object.assign(v, patch); save(); return; }
  must(await sb!.from("videos").update(patch).eq("id", id));
}

export async function deleteMyVideo(id: string) {
  if (DEMO) { const m = requireMe(); const v = S().videos.find((x) => x.id === id && (x.owner_id === m.id || m.role === "admin")); if (v) v.status = "removed"; save(); return; }
  if (import.meta.env.VITE_VIDEO_PROVIDER !== "cloudflare") { const r = await sb!.rpc("remove_video", { p_id: id }); if (r.error) throw new Error(r.error.message); return; }
  const r = await sb!.functions.invoke("vetta-api", { body: { action: "video_delete", video_id: id } });
  if (r.error) throw new Error(r.error.message);
}

export async function myLikes(): Promise<Set<string>> {
  if (DEMO) { const m = me(); return new Set(m ? S().likes.filter((l) => l.user_id === m.id).map((l) => l.video_id) : []); }
  const { data } = await sb!.auth.getSession(); if (!data.session) return new Set();
  const rows = must(await sb!.from("likes").select("video_id").eq("user_id", data.session.user.id)) as { video_id: string }[];
  return new Set(rows.map((r) => r.video_id));
}

export async function toggleLike(videoId: string, on: boolean) {
  if (DEMO) {
    const m = requireMe(); const s = S(); const v = s.videos.find((x) => x.id === videoId);
    s.likes = s.likes.filter((l) => !(l.user_id === m.id && l.video_id === videoId));
    if (on) s.likes.push({ user_id: m.id, video_id: videoId });
    if (v) v.like_count = s.likes.filter((l) => l.video_id === videoId).length;
    save(); return;
  }
  const { data } = await sb!.auth.getSession(); if (!data.session) throw new Error("Log in to like videos.");
  if (on) must(await sb!.from("likes").insert({ user_id: data.session.user.id, video_id: videoId }));
  else must(await sb!.from("likes").delete().eq("user_id", data.session.user.id).eq("video_id", videoId));
}

/* ============================ drop entries ============================ */
export async function myEntry(): Promise<Entry | null> {
  if (DEMO) { const m = me(); return m ? clone(S().entries.find((e) => e.user_id === m.id && e.drop === config.drop) ?? null) : null; }
  const { data } = await sb!.auth.getSession(); if (!data.session) return null;
  return must(await sb!.from("entries").select("*").eq("user_id", data.session.user.id).eq("drop", config.drop).maybeSingle()) as Entry | null;
}

export async function submitEntry(e: Omit<Entry, "id" | "created_at" | "user_id" | "status" | "drop">) {
  if (DEMO) {
    const m = requireMe(); if (m.role !== "creator") throw new Error("Drops are for creator accounts.");
    if (S().entries.some((x) => x.user_id === m.id && x.drop === config.drop)) throw new Error(`You've already entered ${config.drop}.`);
    S().entries.unshift({ ...e, id: uid(), created_at: now(), user_id: m.id, drop: config.drop, status: "new" }); save(); return;
  }
  const { data } = await sb!.auth.getSession();
  const r = await sb!.from("entries").insert({ ...e, user_id: data.session!.user.id, drop: config.drop });
  if (r.error?.code === "23505") throw new Error(`You've already entered ${config.drop}.`);
  must(r);
}

/* ============================ brands ============================ */
export async function myShortlists(): Promise<Shortlist[]> {
  if (DEMO) { const m = me(); return m ? clone(S().shortlists.filter((l) => l.brand_id === m.id)) : []; }
  return must(await sb!.from("shortlists").select("*").order("created_at")) as Shortlist[];
}
export async function createShortlist(name: string): Promise<Shortlist> {
  if (!name.trim()) throw new Error("Name the list.");
  if (DEMO) { const m = requireMe(); const l = { id: uid(), created_at: now(), brand_id: m.id, name: name.trim(), creator_ids: [] }; S().shortlists.push(l); save(); return l; }
  const { data } = await sb!.auth.getSession();
  return must(await sb!.from("shortlists").insert({ brand_id: data.session!.user.id, name: name.trim() }).select().single()) as Shortlist;
}
export async function setInShortlist(listId: string, creatorId: string, on: boolean) {
  if (DEMO) {
    const l = S().shortlists.find((x) => x.id === listId); if (!l) return;
    l.creator_ids = on ? [...new Set([...l.creator_ids, creatorId])] : l.creator_ids.filter((x) => x !== creatorId); save(); return;
  }
  const l = must(await sb!.from("shortlists").select("creator_ids").eq("id", listId).single()) as { creator_ids: string[] };
  const ids = on ? [...new Set([...l.creator_ids, creatorId])] : l.creator_ids.filter((x) => x !== creatorId);
  must(await sb!.from("shortlists").update({ creator_ids: ids }).eq("id", listId));
}
export async function deleteShortlist(id: string) {
  if (DEMO) { S().shortlists = S().shortlists.filter((x) => x.id !== id); save(); return; }
  must(await sb!.from("shortlists").delete().eq("id", id));
}

export async function submitBrief(b: Omit<Brief, "id" | "created_at" | "status" | "brand_id">) {
  if (DEMO) { const m = me(); S().briefs.unshift({ ...b, id: uid(), created_at: now(), status: "new", brand_id: m?.role === "brand" ? m.id : null }); save(); return; }
  const { data } = await sb!.auth.getSession();
  must(await sb!.from("briefs").insert({ ...b, brand_id: data.session?.user.id ?? null }));
}
/* ---------- instant matching: free, no account needed ---------- */
const BUDGET_CAP: Record<string, number> = { "Under $500": 500, "$500 to $2,000": 2000, "$2,000 to $10,000": 10000 };
const cardOf = (p: Profile): CreatorCard => ({ id: p.id, handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url, niches: p.niches, formats: p.formats,
  city: p.city, country: p.country, work_mode: p.work_mode, rate_from: p.rate_from, rate_to: p.rate_to, jobs_done: p.jobs_done ?? 0,
  on_time_pct: p.on_time_pct, brand_rating: p.brand_rating, hook_rate: p.hook_rate, vetted: p.vetted });
function demoMatch(b: { niches: string[]; city?: string | null; work_mode?: string | null; budget: string; creator_id?: string | null }): CreatorCard[] {
  const cap = BUDGET_CAP[b.budget];
  const score = (p: Profile) => p.niches.filter((n) => b.niches.includes(n)).length * 3
    + (b.city && p.city && p.city.toLowerCase() === b.city.toLowerCase() ? 2 : 0)
    + (b.work_mode === "remote" || p.work_mode === "onsite" || p.work_mode === "hybrid" || p.open_to_travel ? 1 : 0)
    + (!cap || p.rate_from == null || p.rate_from <= cap ? 2 : -2) + (p.brand_rating ?? 0) / 2 + Math.min(p.jobs_done ?? 0, 10) / 5;
  return S().profiles.filter(isPublicCreator).filter((p) => p.id === b.creator_id || !b.niches.length || p.niches.some((n) => b.niches.includes(n)))
    .sort((a, c) => Number(c.id === b.creator_id) - Number(a.id === b.creator_id) || score(c) - score(a)).slice(0, 5).map((p) => cardOf(strip(p)));
}
export type BriefInput = Omit<Brief, "id" | "created_at" | "status" | "brand_id">;
/** Step 1: save the brief as a draft and get matched creators straight away. */
export async function startBrief(b: BriefInput): Promise<BriefDraft> {
  if (DEMO) {
    const m = me(); const matches = demoMatch(b); const id = uid(); const token = uid();
    S().briefs.unshift({ ...b, id, token, created_at: now(), status: "draft", brand_id: m?.role === "brand" ? m.id : null, matched: matches.map((x) => x.id), picked: [], followup_stage: 0 });
    save(); return { id, token, matches };
  }
  const r = await sb!.rpc("start_brief", { p: b }); if (r.error) throw new Error(r.error.message);
  return r.data as BriefDraft;
}
/** Reopen a draft from a follow-up email link. */
export async function getBrief(id: string, token: string): Promise<BriefDraft> {
  if (DEMO) {
    const b = S().briefs.find((x) => x.id === id && x.token === token); if (!b) throw new Error("This link has expired.");
    const matches = S().profiles.filter((p) => (b.matched ?? []).includes(p.id) && isPublicCreator(p)).map((p) => cardOf(strip(p)));
    return { id, token, matches, company: b.company, contact_name: b.contact_name, email: b.email, status: b.status, unsubscribed: b.unsubscribed };
  }
  const r = await sb!.rpc("get_brief", { p_id: id, p_token: token }); if (r.error) throw new Error(r.error.message);
  return r.data as BriefDraft;
}
/** Step 2: book through Vetta. The brief goes to the team and follow-up emails stop. */
export async function confirmBrief(id: string, token: string, picked: string[]) {
  if (DEMO) { const b = S().briefs.find((x) => x.id === id && x.token === token); if (b && b.status === "draft") { b.status = "new"; b.picked = picked; const m = me(); if (!b.brand_id && m?.role === "brand") b.brand_id = m.id; } save(); return; }
  const r = await sb!.rpc("confirm_brief", { p_id: id, p_token: token, p_picked: picked }); if (r.error) throw new Error(r.error.message);
}
export async function stopBriefEmails(id: string, token: string) {
  if (DEMO) { const b = S().briefs.find((x) => x.id === id && x.token === token); if (b) b.unsubscribed = true; save(); return; }
  const r = await sb!.rpc("stop_brief_emails", { p_id: id, p_token: token }); if (r.error) throw new Error(r.error.message);
}

export async function myBriefs(): Promise<Brief[]> {
  if (DEMO) { const m = me(); return m ? clone(S().briefs.filter((b) => b.brand_id === m.id && b.status !== "draft")) : []; }
  const { data } = await sb!.auth.getSession(); if (!data.session) return [];
  return must(await sb!.from("briefs").select("*").eq("brand_id", data.session.user.id).order("created_at", { ascending: false })) as Brief[];
}

/* ============================ tasks ============================ */
export async function liveTasks(): Promise<Task[]> {
  if (DEMO) return clone(S().tasks.filter((t) => t.status === "live"));
  return must(await sb!.from("tasks").select("*").eq("status", "live").order("created_at", { ascending: false })) as Task[];
}
export async function myTasks(): Promise<Task[]> {
  if (DEMO) { const m = me(); return m ? clone(S().tasks.filter((t) => t.created_by === m.id)) : []; }
  const { data } = await sb!.auth.getSession(); if (!data.session) return [];
  return must(await sb!.from("tasks").select("*").eq("created_by", data.session.user.id).order("created_at", { ascending: false })) as Task[];
}
export async function uploadCampaignAsset(file: File): Promise<{ name: string; url: string }> {
  if (file.size > 50 * 1024 * 1024) throw new Error("Files can be up to 50 MB. For bigger files, paste a Google Drive or Dropbox link.");
  if (DEMO) return { name: file.name, url: URL.createObjectURL(file) };
  const { data } = await sb!.auth.getSession();
  const path = `${data.session!.user.id}/${uid()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await sb!.storage.from("campaign-assets").upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return { name: file.name, url: sb!.storage.from("campaign-assets").getPublicUrl(path).data.publicUrl };
}

export async function submissionsForMyCampaigns(): Promise<TaskSubmission[]> {
  if (DEMO) { const m = me(); if (!m) return []; const ids = S().tasks.filter((t) => t.created_by === m.id).map((t) => t.id); return clone(S().submissions.filter((x) => ids.includes(x.task_id))); }
  return must(await sb!.from("task_submissions").select("*").order("created_at", { ascending: false })) as TaskSubmission[];
}

export async function listResources(): Promise<Resource[] | "locked"> {
  if (DEMO) { const m = me(); if (!m || !(m.role === "admin" || (m.role === "creator" && m.vetted && m.status === "active"))) return "locked"; return clone(S().resources.filter((r) => r.published)); }
  const u = await currentUser(); if (!u || !(u.role === "admin" || (u.role === "creator" && u.vetted))) return "locked";
  return must(await sb!.from("resources").select("*").eq("published", true).order("created_at", { ascending: false })) as Resource[];
}

export async function proposeTask(t: Omit<Task, "id" | "created_at" | "status" | "created_by">) {
  if (!t.title.trim() || !t.brand.trim()) throw new Error("Add a title and your brand name.");
  if (DEMO) { const m = requireMe(); S().tasks.unshift({ ...t, id: uid(), created_at: now(), status: "pending", created_by: m.id }); save(); return; }
  const { data } = await sb!.auth.getSession();
  must(await sb!.from("tasks").insert({ ...t, created_by: data.session!.user.id, status: "pending" }));
}
export async function submitTaskPost(taskId: string, post_url: string, claimed_views: number | null) {
  if (!/^https?:\/\/\S+/.test(post_url)) throw new Error("Paste the full link to your post.");
  if (DEMO) {
    const m = requireMe();
    const t = S().tasks.find((x) => x.id === taskId); if (t?.vetted_only && !m.vetted) throw new Error("This gig is for vetted creators only.");
    if (S().submissions.some((x) => x.task_id === taskId && x.post_url === post_url)) throw new Error("That link is already submitted.");
    S().submissions.unshift({ id: uid(), created_at: now(), task_id: taskId, user_id: m.id, post_url, claimed_views, verified_views: null, status: "pending" }); save(); return;
  }
  const { data } = await sb!.auth.getSession(); if (!data.session) throw new Error("Log in to submit.");
  const r = await sb!.from("task_submissions").insert({ task_id: taskId, user_id: data.session.user.id, post_url, claimed_views });
  if (r.error?.code === "23505") throw new Error("That link is already submitted."); must(r);
}
export async function mySubmissions(): Promise<TaskSubmission[]> {
  if (DEMO) { const m = me(); return m ? clone(S().submissions.filter((s) => s.user_id === m.id)) : []; }
  const { data } = await sb!.auth.getSession(); if (!data.session) return [];
  return must(await sb!.from("task_submissions").select("*").eq("user_id", data.session.user.id).order("created_at", { ascending: false })) as TaskSubmission[];
}

/* ============================ messages: everyone talks to the Vetta team ============================ */
export async function publicSettings(): Promise<{ drop_applied?: number; drop_accepted?: number }> {
  if (DEMO) { const { drop_applied, drop_accepted } = S().settings; return { drop_applied, drop_accepted }; }
  const r = await sb!.rpc("public_settings");
  return (r.data as any) ?? {};
}
/** The signed-in user's thread with the Vetta team, created on first use. */
export async function myThread(): Promise<Conversation> {
  if (DEMO) {
    const m = requireMe(); const s = S();
    let c = s.conversations.find((x) => x.user_id === m.id);
    if (!c) { c = { id: uid(), created_at: now(), user_id: m.id, last_at: now() }; s.conversations.push(c); save(); }
    return clone(c);
  }
  const r = await sb!.rpc("my_thread"); if (r.error) throw new Error(r.error.message);
  return r.data as Conversation;
}
export async function getConversation(id: string): Promise<Conversation | null> {
  if (DEMO) { const m = me(); const c = S().conversations.find((x) => x.id === id); return c && m && (c.user_id === m.id || m.role === "admin") ? clone(c) : null; }
  return must(await sb!.from("conversations").select("*").eq("id", id).maybeSingle()) as Conversation | null;
}
export async function listMessages(convId: string): Promise<Message[]> {
  if (DEMO) return clone(S().messages.filter((x) => x.conversation_id === convId));
  return must(await sb!.from("messages").select("*").eq("conversation_id", convId).order("created_at")) as Message[];
}
export async function sendMessage(convId: string, body: string) {
  const text = body.trim(); if (!text) return; if (text.length > 2000) throw new Error("Keep messages under 2,000 characters.");
  if (DEMO) {
    const m = requireMe(); const c = S().conversations.find((x) => x.id === convId);
    if (!c || (c.user_id !== m.id && m.role !== "admin")) throw new Error("You're not part of this conversation.");
    S().messages.push({ id: uid(), created_at: now(), conversation_id: convId, sender_id: m.id, body: text }); c.last_at = now(); save(); return;
  }
  const { data } = await sb!.auth.getSession();
  must(await sb!.from("messages").insert({ conversation_id: convId, sender_id: data.session!.user.id, body: text }));
}

export async function report(target_type: Report["target_type"], target_id: string, reason: string) {
  if (!reason.trim()) throw new Error("Tell us what's wrong.");
  if (DEMO) { const m = requireMe(); S().reports.unshift({ id: uid(), created_at: now(), reporter_id: m.id, target_type, target_id, reason: reason.trim(), status: "open" }); save(); return; }
  const { data } = await sb!.auth.getSession(); if (!data.session) throw new Error("Log in to report.");
  must(await sb!.from("reports").insert({ reporter_id: data.session.user.id, target_type, target_id, reason: reason.trim() }));
}

/* ============================ admin ============================ */
async function adminCall(action: string, body: Record<string, unknown>) {
  const r = await sb!.functions.invoke("vetta-api", { body: { action, ...body } });
  if (r.error) throw new Error(r.error.message); return r.data;
}

export const admin = {
  async users(opts: { q?: string; role?: Role | "" } = {}): Promise<Profile[]> {
    const q = (opts.q ?? "").toLowerCase();
    if (DEMO) {
      requireAdmin();
      return S().profiles.filter((p) => (!opts.role || p.role === opts.role) && (!q || (p.display_name + p.handle + p.email).toLowerCase().includes(q)))
        .map((p) => strip(p, true)).sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const rows = must(await sb!.rpc("admin_users", { p_q: q, p_role: opts.role || null })) as unknown as Profile[];
    return rows;
  },
  async setStatus(userId: string, status: AccountStatus) {
    if (DEMO) { requireAdmin(); const p = S().profiles.find((x) => x.id === userId); if (p && p.role !== "admin") p.status = status; save(); return; }
    if (import.meta.env.VITE_VIDEO_PROVIDER === "cloudflare") { await adminCall("set_status", { user_id: userId, status }); return; }
    const r = await sb!.rpc("admin_set_status", { p_user: userId, p_status: status }); if (r.error) throw new Error(r.error.message);
  },
  async updateUser(userId: string, patch: Partial<Profile>) {
    if (DEMO) { requireAdmin(); const p = S().profiles.find((x) => x.id === userId); if (p) Object.assign(p, patch); save(); return; }
    const { email: _e, sample: _s, ...rest } = patch as any;
    must(await sb!.from("profiles").update(rest).eq("id", userId));
  },
  async entries(): Promise<Entry[]> {
    if (DEMO) return clone(S().entries);
    return must(await sb!.from("entries").select("*").order("created_at", { ascending: false })) as Entry[];
  },
  async updateEntry(id: string, patch: Partial<Entry>) {
    if (DEMO) { const e = S().entries.find((x) => x.id === id); if (e) Object.assign(e, patch); save(); return; }
    must(await sb!.from("entries").update(patch).eq("id", id));
  },
  /** Selecting an entry vets the creator: their profile goes public and their entry video joins the feed. */
  async vet(e: Entry) {
    if (DEMO) {
      const s = S(); const p = s.profiles.find((x) => x.id === e.user_id); if (!p) return;
      p.vetted = true; p.vetted_drop = e.drop; if (!p.niches.length) p.niches = e.niches; if (!p.formats.length) p.formats = e.formats;
      if (!p.city) { p.city = e.city ?? null; p.region = e.region ?? null; p.country = e.country; p.location = placeOf(p as Profile); }
      if (!p.work_mode && e.work_mode) p.work_mode = e.work_mode;
      const v = s.videos.find((x) => x.id === e.showcase_video_id); if (v) { v.kind = "post"; v.status = "ready"; }
      const en = s.entries.find((x) => x.id === e.id); if (en) en.status = "selected"; save(); return;
    }
    const r = await sb!.rpc("admin_vet", { p_entry: e.id }); if (r.error) throw new Error(r.error.message);
  },
  async videos(): Promise<Video[]> {
    if (DEMO) return clone(S().videos).map((v) => ({ ...v, playback_url: mem.blobs[v.id] ?? (v.playback_url?.startsWith("blob:") ? null : v.playback_url) }));
    return must(await sb!.from("videos").select("*").order("created_at", { ascending: false }).limit(300)) as Video[];
  },
  async setVideoStatus(id: string, status: Video["status"]) {
    if (DEMO) { const v = S().videos.find((x) => x.id === id); if (v) v.status = status; save(); return; }
    if (status === "removed") { if (import.meta.env.VITE_VIDEO_PROVIDER === "cloudflare") await adminCall("video_delete", { video_id: id }); else { const r = await sb!.rpc("remove_video", { p_id: id }); if (r.error) throw new Error(r.error.message); } }
    else must(await sb!.from("videos").update({ status }).eq("id", id));
  },
  async briefs(): Promise<Brief[]> {
    if (DEMO) return clone(S().briefs);
    return must(await sb!.from("briefs").select("*").order("created_at", { ascending: false })) as Brief[];
  },
  async updateBrief(id: string, patch: Partial<Brief>) {
    if (DEMO) { const b = S().briefs.find((x) => x.id === id); if (b) Object.assign(b, patch); save(); return; }
    must(await sb!.from("briefs").update(patch).eq("id", id));
  },
  async tasks(): Promise<Task[]> {
    if (DEMO) return clone(S().tasks);
    return must(await sb!.from("tasks").select("*").order("created_at", { ascending: false })) as Task[];
  },
  async saveTask(t: Partial<Task>) {
    if (DEMO) {
      if (t.id) { const x = S().tasks.find((k) => k.id === t.id); if (x) Object.assign(x, t); }
      else S().tasks.unshift({ ...(t as Task), id: uid(), created_at: now(), created_by: null }); save(); return;
    }
    const { id, created_at: _c, ...row } = t;
    if (id) must(await sb!.from("tasks").update(row).eq("id", id)); else must(await sb!.from("tasks").insert(row));
  },
  async submissions(): Promise<TaskSubmission[]> {
    if (DEMO) return clone(S().submissions);
    return must(await sb!.from("task_submissions").select("*").order("created_at", { ascending: false })) as TaskSubmission[];
  },
  async updateSubmission(id: string, patch: Partial<TaskSubmission>) {
    if (DEMO) { const x = S().submissions.find((k) => k.id === id); if (x) Object.assign(x, patch); save(); return; }
    must(await sb!.from("task_submissions").update(patch).eq("id", id));
  },
  async resources(): Promise<Resource[]> {
    if (DEMO) return clone(S().resources);
    return must(await sb!.from("resources").select("*").order("created_at", { ascending: false })) as Resource[];
  },
  async saveResource(r: Partial<Resource>) {
    if (!r.title?.trim()) throw new Error("Add a title.");
    if (DEMO) {
      if (r.id) { const x = S().resources.find((k) => k.id === r.id); if (x) Object.assign(x, r); }
      else S().resources.unshift({ ...(r as Resource), id: uid(), created_at: now() }); save(); return;
    }
    const { id, created_at: _c, sample: _s, ...row } = r as any;
    if (id) must(await sb!.from("resources").update(row).eq("id", id)); else must(await sb!.from("resources").insert(row));
  },
  async deleteResource(id: string) {
    if (DEMO) { S().resources = S().resources.filter((x) => x.id !== id); save(); return; }
    must(await sb!.from("resources").delete().eq("id", id));
  },
  async conversations(): Promise<Conversation[]> {
    if (DEMO) return clone(S().conversations);
    return must(await sb!.from("conversations").select("*").order("last_at", { ascending: false })) as Conversation[];
  },
  async reports(): Promise<Report[]> {
    if (DEMO) return clone(S().reports);
    return must(await sb!.from("reports").select("*").order("created_at", { ascending: false })) as Report[];
  },
  async resolveReport(id: string) {
    if (DEMO) { const r = S().reports.find((x) => x.id === id); if (r) r.status = "resolved"; save(); return; }
    must(await sb!.from("reports").update({ status: "resolved" }).eq("id", id));
  },
  async settings(): Promise<Settings> {
    if (DEMO) return { ...S().settings, resend_key_set: false };
    const r = must(await sb!.from("settings").select("notify_email, resend_key, from_email, site_url, drop_applied, drop_accepted").eq("id", 1).maybeSingle()) as any;
    return { notify_email: r?.notify_email ?? "", resend_key_set: !!r?.resend_key, from_email: r?.from_email ?? "", site_url: r?.site_url ?? "",
      drop_applied: r?.drop_applied ?? 0, drop_accepted: r?.drop_accepted ?? 0 };
  },
  async saveSettings(p: { notify_email?: string; resend_key?: string; from_email?: string; site_url?: string; drop_applied?: number; drop_accepted?: number }) {
    if (DEMO) { const { resend_key: _k, ...rest } = p; Object.assign(S().settings, rest); save(); return; }
    must(await sb!.from("settings").update(p).eq("id", 1));
  },
  async stats() {
    const [users, entries, videos, briefs, reports] = await Promise.all([admin.users(), admin.entries(), admin.videos(), admin.briefs(), admin.reports()]);
    return {
      creators: users.filter((u) => u.role === "creator").length, vetted: users.filter((u) => u.role === "creator" && u.vetted).length,
      brands: users.filter((u) => u.role === "brand").length, entries: entries.length, newEntries: entries.filter((e) => e.status === "new").length,
      videos: videos.filter((v) => v.status === "ready").length, briefs: briefs.filter((b) => b.status === "new").length,
      reports: reports.filter((r) => r.status === "open").length,
    };
  },
};

export function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export const DEMO_ACCOUNTS = [
  { label: "Admin (you)", email: "admin@vetta.demo" },
  { label: "Brand", email: "brand@vetta.demo" },
  { label: "New creator", email: "creator@vetta.demo" },
  { label: "Vetted creator", email: "amara@vetta.demo" },
];

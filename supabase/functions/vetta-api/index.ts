// Vetta server function: video uploads (Cloudflare Stream) and account bans.
// Deploy in Supabase > Edge Functions > Deploy a new function > Via Editor, name it "vetta-api", paste this file.
// Secrets (Edge Functions > Secrets): CF_ACCOUNT_ID, CF_STREAM_TOKEN.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CF_ACCOUNT = Deno.env.get("CF_ACCOUNT_ID") ?? "";
const CF_TOKEN = Deno.env.get("CF_STREAM_TOKEN") ?? "";
const MAX_SECONDS = 180;

async function cf(path: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream${path}`, {
    ...init, headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(j?.errors?.[0]?.message ?? `Cloudflare error ${r.status}`);
  return j.result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Log in first." }, 401);
    const db = createClient(SUPABASE_URL, SERVICE);
    const { data: me } = await db.from("profiles").select("id, role, status").eq("id", user.id).single();
    if (!me || me.status !== "active") return json({ error: "Your account isn't active." }, 403);
    const isAdmin = me.role === "admin";
    const body = await req.json();

    switch (body.action) {
      case "video_create": {
        if (me.role !== "creator" && !isAdmin) return json({ error: "Only creator accounts can upload videos." }, 403);
        if (!CF_ACCOUNT || !CF_TOKEN) return json({ error: "Video uploads aren't set up yet." }, 500);
        const since = new Date(Date.now() - 3600_000).toISOString();
        const { count } = await db.from("videos").select("id", { count: "exact", head: true }).eq("owner_id", me.id).gte("created_at", since);
        if ((count ?? 0) >= 10) return json({ error: "You've uploaded a lot in the last hour. Try again later." }, 429);
        const kind = body.kind === "entry" ? "entry" : "post";
        const result = await cf("/direct_upload", { method: "POST", body: JSON.stringify({ maxDurationSeconds: MAX_SECONDS, meta: { owner: me.id, kind } }) });
        const { data: video, error } = await db.from("videos").insert({
          owner_id: me.id, stream_uid: result.uid, caption: String(body.caption ?? "").slice(0, 300),
          niches: Array.isArray(body.niches) ? body.niches.slice(0, 3) : [], kind, status: "processing",
        }).select().single();
        if (error) throw error;
        return json({ uploadURL: result.uploadURL, video });
      }
      case "video_check": {
        const { data: v } = await db.from("videos").select("*").eq("id", body.video_id).single();
        if (!v || (v.owner_id !== me.id && !isAdmin)) return json({ error: "Not found." }, 404);
        if (v.status !== "processing" || !v.stream_uid) return json({ video: v });
        const s = await cf(`/${v.stream_uid}`);
        if (s.readyToStream) {
          const { data: up } = await db.from("videos").update({
            status: "ready", playback_url: s.playback?.hls ?? null, thumbnail_url: s.thumbnail ?? null, duration: s.duration ?? null,
          }).eq("id", v.id).select().single();
          return json({ video: up });
        }
        if (s.status?.state === "error") {
          await db.from("videos").update({ status: "removed" }).eq("id", v.id);
          return json({ error: "That video couldn't be processed. Try exporting it as MP4." }, 422);
        }
        return json({ video: v });
      }
      case "video_delete": {
        const { data: v } = await db.from("videos").select("*").eq("id", body.video_id).single();
        if (!v || (v.owner_id !== me.id && !isAdmin)) return json({ error: "Not found." }, 404);
        if (v.stream_uid) await cf(`/${v.stream_uid}`, { method: "DELETE" }).catch(() => null);
        await db.from("videos").update({ status: "removed", playback_url: null }).eq("id", v.id);
        return json({ ok: true });
      }
      case "set_status": {
        if (!isAdmin) return json({ error: "Admins only." }, 403);
        const status = body.status as string;
        if (!["active", "suspended", "banned"].includes(status)) return json({ error: "Bad status." }, 400);
        const { data: target } = await db.from("profiles").select("role").eq("id", body.user_id).single();
        if (!target || target.role === "admin") return json({ error: "You can't change an admin's status." }, 400);
        await db.from("profiles").update({ status }).eq("id", body.user_id);
        // A ban also blocks login. Suspensions keep login so the person can see what happened.
        await db.auth.admin.updateUserById(body.user_id, { ban_duration: status === "banned" ? "876000h" : "none" });
        if (status === "banned") await db.from("videos").update({ status: "hidden" }).eq("owner_id", body.user_id).eq("status", "ready");
        return json({ ok: true });
      }
      default: return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message ?? "Something went wrong." }, 500);
  }
});

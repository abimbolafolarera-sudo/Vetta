// Sets up the database on deploy, so nobody has to paste SQL by hand.
// - First deploy: runs supabase/schema.sql (all tables, rules, storage, email follow-ups).
// - Later deploys: runs any new file in supabase/migrations/, once, in name order.
// Uses the private database link Vercel gets from the Supabase connection. It never reaches the browser.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const e = process.env;
const url = e.POSTGRES_URL_NON_POOLING || e.POSTGRES_URL || e.SUPABASE_DB_URL || e.DATABASE_URL;
if (!url) { console.log("[vetta] No database connection set, so the database setup step was skipped."); process.exit(0); }

const conn = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const db = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
const say = (m) => console.log("[vetta] " + m);

try {
  await db.connect();
  const fresh = !(await db.query("select to_regclass('public.profiles') is not null as ok")).rows[0].ok;
  if (fresh) {
    say("New database: setting up Vetta's tables, rules and storage…");
    await db.query(fs.readFileSync(path.resolve("supabase/schema.sql"), "utf8"));
    say("Database ready.");
  }
  await db.query("create table if not exists public._vetta_migrations (name text primary key, ran_at timestamptz not null default now())");
  const dir = path.resolve("supabase/migrations");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort() : [];
  const done = new Set((await db.query("select name from public._vetta_migrations")).rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) continue;
    if (!fresh) {
      say("Updating database: " + f);
      await db.query("begin");
      try { await db.query(fs.readFileSync(path.join(dir, f), "utf8")); await db.query("commit"); }
      catch (err) { await db.query("rollback"); throw err; }
    }
    await db.query("insert into public._vetta_migrations (name) values ($1) on conflict do nothing", [f]);
  }
  // Fill in the live link for follow-up emails, the first time.
  const site = e.VERCEL_PROJECT_PRODUCTION_URL || (e.VERCEL_ENV === "production" ? e.VERCEL_URL : "");
  if (site) await db.query("update public.settings set site_url = $1 where id = 1 and site_url = ''", ["https://" + site]);
  await db.end();
} catch (err) {
  console.error("[vetta] Database setup failed: " + (err?.message || err));
  try { await db.end(); } catch {}
  process.exit(1);
}

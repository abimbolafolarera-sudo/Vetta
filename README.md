# Vetta

A video-first social platform for vetted creators. Creators sign up, build a profile, upload videos and enter Drops. Vetted creators go public and appear in the For You feed. Brands browse, shortlist, post campaigns and brief Vetta. All contact goes through the Vetta team. The admin sees and controls everything.

- **Go live:** `DEPLOY.md`
- **Dates, founder block, contact email:** `src/config.ts`
- **Database, roles and access rules:** `supabase/schema.sql`
- **Colour palettes:** `src/lib/palette.ts` (picked in Admin, Settings)
- **Optional Cloudflare Stream function:** `supabase/functions/vetta-api/index.ts`

## Screens

| Path | What it is |
|---|---|
| `/` | For You: vertical video feed of vetted creators, plus Vetta's own posts |
| `/explore`, `/explore/<niche>` | Search and browse vetted creators and videos by niche |
| `/u/<username>` | Profile: photo, badge, stats, bio, links, video grid, About; Message, Brief, Save, Share, Report |
| `/upload` | Creators upload videos (Cloudflare Stream) |
| `/enter` | Drop entry: details, craft, showcase video, consent |
| `/me` | Creator: own profile and status. Brand: dashboard with shortlists, briefs, Tasks |
| `/inbox` | Message Vetta: each account's conversation with the Vetta team |
| `/earn` | Earn Now: paid gigs (Open to all or Vetted only), filters for remote and near me, your submissions |
| `/campaign` | Brands post a campaign: brief, deliverables, location, pay, deadline, files |
| `/learn` | Learn hub, vetted creators only |
| `/brands`, `/brief` | For brands, and the brief form (no account needed) |
| `/settings` | Edit profile, photo, links, results, theme (dark, light, device), password, log out |
| `/admin` | Overview, Entries, Users, Videos, Briefs, Campaigns, Learn, Messages, Reports, Settings |

## Stack

React + Vite single-page app (installable), Supabase (Postgres with row-level security, auth, storage for photos and videos). Optional: Cloudflare Stream for video, Resend for email alerts.

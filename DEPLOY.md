# Putting Vetta live

You need two free accounts: **Supabase** (database, logins, video and photo storage) and **Vercel** (the website). About 20 minutes. Cloudflare Stream and Resend are optional upgrades for later.

## 1. Supabase: the backend

1. Go to supabase.com and sign up (GitHub sign-in is quickest). Click **New project**, name it `vetta`, set a database password and save it, and pick the region closest to your creators (Europe West, London, works well for Nigeria).
2. When it's ready, open **SQL Editor**, click **New query**, paste the whole of `supabase/schema.sql`, and click **Run**. You should see "Success. No rows returned".
3. Open **Project Settings, API** (or **Data API**). Copy two things:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon public** key (a long string starting `eyJ`). It's safe to share and goes in the website. Never share the `service_role` key.

## 2. Vercel: the website

1. The code is in your GitHub repo `vetta` (I push it there for you once the empty repo exists).
2. Go to vercel.com, **Sign up with GitHub**, then **Add New, Project**, and **Import** the `vetta` repo.
3. Open **Environment Variables** and add both:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
4. Click **Deploy**. In about a minute you have a live link like `vetta-abc.vercel.app`.
5. Back in Supabase: **Authentication, URL Configuration**, set **Site URL** to that link and save.

## 3. Make yourself the admin

1. Open your live link, tap **Log in, Create an account**, and sign up with your own email. Confirm it from your inbox.
2. In Supabase **SQL Editor**, run this with your email:
   ```sql
   update public.profiles set role = 'admin', vetted = true
   where id = (select user_id from public.account_emails where email = 'YOUR-EMAIL-HERE');
   ```
3. Refresh the site. **Admin** appears in your menu: entries, users, videos, briefs, campaigns, Learn, messages, reports and settings.
4. In **Admin, Settings**, pick the site colour. It changes for every visitor.

That's it. Sign-ups, Drop entries, video uploads (up to 50 MB each), briefs, campaigns, messages to Vetta, and bans all work now.

## Check it like a stranger

On your phone, in a private window: sign up as a creator, upload a video, enter the Drop. In another browser, sign up as a brand, post a campaign and send a brief. Then check all of it in Admin, vet the creator, approve the campaign, and reply to a message.

## Your domain (when you're ready)

Buy it, then in Vercel **Settings, Domains, Add**, and copy the records it shows into your registrar. Update Supabase's Site URL to the domain.

## Optional upgrades

**Email alerts.** Sign up at resend.com with the email you want alerts sent to, create an API key, and paste both in Admin, Settings. You'll get an email for each new entry, brief, campaign to review, message and report.

**Smoother video (Cloudflare Stream).** Supabase stores the original video file: fine to start, and the free plan holds about 1 GB (roughly 40 to 100 short videos). When volume grows, switch to Cloudflare Stream, which converts video for smooth playback on slow networks and allows files up to 200 MB:
1. In Cloudflare, subscribe to Stream, copy your Account ID, and create an API token with **Account, Stream, Edit**.
2. In Supabase, **Edge Functions, Deploy a new function, Via Editor**, name it `vetta-api`, and paste `supabase/functions/vetta-api/index.ts`. Under **Edge Functions, Secrets**, add `CF_ACCOUNT_ID` and `CF_STREAM_TOKEN`.
3. In Vercel, add the environment variable `VITE_VIDEO_PROVIDER` = `cloudflare` and redeploy.

**More storage.** Supabase Pro ($25/month) gives 100 GB storage and 8 GB database.

## How the rules work

- **Creators** sign up, edit only their own profile, upload videos, enter Drops and take gigs in Earn Now. Their profile stays private until you vet them.
- **Brands** browse creators, shortlist them, post campaigns (you approve before they go live) and send briefs. Every brief goes to Vetta, never to a creator.
- **Nobody messages each other.** Each account has one conversation with the Vetta team, which you answer in Admin, Messages.
- **Learn** is visible only to vetted creators.
- **Suspend** stops someone posting. **Ban** also blocks login and hides their videos.

# Supabase setup (cloud sync, free tier)

Cloud sync saves profiles and proposal history to your account, so they survive a reinstall and
appear on other computers. Sign-in uses Google (no emails are sent, so Supabase's free email
limit does not matter).

Everything below is free. You need about 20 minutes.

## 1. Create the Supabase project

1. Sign up at <https://supabase.com> (GitHub or Google login).
2. **New project**: name `proposalpilot`, a strong database password (save it in a password
   manager), region **Singapore** or **Mumbai** (closest to Pakistan), plan **Free**.
3. Wait until the project is ready.

## 2. Create the tables

1. Left menu: **SQL Editor** -> **New query**.
2. Paste the whole file [`supabase/schema.sql`](../supabase/schema.sql) and click **Run**.
3. **Table Editor** should now show `freelancer_profiles` and `proposal_history`, both with
   RLS enabled.

## 3. Google sign-in

### 3a. Google Cloud OAuth client

1. Open <https://console.cloud.google.com>, create a project `ProposalPilot`.
2. **APIs & Services -> OAuth consent screen**: User type **External**, app name
   `ProposalPilot`, your support email, scopes `email`, `profile`, `openid`. Publish the app
   (status **In production**) so any Google account can sign in.
3. **Credentials -> Create credentials -> OAuth client ID**, type **Web application**.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (copy it from Supabase: **Authentication -> Sign In / Providers -> Google**).
4. Copy the **Client ID** and **Client secret**.

### 3b. Enable Google in Supabase

1. **Authentication -> Sign In / Providers -> Google**: enable, paste Client ID and secret, save.
2. **Authentication -> URL Configuration -> Redirect URLs**, add:
   - `https://hhipbnhepdghapechikmncmboafgodfc.chromiumapp.org/` (store extension)
   - `https://ocbbkjndganckobafckfhmeggefnlkoh.chromiumapp.org/` (local test build)

## 4. Send these two values

From **Project Settings -> API** (or **Data API**):

| Value | Safe to share? |
|---|---|
| Project URL (`https://xxxx.supabase.co`) | Yes, it is public |
| `anon` / publishable key | Yes, it is public (RLS protects the data) |
| `service_role` / secret key | **Never.** Do not paste it anywhere |

They go into `extension/.env.production` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 5. Keep the project awake

Free projects pause after 7 days without activity. Active users keep it awake, but add an
UptimeRobot HTTP monitor (every 24 hours is enough) for:

```
https://<your-project-ref>.supabase.co/rest/v1/
```

with header `apikey: <anon key>`.

## Limits on the free plan

500 MB database (about a million drafts), 50,000 monthly active users, 2 projects. ProposalPilot
keeps at most 300 drafts per user (a database trigger removes older ones).

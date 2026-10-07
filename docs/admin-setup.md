# Admin setup: Clerk and Vercel

How to configure authentication for `/admin` in each environment. For how the code works (layers, guards, conventions), see [ARCHITECTURE.md → Authentication & admin](../ARCHITECTURE.md#authentication--admin).

## The model in one paragraph

Clerk handles identity: it signs you in and says *who* you are. The site handles authorization: the only identity allowed in is the one whose Clerk user ID equals `ADMIN_CLERK_USER_ID`. There is one administrator, created by hand in Clerk. The site has no sign-up page, and the Clerk instance is set so nobody can create an account through it. Clerk Development and Production are separate instances with **separate users**, so your user ID is different in each, and each Vercel environment gets its own.

## Environment variables

| Variable | Exposure | Value |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | public by design (inlined into the browser bundle) | `pk_test_…` (Development instance) or `pk_live_…` (Production instance) |
| `CLERK_SECRET_KEY` | **server only** | `sk_test_…` / `sk_live_…`, from the **same** instance as the publishable key |
| `ADMIN_CLERK_USER_ID` | **server only** | `user_…`, your user ID **in that instance** |

`src/config/env.ts` validates all three together. If any of them is missing or malformed, or the keys come from different instances, the admin switches itself off: every `/admin` page shows "Admin unavailable", admin APIs return 404, and the server logs one `admin` warning naming the missing variables (names only, never values). No environment has a bypass. A deployment without these variables simply has no admin.

| Where | Clerk instance | Variables come from |
|---|---|---|
| Local (`npm run dev`, `npm start`) | Development | `.env.local` |
| Vercel **Preview** (and Vercel "Development") | Development | Vercel project → Settings → Environment Variables, scoped to Preview |
| Vercel **Production** | Production | the same screen, scoped to Production |

`NEXT_PUBLIC_*` values are inlined at build time, so after changing any of them, **redeploy** (Vercel) or **rebuild** (`npm run build` locally; `npm run dev` picks changes up on restart).

---

## 1. Development instance (local + Preview)

1. **Create the application.** At [dashboard.clerk.com](https://dashboard.clerk.com), click *Create application* and name it `alexball.dev`. In the creation dialog, enable **Email**, **GitHub**, and **Google**. Leave everything else off. Vercel is optional; see below.
2. **Sign-in methods.** Under *Configure → User & authentication*:
   - **Email:** sign in with **password** (optionally also *email verification code*). Leave phone and username off.
   - **SSO connections:** GitHub and Google. Development instances use Clerk's shared OAuth credentials, so there's nothing to set up yet.
3. **Turn off public sign-up.** Under *Configure → User & authentication → Access mode*, choose **Invite-only** (the badge next to the instance name in the header confirms it). Only accounts you create or invite in the dashboard can exist; nobody can register, by email or OAuth. Leave *Email → Sign-up with email* on: Clerk uses it for the users you create.
4. **Paths (recommended).** Under *Configure → Paths*, point the sign-in page to the application domain at **`/admin/sign-in`** and the after-sign-out location to `/admin/sign-in`. Leave sign-up unset. The code already passes these to Clerk, and this keeps emails and redirects consistent with it.
5. **Create your user.** Under *Users → Create user*, enter your email address and a strong password. Open the new user and copy its **User ID** (`user_…`).
6. **Copy the keys.** Under *Configure → API keys*, copy the **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`).
7. **Local.** Add to `.env.local` (gitignored):
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
   CLERK_SECRET_KEY=sk_test_…
   ADMIN_CLERK_USER_ID=user_…
   ```
   Restart the dev server, open `/admin`, and sign in with that email and password.
8. **Connect GitHub / Google to your user.** Because sign-up is restricted, a social login only works when it belongs to your existing user. In `/admin`, open **Account → Security / Connected accounts** and connect GitHub and Google. (Clerk also links a social login automatically when its verified email matches your user's email.) After that, those buttons sign you in.
9. **Vercel Preview.** In the Vercel project, go to *Settings → Environment Variables* and add the same three values. Tick **Preview** (and **Development** if you use `vercel env pull`), **not** Production. Mark `CLERK_SECRET_KEY` as **Sensitive**. Redeploy a preview to confirm. Development instances accept any domain, so `*.vercel.app` preview URLs work without extra setup.

## 2. Production instance (alexball.dev)

Do this when you're ready for `/admin` to work on the live site. Until then, Production simply has no admin.

1. In the Clerk dashboard's instance switcher, choose **Create production instance** and clone the development settings.
2. **Domain.** Set the domain to `alexball.dev` and add the DNS records Clerk lists (a CNAME for the Frontend API, e.g. `clerk.alexball.dev`, plus the email records) wherever DNS for alexball.dev is managed. Wait for Clerk to show them as verified, then **deploy certificates**.
3. **OAuth credentials.** Production can't use Clerk's shared credentials. For each provider, Clerk shows the **redirect/callback URL** to use:
   - **GitHub:** at github.com → *Settings → Developer settings → OAuth Apps → New OAuth App*, set the homepage to `https://alexball.dev` and the callback to the URL Clerk shows. Paste the Client ID and a generated Client Secret into Clerk.
   - **Google:** in Google Cloud Console → *APIs & Services → Credentials*, create an **OAuth client ID** (Web application) with Clerk's redirect URI as an authorized redirect URI, and configure (and publish) the OAuth consent screen. Paste the Client ID and secret into Clerk.
4. **Repeat the safety settings:** *Access mode: Invite-only*, and the *Paths* from step 1.4.
5. **Create your user again** (Production has its own users) and copy its **production** `user_…` ID. It is **not** the same as the development one.
6. Copy the production keys (`pk_live_…`, `sk_live_…`).
7. In Vercel, add the three variables scoped to **Production only**: the `pk_live`/`sk_live` keys and the **production** user ID. Redeploy production.
8. Sign in at `https://alexball.dev/admin`, then connect GitHub and Google under **Account**, as in step 1.8.

## Optional

- **Two-factor authentication (recommended).** Under *Configure → Multi-factor*, enable an authenticator app (TOTP), then turn it on for your user from **Account → Security**. This is the cheapest meaningful hardening for a single admin account.
- **Allowlist.** If your plan offers an allowlist (under *Protect* / restrictions), adding only your email address is belt-and-braces on top of Invite-only mode.
- **Sign in with Vercel.** Possible, but it needs its own OAuth app per instance and adds nothing that GitHub/Google don't already give a single admin. Skipped for now; it's purely a Clerk dashboard change if you ever want it (no code change).

## Checking it works

- Signed out, `/admin` → redirected to `/admin/sign-in`, and there's no sign-up link anywhere.
- Signed in as you → the dashboard. The *Session* panel shows your user ID and which Clerk instance (Development/Production) the deployment uses.
- Any other identity (e.g. a test user you create) → `/admin` responds exactly like a page that doesn't exist (404).
- `GET /api/admin/session` → `200 {"userId": …}` for you, `404` for everyone else.

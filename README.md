# Alexander D. Ball — Portfolio

> Personal portfolio and engineering showcase · **[alexball.dev](https://alexball.dev)**

![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white&style=flat-square)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white&style=flat-square)

---

## Overview

This is the source code for my personal portfolio site — a fast, bilingual React app built from scratch with Vite. No component library, no CSS framework — every pixel is custom. The goal was to build something that felt like an engineering product, not a template.

It has since grown past a static front end: the site is backed by its own small API on `api.alexball.dev`, which serves live GitHub data to the site and delivers contact-form mail. That API has a public portal of its own.

| | |
|---|---|
| Site | **[alexball.dev](https://alexball.dev)** |
| API | **[api.alexball.dev](https://api.alexball.dev)** |

---

## Features

**Front end**

- **6 routed screens** — Home, About, Projects, Experience, Resume, Contact, each on a real URL via React Router
- **Command palette** — `⌘K` / `Ctrl K` from anywhere: jump to a screen, download the resume, copy my email, flip theme or language, open a profile. Accent-folding filter, arrow-key navigation, combobox semantics, no dependencies
- **Bilingual** — full English / Spanish support, toggle in the footer, persisted in `localStorage`
- **Dark / Light theme** — persisted in `localStorage`, honors `prefers-reduced-motion`
- **Live GitHub section** — contribution heatmap with per-day tooltips, repositories, stars/forks/contribution counters, and a recent-activity feed, all pulled from the API at runtime
- **Contact form** — client-side validation, real delivery through the API, honeypot field, success state
- **PDF resume viewer** — embedded in-page with download and open-full options
- **Prev / next pager** — every screen ends with typed navigation panels to its neighbors
- **Scroll-reveal animations** — custom intersection system, no library
- **Animated background** — layered grid, dual accent glows, vignette, and noise
- **Fully responsive** — mobile drawer nav, fluid typography, adaptive layouts

**Platform**

- **Two serverless functions** on Vercel, host-routed to a clean `api.alexball.dev` surface
- **API portal** — a second React app rendered on the API subdomain, listing every endpoint and its status
- **SEO** — per-route title, description, and canonical URL, Open Graph / Twitter card, sitemap and `robots.txt`
- **Structured data** — Schema.org JSON-LD generated from `siteData.js`: a `Person` + `WebSite` graph inlined into `index.html` at build time, plus a per-route page node (`ProfilePage`, `CollectionPage`, `ContactPage`, `WebPage`) written at runtime
- **Custom 404** — a real not-found screen for unmatched routes, self-`noindex`ed and excluded from the structured data
- **Installable** — web manifest plus a full favicon and app-icon set
- **Analytics** — Vercel Analytics, Vercel Speed Insights, and Google Analytics

---

## Tech Stack

| Layer | Choice |
|---|---|
| Build tool | Vite 5 |
| UI | React 18 |
| Routing | React Router 7 |
| Styling | Custom CSS (no UI library) |
| Fonts | Space Grotesk · Inter · JetBrains Mono |
| State | React Context API |
| API | Vercel Functions (Node) |
| Email | Resend |
| Data source | GitHub REST + GraphQL |
| Hosting | Vercel |

---

## The API

Both functions live in `api/` and are exposed on the `api.alexball.dev` host through the rewrites in `vercel.json`. Each one reads its secrets from `process.env` only — nothing sensitive ever reaches the client bundle — and each enforces its own CORS origin allowlist.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `api.alexball.dev/github` | Profile, repo stats, repositories, contribution calendar, recent activity |
| `POST` | `api.alexball.dev/contact` | Validates and delivers a contact-form message |

**`/github`** fans out to the GitHub REST API for the profile, repositories, and public events, and to the GraphQL API for the 26-week contribution calendar. Responses are normalized into one flat payload and cached at the edge (`s-maxage=900`, `stale-while-revalidate=1800`). If the calendar query fails the rest of the payload still returns, flagged with `contributionsUnavailable`.

**`/contact`** re-validates every field server-side (independently of the browser), rejects header injection in the subject, silently discards honeypot submissions, and sends via Resend. The visitor's address is never used as `from` — it goes in `Reply-To`, so replying reaches them directly.

**The portal.** `src/main.jsx` checks the hostname at boot and mounts `ApiPortalApp` instead of the portfolio when the site is served from an `api.` host. The portal renders entirely from the `ENDPOINTS` list in `src/api-portal/portalData.js` — adding an endpoint there, plus its `api/*.js` function and a `vercel.json` rewrite, is the whole job.

---

## Project Structure

```
api/
├── github.js                # Vercel Function — GitHub data
└── contact.js               # Vercel Function — contact email via Resend

scripts/
├── generate-icons.ps1       # Favicon / app-icon set from the source logo
├── make-ico.mjs             # Assembles the multi-size favicon.ico
└── generate-og.ps1          # Builds the 1200x630 social card

src/
├── App.jsx                  # Router + screen composition
├── main.jsx                 # Entry point, CSS imports, portfolio/portal switch
├── context/
│   └── AppContext.jsx       # Locale, theme, route-derived screen, document head
├── data/
│   ├── screens.js           # Screen ids, id -> path mapping, per-screen icons
│   ├── commands.js          # Command palette entries + filtering
│   ├── siteData.js          # All personal content (bilingual)
│   ├── siteMeta.js          # Production URLs, JSON-LD @ids, safe serializer
│   ├── siteStrings.js       # UI chrome strings (bilingual)
│   └── structuredData.js    # Schema.org graph builders (Person, WebSite, pages)
├── services/
│   ├── github.js            # API client + useGithubProfile hook
│   └── contact.js           # API client for form submission
├── components/
│   ├── Nav.jsx              # Desktop bar, mobile drawer, palette triggers
│   ├── CommandPalette.jsx   # Cmd/Ctrl+K dialog
│   ├── Footer.jsx           # Theme + locale toggles
│   ├── Hero.jsx
│   ├── LocalTime.jsx        # Live Phoenix clock in the hero meta row
│   ├── Pager.jsx            # Prev / next screen panels
│   ├── Background.jsx
│   └── sections/            # Snapshot, About, Stack, Projects, GitHub,
│                            # Experience, Resume, Contact, NotFound
├── api-portal/              # Second app served on api.alexball.dev
│   ├── ApiPortalApp.jsx
│   ├── portalData.js        # Endpoint registry
│   ├── components/
│   └── styles/api-portal.css
├── hooks/
│   ├── scrollWatcher.js     # Scroll visibility singleton
│   ├── useCountUp.js
│   ├── useInView.js
│   └── useRevealRef.js
├── ui/
│   ├── Icon.jsx             # All SVG icons
│   ├── Reveal.jsx           # Scroll-reveal wrapper
│   └── SectionHead.jsx
├── utils/
│   ├── datetime.js          # Intl date / time formatting
│   ├── head.js              # Canonical, og:url, and JSON-LD script writers
│   ├── platform.js          # Mac vs. PC shortcut label
│   └── scrollLock.js        # Counted body scroll lock shared by overlays
└── styles/
    ├── styles.css           # Design system tokens + global styles
    ├── layout.css           # Section + component layouts
    └── bg.css               # Animated background
```

Screens are composed rather than one-to-one with sections: **About** renders Snapshot + About + Stack, and **Projects** renders Projects + GitHub.

---

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

By default the dev server talks to the **deployed** API at `api.alexball.dev` (which allows `http://localhost:5173` as a CORS origin), so the GitHub section and contact form work locally without any setup.

To preview the API portal locally, append `?apiPortal` to the URL — the switch in `main.jsx` honors that flag in dev builds.

To build for production:

```bash
npm run build
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in what you need. Everything without a `VITE_` prefix is server-only and never reaches the client bundle.

| Variable | Scope | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | server, secret | Authenticates the GitHub REST + GraphQL calls |
| `GITHUB_USERNAME` | server | The account `/github` reports on |
| `ALLOWED_ORIGIN` | server | Comma-separated CORS allowlist for both functions |
| `RESEND_API_KEY` | server, secret | Sends contact-form mail |
| `CONTACT_TO_EMAIL` | server | Where contact notifications are delivered |
| `CONTACT_FROM_EMAIL` | server | Sender address; must be on a Resend-verified domain |
| `VITE_API_BASE_URL` | client | API origin the front end calls |

Each has a working default except the two secrets and `GITHUB_USERNAME`. The same values need to be set in the Vercel project for the deployed functions.

---

## Deployment

The site auto-deploys to Vercel on every push to `master`.

| Branch | Purpose |
|---|---|
| `master` | Production — triggers a Vercel deploy |
| `dev` | Active development — no deploy |

To publish changes: merge `dev` → `master`.

`vercel.json` handles routing: the two host-scoped rewrites map `api.alexball.dev/github` and `/contact` onto the functions, and the catch-all rewrites everything else to `index.html` so React Router owns client-side navigation.

---

## Assets

The icon set, social card, and resume all live under `public/`. The generated assets are checked in, so the scripts only need re-running when the source logo or card design changes:

```bash
powershell -File scripts/generate-icons.ps1   # then:
node scripts/make-ico.mjs
powershell -File scripts/generate-og.ps1
```

---

## Personalizing

All site content lives in two files:

- **`src/data/siteData.js`** — projects, career, education, stack, identity info
- **`src/data/siteStrings.js`** — UI labels and copy in both languages

Edit those two files to make this your own. The JSON-LD structured data is generated from `siteData.js` as well, so identity, stack, and project changes flow into the schema automatically — there is no second list to keep in sync.

The command palette follows the same rule: its navigation entries come from the `screens` array the nav and footer already use, and its profile, resume, and email commands read `siteData.js` directly. Adding a screen to `SCREEN_IDS` puts it in the palette. Search aliases — the terms that let "work" find Experience — live under `palette.keywords` in `siteStrings.js`, one set per language.

---

## License

MIT — feel free to use this as a starting point for your own portfolio.

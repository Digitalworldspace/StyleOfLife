# Bolt & Ledger — Wholesale Textile Catalog

A B2B wholesale catalog for textiles and finished garments, with a public
front panel and an admin panel, backed entirely by Supabase (Postgres +
Storage). No offline/local storage — everything reads and writes live to
your Supabase project. The admin panel has a simple login you manage
entirely from Supabase's **Table Editor** — no Supabase Auth setup needed.
See the security note near the bottom before you deploy this anywhere public.

## What's included

```
textile-b2b/
├── catalog.html          ← public wholesale catalog (product grid, detail pages, quote requests)
├── admin.html             ← admin panel (products, inquiries, design/branding)
├── assets/
│   ├── config.js           ← your Supabase URL + anon key (edit this)
│   ├── themes.js            ← the 5 preset visual themes
│   └── style.css           ← shared design system
├── supabase-schema.sql    ← run this once in Supabase to create everything
└── README.md
```

## 1. Create a Supabase project

1. Go to https://supabase.com and create a new project (free tier is fine to start).
2. Wait for provisioning to finish.

## 2. Run the schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase-schema.sql` and click **Run**.
   This drops and recreates all tables (`products`, `categories`,
   `product_images`, `inquiries`, `inquiry_items`, `site_settings`,
   `admin_credentials`), sets up Row Level Security policies, and creates
   public `product-images` and `site-assets` storage buckets.
   It's safe to re-run any time — it always starts from a clean slate.

## 3. Set your admin login

The schema creates one default login:

- **Username:** `admin`
- **Password:** `changeme123`

**Change this immediately.** In Supabase: **Table Editor → admin_credentials**,
click the row, and edit the `username`/`password` fields directly. Add more
rows the same way if more than one person needs to log in. That's the whole
process — no SQL, no Supabase Auth dashboard.

## 4. Configure the app

1. In Supabase: **Project Settings → API**.
2. Copy your **Project URL** and **anon public key**.
3. Open `assets/config.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ....";
   ```
   Both `catalog.html` and `admin.html` share this one file.

## 5. Host the files

These are static files — no build step, no server code. Host them anywhere
that serves static HTML, for example:

- **Vercel / Netlify**: drag-and-drop the `textile-b2b` folder, or connect
  a git repo.
- **Supabase Storage** (a second public bucket) or **GitHub Pages** also work.

Since all data access goes straight to Supabase over HTTPS using the anon
key (which is safe to expose — it's protected by the Row Level Security
policies in the schema), there's nothing else to deploy or configure.

## Using it

**Catalog (`catalog.html`)** — public, no login:
- Browse products by category, search, view a full spec sheet per item
  (composition, weight, width, colorways, MOQ, price).
- Add items to a "Quote List" and submit a quote request (name, company,
  email, phone, message) — this creates a row in `inquiries` plus one
  `inquiry_items` row per product.

**Admin (`admin.html`)** — log in with the username/password from
`admin_credentials`:
- **Products**: create/edit SKUs, upload photos (stored in the
  `product-images` Storage bucket), set composition, weight, width,
  colorways, MOQ, price, and status (active/draft/discontinued).
- **Inquiries**: see every quote request with its item list, update status
  (new → reviewed → quoted → closed).
- **Categories**: add/remove product categories.
- **Design**: pick one of five preset visual themes (Indigo Mill, Bone & Rust,
  Ink & Selvage, Raw Fiber, Denim Ledger), edit the brand name/tagline/logo
  and hero headline/subtext, and preview it live before saving. The catalog
  reads these settings from `site_settings` on every page load, so changes
  show up for visitors without touching any code.

## Notes on security (read this)

`admin.html` now has a login screen, checked against the `admin_credentials`
table via a database function — the browser never sees the password list
itself, only a true/false answer.

That said, this is a **UI-level gate, not full API-level security**:
- Row Level Security on `products`, `categories`, `inquiries`, and
  `site_settings` is still fully open. Anyone who has your project's anon
  key (which is meant to be public, and is visible in `config.js`) can
  read and write those tables directly through Supabase's API — whether or
  not they've seen the login screen — because without real session tokens
  (Supabase Auth), Postgres has no way to know a given API request came
  from someone who logged in.
- The login mainly stops casual visitors from finding and using the admin
  UI. It does not stop someone who deliberately inspects network requests
  and calls the API directly.

This is a reasonable trade-off for an internal tool, a client demo, or a
setup where you trust everyone who has the site's URL. It is **not**
appropriate for a fully public admin panel that needs to resist a
motivated attacker. If you need that level of protection later, the more
robust options, roughly in order of effort:
1. **Hosting-level password protection** on `admin.html` — Vercel, Netlify,
   and most static hosts offer this on paid tiers (or via a small
   middleware/Edge Function).
2. **Put `admin.html` behind a VPN or IP allowlist** if your team already
   has one.
3. **Re-introduce Supabase Auth** with real session tokens and RLS policies
   scoped to the logged-in user's role — this is what an earlier version
   of this project used, and it can be added back without changing the
   rest of the app.

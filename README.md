# Bolt & Ledger — Wholesale Textile Catalog

A B2B wholesale catalog for textiles and finished garments, with a public
front panel and an admin panel, backed entirely by Supabase (Postgres +
Storage). No offline/local storage — everything reads and writes live to
your Supabase project. There's no login for either panel — see the
security note near the bottom before you deploy this anywhere public.

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
   `product_images`, `inquiries`, `inquiry_items`, `site_settings`), sets
   up fully-open Row Level Security policies (see the security note below),
   and creates public `product-images` and `site-assets` storage buckets.
   It's safe to re-run any time — it always starts from a clean slate.

## 3. Configure the app

1. In Supabase: **Project Settings → API**.
2. Copy your **Project URL** and **anon public key**.
3. Open `assets/config.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ....";
   ```
   Both `catalog.html` and `admin.html` share this one file.

## 4. Host the files

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

**Admin (`admin.html`)** — opens directly, no login:
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

This version has **no authentication**. `admin.html` isn't gated by a
login — anyone who has the URL can open it and edit products, inquiries,
and design settings. Row Level Security is left fully open on every table
because, without a login, there's no way for the database to tell "the
admin" apart from a regular visitor using the same public anon key.

This is a reasonable trade-off for:
- an internal tool only your team can reach,
- a quick prototype or demo,
- a setup where you're the only one touching `admin.html`.

It's **not** appropriate to link `admin.html` publicly on a site where
strangers could stumble onto it. If you need it properly locked down
later, the simplest options, roughly in order of effort:
1. **Hosting-level password protection** on `admin.html` — Vercel, Netlify,
   and most static hosts offer this on paid tiers (or via a small
   middleware/Edge Function).
2. **Put `admin.html` behind a VPN or IP allowlist** if your team already
   has one.
3. **Re-add Supabase Auth** with an `admins` allow-list table and RLS
   policies scoped to `is_admin()` — this is exactly what the previous
   version of this project did, and can be re-introduced later without
   changing the rest of the app.

The anon key in `config.js` is meant to be public in all cases — Supabase's
security model relies on RLS policies, not on hiding that key.

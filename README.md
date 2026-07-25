# Bolt & Ledger — Wholesale Textile Catalog

A B2B wholesale catalog for textiles and finished garments, with a public
front panel and an admin panel, backed entirely by Supabase (Postgres +
Auth + Storage). No offline/local storage — everything reads and writes
live to your Supabase project.

## What's included

```
textile-b2b/
├── catalog.html          ← public wholesale catalog (product grid, detail pages, quote requests)
├── admin.html             ← admin panel (products, inquiries, B2B account approvals)
├── assets/
│   ├── config.js           ← your Supabase URL + anon key (edit this)
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
   This creates all tables (`products`, `categories`, `product_images`,
   `companies`, `admins`, `inquiries`, `inquiry_items`), sets up Row Level
   Security policies, and creates a public `product-images` storage bucket.

## 3. Configure the app

1. In Supabase: **Project Settings → API**.
2. Copy your **Project URL** and **anon public key**.
3. Open `assets/config.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ....";
   ```
   Both `catalog.html` and `admin.html` share this one file.

## 4. Create your first admin user

The admin panel only lets in users listed in the `admins` table.

1. In Supabase: **Authentication → Users → Add user** (email + password).
   You can also just sign up through `admin.html`'s login form won't work
   yet — use the dashboard for this first account.
2. Copy that user's UUID.
3. Back in **SQL Editor**, run:
   ```sql
   insert into admins (id) values ('paste-the-uuid-here');
   ```
4. Open `admin.html` and log in with that email/password.

Any additional admins can be added the same way (create the auth user,
then insert their id into `admins`).

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

**Catalog (`catalog.html`)** — public, no login required:
- Browse products by category, search, view a full spec sheet per item
  (composition, weight, width, colorways, MOQ, price).
- Add items to a "Quote List" and submit a quote request (name, company,
  email, phone, message) — this creates a row in `inquiries` plus one
  `inquiry_items` row per product.
- Buyers can optionally register a trade account (stored in `companies`)
  so their quote requests are linked to their profile. New accounts start
  as **Pending** until an admin approves them.

**Admin (`admin.html`)** — requires an `admins` row:
- **Products**: create/edit SKUs, upload photos (stored in the
  `product-images` Storage bucket), set composition, weight, width,
  colorways, MOQ, price, and status (active/draft/discontinued).
- **Inquiries**: see every quote request with its item list, update status
  (new → reviewed → quoted → closed).
- **B2B Accounts**: approve or revoke trade accounts that registered
  through the catalog.
- **Categories**: add/remove product categories.

## Notes on security

- Row Level Security is enabled on every table. Public visitors can only
  read active products/categories and insert inquiries — they cannot read
  other buyers' inquiries or write to products.
- Only users listed in the `admins` table can create/edit/delete products,
  categories, manage inquiries, or approve companies (enforced both in the
  UI and at the database level via RLS, so it can't be bypassed from the
  browser).
- The anon key in `config.js` is meant to be public — Supabase's security
  model relies on RLS policies, not on hiding that key.

# Vastra Wholesale — Saree & Ladies Suit Wholesale Platform

A live, Supabase-backed wholesale catalog with a public front panel and a
password-protected admin panel. No backend server or Supabase Edge
Functions — everything talks to Supabase directly from the browser using
Row Level Security.

- **Front panel** (`/`): shows products directly, no clutter. Visitors can
  select one or many products, send a wholesale inquiry via a form
  (saved to Supabase) or send the same selection straight to **WhatsApp**.
  Optional login lets a buyer's inquiries be linked to their account.
- **Admin panel** (`/admin`): add / edit / delete products (with image
  upload), and view incoming inquiries. Every change is pushed live to
  every open front-panel tab instantly via Supabase Realtime — including
  changes made directly in the Supabase dashboard or SQL editor. Deleting
  a product also deletes its images from Supabase Storage automatically.

---

## 1. One-time Supabase setup

1. Open your project: https://supabase.com/dashboard/project/fdzcgnxmgyyaoxnrvxdg
2. Go to **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and click **Run**.
   This creates the `products`, `admins`, `inquiries`, `inquiry_items`
   tables, all Row Level Security policies, the `product-images` storage
   bucket, and enables Realtime on the relevant tables.
3. Create your admin login:
   **Authentication → Users → Add user** → enter an email + password
   → copy the generated **User UID**.
4. Whitelist that user as an admin — back in **SQL Editor**, run:
   ```sql
   insert into public.admins (user_id) values ('PASTE-USER-UID-HERE');
   ```
5. Done. You (and anyone else you insert this way) can now sign in at
   `/admin/login`.

> Front-panel visitor accounts (used only to track their own inquiries)
> can just sign up themselves on the `/login` page — no manual step needed.

---

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://fdzcgnxmgyyaoxnrvxdg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_65knhSU2PTVflAqXhF_X4g_aKVp9LdO
VITE_WHATSAPP_NUMBER=919876543210
```

`VITE_WHATSAPP_NUMBER` is the shop's WhatsApp number (country code, no `+`,
no spaces) that the **Send to WhatsApp** button opens a chat with.

`.env` is git-ignored — it will **not** be pushed to GitHub. When you
deploy (Vercel/Netlify/etc.) add these same three variables in the host's
"Environment Variables" settings.

---

## 3. Run locally

```bash
npm install
npm run dev
```

Front panel: http://localhost:5173
Admin panel: http://localhost:5173/admin/login

---

## 4. How the "live sync" works

- The front panel and admin panel both subscribe to Supabase Realtime on
  the `products` table (`src/lib/useProducts.js`). Any `INSERT`,
  `UPDATE`, or `DELETE` — whether triggered from this app, another
  browser tab, or directly in the Supabase table editor — is pushed to
  every connected client instantly. No page refresh needed.
- Deleting a product from the admin panel (`src/lib/productActions.js`)
  removes its files from the `product-images` storage bucket **first**,
  then deletes the database row — so nothing is left orphaned in storage.
- Inquiries (`src/pages/admin/AdminInquiries.jsx`) are similarly live —
  new inquiries appear in the admin panel the moment a customer submits
  one, with no refresh.

---

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Vastra Wholesale platform"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env` is already git-ignored, so your Supabase keys won't be committed.
(The publishable anon key is safe to expose in a deployed frontend either
way — that's what Row Level Security in `schema.sql` is for — but keeping
`.env` out of git is still good practice.)

---

## 6. Deploy

Any static host works (Vercel, Netlify, Cloudflare Pages):

1. Import the GitHub repo.
2. Build command: `npm run build` — Output directory: `dist`
3. Add the three environment variables from step 2 in the host's dashboard.
4. Deploy.

---

## Project structure

```
src/
  lib/
    supabaseClient.js     Supabase client (uses VITE_ env vars)
    useProducts.js        Realtime product list hook
    productActions.js     Create/update/delete products + storage images
    inquiryActions.js     Submit inquiries + line items
    whatsapp.js           Builds wa.me deep links (no backend needed)
  contexts/
    AuthContext.jsx       Supabase Auth session + admin-role check
  components/
    ProductCard, BulkBar, InquiryModal, ProductFormModal,
    TopBar, AdminLayout, ProtectedRoute
  pages/
    front/  Home, Login          — public catalog + optional customer login
    admin/  AdminLogin, AdminDashboard, AdminInquiries
supabase/
  schema.sql               Run once in the Supabase SQL Editor
```

## Notes

- Categories are fixed to **Saree** and **Ladies Suit** (a `check`
  constraint in the database). To add more categories later, update the
  constraint in `schema.sql`/the table, and the `CATEGORIES` arrays in
  `TopBar.jsx` and `ProductFormModal.jsx`.
- No Supabase Edge Functions are used anywhere — all reads/writes go
  straight from the browser to Supabase, secured by Row Level Security.

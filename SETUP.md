# Style Of Life — Supabase setup (about 10 minutes)

Your website reads its products, header videos and banner from a Supabase database.
You manage everything from `admin.html` (add, edit, hide, reorder, delete) and you create the
login ID and password yourself in the Supabase **Table Editor**. No Supabase "Authentication" needed.

## 1. Create the database
1. Go to https://supabase.com, sign up (free), click **New project**. Choose a name, a strong database password, and the region nearest your customers.
2. Wait for the project to finish setting up.
3. Left menu: **SQL Editor** -> **New query**.
4. Open `supabase-setup.sql`, copy everything, paste, click **Run**. (Safe to run again.)
   It creates the tables, the security rules, photo storage, the reviews table, and loads your current 30 products, 4 header videos, the 45% banner and your one real Etsy review.

## 2. Create your login in the Table Editor
1. Left menu: **Table Editor** -> open the table **admin_users**.
2. Click **Insert** -> **Insert row** and fill in:
   - **username**: the login ID you want (letters/numbers, e.g. `styleoflife`)
   - **password**: a strong password, 8+ characters (12+ is better)
   - leave everything else as it is, then **Save**.
3. After saving, the password cell shows a long code starting with `$2a$`. That is the secure scrambled version. Your real password is not stored anywhere.

You can do the same to add more admins, or:
- **Change a password**: edit the password cell of that row and type the new password.
- **Block someone**: set `is_active` to false.
- **Forgot your password?** Same thing: edit the cell and type a new one.

Usernames are not case-sensitive. 5 wrong passwords lock that username for 15 minutes.

## 3. Connect the website
1. Left menu: **Project Settings** -> **API** (or **Data API**).
2. Copy the **Project URL** and the **anon public** key.
3. Open `site/js/config.js` and paste them between the quotes:
   ```js
   window.SOL_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi..."
   };
   ```
4. Upload the `site` folder contents to GitHub as before (keep the `js`, `css`, `images`, `data` folders).

The anon key is meant to be public and is safe in this file: visitors with it can only READ visible products.
Never paste the `service_role` key on the website.

## 4. Use the admin
Open `https://YOUR-SITE/admin.html`, enter your username and password.

- **Products** -> *+ Add product*: category, name, SKU, price, old price (shown crossed out), short description, metal, stone, "more details" (one bullet per line), a photo or a YouTube link, and a Visible switch. Every row has up/down arrows, Edit, Hide/Show and Delete.
- **YouTube videos**: choose "YouTube video" and paste any YouTube link (Shorts, youtu.be or a normal link).
- **Header Videos**: the clips that play 7 seconds each at the top of the home page.
- **Reviews**: add real reviews (name, stars, source, text). Reviews typed in by visitors on the website arrive here as *Pending* - press **Approve** to show them, or Delete. Edit / Hide / Delete work on every review. The big rating on the home page is the average of the visible reviews.
- **Banner & Discount**: the red scrolling bar and the "UP TO 45%" badge.

Changes show on the live website straight away. You stay logged in for 12 hours, then log in again.

## Good to know
- **Security, honestly:** this login is custom-built (passwords hashed with bcrypt, 12-hour sessions, 5-try lockout, photo uploads need a one-time ticket that only a logged-in admin can get), but it is not Supabase's own battle-tested Auth. It is a good fit for one shop owner. Use a long, unique password, and don't share the admin page address around.
- Deleting a product does not delete its uploaded photo file (about 100 KB each). To clean up, open **Storage** -> **product-images** in Supabase.
- If Supabase is ever unreachable, the site falls back to `data/products.json`, so customers still see products.
- Free Supabase projects pause after about a week with no activity. If that happens, open the dashboard and click **Restore**.
- Backups: Table Editor -> products -> **Export** (CSV).
- This was tested against a simulated Supabase server running the real database code, not your own project. After setup, add and delete one test product to confirm all is well.

- **Reviews honesty:** only add feedback customers really wrote (copy from Etsy, WhatsApp or Instagram). Invented reviews are illegal in many countries (US FTC rules) and can get your Etsy shop in trouble.
- Review spam protection: max 10 new pending reviews per hour; nothing shows publicly until you approve it.

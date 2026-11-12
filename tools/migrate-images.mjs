// Moves product photos out of GitHub and into Supabase Storage.
//
// Run once, on your computer (needs Node 18 or newer):
//   SOL_USER=yourAdminUsername SOL_PASS=yourAdminPassword node tools/migrate-images.mjs
//
// It reads the Supabase URL and anon key from site/js/config.js, logs in with your admin login,
// uploads every local photo that a product still points to (image_url like "images/ring_oval.jpg"),
// and updates that product to use the new Supabase photo address. Safe to run again.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');
const cfgText = readFileSync(join(root, 'js', 'config.js'), 'utf8');
const URL_ = (process.env.SUPABASE_URL || (cfgText.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1] || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_ANON_KEY || (cfgText.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1] || '';
const USER = process.env.SOL_USER, PASS = process.env.SOL_PASS;
if (!URL_ || !KEY) { console.error('Fill in site/js/config.js first (Supabase URL and anon key).'); process.exit(1); }
if (!USER || !PASS) { console.error('Set SOL_USER and SOL_PASS (your admin login) - see the top of this file.'); process.exit(1); }

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
async function rpc(name, body) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch {}
  if (!r.ok) throw new Error((j && (j.message || j.error)) || `${name} failed (${r.status})`);
  return j;
}
const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const login = await rpc('admin_login', { p_username: USER, p_password: PASS });
if (!login || login.error) { console.error('Login failed:', login && login.error); process.exit(1); }
const token = login.token;
const products = await rpc('admin_list_products', { p_token: token });
const todo = products.filter(p => p.image_url && !/^https?:\/\//i.test(p.image_url));
console.log(`${todo.length} product photo(s) to move.`);

const cache = new Map(); // same file used by two products is uploaded once
let ok = 0, skipped = 0;
for (const p of todo) {
  const file = join(root, p.image_url);
  if (!existsSync(file)) { console.log(`  skip  ${p.name}: ${p.image_url} not found locally`); skipped++; continue; }
  let url = cache.get(file);
  if (!url) {
    const ext = basename(file).split('.').pop().toLowerCase();
    const type = mime[ext];
    if (!type) { console.log(`  skip  ${p.name}: unsupported type .${ext}`); skipped++; continue; }
    const data = readFileSync(file);
    if (data.length > 2 * 1024 * 1024) { console.log(`  skip  ${p.name}: file over 2 MB`); skipped++; continue; }
    const t = await rpc('admin_new_upload', { p_token: token });
    const path = `${t.code}/${Date.now()}-${basename(file).replace(/[^A-Za-z0-9._-]/g, '_')}`;
    const r = await fetch(`${URL_}/storage/v1/object/product-images/${path}`, {
      method: 'POST', headers: { ...H, 'Content-Type': type, 'x-upsert': 'false', 'cache-control': 'max-age=31536000' }, body: data
    });
    if (!r.ok) { console.log(`  FAIL  ${p.name}: upload ${r.status} ${await r.text()}`); skipped++; continue; }
    url = `${URL_}/storage/v1/object/public/product-images/${path}`;
    cache.set(file, url);
  }
  await rpc('admin_save_product', { p_token: token, p: { id: p.id, image_url: url } });
  console.log(`  done  ${p.name}`); ok++;
}
await rpc('admin_logout', { p_token: token }).catch(() => {});
console.log(`Finished: ${ok} moved, ${skipped} skipped.`);

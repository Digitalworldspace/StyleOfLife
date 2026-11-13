// ------------------------------------------------------------------
//  SEO page builder (runs automatically in GitHub Actions on every deploy)
//  Reads the live products from Supabase (falls back to data/products.json),
//  then writes static, crawlable pages that Google can read without JavaScript:
//    - category pages   (/lab-grown-diamond-rings.html, ...)
//    - one page per product  (/products/<name>-<sku>.html)
//    - sitemap.xml (with product images), products/slugs.json
//  Run locally:  node tools/build-seo.mjs   (from inside the site folder)
// ------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOMAIN = 'https://styleoflife.co';
const ETSY_SHOP = 'https://styleoflifein.etsy.com';
const WA = 'https://wa.me/916352925472';
const TODAY = new Date().toISOString().slice(0, 10);

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const trim = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const num = (s) => { const m = String(s || '').replace(/,/g, '').match(/[0-9]+(\.[0-9]+)?/g); return m ? m.map(parseFloat) : []; };
const ld = (o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';

// ---------- 1. load data ----------
async function loadData() {
  let products = null, images = {};
  try {
    const cfg = read('js/config.js');
    const url = (cfg.match(/SUPABASE_URL:\s*"([^"]*)"/) || [])[1];
    const key = (cfg.match(/SUPABASE_ANON_KEY:\s*"([^"]*)"/) || [])[1];
    if (url && key) {
      const base = url.replace(/\/+$/, '') + '/rest/v1/';
      const h = { apikey: key, Authorization: 'Bearer ' + key };
      const r = await fetch(base + 'products?select=*&is_active=eq.true&order=sort_order.asc', { headers: h });
      if (r.ok) products = (await r.json()).map(norm);
      const ri = await fetch(base + 'site_images?select=key,url', { headers: h });
      if (ri.ok) (await ri.json()).forEach((x) => { images[x.key] = x.url; });
      console.log('Loaded from Supabase:', products ? products.length : 0, 'products');
    }
  } catch (e) { console.log('Supabase not reachable, using data/products.json:', e.message); }
  if (!products || !products.length) { products = JSON.parse(read('data/products.json')); console.log('Using data/products.json:', products.length); }
  return { products, images };
}
function norm(p) {
  return { id: p.id, category: p.category, type: p.type || 'photo', name: p.name, sku: p.sku, price: p.price, oldPrice: p.old_price || p.oldPrice,
    description: p.description, details: p.details, metal: p.metal, stone: p.stone, image: p.image_url || p.image, etsy: p.etsy_url || p.etsy,
    variants: Array.isArray(p.variants) ? p.variants : [], alt: p.alt || p.name };
}

// ---------- 2. category copy (only true facts from the listings) ----------
const COMMON_FAQ_SHIP = ['How long does it take and how is it shipped?', 'Every piece is made to order and usually ready to ship in about 5–8 business days. Delivery is free worldwide with tracking.'];
const CATS = {
  rings: {
    slug: 'lab-grown-diamond-rings', label: 'Lab Grown Diamond Rings', short: 'Rings',
    title: 'Lab Grown Diamond Rings, SGL Certified | Style Of Life',
    desc: 'Shop SGL certified lab grown diamond engagement rings: halo, solitaire, pavé, three row and toi et moi designs in 925 silver, 9K, 14K and 18K gold. Made to order in Surat, India, free worldwide delivery.',
    intro: [
      'Every ring in this collection is made to order in Surat, India, in your choice of 925 sterling silver, 9K, 14K or 18K gold, with yellow, white or rose tones. Our diamond rings are set with SGL certified lab grown diamonds, most in DEF colour and VVS–VS clarity, and each order comes with its own SGL certificate. Selected designs use moissanite, clearly labelled on the ring page.',
      'Browse classic solitaires, halo engagement rings, pavé and split shank bands, three row rings, bow rings and toi et moi designs. Prices shown are starting prices (925 silver); open a ring to see the exact price for every metal.',
      'Please message us your ring size before ordering. Rings are made to order, so there are no returns, exchanges or resizing; you can also send a custom size request when you order.'
    ],
    faq: [
      ['Are your diamond rings certified?', 'Our lab grown diamond rings come with an individual SGL certificate for the diamond in your order. You can verify SGL reports at sgl-labs.com.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold, each in yellow, white or rose tone. Every option is described by its actual metal; tone finishes are never presented as solid gold.'],
      ['Can I get a custom ring size?', 'Yes. Message us your size or measurements on WhatsApp or add a custom size request when you order. Because rings are made to order, they cannot be returned, exchanged or resized.'],
      COMMON_FAQ_SHIP
    ]
  },
  'initial-necklaces': {
    slug: 'diamond-initial-necklaces', label: 'Diamond Initial Necklaces', short: 'Initial Necklaces',
    title: 'Diamond Initial Necklaces, Letter Pendants A–Z | Style Of Life',
    desc: 'Personalized diamond initial necklaces, letters A to Z, in 925 silver, 9K, 14K and 18K gold. Made to order in Surat, India, with free worldwide delivery. A meaningful gift for her.',
    intro: [
      'A diamond initial necklace is a personal piece: one letter for you, a partner, a child or someone you love. Choose any letter from A to Z, made to order in 925 sterling silver, 9K, 14K or 18K gold.',
      'Each pendant is available on a 16 inch close-fit chain or an 18 inch classic-fit chain. Prices shown are starting prices; open a letter to see the price for every metal.',
      'Initial necklaces make a thoughtful gift for birthdays, anniversaries, Christmas and milestones. Every piece ships with tracking, free to most destinations worldwide.'
    ],
    faq: [
      ['What chain lengths are available?', 'A 16 inch close fit or an 18 inch classic fit chain.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold.'],
      ['Can I order a different letter or a custom design?', 'Yes. Message us on WhatsApp for a letter that is not listed, a different chain length or a custom design.'],
      COMMON_FAQ_SHIP
    ]
  },
  necklaces: {
    slug: 'diamond-necklaces', label: 'Diamond Necklaces & Pendants', short: 'Necklaces',
    title: 'Diamond & Moissanite Necklaces, Pendants | Style Of Life',
    desc: 'Lab grown diamond and moissanite bar, heart, bow and tennis necklaces in 925 silver, 9K, 14K and 18K gold. SGL certified, made to order in Surat, India, free worldwide delivery.',
    intro: [
      'Delicate bar necklaces, heart charm pendants, bow pendants and more, set with lab grown diamonds or moissanite and made to order in 925 sterling silver, 9K, 14K or 18K gold.',
      'Each piece shows its stone details on its own page. Prices shown are starting prices; open a necklace to see the price for every metal. For your preferred chain length, message us before you order.'
    ],
    faq: [
      ['Are the stones certified?', 'Lab grown diamond pieces are SGL certified, and the stone details are listed on each necklace page.'],
      ['Can I choose the chain length?', 'Yes. Message us your preferred length on WhatsApp before ordering.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold.'],
      COMMON_FAQ_SHIP
    ]
  },
  earrings: {
    slug: 'diamond-earrings', label: 'Diamond & Moissanite Earrings', short: 'Earrings',
    title: 'Lab Grown Diamond & Moissanite Earrings | Style Of Life',
    desc: 'Lab grown diamond and moissanite stud, cluster and drop earrings in 925 silver, 9K, 14K and 18K gold. SGL certified, made to order in Surat, India, free worldwide delivery.',
    intro: [
      'From butterfly and flower studs to star clusters and drop earrings, every pair is made to order in 925 sterling silver, 9K, 14K or 18K gold, set with lab grown diamonds or moissanite.',
      'Prices shown are starting prices; open a pair to see the price for every metal and the stone details. Every order ships with tracking, free to most destinations worldwide.'
    ],
    faq: [
      ['Are the earrings SGL certified?', 'Lab grown diamond pieces are SGL certified; stone details are listed on each earring page.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold.'],
      COMMON_FAQ_SHIP
    ]
  },
  bracelets: {
    slug: 'diamond-bracelets', label: 'Diamond Tennis & Colorstone Bracelets', short: 'Bracelets',
    title: 'Diamond Tennis & Colorstone Bracelets | Style Of Life',
    desc: 'Lab grown diamond tennis bracelets and colorstone bracelets in 925 silver, 9K, 14K and 18K gold. SGL certified, made to order in Surat, India, free worldwide delivery.',
    intro: [
      'Lab grown diamond tennis bracelets, blue and multicolor colorstone bracelets and diamond-accented designs, all made to order in 925 sterling silver, 9K, 14K or 18K gold.',
      'Prices shown are starting prices; open a bracelet to see the price for every metal and the stone details. Please message us your wrist size before ordering so the fit is right.'
    ],
    faq: [
      ['How do I choose the right size?', 'Message us your wrist size on WhatsApp before ordering and we will confirm the fit.'],
      ['Are the diamonds certified?', 'Lab grown diamond pieces are SGL certified; stone details are listed on each bracelet page.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold.'],
      COMMON_FAQ_SHIP
    ]
  }
};
const CAT_LABEL = { rings: 'Rings', 'initial-necklaces': 'Initial Necklaces', necklaces: 'Necklaces', earrings: 'Earrings', bracelets: 'Bracelets', 'custom-design': 'Custom Design', 'loose-diamonds': 'Loose Diamonds', 'signature-pieces': 'Signature Pieces' };

// ---------- 3. shared page chrome (copied from jewelry.html so edits there carry over) ----------
function chrome() {
  const j = read('jewelry.html');
  const abs = (s) => s.replace(/href="index\.html"/g, 'href="/"').replace(/href="jewelry\.html"/g, 'href="/jewelry.html"').replace(/href="about\.html"/g, 'href="/about.html"')
    .replace(/src="js\//g, 'src="/js/').replace(/href="css\//g, 'href="/css/');
  const header = abs(j.slice(j.indexOf('<header>'), j.indexOf('</header>') + 9));
  const tail = abs(j.slice(j.indexOf('<section class="cta-band"')));
  return { header, tail };
}
const FAV = '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2714%27 fill=%27%2315130F%27/%3E%3Ctext x=%2732%27 y=%2744%27 font-size=%2738%27 text-anchor=%27middle%27 fill=%27%23E7D2A9%27 font-family=%27Georgia,serif%27%3ES%3C/text%3E%3C/svg%3E">';
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=Bodoni+Moda:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">';

function page({ title, desc, urlPath, image, ogType, schema, body, ch }) {
  const url = DOMAIN + urlPath;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#15130F">
<meta property="og:site_name" content="Style Of Life">
<meta property="og:type" content="${ogType || 'website'}">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
${FAV}
${(schema || []).map(ld).join('\n')}
${FONTS}
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
${ch.header}
${body}
${ch.tail}`;
}

// ---------- 4. building blocks ----------
const pSlug = (p) => slugify(p.name).slice(0, 70).replace(/-+$/, '') + (p.sku ? '-' + slugify(p.sku) : '');
const lowPrice = (p) => { const n = [].concat(...(p.variants || []).map((v) => num(v.price)), num(p.price)); return n.length ? Math.min(...n) : null; };
const highPrice = (p) => { const n = [].concat(...(p.variants || []).map((v) => num(v.price)), num(p.price)); return n.length ? Math.max(...n) : null; };
const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bullets = (d) => String(d || '').split(/\r?\n/).map((l) => l.replace(/^[\s\-•*]+/, '').trim()).filter(Boolean);
const breadcrumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: DOMAIN + it[1] })) });
const faqLd = (faq) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((q) => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })) });

function card(p) {
  const lo = lowPrice(p);
  return `<article class="scard">
  <a class="scard-img" href="/products/${p.slug}.html">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.alt || p.name)}" loading="lazy" width="600" height="600">` : '<span class="scard-ph" aria-hidden="true"></span>'}</a>
  <div class="scard-body"><h2><a href="/products/${p.slug}.html">${esc(p.name)}</a></h2>
  ${lo ? `<p class="scard-price">From ${money(lo)}</p>` : ''}
  ${p.metal ? `<p class="scard-meta">${esc(p.metal)}</p>` : ''}
  <a class="card-link" href="/products/${p.slug}.html">View details →</a></div>
</article>`;
}

// ---------- 5. main ----------
const { products: all, images: siteImages } = await loadData();
const ch = chrome();
const items = all.filter((p) => p.type !== 'video' && p.name && lowPrice(p));
const used = new Set();
items.forEach((p) => { let s = pSlug(p), n = 2, b = s; while (used.has(s)) s = b + '-' + n++; used.add(s); p.slug = s; });

fs.rmSync(path.join(ROOT, 'products'), { recursive: true, force: true });
const urls = [['/', 1.0, 'weekly'], ['/jewelry.html', 0.9, 'weekly'], ['/about.html', 0.6, 'monthly']];
const imgMap = {};
const siteOg = siteImages['hero-banner'] || '';

// category pages
const catPages = [];
for (const [key, cfg] of Object.entries(CATS)) {
  const list = items.filter((p) => p.category === key);
  if (list.length < 2) continue;
  catPages.push({ key, cfg, list });
  const faq = cfg.faq;
  const ogImg = (list.find((p) => p.image) || {}).image || siteOg;
  const body = `<section class="section cat-page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/jewelry.html">Jewelry</a> › <span>${esc(cfg.short)}</span></nav>
  <div class="section-head"><h1>${esc(cfg.label)}</h1></div>
  <div class="cat-intro">${cfg.intro.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
  <div class="sgrid">${list.map(card).join('\n')}</div>
  <div class="cat-more">${catNav(key)}</div>
  <div class="cat-faq"><h2>${esc(cfg.short)} questions, answered</h2>${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('')}</div>
</section>`;
  const schema = [breadcrumbLd([['Home', '/'], ['Jewelry', '/jewelry.html'], [cfg.short, '/' + cfg.slug + '.html']]),
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: cfg.label, url: DOMAIN + '/' + cfg.slug + '.html', description: cfg.desc, isPartOf: { '@id': DOMAIN + '/#website' }, about: { '@id': DOMAIN + '/#store' } },
    { '@context': 'https://schema.org', '@type': 'ItemList', name: cfg.label, itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: DOMAIN + '/products/' + p.slug + '.html', name: p.name })) },
    faqLd(faq)];
  write(cfg.slug + '.html', page({ title: cfg.title, desc: cfg.desc, urlPath: '/' + cfg.slug + '.html', image: ogImg, schema, body, ch }));
  urls.push(['/' + cfg.slug + '.html', 0.8, 'weekly']);
}
function catNav(current) {
  return '<h2>Shop other categories</h2><ul>' + Object.entries(CATS).filter(([k]) => k !== current && items.some((p) => p.category === k)).map(([k, c]) => `<li><a href="/${c.slug}.html">${esc(c.label)}</a></li>`).join('') + '<li><a href="/jewelry.html">All jewelry</a></li></ul>';
}

// product pages
for (const p of items) {
  const cat = CATS[p.category];
  const catLabel = cat ? cat.short : (CAT_LABEL[p.category] || 'Jewelry');
  const catUrl = cat ? '/' + cat.slug + '.html' : '/jewelry.html';
  const lo = lowPrice(p), hi = highPrice(p);
  const bl = bullets(p.details);
  const desc = trim((p.description ? p.description.replace(/\.$/, '') + '. ' : '') + `Made to order in 925 silver, 9K, 14K or 18K gold. From ${money(lo)}. Free worldwide delivery.`, 158);
  const title = trim(`${p.name} | ${catLabel} | Style Of Life`, 70);
  const related = items.filter((q) => q.category === p.category && q !== p).slice(0, 4);
  const waText = encodeURIComponent(`Hi Style Of Life, I'm interested in ${p.name}${p.sku ? ' (SKU ' + p.sku + ')' : ''}.`);
  const rows = (p.variants || []).map((v) => `<tr><th scope="row">${esc(v.label)}</th><td>${esc(v.price)}</td></tr>`).join('');
  const body = `<section class="section prod-page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/jewelry.html">Jewelry</a> › <a href="${catUrl}">${esc(catLabel)}</a> › <span>${esc(p.name)}</span></nav>
  <div class="prod-grid">
    <div class="prod-media">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.alt || p.name)}" width="900" height="900">` : '<div class="prod-ph" aria-hidden="true"></div>'}</div>
    <div class="prod-info">
      <h1>${esc(p.name)}</h1>
      ${p.sku ? `<p class="prod-sku">SKU: ${esc(p.sku)}</p>` : ''}
      <p class="prod-price">From ${money(lo)}${hi && hi > lo ? ` <span>– up to ${money(hi)} depending on metal</span>` : ''}</p>
      ${p.description ? `<p class="prod-desc">${esc(p.description)}</p>` : ''}
      ${rows ? `<table class="prod-table"><caption>Price by metal</caption><tbody>${rows}</tbody></table>` : ''}
      ${(p.metal || p.stone) ? `<ul class="prod-specs">${p.metal ? `<li><b>Metal</b> ${esc(p.metal)}</li>` : ''}${p.stone ? `<li><b>Stone</b> ${esc(p.stone)}</li>` : ''}</ul>` : ''}
      ${bl.length ? `<h2>Details</h2><ul class="prod-list">${bl.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
      <div class="prod-cta">
        <a class="btn btn-whatsapp" href="${WA}?text=${waText}" target="_blank" rel="noopener">Order on WhatsApp</a>
        ${p.etsy ? `<a class="btn btn-primary" href="${esc(p.etsy)}" target="_blank" rel="noopener">Buy on Etsy</a>` : ''}
      </div>
      <p class="prod-note">Made to order in Surat, India, and ready to ship in about 5–8 business days. Free delivery worldwide with tracking. Message us for sizing, custom requests or a private quote.</p>
    </div>
  </div>
  ${related.length ? `<div class="prod-related"><h2>More ${esc(catLabel.toLowerCase())}</h2><div class="sgrid">${related.map(card).join('\n')}</div></div>` : ''}
</section>`;
  const offer = { '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: lo.toFixed(2), highPrice: hi.toFixed(2), offerCount: Math.max(1, (p.variants || []).length), availability: 'https://schema.org/InStock', ...(p.etsy ? { url: p.etsy } : {}), seller: { '@id': DOMAIN + '/#store' } };
  const schema = [breadcrumbLd([['Home', '/'], ['Jewelry', '/jewelry.html'], [catLabel, catUrl], [p.name, '/products/' + p.slug + '.html']]),
    { '@context': 'https://schema.org', '@type': 'Product', '@id': DOMAIN + '/products/' + p.slug + '.html#product', name: p.name, ...(p.sku ? { sku: p.sku } : {}), description: p.description || desc, brand: { '@type': 'Brand', name: 'Style Of Life' }, category: catLabel,
      ...(p.metal ? { material: p.metal } : {}), ...(p.image ? { image: [p.image] } : {}), url: DOMAIN + '/products/' + p.slug + '.html', offers: offer }];
  write('products/' + p.slug + '.html', page({ title, desc, urlPath: '/products/' + p.slug + '.html', image: p.image || siteOg, ogType: 'product', schema, body, ch }));
  urls.push(['/products/' + p.slug + '.html', 0.7, 'weekly']);
  if (p.image) imgMap['/products/' + p.slug + '.html'] = { img: p.image, title: p.name };
}
write('products/slugs.json', JSON.stringify(items.map((p) => p.slug)));

// ---------- 6. patch the hand-written pages: category links + og:image ----------
const catLinksHtml = catPages.length ? '<ul class="catlinks">' + catPages.map((c) => `<li><a href="/${c.cfg.slug}.html">${esc(c.cfg.label)}</a></li>`).join('') + '</ul>' : '';
for (const f of ['index.html', 'jewelry.html', 'about.html']) {
  let s = read(f);
  s = s.replace(/<!--CATLINKS-->/g, catLinksHtml);
  if (siteOg && !/property="og:image"/.test(s)) s = s.replace('</head>', `<meta property="og:image" content="${esc(siteOg)}">\n<meta name="twitter:image" content="${esc(siteOg)}">\n</head>`);
  write(f, s);
}

// ---------- 7. sitemap ----------
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  urls.map(([u, pr, f]) => `  <url><loc>${DOMAIN}${u}</loc><lastmod>${TODAY}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority>${imgMap[u] ? `<image:image><image:loc>${esc(imgMap[u].img)}</image:loc><image:title>${esc(imgMap[u].title)}</image:title></image:image>` : ''}</url>`).join('\n') + '\n</urlset>\n');
console.log(`Built ${catPages.length} category pages, ${items.length} product pages, ${urls.length} sitemap URLs`);

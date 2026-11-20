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
import { GUIDES } from './guides-data.mjs';

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
    variants: Array.isArray(p.variants) ? p.variants : [], alt: p.alt || p.name,
    images: Array.isArray(p.images) ? p.images.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)) : [] };
}

// ---------- 2. category copy (only true facts from the listings) ----------
const COMMON_FAQ_SHIP = ['How long does it take and how is it shipped?', 'Every piece is made to order and usually ready to ship in about 5–8 business days. Delivery is free worldwide with tracking.'];
const CATS = {
  rings: {
    slug: 'lab-grown-diamond-rings', label: 'Lab Grown Diamond Rings', short: 'Rings',
    title: 'Lab Grown Diamond Engagement Rings, SGL Certified | Style Of Life',
    desc: 'SGL certified lab grown diamond engagement rings: halo, solitaire, pavé, toi et moi in 925 silver, 9K-18K gold. Made to order in Surat. Free worldwide delivery.',
    intro: [
      'Every ring in this collection is made to order in Surat, India, in your choice of 925 sterling silver, 9K, 14K or 18K gold, with yellow, white or rose tones. Our diamond rings are set with SGL certified lab grown diamonds, most in DEF color and VVS–VS clarity, and each order comes with its own SGL certificate. Selected designs use moissanite, clearly labeled on the ring page.',
      'Browse classic solitaires, halo engagement rings, pavé and split shank bands, three row rings, bow rings and toi et moi designs. Prices shown are starting prices (925 silver); open a ring to see the exact price for every metal.',
      'Please message us your ring size before ordering. Rings are made to order, so there are no returns, exchanges or resizing; you can also send a custom size request when you order.'
    ],
    faq: [
      ['Are your diamond rings certified?', 'Our lab grown diamond rings come with an individual SGL certificate for the diamond in your order. You can verify SGL reports at sgl-labs.com.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold, each in yellow, white or rose tone. Every option is described by its actual metal; tone finishes are never presented as solid gold.'],
      ['Do you have lab grown diamond engagement and proposal rings?', 'Yes. Our four prong solitaires, halo rings and slim pavé band rings are popular as engagement and proposal rings. Each is made to order in Surat in your choice of 925 silver, 9K, 14K or 18K gold, with an SGL certified lab grown diamond. Order early for a proposal date: made to order takes about 5–8 business days plus tracked delivery, and rings cannot be returned or resized.'],
      ['Can I get a custom ring size?', 'Yes. Message us your size or measurements on WhatsApp or add a custom size request when you order. Because rings are made to order, they cannot be returned, exchanged or resized.'],
      COMMON_FAQ_SHIP
    ]
  },
  'initial-necklaces': {
    slug: 'diamond-initial-necklaces', label: 'Diamond Initial Necklaces', short: 'Initial Necklaces',
    title: 'Diamond Initial Necklace, Letter Pendants A–Z | Style Of Life',
    desc: 'Diamond initial necklace with a solid gold or 925 silver letter pendant, A to Z, in 9K, 14K, 18K gold. Made to order in Surat, India. Free worldwide delivery.',
    intro: [
      'A diamond initial necklace is a personal piece: one letter for you, a partner, a child or someone you love. Choose any letter from A to Z, made to order in 925 sterling silver, 9K, 14K or 18K gold.',
      'Each pendant is available on a 16 inch close-fit chain or an 18 inch classic-fit chain. Prices shown are starting prices; open a letter to see the price for every metal.',
      'Initial necklaces make a thoughtful gift for birthdays, anniversaries, Christmas and milestones. Every piece ships with tracking, free to most destinations worldwide.',
      'Christmas gift: order by December 10 so your made-to-order letter necklace can reach you before Christmas.'
    ],
    faq: [
      ['Can I get an initial necklace before Christmas?', 'Order by December 10. Every piece is made to order in about 5–8 business days and ships with free tracked delivery.'],
      ['What chain lengths are available?', 'A 16 inch close fit or an 18 inch classic fit chain.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold.'],
      ['Can I order a different letter or a custom design?', 'Yes. Message us on WhatsApp for a letter that is not listed, a different chain length or a custom design.'],
      COMMON_FAQ_SHIP
    ]
  },
  necklaces: {
    slug: 'diamond-necklaces', label: 'Diamond Necklaces & Pendants', short: 'Necklaces',
    title: 'Diamond & Moissanite Necklaces, Pendants | Style Of Life',
    desc: 'Lab grown diamond and moissanite bar, heart and tennis necklaces in 925 silver, 9K-18K gold. SGL certified, made to order in Surat. Free worldwide delivery.',
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
    title: 'Lab Grown Diamond Stud Earrings, Moissanite | Style Of Life',
    desc: 'Lab grown diamond and moissanite stud, cluster and drop earrings in 925 silver, 9K-18K gold. SGL certified, made to order in Surat. Free worldwide delivery.',
    intro: [
      'From butterfly and flower studs to star clusters and drop earrings, every pair is made to order in 925 sterling silver, 9K, 14K or 18K gold, set with lab grown diamonds or moissanite.',
      'Prices shown are starting prices; open a pair to see the price for every metal and the stone details. Every order ships with tracking, free to most destinations worldwide.'
    ],
    faq: [
      ['Are the earrings SGL certified?', 'Lab grown diamond pieces are SGL certified; stone details are listed on each earring page.'],
      ['Which metals can I choose?', '925 sterling silver, 9K gold, 14K gold and 18K gold.'],
      ['Do you make lab grown diamond stud earrings in gold?', 'Yes. Stud earrings are made to order in 9K, 14K or 18K gold, or in 925 sterling silver, with lab grown diamonds or moissanite. Open any pair to see the price for each metal.'],
      ['Can I return or exchange earrings?', 'Because every pair is made to order just for you, we do not accept returns or exchanges on earrings. You are welcome to message us on WhatsApp at +91 63529 25472 before ordering with any question.'],
      COMMON_FAQ_SHIP
    ]
  },
  bracelets: {
    slug: 'diamond-bracelets', label: 'Diamond Tennis & Colorstone Bracelets', short: 'Bracelets',
    title: 'Diamond Tennis & Colorstone Bracelets | Style Of Life',
    desc: 'Lab grown diamond tennis bracelets and colorstone bracelets in 925 silver, 9K-18K gold. SGL certified, made to order in Surat. Free worldwide delivery.',
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


// Product questions and answers, built only from facts already in the product data and on the site (for search engines and AI assistants)
function productFaq(p, lo, hi) {
  const faq = [];
  const made = [p.metal ? 'Metal: ' + p.metal + '.' : '', p.stone ? 'Stone: ' + p.stone + '.' : ''].filter(Boolean).join(' ');
  if (made) faq.push([`What is the ${p.name} made of?`, made + ' Each option is described by its actual metal.']);
  const vs = (p.variants || []).filter((v) => v.label && v.price).map((v) => `${v.label}: ${v.price}`).join('; ');
  faq.push([`How much does the ${p.name} cost?`, `It starts from ${money(lo)}${hi > lo ? ` and goes up to ${money(hi)} depending on the metal you choose` : ''}.${vs ? ' Price by metal: ' + vs + '.' : ''} Prices are in US dollars.`]);
  if (/SGL/i.test([p.stone, p.details, p.description].join(' '))) faq.push(['Is this piece certified?', 'Yes. This piece is SGL certified, as described in the details on this page. You can verify SGL reports at sgl-labs.com.']);
  faq.push(['How long does it take to make and deliver?', 'It is made to order in Surat, India, and is ready to ship in about 5–8 business days. Delivery is free worldwide with tracking.']);
  if (p.category === 'rings') faq.push(['Can I return, exchange or resize this ring?', 'No. Rings are made to order in your size, so there are no returns, exchanges or resizing. Please message us your ring size before ordering; custom sizes are welcome.']);
  if (['necklaces', 'initial-necklaces', 'earrings', 'bracelets'].includes(p.category)) faq.push([`Can I return or exchange the ${p.name}?`, 'Because each piece is made to order just for you, we do not accept returns or exchanges on necklaces, earrings or bracelets. Every detail is shown on this page, and you are always welcome to message us before ordering with any question or change request.']);
  faq.push(['How do I order?', `Message Style Of Life on WhatsApp at +91 63529 25472${p.etsy ? ', or use the Buy on Etsy button on this page; checkout and payment are handled securely by Etsy' : ''}. You can also ask for sizing help or a custom request before ordering.`]);
  return faq;
}
const SHIPPING_LD = { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
  deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 8, unitCode: 'DAY' } } };

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
  const gal = [p.image, ...(p.images || [])].filter((u, i, a) => u && a.indexOf(u) === i);
  const desc = trim((p.description ? p.description.replace(/\.$/, '') + '. ' : '') + `Made to order in 925 silver, 9K, 14K or 18K gold. From ${money(lo)}. Free worldwide delivery.`, 158);
  const title = trim(`${p.name} | ${catLabel} | Style Of Life`, 70);
  const related = items.filter((q) => q.category === p.category && q !== p).slice(0, 4);
  const waText = encodeURIComponent(`Hi Style Of Life, I'm interested in ${p.name}${p.sku ? ' (SKU ' + p.sku + ')' : ''}.`);
  const pfaq = productFaq(p, lo, hi);
  const rows = (p.variants || []).map((v) => `<tr><th scope="row">${esc(v.label)}</th><td>${esc(v.price)}</td></tr>`).join('');
  const body = `<section class="section prod-page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/jewelry.html">Jewelry</a> › <a href="${catUrl}">${esc(catLabel)}</a> › <span>${esc(p.name)}</span></nav>
  <div class="prod-grid">
    <div class="prod-media">${gal.length ? `<img id="pmain" src="${esc(gal[0])}" alt="${esc(p.alt || p.name)}" width="900" height="900">` : '<div class="prod-ph" aria-hidden="true"></div>'}${gal.length > 1 ? `
      <div class="prod-thumbs">${gal.map((u, i) => `<button type="button" class="pt${i ? '' : ' on'}" data-src="${esc(u)}" aria-label="Show photo ${i + 1} of ${gal.length}"><img src="${esc(u)}" alt="${esc(p.name)}, photo ${i + 1}" width="120" height="120" loading="lazy"></button>`).join('')}</div>
      <script>(function(){var m=document.getElementById('pmain');if(!m)return;var bs=[].slice.call(document.querySelectorAll('.prod-thumbs .pt')),cur=0;function show(i){cur=(i+bs.length)%bs.length;m.src=bs[cur].getAttribute('data-src');bs.forEach(function(x){x.classList.remove('on');});bs[cur].classList.add('on');try{bs[cur].scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}}bs.forEach(function(b,i){b.addEventListener('click',function(){show(i);});});var x0=null,y0=null;m.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});m.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.5){show(dx<0?cur+1:cur-1);}},{passive:true});})();</script>` : ''}</div>
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
  <div class="cat-faq prod-faq"><h2>Questions about this piece, answered</h2>${pfaq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('')}</div>
  ${related.length ? `<div class="prod-related"><h2>More ${esc(catLabel.toLowerCase())}</h2><div class="sgrid">${related.map(card).join('\n')}</div></div>` : ''}
</section>`;
  const offer = { '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: lo.toFixed(2), highPrice: hi.toFixed(2), offerCount: Math.max(1, (p.variants || []).length), availability: 'https://schema.org/InStock', ...(p.etsy ? { url: p.etsy } : {}), seller: { '@id': DOMAIN + '/#store' }, shippingDetails: SHIPPING_LD };
  const schema = [breadcrumbLd([['Home', '/'], ['Jewelry', '/jewelry.html'], [catLabel, catUrl], [p.name, '/products/' + p.slug + '.html']]),
    { '@context': 'https://schema.org', '@type': 'Product', '@id': DOMAIN + '/products/' + p.slug + '.html#product', name: p.name, ...(p.sku ? { sku: p.sku } : {}), description: p.description || desc, brand: { '@type': 'Brand', name: 'Style Of Life' }, category: catLabel,
      ...(p.metal ? { material: p.metal } : {}), ...(gal.length ? { image: gal } : {}), url: DOMAIN + '/products/' + p.slug + '.html', countryOfOrigin: { '@type': 'Country', name: 'India' },
      ...(p.stone ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'Stone', value: p.stone }] } : {}), offers: offer },
    faqLd(pfaq)];
  write('products/' + p.slug + '.html', page({ title, desc, urlPath: '/products/' + p.slug + '.html', image: p.image || siteOg, ogType: 'product', schema, body, ch }));
  urls.push(['/products/' + p.slug + '.html', 0.7, 'weekly']);
  if (gal.length) imgMap['/products/' + p.slug + '.html'] = { imgs: gal, title: p.name };
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

// ---------- 6b. Shipping & returns page (needed for Google Merchant Center; facts confirmed by the owner) ----------
{
  const faq = [
    ['How long does it take to receive my order?', 'Every piece is made to order in Surat, India, and is usually ready to ship in about 5–8 business days. Delivery is free worldwide and every parcel ships with tracking.'],
    ['Do you accept returns or exchanges?', 'Because each piece is made to order just for you, we do not accept returns or exchanges on rings, necklaces, earrings or bracelets. Every detail is shown on the product page, and you are always welcome to message us before ordering with any question or change request.'],
    ['Can a ring be resized?', 'Rings are made to order in your size and cannot be resized later, so please send us your ring size before you order. Custom sizes are welcome.'],
    ['Can I cancel my order?', 'Yes. Cancellation is free within 5 hours of placing your order.'],
    ['How do I order or ask a question?', 'Message Style Of Life on WhatsApp at +91 63529 25472, or order through our Etsy shop, where checkout and payment are handled securely by Etsy.']
  ];
  const body = `<section class="section cat-page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Shipping &amp; Returns</span></nav>
  <div class="section-head"><h1>Shipping &amp; Returns</h1></div>
  <div class="cat-intro">
    <p>Every Style Of Life piece is made to order in Surat, India. That is why we take a little time to make it right, and why we ask you to check the details before you order.</p>
    <p><b>Shipping.</b> Your order is usually ready to ship in about 5–8 business days. Delivery is free worldwide and every parcel ships with tracking.</p>
    <p><b>Returns and exchanges.</b> Because each piece is made to order for you, we do not accept returns or exchanges on rings, necklaces, earrings or bracelets. All details are shown on each product page, and you can message us before ordering with any question or change request.</p>
    <p><b>Ring sizes.</b> Rings are made in your size and cannot be resized, so please send us your ring size before you order.</p>
    <p><b>Cancellations.</b> You can cancel free within 5 hours of placing your order.</p>
  </div>
  <div class="cat-faq"><h2>Shipping and returns questions, answered</h2>${faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('')}</div>
</section>`;
  const desc = 'Made to order in Surat, India. Ships in about 5–8 business days with free tracked worldwide delivery. No returns or exchanges on made-to-order pieces.';
  write('shipping-returns.html', page({ title: 'Shipping & Returns | Style Of Life', desc, urlPath: '/shipping-returns.html', image: siteOg, schema: [breadcrumbLd([['Home', '/'], ['Shipping & Returns', '/shipping-returns.html']]), faqLd(faq)], body, ch }));
  urls.push(['/shipping-returns.html', 0.5, 'monthly']);
}

// ---------- 6c. Privacy page (tools used on the site: GA4, Meta Pixel, Microsoft Clarity) ----------
{
  const body = `<section class="section cat-page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Privacy</span></nav>
  <div class="section-head"><h1>Privacy</h1></div>
  <div class="cat-intro">
    <p>This page explains in plain words what happens to information when you visit styleoflife.co. Last updated ${TODAY}.</p>
    <p><b>What this website does not do.</b> This website has no accounts, no sign-up forms and no checkout. We do not ask for your name, address or payment details here, and we do not sell your information.</p>
    <p><b>Orders.</b> You order through our Etsy shop, where checkout and payment are handled by Etsy under Etsy's own privacy policy. If you message us on WhatsApp, we use what you send only to answer you and to make your order.</p>
    <p><b>Tools we use to understand our visitors.</b></p>
    <ul>
      <li><b>Google Analytics</b> counts visits and shows us which pages are used, what kind of device you have, your approximate location (country and city) and how you found the site.</li>
      <li><b>Meta Pixel</b> (Facebook and Instagram) tells Meta when a page is opened or when someone taps a link to Etsy or WhatsApp, so we can measure and improve our ads.</li>
      <li><b>Microsoft Clarity</b> shows us how visitors scroll and tap on our pages, as heatmaps and anonymous session recordings, so we can fix confusing pages. Clarity hides sensitive text and does not record what you type into other websites.</li>
    </ul>
    <p>These tools use cookies or similar technology and may receive your IP address, browser and device details. Each company handles that data under its own privacy policy.</p>
    <p><b>Your choices.</b> You can block or delete cookies in your browser settings, use a tracking blocker, install the Google Analytics opt-out browser add-on, or change your ad settings in your Facebook and Instagram accounts. The site works the same without these tools.</p>
    <p><b>Questions.</b> Message Style Of Life on WhatsApp at +91 63529 25472 or through our Etsy shop.</p>
  </div>
</section>`;
  const desc = 'How styleoflife.co uses Google Analytics, Meta Pixel and Microsoft Clarity, what we do not collect, and how to opt out.';
  write('privacy.html', page({ title: 'Privacy | Style Of Life', desc, urlPath: '/privacy.html', image: siteOg, schema: [breadcrumbLd([['Home', '/'], ['Privacy', '/privacy.html']])], body, ch }));
  urls.push(['/privacy.html', 0.3, 'yearly']);
}

// ---------- 6c. Buyer guides (/guides/) for search engines and AI assistants ----------
{
  const guidePages = [];
  for (const g of GUIDES) {
    const body = `<section class="section cat-page guide-page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/guides/">Guides</a> › <span>${esc(g.short)}</span></nav>
  <div class="section-head"><h1>${esc(g.h1)}</h1></div>
  <div class="guide-body">
    <p class="guide-answer"><b>${esc(g.answer)}</b></p>
    ${g.sections.map((x) => `<h2>${esc(x[0])}</h2>\n    ${x[1]}`).join('\n    ')}
  </div>
  <div class="cat-faq"><h2>Quick answers</h2>${g.faq.map((q) => `<details><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('')}</div>
  <div class="cat-more">${catNav('')}</div>
</section>`;
    const article = { '@context': 'https://schema.org', '@type': 'Article', headline: g.h1, description: g.desc, datePublished: g.published, dateModified: TODAY, mainEntityOfPage: DOMAIN + '/guides/' + g.slug + '.html', author: { '@type': 'Organization', name: 'Style Of Life', url: DOMAIN + '/' }, publisher: { '@type': 'Organization', name: 'Style Of Life', url: DOMAIN + '/' } };
    write('guides/' + g.slug + '.html', page({ title: g.title, desc: g.desc, urlPath: '/guides/' + g.slug + '.html', image: siteOg, ogType: 'article', schema: [breadcrumbLd([['Home', '/'], ['Guides', '/guides/'], [g.short, '/guides/' + g.slug + '.html']]), article, faqLd(g.faq)], body, ch }));
    urls.push(['/guides/' + g.slug + '.html', 0.6, 'monthly']);
    guidePages.push(g);
  }
  const idx = `<section class="section cat-page guide-page">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>Guides</span></nav>
  <div class="section-head"><h1>Jewelry Buyer Guides</h1></div>
  <div class="cat-intro"><p>Short, plain-language answers to common questions about lab grown diamond, moissanite and gold or silver jewelry, from Style Of Life in Surat, India.</p></div>
  <div class="guide-body"><ul class="guide-list">${guidePages.map((g) => `<li><a href="/guides/${g.slug}.html">${esc(g.short)}</a><br><span>${esc(g.teaser)}</span></li>`).join('')}</ul></div>
  <div class="cat-more">${catNav('')}</div>
</section>`;
  const idesc = 'Buyer guides from Style Of Life: lab grown diamond vs moissanite and more, explained in plain language by a made-to-order jewelry brand in Surat, India.';
  write('guides/index.html', page({ title: 'Jewelry Buyer Guides | Style Of Life', desc: idesc, urlPath: '/guides/', image: siteOg, schema: [breadcrumbLd([['Home', '/'], ['Guides', '/guides/']])], body: idx, ch }));
  urls.push(['/guides/', 0.6, 'weekly']);
}

// ---------- 7. sitemap ----------
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  urls.map(([u, pr, f]) => `  <url><loc>${DOMAIN}${u}</loc><lastmod>${TODAY}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority>${imgMap[u] ? (imgMap[u].imgs || [imgMap[u].img]).map((im) => `<image:image><image:loc>${esc(im)}</image:loc><image:title>${esc(imgMap[u].title)}</image:title></image:image>`).join('') : ''}</url>`).join('\n') + '\n</urlset>\n');

// ---------- 7b. Google Merchant Center product feed (google-feed.xml) ----------
//  Prices come straight from the product data (lowest price across metals, same as the "From $" on each page); nothing is changed here.
//  Every active product with a name, a price and a photo is included automatically (new products appear on the next nightly build). Unknown categories fall back to the general Jewelry category.
const GCAT = { rings: 'Apparel & Accessories > Jewelry > Rings', 'initial-necklaces': 'Apparel & Accessories > Jewelry > Necklaces', necklaces: 'Apparel & Accessories > Jewelry > Necklaces',
  earrings: 'Apparel & Accessories > Jewelry > Earrings', bracelets: 'Apparel & Accessories > Jewelry > Bracelets', 'signature-pieces': 'Apparel & Accessories > Jewelry' };
const GCAT_DEFAULT = 'Apparel & Accessories > Jewelry';
const feedWords = (s) => String(s || '').replace(/hand-?made/gi, 'made to order');
const feedItems = items.filter((p) => p.image && /^https?:\/\//.test(p.image));
const feedXml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n<title>Style Of Life</title>\n<link>' + DOMAIN + '/</link>\n<description>Lab grown diamond, moissanite and colorstone jewelry, made to order in Surat, India.</description>\n' +
  feedItems.map((p) => {
    const lo = lowPrice(p);
    const desc = trim(feedWords([p.description, p.metal ? 'Metal: ' + p.metal + '.' : '', p.stone ? 'Stone: ' + p.stone + '.' : '', 'Made to order in Surat, India.'].filter(Boolean).join(' ')), 4900);
    return `<item>
<g:id>${esc(p.sku || p.slug)}</g:id>
<g:title>${esc(trim(feedWords(p.name), 150))}</g:title>
<g:description>${esc(desc)}</g:description>
<g:link>${DOMAIN}/products/${p.slug}.html</g:link>
<g:image_link>${esc(p.image)}</g:image_link>
${(p.images || []).filter((u) => u !== p.image).slice(0, 10).map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('\n')}
<g:availability>in_stock</g:availability>
<g:price>${lo.toFixed(2)} USD</g:price>
<g:brand>Style Of Life</g:brand>
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
<g:age_group>adult</g:age_group>
<g:gender>${/CAD|Loose/i.test(p.name) ? 'unisex' : 'female'}</g:gender>
<g:color>Yellow/White/Rose</g:color>
<g:google_product_category>${esc(GCAT[p.category] || GCAT_DEFAULT)}</g:google_product_category>
<g:product_type>${esc(CAT_LABEL[p.category] || 'Jewelry')}</g:product_type>${p.metal ? `\n<g:material>${esc(trim(p.metal, 200))}</g:material>` : ''}
</item>`;
  }).join('\n') + '\n</channel>\n</rss>\n';
write('google-feed.xml', feedXml);
console.log('Wrote google-feed.xml with', feedItems.length, 'products');

// ---------- 8. llms.txt (plain-text guide to the shop for AI assistants) ----------
const catLine = (c) => `- [${c.cfg.label}](${DOMAIN}/${c.cfg.slug}.html): ${c.list.length} designs, from ${money(Math.min(...c.list.map(lowPrice)))}`;
const prodLine = (p) => `- [${p.name}](${DOMAIN}/products/${p.slug}.html): from ${money(lowPrice(p))}${p.sku ? ', SKU ' + p.sku : ''}${p.stone && p.stone.length < 90 ? ', ' + p.stone : ''}`;
const groups = {};
items.forEach((p) => { const k = (CATS[p.category] ? CATS[p.category].label : (CAT_LABEL[p.category] || 'Jewelry')); (groups[k] = groups[k] || []).push(p); });
write('llms.txt', `# Style Of Life

> Style Of Life is a jewelry brand from Surat, India, founded by Prince Akbari. It makes lab grown diamond, moissanite and colorstone jewelry to order in 925 sterling silver, 9K, 14K and 18K gold, and ships worldwide with tracking.

## Key facts
- What it sells: engagement rings, wedding bands, initial necklaces (letters A to Z), necklaces and pendants, earrings, tennis and colorstone bracelets, and a custom CAD design service.
- Stones: lab grown diamonds, moissanite and colorstones. The stone used in each piece is stated on its product page. Lab grown diamond pieces are SGL certified.
- Metals: 925 sterling silver, 9K gold, 14K gold and 18K gold. Many designs are offered in yellow, white or rose tone.
- Production: every piece is made to order in Surat, India, and is usually ready to ship in about 5–8 business days.
- Shipping: free worldwide delivery with tracking.
- Rings: made to order in the buyer's size, so there are no returns, exchanges or resizing. Buyers should send their ring size before ordering.
- Returns: because every piece is made to order, returns and exchanges are not accepted on rings, necklaces, earrings or bracelets. All details are shown on each product page, and buyers can message the shop before ordering with any question or change request. Cancellation is free within 5 hours of ordering.
- Founded: the shop started in 2025.
- How to order: by WhatsApp (+91 63529 25472) or through the Etsy shop (${ETSY_SHOP}), where checkout and payment are handled by Etsy.
- Prices: shown in US dollars. The price depends on the metal; each product page lists the price for every metal.
- Website: ${DOMAIN}/ (updated ${TODAY})

## Main pages
- [Home](${DOMAIN}/): overview, how ordering works, customer questions
- [All jewelry](${DOMAIN}/jewelry.html): the full collection
- [Our story](${DOMAIN}/about.html): about the founder and how orders are handled
- [Shipping & Returns](${DOMAIN}/shipping-returns.html): delivery time, returns and cancellation policy
- [Privacy](${DOMAIN}/privacy.html): which analytics tools the site uses and how to opt out
- [Buyer guides](${DOMAIN}/guides/): plain-language answers about lab grown diamond, moissanite and jewelry metals
${GUIDES.map((g) => `- [${g.short}](${DOMAIN}/guides/${g.slug}.html): ${g.teaser}`).join('\n')}
${catPages.map(catLine).join('\n')}

## Products
${Object.entries(groups).map(([k, list]) => `### ${k}\n${list.map(prodLine).join('\n')}`).join('\n\n')}

## Contact
- WhatsApp: +91 63529 25472 (${WA})
- Etsy shop: ${ETSY_SHOP}
`);
console.log('Wrote llms.txt');
console.log(`Built ${catPages.length} category pages, ${items.length} product pages, ${urls.length} sitemap URLs`);

// ---------- 9. Google Analytics (GA4) tag on every public page (not admin) ----------
{
  const GA_ID = 'G-HG35DX3D4J';
  const tag = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>\n`;
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
    const rel = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) return ['.git', '.github', 'tools', 'node_modules', 'data'].includes(e.name) ? [] : walk(rel);
    return rel.endsWith('.html') && rel !== 'admin.html' ? [rel] : [];
  });
  let n = 0;
  for (const f of walk('')) {
    const s = read(f);
    if (s.includes('googletagmanager.com/gtag') || !s.includes('</head>')) continue;
    write(f, s.replace('</head>', tag + '</head>'));
    n++;
  }
  console.log(`Added Google Analytics tag to ${n} pages`);
}

// ---------- 10. Meta Pixel on every public page (not admin) ----------
{
  const PIXEL_ID = '29106574775667628';
  const tag = `<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${PIXEL_ID}');\nfbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1"\n/></noscript>\n<!-- End Meta Pixel Code -->\n`;
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
    const rel = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) return ['.git', '.github', 'tools', 'node_modules', 'data'].includes(e.name) ? [] : walk(rel);
    return rel.endsWith('.html') && rel !== 'admin.html' ? [rel] : [];
  });
  let n = 0;
  for (const f of walk('')) {
    const s = read(f);
    if (s.includes('connect.facebook.net/en_US/fbevents.js') || !s.includes('</head>')) continue;
    write(f, s.replace('</head>', tag + '</head>'));
    n++;
  }
  console.log(`Added Meta Pixel to ${n} pages`);
}

// ---------- 11. Microsoft Clarity (heatmaps and session recordings) on every public page (not admin) ----------
{
  const CLARITY_ID = 'zg3wm9phcu';
  const tag = `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");</script>\n`;
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
    const rel = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) return ['.git', '.github', 'tools', 'node_modules', 'data'].includes(e.name) ? [] : walk(rel);
    return rel.endsWith('.html') && rel !== 'admin.html' ? [rel] : [];
  });
  let n = 0;
  for (const f of walk('')) {
    const s = read(f);
    if (s.includes('clarity.ms/tag') || !s.includes('</head>')) continue;
    write(f, s.replace('</head>', tag + '</head>'));
    n++;
  }
  console.log(`Added Microsoft Clarity to ${n} pages`);
}

// ---------- 12. Click and product-view events for GA4 and Meta Pixel (Etsy click, WhatsApp click, product view) ----------
{
  const tag = `<script>(function(){var isP=location.pathname.indexOf('/products/')===0;function ga(n,p){try{if(typeof gtag==='function'){p.transport_type='beacon';gtag('event',n,p);}}catch(e){}}function fb(m,n,p){try{if(typeof fbq==='function'){p?fbq(m,n,p):fbq(m,n);}}catch(e){}}if(isP){ga('view_item',{item_name:document.title});fb('track','ViewContent',{content_name:document.title,content_type:'product'});}document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var h=a.href||'';if(h.indexOf('wa.me')>-1){ga('whatsapp_click',{link_url:h,page_path:location.pathname});fb('track','Contact');}else if(h.indexOf('etsy.com')>-1){ga('etsy_click',{link_url:h,page_path:location.pathname});fb('trackCustom','EtsyClick',{page:location.pathname});}},true);})();</script>\n`;
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
    const rel = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) return ['.git', '.github', 'tools', 'node_modules', 'data'].includes(e.name) ? [] : walk(rel);
    return rel.endsWith('.html') && rel !== 'admin.html' ? [rel] : [];
  });
  let n = 0;
  for (const f of walk('')) {
    const s = read(f);
    if (s.includes("whatsapp_click") || !s.includes('</head>')) continue;
    write(f, s.replace('</head>', tag + '</head>'));
    n++;
  }
  console.log(`Added click and product-view events to ${n} pages`);
}

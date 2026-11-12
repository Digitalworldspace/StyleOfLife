(function(){
  "use strict";
  var WA_NUMBER = "916352925472";
  var ETSY_URL = "https://styleoflifein.etsy.com";
  var CFG = window.SOL_CONFIG || {};
  var HAS_DB = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  var CAT_LABELS = {
    "initial-necklaces": "Initial Necklaces", "necklaces": "Necklaces", "custom-design": "Custom Design", "loose-diamonds": "Loose Diamonds",
    "bracelets": "Bracelets", "rings": "Rings", "earrings": "Earrings", "signature-pieces": "Signature Pieces"
  };
  var CAT_ORDER = ["initial-necklaces", "necklaces", "custom-design", "loose-diamonds", "bracelets", "rings", "earrings", "signature-pieces"];

  function esc(s){
    return String(s==null?"":s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function labelFor(cat){
    if(CAT_LABELS[cat]) return CAT_LABELS[cat];
    return String(cat).replace(/[-_]/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase();});
  }
  function waLink(text){ return "https://wa.me/"+WA_NUMBER+"?text="+encodeURIComponent(text); }

  // ---- data access: Supabase (read-only, anon key) with local JSON as a safety net ----
  function sbGet(path){
    var base = CFG.SUPABASE_URL.replace(/\/+$/, '');
    return fetch(base + '/rest/v1/' + path, {
      headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY }
    }).then(function(r){ if(!r.ok) throw new Error('db ' + r.status); return r.json(); });
  }
  function localJson(file){
    return fetch(file, {cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error('file'); return r.json(); });
  }

  // normalise a database row or an old-style json row into one shape
  function norm(p){
    return {
      id: p.id, category: p.category, type: p.type || 'photo', name: p.name, sku: p.sku,
      price: p.price, oldPrice: p.old_price || p.oldPrice, description: p.description,
      details: p.details, metal: p.metal, stone: p.stone,
      image: p.image_url || p.image, etsy: p.etsy_url || p.etsy, variants: Array.isArray(p.variants) ? p.variants : [], alt: p.alt || p.name, video: p.video_id || p.video
    };
  }

  function specsHtml(p){
    var out = '';
    if(p.metal || p.stone){
      out += '<ul class="card-specs">';
      if(p.metal) out += '<li><span>Metal</span>'+esc(p.metal)+'</li>';
      if(p.stone) out += '<li><span>Stone</span>'+esc(p.stone)+'</li>';
      out += '</ul>';
    }
    if(p.details){
      var lines = String(p.details).split(/\r?\n/).map(function(l){return l.replace(/^[\s\-•*]+/, '').trim();}).filter(Boolean);
      if(lines.length){
        out += '<ul class="card-details">' + lines.map(function(l){return '<li>'+esc(l)+'</li>';}).join('') + '</ul>';
      }
    }
    return out;
  }
  function money(v){
    v = String(v == null ? '' : v).trim();
    return /^[\d.,]+$/.test(v) ? '$' + v : v;
  }
  function priceHtml(p){
    p = Object.assign({}, p, {price: money(p.price), oldPrice: money(p.oldPrice)});
    if(!p.price && !p.oldPrice) return '<div class="price price-ask"><span class="p-from">Price</span><span class="p-amt p-ask">On request</span></div>';
    var m = String(p.price||'').match(/^\s*(from|starting at|starts at)?\s*(.*)$/i);
    var pre = m && m[1] ? m[1] : '', amt = m ? m[2] : String(p.price||'');
    return '<div class="price">' + (p.oldPrice ? '<s class="old-price">'+esc(p.oldPrice)+'</s>' : '') +
      '<span class="p-from">' + esc(pre || 'Price') + '</span><span class="p-amt">' + esc(amt) + '</span><i class="p-rule"></i></div>';
  }
  function variantsHtml(p){
    if(!p.variants || !p.variants.length) return '';
    return '<div class="vars"><span class="vars-l">Metal</span><div class="vars-pills">' + p.variants.map(function(v, i){
      return '<button type="button" class="vp' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" data-price="' + esc(money(v.price)) + '">' + esc(v.label) + '</button>';
    }).join('') + '</div></div>';
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.vp'); if(!b) return;
    var card = b.closest('.card'); if(!card) return;
    var price = card.querySelector('.price'); if(!price) return;
    card.querySelectorAll('.vp').forEach(function(x){ x.classList.toggle('on', x === b); });
    var from = price.querySelector('.p-from'), amt = price.querySelector('.p-amt'), old = price.querySelector('.old-price');
    if(!price.hasAttribute('data-def-amt')){ price.setAttribute('data-def-amt', amt.textContent); price.setAttribute('data-def-from', from.textContent); }
    function fit(){ amt.classList.toggle('long', amt.textContent.length > 12); }
    if(b.getAttribute('data-i') === '0'){ amt.textContent = price.getAttribute('data-def-amt'); from.textContent = price.getAttribute('data-def-from'); if(old) old.style.display = ''; }
    else { amt.textContent = b.getAttribute('data-price'); from.textContent = 'Price'; if(old) old.style.display = 'none'; }
    fit();
  });
  function ctasHtml(p, hasMore){
    var ref = p.name + (p.sku ? ' (' + p.sku + ')' : '') + (p.type==='video' && p.video ? ' - https://youtube.com/shorts/'+p.video : '');
    if(p.type === 'video'){
      var chat = "Hi Style Of Life, I just saw the " + ref + " on your website. I love it! Could you please share the price, sizing and options?";
      return '<div class="card-ctas"><a class="btn btn-whatsapp btn-sm" href="'+waLink(chat)+'" target="_blank" rel="noopener">Chat with us on WhatsApp</a></div>';
    }
    var enquire = "Hi Style Of Life, I'd like to enquire about the " + ref + ".";
    return '<div class="card-ctas">'+
      '<a class="btn btn-whatsapp btn-sm" href="'+waLink(enquire)+'" target="_blank" rel="noopener">Enquire on WhatsApp</a>'+
      (hasMore ? '<button type="button" class="more-btn" aria-expanded="false"><span>View details</span><i aria-hidden="true"></i></button>' : '<a class="card-link" href="'+esc(p.etsy || ETSY_URL)+'" target="_blank" rel="noopener">View on Etsy \u2192</a>')+
      '</div>';
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.more-btn'); if(!b) return;
    var card = b.closest('.card'); if(!card) return;
    var open = !card.classList.contains('open');
    card.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    b.querySelector('span').textContent = open ? 'Hide details' : 'View details';
  });
  function bodyHtml(p){
    var isVid = p.type === 'video';
    if(isVid){
      return '<div class="card-body"><h3>'+esc(p.name)+'</h3>'+(p.sku ? '<div class="sku-line">SKU: '+esc(p.sku)+'</div>' : '')+
        '<p class="card-chat">Love this piece? Tell us what you like, and we will share the price, sizing and options with you personally on WhatsApp.</p>'+ctasHtml(p)+'</div>';
    }
    var more = (p.description ? '<p class="card-blurb">'+esc(p.description)+'</p>' : '') + specsHtml(p) +
      '<a class="card-link more-etsy" href="'+esc(p.etsy || ETSY_URL)+'" target="_blank" rel="noopener">View on Etsy \u2192</a>';
    return '<div class="card-body"><h3>'+esc(p.name)+'</h3>'+
      (p.sku ? '<div class="sku-line">SKU: '+esc(p.sku)+'</div>' : '')+
      priceHtml(p)+variantsHtml(p)+ctasHtml(p, true)+
      '<div class="card-more"><div class="card-more-in">'+more+'</div></div></div>';
  }
  function slotHtml(p){
    return '<div class="slot">' + (p.image ? '<img src="'+esc(p.image)+'" alt="'+esc(p.alt)+'" loading="lazy">' : '') + '</div>';
  }
  function photoCard(p){
    return '<div class="card"><div class="card-art card-art-photo">'+slotHtml(p)+'</div>'+bodyHtml(p)+'</div>';
  }
  function videoCard(p){
    return '<div class="card"><div class="vwrap"><iframe data-yt="'+esc(p.video)+'" title="'+esc(p.name)+'" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>'+bodyHtml(p)+'</div>';
  }

  function renderCatalog(products){
    var container = document.getElementById('product-catalog');
    if(!container) return;
    if(!products || !products.length){
      container.innerHTML = '<p class="catalog-loading reveal is-visible">New pieces are on their way — message us on WhatsApp for the latest collection.</p>';
      return;
    }
    ALL = products; ACTIVE = 'all'; QUERY = '';
    buildTools();
    drawCatalog();
  }

  var ALL = [], ACTIVE = 'all', QUERY = '';

  function catList(){
    var byCat = {}, order = [];
    ALL.forEach(function(p){ byCat[p.category] = (byCat[p.category] || 0) + 1; });
    CAT_ORDER.forEach(function(c){ if(byCat[c]) order.push(c); });
    Object.keys(byCat).forEach(function(c){ if(order.indexOf(c) === -1) order.push(c); });
    return order.map(function(c){ return {key:c, n:byCat[c]}; });
  }

  function buildTools(){
    var box = document.getElementById('catalog-tools');
    if(!box) return;
    var chips = '<button type="button" class="chip is-on" data-cat="all">All <span>'+ALL.length+'</span></button>';
    catList().forEach(function(c){ chips += '<button type="button" class="chip" data-cat="'+esc(c.key)+'">'+esc(labelFor(c.key))+' <span>'+c.n+'</span></button>'; });
    box.innerHTML =
      '<label class="search-box"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'+
      '<input type="search" id="catalog-search" placeholder="Search bracelet, necklace, ring\u2026" autocomplete="off" aria-label="Search jewelry"></label>'+
      '<div class="chips" role="tablist" aria-label="Jewelry categories">'+chips+'</div>';
    var inp = box.querySelector('#catalog-search');
    inp.addEventListener('input', function(){ QUERY = inp.value.trim().toLowerCase(); drawCatalog(); });
    box.querySelector('.chips').addEventListener('click', function(e){
      var b = e.target.closest('.chip'); if(!b) return;
      ACTIVE = b.getAttribute('data-cat');
      Array.prototype.forEach.call(box.querySelectorAll('.chip'), function(x){ x.classList.toggle('is-on', x === b); });
      drawCatalog();
    });
  }

  function matches(p){
    if(!QUERY) return true;
    var hay = [p.name, p.sku, p.metal, p.stone, p.description, p.details, labelFor(p.category)].join(' ').toLowerCase();
    return QUERY.split(/\s+/).every(function(w){ return hay.indexOf(w) !== -1; });
  }

  function drawCatalog(){
    var container = document.getElementById('product-catalog');
    var byCat = {};
    ALL.forEach(function(p){
      if(ACTIVE !== 'all' && p.category !== ACTIVE) return;
      if(!matches(p)) return;
      (byCat[p.category] = byCat[p.category] || []).push(p);
    });
    var order = catList().map(function(c){ return c.key; }).filter(function(c){ return byCat[c]; });
    var html = '';
    order.forEach(function(cat){
      var items = byCat[cat];
      var hasVideo = items.some(function(p){ return p.type === 'video'; });
      html += '<div class="cat-head reveal" id="'+esc(cat)+'">'+esc(labelFor(cat))+'</div>\n';
      html += '<div class="'+(hasVideo ? 'grid-4v' : 'grid4')+' reveal-stagger" style="margin-bottom:56px;">\n';
      items.forEach(function(p){ html += (p.type === 'video' ? videoCard(p) : photoCard(p)) + '\n'; });
      html += '</div>\n';
    });
    if(!order.length){
      html = '<p class="catalog-loading reveal is-visible">No pieces match your search. Message us on <a href="'+waLink('Hi Style Of Life, I am looking for: '+(QUERY||'a custom piece'))+'" target="_blank" rel="noopener">WhatsApp</a> and we will make it for you.</p>';
    }
    container.removeAttribute('data-loading');
    container.innerHTML = html;
    if(window.SOL_initReveal) window.SOL_initReveal();
    if(window.SOL_initVideoAutoplay) window.SOL_initVideoAutoplay();
  }

  function loadCatalog(){
    if(!document.getElementById('product-catalog')) return;
    var get = HAS_DB
      ? sbGet('products?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc')
          .catch(function(){ return localJson('data/products.json'); })
      : localJson('data/products.json');
    get.then(function(rows){ renderCatalog(rows.map(norm)); })
       .catch(function(){
         document.getElementById('product-catalog').innerHTML =
           '<p class="catalog-loading reveal is-visible">We could not load the collection right now — please message us on WhatsApp, or refresh the page.</p>';
       });
  }

  // ---- promo banner + badge ----
  function applyBanner(b){
    if(!b) return;
    var bar = document.querySelector('.promo-bar');
    if(bar){
      if(b.promoEnabled === false){ bar.style.display = 'none'; }
      else {
        bar.querySelectorAll('.promo-track span').forEach(function(sp, i){
          var slot = i % 4;
          if(slot === 0 || slot === 2) sp.textContent = '✦ ' + b.promoText + ' ✦';
          else if(slot === 1) sp.textContent = b.promoSubText1;
          else sp.textContent = b.promoSubText2;
        });
      }
    }
    var badge = document.querySelector('.discount-badge');
    if(badge){
      if(b.badgeEnabled === false){ badge.style.display = 'none'; }
      else {
        var span = badge.querySelector('span'), small = badge.querySelector('small');
        if(span) span.textContent = b.badgeText;
        if(small) small.textContent = b.badgeSubText;
      }
    }
  }
  function loadBanner(){
    if(!document.querySelector('.promo-bar') && !document.querySelector('.discount-badge')) return;
    var get = HAS_DB
      ? sbGet('site_settings?select=value&key=eq.promo').then(function(r){ if(!r.length) throw new Error('none'); return r[0].value; })
          .catch(function(){ return localJson('data/banners.json'); })
      : localJson('data/banners.json');
    get.then(applyBanner).catch(function(){ /* keep the markup already in the page */ });
  }

  // ---- site photos (logo, side-by-side sections, about photo) come from Supabase; nothing is stored in GitHub ----
  function applySlots(rows){
    var map = {};
    (rows || []).forEach(function(x){ if(x && x.url) map[x.key] = x; });
    document.querySelectorAll('[data-slot]').forEach(function(el){
      var x = map[el.getAttribute('data-slot')];
      if(!x || el.querySelector('img')) return;
      var im = document.createElement('img');
      im.alt = x.alt || el.getAttribute('data-alt') || ''; im.src = x.url; im.decoding = 'async';
      el.appendChild(im); el.classList.add('has');
    });
    if(map.logo){
      document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(function(l){ l.remove(); });
      ['icon','apple-touch-icon'].forEach(function(rel){ var l = document.createElement('link'); l.rel = rel; l.href = map.logo.url; document.head.appendChild(l); });
    }
  }
  function loadSlots(){
    if(!document.querySelector('[data-slot]') || !HAS_DB) return;
    sbGet('site_images?select=*').then(applySlots).catch(function(){});
  }

  // ---- trending carousel ----
  function loadTrending(){
    var track = document.getElementById('trTrack');
    if(!track) return;
    var get = HAS_DB
      ? sbGet('products?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc').catch(function(){ return localJson('data/products.json'); })
      : localJson('data/products.json');
    get.then(function(rows){
      var items = rows.map(norm).filter(function(p){ return p.type !== 'video'; }).slice(0, 14);
      if(!items.length){ track.innerHTML = '<p class="catalog-loading">New pieces are on their way. Message us on WhatsApp for the latest collection.</p>'; return; }
      track.innerHTML = items.map(function(p){
        var m = String(p.price||'').match(/^\s*(from|starting at|starts at)?\s*(.*)$/i), amt = m ? m[2] : p.price;
        var enq = "Hi Style Of Life, I'd like to enquire about the " + p.name + (p.sku ? ' (' + p.sku + ')' : '') + '.';
        return '<div class="tr-card">' + '<div class="tr-img">' + (p.oldPrice ? '<span class="tr-badge">SALE</span>' : '') + slotHtml(p) + '</div>' +
          '<div class="tr-body"><div class="tr-name" title="'+esc(p.name)+'">'+esc(p.name)+'</div>' +
          '<div class="tr-price">' + (amt ? (p.oldPrice ? '<s>'+esc(p.oldPrice)+'</s>' : '') + '<small>From</small>' + esc(amt) : '<small>Price on request</small>') + '</div>' +
          '<a class="btn btn-whatsapp btn-sm" href="'+waLink(enq)+'" target="_blank" rel="noopener">Enquire on WhatsApp</a></div></div>';
      }).join('');
      initCarousel(track);
    }).catch(function(){ track.innerHTML = ''; });
  }
  function initCarousel(track){
    var wrap = track.parentNode, prev = wrap.querySelector('.tr-prev'), next = wrap.querySelector('.tr-next'), timer = null;
    function step(dir){
      var card = track.querySelector('.tr-card'); if(!card) return;
      var w = card.getBoundingClientRect().width + 20;
      if(dir > 0 && track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) track.scrollTo({left:0});
      else if(dir < 0 && track.scrollLeft <= 4) track.scrollTo({left:track.scrollWidth});
      else track.scrollBy({left:dir * w});
    }
    prev.onclick = function(){ step(-1); }; next.onclick = function(){ step(1); };
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function play(){ if(reduce || timer) return; timer = setInterval(function(){ step(1); }, 4200); }
    function stop(){ clearInterval(timer); timer = null; }
    wrap.addEventListener('mouseenter', stop); wrap.addEventListener('mouseleave', play);
    wrap.addEventListener('touchstart', stop, {passive:true}); wrap.addEventListener('touchend', function(){ setTimeout(play, 6000); }, {passive:true});
    play();
  }

  // ---- reviews ----
  function starStr(n){ n = Math.max(0, Math.min(5, Math.round(n))); return '\u2605'.repeat(n) + '\u2606'.repeat(5 - n); }
  function cardHtml(r){
      return '<article class="rev-card reveal"><div class="rev-stars">' + starStr(r.rating) + '</div>' +
        (r.title ? '<h4>' + esc(r.title) + '</h4>' : '') +
        '<p>&ldquo;' + esc(r.body) + '&rdquo;</p>' +
        '<div class="rev-who"><span><strong>' + esc(r.name) + '</strong>' + (r.location ? ' · ' + esc(r.location) : '') + '</span><span class="src">' + esc(r.source || 'Website') + '</span></div>' +
        (r.proof_url ? '<a class="proof" href="' + esc(r.proof_url) + '" target="_blank" rel="noopener">View source</a>' : '') + '</article>';
    }
  function renderReviews(rows){
    var list = document.getElementById('reviewList');
    if(!list) return;
    if(!rows || !rows.length){ list.innerHTML = ''; return; }
    var sum = rows.reduce(function(t, r){ return t + (Number(r.rating) || 0); }, 0);
    var avg = sum / rows.length;
    var a = document.getElementById('revAvg'), st = document.getElementById('revStars'), c = document.getElementById('revCount');
    if(a) a.textContent = avg.toFixed(1);
    if(st) st.textContent = starStr(avg);
    if(c) c.textContent = 'Average of ' + rows.length + ' review' + (rows.length === 1 ? '' : 's') + ' · Rated 5.0 on Etsy';
    list.innerHTML = rows.map(cardHtml).join('');
    list.classList.remove('rev-marquee'); list.style.removeProperty('--rev-n');
    if(rows.length >= 4 && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
      var cards = rows.map(function(r, i){ return cardHtml(r).replace('class="rev-card reveal', 'class="rev-card reveal'); });
      function track(arr, cls){
        var one = arr.join('');
        return '<div class="rev-row"><div class="rev-track ' + cls + '">' + one + one.replace(/<article class="rev-card reveal/g, '<article aria-hidden="true" class="rev-card reveal') + '</div></div>';
      }
      list.innerHTML = track(cards, 'to-left') + track(cards.slice().reverse(), 'to-right');
      list.classList.add('rev-marquee'); list.style.setProperty('--rev-n', Math.max(rows.length, 5));
    }
    if(window.SOL_initReveal) window.SOL_initReveal();
  }
  function loadReviews(){
    if(!document.getElementById('reviewList')) return;
    var get = HAS_DB
      ? sbGet('reviews?select=*&is_approved=eq.true&order=sort_order.asc,created_at.desc').catch(function(){ return localJson('data/reviews.json'); })
      : localJson('data/reviews.json');
    get.then(renderReviews).catch(function(){});
  }
  function initReviewForm(){
    var f = document.getElementById('revForm');
    if(!f) return;
    var msg = document.getElementById('rf-msg'), btn = document.getElementById('rf-btn');
    function say(t, ok){ msg.textContent = t; msg.className = 'rev-msg ' + (ok ? 'ok' : 'bad'); }
    if(!HAS_DB){ f.style.display = 'none'; return; }
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var rate = f.querySelector('input[name="rf-rate"]:checked');
      var body = {
        p_name: document.getElementById('rf-name').value, p_location: document.getElementById('rf-loc').value,
        p_rating: rate ? parseInt(rate.value, 10) : 5, p_body: document.getElementById('rf-body').value, p_source: document.getElementById('rf-src').value
      };
      btn.disabled = true; say('', true);
      fetch(CFG.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/submit_review', {
        method: 'POST', headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function(r){ return r.json(); }).then(function(r){
        btn.disabled = false;
        if(r && r.ok){ say('Thank you! Your review will appear after we approve it.', true); f.reset(); }
        else say((r && r.error) || 'Could not send your review. Please try again.', false);
      }).catch(function(){ btn.disabled = false; say('Could not send your review. Please try again.', false); });
    });
  }

  loadCatalog();
  loadBanner();
  loadReviews();
  initReviewForm();
  loadSlots();
  loadTrending();
})();

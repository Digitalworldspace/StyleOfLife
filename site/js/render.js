(function(){
  "use strict";
  var WA_NUMBER = "916352925472";
  var ETSY_URL = "https://styleoflifein.etsy.com";
  var CFG = window.SOL_CONFIG || {};
  var HAS_DB = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  var CAT_LABELS = {
    "necklaces": "Necklaces", "bracelets": "Bracelets", "rings": "Rings",
    "earrings": "Earrings", "signature-pieces": "Signature Pieces"
  };
  var CAT_ORDER = ["necklaces", "bracelets", "rings", "earrings", "signature-pieces"];

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
      image: p.image_url || p.image, alt: p.alt || p.name, video: p.video_id || p.video
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
  function priceHtml(p){
    if(!p.price && !p.oldPrice) return '<div class="price price-ask"><span class="p-from">Price</span><span class="p-amt p-ask">On request</span></div>';
    var m = String(p.price||'').match(/^\s*(from|starting at|starts at)?\s*(.*)$/i);
    var pre = m && m[1] ? m[1] : '', amt = m ? m[2] : String(p.price||'');
    return '<div class="price">' + (p.oldPrice ? '<s class="old-price">'+esc(p.oldPrice)+'</s>' : '') +
      '<span class="p-from">' + esc(pre || 'Price') + '</span><span class="p-amt">' + esc(amt) + '</span><i class="p-rule"></i></div>';
  }
  function ctasHtml(p){
    var ref = p.name + (p.sku ? ' (' + p.sku + ')' : '') + (p.type==='video' && p.video ? ' - https://youtube.com/shorts/'+p.video : '');
    var enquire = "Hi Style Of Life, I'd like to enquire about the " + ref + ".";
    return '<div class="card-ctas">'+
      '<a class="btn btn-whatsapp btn-sm" href="'+waLink(enquire)+'" target="_blank" rel="noopener">Enquire on WhatsApp</a>'+
      '<a class="card-link" href="'+ETSY_URL+'" target="_blank" rel="noopener">View on Etsy →</a></div>';
  }
  function bodyHtml(p){
    return '<div class="card-body"><h3>'+esc(p.name)+'</h3>'+
      (p.sku ? '<div class="sku-line">SKU: '+esc(p.sku)+'</div>' : '')+
      priceHtml(p)+
      (p.description ? '<p class="card-blurb">'+esc(p.description)+'</p>' : '')+
      specsHtml(p)+ctasHtml(p)+'</div>';
  }
  function photoCard(p){
    return '<div class="card"><div class="card-art card-art-photo"><img src="'+esc(p.image)+'" alt="'+esc(p.alt)+'" loading="lazy"></div>'+bodyHtml(p)+'</div>';
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
    var byCat = {}, order = [];
    products.forEach(function(p){ (byCat[p.category] = byCat[p.category] || []).push(p); });
    CAT_ORDER.forEach(function(c){ if(byCat[c]) order.push(c); });
    Object.keys(byCat).forEach(function(c){ if(order.indexOf(c) === -1) order.push(c); });

    var html = '';
    order.forEach(function(cat){
      var items = byCat[cat];
      var hasVideo = items.some(function(p){ return p.type === 'video'; });
      html += '<div class="cat-head reveal" id="'+esc(cat)+'">'+esc(labelFor(cat))+'</div>\n';
      html += '<div class="'+(hasVideo ? 'grid-4v' : 'grid4')+' reveal-stagger" style="margin-bottom:56px;">\n';
      items.forEach(function(p){ html += (p.type === 'video' ? videoCard(p) : photoCard(p)) + '\n'; });
      html += '</div>\n';
    });
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

  // ---- header video list ----
  function loadHero(){
    var box = document.querySelector('[data-items]');
    if(!box || !window.SOL_startHero) return;
    var fallback = [];
    try{ fallback = JSON.parse(box.getAttribute('data-items')); }catch(e){}
    if(!HAS_DB){ window.SOL_startHero(fallback); return; }
    sbGet('hero_videos?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc')
      .then(function(rows){
        var items = rows.map(function(r){ return ['y', r.video_id, r.label || 'Diamond Jewelry']; });
        window.SOL_startHero(items.length ? items : fallback);
      })
      .catch(function(){ window.SOL_startHero(fallback); });
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
  loadHero();
  loadBanner();
  loadReviews();
  initReviewForm();
})();

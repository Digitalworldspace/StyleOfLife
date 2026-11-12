// Scroll-driven motion for every page. Loaded last. Respects "reduce motion" (then nothing here runs).
(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce || !('IntersectionObserver' in window)) return;
  var root = document.documentElement;
  root.classList.add('js-anim');

  // ---- entrance animation engine ----
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting) return;
      e.target.classList.add('a-in'); io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  function setA(el, variant, delay){
    if(!el || el.hasAttribute('data-a')) return;
    if(el.closest('.rev-marquee')) return;                 // sliding rows animate themselves
    el.setAttribute('data-a', variant);
    el.style.setProperty('--d', (delay || 0) + 'ms');
    io.observe(el);
  }
  function kids(sel, pattern, step){
    document.querySelectorAll(sel).forEach(function(box){
      Array.prototype.forEach.call(box.children, function(c, i){
        setA(c, pattern[i % pattern.length], Math.min(i, 6) * (step || 90));
      });
    });
  }
  function splitWords(h){
    if(h.getAttribute('data-split') || h.children.length || h.closest('.dsplit') || h.textContent.length > 90) return false;
    var words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map(function(w, i){
      return '<span class="w" aria-hidden="true"><span class="wi" style="--wd:' + (i * 70) + 'ms">' + w + '</span></span>';
    }).join(' ');
    h.setAttribute('data-split', '1');
    return true;
  }

  function scan(){
    // legacy classes from older markup: replace with the new engine
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function(el){
      var stag = el.classList.contains('reveal-stagger');
      el.classList.remove('reveal', 'reveal-stagger', 'is-visible');
      if(stag) return;
      if(el.closest('.rev-marquee')) return;
      var v = el.classList.contains('cat-head') ? 'left' : el.classList.contains('rev-card') ? 'blur' : 'up';
      setA(el, v, 0);
    });
    // big full-width bands expand into place
    document.querySelectorAll('.sec-alt, .services, .cta-band, .marquee-band').forEach(function(el){ setA(el, 'wipe', 0); });
    // grouped items: each group has its own direction pattern
    kids('.steps', ['left', 'up', 'right'], 130);
    kids('.price-grid', ['zoom', 'zoom', 'zoom'], 130);
    kids('.services-in', ['up', 'up', 'up', 'up'], 110);
    kids('.trust-row', ['up'], 80);
    kids('.rev-grid:not(.rev-marquee)', ['blur', 'blur', 'blur'], 110);
    kids('.grid3, .grid4, .grid-4v', ['flip', 'flip', 'flip', 'flip'], 90);
    kids('.faq', ['left', 'right'], 70);
    kids('.contact-grid', ['up'], 90);
    kids('#trTrack', ['flip'], 80);
    kids('.tr-cats', ['up'], 60);
    kids('.hero-ctas', ['up'], 120);
    ['.rev-top', '.rev-form', '.review-summary', '.review-cta', '.about-text', '.tr-wrap'].forEach(function(s){
      document.querySelectorAll(s).forEach(function(el){ setA(el, 'up', 0); });
    });
    // headings: word-by-word rise
    document.querySelectorAll('.sec h2, .sec-in h2, .section-head h2, .cta-band h2, .section h2, h1.page-title').forEach(function(h){
      if(splitWords(h)) setA(h, 'words', 0);
    });
    document.querySelectorAll('.kicker').forEach(function(k){ if(!k.closest('.dsplit')) setA(k, 'kick', 0); });
    document.querySelectorAll('.lead, .section-head p, .gold-rule').forEach(function(p){ if(!p.closest('.dsplit')) setA(p, 'up', 120); });
    // about page photo
    document.querySelectorAll('.split-art-photo').forEach(function(p){ setA(p, 'zoom', 0); });
  }
  window.SOL_initReveal = scan;          // render.js calls this after it adds products / reviews
  scan();

  // ---- 3D tilt on cards (mouse only) ----
  if(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    var TILT = '.card, .tr-card, .price-card, .step, .svc';
    document.addEventListener('pointermove', function(e){
      var el = e.target.closest && e.target.closest(TILT);
      if(!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (((e.clientY - r.top) / r.height - 0.5) * -8).toFixed(2) + 'deg');
    }, { passive: true });
    document.addEventListener('pointerout', function(e){
      var el = e.target.closest && e.target.closest(TILT);
      if(el && !el.contains(e.relatedTarget)){ el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    }, { passive: true });
  }

  // ---- scroll progress bar + scroll-linked effects ----
  var bar = document.createElement('div'); bar.id = 'scrollBar'; document.body.appendChild(bar);
  var hero = document.querySelector('.hero'), heroArt = document.querySelector('.hero-art'), heroTxt = hero && hero.firstElementChild;
  var marq = document.querySelector('.marquee-track'), marqAnim = null;
  var links = Array.prototype.slice.call(document.querySelectorAll('.navlinks a[href^="#"]'));
  var targets = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var lastY = window.scrollY, vel = 0, ticking = false;

  function frame(){
    ticking = false;
    var y = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    bar.style.transform = 'scaleX(' + (y / max).toFixed(4) + ')';
    if(hero && y < window.innerHeight * 1.2){
      var k = Math.min(1, y / 600);
      if(heroArt) heroArt.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0) scale(' + (1 - k * 0.06).toFixed(3) + ')';
      if(heroTxt){ heroTxt.style.transform = 'translate3d(0,' + (y * -0.06).toFixed(1) + 'px,0)'; heroTxt.style.opacity = (1 - k * 0.7).toFixed(3); }
    }
    document.querySelectorAll('[data-par]').forEach(function(el){
      var r = el.getBoundingClientRect(); if(r.bottom < 0 || r.top > window.innerHeight) return;
      el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - window.innerHeight / 2) * -parseFloat(el.dataset.par)).toFixed(1) + 'px,0)';
    });
    // marquee runs faster the faster you scroll
    vel = vel * 0.85 + Math.abs(y - lastY) * 0.15; lastY = y;
    if(marq){
      if(!marqAnim){ var a = marq.getAnimations ? marq.getAnimations() : []; marqAnim = a[0] || null; }
      if(marqAnim) marqAnim.playbackRate = 1 + Math.min(6, vel / 6);
    }
    // highlight the nav link of the section on screen
    var mid = window.innerHeight * 0.4, cur = -1;
    targets.forEach(function(t, i){ if(t){ var r = t.getBoundingClientRect(); if(r.top < mid && r.bottom > mid) cur = i; } });
    links.forEach(function(a, i){ a.classList.toggle('spy', i === cur); });
    if(vel > 0.3) requestTick();
  }
  function requestTick(){ if(!ticking){ ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  document.querySelectorAll('.split-art-photo img, .split-art-photo .slot img').forEach(function(i){ i.setAttribute('data-par', '0.05'); });
  frame();
})();

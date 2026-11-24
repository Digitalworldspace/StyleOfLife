/* Scratch-to-reveal card: shows the real Christmas gift perks. No data is collected or stored on a server.
   1) Bracelet product pages: card under the price (.scratch-slot).
   2) Home page: popup once per visit for visitors who arrive from an ad link (fbclid, gclid or paid utm params). */
(function(){
  'use strict';
  var WA='https://wa.me/916352925472';
  function ev(n,p){ try{ if(typeof gtag==='function'){ p=p||{}; p.transport_type='beacon'; gtag('event',n,p); } }catch(e){} }
  function xmasOpen(){ return new Date() < new Date(2026,11,11); }
  function perks(){
    var li=['Free tracked delivery worldwide','Gift box included','Made to order, ships in about 5–8 business days'];
    if(xmasOpen()) li.push('Order by Dec 10 for Christmas');
    return '<ul>'+li.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>';
  }
  function build(opts){
    var root=document.createElement('div'); root.className='scratch-card';
    root.innerHTML='<div class="sc-under"><b class="sc-title">Your Christmas gift perks</b>'+perks()+
      '<a class="btn btn-whatsapp sc-cta" target="_blank" rel="noopener" href="'+(opts.wa||WA)+'">Order on WhatsApp</a></div>'+
      '<canvas class="sc-foil" aria-hidden="true"></canvas>'+
      '<button type="button" class="sc-reveal">Tap to reveal</button>';
    return root;
  }
  function init(root, onReveal){
    var cv=root.querySelector('.sc-foil'), btn=root.querySelector('.sc-reveal'), done=false;
    var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    function reveal(){ if(done) return; done=true; root.classList.add('revealed'); ev('scratch_reveal'); if(onReveal) onReveal(); }
    btn.addEventListener('click', reveal);
    var probe=null; try{ probe=cv.getContext&&cv.getContext('2d'); }catch(e){}
    if(reduce||!probe){ reveal(); return; }
    var ctx, W, H, last=null, moves=0;
    function paint(){
      var r=root.getBoundingClientRect(); W=cv.width=Math.max(120,Math.round(r.width)); H=cv.height=Math.max(80,Math.round(r.height));
      ctx=cv.getContext('2d');
      var g=ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,'#E7D2A9'); g.addColorStop(.5,'#C9A961'); g.addColorStop(1,'#E9DDBB');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(20,17,13,.78)'; ctx.font='600 '+Math.round(Math.min(W/11,22))+'px Georgia,serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('SCRATCH TO REVEAL', W/2, H/2-10); ctx.font='500 '+Math.round(Math.min(W/20,13))+'px sans-serif'; ctx.fillText('your Christmas gift perks', W/2, H/2+14);
    }
    paint();
    function pos(e){ var r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)*W/r.width, y:(e.clientY-r.top)*H/r.height}; }
    function scratch(e){
      var p=pos(e); ctx.globalCompositeOperation='destination-out'; ctx.lineCap='round'; ctx.lineWidth=34;
      ctx.beginPath(); if(last){ ctx.moveTo(last.x,last.y); } else { ctx.moveTo(p.x,p.y); } ctx.lineTo(p.x+.1,p.y+.1); ctx.stroke(); last=p;
      if(++moves%6===0) check();
    }
    function check(){
      try{
        var d=ctx.getImageData(0,0,W,H).data, c=0, n=0;
        for(var i=3;i<d.length;i+=64){ n++; if(d[i]<20) c++; }
        if(c/n>.42) reveal();
      }catch(e){ reveal(); }
    }
    var down=false;
    cv.addEventListener('pointerdown',function(e){ down=true; last=null; try{cv.setPointerCapture(e.pointerId);}catch(x){} scratch(e); e.preventDefault(); });
    cv.addEventListener('pointermove',function(e){ if(down){ scratch(e); e.preventDefault(); } });
    function up(){ down=false; last=null; check(); }
    cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
    window.addEventListener('resize',function(){ if(!done) paint(); });
  }
  // 1) product page card
  function productCard(){
    var slot=document.querySelector('.scratch-slot'); if(!slot) return;
    var wa=document.querySelector('.prod-cta .btn-whatsapp'); var c=build({wa:wa?wa.getAttribute('href'):WA});
    slot.appendChild(c); init(c);
  }
  // 2) popup for ad visitors on the home page
  function fromAd(){ return /[?&](fbclid|gclid|msclkid)=|[?&]utm_medium=(paid|cpc|ppc|social_paid)|[?&]utm_source=(facebook|fb|ig|instagram|meta)/i.test(location.search); }
  function popup(){
    if(!(location.pathname==='/'||/\/index\.html$/.test(location.pathname))) return;
    if(!fromAd()) return;
    try{ if(sessionStorage.getItem('sol_scratch')) return; sessionStorage.setItem('sol_scratch','1'); }catch(e){}
    setTimeout(function(){
      var ov=document.createElement('div'); ov.className='sc-overlay'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Scratch to reveal your Christmas gift perks');
      ov.innerHTML='<div class="sc-modal"><button type="button" class="sc-x" aria-label="Close">×</button><p class="sc-brand">STYLE OF LIFE</p><h2>Try your luck</h2><p class="sc-sub">Scratch below to reveal your Christmas gift perks</p><div class="sc-host"></div><a class="sc-shop" href="/diamond-bracelets.html">Shop bracelets</a></div>';
      document.body.appendChild(ov);
      var c=build({}); ov.querySelector('.sc-host').appendChild(c); init(c);
      function close(){ if(ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown',key); }
      function key(e){ if(e.key==='Escape') close(); }
      ov.querySelector('.sc-x').addEventListener('click',close);
      ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
      document.addEventListener('keydown',key);
      ev('scratch_popup_shown');
    },1500);
  }
  function go(){ productCard(); popup(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
})();

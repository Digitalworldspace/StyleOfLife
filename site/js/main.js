// ---- Scroll reveal (re-callable: safe to run again after new content is added) ----
window.SOL_initReveal = function(){
  try{
    var els = document.querySelectorAll('.reveal:not([data-reveal-bound]), .reveal-stagger:not([data-reveal-bound])');
    if(!('IntersectionObserver' in window)){
      els.forEach(function(el){ el.classList.add('is-visible'); el.setAttribute('data-reveal-bound','1'); });
      return;
    }
    if(!window.SOL_revealIO){
      window.SOL_revealIO = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            window.SOL_revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    }
    els.forEach(function(el){ el.setAttribute('data-reveal-bound','1'); window.SOL_revealIO.observe(el); });
  }catch(e){
    document.querySelectorAll('.reveal, .reveal-stagger').forEach(function(el){ el.classList.add('is-visible'); });
  }
};

// ---- Video / YouTube autoplay-on-scroll (re-callable for dynamically added cards) ----
window.SOL_initVideoAutoplay = function(){
  function ytSrc(id,ctl){return 'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute=1&loop=1&playlist='+id+'&controls='+ctl+'&playsinline=1&rel=0&modestbranding=1&enablejsapi=1';}
  function cmd(f,fn){try{f.contentWindow.postMessage(JSON.stringify({event:'command',func:fn,args:''}),'*');}catch(e){}}
  function load(el){
    if(el.tagName==='IFRAME'){ if(!el.getAttribute('src')){ el.src=ytSrc(el.dataset.yt, el.dataset.controls||'1'); } }
    else { if(!el.getAttribute('src')){ el.src=el.dataset.src; } el.muted=true; var p=el.play(); if(p&&p.catch){p.catch(function(){});} }
  }
  var els=document.querySelectorAll('iframe[data-yt]:not([data-vid-bound]), video[data-src]:not([data-vid-bound])');
  if(!els.length) return;
  if(!('IntersectionObserver' in window)){ els.forEach(function(el){load(el); el.setAttribute('data-vid-bound','1');}); return; }
  if(!window.SOL_videoIO){
    window.SOL_videoIO=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var el=en.target, on=en.isIntersecting, loaded=!!el.getAttribute('src');
        if(el.tagName==='VIDEO'){ if(on){load(el);} else if(loaded){el.pause();} }
        else if(on){ if(!loaded){load(el);} else {cmd(el,'playVideo');} }
        else if(loaded){ cmd(el,'pauseVideo'); }
      });
    },{threshold:0.35});
  }
  els.forEach(function(el){ el.setAttribute('data-vid-bound','1'); window.SOL_videoIO.observe(el); });
};

// Run both once for whatever is already in the page on load
window.SOL_initReveal();
window.SOL_initVideoAutoplay();

// ---- Hero header video rotator (started by render.js with the list from the database) ----
window.SOL_startHero = function(items){
  var box=document.querySelector('[data-items]'); if(!box || !items || !items.length) return;
  if(box.getAttribute('data-started')) return; box.setAttribute('data-started','1');
  var gap=parseInt(box.dataset.interval||'7000',10), base=box.dataset.base||'';
  var slots=box.querySelectorAll('.hslot'), label=document.getElementById('heroLabel'), cta=document.getElementById('heroCta');
  var cur=0, front=0;
  function ysrc(id){return 'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute=1&loop=1&playlist='+id+'&controls=0&playsinline=1&rel=0&modestbranding=1&enablejsapi=1';}
  function cmd(f,fn,a){try{f.contentWindow.postMessage(JSON.stringify({event:'command',func:fn,args:a||''}),'*');}catch(e){}}
  function load(slot,it){
    var f=slot.querySelector('iframe'), v=slot.querySelector('video');
    if(it[0]==='y'){ v.pause(); v.removeAttribute('src'); v.style.display='none'; f.style.display='block'; f.src=ysrc(it[1]); }
    else { f.src='about:blank'; f.style.display='none'; v.style.display='block'; v.muted=true; v.src=base+it[1]+'.mp4'; }
  }
  function play(slot,it){
    if(it[0]==='y'){ var f=slot.querySelector('iframe'); cmd(f,'seekTo',[0,true]); cmd(f,'playVideo'); }
    else { var v=slot.querySelector('video'); try{v.currentTime=0;}catch(e){} var p=v.play(); if(p&&p.catch){p.catch(function(){});} }
  }
  function stop(slot,it){ if(it[0]==='y'){cmd(slot.querySelector('iframe'),'pauseVideo');} else {slot.querySelector('video').pause();} }
  function caption(it){
    label.textContent=it[2];
    var t="Hi Style Of Life, I saw the "+it[2]+" video on your website and I'd like to enquire"+(it[0]==='y'?": https://youtube.com/shorts/"+it[1]:".");
    cta.href='https://wa.me/916352925472?text='+encodeURIComponent(t);
  }
  load(slots[0],items[0]); play(slots[0],items[0]); caption(items[0]);
  if(items.length < 2) return;
  function cycle(){
    var n=(cur+1)%items.length, back=1-front, it=items[n], oldIt=items[cur];
    setTimeout(function(){ load(slots[back],it); }, Math.max(gap-2500, 500));
    setTimeout(function(){
      play(slots[back],it);
      if(it[0]==='y'){ setTimeout(function(){play(slots[back],it);},500); }
      slots[back].classList.add('on'); slots[front].classList.remove('on'); caption(it);
      var oldSlot=slots[front]; setTimeout(function(){stop(oldSlot,oldIt);},900);
      front=back; cur=n; cycle();
    }, gap);
  }
  cycle();
};

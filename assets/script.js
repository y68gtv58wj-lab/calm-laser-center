/* Calm Laser Center – interactions & booking
   Online booking: set BOOKING_URL (search for it below). */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.getElementById('nav');
  addEventListener('scroll', function(){ nav.classList.toggle('scrolled', scrollY > 30); }, {passive:true});

  // Mobile menu
  document.querySelector('.burger').addEventListener('click', function(){ document.body.classList.toggle('menu-open'); });
  document.querySelectorAll('.mobile-menu a').forEach(function(a){ a.addEventListener('click', function(){ document.body.classList.remove('menu-open'); }); });

  // Reveal on scroll + counters
  function countUp(el){
    var to = +el.dataset.to, start = null, dur = 1800;
    if(reduce){ el.textContent = to.toLocaleString('en-US'); return; }
    function step(t){ if(!start) start = t; var p = Math.min((t-start)/dur,1); var e = 1-Math.pow(1-p,3);
      el.textContent = Math.round(to*e).toLocaleString('en-US'); if(p<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll && en.target.querySelectorAll('.count').forEach(countUp);
      io.unobserve(en.target);
    });
  }, {threshold:.18});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(function(b){
    b.addEventListener('click', function(){
      var item = b.parentElement, open = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('open'); });
      if(!open) item.classList.add('open');
    });
  });


  // Booking widget
  (function(){
    // ── ONLINE BOOKING ─────────────────────────────────────────────
    // Paste the studio's Square Appointments booking-site link here, e.g.
    // 'https://book.squareup.com/appointments/XXXX/location/YYYY/services'.
    // Once set, the section switches to live booking with automatic
    // confirmation emails; while empty, the request calendar below is used.
    var BOOKING_URL = 'https://book.squareup.com/appointments/u3992ur2cgv6sn/location/LBQ51SGRQNPMD';
    if (BOOKING_URL) {
      document.getElementById('liveFlow').hidden = false;
      document.getElementById('requestFlow').hidden = true;
      document.getElementById('liveBtn').href = BOOKING_URL;
      document.getElementById('bookLead').textContent = "Choose your treatment and book your appointment right here.";
      return;
    }
    var TZ='America/Los_Angeles';
    var HOURS={1:[10,18],2:[10,18],3:[10,18],4:[10,18],5:[10,18],6:[10,16]}; // Mon=1 ... Sat=6, Sun closed
    var SLOT=30, LEAD=60; // start times every 30 min; earliest booking 60 min from now
    var state={areas:[],date:null,time:null};
    function laNow(){var f=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      var o={};f.forEach(function(x){o[x.type]=x.value});return {y:+o.year,m:+o.month-1,d:+o.day,min:(+o.hour)*60+(+o.minute)};}
    var now=laNow(), today=new Date(now.y,now.m,now.d);
    var view=new Date(now.y,now.m,1), maxView=new Date(now.y,now.m+2,1);
    var $=function(id){return document.getElementById(id)};
    var monthEl=$('month'),daysEl=$('days'),slotsEl=$('slots'),sumLine=$('sumLine'),sendBtn=$('sendBtn'),summary=$('summary');
    var chips=[].slice.call(document.querySelectorAll('#areas .chip'));
    var fmtLong=function(d){return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})};
    var fmtT=function(m){var h=Math.floor(m/60),mm=m%60,ap=h>=12?'pm':'am',h12=((h+11)%12)+1;return h12+':'+(mm<10?'0':'')+mm+' '+ap};
    var fmtD=function(m){var h=Math.floor(m/60),r=m%60;return (h?h+' h':'')+(h&&r?' ':'')+(r?r+' min':'')};
    function dur(){return state.areas.reduce(function(s,c){return s+(+c.dataset.min)},0)}
    function need(){return dur()||SLOT}
    function open(d){var w=d.getDay();return !!HOURS[w]}
    function renderCal(){
      monthEl.textContent=view.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      $('prev').disabled=view<=new Date(now.y,now.m,1); $('next').disabled=view>=maxView;
      daysEl.innerHTML='';
      var first=(view.getDay()+6)%7, n=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
      for(var i=0;i<first;i++){var e=document.createElement('span');e.className='day empty';daysEl.appendChild(e)}
      for(var d=1;d<=n;d++){(function(d){
        var dt=new Date(view.getFullYear(),view.getMonth(),d), b=document.createElement('button');
        b.type='button'; b.className='day'; b.textContent=d; b.style.animationDelay=(d*12)+'ms';
        var past=dt<today; if(past||!open(dt)||!slotsFor(dt).some(function(s){return s.ok})) b.disabled=true;
        if(+dt===+today) b.classList.add('today');
        if(state.date&&+dt===+state.date) b.classList.add('on');
        b.setAttribute('aria-label',fmtLong(dt));
        b.onclick=function(){state.date=dt;state.time=null;renderCal();renderSlots();update()};
        daysEl.appendChild(b)})(d)}
    }
    // a start time is offered only if the whole appointment ends by closing time
    function slotsFor(dt){var h=HOURS[dt.getDay()],out=[],len=need();if(!h)return out;
      for(var m=h[0]*60;m+len<=h[1]*60;m+=SLOT){var ok=!(+dt===+today&&m<now.min+LEAD);out.push({m:m,ok:ok})}return out}
    function renderSlots(){
      slotsEl.innerHTML='';
      if(!state.date){var p=document.createElement('p');p.className='hint';p.textContent='Select a day to see available times.';slotsEl.appendChild(p);return}
      var t=document.createElement('div');t.className='day-title';t.textContent=fmtLong(state.date);
      var sm=document.createElement('small');sm.textContent=dur()?fmtD(dur())+' appointment':'Choose your areas to see exact end times';t.appendChild(sm);slotsEl.appendChild(t);
      var list=slotsFor(state.date);
      if(!list.length){var q=document.createElement('p');q.className='hint';q.textContent='This appointment is too long for this day. Please pick another day or fewer areas.';slotsEl.appendChild(q);return}
      list.forEach(function(s,i){var b=document.createElement('button');b.type='button';b.className='slot';b.textContent=fmtT(s.m);
        if(dur()){var e=document.createElement('small');e.textContent='until '+fmtT(s.m+dur());b.appendChild(e)}
        b.style.animationDelay=(i*25)+'ms';b.disabled=!s.ok;if(state.time===s.m)b.classList.add('on');
        b.onclick=function(){state.time=s.m;slotsEl.querySelectorAll('.slot').forEach(function(x){x.classList.remove('on')});b.classList.add('on');update()};
        slotsEl.appendChild(b)});
    }
    function areaNames(){return state.areas.map(function(c){return c.dataset.v})}
    function update(){
      $('durLine').innerHTML='Estimated time: <b>'+(dur()?fmtD(dur()):'–')+'</b>';
      var parts=[];if(state.areas.length)parts.push(areaNames().join(' + '));if(state.date)parts.push(fmtLong(state.date));
      if(state.time!=null)parts.push(fmtT(state.time)+(dur()?' – '+fmtT(state.time+dur()):''));
      sumLine.textContent=parts.length?parts.join(' · '):'Choose your areas, a day and a time.';
      var ready=state.areas.length&&state.date&&state.time!=null;
      sendBtn.classList.toggle('disabled',!ready);sendBtn.setAttribute('aria-disabled',!ready);
      if(ready){var name=$('name').value.trim(),email=$('email').value.trim(),note=$('note').value.trim();
        var msg='Hi Calm Laser Center! I would like to book: '+areaNames().join(', ')+' on '+fmtLong(state.date)+', '+fmtT(state.time)+' – '+fmtT(state.time+dur())+' (approx. '+fmtD(dur())+').'+(name?' Name: '+name+'.':'')+(email?' Email: '+email+'.':'')+(note?' Note: '+note:'');
        sendBtn.href='sms:+18188080010?&body='+encodeURIComponent(msg);
        if($('msgText')){$('msgText').textContent=msg;$('msgBox').hidden=false;$('copyBtn').disabled=false;$('copyBtn').textContent='Copy request';}
        summary.classList.remove('ready');void summary.offsetWidth;summary.classList.add('ready');}
      else if($('msgBox')){$('msgBox').hidden=true;$('copyBtn').disabled=true}
    }
    function setOn(c,on){c.classList.toggle('on',on);c.setAttribute('aria-pressed',on)}
    chips.forEach(function(c){c.onclick=function(){
      var on=!c.classList.contains('on');
      if(on){
        chips.forEach(function(x){
          if(x===c||!x.classList.contains('on'))return;
          var clash=c.dataset.solo==='all'||x.dataset.solo==='all'                      // consultation stands alone
            ||c.dataset.solo==='body'||x.dataset.solo==='body'                          // full body covers everything
            ||(c.dataset.group&&c.dataset.group===x.dataset.group);                    // one touch-up length
          if(clash)setOn(x,false)});
      }
      setOn(c,on);
      state.areas=chips.filter(function(x){return x.classList.contains('on')});
      if(state.date&&state.time!=null&&!slotsFor(state.date).some(function(s){return s.ok&&s.m===state.time}))state.time=null;
      renderCal(); renderSlots(); update()}});
    $('prev').onclick=function(){view=new Date(view.getFullYear(),view.getMonth()-1,1);renderCal()};
    $('next').onclick=function(){view=new Date(view.getFullYear(),view.getMonth()+1,1);renderCal()};
    ['name','email','note'].forEach(function(id){$(id).addEventListener('input',function(){if(state.time!=null)update()})});
    renderCal();
  })();

  // If the embedded Square calendar doesn't appear, show the booking button instead of an empty box
  (function(){
    var box=document.getElementById('squareBox'), fb=document.getElementById('sqFallback');
    if(!box||!fb) return;
    setTimeout(function(){ if(!box.querySelector('iframe')){ box.hidden=true; fb.hidden=false; } }, 8000);
  })();

  // Open / closed status (Los Angeles time)
  (function(){
    var el=document.getElementById('openStatus'); if(!el) return;
    var H={1:[10,18],2:[10,18],3:[10,18],4:[10,18],5:[10,18],6:[10,16]};
    var o={}; new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){o[x.type]=x.value});
    var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], d=days.indexOf(o.weekday), m=(+o.hour)*60+(+o.minute), h=H[d];
    function fmt(x){return (x>12?x-12:x)+(x>=12?'pm':'am')}
    var span=el.querySelector('span');
    if(h && m>=h[0]*60 && m<h[1]*60){ el.classList.add('open'); span.textContent='Open now · until '+fmt(h[1]); return; }
    var label;
    if(h && m<h[0]*60){ label='today '+fmt(h[0]); }
    else { var k=1,nd=(d+1)%7; while(!H[nd]){k++;nd=(d+k)%7} label=(k===1?'tomorrow ':days[nd]+' ')+fmt(H[nd][0]); }
    el.classList.add('closed'); span.textContent='Closed · opens '+label;
  })();

  // Pricing (from the studio's price list)
  (function(){
    var P=[
      {k:'face',t:'Face & Neck',r:[
        ['Full face & front of neck','',75,140],['Full face','neck not included',50,65],['Partial face','forehead & neck not included',40,55],
        ['Front or back of neck','',30,60],['Hairline','',25,50],['Lip','',35,45],['Chin','',35,45],['Lip & chin','',35,60],
        ['Cheeks','',30,60],['Sideburns','',20,50],['Between eyebrows','',20,35],['Ears','',20,35],['Nostril','',20,35]]},
      {k:'arms',t:'Arms',r:[
        ['Full arms','',90,120],['Upper arms','shoulders not included',65,75],['Upper arms','shoulders included',85,90],
        ['Lower arms','',65,80],['Underarms','',45,50],['Hands / fingers','',25,25]]},
      {k:'back',t:'Back & Shoulders',r:[
        ['Full back','',120,200],['Upper back','shoulders not included',50,80],['Lower back','',50,80],['Shoulders','',45,50]]},
      {k:'chest',t:'Chest & Abdomen',r:[
        ['Full chest & abdomen','',125,180],['Full chest','',65,100],['Full abdomen','',65,100],['Lower or partial stomach','',45,60],
        ['Partial chest','',45,65],['Chest line or areolas','',35,60],['Tummy line','',25,50]]},
      {k:'bikini',t:'Bikini',r:[
        ['Full bikini','',75,100],['Brazilian','buttocks included',135,155],['Partial bikini','',50,70],['Bikini line','',35,55],['Buttocks','',65,85]]},
      {k:'legs',t:'Legs',r:[
        ['Full legs','',220,240],['Upper legs','knees not included',95,115],['Lower legs, knees & toes','',115,135],['Knees','',45,65],['Feet / toes','',35,55]]},
      {k:'touch',t:'Touch-ups',r:[
        ['15 minutes','',150,170],['30 minutes','',250,270],['45 minutes','',330,350]]},
      {k:'full',t:'Full Body ✦',r:[
        ['Full body','Calm Laser Special',450,500]]}
    ];
    var SPECIAL=[450,500];
    var cats=document.getElementById('cats'),list=document.getElementById('plist'),gender=document.querySelector('.gender');
    if(!cats||!list) return;
    var g=0,cur=P[0].k;
    P.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='cat';b.textContent=c.t;b.dataset.k=c.k;
      b.setAttribute('role','tab');b.onclick=function(){select(c.k)};cats.appendChild(b)});
    function find(k){for(var i=0;i<P.length;i++)if(P[i].k===k)return P[i];return P[0]}
    function select(k){cur=k;cats.querySelectorAll('.cat').forEach(function(b){var on=b.dataset.k===k;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});render(true)}
    function flip(el){el.classList.remove('flip');void el.offsetWidth;el.classList.add('flip')}
    function render(full){
      var c=find(cur);
      if(full){list.innerHTML='';c.r.forEach(function(r,i){
        var li=document.createElement('li');li.style.animationDelay=(i*35)+'ms';
        var pn=document.createElement('span');pn.className='pn';pn.textContent=r[0];
        if(r[1]){var sm=document.createElement('small');sm.textContent=r[1];pn.appendChild(sm)}
        var d=document.createElement('span');d.className='dots';
        var pp=document.createElement('span');pp.className='pp';pp.textContent='$'+r[2+g];
        li.appendChild(pn);li.appendChild(d);li.appendChild(pp);list.appendChild(li)})}
      else{list.querySelectorAll('.pp').forEach(function(el,i){el.textContent='$'+c.r[i][2+g];flip(el)})}
      document.getElementById('spPrice').textContent=SPECIAL[g];
      document.getElementById('spWho').textContent='Price for '+(g?'men':'women');
    }
    gender.querySelectorAll('.g-btn').forEach(function(b){b.onclick=function(){
      g=+b.dataset.g;gender.dataset.g=g;
      gender.querySelectorAll('.g-btn').forEach(function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
      render(false);flip(document.querySelector('.sp-price'))}});
    document.querySelectorAll('[data-cat]').forEach(function(a){a.addEventListener('click',function(){select(a.dataset.cat)})});
    select(cur);
  })();

  // Studio slider: video → photos → video, dots with progress, arrows, swipe
  (function(){
    var root=document.getElementById('studioSlider'); if(!root) return;
    var slides=[].slice.call(root.querySelectorAll('.slide')), wrap=root.querySelector('.sl-dots');
    var IMG_MS=5000, VID_FALLBACK=9000, i=0, t0=performance.now(), hiddenAt=0, visible=true, auto=!reduce;
    function vid(s){return s.querySelector('video')}
    var dots=slides.map(function(s,k){var b=document.createElement('button');b.type='button';b.className='sl-dot';
      b.setAttribute('aria-label','Show slide '+(k+1)+' of '+slides.length);b.appendChild(document.createElement('i'));
      b.onclick=function(){go(k)};wrap.appendChild(b);return b});
    function play(v){if(!v||!auto||!visible)return;var p=v.play();if(p&&p.catch)p.catch(function(){})}
    function go(k){
      var pv=vid(slides[i]); if(pv) pv.pause();
      slides[i].classList.remove('is-active'); dots[i].classList.remove('on'); dots[i].setAttribute('aria-current','false'); dots[i].firstChild.style.transform='';
      i=(k+slides.length)%slides.length;
      slides[i].classList.add('is-active'); dots[i].classList.add('on'); dots[i].setAttribute('aria-current','true');
      t0=performance.now();
      var v=vid(slides[i]); if(v){ if(v.preload==='none') v.preload='auto'; try{v.currentTime=0}catch(e){} play(v); }
      var nv=vid(slides[(i+1)%slides.length]); if(nv&&nv.preload==='none') nv.preload='metadata';
    }
    function tick(now){
      if(visible){
        var v=vid(slides[i]),p;
        if(v&&v.duration&&!v.paused&&!v.ended) p=v.currentTime/v.duration;
        else if(v) p=Math.min((now-t0)/((v.duration||VID_FALLBACK/1000)*1000),1);
        else p=Math.min((now-t0)/IMG_MS,1);
        dots[i].firstChild.style.transform='scaleX('+p+')';
        if(auto&&p>=1) go(i+1);
      }
      requestAnimationFrame(tick);
    }
    root.querySelector('.sl-prev').onclick=function(){go(i-1)};
    root.querySelector('.sl-next').onclick=function(){go(i+1)};
    var sx=null;
    root.addEventListener('pointerdown',function(e){if(e.target.closest('button'))return;sx=e.clientX});
    root.addEventListener('pointerup',function(e){if(sx===null)return;var dx=e.clientX-sx;sx=null;if(Math.abs(dx)>40)go(i+(dx<0?1:-1))});
    root.addEventListener('pointercancel',function(){sx=null});
    new IntersectionObserver(function(en){
      var now=performance.now(), v=vid(slides[i]);
      if(en[0].isIntersecting){ if(!visible){visible=true;t0+=now-hiddenAt;play(v)} }
      else if(visible){ visible=false; hiddenAt=now; if(v) v.pause(); }
    },{threshold:.15}).observe(root);
    go(0);
    if(auto) requestAnimationFrame(tick);
  })();

  if(reduce) return;
  // Cursor glow + orb parallax
  var glow = document.querySelector('.cursor-glow'), orb = document.getElementById('orb');
  var mx = innerWidth/2, my = innerHeight/2, gx = mx, gy = my;
  addEventListener('mousemove', function(e){ mx = e.clientX; my = e.clientY; }, {passive:true});
  (function loop(){
    gx += (mx-gx)*.12; gy += (my-gy)*.12;
    glow.style.left = gx+'px'; glow.style.top = gy+'px';
    var dx = (mx/innerWidth-.5), dy = (my/innerHeight-.5);
    if(orb) orb.style.transform = 'translate('+(dx*-18)+'px,'+(dy*-18)+'px)';
    requestAnimationFrame(loop);
  })();
})();

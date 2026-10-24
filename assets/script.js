/* Calm Laser Center – interactions & booking
   Online booking: set BOOKING_URL (search for it below). */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.getElementById('nav');
  addEventListener('scroll', function(){ nav.classList.toggle('scrolled', scrollY > 30); }, {passive:true});

  // Mobile menu
  document.querySelector('.burger').addEventListener('click', function(){ var m=document.querySelector('.mobile-menu'); if(m) m.style.paddingTop=(nav.getBoundingClientRect().bottom+24)+'px'; document.body.classList.toggle('menu-open'); });
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
    var HOURS={1:[10,18],2:[10,18],3:[10,18],4:[10,18],5:[10,18],6:[10,18]}; // Mon=1 ... Sat=6, Sun closed
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
    var H={1:[10,18],2:[10,18],3:[10,18],4:[10,18],5:[10,18],6:[10,18]};
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

  // Own booking calendar: live Square availability through the booking server
  (function(){
    // ── BOOKING SERVER ─────────────────────────────────────────────
    // Paste the Cloudflare Worker address here, e.g. 'https://calm-booking.yourname.workers.dev'.
    // While empty (or if the server can't be reached) the embedded Square booking is shown instead.
    var API_BASE = 'https://calm-booking.srwyr9jhcn.workers.dev';
    var apiFlow=document.getElementById('apiFlow'), liveFlow=document.getElementById('liveFlow'), done=document.getElementById('bkDone');
    if(!API_BASE||!apiFlow) return;
    API_BASE=API_BASE.replace(/\/$/,'');
    var TZ='America/Los_Angeles', $=function(id){return document.getElementById(id)};
    var lead=$('bookLead');
    function showFallback(){apiFlow.hidden=true;done.hidden=true;if(liveFlow)liveFlow.hidden=false}
    apiFlow.hidden=false; if(liveFlow) liveFlow.hidden=true;
    if(lead) lead.textContent="Choose your treatments, pick an open time and book – it goes straight into our calendar.";

    var S=[], byGender=[[],[]], cats=[], state={g:0,cat:null,sel:[],month:null,day:null,slot:null,avail:null,availKey:'',loading:0};
    function api(path,body){return fetch(API_BASE+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok){var e=new Error(j.message||'Request failed');e.code=j.error;e.status=r.status;throw e}return j})})}
    function norm(s){return String(s).toLowerCase().replace(/&/g,'and').replace(/touch[\s-]*ups?/g,'').replace(/[^a-z0-9]+/g,'')}
    function laYmd(d){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
    function fmtTime(d){return new Intl.DateTimeFormat('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit'}).format(d).toLowerCase().replace(' ',' ')}
    function fmtDay(ymd){var p=ymd.split('-');return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
    function fmtDur(m){var h=Math.floor(m/60),r=m%60;return (h?h+' h':'')+(h&&r?' ':'')+(r?r+' min':'')}
    function money(v){return '$'+(Math.round(v)===v?v:v.toFixed(2))}
    function pad(n){return (n<10?'0':'')+n}
    var todayYmd=laYmd(new Date()), tp=todayYmd.split('-');
    var firstMonth=new Date(+tp[0],+tp[1]-1,1), lastMonth=new Date(+tp[0],+tp[1]+1,1);
    state.month=new Date(firstMonth);

    function classify(){
      var P=window.CALM_PRICE_LIST||[], map={};
      P.forEach(function(c){c.r.forEach(function(r){map[norm(r[0]+(r[1]?' '+r[1]:''))]=c.k; if(!map[norm(r[0])]) map[norm(r[0])]=c.k})});
      var order=P.map(function(c){return {k:c.k,t:c.t.replace(/\s*✦/,'')}});
      var used={};
      S.forEach(function(s){
        var m=s.name.match(/^(.*?)\s*[-–]\s*(women|men)\s*$/i);
        s.base=m?m[1]:s.name; s.g=m?(m[2].toLowerCase()==='women'?0:1):-1;
        var parts=s.base.split(/\s+-\s+/); s.title=parts[0]; s.sub=parts.slice(1).join(' – ');
        s.cat=map[norm(s.base)]||'more'; used[s.cat]=1;
        if(s.g===-1){byGender[0].push(s);byGender[1].push(s)} else byGender[s.g].push(s);
      });
      var rank={},i=0; P.forEach(function(c){c.r.forEach(function(r){var k=norm(r[0]+(r[1]?' '+r[1]:''));if(rank[k]==null)rank[k]=i;i++})});
      function rk(s){var k=norm(s.base);return rank[k]!=null?rank[k]:999}
      [0,1].forEach(function(g){byGender[g].sort(function(x,y){return rk(x)-rk(y)||x.base.localeCompare(y.base)})});
      cats=order.filter(function(c){return used[c.k]}); if(used.more) cats.push({k:'more',t:'More'});
      state.cat=cats.length?cats[0].k:null;
    }
    function renderCats(){
      var el=$('bkCats'); el.innerHTML='';
      cats.forEach(function(c){
        var count=state.sel.filter(function(s){return s.cat===c.k}).length;
        var b=document.createElement('button');b.type='button';b.className='cat'+(c.k===state.cat?' on':'');b.setAttribute('role','tab');b.setAttribute('aria-selected',c.k===state.cat);
        b.textContent=c.t+(count?' · '+count:'');b.onclick=function(){state.cat=c.k;renderCats();renderList()};el.appendChild(b);
      });
    }
    function renderList(){
      var el=$('bkList'); el.innerHTML='';
      byGender[state.g].filter(function(s){return s.cat===state.cat}).forEach(function(s,i){
        var on=state.sel.indexOf(s)>-1;
        var lab=document.createElement('label');lab.className='bk-item'+(on?' on':'');lab.style.animationDelay=(i*30)+'ms';
        var inp=document.createElement('input');inp.type='checkbox';inp.checked=on;
        var box=document.createElement('span');box.className='bk-box';
        var nm=document.createElement('span');nm.className='bk-name';nm.textContent=s.title;
        if(s.sub){var sm=document.createElement('small');sm.textContent=s.sub;nm.appendChild(sm)}
        var meta=document.createElement('span');meta.className='bk-meta';
        var pr=document.createElement('b');pr.textContent=s.price!=null?(s.variablePrice?'from ':'')+money(s.price):'Price at visit';
        meta.appendChild(pr);meta.appendChild(document.createTextNode(s.duration?fmtDur(s.duration):''));
        inp.onchange=function(){toggle(s,inp.checked)};
        lab.appendChild(inp);lab.appendChild(box);lab.appendChild(nm);lab.appendChild(meta);el.appendChild(lab);
      });
    }
    function toggle(s,on){
      var i=state.sel.indexOf(s);
      if(on&&i<0){ if(state.sel.length>=6){showError('You can book up to 6 treatments in one appointment.');renderList();return} state.sel.push(s) }
      if(!on&&i>-1) state.sel.splice(i,1);
      hideError(); afterSelection();
    }
    function afterSelection(){renderCats();renderList();renderPicked();state.slot=null;loadAvailability();update()}
    function totals(){var d=0,p=0,from=false;state.sel.forEach(function(s){d+=s.duration||0;if(s.price!=null)p+=s.price;if(s.variablePrice||s.price==null)from=true});return {d:d,p:p,from:from}}
    function renderPicked(){
      var el=$('bkPicked'); el.innerHTML=''; el.hidden=!state.sel.length; if(!state.sel.length) return;
      state.sel.forEach(function(s){var b=document.createElement('button');b.type='button';b.className='tag-x';b.textContent=s.base;b.setAttribute('aria-label','Remove '+s.base);b.onclick=function(){toggle(s,false)};el.appendChild(b)});
      var t=totals(),tot=document.createElement('span');tot.className='tot';tot.textContent=fmtDur(t.d);
      var b=document.createElement('b');b.textContent=(t.from?'from ':'')+money(t.p);tot.appendChild(b);el.appendChild(tot);
    }
    // gender switch keeps equivalent treatments selected
    var gEl=$('bkGender');
    gEl.querySelectorAll('.g-btn').forEach(function(btn){btn.onclick=function(){
      var g=+btn.dataset.g; if(g===state.g) return; state.g=g; gEl.dataset.g=g;
      gEl.querySelectorAll('.g-btn').forEach(function(x){var on=x===btn;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
      state.sel=state.sel.map(function(s){return s.g===-1?s:byGender[g].filter(function(x){return x.base===s.base})[0]}).filter(Boolean);
      afterSelection();
    }});

    // calendar
    function monthRange(){
      var y=state.month.getFullYear(),m=state.month.getMonth()+1,last=new Date(y,m,0).getDate();
      var from=y+'-'+pad(m)+'-01'; if(from<todayYmd) from=todayYmd;
      return {from:from,to:y+'-'+pad(m)+'-'+pad(last)};
    }
    var timer=null, reqId=0;
    function loadAvailability(){
      clearTimeout(timer);
      if(!state.sel.length){state.avail=null;state.availKey='';renderCal();renderSlots();setCalStatus('Choose your areas to see open days.');return}
      var rg=monthRange(), ids=state.sel.map(function(s){return s.id}), key=ids.join(',')+'|'+rg.from;
      if(key===state.availKey){renderCal();renderSlots();return}
      timer=setTimeout(function(){
        var my=++reqId; $('bkDays').parentNode.classList.add('loading'); setCalStatus('Checking open times…');
        api('/availability',{from:rg.from,to:rg.to,serviceIds:ids}).then(function(j){
          if(my!==reqId) return;
          var by={}; (j.slots||[]).forEach(function(s){var d=laYmd(new Date(s.startAt));(by[d]=by[d]||[]).push(s)});
          state.avail=by; state.availKey=key;
          var n=Object.keys(by).length;
          setCalStatus(n?n+' day'+(n>1?'s':'')+' with open times this month':'No open times this month – try the next month.');
          if(state.day&&!by[state.day]){state.day=null;state.slot=null}
          renderCal();renderSlots();update();
        }).catch(function(e){ if(my!==reqId) return; setCalStatus(''); showError(e.message||'Could not load open times. Please try again.'); })
          .then(function(){ if(my===reqId) $('bkDays').parentNode.classList.remove('loading') });
      },250);
    }
    function setCalStatus(t){$('bkCalStatus').textContent=t}
    function renderCal(){
      var y=state.month.getFullYear(),m=state.month.getMonth();
      $('bkMonth').textContent=state.month.toLocaleDateString('en-US',{month:'long',year:'numeric'});
      $('bkPrev').disabled=state.month<=firstMonth; $('bkNext').disabled=state.month>=lastMonth;
      var el=$('bkDays'); el.innerHTML='';
      var first=(new Date(y,m,1).getDay()+6)%7, n=new Date(y,m+1,0).getDate();
      for(var i=0;i<first;i++){var e=document.createElement('span');e.className='day empty';el.appendChild(e)}
      for(var d=1;d<=n;d++){(function(d){
        var ymd=y+'-'+pad(m+1)+'-'+pad(d), b=document.createElement('button'), has=!!(state.avail&&state.avail[ymd]);
        b.type='button';b.className='day'+(has?' has-slots':'')+(ymd===todayYmd?' today':'')+(ymd===state.day?' on':'');b.textContent=d;b.style.animationDelay=(d*10)+'ms';
        b.disabled=!has; b.setAttribute('aria-label',fmtDay(ymd)+(has?'':' – no open times'));
        b.onclick=function(){state.day=ymd;state.slot=null;hideError();renderCal();renderSlots();update()};
        el.appendChild(b)})(d)}
    }
    $('bkPrev').onclick=function(){state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);state.day=null;state.slot=null;loadAvailability();renderCal();renderSlots();update()};
    $('bkNext').onclick=function(){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);state.day=null;state.slot=null;loadAvailability();renderCal();renderSlots();update()};
    function renderSlots(){
      var el=$('bkSlots'); el.innerHTML='';
      if(!state.sel.length||!state.day){var p=document.createElement('p');p.className='hint';p.textContent=state.sel.length?'Pick a day to see open times.':'Choose your areas and a day to see open times.';el.appendChild(p);return}
      var t=document.createElement('div');t.className='day-title';t.textContent=fmtDay(state.day);
      var sm=document.createElement('small');sm.textContent=fmtDur(totals().d)+' appointment';t.appendChild(sm);el.appendChild(t);
      (state.avail&&state.avail[state.day]||[]).forEach(function(s,i){
        var st=new Date(s.startAt), mins=s.segments.reduce(function(a,x){return a+(x.duration||0)},0);
        var b=document.createElement('button');b.type='button';b.className='slot'+(state.slot===s?' on':'');b.style.animationDelay=(i*25)+'ms';
        b.textContent=fmtTime(st); var u=document.createElement('small');u.textContent='until '+fmtTime(new Date(st.getTime()+mins*60000));b.appendChild(u);
        b.onclick=function(){state.slot=s;el.querySelectorAll('.slot').forEach(function(x){x.classList.remove('on')});b.classList.add('on');hideError();update()};
        el.appendChild(b);
      });
    }
    // details + submit
    var F={first:$('bkFirst'),last:$('bkLast'),email:$('bkEmail'),phone:$('bkPhone'),note:$('bkNote')}, consent=$('bkConsent'), waiver=$('bkWaiver');
    Object.keys(F).forEach(function(k){F[k].addEventListener('input',update)});
    consent.addEventListener('change',update); waiver.addEventListener('change',update);
    function detailsOk(){return state.sel.length&&state.slot&&F.first.value.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(F.email.value.trim())&&F.phone.value.replace(/\D/g,'').length>=10&&consent.checked&&waiver.checked}
    function valid(){return detailsOk()&&!!PAY.method&&(PAY.method!=='card'||!!PAY.card)&&!PAY.busy}

    // ── payment ───────────────────────────────────────────────────
    var PAY={cfg:null,method:null,payments:null,card:null,req:null,apple:null,gpay:null,busy:false};
    var payBtns=[].slice.call(document.querySelectorAll('#bkPayMethods .pay-m'));
    function pct(){var v=PAY.cfg&&+PAY.cfg.depositPercent;return v>=1&&v<=100?v:30}
    function depositOf(total){var c=Math.round(total*100);return Math.max(1,Math.round(c*pct()/100))/100}
    function dep(){var t=totals().p;var d=depositOf(t);return {total:t,deposit:d,balance:Math.round((t-d)*100)/100}}
    function amountStr(){return dep().deposit.toFixed(2)}
    function renderDepInfo(){
      var el=$('bkDepInfo'); if(!el) return;
      if(!state.sel.length){el.hidden=true;return}
      var d=dep(); el.hidden=false; el.innerHTML='';
      function cell(k,v,cls){var c=document.createElement('div');c.className='dep-cell'+(cls?' '+cls:'');var a=document.createElement('span');a.textContent=k;var b=document.createElement('b');b.textContent=v;c.appendChild(a);c.appendChild(b);el.appendChild(c)}
      cell('Total',money(d.total)); cell(pct()>=100?'Due today':'Deposit today ('+pct()+'%)',money(d.deposit),'on'); if(pct()<100) cell('At your visit',money(d.balance));
    }
    function setMethod(m){
      PAY.method=m;
      payBtns.forEach(function(b){var on=b.dataset.m===m;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
      $('bkPayCard').hidden=m!=='card'; $('bkPayManual').hidden=!(m==='zelle'||m==='venmo');
      hideError(); update();
    }
    payBtns.forEach(function(b){b.onclick=function(){setMethod(b.dataset.m)}});
    function manualCfg(m){var c=PAY.cfg&&PAY.cfg.manual||{};return {to:(c[m]&&c[m].to)||'(818) 808-0010',hours:c.hours||2}}
    function syncPay(){
      if(PAY.method==='zelle'||PAY.method==='venmo'){
        var mc=manualCfg(PAY.method), box=$('bkPayManual');
        box.querySelector('.js-amt').textContent=state.sel.length?money(dep().deposit)+' deposit':'the deposit';
        box.querySelector('.js-m').textContent=PAY.method==='zelle'?'Zelle':'Venmo';
        box.querySelector('.js-to').textContent=mc.to;
        box.querySelector('.js-h').textContent=mc.hours+(mc.hours===1?' hour':' hours');
      }
      if(PAY.req&&state.sel.length){try{PAY.req.update({total:{amount:amountStr(),label:'Calm Laser Center'}})}catch(e){}}
      var w=document.querySelector('#bkPayCard .wallets'); if(w) w.classList.toggle('off',!detailsOk());
    }
    function loadScript(src){return new Promise(function(res,rej){var sc=document.createElement('script');sc.src=src;sc.onload=res;sc.onerror=rej;document.head.appendChild(sc)})}
    function initCard(c){
      var src=c.sandbox?'https://sandbox.web.squarecdn.com/v1/square.js':'https://web.squarecdn.com/v1/square.js';
      return loadScript(src).then(function(){
        if(!window.Square) throw new Error('no sdk');
        PAY.payments=window.Square.payments(c.appId,c.locationId);
        var style={'.input-container':{borderColor:'#E3D5BC',borderRadius:'14px'},'.input-container.is-focus':{borderColor:'#B8935A'},'.input-container.is-error':{borderColor:'#A4473A'},'input':{color:'#231E17'},'input::placeholder':{color:'#A39886'},'.message-text':{color:'#7A7064'},'.message-icon':{color:'#7A7064'}};
        return PAY.payments.card({style:style}).catch(function(){return PAY.payments.card()});
      }).then(function(card){return card.attach('#bkCard').then(function(){PAY.card=card})}).then(function(){
        var cardBtn=payBtns.filter(function(b){return b.dataset.m==='card'})[0]; cardBtn.hidden=false;
        if(!PAY.method||PAY.method!=='card') setMethod('card');
        try{PAY.req=PAY.payments.paymentRequest({countryCode:'US',currencyCode:'USD',total:{amount:state.sel.length?amountStr():'1.00',label:'Calm Laser Center'}})}catch(e){PAY.req=null}
        if(!PAY.req) return;
        PAY.payments.applePay(PAY.req).then(function(ap){PAY.apple=ap;var el=$('bkApplePay');el.hidden=false;$('bkPayOr').hidden=false;
          var go=function(){walletPay(PAY.apple)};el.onclick=go;el.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}}).catch(function(){});
        PAY.payments.googlePay(PAY.req).then(function(gp){PAY.gpay=gp;var el=$('bkGooglePay');el.hidden=false;
          return gp.attach('#bkGooglePay',{buttonColor:'black',buttonSizeMode:'fill',buttonType:'long'}).then(function(){$('bkPayOr').hidden=false;el.onclick=function(){walletPay(PAY.gpay)}})}).catch(function(){$('bkGooglePay').hidden=true});
      }).catch(function(){
        PAY.card=null; payBtns.filter(function(b){return b.dataset.m==='card'})[0].hidden=true;
        if(PAY.method==='card'||!PAY.method) setMethod('zelle');
      });
    }
    function walletPay(method){
      if(PAY.busy) return;
      if(!detailsOk()){showError('Please choose your treatments and time, fill in your details and accept the terms first.');return}
      syncPay(); PAY.busy=true; update();
      method.tokenize().then(function(r){
        PAY.busy=false;
        if(r.status==='OK') submit({method:'card',sourceId:r.token});
        else{ if(r.status!=='Cancel') showError('The payment was not completed. Please try again.'); update() }
      }).catch(function(){PAY.busy=false;showError('The payment was not completed. Please try again.');update()});
    }
    function verificationDetails(){
      return {amount:amountStr(),currencyCode:'USD',intent:'CHARGE',customerInitiated:true,sellerKeyedIn:false,
        billingContact:{givenName:F.first.value.trim(),familyName:F.last.value.trim(),email:F.email.value.trim(),phone:F.phone.value.trim()}};
    }

    function update(){
      var parts=[];
      if(state.sel.length) parts.push(state.sel.map(function(s){return s.base}).join(' + '));
      if(state.day) parts.push(fmtDay(state.day));
      if(state.slot){var st=new Date(state.slot.startAt);parts.push(fmtTime(st)+' – '+fmtTime(new Date(st.getTime()+totals().d*60000)))}
      if(state.sel.length){var t=totals();parts.push((t.from?'from ':'')+money(t.p))}
      $('bkSumLine').textContent=parts.length?parts.join(' · '):'Choose your areas, a day and a time.';
      renderDepInfo();
      var sb=$('bkSubmit'); sb.disabled=!valid();
      if(!sb.classList.contains('busy')) sb.firstChild.textContent=submitLabel();
      syncPay();
    }
    function submitLabel(){
      var amt=state.sel.length?' '+money(dep().deposit):'';
      if(PAY.method==='card') return 'Pay'+amt+(pct()<100?' deposit':'')+' & book';
      if(PAY.method==='zelle') return 'Book & pay with Zelle';
      if(PAY.method==='venmo') return 'Book & pay with Venmo';
      return 'Book appointment';
    }
    function showError(t){var e=$('bkError');e.textContent=t;e.hidden=false}
    function hideError(){$('bkError').hidden=true}
    $('bkSubmit').onclick=function(){
      if(!valid()) return;
      if(PAY.method==='card'){
        var btn=this; PAY.busy=true; btn.disabled=true; btn.classList.add('busy'); btn.firstChild.textContent='Checking card'; hideError();
        PAY.card.tokenize(verificationDetails()).then(function(r){
          PAY.busy=false;
          if(r.status==='OK') return submit({method:'card',sourceId:r.token});
          btn.classList.remove('busy'); update();
          var m=(r.errors&&r.errors[0]&&r.errors[0].message)||'';
          showError(m?'Please check your card details: '+m:'Please check your card details.');
        }).catch(function(){PAY.busy=false;btn.classList.remove('busy');update();showError('Your card could not be checked. Please try again.')});
        return;
      }
      submit({method:PAY.method});
    };
    function submit(payment){
      var btn=$('bkSubmit'); PAY.busy=true; btn.disabled=true; btn.classList.add('busy'); btn.firstChild.textContent=payment.method==='card'?'Paying':'Booking'; hideError();
      var slot=state.slot, sel=state.sel.slice(), email=F.email.value.trim(), t0=totals(), d0=dep();
      var agreed='Agreed online to Terms of Service & Privacy Policy (incl. 30% deposit, deposit refunded only if cancelled 24h+ in advance, no refunds for performed treatments) and accepted: treatment risks, informed consent, release of liability & no refunds (Terms §4-6, version 2026-10-23).', userNote=F.note.value.trim();
      api('/book',{startAt:slot.startAt,serviceIds:sel.map(function(s){return s.id}),note:(userNote?userNote+' | ':'')+agreed,payment:payment,
        customer:{firstName:F.first.value.trim(),lastName:F.last.value.trim(),email:email,phone:F.phone.value.trim()}})
      .then(function(j){
        var st=new Date((j.booking&&j.booking.startAt)||slot.startAt);
        $('bkDoneWhen').textContent=fmtDay(laYmd(st))+' at '+fmtTime(st);
        $('bkDoneWhat').textContent=sel.map(function(s){return s.base}).join(' + ')+' · '+fmtDur(t0.d)+' · '+money(t0.p);
        $('bkDoneEmail').textContent=email;
        var pj=j.payment||{method:payment.method,status:payment.method==='card'?'paid':'pending',amount:d0.deposit};
        pj.total=j.total!=null?j.total:d0.total; pj.balance=j.balance!=null?j.balance:d0.balance;
        renderDonePay(pj);
        apiFlow.hidden=true; done.hidden=false; done.scrollIntoView({behavior:'smooth',block:'start'});
        if(PAY.card){try{PAY.card.clear&&PAY.card.clear()}catch(e){}}
      })
      .catch(function(e){
        if(e.code==='SLOT_TAKEN'){state.slot=null;state.availKey='';loadAvailability()}
        showError((e.message||'Booking failed.')+(e.code==='SLOT_TAKEN'||/^PAYMENT_DECLINED$/.test(e.code||'')?'':' You can also call us at (818) 808-0010.'));
      })
      .then(function(){PAY.busy=false;btn.classList.remove('busy');update()});
    }
    function renderDonePay(p){
      var box=$('bkDonePay'); box.innerHTML=''; box.hidden=false; box.className='done-pay';
      function el(tag,txt,cls){var e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
      if(p.status==='paid'){
        box.classList.add('paid');
        var p1=el('p'); p1.appendChild(el('b',(p.balance>0?'Deposit of ':'Paid ')+money(p.amount)+(p.balance>0?' paid':''))); p1.appendChild(document.createTextNode(' by card – thank you!'));
        if(p.receiptUrl){p1.appendChild(document.createTextNode(' ')); var a=el('a','View receipt'); a.href=p.receiptUrl; a.target='_blank'; a.rel='noopener'; p1.appendChild(a)}
        box.appendChild(p1);
        if(p.balance>0){var p2=el('p');p2.appendChild(document.createTextNode('Remaining '));p2.appendChild(el('b',money(p.balance)));p2.appendChild(document.createTextNode(' is paid at the studio by card, Apple Pay, Google Pay, Zelle, Venmo or cash.'));box.appendChild(p2)}
        var p3=el('p');p3.textContent='Cancel at least 24 hours in advance and your deposit is refunded. For later cancellations or missed appointments the deposit is non-refundable.';box.appendChild(p3);
        return;
      }
      var label=p.method==='venmo'?'Venmo':'Zelle', mc=manualCfg(p.method), to=p.to||mc.to, hours=p.hours||mc.hours;
      box.appendChild(el('h4','Next step: send your deposit via '+label));
      function row(k,v,copy){var r=el('div',null,'pay-row');r.appendChild(el('span',k));r.appendChild(el('b',v));
        if(copy){var c=el('button','Copy','copy-btn');c.type='button';c.onclick=function(){var done=function(){c.textContent='Copied';setTimeout(function(){c.textContent='Copy'},1600)};
          if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(copy).then(done,function(){});}; r.appendChild(c)}
        box.appendChild(r)}
      row('Deposit',money(p.amount),String(p.amount));
      row(label+' to',to,to.replace(/[^\d+@\w.-]/g,''));
      if(p.ref) row('Memo',p.ref,p.ref);
      var n=el('p'); n.appendChild(document.createTextNode('Please send the payment '));n.appendChild(el('b','within '+hours+(hours===1?' hour':' hours')));
      n.appendChild(document.createTextNode(' and add '+(p.ref?'your booking number':'your name and appointment date')+' as the memo. If we don\u2019t receive it in time, your appointment may be cancelled.'));
      box.appendChild(n);
      if(p.balance>0){var n2=el('p');n2.appendChild(document.createTextNode('Remaining '));n2.appendChild(el('b',money(p.balance)));n2.appendChild(document.createTextNode(' is paid at the studio – card, Apple Pay, Google Pay, Zelle, Venmo or cash. Cancel at least 24 hours in advance and your deposit is refunded; otherwise it is non-refundable.'));box.appendChild(n2)}
    }
    $('bkAgain').onclick=function(){
      state.sel=[];state.day=null;state.slot=null;state.availKey='';F.note.value='';$('bkDonePay').hidden=true;
      done.hidden=true;apiFlow.hidden=false;afterSelection();renderCal();
    };

    renderCal();
    api('/config').then(function(c){PAY.cfg=c; if(!PAY.method) setMethod('zelle'); if(c.card&&c.card.appId) return initCard(c.card)})
      .catch(function(){ if(!PAY.method) setMethod('zelle') });
    api('/services').then(function(j){
      S=j.services||[]; if(!S.length) throw new Error('No services');
      classify(); renderCats(); renderList(); update();
    }).catch(function(){ showFallback(); });
  })();

  // Pricing (from the studio's price list)
  (function(){
    var P=[
      {k:'face',t:'Face & Neck',r:[
        ['Full face & front of neck','',75,140],['Full face','neck not included',50,65],['Partial face','forehead & neck not included',40,55],
        ['Front or back of neck','',30,60],['Hairline','',25,50],['Lip','',25,35],['Chin','',25,35],['Lip & chin','',40,50],
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
    window.CALM_PRICE_LIST=P;
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

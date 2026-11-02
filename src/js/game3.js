'use strict';
/* ================= input ================= */
function inputInit(){
  const cv=$('gl');let pd=null;
  addEventListener('pointerdown',e=>{if(G.phase==='replay'&&!e.target.closest('#bHome')){e.stopPropagation();e.preventDefault();endReplay()}},true);
  addEventListener('keydown',e=>{if(G.phase==='replay'){e.stopPropagation();e.preventDefault();endReplay()}else if((e.key==='r'||e.key==='R')&&!(e.target&&e.target.tagName==='INPUT'))startReplay()},true);
  cv.addEventListener('pointerdown',e=>{if(AC&&AC.state==='suspended')AC.resume();
    if(G.phase==='intro'){endIntro();return}
    if(G.mode==='menu')return;cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);
    pd={x:e.clientX,y:e.clientY,lx:e.clientX,moved:false,swing:!!G.sw}});
  cv.addEventListener('pointermove',e=>{if(!pd)return;if(Math.abs(e.clientX-pd.x)>9&&!pd.swing)pd.moved=true;
    if(pd.moved&&(G.phase==='address'||G.phase==='putt')&&!G.sw){const dx=e.clientX-pd.lx;const k=G.phase==='putt'?.0016:.0028;G.aim-=dx*k;G.ringDirty=true;updHUD()}pd.lx=e.clientX});
  const up=e=>{const p=pd;pd=null;if(!p)return;if(!p.moved)swingTap()};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',()=>{pd=null});
  cv.addEventListener('wheel',e=>{if(G.phase==='address'||G.phase==='putt'){G.aim-=(e.deltaX||e.deltaY*.3)*.002;G.ringDirty=true}},{passive:true});
  addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;const k=e.key;
    if(G.phase==='intro'&&(k===' '||k==='Enter')){endIntro();e.preventDefault();return}
    if(k==='Enter'&&$('next').style.display==='block'){$('next').click();return}
    if(G.mode==='menu'||!G.H)return;
    if(k===' '){e.preventDefault();if(!e.repeat)swingTap();return}
    if(G.phase!=='address'&&G.phase!=='putt')return;if(G.sw)return;
    if(k==='ArrowLeft'||k==='ArrowRight'||k==='a'||k==='d'){G.aim+=(k==='ArrowLeft'||k==='a'?1:-1)*(e.shiftKey?.002:G.phase==='putt'?.004:.0105);G.ringDirty=true;updHUD();e.preventDefault()}
    else if(k==='ArrowUp'||k==='ArrowDown'||k==='w'||k==='s'){e.preventDefault();if(G.phase==='putt')return;const al=G.allowed||CN.map((_,i)=>i).slice(0,13);let i=al.indexOf(G.club);i=clamp(i+(k==='ArrowUp'||k==='w'?-1:1),0,al.length-1);selClub(al[i])}
    else if('12345'.includes(k)&&k.length===1){const n=+k;if(n<=3)setShape(n-1);else setTraj(n===4?1:-1)}
    else if(k==='v'||k==='V')$('bView').click();else if(k==='`'){G.debug=!G.debug;$('fps').style.display=G.debug?'':'none';$('fps').textContent=''}else if(k==='c'||k==='C')$('bCard').click()});
  $('clubs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||G.sw)return;selClub(+b.dataset.c)});
  $('shape').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||G.sw)return;if(b.dataset.s!==undefined)setShape(+b.dataset.s);else setTraj(+b.dataset.t)});
  $('bView').onclick=()=>{G.view=G.view?0:1;if(G.phase==='address'||G.phase==='putt')G.ringDirty=true};
  $('bCard').onclick=()=>{if(G.mode==='round')showCard(G.round,true)};
  $('bRep').onclick=e=>{e.stopPropagation();startReplay()};$('rpOffer').onclick=e=>{e.stopPropagation();startReplay()};
  $('bHome').onclick=()=>{G.sw=null;if(G.mode==='round')saveRound();leaveToMenu()};
  $('lm').onclick=()=>{$('lm').classList.toggle('min');$('lmT').textContent=$('lm').classList.contains('min')?'+':'–'};
  $('rangeP').querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;G.rTab=b.dataset.t;for(const x of $('rangeP').querySelectorAll('.tabs button'))x.classList.toggle('sel',x===b);drawRangePanel()});}
/* ---- timed 3-tap swing meter ----
   tap 1: start backswing (meter rises 0 -> 115% in 2.6 s)
   tap 2: set power (meter returns at 1.75x the rise speed = ideal 1.75:1 tempo)
   tap 3: at the sweet-spot line for accuracy (early = pull/draw, late = push/fade) */
const SW_UP=2600/1.15,SW_DOWN=SW_UP/1.75,SW_TEMPO=1.75;
function swNow(){return performance.now()}
/* v1.30: difficulty = swing meter speed only */
const DIFF=[['Reggie',.6],['Easy',.8],['Medium',1],['Hard',1.2],['PGA',1.45],['Woods',1.75]];
function diffI(){const v=store('ts.diff');return v===null||v===undefined||!DIFF[+v]?2:+v}
function swValue(s,t){const k=s.k||1;if(s.phase==='up')return Math.min(1.15,(t-s.t0)*k/SW_UP);return s.pow-(t-s.tPow)*k/SW_DOWN}
function swingTap(){if(G.phase!=='address'&&G.phase!=='putt'&&G.phase!=='swing')return;const t=swNow();let s=G.sw;
  if(!s){G.sw={phase:'up',t0:t,pow:0,ft:0,putt:G.phase==='putt',k:DIFF[diffI()][1]};if(G.phase==='address')G.phase='swing';sfx('tick');return}
  if(s.putt){G.sw=null;const ft=s.ft;if(ft>.4)executeShot({ft});return}
  if(s.phase==='up'){s.pow=swValue(s,t);s.tPow=t;s.phase='down';sfx('tick');return}
  if(s.phase==='down')swingRelease(swValue(s,t),t)}
function swingTick(){const s=G.sw;if(!s)return;const t=swNow();
  if(s.putt){const f=Math.min(1,(t-s.t0)/1700);s.ft=f*G.puttMax;s.pow=f;if(f>=1){/* stays at max until tapped */}updPutt();return}
  const v=swValue(s,t);if(s.phase==='up'){s.pow=v;if(v>=1.15){s.pow=1.15;s.tPow=t;s.phase='down'}}else{s.cur=v;if(v<-.22)swingRelease(-.22,t)}}
function swingRelease(err,t){const s=G.sw;G.sw=null;const tb=s.tPow-s.t0,td=t-s.tPow;const ratio=tb/Math.max(20,td);
  G.lastSw={pow:s.pow,err};const R=RNG(t+'');const e=Math.abs(err);
  const sx=clamp(err*2.2+gauss(R)*.05,-1,1),sy=clamp(gauss(R)*.05-(s.pow>1.02?(s.pow-1)*2.2:0)-(e>.12?.15:0),-1,1);
  const sh=SHAPES[G.shape];const face=sh.f-err*28+gauss(R)*.25,path=sh.p-err*8;
  const tq=clamp(1-e*4,0,1);
  executeShot({power:s.pow,tempoQ:tq,sx,sy,face,path,dLoft:G.traj*4,ratio,err})}
function selClub(ci){if(G.allowed&&!G.allowed.includes(ci))return;if(G.phase==='putt'&&ci!==PUTTER){// chip from fringe/green with a wedge
    G.phase='address'}
  if(ci===PUTTER&&G.phase==='address'&&(G.ball.surf===S_FRINGE||G.ball.surf===S_FW||G.ball.surf===S_GREEN)){G.club=PUTTER;G.phase='putt';G.aim=Math.atan2(G.H.cup.y-G.ball.y,G.H.cup.x-G.ball.x);updClubs();updHUD();updPutt();return}
  if(ci===PUTTER&&G.phase==='address')return;
  G.club=ci;if(G.mode==='round'&&G.ball.surf===S_TEE&&G.H.par>3)defaultAim();updClubs();updHUD();G.ringDirty=true}
function setShape(i){G.shape=i;for(const b of $('shape').querySelectorAll('[data-s]'))b.classList.toggle('sel',+b.dataset.s===i);G.ringDirty=true}
function setTraj(t){G.traj=G.traj===t?0:t;for(const b of $('shape').querySelectorAll('[data-t]'))b.classList.toggle('sel',+b.dataset.t===G.traj);G.ringDirty=true}
function updPutt(){const ft=(G.sw&&G.sw.ft)||0;if(!$('pFt'))return;$('pFt').textContent=ft.toFixed(ft<10?1:0)+' ft';$('pBar').style.width=clamp(ft/G.puttMax*100,0,100)+'%'}

/* ================= round flow ================= */
function startRound(cid,tee,start,n,players,gimme,tod){const c=CID[cid];const pl=(players&&players.length?players:[{name:ownerName(),owner:1}]).map(p=>({name:String(p.name).slice(0,16)||'Player',owner:!!p.owner,sc:[],pt:[],fir:[],gir:[],dr:[],pen:[]}));G.round={id:cid+':'+Date.now(),cid,tee,start,n,i:0,gimme:gimme||0,tod:tod||todKey(),sc:[],pt:[],fir:[],gir:[],dr:[],pen:[],d:todayKey(),players:pl};G.mode='round';loadRoundHole(null)}
function loadRoundHole(rs){const r=G.round,c=CID[r.cid],idx=r.start+r.i;hideScreens();$('hud').classList.add('on');$('modeBar').classList.add('hide');$('rangeP').classList.remove('on');clearLabels();
  G.allowed=null;G.target=null;G.extraBalls=null;G.cupOn=true;G.afterRest=null;
  const H=buildHole(c,GEO[c.id],idx,r.tee,{cupSeed:r.id});setHole(H);G.wind=windFor(r.id+'#'+idx);carryReset();
  G.ball={x:0,y:0,surf:S_TEE};G.strokes=0;G.pen=0;G.putts=0;G.hs={fir:null,gir:false,dr:0};G.lm=null;G.R.tracerN=0;
  G.onShot=(lm,res)=>{if(G.lastPos.surf===S_GREEN||G.club===PUTTER)G.putts++};
  G.onRest=(res,msg)=>{const H=G.H;if(G.strokes-G.pen===1&&H.par>3&&G.lastPos.surf===S_TEE){G.hs.fir=!msg&&G.ball.surf===S_FW;if(!msg&&G.anim.ci===0){G.hs.dr=Math.round(G.lm.total);noteDrive(G.hs.dr)}}
    if(G.ball.surf===S_GREEN&&G.strokes<=H.par-2)G.hs.gir=true;updHUD()};
  G.onHoled=()=>holed();
  if(rs){G.ball=rs.ball;G.strokes=rs.strokes;G.pen=rs.pen;G.putts=rs.putts;G.hs=rs.hs;G.lm=rs.lm;G.ballOn=true;setAddress()}else startIntro();
  updHUD()}
function carryReset(){for(const k in carryCache)delete carryCache[k]}
function noteDrive(d){const R=recLoad();const c=crec(R,G.round.cid);if(d>c.ld)c.ld=d;if(d>R.stats.longest)R.stats.longest=d;recSave(R)}
const SNAME={'-4':'Condor','-3':'Albatross','-2':'Eagle','-1':'Birdie','0':'Par','1':'Bogey','2':'Double Bogey','3':'Triple Bogey'};
function holed(){const r=G.round,H=G.H;const sc=G.strokes,d=sc-H.par;sfx('cup');
  if(G.strokes<=H.par-2+0)G.hs.gir=G.hs.gir||G.strokes<=H.par-2;if(G.lastPos.surf!==S_GREEN&&G.strokes<=H.par-1&&G.strokes-1<=H.par-2)G.hs.gir=true;
  const name=sc===1?'Hole in One!':(SNAME[d]||('+'+d));
  r.sc[r.i]=sc;r.pt[r.i]=G.putts;r.fir[r.i]=G.hs.fir;r.gir[r.i]=G.hs.gir;r.dr[r.i]=G.hs.dr;r.pen[r.i]=G.pen;
  if(sc===1){const R=recLoad();crec(R,r.cid).aces++;R.stats.aces++;recSave(R)}
  toast(name,`${sc} ${sc===1?'stroke':'strokes'} · ${G.putts} putt${G.putts===1?'':'s'} · ${fmtPar(scoreToPar())} total`,2600);
  G.ballOn=false;store('ts.round',{r,hs:null});updHUD();
  const last=r.i>=r.n-1;$('next').textContent=last?'Finish round ▸':'Next hole ▸';setTimeout(()=>{$('next').style.display='block'},900)}
function pickUp(){const r=G.round,H=G.H;G.strokes=H.par+5;G.putts=G.putts||0;r.sc[r.i]=G.strokes;r.pt[r.i]=G.putts;r.fir[r.i]=G.hs.fir;r.gir[r.i]=false;r.dr[r.i]=G.hs.dr;r.pen[r.i]=G.pen;
  G.phase='holed';G.ballOn=false;toast('Picked up','Max score '+G.strokes,2200);store('ts.round',{r,hs:null});updHUD();$('next').textContent=r.i>=r.n-1?'Finish round ▸':'Next hole ▸';setTimeout(()=>{$('next').style.display='block'},900)}
function nextHole(){$('next').style.display='none';const r=G.round;r.i++;if(r.i>=r.n){finishRound();return}store('ts.round',{r,hs:null});loadRoundHole(null)}
function saveRound(){const r=G.round;if(!r||G.mode!=='round')return;const hs=G.phase==='holed'||G.phase==='intro'?null:{ball:{x:G.ball.x,y:G.ball.y,surf:G.ball.surf},strokes:G.strokes,pen:G.pen,putts:G.putts,hs:G.hs,lm:G.lm};store('ts.round',{r,hs})}
function finishRound(){const r=G.round,c=CID[r.cid];const R=recLoad();const cr=crec(R,r.cid);let par=0,tot=0,fir=[0,0],gir=0;
  const CP=cpar(c,r.tee);for(let i=0;i<r.n;i++){par+=CP[r.start+i];tot+=r.sc[i];if(CP[r.start+i]>3){fir[1]++;if(r.fir[i])fir[0]++}if(r.gir[i])gir++}
  const rd={d:r.d,t:Date.now(),tee:r.tee,st:r.start,n:r.n,sc:r.sc,pt:r.pt,fir:r.fir,gir:r.gir,dr:r.dr,tot,par};cr.rounds.push(rd);if(cr.rounds.length>60)cr.rounds.shift();
  R.stats.fw[0]+=fir[0];R.stats.fw[1]+=fir[1];R.stats.gir[0]+=gir;R.stats.gir[1]+=r.n;R.stats.rounds++;recSave(R);store('ts.round',null);
  G.round=null;G.mode='summary';showSummary(rd,c)}
/* ================= screens ================= */
function hideScreens(){for(const s of document.querySelectorAll('.screen'))s.classList.remove('on')}
function show(id,html){hideScreens();const s=$(id);s.innerHTML=html;s.classList.add('on');s.scrollTop=0;return s}
function leaveToMenu(){$('next').style.display='none';$('hud').classList.remove('on');$('rangeP').classList.remove('on');$('intro').classList.remove('on');clearLabels();G.mode='menu';G.phase='none';G.sw=null;menuBG();showMenu()}
function showMenu(){const sv=store('ts.round');const R=recLoad();const st=R.stats;
  let res='';if(sv&&sv.r){const c=CID[sv.r.cid];if(c)res=`<button class="btn" id="mRes">Resume round<small>${esc(c.name)} · hole ${sv.r.start+sv.r.i+1} · ${sv.r.n} holes</small></button>`}
  show('scMenu',`<div class="ver">${VERSION}</div><div class="wrap"><div class="logo">Tour <span>Sim</span></div><div class="tag">Golf Simulator · Top 25 U.S. courses + your home course</div>
  <div class="menu">${res}
   <button class="btn${res?' alt':''}" id="mPlay">Play a course<small>Lookaway (home) + Golf Digest top 25 · 18 / front 9 / back 9</small></button>
   <button class="btn alt" id="mRange">Driving range<small>Distance flags · dispersion · My Bag gapping</small></button>
   <button class="btn alt" id="mCtp">Closest to the pin<small>Today: ${esc((G.menuCtp=ctpToday()).label)} · 5 balls</small></button>
   <button class="btn alt" id="mLd">Long drive<small>Today's wind: ${ldToday().wind.mph} mph · 6 balls</small></button>
   <button class="btn alt" id="mRec">My records<small>${st.rounds} rounds · longest drive ${st.longest||'—'} yds · aces ${st.aces}</small></button>
   <button class="btn alt c" id="mHow">How to play</button>
  </div><div class="disc">Fan-made; layouts approximate; not affiliated with any club.<br>Course geometry © OpenStreetMap contributors (ODbL). Scorecards from public sources. No characters, no logos.</div></div>`);
  if(res)$('mRes').onclick=()=>resumeRound(sv);$('mPlay').onclick=showSelect;$('mRange').onclick=startRange;$('mCtp').onclick=startCtp;$('mLd').onclick=startLd;$('mRec').onclick=()=>showRecords();$('mHow').onclick=showHow}
function showHow(){show('scSetup',`<div class="pn"><div class="hdr"><h2>How to play</h2><button class="ib" id="hx">✕</button></div>
 <p><b>Swing (3 taps):</b> 1) tap, click or press <b>Space</b> to start the backswing and the meter rises. 2) Tap again to set <b>power</b>; the green mark is the recommended power for the shot, and above 100% is overswing. 3) The meter swings back down. Tap when it crosses the white <b>sweet-spot line</b> for a pure strike. Tapping early pulls the ball left with draw spin (toe strike); tapping late pushes it right with fade spin (heel strike). Tempo is shown as backswing : downswing; about 1.75 : 1 is ideal.</p>
 <p><b>Keyboard:</b> <b>Space</b> for the three taps. <b>Left/Right</b> (or A/D) aim, <b>Up/Down</b> (or W/S) club, <b>1-3</b> straight/draw/fade, <b>4/5</b> high/low, <b>V</b> camera, <b>C</b> scorecard.</p>
 <p><b>Aim:</b> drag sideways anywhere on the course view before you swing. The ring shows where the ball should land.</p>
 <p><b>Putting:</b> the grid shows the green: dots drift downhill, and the faster and redder they are, the steeper the slope. Tap to start the putt meter, which counts up in feet, then tap again to stroke it. The white tick marks the cup distance. Allow for the break.</p>
 <p><b>Lie:</b> rough, sand and native areas cut distance (shown as lie %). Water costs one stroke plus a drop, and out of bounds is stroke and distance. You pick up at par + 5.</p>
 <button class="btn c" id="hb">Got it</button></div>`);$('hx').onclick=$('hb').onclick=showMenu}
function courseCard(c,R){const cr=R.courses[c.id];const rs=cr?cr.rounds:[];const b18=rs.filter(x=>x.n===18).reduce((m,x)=>m===null||x.tot-x.par<m.tot-m.par?x:m,null);
  const tot=c.tees[0].y.reduce((a,b)=>a+b,0),par=c.par.reduce((a,b)=>a+b,0);
  return`<button class="cc${c.home?' home':''}" data-id="${c.id}"><div class="rk">${c.home?'⌂':c.rank}</div><div><div class="nm">${esc(c.name)}${c.home?'<span class="badge">HOME COURSE</span>':''}</div><div class="lo">${esc(c.loc)} · Par ${par} · ${tot.toLocaleString()} yds</div><div class="rc">${b18?'Best 18: '+b18.tot+' ('+fmtPar(b18.tot-b18.par)+')':''}${rs.length?' · '+rs.length+' round'+(rs.length>1?'s':''):'No rounds yet'}</div></div></button>`}
function showSelect(){const R=recLoad();const home=COURSES.filter(c=>c.home),top=COURSES.filter(c=>!c.home).sort((a,b)=>a.rank-b.rank);
  const s=show('scSelect',`<div class="wrap"><div class="hdr"><button class="ib" id="sb">‹</button><h2>Course select</h2></div>
  <div class="cards">${home.map(c=>courseCard(c,R)).join('')}</div><div class="sec">Golf Digest · America's 100 Greatest (2025-26) · Top 25</div><div class="cards">${top.map(c=>courseCard(c,R)).join('')}</div>
  <div class="disc">Fan-made; layouts approximate; not affiliated with any club.</div></div>`);
  $('sb').onclick=showMenu;s.querySelectorAll('.cc').forEach(b=>b.onclick=()=>showSetup(b.dataset.id))}
function showSetup(cid){const c=CID[cid];if(!c||!c.tees||!c.tees.length){showSelect();return}let dif=diffI(),tee=0,part=2,np=1,gm=+(store('ts.gimme')||0),crw=(()=>{const v=store('ts.crowd');return v===null||v===undefined?2:+v})(),pinS=pinIn()?1:0,tod=todKey();const names=[ownerName(),...((store('ts.players')||[]).slice(-3).reverse())];while(names.length<4)names.push('Player '+(names.length+1));const tot=t=>c.tees[t].y.reduce((a,b)=>a+b,0);
  const draw=()=>{const s=show('scSetup',`<div class="pn"><div class="hdr"><button class="ib" id="ub">‹</button><h2 style="font-size:18px">${esc(c.name)}</h2></div>
   <div class="lo" style="opacity:.75;font-size:13px">${c.home?'<span class="badge" style="margin:0 6px 0 0">HOME COURSE</span>':'#'+c.rank+' · '}${esc(c.loc)}</div>
   <div class="sec">Tee box</div><div class="seg" id="tees">${c.tees.map((t,i)=>`<button data-i="${i}" class="${i===tee?'sel':''}">${esc(t.n)}<small>${tot(i).toLocaleString()} yds${t.par?' · par '+t.par.reduce((a,b)=>a+b,0):''}</small></button>`).join('')}</div>
   <div class="sec">Holes</div><div class="seg" id="parts">${['Front 9','Back 9','18 holes'].map((n,i)=>`<button data-i="${i}" class="${i===part?'sel':''}">${n}</button>`).join('')}</div>
   <div class="sec">Players · pass and play</div><div class="seg" id="np">${[1,2,3,4].map(k=>`<button data-i="${k}" class="${k===np?'sel':''}">${k===1?'Solo':k+' players'}</button>`).join('')}</div>
   <div class="sec">Time of day</div><div class="seg" id="tod">${Object.keys(TOD).map(k=>`<button data-k="${k}" class="${k===tod?'sel':''}">${TOD[k].n}</button>`).join('')}</div>
   <div class="sec">Difficulty</div><div class="seg" id="dif" style="flex-wrap:wrap">${DIFF.map((d,k)=>`<button style="flex:1 1 30%" data-i="${k}" class="${k===dif?'sel':''}">${d[0]}</button>`).join('')}</div><div class="gnote">Swing meter speed: ${DIFF[dif][1]}x</div>
   <div class="sec">Gimmes</div><div class="seg" id="gm">${[0,2,3].map(k=>`<button data-i="${k}" class="${k===gm?'sel':''}">${k?k+' ft':'Off'}</button>`).join('')}</div>${gm?'<div class="gnote">Gimmes on, no records. Putts inside '+gm+' ft are conceded for +1 stroke.</div>':''}
   <div class="sec">Crowd &amp; ambience</div><div class="seg" id="crw">${['Off','Low','Medium','High'].map((n,i)=>`<button data-i="${i}" class="${i===crw?'sel':''}">${n}</button>`).join('')}</div>
   <div class="pls">${Array.from({length:np},(_,k)=>`<label><span>${k===0?'You (profile owner)':'Player '+(k+1)}</span><input data-k="${k}" maxlength="16" value="${esc(names[k])}"></label>`).join('')}</div>
   <div class="scr">${cardHTML(c,tee,0,18,null,null)}</div>
   ${Object.keys(c.sig||{}).length?`<div class="sec">Signature holes</div><div style="font-size:13px;opacity:.85">${Object.entries(c.sig).map(([h,l])=>'#'+h+' '+esc(l)).join(' · ')}</div>`:''}
   <button class="btn c" id="go" style="margin-top:14px">Tee off</button><button class="btn alt c" id="gr">My records here</button>
   <div class="disc">Fan-made; layouts approximate; not affiliated with any club.<br>Scorecard: ${esc(c.src||'')}</div></div>`);
   s.querySelector('#tees').onclick=e=>{const b=e.target.closest('button');if(b){tee=+b.dataset.i;draw()}};s.querySelector('#parts').onclick=e=>{const b=e.target.closest('button');if(b){part=+b.dataset.i;draw()}};s.querySelector('#np').onclick=e=>{const b=e.target.closest('button');if(b){np=+b.dataset.i;draw()}};s.querySelector('#tod').onclick=e=>{const b=e.target.closest('button');if(b){tod=b.dataset.k;store('ts.tod',tod);draw()}};s.querySelector('#gm').onclick=e=>{const b=e.target.closest('button');if(b){gm=+b.dataset.i;store('ts.gimme',gm);draw()}};s.querySelector('#dif').onclick=e=>{const b=e.target.closest('button');if(b){dif=+b.dataset.i;store('ts.diff',dif);draw()}};s.querySelector('#crw').onclick=e=>{const b=e.target.closest('button');if(b){crw=+b.dataset.i;store('ts.crowd',crw);draw()}};s.querySelectorAll('.pls input').forEach(inp=>inp.oninput=()=>{names[+inp.dataset.k]=inp.value});
   $('ub').onclick=showSelect;$('gr').onclick=()=>showRecords(cid);$('go').onclick=()=>{store('ts.round',null);const nm=names.slice(0,np).map((x,k)=>(x||'').trim()||(k?'Player '+(k+1):'James'));for(let k=1;k<nm.length;k++){while(nm.slice(0,k).some(z=>z.toLowerCase()===nm[k].toLowerCase()))nm[k]+='+'}if(nm[0])store('ts.owner',nm[0]);startRound(cid,tee,part===1?9:0,part===2?18:9,nm.map((x,k)=>({name:x,owner:k===0})),gm,tod)}};draw()}
function scCls(s,p){if(!s)return'';const d=s-p;return s===1?'sc-ea':d<=-2?'sc-ea':d===-1?'sc-b':d===0?'':d===1?'sc-bo':'sc-db'}
function cardHTML(c,tee,start,n,sc,pt){const rows=[];const halves=[];for(let h=0;h<18;h+=9){const idx=[];for(let i=h;i<h+9;i++)if(i>=start&&i<start+n)idx.push(i);if(idx.length)halves.push(idx)}
  let out='';for(const idx of halves){const y=c.tees[tee].y,p=cpar(c,tee);const sumY=idx.reduce((a,i)=>a+y[i],0),sumP=idx.reduce((a,i)=>a+p[i],0);const lab=idx[0]<9?'OUT':'IN';
    out+=`<table><tr><th class="l">Hole</th>${idx.map(i=>`<th>${i+1}</th>`).join('')}<th>${lab}</th></tr><tr><td class="l">Yds</td>${idx.map(i=>`<td>${y[i]}</td>`).join('')}<td>${sumY}</td></tr><tr><td class="l">Par</td>${idx.map(i=>`<td>${p[i]}</td>`).join('')}<td>${sumP}</td></tr>`;
    if(sc){const g=i=>sc[i-start];const s=idx.reduce((a,i)=>a+(g(i)||0),0);out+=`<tr><td class="l"><b>Score</b></td>${idx.map(i=>`<td><span class="${scCls(g(i),p[i])}" style="display:inline-block;min-width:20px;padding:1px">${g(i)||''}</span></td>`).join('')}<td><b>${s||''}</b></td></tr>`;
      if(pt)out+=`<tr><td class="l">Putts</td>${idx.map(i=>`<td>${pt[i-start]!==undefined&&sc[i-start]?pt[i-start]:''}</td>`).join('')}<td>${idx.reduce((a,i)=>a+(sc[i-start]?pt[i-start]||0:0),0)||''}</td></tr>`}
    out+='</table>'}return out}
function showCard(r,live){const c=CID[r.cid];const s=show('scCard',`<div class="pn" style="max-width:640px"><div class="hdr"><h2 style="font-size:17px">${esc(c.name)} · ${esc(c.tees[r.tee].n)} tees</h2><button class="ib" id="cx">✕</button></div><div class="scr">${cardHTML(c,r.tee,r.start,r.n,r.sc,r.pt)}</div><div style="margin-top:8px;font-weight:800">To par: ${fmtPar(scoreToParR(r))}</div></div>`);
  s.querySelector('.pn').insertAdjacentHTML('beforeend',`${r.gimme?'<div class="gnote">Gimmes on ('+r.gimme+' ft), no records</div>':''}<div class="verin">Tour Sim ${VERSION}</div>`);$('cx').onclick=()=>{hideScreens()}}
function scoreToParR(r){const c=CID[r.cid];let s=0;for(let i=0;i<r.sc.length;i++)if(r.sc[i])s+=r.sc[i]-cpar(c,r.tee)[(r.start!==undefined?r.start:r.st)+i];return s}
function showSummary(rd,c){$('hud').classList.remove('on');const R=recLoad();const cr=R.courses[c.id]||{rounds:[rd]};const best=cr.rounds.filter(x=>x.n===rd.n&&x.st===rd.st).every(x=>x===rd||x.tot>=rd.tot);
  const fir=rd.fir.filter(x=>x===true).length,firN=rd.sc.map((_,i)=>cpar(c,rd.tee)[rd.st+i]>3).filter(Boolean).length,gir=rd.gir.filter(Boolean).length,putts=rd.pt.reduce((a,b)=>a+b,0);
  const s=show('scCard',`<div class="pn" style="max-width:640px"><div class="hdr"><h2>Round complete</h2></div><div style="font-size:15px;font-weight:800">${esc(c.name)} · ${esc(c.tees[rd.tee].n)} tees</div>
   <div class="stt"><div><b>${rd.tot}</b><span>Score</span></div><div><b>${fmtPar(rd.tot-rd.par)}</b><span>To par</span></div><div><b>${fir}/${firN}</b><span>Fairways</span></div><div><b>${gir}/${rd.n}</b><span>Greens</span></div><div><b>${putts}</b><span>Putts</span></div><div><b>${Math.max(0,...rd.dr)||'—'}</b><span>Longest drive</span></div></div>
   ${best?'<div class="badge" style="font-size:12px;margin:0 0 8px">NEW PERSONAL BEST</div>':''}<div class="scr">${cardHTML(c,rd.tee,rd.st,rd.n,rd.sc,rd.pt)}</div>
   <button class="btn c" id="sm" style="margin-top:12px">Main menu</button><button class="btn alt c" id="sh">Copy result</button><button class="btn alt c" id="sr">My records</button></div>`);$('sm').onclick=leaveToMenu;$('sh').onclick=()=>shareText(`Tour Sim · ${c.name} (${c.tees[rd.tee].n}) · ${rd.n===18?'18':rd.st?'Back 9':'Front 9'}: ${rd.tot} (${fmtPar(rd.tot-rd.par)}) · ${gir}/${rd.n} GIR · ${putts} putts`,$('sh'));$('sr').onclick=()=>{leaveToMenu();showRecords(c.id)}}
function resumeRound(sv){G.round=sv.r;G.mode='round';if(sv.r.sc[sv.r.i]){nextHole();return}loadRoundHole(sv.hs)}
function showRecords(cid){const R=recLoad();
  if(!cid){const list=[...COURSES].sort((a,b)=>(a.home?-1:a.rank)-(b.home?-1:b.rank));const st=R.stats;
    const s=show('scRecords',`<div class="wrap"><div class="hdr"><button class="ib" id="rb">‹</button><h2>My records</h2></div>
    <div class="stt"><div><b>${st.rounds}</b><span>Rounds</span></div><div><b>${st.fw[1]?Math.round(st.fw[0]/st.fw[1]*100)+'%':'—'}</b><span>Fairways</span></div><div><b>${st.gir[1]?Math.round(st.gir[0]/st.gir[1]*100)+'%':'—'}</b><span>GIR</span></div><div><b>${st.longest||'—'}</b><span>Longest drive</span></div><div><b>${st.aces}</b><span>Aces</span></div><div><b>${R.ctp.best!==null?fmtFt(R.ctp.best):'—'}</b><span>Closest to pin</span></div><div><b>${R.ld.best||'—'}</b><span>Long drive</span></div></div>
    <div class="sec">All-time scores by course</div><div class="cards">${list.map(c=>courseCard(c,R)).join('')}</div></div>`);$('rb').onclick=showMenu;s.querySelectorAll('.cc').forEach(b=>b.onclick=()=>showRecords(b.dataset.id));return}
  const c=CID[cid],cr=R.courses[cid]||{rounds:[],aces:0,ld:0},rs=cr.rounds;const b18=rs.filter(x=>x.n===18).sort((a,b)=>a.tot-a.par-(b.tot-b.par))[0],b9=rs.filter(x=>x.n===9).sort((a,b)=>a.tot-a.par-(b.tot-b.par))[0];
  const bb=[];for(const r of rs)r.sc.forEach((s,i)=>{const h=r.st+i;if(s&&(!bb[h]||s<bb[h]))bb[h]=s});const avg=rs.filter(x=>x.n===18);const av=avg.length?(avg.reduce((a,x)=>a+x.tot,0)/avg.length).toFixed(1):'—';
  const bbTot=bb.filter(Boolean).length===18?bb.reduce((a,b)=>a+b,0):null;
  const s=show('scRecords',`<div class="wrap" style="max-width:700px"><div class="hdr"><button class="ib" id="rb">‹</button><h2 style="font-size:18px">${esc(c.name)}</h2></div>
   <div class="stt"><div><b>${b18?b18.tot:'—'}</b><span>Best 18${b18?' ('+fmtPar(b18.tot-b18.par)+')':''}</span></div><div><b>${b9?b9.tot:'—'}</b><span>Best 9${b9?' ('+fmtPar(b9.tot-b9.par)+')':''}</span></div><div><b>${av}</b><span>Avg 18</span></div><div><b>${rs.length}</b><span>Rounds played</span></div><div><b>${cr.aces}</b><span>Aces</span></div><div><b>${cr.ld||'—'}</b><span>Longest drive</span></div></div>
   <div class="sec">Best by tee</div><div class="hist">${c.tees.map((t,ti)=>{const tr=rs.filter(x=>x.tee===ti);const b=tr.filter(x=>x.n===18).sort((a,b)=>a.tot-b.tot)[0],n9=tr.filter(x=>x.n===9).sort((a,b)=>a.tot-a.par-(b.tot-b.par))[0];return`<div class="trow"><span>${esc(t.n)} · ${t.y.reduce((a,b)=>a+b,0).toLocaleString()} yds</span><span>${tr.length?(b?'18: '+b.tot+' ('+fmtPar(b.tot-b.par)+')':'')+(n9?(b?' · ':'')+'9: '+n9.tot+' ('+fmtPar(n9.tot-n9.par)+')':'')+' · '+tr.length+' rd'+(tr.length>1?'s':''):'No rounds'}</span></div>`}).join('')}</div>
   <div class="sec">Best-ball card (best score on each hole)${bbTot?' · '+bbTot+' ('+fmtPar(bbTot-c.par.reduce((a,b)=>a+b,0))+')':''}</div><div class="scr">${cardHTML(c,0,0,18,bb,null)}</div>
   <div class="sec">Round history</div><div class="hist">${rs.length?rs.slice().reverse().map((r,k)=>`<button data-k="${rs.length-1-k}"><span>${r.d} · ${r.n===18?'18 holes':r.st?'Back 9':'Front 9'} · ${esc(c.tees[r.tee].n)}</span><span>${r.tot} (${fmtPar(r.tot-r.par)}) ›</span></button>`).join(''):'<div style="opacity:.6;font-size:13px">No rounds yet.</div>'}</div>
   <button class="btn c" id="rp" style="margin-top:14px">Play ${esc(c.name)}</button></div>`);
  $('rb').onclick=()=>showRecords();$('rp').onclick=()=>showSetup(cid);s.querySelectorAll('.hist button').forEach(b=>b.onclick=()=>{const r=rs[+b.dataset.k];showCard({cid,tee:r.tee,start:r.st,n:r.n,sc:r.sc,pt:r.pt});$('cx').onclick=()=>showRecords(cid)})}
const fmtFt=yd=>{const ft=yd*3;const f=Math.floor(ft),i=Math.round((ft-f)*12);return f+"' "+(i===12?11:i)+'"'};
$('next').onclick=()=>{if(G.mode==='round')nextHole();else if(G.nextFn)G.nextFn()};

function shareText(t,btn){const done=()=>{if(btn){btn.textContent='Copied';setTimeout(()=>btn.textContent='Copy result',1500)}};try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>{prompt('Copy your result:',t)});return}}catch(e){}prompt('Copy your result:',t)}

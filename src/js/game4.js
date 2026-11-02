'use strict';
/* ================= range / mini modes ================= */
const RANGE_C={id:'range',name:'Practice Range',par:[4],tees:[{n:'Mat',y:[360]}],style:'parkland',names:['Driving Range'],sig:{}};
const RANGE_FLAGS=[[-16,50],[12,100],[-14,150],[16,200],[-10,250],[8,300]];
function rangeGeo(){const rect=(x0,y0,x1,y1)=>enc([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);const gr=RANGE_FLAGS.map(([x,y],i)=>enc(ellP(x,y,7+y*.02,6+y*.02,24,.08,i)));
  const bk=RANGE_FLAGS.filter((_,i)=>i%2).map(([x,y],i)=>enc(ellP(x+10*(i%2?1:-1),y-9,4,2.6,16,.1,i)));
  return{h:[{l:enc([[0,0],[0,360]])}],f:{gc:[rect(-110,-30,110,400)],fw:[rect(-70,25,70,375)],te:[rect(-14,-6,14,5)],gr,bk,wd:[rect(-110,-30,-88,400),rect(88,-30,110,400),rect(-110,380,110,400)]},t:[]}}
const LD_C={id:'ld',name:'Long Drive Grid',par:[4],tees:[{n:'Grid',y:[420]}],style:'parkland',names:['Long Drive'],sig:{}};
function ldGeo(){const rect=(x0,y0,x1,y1)=>enc([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);return{h:[{l:enc([[0,0],[0,440]])}],f:{gc:[rect(-48,-25,48,470)],fw:[rect(-30,140,30,445)],ro:[rect(-48,-25,48,470)],te:[rect(-10,-6,10,5)],wd:[rect(-80,-25,-60,470),rect(60,-25,80,470)]},t:[]}}
function modeHUD(title,short,sub,score,bar){G.modeTitle=title;G.modeShort=short;G.modeSub=sub;G.modeScore=score;const m=$('modeBar');if(bar){m.innerHTML=bar;m.classList.remove('hide')}else m.classList.add('hide');updHUD()}
function startMode(mode,course,geo,opts){G.round=null;G.mode=mode;hideScreens();$('hud').classList.add('on');$('next').style.display='none';clearLabels();
  const H=buildHole(course,geo,(opts&&opts.hi)||0,(opts&&opts.tee)||0,opts||{});if(opts&&opts.cup)H.cup=opts.cup;setHole(H,opts&&opts.flags);G.ball={x:0,y:0,surf:S_TEE};G.strokes=0;G.pen=0;G.lm=null;G.R.tracerN=0;carryReset();G.onHoled=null;G.onShot=null;G.onRest=null;return H}
// ---- range ----
function startRange(){const H=startMode('range',RANGE_C,rangeGeo(),{flags:null});G.flags=RANGE_FLAGS.map(([x,y],i)=>({x,y,col:[[.9,.15,.1],[1,.8,.1],[.15,.5,.95],[.95,.95,.95],[.9,.15,.1],[1,.8,.1]][i]}));G.cupOn=false;
  G.target={x:0,y:150};G.wind={x:0,y:0,mph:0,a:0};G.allowed=null;G.labels=RANGE_FLAGS.map(([x,y])=>({x,y,t:y+' yds',z:3.2}));
  G.sess=G.sess||{shots:[],fw:[0,0],best:0};G.rTab=G.rTab||'d';$('rangeP').classList.add('on');G.ballOn=true;
  G.onRest=(res,msg)=>{const lm=G.lm;if(!lm||!lm.ball)return;const s={ci:G.anim.ci,carry:lm.carry,total:lm.total,side:lm.side,smash:lm.smash,ball:lm.ball};G.sess.shots.push(s);
    if(s.ci<=2){G.sess.fw[1]++;if(Math.abs(s.side)<16)G.sess.fw[0]++;if(s.total>G.sess.best)G.sess.best=s.total}
    const bag=store('ts.bag')||{};const k=CN[s.ci];bag[k]=(bag[k]||[]);if(s.smash>CLUBS[s.ci].sm*.9){bag[k].push([Math.round(s.carry),Math.round(s.total)]);if(bag[k].length>20)bag[k].shift();store('ts.bag',bag)}
    drawRangePanel()};
  G.afterRest=()=>{G.ball={x:0,y:0,surf:S_TEE};setAddress();modeHUD('Driving Range','RNG','Any club · flags every 50 yds','—')};
  modeHUD('Driving Range','RNG','Any club · flags every 50 yds','—');G.phase='address';G.ballOn=true;setAddress();G.club=6;updClubs();updHUD();drawRangePanel()}
const CCOL=['#ff5a4a','#ff9a3c','#ffc93c','#d7e84a','#8fe36a','#4ad99a','#3fd8d0','#4ab4ff','#6a8cff','#9a78ff','#c36bff','#ff6bd0','#ff8fa8'];
function drawRangePanel(){const c=$('rangeC'),g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);g.fillStyle='rgba(20,40,28,.9)';g.fillRect(0,0,W,H);const sh=(G.sess&&G.sess.shots)||[];
  g.font='700 18px Helvetica,Arial,sans-serif';g.textBaseline='middle';
  if(G.rTab==='d'){const sx=x=>W/2+x*(W/90),sy=y=>H-24-y*(H-44)/320;g.strokeStyle='rgba(255,255,255,.12)';g.fillStyle='rgba(255,255,255,.55)';
    for(let y=50;y<=300;y+=50){g.beginPath();g.moveTo(20,sy(y));g.lineTo(W-20,sy(y));g.stroke();g.fillText(y,4,sy(y)-9)}g.beginPath();g.moveTo(W/2,H-20);g.lineTo(W/2,12);g.stroke();
    for(let ci=0;ci<13;ci++){const L=sh.filter(s=>s.ci===ci);if(!L.length)continue;const mx=L.reduce((a,s)=>a+s.side,0)/L.length,my=L.reduce((a,s)=>a+s.carry,0)/L.length;
      if(L.length>=2){const vx=Math.sqrt(L.reduce((a,s)=>a+(s.side-mx)**2,0)/L.length)+1.5,vy=Math.sqrt(L.reduce((a,s)=>a+(s.carry-my)**2,0)/L.length)+2;g.strokeStyle=CCOL[ci];g.globalAlpha=.85;g.lineWidth=2;g.beginPath();g.ellipse(sx(mx),sy(my),vx*1.5*(W/90),vy*1.5*(H-44)/320,0,0,TAU);g.stroke();g.globalAlpha=.16;g.fillStyle=CCOL[ci];g.fill();g.globalAlpha=1}
      g.fillStyle=CCOL[ci];for(const s of L){g.beginPath();g.arc(sx(s.side),sy(s.carry),4.5,0,TAU);g.fill()}g.fillStyle='#fff';g.fillText(CN[ci],sx(mx)+10,sy(my))}
    if(!sh.length){g.fillStyle='rgba(255,255,255,.7)';g.textAlign='center';g.fillText('Hit some shots: dispersion by club shows here',W/2,H/2);g.textAlign='left'}}
  else if(G.rTab==='b'){const bag=store('ts.bag')||{};const rows=CN.slice(0,13).map(k=>{const a=bag[k]||[];return[k,a.length?a.reduce((x,y)=>x+y[0],0)/a.length:0,a.length?a.reduce((x,y)=>x+y[1],0)/a.length:0,a.length]});
    const rh=(H-30)/13;g.fillStyle='rgba(255,255,255,.6)';g.fillText('MY BAG · avg carry (solid) / total (light) · saved',8,12);let prev=null;
    rows.forEach(([k,ca,to,n],i)=>{const y=26+i*rh+rh/2;g.fillStyle='#fff';g.fillText(k,8,y);if(n){const sx=v=>70+v*(W-150)/320;g.fillStyle='rgba(63,224,176,.3)';g.fillRect(70,y-rh*.35,sx(to)-70,rh*.7);g.fillStyle=CCOL[i];g.fillRect(70,y-rh*.35,sx(ca)-70,rh*.7);
      g.fillStyle='#fff';g.fillText(Math.round(ca)+' / '+Math.round(to),sx(to)+6,y);if(prev)g.fillStyle='rgba(255,255,255,.55)',g.fillText('gap '+Math.round(prev-ca),W-64,y);prev=ca}else{g.fillStyle='rgba(255,255,255,.35)';g.fillText('—',70,y)}})}
  else{const n=sh.length,fw=G.sess?G.sess.fw:[0,0];const sm=n?(sh.reduce((a,s)=>a+s.smash,0)/n).toFixed(2):'—';const st=[['Shots',n],['Fairways (woods)',fw[1]?fw[0]+'/'+fw[1]:'—'],['Best drive',G.sess&&G.sess.best?Math.round(G.sess.best)+' yds':'—'],['Avg smash',sm],['Avg ball speed',n?Math.round(sh.reduce((a,s)=>a+s.ball,0)/n)+' mph':'—'],['Clubs used',new Set(sh.map(s=>s.ci)).size]];
    g.font='800 24px Helvetica,Arial,sans-serif';st.forEach(([k,v],i)=>{const x=(i%2)*W/2+14,y=50+Math.floor(i/2)*150;g.fillStyle='rgba(255,255,255,.6)';g.font='800 17px Helvetica,Arial,sans-serif';g.fillText(k.toUpperCase(),x,y);g.fillStyle='#fff';g.font='900 40px Helvetica,Arial,sans-serif';g.fillText(v,x,y+46)})}}
// ---- closest to the pin (daily seeded par 3) ----
const CTP_POOL=[['augusta',12],['augusta',16],['augusta',4],['cypress',16],['cypress',15],['pebble',7],['pebble',17],['pinevalley',5],['pinevalley',10],['oakmont',6],['shinnecock',11],['merion',17],['ngla',13],['sandhills',13],['fishers',5],['seminole',17],['pacificdunes',11],['riviera',6],['lacc',11],['lookaway',3]];
function ctpToday(){const R=RNG('ctp'+todayKey());const pool=CTP_POOL.filter(([c,h])=>CID[c]&&CID[c].par[h-1]===3);const [cid,h]=pool[R.int(pool.length)];const c=CID[cid];return{cid,h,key:todayKey(),label:c.name.replace(/ (Golf|Country) Club.*$/,'').replace(/ National.*$/,' National')+' #'+h,wind:windFor('ctpw'+todayKey())}}
function startCtp(){// play exactly the hole the menu announced (same day key even if the menu sat open past midnight)
  const T=(G.menuCtp&&CID[G.menuCtp.cid])?G.menuCtp:ctpToday();const c=CID[T.cid];const H=startMode('ctp',c,GEO[c.id],{cupSeed:'ctp'+T.key,hi:T.h-1,tee:0});G.ctpT=T;
  G.wind=T.wind;G.allowed=CN.map((_,i)=>i).slice(0,13);G.cupOn=true;G.ballsLeft=5;G.ctpRes=[];G.extraBalls=[];G.labels=null;G.target=null;
  const bar=()=>`CLOSEST TO THE PIN · BALL ${Math.min(5,6-G.ballsLeft)}/5<small>Best ${G.ctpRes.length?fmtFt(Math.min(...G.ctpRes)):'—'} · today's hole: ${esc(T.label)}</small>`;
  G.onRest=(res,msg)=>{const d=res.kind==='sunk'?0:msg?null:distYd(G.ball,H.cup);G.ctpRes.push(d===null?99:d);if(d!==null&&d<99)G.extraBalls.push({x:G.ball.x,y:G.ball.y,z:H.hAt(G.ball.x,G.ball.y)});
    toast(d===null?'NO SCORE':d===0?'ACE!':fmtFt(d),d===null?'Missed the green complex':H.surfAt(G.ball.x,G.ball.y)===S_GREEN?'On the green':'Off the green',1700)};
  G.onHoled=()=>{G.phase='rest';G.restT=0;G.onRest({kind:'sunk'})};
  G.afterRest=()=>{G.ballsLeft--;if(G.ballsLeft<=0){ctpDone(T);return}G.ball={x:0,y:0,surf:S_TEE};G.strokes=0;setAddress();modeHUD('Closest to the Pin','CTP',`${H.yards} yds · Par 3 · ${esc(c.tees[0].n)} tees`,G.ctpRes.length?fmtFt(Math.min(...G.ctpRes)):'—',bar())};
  G.modeTitle='Closest to the Pin';modeHUD('Closest to the Pin','CTP',`${H.yards} yds · Par 3 · ${esc(c.tees[0].n)} tees`,'—',bar());startIntro()}
function ctpDone(T){const best=Math.min(...G.ctpRes);const R=recLoad();const k=T.key||todayKey();const valid=best<99;
  if(valid){if(R.ctp.best===null||best<R.ctp.best)R.ctp.best=best;if(R.ctp.day[k]===undefined||best<R.ctp.day[k])R.ctp.day[k]=best;recSave(R)}
  G.phase='done';show('scCard',`<div class="pn"><div class="hdr"><h2>Closest to the pin</h2></div><div style="font-weight:800">${esc(T.label)} · ${G.H.yards} yds · wind ${T.wind.mph} mph</div>
   <div class="stt"><div><b>${valid?fmtFt(best):'—'}</b><span>Best today (this go)</span></div><div><b>${R.ctp.day[k]!==undefined?fmtFt(R.ctp.day[k]):'—'}</b><span>Best today</span></div><div><b>${R.ctp.best!==null?fmtFt(R.ctp.best):'—'}</b><span>All-time</span></div></div>
   <div style="font-size:13px;opacity:.85">${G.ctpRes.map((d,i)=>'Ball '+(i+1)+': '+(d<99?fmtFt(d):'no score')).join(' · ')}</div>
   <button class="btn c" id="ca" style="margin-top:12px">Play again</button><button class="btn alt c" id="cm">Main menu</button></div>`);$('ca').onclick=startCtp;$('cm').onclick=leaveToMenu}
// ---- long drive ----
function ldToday(){return{wind:windFor('ld'+todayKey())}}
function startLd(){const T=ldToday();const H=startMode('ld',LD_C,ldGeo(),{grid:1});G.flags=[];G.cupOn=false;G.wind=T.wind;G.allowed=[0];G.club=0;G.ballsLeft=6;G.ldRes=[];G.extraBalls=[];G.target={x:0,y:300};
  G.labels=[];for(let y=200;y<=425;y+=25)G.labels.push({x:-34,y,t:y+'',z:.6});
  const bar=()=>`LONG DRIVE · BALL ${Math.min(6,7-G.ballsLeft)}/6<small>Best ${G.ldRes.filter(x=>x>0).length?Math.max(...G.ldRes)+' yds':'—'} · stay inside the grid</small>`;
  G.onRest=(res,msg)=>{const inG=!msg&&Math.abs(G.ball.x)<=30;const d=inG?Math.round(G.ball.y):0;G.ldRes.push(d);if(inG)G.extraBalls.push({x:G.ball.x,y:G.ball.y,z:H.hAt(G.ball.x,G.ball.y)});toast(inG?d+' yds':'FOUL',inG?'In the grid':'Outside the grid',1700)};
  G.afterRest=()=>{G.ballsLeft--;if(G.ballsLeft<=0){ldDone(T);return}G.ball={x:0,y:0,surf:S_TEE};setAddress();G.target={x:0,y:300};modeHUD('Long Drive','LD','Driver only · wind '+T.wind.mph+' mph',Math.max(0,...G.ldRes)||'—',bar())};
  modeHUD('Long Drive','LD','Driver only · wind '+T.wind.mph+' mph','—',bar());G.ballOn=true;setAddress();G.club=0;updClubs();updHUD()}
function ldDone(T){const best=Math.max(0,...G.ldRes);const R=recLoad();const k=todayKey();if(best>R.ld.best)R.ld.best=best;if(!R.ld.day[k]||best>R.ld.day[k])R.ld.day[k]=best;if(best>R.stats.longest)R.stats.longest=best;recSave(R);
  G.phase='done';show('scCard',`<div class="pn"><div class="hdr"><h2>Long drive</h2></div><div class="stt"><div><b>${best||'—'}</b><span>This set</span></div><div><b>${R.ld.day[k]||'—'}</b><span>Best today</span></div><div><b>${R.ld.best||'—'}</b><span>All-time</span></div></div>
   <div style="font-size:13px;opacity:.85">${G.ldRes.map((d,i)=>'Ball '+(i+1)+': '+(d?d+' yds':'foul')).join(' · ')}</div><button class="btn c" id="la" style="margin-top:12px">Play again</button><button class="btn alt c" id="lmm">Main menu</button></div>`);$('la').onclick=startLd;$('lmm').onclick=leaveToMenu}
/* ================= menu background + init ================= */
function menuBG(){const c=CID['augusta'];if(!G.bgH){G.bgH=buildHole(c,GEO.augusta,11,0,{cupSeed:'menu'})}G.round=null;setHole(G.bgH);G.flags=[{x:G.bgH.cup.x,y:G.bgH.cup.y}];G.ball={x:0,y:0,surf:S_TEE};G.bg=true;G.phase='menu';G.R.tracerN=0;G.extraBalls=null;G.cupOn=true;G.ballOn=false}
function menuCam(dt){const H=G.H,c=H.cup;const a=G.time*.05;const r=150;const ex=c.x+Math.cos(a-1.9)*r,ey=c.y+Math.sin(a-1.9)*r;G.cam={eye:[ex,ey,H.hAt(clamp(ex,H.X0,H.X1),clamp(ey,H.Y0,H.Y1))+22],at:[c.x,c.y,2],fov:.75}}
function init(){
  const cv=$('gl');const R=mkGL(cv);if(!R){document.body.insertAdjacentHTML('beforeend','<div class="screen on"><div class="pn">WebGL2 is required. Try a recent Chrome, Edge, Safari or Firefox.</div></div>');return}
  G.R=R;const mob=Math.min(innerWidth,innerHeight)<700;G.scale=Math.min(devicePixelRatio||1,mob?1.6:2);G.scaleBase=G.scale;G.PXmax=mob?4:8;
  inputInit();fillLM();menuBG();showMenu();requestAnimationFrame(frame)}
const _updCam=updCam;updCam=function(dt){if(G.mode==='menu'){menuCam(dt);return}_updCam(dt)};
/* v1.25: loading screen until the game is ready, then fade out */
function ldrDone(){const l=document.getElementById('ldr');if(!l||l._d)return;l._d=1;l.style.opacity='0';l.style.pointerEvents='none';setTimeout(()=>l.remove(),700)}
window.addEventListener('load',()=>{demInit().then(()=>{try{init()}finally{ldrDone()}},e=>{console.warn(e);try{init()}finally{ldrDone()}})});

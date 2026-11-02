'use strict';
/* ================= tee markers · replays · pass-and-play ================= */
const TEECOL={black:[.07,.07,.08],blue:[.13,.3,.85],silver:[.72,.74,.78],gold:[.92,.72,.14],white:[.95,.95,.95],red:[.85,.14,.12],green:[.14,.58,.22]};
function teeColor(n){const k=String(n||'').toLowerCase();for(const c in TEECOL)if(k.includes(c))return TEECOL[c];
  if(/member|regular|resort/.test(k))return TEECOL.white;return TEECOL.black}// tournament / championship / back sets: black
function setTeeMarks(){const H=G.H;if(!H||G.mode!=='round'){G.teeMarks=null;return}const col=teeColor(H.course.tees[H.teeIdx].n);
  G.teeMarks=[-3.3,3.3].map(x=>({x,y:-.6,z:H.hAt(x,-.6),col}))}

/* ---------- replays (deterministic: replays the recorded trajectory frames) ---------- */
function recordShot(){const a=G.anim;if(!a)return;G.lastShot={H:G.H,aim:G.aim,a:{P:a.P,n:a.n,flightN:a.flightN,put:a.put,land:a.land,from:Object.assign({},a.from),tf:a.tf,res:a.res,ci:a.ci,t:0},lm:G.lm?Object.assign({},G.lm):null};updRepBtn()}
const _execShot=executeShot;executeShot=function(inp){_execShot(inp);if(isMP()&&G.lm&&G.mpH)G.lm.who=G.round.players[G.cur].name;fillLM();recordShot()};
function updRepBtn(){const b=$('bRep');if(b)b.style.display=G.lastShot&&G.lastShot.H===G.H&&G.mode!=='menu'?'':'none'}
function startReplay(){const L=G.lastShot;if(!L||L.H!==G.H||G.phase==='replay'||G.phase==='flight'||G.phase==='swing'||G.phase==='intro')return;
  hideOffer();G.sw=null;G.replay={save:{phase:G.phase,anim:G.anim,cam:G.cam,camMode:G.camMode,ballOn:G.ballOn,tracerOn:G.tracerOn,lm:G.lm},a:Object.assign({},L.a,{t:0}),hold:0,aim:L.aim};
  G.anim=G.replay.a;G.phase='replay';G.ballOn=true;G.tracerOn=!L.a.put;G.cam=null;G.lm=L.lm;$('rpBan').classList.add('on');$('hud').classList.add('fly')}
function endReplay(){const R=G.replay;if(!R)return;G.replay=null;const s=R.save;G.phase=s.phase;G.anim=s.anim;G.cam=s.cam;G.camMode=s.camMode;G.ballOn=s.ballOn;G.tracerOn=s.tracerOn;G.lm=s.lm;G.R.tracerN=0;
  $('rpBan').classList.remove('on');if(G.phase==='address'||G.phase==='putt'){G.cam=null;camSnap()}fillLM();updHUD()}
function replaySpeed(){const R=G.replay,a=R.a,H=G.H,bp=ballAt(a,a.t),d=Math.hypot(bp[0]-H.cup.x,bp[1]-H.cup.y);const late=a.t*60>a.flightN*.8||a.put;return late&&d<(a.put?2.5:12)?.32:1}
function replayTick(dt){const R=G.replay;if(!R)return;const a=R.a;const end=(a.n-1)/60;
  if(a.t<end){a.t=Math.min(end,a.t+dt*replaySpeed())}else{R.hold+=dt;if(R.hold>1.1)endReplay()}}
function replayCam(dt){const R=G.replay,a=R.a,H=G.H;const bp=ballAt(a,a.t);const F=a.from,Ld=a.land||{x:bp[0],y:bp[1]};
  const fz=H.hAt(F.x,F.y),dx=Ld.x-F.x,dy=Ld.y-F.y,dd=Math.hypot(dx,dy)||1,ux=dx/dd,uy=dy/dd,sx=uy,sy=-ux;const fin=[a.P[(a.n-1)*3],a.P[(a.n-1)*3+1]];
  let eye,fov;const fr=a.put?1:clamp(a.t*60/Math.max(1,a.flightN),0,1.5);
  if(a.put){const cx=H.cup.x,cy=H.cup.y,bx=cx-F.x,by=cy-F.y,bl=Math.hypot(bx,by)||1;eye=[cx+bx/bl*2.6+(-by/bl)*.9,cy+by/bl*2.6+(bx/bl)*.9,H.hAt(cx,cy)+.75];fov=.6}
  else if(fr<.16){eye=[F.x-ux*4.2+sx*2.4,F.y-uy*4.2+sy*2.4,fz+1.3];fov=.78}
  else if(fr<.78&&dd>60){const p=clamp((fr-.16)/.62,0,1),px=lerp(F.x,Ld.x,.15+p*.6),py=lerp(F.y,Ld.y,.15+p*.6),off=clamp(dd*.17,14,44);eye=[px+sx*off,py+sy*off,H.hAt(px+sx*off,py+sy*off)+5+(bp[2]-H.hAt(bp[0],bp[1]))*.45];fov=.62}
  else{const ex=fin[0]+ux*15+sx*7,ey=fin[1]+uy*15+sy*7;eye=[ex,ey,H.hAt(ex,ey)+3.2];fov=.5}
  eye[0]=clamp(eye[0],H.X0+2,H.X1-2);eye[1]=clamp(eye[1],H.Y0+2,H.Y1-2);eye[2]=Math.max(eye[2],H.hAt(eye[0],eye[1])+.6);
  const at=[bp[0],bp[1],bp[2]+.2];if(!G.cam){G.cam={eye,at,fov}}else{const k=1-Math.exp(-dt*2.6),k2=1-Math.exp(-dt*9);G.cam.eye=G.cam.eye.map((v,i)=>lerp(v,eye[i],k));G.cam.at=G.cam.at.map((v,i)=>lerp(v,at[i],k2));G.cam.fov=lerp(G.cam.fov,fov,k)}}
const _updCam2=updCam;updCam=function(dt){if(G.phase==='replay'){replayCam(dt);return}_updCam2(dt)};
// great-shot detection -> offer a replay
let offerT=0;function offerReplay(title){$('rpOT').textContent=title;$('rpOffer').classList.add('on');clearTimeout(offerT);offerT=setTimeout(hideOffer,6500)}
function hideOffer(){$('rpOffer').classList.remove('on')}
function topDrive(d){const R=recLoad();R.drives=R.drives||[];const top=R.drives.slice().sort((a,b)=>b-a);const isTop=d>=220&&(top.length<5||d>top[4]);R.drives.push(d);R.drives=R.drives.sort((a,b)=>b-a).slice(0,5);if(mpOwnerUp())recSave(R);return isTop}
const _finishShot=finishShot;finishShot=function(){const a=G.anim,H=G.H;const pre={put:a.put,ci:a.ci,from:Object.assign({},a.from),d0:Math.hypot(a.from.x-H.cup.x,a.from.y-H.cup.y),tee:G.lastPos&&G.lastPos.surf===S_TEE,kind:a.res.kind};
  _finishShot();if(G.mode==='menu')return;let g=null;
  if(pre.kind==='sunk'){if(G.mode==='round'&&G.strokes<=H.par-2)g=G.strokes===1?'Hole in one':G.strokes===H.par-2?'Eagle':'Albatross';else if(!pre.put)g='Holed out';else if(pre.d0*3>30)g=Math.round(pre.d0*3)+' ft putt drained'}
  else if(!pre.put&&pre.d0>=100&&G.ball&&Math.hypot(G.ball.x-H.cup.x,G.ball.y-H.cup.y)*3<=6&&a.res.kind==='rest')g='Stiff · '+Math.max(1,Math.round(Math.hypot(G.ball.x-H.cup.x,G.ball.y-H.cup.y)*3))+' ft';
  else if(pre.ci===0&&pre.tee&&a.res.kind==='rest'&&G.lm&&G.lm.total&&topDrive(Math.round(G.lm.total)))g='Top-5 drive · '+Math.round(G.lm.total)+' yds';
  if(g){G.lastGreat=g;setTimeout(()=>offerReplay(g),pre.kind==='sunk'?1400:700)}};

/* ---------- pass-and-play (1-4 players, stroke play) ---------- */
function ownerName(){return store('ts.owner')||'James'}
function isMP(){return !!(G.round&&G.round.players&&G.round.players.length>1)}
function mpOwnerUp(){return !isMP()||!!(G.round.players[G.cur||0]||{}).owner}
function mpFresh(){return{ball:{x:0,y:0,surf:S_TEE},strokes:0,pen:0,putts:0,hs:{fir:null,gir:false,dr:0},done:false,lm:null}}
function mpHonors(r){const o=(r.order||r.players.map((_,i)=>i)).slice();if(r.i===0)return r.players.map((_,i)=>i);const k=r.i-1;return o.sort((a,b)=>(r.players[a].sc[k]||99)-(r.players[b].sc[k]||99))}
function mpSave(i){if(!G.mpH)return;Object.assign(G.mpH[i],{ball:{x:G.ball.x,y:G.ball.y,surf:G.ball.surf},strokes:G.strokes,pen:G.pen,putts:G.putts,hs:G.hs,lm:G.lm})}
function mpLoad(i){G.cur=i;const s=G.mpH[i];G.ball={x:s.ball.x,y:s.ball.y,surf:s.ball.surf};G.strokes=s.strokes;G.pen=s.pen;G.putts=s.putts;G.hs=s.hs;G.R.tracerN=0;G.lmStage=2;$('third').classList.remove('on');updRepBtn();mpBalls();fillLM()}
function mpBalls(){if(!isMP()){return}clearLabels();const H=G.H;G.extraBalls=[];G.labels=[];G.round.players.forEach((p,i)=>{const s=G.mpH[i];if(i===G.cur||s.done||s.strokes===0)return;G.extraBalls.push({x:s.ball.x,y:s.ball.y,z:H.hAt(s.ball.x,s.ball.y)});G.labels.push({x:s.ball.x,y:s.ball.y,t:p.name,z:1.2})})}
function mpNext(){const r=G.round,H=G.H;const open=r.players.map((_,i)=>i).filter(i=>!G.mpH[i].done);if(!open.length)return-1;
  const onTee=r.order.filter(i=>open.includes(i)&&G.mpH[i].strokes===0);if(onTee.length)return onTee[0];
  let best=-1,bd=-1;for(const i of r.order){if(!open.includes(i))continue;const b=G.mpH[i].ball,d=Math.hypot(b.x-H.cup.x,b.y-H.cup.y);if(!(d<=bd+.01)){bd=isFinite(d)?d:1e9;best=i}}return best<0?open[0]:best}
function mpBanner(){if(!isMP())return;const r=G.round,p=r.players[G.cur],H=G.H,d=Math.hypot(G.ball.x-H.cup.x,G.ball.y-H.cup.y);
  $('mpN').textContent=p.name+' up';$('mpS').textContent=G.strokes===0?(r.i===0||G.cur!==r.order[0]?'On the tee':'Honors · on the tee'):'Shot '+(G.strokes+1)+' · '+(G.ball.surf===S_GREEN?Math.round(d*3)+' ft':Math.round(d)+' yds')+' to the pin';
  const el=$('mpBan');el.classList.add('on');clearTimeout(mpBanner.t);mpBanner.t=setTimeout(()=>el.classList.remove('on'),2300)}
function mpTurn(){const nx=mpNext();if(nx<0)return false;mpLoad(nx);setAddress();updHUD();mpBanner();saveRound();return true}
const _loadRoundHole=loadRoundHole;loadRoundHole=function(rs){G.mpH=null;G.cur=0;_loadRoundHole(rs);G.lastShot=null;updRepBtn();setTeeMarks();const r=G.round;if(!isMP()){G.mpH=null;G.cur=0;return}
  if(G._mpResume){const m=G._mpResume;G._mpResume=null;G.mpH=m.mpH;r.order=m.order||r.order;mpLoad(m.cur);setAddress();mpBanner();return}
  r.order=mpHonors(r);G.mpH=r.players.map(mpFresh);G.cur=r.order[0];mpLoad(G.cur)};
const _endIntro=endIntro;endIntro=function(){_endIntro();if(isMP())mpBanner()};
const _nextAddress=nextAddress;nextAddress=function(){if(!isMP()||G.mode!=='round')return _nextAddress();if(G.phase==='holed')return;
  if(G.strokes>=G.H.par+5){pickUp();return}mpSave(G.cur);mpTurn()};
function mpRecordHole(){const r=G.round,p=r.players[G.cur];p.sc[r.i]=G.strokes;p.pt[r.i]=G.putts;p.fir[r.i]=G.hs.fir;p.gir[r.i]=G.hs.gir;p.dr[r.i]=G.hs.dr;p.pen[r.i]=G.pen;mpSave(G.cur);G.mpH[G.cur].done=true;if(p.owner)r.sc=p.sc,r.pt=p.pt,r.fir=p.fir,r.gir=p.gir,r.dr=p.dr,r.pen=p.pen}
function mpAfterHole(){const r=G.round;if(G.mpH.every(s=>s.done)){store('ts.round',{r,hs:null});const last=r.i>=r.n-1;$('next').textContent=last?'Final results ▸':'Next hole ▸';setTimeout(()=>{$('next').style.display='block'},900);return}
  setTimeout(()=>{if(G.mode==='round'&&G.phase==='holed'||G.phase==='x'){G.ballOn=true;mpTurn()}},2000)}
const _holed=holed;holed=function(){if(!isMP())return _holed();const r=G.round,H=G.H,sc=G.strokes,d=sc-H.par;sfx('cup');
  if(G.lastPos.surf!==S_GREEN&&sc<=H.par-1&&sc-1<=H.par-2)G.hs.gir=true;mpRecordHole();
  if(sc===1&&r.players[G.cur].owner){const R=recLoad();crec(R,r.cid).aces++;R.stats.aces++;recSave(R)}
  toast(r.players[G.cur].name+': '+(sc===1?'Hole in one!':(SNAME[d]||('+'+d))),`${sc} strokes · ${fmtPar(scoreToPar())} total`,2200);G.ballOn=false;updHUD();mpAfterHole()};
const _pickUp=pickUp;pickUp=function(){if(!isMP())return _pickUp();const H=G.H;G.strokes=H.par+5;G.hs.gir=false;mpRecordHole();G.phase='holed';G.ballOn=false;toast(G.round.players[G.cur].name+' picks up','Max score '+G.strokes,2000);updHUD();mpAfterHole()};
const _scoreToPar=scoreToPar;scoreToPar=function(){if(!isMP())return _scoreToPar();const r=G.round,p=r.players[G.cur||0]||r.players[0],P=cpar(CID[r.cid],r.tee);let s=0;for(let i=0;i<p.sc.length;i++)if(p.sc[i])s+=p.sc[i]-P[r.start+i];return s};
const _saveRound=saveRound;saveRound=function(){if(!isMP())return _saveRound();const r=G.round;if(!r||G.mode!=='round')return;mpSave(G.cur);store('ts.round',{r,hs:null,mp:{mpH:G.mpH,cur:G.cur,order:r.order}})};
const _resumeRound=resumeRound;resumeRound=function(sv){if(!(sv.r.players&&sv.r.players.length>1))return _resumeRound(sv);G.round=sv.r;G.mode='round';
  if(!sv.mp||sv.mp.mpH.every(s=>s.done)){nextHole();return}G._mpResume=sv.mp;loadRoundHole(null)};
const _updHUD=updHUD;updHUD=function(){_updHUD();if(isMP()&&G.H&&G.mode==='round'&&G.mpH){const p=G.round.players[G.cur||0];if(!p)return;$('bPar').textContent=p.name.toUpperCase()+' · PAR '+G.H.par+' · '+G.H.yards+' YDS · '+(G.strokes?'SHOT '+(G.strokes+1):'TEE')}};
function lbRows(r){const P=cpar(CID[r.cid],r.tee);return r.players.map((p,i)=>{let tp=0,tot=0,th=0;p.sc.forEach((s,k)=>{if(s){tot+=s;tp+=s-P[r.start+k];th++}});return{i,name:p.name,owner:p.owner,tot,tp,th}}).sort((a,b)=>a.tp-b.tp||b.th-a.th)}
function lbHTML(r){const rows=lbRows(r);let pos=0,last=null;return`<div class="lb">${rows.map((x,k)=>{if(last===null||x.tp!==last){pos=k+1;last=x.tp}return`<div class="lbr${x.i===G.cur&&G.mode==='round'?' cur':''}"><span class="ps">${pos}</span><span class="nm">${esc(x.name)}${x.owner?' <small>(you)</small>':''}</span><span class="th">${x.th?'thru '+x.th:'—'}</span><span class="tp">${x.th?fmtPar(x.tp):'E'}</span><span class="tt">${x.tot||''}</span></div>`}).join('')}</div>`}
function cardHTMLmp(c,tee,start,n,players){const halves=[];for(let h=0;h<18;h+=9){const idx=[];for(let i=h;i<h+9;i++)if(i>=start&&i<start+n)idx.push(i);if(idx.length)halves.push(idx)}
  let out='';for(const idx of halves){const y=c.tees[tee].y,p=cpar(c,tee);const lab=idx[0]<9?'OUT':'IN';
    out+=`<table><tr><th class="l">Hole</th>${idx.map(i=>`<th>${i+1}</th>`).join('')}<th>${lab}</th></tr><tr><td class="l">${esc(c.tees[tee].n)}</td>${idx.map(i=>`<td>${y[i]}</td>`).join('')}<td>${idx.reduce((a,i)=>a+y[i],0)}</td></tr><tr><td class="l">Par</td>${idx.map(i=>`<td>${p[i]}</td>`).join('')}<td>${idx.reduce((a,i)=>a+p[i],0)}</td></tr>`;
    for(const pl of players){const g=i=>pl.sc[i-start];out+=`<tr><td class="l"><b>${esc(pl.name)}</b></td>${idx.map(i=>`<td><span class="${scCls(g(i),p[i])}" style="display:inline-block;min-width:20px;padding:1px">${g(i)||''}</span></td>`).join('')}<td><b>${idx.reduce((a,i)=>a+(g(i)||0),0)||''}</b></td></tr>`}
    out+='</table>'}return out}
const _showCard=showCard;showCard=function(r,live){if(!(r.players&&r.players.length>1))return _showCard(r,live);const c=CID[r.cid];
  show('scCard',`<div class="pn" style="max-width:680px"><div class="hdr"><h2 style="font-size:17px">${esc(c.name)} · ${esc(c.tees[r.tee].n)} tees</h2><button class="ib" id="cx">✕</button></div><div class="sec">Leaderboard</div>${lbHTML(r)}<div class="scr">${cardHTMLmp(c,r.tee,r.start,r.n,r.players)}</div></div>`);$('cx').onclick=()=>hideScreens()};
function recKeyP(name){return'ts.recp.'+name.toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,24)}
const _finishRound=finishRound;finishRound=function(){const r=G.round;if(!isMP())return _finishRound();const c=CID[r.cid];const res=[];
  const CP=cpar(c,r.tee);for(const p of r.players){let par=0,tot=0,fir=[0,0],gir=0;for(let i=0;i<r.n;i++){par+=CP[r.start+i];tot+=p.sc[i]||0;if(CP[r.start+i]>3){fir[1]++;if(p.fir[i])fir[0]++}if(p.gir[i])gir++}
    const rd={d:r.d,t:Date.now(),tee:r.tee,st:r.start,n:r.n,sc:p.sc,pt:p.pt,fir:p.fir,gir:p.gir,dr:p.dr,tot,par,mp:r.players.map(q=>q.name)};
    const key=p.owner?'ts.rec':recKeyP(p.name);const R=p.owner?recLoad():(store(key)||{name:p.name,courses:{},ld:{best:0,day:{}},ctp:{best:null,day:{}},stats:{fw:[0,0],gir:[0,0],aces:0,longest:0,rounds:0}});
    const cr=crec(R,r.cid);cr.rounds.push(rd);if(cr.rounds.length>60)cr.rounds.shift();const ld=Math.max(0,...p.dr.map(x=>x||0));if(ld>cr.ld)cr.ld=ld;if(ld>R.stats.longest)R.stats.longest=ld;
    R.stats.fw[0]+=fir[0];R.stats.fw[1]+=fir[1];R.stats.gir[0]+=gir;R.stats.gir[1]+=r.n;R.stats.rounds++;store(key,R);res.push(rd)}
  if(!r.players[0].owner){}const pl=store('ts.players')||[];for(const p of r.players)if(!p.owner&&!pl.includes(p.name))pl.push(p.name);store('ts.players',pl.slice(-12));
  store('ts.round',null);const rr=r;G.round=null;G.mode='summary';$('hud').classList.remove('on');clearLabels();
  const rows=lbRows(rr);const w=rows[0];
  const s=show('scCard',`<div class="pn" style="max-width:680px"><div class="hdr"><h2>Final results</h2></div><div style="font-size:15px;font-weight:800">${esc(c.name)} · ${esc(c.tees[rr.tee].n)} tees · ${rr.n===18?'18 holes':rr.start?'Back 9':'Front 9'}</div>
   <div class="win">${rows.filter(x=>x.tp===w.tp).map(x=>esc(x.name)).join(' & ')} ${rows.filter(x=>x.tp===w.tp).length>1?'tie':'wins'} · ${w.tot} (${fmtPar(w.tp)})</div>
   ${lbHTML(rr)}<div class="scr">${cardHTMLmp(c,rr.tee,rr.start,rr.n,rr.players)}</div><div class="disc">Records saved per player. Only the profile owner's (you) results count toward My records.</div>
   <button class="btn c" id="sm" style="margin-top:12px">Main menu</button><button class="btn alt c" id="sh">Copy result</button></div>`);$('sm').onclick=leaveToMenu;$('sh').onclick=()=>shareText('Tour Sim · '+c.name+' ('+c.tees[rr.tee].n+'): '+rows.map((x,k)=>(k+1)+'. '+x.name+' '+x.tot+' ('+fmtPar(x.tp)+')').join(' · '),$('sh'))};

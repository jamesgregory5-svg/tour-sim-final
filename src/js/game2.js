'use strict';
/* ================= cameras, loop, input, HUD ================= */
function v3(x,y,z){return[x,y,z]}
function camAddress(){const b=G.ball,H=G.H,h=H.hAt(b.x,b.y),ax=Math.cos(G.aim),ay=Math.sin(G.aim);
  if(G.phase==='putt'||(G.club===PUTTER)){const d=distYd(b,H.cup);
    if(G.view===1){const mx=(b.x+H.cup.x)/2,my=(b.y+H.cup.y)/2,hh=Math.max(7,d*1.25+4);return{eye:v3(mx-ax*hh*.35,my-ay*hh*.35,H.hAt(mx,my)+hh),at:v3(mx,my,H.hAt(mx,my)),fov:.8}}
    const back=clamp(2.4+d*.09,2.4,7),up=clamp(.85+d*.05,.85,3.2);const look=Math.min(d,14);
    return{eye:v3(b.x-ax*back,b.y-ay*back,h+up),at:v3(b.x+ax*look,b.y+ay*look,H.hAt(b.x+ax*look,b.y+ay*look)),fov:.78}}
  if(G.view===1){const r=G.ring||{x:b.x+ax*150,y:b.y+ay*150};const lx=r.x,ly=r.y;const d=Math.hypot(lx-b.x,ly-b.y);return{eye:v3(b.x-ax*25,b.y-ay*25,h+Math.max(30,d*.42)),at:v3(lerp(b.x,lx,.75),lerp(b.y,ly,.75),0),fov:.85}}
  {const dc=Math.hypot(H.cup.x-b.x,H.cup.y-b.y);const tg0=G.ring||(dc<70&&G.club!==PUTTER?{x:H.cup.x,y:H.cup.y}:{x:b.x+ax*150,y:b.y+ay*150});const d0=Math.hypot(tg0.x-b.x,tg0.y-b.y);if(d0<70){// short game (chips, pitches, bunker shots): low natural camera just behind and above the ball
    const bk=3.3+d0*.03,up=1.25+d0*.014,tx=b.x+ax*d0,ty=b.y+ay*d0;const ez=Math.max(h+up,H.hAt(b.x-ax*bk,b.y-ay*bk)+1.1);const gzT=Math.min(H.hAt(tx,ty),H.hAt(H.cup.x,H.cup.y));const pitch=-d0*.035;return{eye:v3(b.x-ax*bk,b.y-ay*bk,ez),at:v3(tx,ty,gzT-pitch),fov:clamp(.66+(70-d0)*.002,.66,.78)}}}// pitched down: green + flag fill the lower-middle of the frame, horizon still in view
  const tgt=G.ring||{x:b.x+ax*150,y:b.y+ay*150};const dd=clamp(Math.hypot(tgt.x-b.x,tgt.y-b.y),30,260);const tx=b.x+ax*dd,ty=b.y+ay*dd;const bk=5.4+dd*.025,up=2.8+dd*.028;return{eye:v3(b.x-ax*bk,b.y-ay*bk,h+up),at:v3(tx,ty,Math.max(H.hAt(tx,ty)+1,h+up-dd*.055)),fov:clamp(2*Math.atan(40/dd),.5,.8)}}
function camSnap(){G.cam=camAddress();G.camT=null}
/* v1.30: smooth camera transitions: eased blend from the previous view instead of a hard cut (skipped for big jumps, e.g. a new hole) */
function camCopy(c){return{eye:c.eye.slice(),at:c.at.slice(),fov:c.fov}}
function easeIO(x){x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10)}
function camBlendFrom(pc,T){G.camBl=null;if(!pc||!G.cam||!pc.eye)return;const d=Math.hypot(pc.eye[0]-G.cam.eye[0],pc.eye[1]-G.cam.eye[1],pc.eye[2]-G.cam.eye[2]);if(d<.05||d>140)return;G.camBl={from:camCopy(pc),t:0,T:T||clamp(.55+d/90,.6,1.4),out:G.cam}}
function camBlendApply(dt,tgt){const B=G.camBl;if(!B)return false;if(G.cam!==B.out){G.camBl=null;return false}/* camera set elsewhere (view toggle, replay, tools): cancel blend */B.t+=dt;const e=easeIO(B.t/B.T);const c={eye:[0,0,0],at:[0,0,0],fov:lerp(B.from.fov,tgt.fov,e)};for(let i=0;i<3;i++){c.eye[i]=lerp(B.from.eye[i],tgt.eye[i],e);c.at[i]=lerp(B.from.at[i],tgt.at[i],e)}if(G.H){const gz=G.H.hAt(c.eye[0],c.eye[1])+1.;if(c.eye[2]<gz)c.eye[2]=gz}G.cam=c;B.out=c;if(B.t>=B.T)G.camBl=null;return true}
function camLerp(c,t,k){for(let i=0;i<3;i++){c.eye[i]=lerp(c.eye[i],t.eye[i],k);c.at[i]=lerp(c.at[i],t.at[i],k)}c.fov=lerp(c.fov,t.fov,k)}
function ballAt(a,t){const f=t*60,i=Math.min(a.n-1,Math.floor(f)),j=Math.min(a.n-1,i+1),u=f-Math.floor(f);const P=a.P;return[lerp(P[i*3],P[j*3],u),lerp(P[i*3+1],P[j*3+1],u),lerp(P[i*3+2],P[j*3+2],u)]}
function landingCam(a){const H=G.H,L=a.land,dx=L.x-a.from.x,dy=L.y-a.from.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
  const fin={x:a.res.x,y:a.res.y};let best=null;
  for(const [fw,sd] of[[26,14],[26,-14],[34,6],[34,-6],[20,22],[20,-22],[40,0],[14,10],[14,-10]]){const ex=clamp(L.x+ux*fw+uy*sd,H.X0+4,H.X1-4),ey=clamp(L.y+uy*fw-ux*sd,H.Y0+4,H.Y1-4);
    let sc=0;const s=H.surfAt(ex,ey);if(s===S_WATER)sc+=50;if(s===S_DEEP||s===S_OB)sc+=8;
    for(const t of H.trees){const td=Math.hypot(t.x-ex,t.y-ey);if(td<t.w*.6+3)sc+=30;else if(td<20){// tree between cam and landing?
        const vx=L.x-ex,vy=L.y-ey,vl=Math.hypot(vx,vy),pr=((t.x-ex)*vx+(t.y-ey)*vy)/vl;if(pr>0&&pr<vl){const perp=Math.abs((t.x-ex)*vy-(t.y-ey)*vx)/vl;if(perp<t.w*.5)sc+=12}}}
    sc+=Math.abs(sd)*.05;if(!best||sc<best.sc)best={sc,ex,ey}}
  const ex=best.ex,ey=best.ey;return{eye:v3(ex,ey,H.hAt(ex,ey)+5),at:v3(L.x,L.y,H.hAt(L.x,L.y)+4),fov:.7}}
/* v1.30: camera heading (yaw) rate limiter: zoom/position unchanged, the view direction turns gradually along the shortest path (no whip on shots/putts) */
function camYawLimit(dt){const c=G.cam;if(!c||!c.eye||!c.at)return;if(G.phase==='intro'||G.phase==='replay'||G.mode==='menu'){G.camYaw=null;return}
  const dx=c.at[0]-c.eye[0],dy=c.at[1]-c.eye[1],dz=c.at[2]-c.eye[2],hd=Math.hypot(dx,dy),D=Math.hypot(hd,dz);if(D<.5)return;const h=Math.atan2(dy,dx),pt=Math.atan2(dz,hd);const Y=G.camYaw;
  if(!Y||Math.hypot(c.eye[0]-Y.ex,c.eye[1]-Y.ey)>140){G.camYaw={h,p:pt,w:0,wp:0,ex:c.eye[0],ey:c.eye[1]};return}
  const lim=(cur,tgt,w,MX,AC,wrap)=>{let e=tgt-cur;if(wrap)e=Math.atan2(Math.sin(e),Math.cos(e));let v=clamp(e*4,-MX,MX);v=w+clamp(v-w,-AC*dt,AC*dt);let st=v*dt;if(Math.sign(st)!==Math.sign(e)&&Math.abs(e)>1e-4)st=0;if(Math.abs(st)>Math.abs(e))st=e;return[cur+st,v]};
  [Y.h,Y.w]=lim(Y.h,h,Y.w,1.4,5,1);[Y.p,Y.wp]=lim(Y.p,pt,Y.wp,.7,2.5,0);Y.ex=c.eye[0];Y.ey=c.eye[1];
  const ch=Math.cos(Y.p)*D;c.at=[c.eye[0]+Math.cos(Y.h)*ch,c.eye[1]+Math.sin(Y.h)*ch,c.eye[2]+Math.sin(Y.p)*D]}
function updCam(dt){updCam0(dt)}
function updCam0(dt){
  const H=G.H;if(!H)return;
  if(G.phase==='intro'){const I=G.intro;I.t+=dt;const T=I.T,f=clamp(I.t/T,0,1);const s=smooth(f)*(H.yards-20);const p=pointAt(H.line,Math.max(0,s-45)),q=pointAt(H.line,Math.min(H.yards,s+130));
    const ht=lerp(48,26,f);const cam={eye:v3(p[0],p[1],H.hAt(p[0],p[1])+ht),at:v3(q[0],q[1],H.hAt(q[0],q[1])),fov:.9};
    if(f>=1){endIntro();return}G.cam=cam;return}
  if(G.phase==='flight'){const a=G.anim;const bp=ballAt(a,a.t);
    /* v1.30: one behind-the-ball follow cam for the whole shot and putt: stays on the shot line behind the ball from address to rest (no angle swing, no landing-cam cut); fast zoom out */
    if(!G.cam)G.cam=camAddress();
    if(!a.fc){const e=G.cam.eye,ax=Math.cos(G.aim),ay=Math.sin(G.aim);const D0=Math.max(1.5,(a.from.x-e[0])*ax+(a.from.y-e[1])*ay);a.fc={ax,ay,D0,h0:e[2]-H.hAt(e[0],e[1]),f0:G.cam.fov,at0:G.cam.at.slice(),dir0:(()=>{const v=[G.cam.at[0]-e[0],G.cam.at[1]-e[1],G.cam.at[2]-e[2]],l=Math.hypot(...v)||1;return v.map(x=>x/l)})()}}
    const F=a.fc,u=easeIO(a.t/(a.put?.5:.7));const bz=H.hAt(bp[0],bp[1]),air=Math.max(0,bp[2]-bz);
    const D=lerp(F.D0,a.put?4.5:13,u);let ex=bp[0]-F.ax*D,ey=bp[1]-F.ay*D;const gz=H.hAt(ex,ey);
    const zt=a.put?gz+1.6:Math.max(gz+2.2,bp[2]-2.5+Math.min(air,6)*.25);let ez=lerp(gz+F.h0,zt,u);ez=Math.max(ez,gz+(a.put?.9:1.6));
    G.cam.eye=[ex,ey,ez];{const ta=[bp[0]+F.ax*(a.put?1.5:5),bp[1]+F.ay*(a.put?1.5:5),a.put?bp[2]:bp[2]+.4];/* look direction blends from the address view (no pitch snap) */let ua=Math.max(F.ua||0,easeIO(a.t/(a.put?.6:.4)));const d0=F.dir0.slice(),d1=[ta[0]-ex,ta[1]-ey,ta[2]-ez];const l0=Math.hypot(...d0)||1,l1=Math.hypot(...d1)||1;const bd=[bp[0]-ex,bp[1]-ey,bp[2]-ez],bl=Math.hypot(...bd)||1;if(F.off0===undefined){const dl0=Math.hypot(...d0)||1;F.off0=Math.acos(Math.min(1,(d0[0]*bd[0]+d0[1]*bd[1]+d0[2]*bd[2])/dl0/bl))}const cth=Math.cos(Math.max(.26,(F.off0+.03)*(1-easeIO(a.t/(a.put?.6:.55)))));let dv;for(let it=0;it<60;it++){dv=[0,1,2].map(i=>lerp(d0[i]/l0,d1[i]/l1,ua));const dl=Math.hypot(...dv)||1;if((dv[0]*bd[0]+dv[1]*bd[1]+dv[2]*bd[2])/dl/bl>cth||ua>=1)break;ua=Math.min(1,ua+.02)}F.ua=ua;/* keep the ball within ~15 deg of centre */G.cam.at=[ex+dv[0]*l1,ey+dv[1]*l1,ez+dv[2]*l1]}G.cam.fov=lerp(F.f0,a.put?G.cam.fov:.72,u);return}
  if(G.phase==='address'||G.phase==='putt'||G.phase==='swing'){const t=camAddress();if(!G.cam)G.cam=t;if(G.camBl&&camBlendApply(dt,t))return;camLerp(G.cam,t,1-Math.exp(-dt*9));return}
  if(G.phase==='holed'||G.phase==='rest'){if(G.cam){const t=G.cam;t.at=t.at.slice()}}}
function startIntro(){const H=G.H;G.phase='intro';G.intro={t:0,T:clamp(3+H.yards/160,3.6,6.5)};
  const c=H.course;const isR=G.mode==='round';const n=H.hi+1;
  $('introC').innerHTML=`<div class="n">${isR?'HOLE '+n:G.modeTitle||''}${isR&&H.name?' · '+esc(H.name):''}</div><h2>${isR?'Par '+H.par+' · '+H.yards+' yds':esc(c.name)}</h2><p>${esc(isR?c.name:(H.name||''))}${H.sig?' — '+esc(H.sig):''}</p>${G.wind?`<p>Wind ${G.wind.mph} mph</p>`:''}<div class="sk">TAP TO SKIP</div>`;
  $('intro').classList.add('on');$('hud').classList.add('intro');G.ballOn=false;G.R.tracerN=0;updHUD()}
function endIntro(){$('intro').classList.remove('on');$('hud').classList.remove('intro');G.ballOn=true;setAddress();if(G.mode==='round')saveRound()}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ---------- frame loop ----------
const PERF={ft:[],js:[],n:0,acc:0,lowAt:0};
function frame(now){requestAnimationFrame(frame);const _t0=performance.now();
  const dt=Math.min(.05,(now-(G.last||now))/1000)*(G.ts||1);G.last=now;G.time+=dt;
  PERF.ft.push(dt*1000);if(PERF.ft.length>240)PERF.ft.shift();
  if(!G.H||G.mode==='menu'&&!G.bg){return}
  // keyboard swing progress
  swingTick();
  // animation
  if(G.phase==='flight'){const a=G.anim;const tfAdj=a.put?1:1;a.t+=dt*tfAdj;splashChk();// v1.18: before finishShot can switch to 'pen'
    if(!a.landed&&a.t*60>=a.flightN-1&&!a.put){a.landed=true;showThird(1)}
    if(a.t*60>=a.n-1){a.t=(a.n-1)/60;G.phase='rest';G.restT=0;finishShot();if(!a.put)showThird(2)}}
  else if(G.phase==='rest'){G.restT+=dt;if(G.restT>(G.anim&&G.anim.put?.8:1.7)){if(G.mode==='round'||G.restHandler===undefined){G.phase='x';(G.afterRest||nextAddress)()}}}
  if(G.phase==='replay')replayTick(dt);
  splashTick(dt);
  updCam(dt);
  {const hv=(G.phase==='address'||G.phase==='swing')&&swingHintOn()?1:0;const he=$('hint');if(he.style.opacity!=hv)he.style.opacity=hv;const fl=G.phase==='flight'||G.phase==='rest'||G.phase==='holed'||G.phase==='replay';const hu=$('hud');if(hu.classList.contains('fly')!==fl)hu.classList.toggle('fly',fl)}
  // compose scene
  const S={teeMarks:G.mode==='round'?G.teeMarks:null,time:G.time,cup:G.cupOn===false?null:G.H.cup,flags:(typeof pinHidden==='function'&&pinHidden())?[]:G.flags,ball:{x:0,y:0},ballShadow:0,ballOn:G.ballOn!==false,putt:0,extraBalls:G.extraBalls};
  let bp;if((G.phase==='flight'||G.phase==='rest'||G.phase==='holed'||G.phase==='replay')&&G.anim){bp=ballAt(G.anim,G.anim.t)}else{const b=G.ball;bp=[b.x,b.y,G.H.hAt(b.x,b.y)]}
  if(G.phase==='holed')S.ballOn=false;
  S.ballPos=bp;S.ball={x:bp[0],y:bp[1]};const gz=G.H.hAt(bp[0],bp[1]);const hz=bp[2]-gz;S.ballShadow=clamp(1-hz/40,0,1)*.9;S.ballShadowR=.07+hz*.004;
  if(G.phase==='address'&&G.ball.surf===S_TEE&&G.club<9){S.tee={x:G.ball.x,y:G.ball.y,z:gz};S.ballPos=[bp[0],bp[1],bp[2]+.025]}
  if(G.phase==='address'||G.phase==='swing'){if(G.ringDirty)calcRing();if(G.ring){const r=G.ring;S.ring=[r.x,r.y,r.r,.9];S.aim=[G.ball.x,G.ball.y,r.x,r.y]}}
  if(G.phase==='putt'){S.putt=1;const ft=(G.sw&&G.sw.ft)||0;const d=(ft>0?ft:distYd(G.ball,G.H.cup)*3)/3;S.aim=[G.ball.x,G.ball.y,G.ball.x+Math.cos(G.aim)*d,G.ball.y+Math.sin(G.aim)*d]}
  if(G.phase==='flight'&&G.anim.put)S.putt=.5;
  if((G.phase==='flight'||G.phase==='replay')&&G.anim&&(G.tracerOn||G.anim.put)){// trail = the ball's real sampled path (flight, then roll / putt break), head pinned to the interpolated ball position
    const a=G.anim;const k=Math.min(a.n,2999,Math.floor(a.t*60)+2);if(k>=2){const tmp=a.P.subarray(0,k*3).slice();tmp[(k-1)*3]=bp[0];tmp[(k-1)*3+1]=bp[1];tmp[(k-1)*3+2]=bp[2];glTracer(G.R,tmp,k,G.cam.eye,1,a.put?0:(a.flightN||k),G.H)}}
  S.tracerHead=1;S.ballBoost=1;
  resize();glDraw(G.R,G.cam,S);
  G.VP=G.R.lastVP;
  if(G.labels)drawLabels();
  drawMeter();drawMini(bp);
  // fps / auto resolution
  PERF.js.push(performance.now()-_t0);if(PERF.js.length>600)PERF.js.shift();
  if(++PERF.n%30===0){const a=PERF.ft.slice(-90);const avg=a.reduce((x,y)=>x+y,0)/a.length;if(G.debug)$('fps').textContent=Math.round(1000/avg)+' fps';
    const base=G.scaleBase||G.scale,floor=Math.max(1,base*.75);if(G.holeAt===undefined)G.holeAt=now;
    if(now-G.holeAt>4000&&avg>24&&G.scale>floor&&now-PERF.lowAt>3000){G.scale=Math.max(floor,G.scale*.9);PERF.lowAt=now}
    else if(avg<14&&G.scale<base&&now-PERF.lowAt>5000){G.scale=Math.min(base,G.scale*1.1);PERF.lowAt=now}}}
function resize(){const c=G.R.canvas,s=G.scale||1;const w=Math.round(innerWidth*s),h=Math.round(innerHeight*s);if(c.width!==w||c.height!==h){c.width=w;c.height=h}}
function nextAddress(){if(G.phase==='holed')return;if(G.mode==='round'){if(G.strokes>=G.H.par+5&&G.phase!=='holed'){pickUp();return}saveRound()}setAddress()}
// ---------- landing ring ----------
function calcRing(){G.ringDirty=false;const b=G.ball;if(G.club===PUTTER){G.ring=null;return}let pw=G.club===G.rec.ci?(G.rec.pwPhys||G.rec.pw):1;if(typeof chipPhysForRing==='function'){const q=chipPhysForRing();if(q!==null)pw=q}
  const r=simShot(G.club,pw,b.surf,G.wind,G.shape,G.traj,G.aim,b.x,b.y);const F=r.F;G.ring={x:F.lx,y:F.ly,r:clamp(1.5+F.carry*.025,1.5,8),carry:F.carry}}
// ---------- HUD ----------
function showThird(stage){G.lmStage=stage;const lm=G.lm;if(!lm||lm.putt!==undefined&&G.anim&&G.anim.put)return;$('tLab').textContent=lm.shape||'SHOT';$('tCarry').textContent=Math.round(lm.carry);$('tTot').textContent=stage>1?Math.round(lm.total):'—';$('tBs').textContent=Math.round(lm.ball);
  $('third').classList.add('on');clearTimeout(G.thT);G.thT=setTimeout(()=>$('third').classList.remove('on'),stage>1?3600:6000);fillLM()}
function fillLM(){const l=G.lm;const st=G.lmStage===undefined?2:G.lmStage;const D='—',P='…';const has=l&&l.ball;const who=l&&l.who?l.who.toUpperCase()+' · ':'';
  const yd=v=>Math.round(v)+' yds';const rows=[['Ball speed',has?Math.round(l.ball)+' mph':D],['Club speed',has?Math.round(l.cs)+' mph':D],['Smash',has?l.smash.toFixed(2):D],['Launch',has?l.launch.toFixed(1)+'°':D],['Spin',has?Math.round(l.spin)+' rpm':D],
    ['Carry',has?(st>=1?yd(l.carry):P):D],['Total',has?(st>=2?yd(l.total):P):D],['Side',has?(st>=2?(Math.abs(l.side)<.5?'0 yds':(l.side>0?'R ':'L ')+Math.abs(l.side).toFixed(0)+' yds'):P):D],['Apex',has?(st>=1?Math.round(l.apex*3)+' ft':P):D]];
  $('lmRows').innerHTML=rows.map(r=>`<div class="r"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');$('lmShape').textContent=has&&st>=1&&l.shape?who+l.shape+(l.name?' · '+l.name:''):has?who+(l.name||''):'—'}
function updHUD(){const H=G.H;if(!H)return;const b=G.ball;const isR=G.mode==='round';
  $('bHn').textContent=isR?H.hi+1:G.modeShort||'—';$('bName').textContent=isR?H.course.name:(G.modeTitle||'');$('bPar').textContent=isR?`${H.name?String(H.name).toUpperCase()+' · ':''}PAR ${H.par} · ${H.yards} YDS · ${G.strokes?('SHOT '+(G.strokes+1)):'TEE'}`:(G.modeSub||'');
  $('bSc').textContent=isR?fmtPar(scoreToPar()):(G.modeScore||'—');
  const ci=G.club;$('sClub').textContent=CN[ci];const d=distYd(b,G.target||H.cup);const onG=b.surf===S_GREEN||ci===PUTTER;
  const tg=G.target||H.cup,ev=elevTo(tg),pl=Math.round(d+ev);
  $('sDist').innerHTML=onG?Math.round(d*3)+'<small> ft</small>':Math.round(d)+'<small> yds</small>'+'<div class="pl">plays '+pl+(Math.abs(ev*3)>=3?' · '+Math.abs(ev*3).toFixed(0)+' ft '+(ev>0?'up':'down'):' · level')+'</div>';
  $('sLie').innerHTML=(b.surf===S_TEE?'Tee':SURF[b.surf])+' <small>'+Math.round(LIE[b.surf]*100)+'%</small>'+(onG||b.surf===S_TEE?'':'<div class="pl">'+lieText()+'</div>');
  const w=G.wind||{mph:0,x:0,y:0};$('sWind').textContent=w.mph;const rel=Math.atan2(w.y,w.x)-G.aim;$('wArr').style.transform=`rotate(${(-rel*180/Math.PI+90).toFixed(0)}deg)`;
  const pu=G.phase==='putt';$('putt').style.display=pu?'block':'none';
  for(const id of['meter','strike','shape','hint'])$(id).classList.toggle('hide',pu||G.phase==='intro');
  $('rec').innerHTML=G.rec?'Recommended: <b>'+recText()+'</b>':'';$('rec').classList.toggle('hide',pu||G.phase==='intro');
  if(pu){$('pInfo').textContent='CUP '+Math.round(d*3)+' FT · TAP TO START · TAP TO STRIKE';G.puttMax=puttMaxFor(G.ball,G.H);$('pCup').style.left=clamp(d*3/G.puttMax*100,0,100)+'%'}
  fillLM()}
function recText(){const r=G.rec,b=G.ball;if(!r||r.ci===PUTTER)return r?r.txt:'';const c=clubCarry(r.ci,r.pwPhys||r.pw,b.surf===S_GREEN?S_FW:b.surf,G.wind||{x:0,y:0},G.aim);
  const extra=/lay up/.test(r.txt)?' · lay up':(G.recForced&&r.ci<13?' · must carry':G.recFront&&r.ci<13?' · '+G.recFront+' to front':'');return CN[r.ci]+(r.pw<.99?' '+Math.round(r.pw*100)+'%':'')+' · '+Math.round(c.carry)+' carry / '+Math.round(c.total)+' total'+extra}
function updClubs(){const b=G.ball;const el=$('clubs');const allowed=G.allowed||CN.map((_,i)=>i);
  el.innerHTML=allowed.map(ci=>{let sm='';if(ci<13&&G.wind){const c=clubCarry(ci,1,b.surf===S_GREEN?S_FW:b.surf,G.wind,G.aim);sm=Math.round(c.carry)}else sm='putt';
    return`<button data-c="${ci}" class="${ci===G.club?'sel':''} ${G.rec&&ci===G.rec.ci?'rec':''}">${CN[ci]}<small>${sm}</small></button>`}).join('');G.ringDirty=true}
function scoreToPar(){const r=G.round;if(!r)return 0;let s=0;for(let i=0;i<r.sc.length;i++)if(r.sc[i])s+=r.sc[i]-cpar(CID[r.cid],r.tee)[r.start+i];return s}
// ---------- meter drawing ----------
function drawMeter(){const c=$('meter');if(c.classList.contains('hide'))return;const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);
  const lo=-.22,hi=1.15,cx=W*.98,cy=H*.5,R=H*.44,a0=Math.PI*.62,a1=Math.PI*1.38;
  const ang=v=>lerp(a1,a0,(clamp(v,lo,hi)-lo)/(hi-lo));// bottom = low values
  const arc=(v0,v1,col,w)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.arc(cx,cy,R,ang(v1),ang(v0));g.stroke()};
  g.lineCap='butt';arc(lo,hi,'rgba(6,10,12,.78)',34);arc(lo,hi,'rgba(255,255,255,.10)',20);arc(1,hi,'rgba(255,80,60,.55)',20);
  arc(-.06,.06,'rgba(255,210,74,.55)',20);arc(-.025,.025,'rgba(63,224,176,1)',20);
  const tick=(v,col,len,w)=>{const a=ang(v);g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(cx+Math.cos(a)*(R-len),cy+Math.sin(a)*(R-len));g.lineTo(cx+Math.cos(a)*(R+len),cy+Math.sin(a)*(R+len));g.stroke()};
  tick(0,'#fff',24,5);
  const chip=typeof chipOn==='function'&&chipOn();const rp=chip?(G.club===G.rec.ci?G.rec.pw:chipMeterPw()):G.club===(G.rec&&G.rec.ci)?G.rec.pw:1;tick(rp,'#3fe0b0',22,6);
  for(let v=.25;v<1.01;v+=.25)tick(v,'rgba(255,255,255,.5)',12,2);
  const s=G.sw;let val=0,label='';
  if(s&&!s.putt){const tn=swNow();/* v1.30: meter drawn from the exact time each frame (smooth, no stepping); timing unchanged */if(s.phase==='up'){s.pow=Math.min(1.15,swValue(s,tn));val=s.pow;const gr=g.createLinearGradient(0,H,0,0);gr.addColorStop(0,'#3fe0b0');gr.addColorStop(.75,'#ffd24a');gr.addColorStop(1,'#ff6a4a');g.lineCap='round';g.strokeStyle=gr;g.lineWidth=12;g.beginPath();g.arc(cx,cy,R,ang(s.pow),ang(lo+.001));g.stroke();{const ah=ang(s.pow),hx=cx+Math.cos(ah)*R,hy=cy+Math.sin(ah)*R,rg=g.createRadialGradient(hx,hy,0,hx,hy,18);rg.addColorStop(0,'rgba(255,255,255,.95)');rg.addColorStop(.35,'rgba(255,240,200,.55)');rg.addColorStop(1,'rgba(255,240,200,0)');g.fillStyle=rg;g.beginPath();g.arc(hx,hy,18,0,TAU);g.fill();}label=chip?Math.round(s.pow*G.chip.max)+' YD':Math.round(s.pow*100)+'%'}
    else{tick(s.pow,'#ffd24a',26,7);const v=s.phase==='down'?Math.max(-.22,swValue(s,tn)):(s.cur!==undefined?s.cur:s.pow);for(let k=3;k>=1;k--){const vg=Math.min(s.pow,v+k*.018*(s.k||1));const ag=ang(vg);g.fillStyle='rgba(255,255,255,'+(.22-.06*k)+')';g.beginPath();g.arc(cx+Math.cos(ag)*R,cy+Math.sin(ag)*R,13-k*2,0,TAU);g.fill();}const a=ang(v);g.fillStyle='#fff';g.beginPath();g.arc(cx+Math.cos(a)*R,cy+Math.sin(a)*R,13,0,TAU);g.fill();g.strokeStyle='#000';g.lineWidth=3;g.stroke();label=chip?Math.round(s.pow*G.chip.max)+' YD':Math.round(s.pow*100)+'%'}}
  else if(chip)label=Math.round(rp*G.chip.max)+' YD';else if(G.lastSw)label=Math.round(G.lastSw.pow*100)+'%';
  g.fillStyle='#fff';g.font='900 46px Helvetica,Arial,sans-serif';g.textAlign='right';g.textBaseline='alphabetic';g.fillText(label||'0%',W*.99,H*.99);
  g.font='900 19px Helvetica,Arial,sans-serif';g.textAlign='left';g.fillStyle='rgba(255,255,255,.9)';
  g.fillText(chip?'CHIP · FULL '+G.chip.max+' YD':'POWER',8,H*.1);g.fillStyle='#3fe0b0';g.fillText('SWEET',8,H*.86);g.fillText('SPOT',8,H*.86+21);
  const ph=$('hintT');if(ph){const t=!s?'TAP, CLICK OR PRESS SPACE TO SWING':s.phase==='up'?'TAP TO SET POWER':'TAP ON THE WHITE LINE';if(ph.textContent!==t)ph.textContent=t}
  // strike panel
  const sc=$('strikeC'),q=sc.getContext('2d');const w=200,h=140;q.clearRect(0,0,w,h);
  const wood=G.club<4;q.fillStyle=wood?'#2b3238':'#9aa3aa';q.strokeStyle='rgba(255,255,255,.85)';q.lineWidth=3;
  q.beginPath();if(q.roundRect)q.roundRect(14,14,172,112,wood?52:16);else q.rect(14,14,172,112);q.fill();q.stroke();
  if(!wood){q.strokeStyle='rgba(0,0,0,.25)';q.lineWidth=2;for(let i=1;i<7;i++){q.beginPath();q.moveTo(34,14+i*16);q.lineTo(166,14+i*16);q.stroke()}}
  q.strokeStyle='#3fe0b0';q.lineWidth=3;q.beginPath();q.arc(100,70,12,0,TAU);q.stroke();
  q.fillStyle='rgba(255,255,255,.75)';q.font='800 15px Helvetica,Arial,sans-serif';q.textAlign='left';q.fillText('HEEL',20,120);q.textAlign='right';q.fillText('TOE',180,120);
  const l=G.lm;if(l&&l.sx!==undefined){q.fillStyle='#ffd24a';q.beginPath();q.arc(100+l.sx*70,70-l.sy*45,11,0,TAU);q.fill();q.strokeStyle='#000';q.lineWidth=3;q.stroke();
    $('tempo').textContent=l.ratio?l.ratio.toFixed(2)+' : 1'+(Math.abs(l.ratio/SW_TEMPO-1)<.15?' · IDEAL':''):'—';$('acc').textContent=l.err===undefined?'—':Math.abs(l.err)<.025?'PERFECT':Math.abs(l.err)<.06?(l.err>0?'EARLY':'LATE'):(l.err>0?'V. EARLY':'V. LATE');
    $('fF').textContent=fmtDeg(l.face)+(Math.abs(l.face)<.5?'':l.face>0?' OPEN':' SHUT');$('fP').textContent=fmtDeg(l.path)+(Math.abs(l.path)<.5?'':l.path>0?' IN-OUT':' OUT-IN')}}
const fmtDeg=v=>(v>0?'+':'')+v.toFixed(1)+'°';
// ---------- mini map ----------
function drawMiniBase(){const H=G.H,src=G.R.hole.mini;const c=document.createElement('canvas');c.width=120;c.height=180;const g=c.getContext('2d');g.fillStyle='#163a22';g.fillRect(0,0,120,180);
  const s=Math.min(116/H.W,176/H.H);G.mini={c,s,ox:(120-H.W*s)/2,oy:(180-H.H*s)/2};g.drawImage(src,G.mini.ox,G.mini.oy,H.W*s,H.H*s)}
function drawMini(bp){const m=G.mini;if(!m)return;const g=$('mini').getContext('2d'),H=G.H;g.drawImage(m.c,0,0);const P=(x,y)=>[m.ox+(x-H.X0)*m.s,m.oy+(H.Y1-y)*m.s];
  const b=P(bp[0],bp[1]);if(G.ring&&(G.phase==='address')){const r=P(G.ring.x,G.ring.y);g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=1.2;g.setLineDash([3,3]);g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(r[0],r[1]);g.stroke();g.setLineDash([]);g.beginPath();g.arc(r[0],r[1],3,0,TAU);g.stroke()}
  for(const f of G.flags||[]){const c=P(f.x,f.y);g.fillStyle=f.col?'rgb('+f.col.map(v=>Math.round(v*255)).join(',')+')':'#ff3b30';g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=.8;g.strokeRect(c[0]-1,c[1]-7,2,7);g.strokeRect(c[0],c[1]-7,5,3);g.fillRect(c[0]-1,c[1]-7,2,7);g.fillRect(c[0],c[1]-7,5,3)}
  g.fillStyle='#fff';g.strokeStyle='#000';g.beginPath();g.arc(b[0],b[1],2.6,0,TAU);g.fill();g.stroke()}
// ---------- labels (range flags etc) ----------
function project(x,y,z){const M=G.R.lastVP;if(!M)return null;const X=M[0]*x+M[4]*y+M[8]*z+M[12],Y=M[1]*x+M[5]*y+M[9]*z+M[13],W=M[3]*x+M[7]*y+M[11]*z+M[15];if(W<=0)return null;return[(X/W*.5+.5)*innerWidth,(1-(Y/W*.5+.5))*innerHeight]}
function drawLabels(){for(const L of G.labels){const p=project(L.x,L.y,G.H.hAt(L.x,L.y)+(L.z||3.4));if(!L.el){L.el=document.createElement('div');L.el.style.cssText='position:fixed;z-index:4;pointer-events:none;font:900 12px Helvetica,Arial,sans-serif;letter-spacing:.06em;background:rgba(8,14,18,.7);padding:2px 6px;border-radius:6px;transform:translate(-50%,-100%);white-space:nowrap';L.el.textContent=L.t;document.body.appendChild(L.el)}
  if(!p||G.phase==='intro'){L.el.style.display='none';continue}L.el.style.display='';L.el.style.left=p[0]+'px';L.el.style.top=p[1]+'px'}}
function clearLabels(){for(const L of G.labels||[])if(L.el)L.el.remove();G.labels=null}

// putt meter range: the flat-green scale (unchanged on normal putts), raised only when a full-power putt could not climb out of a hollow / up a steep bank toward the cup
function puttFlatMax(b,H){const d=Math.hypot(H.cup.x-b.x,H.cup.y-b.y);return Math.max(20,Math.ceil(d*3*1.6/5)*5)}
function puttReach(b,H,ft){const d=Math.hypot(H.cup.x-b.x,H.cup.y-b.y);const hd=Math.atan2(H.cup.y-b.y,H.cup.x-b.x);const r=puttRoll(b.x,b.y,hd,puttSpeedFor(ft/3),H.surfAt,H.slopeAt,H.cup,null);if(r.kind==='sunk'||!Number.isFinite(r.x))return 0;return 1-((r.x-b.x)*Math.cos(hd)+(r.y-b.y)*Math.sin(hd))/Math.max(d,.01)}// fraction of the way still to go (<=0: reached or past the hole)
function puttMaxFor(b,H){const m0=puttFlatMax(b,H);const d=Math.hypot(H.cup.x-b.x,H.cup.y-b.y);if(d<2)return m0;
  try{if(puttReach(b,H,m0*.9)<.45)return m0;// a 90% stroke on the normal scale already gets past halfway: nothing to fix
    let lo=m0,hi=m0;for(let i=0;i<6&&puttReach(b,H,hi)>=.45;i++)hi*=1.8;if(puttReach(b,H,hi)>=.45)return Math.min(600,Math.ceil(hi/5)*5);
    for(let i=0;i<10;i++){const m=(lo+hi)/2;if(puttReach(b,H,m)<.45)hi=m;else lo=m}let r=Math.min(600,Math.max(m0,Math.ceil(hi*1.3/5)*5));
    if(puttReach(b,H,r*1.15)>=.8){for(const k of [1.5,2,3,4,6,9,14,20]){const m=Math.min(600,m0*k);if(puttReach(b,H,m)<.45&&puttReach(b,H,m*1.3)<.8){r=Math.min(600,Math.ceil(m*1.3/5)*5);break}}}// non-monotonic hollows: scan for a stroke that really gets out
    return r}catch(e){return m0}}

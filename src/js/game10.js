/* chip mode: inside ~60 yds off the green with a wedge, the meter maps to distance (full = 1.3x the shot), like the putt meter */
function chipCandidate(){const b=G.ball,H=G.H;if(!H||!b||G.club===PUTTER)return false;if(b.surf===S_TEE||b.surf===S_GREEN||b.surf===S_SAND||b.surf===S_WATER)return false;return true}
function chipOn(){return !!(G.chip&&G.club>=8&&G.club<PUTTER&&chipCandidate())}
function chipEst(ci,q){const b=G.ball,t=curTarget(),H=G.H;const dir=Math.atan2(t.y-b.y,t.x-b.x);const sf=b.surf===S_GREEN?S_FW:b.surf;
  try{// simulate on the real green (speed + slope) from the ball, so fast/sloped greens don't run chips past the pin
    const r=simShot(ci,q,sf,G.wind||{x:0,y:0},0,0,dir,b.x,b.y);const rr=groundRoll(Object.assign({},r.F),H.surfAt,H.slopeAt,null,null);const d=(rr.x-b.x)*Math.cos(dir)+(rr.y-b.y)*Math.sin(dir);if(Number.isFinite(d))return d}catch(e){}
  const cc=clubCarry(ci,q,sf,G.wind||{x:0,y:0},dir);return cc.carry+(cc.total-cc.carry)*.6}
function chipPhys(ci,yds){const b=G.ball,k=ci+'|'+yds.toFixed(1)+'|'+b.x.toFixed(2)+','+b.y.toFixed(2)+'|'+G.aim.toFixed(2);if(!chipPhys.c||chipPhys.n++>4000){chipPhys.c={};chipPhys.n=0}if(chipPhys.c[k]!==undefined)return chipPhys.c[k];return chipPhys.c[k]=chipPhys0(ci,yds)}
function chipPhys0(ci,yds){let lo=.02,hi=1.12;if(chipEst(ci,hi)<yds)return hi;for(let k=0;k<16;k++){const m=(lo+hi)/2;if(chipEst(ci,m)<yds)lo=m;else hi=m}return (lo+hi)/2}
function chipSetup(){G.chip=null;if(!chipCandidate()||!G.rec||G.rec.ci===PUTTER)return;const t=curTarget(),d=playsLike(t);if(!(d>2)||d>60)return;
  G.chip={max:Math.max(12,Math.ceil(d*1.3/5)*5),d};
  if(G.rec.ci>=8){G.rec.pwPhys=chipPhys(G.rec.ci,d);G.rec.pw=clamp(Math.round(d/G.chip.max*100)/100,.05,1.1)}}
function chipMeterPw(){return G.rec&&G.rec.ci>=8?G.rec.pw:clamp(G.chip.d/G.chip.max,.05,1.1)}
const _recommendC=recommend;recommend=function(){_recommendC.apply(this,arguments);try{chipSetup()}catch(e){G.chip=null}};
const _executeShotC=executeShot;executeShot=function(inp){if(inp&&chipOn()&&Number.isFinite(inp.power)){inp=Object.assign({},inp);const yd=clamp(inp.power,0,1.15)*G.chip.max;inp.power=Math.max(.02,chipPhys(G.club,yd));inp.chipYds=yd}return _executeShotC(inp)};
function chipPhysForRing(){if(!chipOn())return null;const mp=G.club===G.rec.ci?G.rec.pw:chipMeterPw();return chipPhys(G.club,mp*G.chip.max)}
/* keep the left panel, club rail and recommendation in sync whenever the ball is moved while at address */
const _setAddressK=setAddress;setAddress=function(){const r=_setAddressK.apply(this,arguments);const b=G.ball;if(b)G._addrKey=b.x.toFixed(2)+','+b.y.toFixed(2)+','+(G.H&&G.H.hi)+','+(G.H&&G.H.course&&G.H.course.id);return r};
setInterval(()=>{try{if(!G.H||!G.ball||!G.ballOn||(G.phase!=='address'&&G.phase!=='putt')||G.sw)return;const b=G.ball;const k=b.x.toFixed(2)+','+b.y.toFixed(2)+','+G.H.hi+','+(G.H.course&&G.H.course.id);if(k!==G._addrKey)setAddress()}catch(e){}},250);

/* pin flag colour by pin position on the green along the line of play: red = front third, white = middle, blue = back */
const PIN_COLS={front:[.86,.12,.1],middle:[.97,.97,.95],back:[.13,.36,.92]};
function pinInfo(H){try{const L=H.line,e=L[L.length-1];let a=L[Math.max(0,L.length-2)];if(Math.hypot(e[0]-a[0],e[1]-a[1])<1)a=[0,0];let ux=e[0]-a[0],uy=e[1]-a[1];const l=Math.hypot(ux,uy)||1;ux/=l;uy/=l;
  let lo=1e9,hi=-1e9;for(let y=Math.floor(H.cup.y-60);y<H.cup.y+60;y+=.75)for(let x=Math.floor(H.cup.x-60);x<H.cup.x+60;x+=.75){if(x<=H.X0||x>=H.X1||y<=H.Y0||y>=H.Y1)continue;if(H.surfAt(x,y)!==S_GREEN)continue;const d=x*ux+y*uy;if(d<lo)lo=d;if(d>hi)hi=d}
  if(!(hi>lo+2))return{loc:'middle',col:PIN_COLS.middle,t:.5};const t=(H.cup.x*ux+H.cup.y*uy-lo)/(hi-lo);const loc=t<1/3?'front':t<2/3?'middle':'back';return{loc,col:PIN_COLS[loc],t}}catch(e){return{loc:'middle',col:PIN_COLS.middle,t:.5}}}
const _updHUDpin=updHUD;updHUD=function(){_updHUDpin.apply(this,arguments);try{const el=$('sDist');if(!el||!G.H)return;const f=(G.flags||[]).find(q=>q.pin);if(!f||G.mode!=='round'||G.ball.surf===S_GREEN)return;const loc=pinInfo.cache===G.H?pinInfo.v:(pinInfo.cache=G.H,pinInfo.v=pinInfo(G.H));
  if(!el.querySelector('.pinc')){const sp=document.createElement('div');sp.className='pl pinc';el.appendChild(sp)}const sp=el.querySelector('.pinc');sp.innerHTML='<i style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;background:rgb('+loc.col.map(v=>Math.round(v*255)).join(',')+')"></i>'+loc.loc+' pin'}catch(e){}};
/* versioned save schema: migrate older saves in place, never discard records; drop only a saved round that can no longer be resumed */
const SAVE_SCHEMA=2;
const SAVE_MIGRATIONS={
  2:()=>{// v1.0-v1.11 -> 2: normalise records shape, validate the saved round against the current course list
    const R=store('ts.rec');if(R&&typeof R==='object'){R.courses=R.courses&&typeof R.courses==='object'?R.courses:{};R.ld=R.ld||{best:0,day:{}};R.ctp=R.ctp||{best:null,day:{}};
      R.stats=Object.assign({fw:[0,0],gir:[0,0],aces:0,longest:0,rounds:0},R.stats||{});store('ts.rec',R)}
    const sv=store('ts.round');if(sv&&(!sv.r||!CID[sv.r.cid]||!Array.isArray(sv.r.sc)||!(sv.r.i>=0&&sv.r.i<(sv.r.n||18))))store('ts.round',null)}};
function migrateSaves(){try{let v=+(localStorage.getItem('ts.schema')||1);if(!(v>=1))v=1;for(let k=v+1;k<=SAVE_SCHEMA;k++){if(SAVE_MIGRATIONS[k])SAVE_MIGRATIONS[k]()}if(v!==SAVE_SCHEMA)localStorage.setItem('ts.schema',String(SAVE_SCHEMA))}catch(e){}}
migrateSaves();
/* address camera clearance: lift the eye until the sight line to the landing area clears the terrain (no hillside filling the frame) */
function camClearance(c){const H=G.H,b=G.ball;if(!c||!H||G.phase==='putt'||G.club===PUTTER||G.view===1)return c;const tgt=G.ring||{x:b.x+Math.cos(G.aim)*150,y:b.y+Math.sin(G.aim)*150};
  const ex=c.eye[0],ey=c.eye[1],ez=c.eye[2],lx=tgt.x,ly=tgt.y,lz=H.hAt(lx,ly)+1;let need=ez;
  for(let s=.08;s<.96;s+=.04){const x=ex+(lx-ex)*s,y=ey+(ly-ey)*s;const zt=(x>H.X0&&x<H.X1&&y>H.Y0&&y<H.Y1?H.hAt(x,y):H.demAt(x,y))+1.6;const req=(zt-s*lz)/(1-s);if(req>need)need=req}
  need=Math.min(need,ez+30);if(need>ez+.05){const dz=need-ez;c.eye[2]=need;c.at[2]+=dz*.35;G.camLift=dz}else G.camLift=0;return c}
const _camAddressC=camAddress;camAddress=function(){return camClearance(_camAddressC.apply(this,arguments))};
/* HUD scales up on large viewports (1920x1080 and up) so it isn't tiny; 1x at <=1366x768 */
function uiScale(){const s=Math.max(1,Math.min(1.45,Math.min(innerWidth/1366,innerHeight/768)));const hud=document.getElementById('hud');if(!hud)return;G.uiScale=s;for(const el of hud.children){if(el.id==='gl')continue;el.style.zoom=s===1?'':String(Math.round(s*100)/100)}}
addEventListener('resize',uiScale);setTimeout(uiScale,0);

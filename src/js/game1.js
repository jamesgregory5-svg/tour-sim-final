'use strict';
/* ================= core game ================= */
const CN=CLUBS.map(c=>c.id);
const G={mode:'menu',phase:'none',time:0,cam:null,shape:0,traj:0,club:0,aim:0,view:0,lm:null,anim:null,R:null,H:null};
const CID={};COURSES.forEach(c=>CID[c.id]=c);
const SHAPES=[{f:0,p:0,n:'STRAIGHT'},{f:1.5,p:5.5,n:'DRAW'},{f:-1.5,p:-5.5,n:'FADE'}];
function recLoad(){return store('ts.rec')||{courses:{},ld:{best:0,day:{}},ctp:{best:null,day:{}},stats:{fw:[0,0],gir:[0,0],aces:0,longest:0,rounds:0}}}
function recSave(r){store('ts.rec',r)}
function crec(r,cid){return r.courses[cid]=r.courses[cid]||{rounds:[],aces:0,ld:0}}
// ---------- simulation helpers ----------
const SIMBUF={s:new Float32Array(4000)},SIMREC=new Float32Array(6000);
function simShot(ci,power,surf,wind,shape,traj,dir,x,y){const sh=SHAPES[shape];const L=launchFrom(ci,{power,face:sh.f,path:sh.p,dLoft:traj*4},surf);const F=flyBall(L,x,y,dir,wind,SIMBUF);return{L,F}}
const carryCache={};
function clubCarry(ci,power,surf,wind,dir){const k=ci+'|'+power.toFixed(2)+'|'+surf+'|'+wind.x.toFixed(1)+'|'+wind.y.toFixed(1)+'|'+dir.toFixed(2);if(carryCache[k])return carryCache[k];
  const r=simShot(ci,power,surf,wind,0,0,dir,0,0);const F=r.F;const along=F.lx*Math.cos(dir)+F.ly*Math.sin(dir);const g=Math.max(.04,Math.min(1,1-(F.desc-25)/28))*(1-Math.min(.6,F.wb/RPM/20000));
  const rr=groundRoll(Object.assign({},F),()=>S_FW,()=>({x:0,y:0}),null,null);const roll=Math.hypot(rr.x-F.lx,rr.y-F.ly);return carryCache[k]={carry:along,total:along+roll,F}}
function windFor(seed){const R=RNG('w'+seed);const sp=R()<.15?R.range(0,2):R.range(2,R()<.25?16:11);const a=R()*TAU;return{x:Math.cos(a)*sp*MPS,y:Math.sin(a)*sp*MPS,mph:Math.round(sp),a}}
function distYd(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
// ---------- hole lifecycle ----------
function setHole(H,flags){G.H=H;G.holeAt=performance.now();const mt=Math.min(8192,(G.R&&G.R.gl&&G.R.gl.getParameter(G.R.gl.MAX_TEXTURE_SIZE))||4096);const px=Math.min(G.PXmax,mt/H.W,mt/H.H);glSetHole(G.R,H,px);G.flags=flags||[{x:H.cup.x,y:H.cup.y,col:pinInfo(H).col,pin:1}];drawMiniBase()}
/* slope at the ball relative to the aim: up = uphill degrees (+ uphill), side = ball above feet degrees (+ above, right-handed) */
function lieInfo(){const H=G.H,b=G.ball;if(!H||!H.gradAt)return null;const g=H.gradAt(b.x,b.y),ax=Math.cos(G.aim),ay=Math.sin(G.aim);
  const up=Math.atan(g[0]*ax+g[1]*ay)*180/Math.PI,side=Math.atan(g[0]*ay-g[1]*ax)*180/Math.PI;return{up,side}}
function lieText(){const l=lieInfo();if(!l)return'';const p=[];if(Math.abs(l.up)>=1.5)p.push((l.up>0?'Uphill ':'Downhill ')+Math.abs(l.up).toFixed(0)+'°');if(Math.abs(l.side)>=1.5)p.push('Ball '+(l.side>0?'above':'below')+' feet '+Math.abs(l.side).toFixed(0)+'°');return p.length?p.join(' · '):'Flat lie'}
function elevTo(t){const H=G.H,b=G.ball;return H.hAt(t.x,t.y)-H.hAt(b.x,b.y)}
function playsLike(t){const d=distYd(G.ball,t);return d+elevTo(t)}
function curTarget(){return G.target||G.H.cup}
function recommend(){G.recForced=false;G.recFront=0;
  const H=G.H,b=G.ball,tgt=curTarget();const d=b.surf===S_GREEN?distYd(b,tgt):playsLike(tgt);
  if(b.surf===S_GREEN||(b.surf===S_FRINGE&&d<25)){G.rec={ci:PUTTER,pw:1,txt:'Putter'};return}
  const dir=Math.atan2(tgt.y-b.y,tgt.x-b.x);let pick=-1;const list=[];
  for(let ci=0;ci<13;ci++){if(ci===0&&b.surf!==S_TEE)continue;const c=clubCarry(ci,1,b.surf,G.wind,dir);list.push([ci,c])}
  // tee shots on par4/5: driver unless the hole line says lay up (simplified: target = point on line)
  if(G.mode==='round'&&b.surf===S_TEE&&H.par>3){const c0=clubCarry(0,1,S_TEE,G.wind,dir);G.rec={ci:0,pw:1,txt:'Driver · '+Math.round(c0.total)+' yds'};
    // lay up if water/hazard crosses the fairway near driver landing
    const ls=c0.total;const p=pointAt(H.line,Math.min(ls,H.yards-30));const s=H.surfAt(p[0],p[1]);if(s===S_WATER){for(const [ci,c] of list){const q=pointAt(H.line,c.total);if(H.surfAt(q[0],q[1])!==S_WATER&&c.total<ls-15){G.rec={ci,pw:1,txt:CN[ci]+' · lay up'};break}}}
    return}
  // forced carry: water or sand between the ball and the target -> pick by carry, not by total
  const D0=distYd(b,tgt),elv=d-D0;let haz=0;for(let t=12;t<D0-1;t+=1.5){const x=b.x+Math.cos(dir)*t,y=b.y+Math.sin(dir)*t,s=H.surfAt(x,y);if(s===S_WATER||s===S_DEEP||s===S_SAND)haz=t}
  const forced=haz>0&&haz>D0*.45;let needC=forced?Math.max(d-4,haz+elv+8):0;G.recForced=forced;
  // carry to the front of the green when there is trouble short of it, or when the green sits uphill (no forward roll to count on)
  if(D0>60&&!forced){let front=-1;for(let t=D0*.4;t<D0+.1;t+=1){const s=H.surfAt(b.x+Math.cos(dir)*t,b.y+Math.sin(dir)*t);if(s===S_GREEN||s===S_FRINGE){front=t;break}}
    if(front>0){let tr=false;for(let t=Math.max(12,front-35);t<front;t+=1.5){const s=H.surfAt(b.x+Math.cos(dir)*t,b.y+Math.sin(dir)*t);if(s!==S_FW&&s!==S_FRINGE&&s!==S_GREEN&&s!==S_TEE){tr=true;break}}
      const frontPL=front+elv;if(tr||elv>4){needC=Math.max(frontPL+2,elv>4?d-8:0);G.recFront=Math.round(frontPL)}}}
  for(let i=list.length-1;i>=0;i--){const [ci,c]=list[i];if(needC>0&&!forced?(c.carry>=needC&&c.carry+(c.total-c.carry)*.5>=d-4):forced?c.carry>=needC+2:c.carry+(ci<4?(c.total-c.carry)*.5:(c.total-c.carry)*.6)>=d){pick=i;break}}
  if(pick<0){const [ci,c]=list[0];G.rec={ci,pw:1,txt:CN[ci]+' · '+Math.round(c.carry)+' carry'};return}
  // prefer the next-shorter club at full power when it gets within a few yards, rather than backing off a longer one; no driver off a par-3 tee unless nothing else gets there
  {const est=(c,fc)=>{const e=c.carry+(c.total-c.carry)*.5-d;return forced?c.carry-needC:fc?Math.min(c.carry-needC,e):e};const tol=(list[pick][0]===0&&H.par===3)?8:4;
    while(pick+1<list.length&&list[pick][0]<8){const nx=list[pick+1][1];if(est(nx,needC>0)>=-tol+(needC>0?-1:0)&&(needC<=0||nx.carry>=needC-3))pick++;else break}}
  const [ci,c]=list[pick];let pw=1;
  if(ci>=8){// partial wedge power by bisection
    let lo=.2,hi=1;for(let k=0;k<14;k++){const m=(lo+hi)/2,cc=clubCarry(ci,m,b.surf,G.wind,dir);if((forced?cc.carry-needC-2:cc.carry+(cc.total-cc.carry)*.6-d)<0)lo=m;else hi=m}pw=Math.round(hi*100)/100}
  else{// longer clubs: back off power so the expected (carry + half roll) matches the plays-like number
    const est=q=>{const cc=clubCarry(ci,q,b.surf,G.wind,dir);const e=cc.carry+(ci<4?(cc.total-cc.carry)*.5:(cc.total-cc.carry)*.6)-d;return forced?cc.carry-needC:needC>0?Math.min(cc.carry-needC,e+8):e};
    if(est(1)>8){let lo=.8,hi=1;if(est(lo)>0)hi=lo;else for(let k=0;k<12;k++){const m=(lo+hi)/2;if(est(m)<0)lo=m;else hi=m}pw=Math.round(hi*100)/100}}
  G.rec={ci,pw,txt:CN[ci]+(pw<.99?' · '+Math.round(pw*100)+'% power':'')}}
function defaultAim(){const H=G.H,b=G.ball;let t=curTarget();
  if(G.mode==='round'&&b.surf===S_TEE&&H.par>3&&G.club!==PUTTER){const c=clubCarry(G.club,1,S_TEE,G.wind,Math.PI/2);const s=Math.min(c.total,H.yards-40);const p=pointAt(H.line,Math.max(s,30));t={x:p[0],y:p[1]};
    // aim at the middle of the fairway at that distance (never along a shoreline)
    const q=pointAt(H.line,Math.max(s,30)+3),dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;let best=null;
    for(let a=-35;a<=35;a++){const x=p[0]+nx*a,y=p[1]+ny*a;if(H.surfAt(x,y)!==S_FW)continue;let b=a;while(b<60&&H.surfAt(p[0]+nx*(b+1),p[1]+ny*(b+1))===S_FW)b++;const mid=(a+b)/2;if(!best||Math.abs(mid)<Math.abs(best))best=mid;a=b}
    if(best!==null){const d=Math.hypot(p[0]+nx*best-b.x,p[1]+ny*best-b.y);t={x:p[0]+nx*best,y:p[1]+ny*best}}
    else{// no fairway straight across from the line point: search the landing arc (driver distance, +-35 deg) for the nearest fairway, so the aim and camera find the real landing zone
      const base=Math.atan2(p[1]-b.y,p[0]-b.x);let bs=1e9;for(let da=-35;da<=35;da+=1.5)for(let r=Math.max(30,s-60);r<=s+10;r+=4){const a=base+da*Math.PI/180,x=b.x+Math.cos(a)*r,y=b.y+Math.sin(a)*r;if(H.surfAt(x,y)!==S_FW)continue;
        const sc=Math.hypot(x-p[0],y-p[1])+Math.abs(r-s)*.4;if(sc<bs){bs=sc;t={x,y}}}}}
  G.aim=Math.atan2(t.y-b.y,t.x-b.x)}
function setAddress(fromShot){
  const b=G.ball;b.surf=G.H.surfAt(b.x,b.y);G.phase=b.surf===S_GREEN?'putt':'address';
  recommend();G.club=G.rec.ci;if(G.phase==='putt')G.club=PUTTER;else if(G.club===PUTTER){if(b.surf===S_FRINGE||b.surf===S_FW)G.phase='putt';else{G.club=9}}// putter off the green = putt mode (never a full swing with the putter)
  defaultAim();G.puttFt=0;G.sw=null;
  const pc=G.cam;G.cam=null;updClubs();updHUD();if(G.phase==='putt')G.view=0;camSnap();camBlendFrom(pc)}
function afterLoad(){setAddress()}
// ---------- swing ----------
function shotPower(){return G.sw?G.sw.pow:0}
function doSwing(res){// res: {power,ratio,dx}
  const R=RNG(Date.now()+'');const ratio=res.ratio;const e=Math.abs(Math.log(clamp(ratio,.3,12)/3));
  const tq=clamp(1-e*.55,0,1);const sx=clamp(gauss(R)*.11*(1+2.6*e)+(res.side||0)*.35,-1,1),sy=clamp(gauss(R)*.09*(1+2*e)-(res.power>1.04?.25*(res.power-1)*10:0),-1,1);
  const dev=clamp(res.dev||0,-30,30);const sh=SHAPES[G.shape];
  const face=sh.f+dev*.35+gauss(R)*.6*(.4+e),path=sh.p+dev*.2+gauss(R)*.8*(.4+e);
  let power=res.power;if(res.slow)power*=.9;
  executeShot({power,tempoQ:tq,sx,sy,face,path,dLoft:G.traj*4,ratio})}
function executeShot(inp){
  const b=G.ball,H=G.H;const ci=G.club;const surf=b.surf;const h0=H.hAt(b.x,b.y);
  G.strokes++;G.lastPos={x:b.x,y:b.y,surf};
  if(ci===PUTTER){if(!Number.isFinite(inp.ft)){// putter reached the full-swing path: convert the meter power to a putt length
      const d=Math.hypot(H.cup.x-b.x,H.cup.y-b.y)*3;inp={ft:clamp(Number.isFinite(inp.power)?inp.power:.5,0,1.15)*(G.puttMax||Math.max(20,d*1.6)),err:clamp(Number.isFinite(inp.err)?inp.err*.5:0,-.2,.2)}}
    return executePutt(inp)}
  const lie=lieInfo();if(lie){inp.dLoft=(inp.dLoft||0)+lie.up*.9;inp.face=(inp.face||0)-lie.side*.7;inp.path=(inp.path||0)-lie.side*.35;if(Math.abs(lie.side)>2||lie.up<-2)inp.power*=1-Math.min(.05,(Math.abs(lie.side)+Math.max(0,-lie.up))*.005)}
  const L=launchFrom(ci,inp,surf);const S=new Float32Array(4000);const out={s:S,gz:(x,y)=>H.hAt(x,y)-h0};const F=flyBall(L,b.x,b.y,G.aim,G.wind,out);
  // tree collision + visual heights
  const hL=H.hAt(F.lx,F.ly);let n=F.n,tree=null;const P=new Float32Array(9000);let m=0;
  for(let i=0;i<n;i++){const x=S[i*3],y=S[i*3+1],z=S[i*3+2];const zg=z+h0;
    if(i>3&&x>H.X0&&x<H.X1&&y>H.Y0&&y<H.Y1){const t=H.treeHit(x,y,zg-H.hAt(x,y));if(t){tree={t,i,x,y,z:zg};break}}
    P[m++]=x;P[m++]=y;P[m++]=zg}
  let res,flightN=m/3;const rec=new Float32Array(9000);
  if(tree){// drop under tree
    const RR=RNG(Date.now()+'t');const ax=Math.cos(G.aim),ay=Math.sin(G.aim);const fx=tree.x-ax*(1+RR()*2)+RR.range(-1.5,1.5),fy=tree.y-ay*(1+RR()*2)+RR.range(-1.5,1.5);
    const steps=Math.max(6,Math.round(Math.sqrt(2*Math.max(.5,tree.z-H.hAt(fx,fy))/9.81/YD)*60));const z0=tree.z;for(let k=1;k<=steps;k++){const f=k/steps;P[m++]=lerp(tree.x,fx,f);P[m++]=lerp(tree.y,fy,f);P[m++]=lerp(z0,H.hAt(fx,fy),f*f)}flightN=m/3;
    const F2={lx:fx,ly:fy,hx:ax,hy:ay,vh:2,vz:-5,wb:50,desc:70};res=groundRoll(F2,H.surfAt,H.slopeAt,H.cup,rec);res.tree=1}
  else res=groundRoll(F,H.surfAt,H.slopeAt,H.cup,rec);
  // append roll
  const rn=res.n||0;for(let i=0;i<rn;i++){const x=rec[i*3],y=rec[i*3+1];P[m++]=x;P[m++]=y;P[m++]=H.hAt(x,y)+rec[i*3+2]}
  const total=Math.hypot(res.x-b.x,res.y-b.y);
  const lm={ball:L.ball,smash:L.smash,launch:L.launch,spin:L.spin,carry:tree?Math.hypot(tree.x-b.x,tree.y-b.y):F.carry,total,side:F.side,apex:F.apex,shape:shapeLabel(L,F),sx:inp.sx,sy:inp.sy,err:inp.err,face:L.face,path:L.path,ratio:inp.ratio,name:CN[ci],cs:L.club};
  lm.side=((res.x-b.x)*Math.sin(G.aim)-(res.y-b.y)*Math.cos(G.aim));
  G.lm=lm;G.anim={P,n:m/3,flightN,t:0,res,land:{x:tree?tree.x:F.lx,y:tree?tree.y:F.ly},from:{x:b.x,y:b.y,z:h0},apex:F.apex,tf:flightN/60,put:false,ci};
  safeAnim();G.phase='flight';G.camMode='follow';G.ring=null;G.tracerOn=true;sfx('hit',L.smash);G.lmStage=0;fillLM();
  if(G.onShot)G.onShot(lm,res)}
function safeAnim(){// cut the animation at the first non-finite sample and keep the result finite
  const A=G.anim,P=A.P;let n=A.n;for(let i=0;i<n;i++)if(!Number.isFinite(P[i*3])||!Number.isFinite(P[i*3+1])||!Number.isFinite(P[i*3+2])){n=i;break}
  if(n<1){P[0]=A.from.x;P[1]=A.from.y;P[2]=G.H.hAt(A.from.x,A.from.y);n=1}
  if(n<A.n){A.n=n;A.flightN=Math.min(A.flightN,n);A.tf=A.flightN/60;console.warn('non-finite shot path trimmed')}
  if(!Number.isFinite(A.res.x)||!Number.isFinite(A.res.y)){A.res=Object.assign({},A.res,{kind:A.res.kind==='sunk'?'rest':A.res.kind,x:P[(n-1)*3],y:P[(n-1)*3+1]})}}
function shapeLabel(L,F){const s=F.side,ax=L.axis,st=L.start;const sideW=Math.abs(s);
  if(Math.abs(ax)<2.5&&Math.abs(st)<1.2)return'STRAIGHT';
  const curve=ax<0?'DRAW':'FADE';if(Math.abs(ax)>14)return ax<0?(st<-1.5?'PULL HOOK':'HOOK'):(st>1.5?'PUSH SLICE':'SLICE');
  if(st>1.5&&ax>0)return'PUSH FADE';if(st<-1.5&&ax<0)return'PULL DRAW';if(st>1.5&&ax<-2.5)return'DRAW';if(st<-1.5&&ax>2.5)return'FADE';return curve}
function executePutt(inp){const b=G.ball,H=G.H;const ft=Number.isFinite(inp.ft)?Math.max(0,inp.ft):1;const v=puttSpeedFor(ft/3)*(1+(inp.err||0));
  const R=RNG(Date.now()+'p');const hd=G.aim+gauss(R)*.003*(1+ft/25);const rec=new Float32Array(9000);const res=puttRoll(b.x,b.y,hd,v,H.surfAt,H.slopeAt,H.cup,rec);
  const P=new Float32Array(9000);let m=0;P[m++]=b.x;P[m++]=b.y;P[m++]=H.hAt(b.x,b.y);for(let i=0;i<res.n;i++){const x=rec[i*3],y=rec[i*3+1];P[m++]=x;P[m++]=y;P[m++]=H.hAt(x,y)}
  const lastX=m>3?P[m-3]:b.x,lastY=m>3?P[m-2]:b.y;G.anim={P,n:m/3,flightN:1,t:0,res,land:{x:Number.isFinite(res.x)?res.x:lastX,y:Number.isFinite(res.y)?res.y:lastY},from:{x:b.x,y:b.y},put:true,ci:PUTTER};safeAnim();G.phase='flight';G.camMode='putt';G.tracerOn=false;G.lm=Object.assign({},G.lm||{},{putt:ft});sfx('putt');
  if(G.onShot)G.onShot(null,res)}
function finishShot(){
  const a=G.anim,res=a.res,b=G.ball,H=G.H;let msg=null;
  if(res.kind==='sunk'){b.x=H.cup.x;b.y=H.cup.y;G.phase='holed';if(G.onHoled)G.onHoled();return}
  if(res.kind==='water'){// drop where the ball last crossed land along the flight line
    const land=a.land||{x:res.x,y:res.y};const lx=Number.isFinite(land.x)?land.x:a.from.x,ly=Number.isFinite(land.y)?land.y:a.from.y;const fx=a.from.x,fy=a.from.y;let px=lx,py=ly;const L=Math.hypot(lx-fx,ly-fy);
    for(let s=0;s<L;s+=1){const t=s/L;const x=lerp(lx,fx,t),y=lerp(ly,fy,t);const sf=H.surfAt(x,y);if(sf!==S_WATER&&sf!==S_OB){const x2=lerp(lx,fx,Math.min(1,(s+2.5)/L)),y2=lerp(ly,fy,Math.min(1,(s+2.5)/L));px=x2;py=y2;break}}
    if(H.surfAt(px,py)===S_WATER||H.surfAt(px,py)===S_OB){px=a.from.x;py=a.from.y}
    b.x=px;b.y=py;G.strokes++;G.pen++;msg=['WATER','Penalty · +1 stroke · drop']}
  else if(res.kind==='ob'||H.surfAt(res.x,res.y)===S_OB){b.x=a.from.x;b.y=a.from.y;G.strokes++;G.pen++;msg=['OUT OF BOUNDS','Stroke and distance · +1']}
  else{b.x=res.x;b.y=res.y}
  if(!Number.isFinite(b.x)||!Number.isFinite(b.y)){// safety net: never leave the ball at a non-finite spot
    const lp=G.lastPos&&Number.isFinite(G.lastPos.x)&&Number.isFinite(G.lastPos.y)?G.lastPos:a.from;b.x=Number.isFinite(lp.x)?lp.x:0;b.y=Number.isFinite(lp.y)?lp.y:0;
    if(G.lm)for(const k of['carry','total','side','apex'])if(G.lm[k]!==undefined&&!Number.isFinite(G.lm[k]))G.lm[k]=0;console.warn('ball position was not finite; restored')}
  b.surf=H.surfAt(b.x,b.y);
  if(G.onRest)G.onRest(res,msg);
  if(msg)toast(msg[0],msg[1],1800);}
// ---------- toasts / audio ----------
let toastT=0;function toast(b,s,ms){$('tB').textContent=b;$('tS').textContent=s||'';$('tS').style.display=s?'':'none';$('toast').classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>$('toast').classList.remove('on'),ms||1600)}
let AC=null;function sfx(k,q){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);
  if(k==='hit'){const n=AC.createBufferSource(),buf=AC.createBuffer(1,AC.sampleRate*.08,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*.12));n.buffer=buf;const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=2200+(q||1.4)*900;n.connect(f);f.connect(AC.destination);n.start(t);o.frequency.value=900;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+.07)}
  else if(k==='putt'){o.frequency.value=520;o.type='triangle';g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.0001,t+.1)}
  else if(k==='cup'){o.frequency.value=330;o.type='sine';g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.frequency.exponentialRampToValueAtTime(160,t+.3)}
  else if(k==='splash'){if(AC.state==='suspended')AC.resume();// v1.18: water splash, synthesized offline: noise burst through a falling low-pass + a short 'bloop'
    const L=Math.floor(AC.sampleRate*.75),buf=AC.createBuffer(1,L,AC.sampleRate),d=buf.getChannelData(0);for(let i=0;i<L;i++){const e=i/L;d[i]=(Math.random()*2-1)*Math.min(1,i/(AC.sampleRate*.006))*Math.exp(-e*5.5)}
    const n=AC.createBufferSource();n.buffer=buf;const f=AC.createBiquadFilter();f.type='lowpass';f.Q.value=.8;f.frequency.setValueAtTime(3800,t);f.frequency.exponentialRampToValueAtTime(260,t+.6);const ng=AC.createGain();ng.gain.value=.32*(q||1);n.connect(f);f.connect(ng);ng.connect(AC.destination);n.start(t);n.stop(t+.75);
    o.type='sine';o.frequency.setValueAtTime(620,t+.04);o.frequency.exponentialRampToValueAtTime(170,t+.2);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.12*(q||1),t+.06);g.gain.exponentialRampToValueAtTime(.0001,t+.24);SPL.snd++}
  else{o.frequency.value=700;g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.0001,t+.05)}
  o.start(t);o.stop(t+.4)}catch(e){}}

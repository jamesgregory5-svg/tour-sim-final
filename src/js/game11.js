/* crowd + ambient course sound, fully synthesized with WebAudio (offline, no files). Crowd volume setting: ts.crowd 0..3 */
const CROWD_LV=[0,.35,.7,1];
const CRW={on:false,amb:null,master:null,nb:null};
function crowdLevel(){const v=store('ts.crowd');return CROWD_LV[v===null||v===undefined?2:clamp(+v|0,0,3)]}
function crAC(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function crNoise(){const ac=crAC();if(!ac)return null;if(CRW.nb)return CRW.nb;const n=ac.sampleRate*4,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);let b0=0,b1=0,b2=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;b0=.997*b0+w*.029;b1=.985*b1+w*.032;b2=.95*b2+w*.048;d[i]=(b0+b1+b2+w*.02)*.9}CRW.nb=b;return b}// pinkish noise
function crMaster(){const ac=crAC();if(!ac)return null;if(!CRW.master){CRW.master=ac.createGain();CRW.master.connect(ac.destination)}CRW.master.gain.setTargetAtTime(crowdLevel(),ac.currentTime,.1);return CRW.master}
function crSrc(loop){const ac=crAC(),s=ac.createBufferSource();s.buffer=crNoise();s.loop=!!loop;s.loopStart=0;s.loopEnd=4;return s}
/* ambient bed: breeze (low-passed noise with slow gusts), distant gallery murmur, occasional birds */
function ambStart(){const ac=crAC(),m=crMaster();if(!ac||!m||CRW.amb)return;const A={};const t=ac.currentTime;
  const br=crSrc(true),lp=ac.createBiquadFilter(),g=ac.createGain(),lfo=ac.createOscillator(),lg=ac.createGain();lp.type='lowpass';lp.frequency.value=420;g.gain.value=.05;lfo.frequency.value=.07;lg.gain.value=.03;lfo.connect(lg);lg.connect(g.gain);br.connect(lp);lp.connect(g);g.connect(m);br.start(t,Math.random()*3);lfo.start(t);
  const mu=crSrc(true),bp=ac.createBiquadFilter(),bp2=ac.createBiquadFilter(),g2=ac.createGain(),l2=ac.createOscillator(),lg2=ac.createGain();bp.type='bandpass';bp.frequency.value=380;bp.Q.value=1.4;bp2.type='lowpass';bp2.frequency.value=900;g2.gain.value=.018;l2.frequency.value=.13;lg2.gain.value=.008;l2.connect(lg2);lg2.connect(g2.gain);mu.connect(bp);bp.connect(bp2);bp2.connect(g2);g2.connect(m);mu.start(t,Math.random()*3);l2.start(t);
  A.nodes=[br,lfo,mu,l2];A.gain=[g,g2];A.bird=setInterval(()=>{if(Math.random()<.55)bird()},3200);CRW.amb=A}
function ambStop(){const A=CRW.amb;if(!A)return;clearInterval(A.bird);for(const n of A.nodes)try{n.stop()}catch(e){}CRW.amb=null}
function bird(){const ac=crAC(),m=crMaster();if(!ac||!m||crowdLevel()===0)return;const t=ac.currentTime+.05,n=2+(Math.random()*4|0),f0=2600+Math.random()*1800,pan=ac.createStereoPanner?ac.createStereoPanner():null;
  for(let i=0;i<n;i++){const o=ac.createOscillator(),g=ac.createGain(),s=t+i*(.09+Math.random()*.06);o.type='sine';o.frequency.setValueAtTime(f0*(1+Math.random()*.1),s);o.frequency.exponentialRampToValueAtTime(f0*(1.25+Math.random()*.3),s+.05);o.frequency.exponentialRampToValueAtTime(f0*.9,s+.08);
    g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.012,s+.01);g.gain.exponentialRampToValueAtTime(.0001,s+.09);o.connect(g);if(pan){pan.pan.value=Math.random()*1.6-.8;g.connect(pan)}else g.connect(m);o.start(s);o.stop(s+.12)}if(pan)pan.connect(m)}
/* applause: a crowd of independent clappers, each a short band-passed noise burst */
function applause(size,dur){const ac=crAC(),m=crMaster();if(!ac||!m||crowdLevel()===0)return;const t=ac.currentTime+.05;const sr=ac.sampleRate,len=Math.floor(sr*dur),b=ac.createBuffer(2,len,sr);
  const clappers=Math.round(12+size*70);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let k=0;k<clappers;k++){const rate=3.2+Math.random()*2.2,ph=Math.random(),st=Math.random()*.25*dur,en=dur*(.55+Math.random()*.45);
      for(let tt=st+ph/rate;tt<en;tt+=1/rate*(.9+Math.random()*.2)){const i0=Math.floor(tt*sr),a=.5+Math.random()*.5;for(let i=0;i<sr*.012&&i0+i<len;i++)d[i0+i]+=(Math.random()*2-1)*a*Math.exp(-i/(sr*.0025))}}}
  const s=ac.createBufferSource();s.buffer=b;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=1800;f.Q.value=.6;const g=ac.createGain();const pk=(.05+size*.09)/Math.sqrt(clappers/20);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+.35);g.gain.setValueAtTime(pk,t+dur*.45);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(m);s.start(t)}
/* voiced crowd vowel: many detuned voices through two formants; shape 'ooh' rises, 'groan'/'sigh' fall, 'roar' is broad and loud */
function voices(kind,size,dur){const ac=crAC(),m=crMaster();if(!ac||!m||crowdLevel()===0)return;const t=ac.currentTime+.05;const out=ac.createGain();
  const F=kind==='ooh'?[[420,6],[820,7]]:kind==='roar'?[[700,2],[1250,2.5]]:[[640,5],[1050,6]];const fs=F.map(([fq,q])=>{const b=ac.createBiquadFilter();b.type='bandpass';b.frequency.value=fq;b.Q.value=q;b.connect(out);return b});
  const n=10+Math.round(size*14);for(let i=0;i<n;i++){const o=ac.createOscillator();o.type='sawtooth';const base=(Math.random()<.55?120:210)*(.85+Math.random()*.35);const vg=ac.createGain();vg.gain.value=1/n;
    if(kind==='ooh'){o.frequency.setValueAtTime(base,t);o.frequency.linearRampToValueAtTime(base*1.35,t+dur*.8)}else if(kind==='roar'){o.frequency.setValueAtTime(base*1.1,t);o.frequency.linearRampToValueAtTime(base*1.3,t+.4);o.frequency.linearRampToValueAtTime(base*1.05,t+dur)}
    else{o.frequency.setValueAtTime(base*1.2,t);o.frequency.exponentialRampToValueAtTime(base*.72,t+dur)}
    const vib=ac.createOscillator(),vd=ac.createGain();vib.frequency.value=4+Math.random()*3;vd.gain.value=base*.02;vib.connect(vd);vd.connect(o.frequency);o.connect(vg);fs.forEach(b=>vg.connect(b));const st=t+Math.random()*.18;o.start(st);vib.start(st);o.stop(t+dur+.2);vib.stop(t+dur+.2)}
  if(kind==='roar'){const ns=crSrc(false),lp=ac.createBiquadFilter(),ng=ac.createGain();lp.type='lowpass';lp.frequency.value=2200;ng.gain.value=.5;ns.connect(lp);lp.connect(ng);ng.connect(out);ns.start(t,Math.random());ns.stop(t+dur+.2)}
  const pk=(kind==='roar'?.16:kind==='ooh'?.07:.06)*(.6+size*.6);const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+(kind==='ooh'?dur*.7:.25));g.gain.exponentialRampToValueAtTime(.0001,t+dur);out.connect(g);g.connect(m)}
function crowd(ev,size){size=clamp(size===undefined?.5:size,0,1);G.lastCrowd={ev,size,t:performance.now()};if(crowdLevel()===0||G.mode!=='round')return;
  if(ev==='applause')applause(size,2.2+size*1.6);
  else if(ev==='roar'){voices('roar',size,2.6);applause(1,4.2)}
  else if(ev==='ooh')voices('ooh',size,1.3);
  else if(ev==='groan'){voices('ooh',size,.7);setTimeout(()=>voices('groan',size,1.4),650)}
  else if(ev==='sigh')voices('sigh',size*.8,1.6)}
/* decide the reaction from the finished shot */
const _finishShotCr=finishShot;finishShot=function(){const a=G.anim,H=G.H;let info=null;try{if(a&&a.res&&H){let md=1e9;const P=a.P;for(let i=0;i<(a.n||0);i++){const d=Math.hypot(P[i*3]-H.cup.x,P[i*3+1]-H.cup.y);if(d<md)md=d}
    info={put:!!a.put,kind:a.res.kind,d0:Math.hypot(a.from.x-H.cup.x,a.from.y-H.cup.y),md,fromSurf:G.lastPos&&G.lastPos.surf}}}catch(e){}
  const r=_finishShotCr.apply(this,arguments);
  try{if(info&&G.mode==='round'){const b=G.ball,dEnd=Math.hypot(b.x-H.cup.x,b.y-H.cup.y);
    if(info.kind==='sunk'){const d=G.strokes-H.par;if(!info.put)crowd('roar',1);else if(d<=-1)crowd('roar',d<=-2?1:.8);else if(info.d0*3>15)crowd('applause',.8);else crowd('applause',d===0?.45:.25)}
    else if(info.kind==='water')crowd('sigh',.7);
    else if(info.put){if(info.md<.13&&dEnd>.05)crowd('groan',.85);else if(info.md<.4&&info.d0*3>8)crowd('groan',.5)}
    else if(H.surfAt(b.x,b.y)===S_GREEN){const ft=dEnd*3;if(ft<8)crowd('applause',info.d0>60?.9:.6);else if(ft<25&&info.d0>90)crowd('applause',.35)}
    else if(!info.put&&info.md<.6&&info.d0>8)crowd('ooh',.7)}}catch(e){}
  return r};
/* ambient on during play, off in menus; start on the first user gesture (autoplay rules) */
setInterval(()=>{try{const want=G.mode&&G.mode!=='menu'&&G.phase!=='menu'&&crowdLevel()>0&&AC&&AC.state==='running';if(want&&!CRW.amb)ambStart();else if(!want&&CRW.amb)ambStop();if(CRW.master&&AC)CRW.master.gain.setTargetAtTime(crowdLevel(),AC.currentTime,.1)}catch(e){}},500);
addEventListener('pointerdown',()=>{crAC()},{once:true});addEventListener('keydown',()=>{crAC()},{once:true});

/* swing prompt ("TAP, CLICK OR PRESS SPACE TO SWING") only on the opening drive of a round (first player, hole 1, first stroke) or the first ball of a practice/challenge mode */
function swingHintOn(){if((G.shotN||0)>0)return false;if(G.mode!=='round')return true;const r=G.round;if(!r||r.i!==0||G.strokes!==0||G.ball.surf!==S_TEE)return false;if(isMP()&&G.mpH&&!G.mpH.every(s=>s.strokes===0))return false;return true}
{const _ex=executeShot;executeShot=function(){G.shotN=(G.shotN||0)+1;return _ex.apply(this,arguments)};
 const _sr=startRound;startRound=function(){G.shotN=0;return _sr.apply(this,arguments)};
 const _sm=startMode;startMode=function(){G.shotN=0;return _sm.apply(this,arguments)};
 const _rr=resumeRound;resumeRound=function(){G.shotN=0;return _rr.apply(this,arguments)};}

/* flagstick in / out (ts.pin, remembered; default in). Pin in: the cup physics lets a firm putt that hits the stick drop; pin out: the stick is removed while putting. */
function pinWho(){try{const r=G.round;if(r&&r.players&&r.players.length>1&&r.players[G.cur])return String(r.players[G.cur].name||G.cur)}catch(e){}return null}// pass-and-play: each player keeps his own last choice
function pinIn(){const w=pinWho();let v=w?store('ts.pin.p.'+w):null;if(v!=='in'&&v!=='out')v=store('ts.pin');return v!=='out'}
function setPin(on){store('ts.pin',on?'in':'out');{const w=pinWho();if(w)store('ts.pin.p.'+w,on?'in':'out')}if(G.H&&G.H.cup)G.H.cup.pin=!!on;updPinBtn()}
function updPinBtn(){const b=$('pinT');if(b){b.textContent=pinIn()?'PIN IN':'PIN OUT';b.classList.toggle('out',!pinIn())}}
(function(){const host=$('putt');if(!host)return;const b=document.createElement('button');b.id='pinT';b.type='button';b.style.cssText='display:none;pointer-events:auto;margin-top:6px;font:800 11px/1 inherit;letter-spacing:.06em;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.35);color:#fff;cursor:pointer';
  const stop=e=>{e.stopPropagation()};b.addEventListener('pointerdown',stop);b.addEventListener('mousedown',stop);b.addEventListener('touchstart',stop,{passive:true});b.addEventListener('keydown',e=>{if(e.code==='Space')e.preventDefault()});
  b.onclick=e=>{e.stopPropagation();setPin(!pinIn());b.blur()};host.appendChild(b);updPinBtn()})();
{const _sh=setHole;setHole=function(H){const r=_sh.apply(this,arguments);try{if(H&&H.cup)H.cup.pin=pinIn();updPinBtn()}catch(e){}return r}}
function pinHidden(){return !pinIn()&&G.mode!=='menu'&&(G.phase==='putt'||((G.phase==='flight'||G.phase==='replay')&&G.anim&&G.anim.put))}
/* the Pin In / Pin Out toggle shows only while a putt is being set up (putting view), hidden for every other shot and screen */
function pinBtnWanted(){// only while the ball sits on the green and the player is setting up (never on the tee, fairway, rough, sand or fringe, never in pre-round setup)
  return !!(G.mode&&G.mode!=='menu'&&!G.replay&&G.ball&&(G.phase==='putt'||(G.ball.surf===S_GREEN&&G.phase==='address')))}/* v1.30: also whenever putting (fringe/fairway putts) */
function pinBtnSync(){try{const b=$('pinT');if(b){const w=pinBtnWanted();const d=w?'inline-block':'none';if(b.style.display!==d)b.style.display=d;if(w){{const p=pinWho();if(p){const v=store('ts.pin.p.'+p);if(v!=='in'&&v!=='out')store('ts.pin.p.'+p,pinIn()?'in':'out')}}updPinBtn();if(G.H&&G.H.cup)G.H.cup.pin=pinIn()}}}catch(e){}}
(function pinBtnLoop(){pinBtnSync();requestAnimationFrame(pinBtnLoop)})();
// show it the moment a putt is set up (not a frame later), for every player in pass-and-play
{const _sa=setAddress;setAddress=function(){const r=_sa.apply(this,arguments);pinBtnSync();return r}}
if(typeof mpLoad==='function'){const _ml=mpLoad;mpLoad=function(){const r=_ml.apply(this,arguments);pinBtnSync();return r}}

// v1.18: water splash (all courses, live shots and replays): droplets + a rising column + expanding ripple rings, and a synthesized splash sound
const SPL={on:0,n:0,P:new Float32Array(48*8),R:new Float32Array(3*2),x:0,y:0,z:0,t:9,seen:new WeakSet(),M:new Float32Array(16),C:new Float32Array(3),snd:0,count:0};
function splashStart(x,y,z,big){const P=SPL.P;SPL.x=x;SPL.y=y;SPL.z=z;SPL.t=0;SPL.on=1;SPL.n=48;SPL.count++;
  for(let i=0;i<48;i++){const o=i*8,col=i<10,a=Math.random()*TAU,s=col?Math.random()*.5:1+Math.random()*2.6;P[o]=x+Math.cos(a)*(col?.15:.3);P[o+1]=y+Math.sin(a)*(col?.15:.3);P[o+2]=z;
    P[o+3]=Math.cos(a)*s;P[o+4]=Math.sin(a)*s;P[o+5]=(col?5+Math.random()*4.5:2.5+Math.random()*4)*(big?1:.75);P[o+6]=col?.09+Math.random()*.07:.035+Math.random()*.05;P[o+7]=1}
  try{sfx('splash',big?1:.8)}catch(e){}}
function splashChk(){const a=G.anim;
  if(a&&!a.put&&a.res&&a.res.kind==='water'&&a.n>1&&(G.phase==='flight'||G.phase==='replay'||G.phase==='rest')&&!SPL.seen.has(a)&&a.t*60>=a.n-1.001){SPL.seen.add(a);const k=(a.n-1)*3;splashStart(a.P[k],a.P[k+1],a.P[k+2],!a.chip)}}
function splashTick(dt){splashChk();
  if(!SPL.on)return;SPL.t+=dt;const P=SPL.P;
  for(let i=0;i<SPL.n;i++){const o=i*8;if(P[o+7]<=0)continue;P[o]+=P[o+3]*dt;P[o+1]+=P[o+4]*dt;P[o+2]+=P[o+5]*dt;P[o+5]-=10.7*dt;if(P[o+2]<SPL.z-.05&&P[o+5]<0)P[o+7]=0}
  if(SPL.t>1.8)SPL.on=0}
function splashDraw(R,draw){const M=SPL.M,C=SPL.C,P=SPL.P;M.fill(0);M[15]=1;
  for(let i=0;i<SPL.n;i++){const o=i*8;if(P[o+7]<=0)continue;const s=P[o+6]*(1-Math.min(.6,SPL.t*.4));M[0]=M[5]=s;M[10]=s*1.25;M[12]=P[o];M[13]=P[o+1];M[14]=P[o+2];C[0]=.86;C[1]=.92;C[2]=.95;draw(R.dropM,M,C,0,.35)}
  for(let r=0;r<3;r++){const f=(SPL.t-r*.18)/1.4;if(f<=0||f>=1)continue;const rad=.25+3.2*Math.sqrt(f);M[0]=M[5]=rad;M[10]=1;M[12]=SPL.x;M[13]=SPL.y;M[14]=SPL.z+.03;const k=1-f;C[0]=.2+.62*k;C[1]=.3+.58*k;C[2]=.33+.58*k;draw(R.ringM,M,C,0,.3*k)}}
// v1.18: when the ball splashes, the relief panel fades in after ~0.9 s so the splash is seen (phase/keys/timer unchanged, so the flow is never blocked)
{const st=document.createElement('style');st.textContent='@keyframes penIn{from{opacity:0}to{opacity:1}}';document.head.appendChild(st);
 const _ps=penShow;penShow=function(o){_ps(o);const d=$('pen');if(d)d.style.animation=SPL.on&&SPL.t<.5?'penIn .3s ease .9s both':''}}

'use strict';
/* ===== Tour Sim ball physics: flight (drag + Magnus lift + wind), bounce, roll. Map units yards, physics SI ===== */
const YD=1.0936133, MPS=0.44704, RPM=Math.PI/30, GRAV=9.81;
const BALL={m:0.04593,r:0.021335,A:Math.PI*0.021335*0.021335,rho:1.2};
const AERO={cd0:0.200,cd1:0.230,cl0:0.04,cl1:1.0,clMax:0.32,tau:22};
// club table: full-swing numbers for a strong amateur (club mph, smash, launch deg, spin rpm, loft)
const CLUBS=[
 {id:'DR',name:'Driver',  cs:108,sm:1.48,la:12.5,sp:2600,loft:10.5,wood:1},
 {id:'3W',name:'3 Wood',  cs:100,sm:1.46,la:11.2,sp:3500,loft:15,wood:1},
 {id:'5W',name:'5 Wood',  cs:93, sm:1.44,la:12.6,sp:4200,loft:18,wood:1},
 {id:'4H',name:'4 Hybrid',cs:90, sm:1.42,la:13.4,sp:4500,loft:21,wood:1},
 {id:'5i',name:'5 Iron',  cs:89, sm:1.37,la:12.3,sp:5100,loft:26},
 {id:'6i',name:'6 Iron',  cs:87, sm:1.35,la:14.1,sp:5900,loft:29.5},
 {id:'7i',name:'7 Iron',  cs:85, sm:1.33,la:16.2,sp:6700,loft:33},
 {id:'8i',name:'8 Iron',  cs:83, sm:1.31,la:18.3,sp:7500,loft:37},
 {id:'9i',name:'9 Iron',  cs:81, sm:1.29,la:20.6,sp:8300,loft:41},
 {id:'PW',name:'Pitching Wedge',cs:79,sm:1.25,la:24,sp:9000,loft:45},
 {id:'GW',name:'Gap Wedge',cs:75,sm:1.20,la:26.5,sp:9500,loft:50},
 {id:'SW',name:'Sand Wedge',cs:71,sm:1.16,la:29.5,sp:9900,loft:56},
 {id:'LW',name:'Lob Wedge',cs:67,sm:1.11,la:32.5,sp:10200,loft:60},
 {id:'PT',name:'Putter',cs:0,sm:0,la:0,sp:0,loft:3,putter:1},
];
const PUTTER=13;
// surfaces
const S_OB=0,S_ROUGH=1,S_FW=2,S_TEE=3,S_FRINGE=4,S_GREEN=5,S_SAND=6,S_WATER=7,S_DEEP=8,S_WASTE=9;
const SURF=['Out of bounds','Rough','Fairway','Tee box','Fringe','Green','Bunker','Water','Native area','Waste area'];
const REST=[0,.22,.36,.36,.33,.30,.05,0,.16,.12];   // vertical restitution
const MU  =[0,.55,.40,.40,.42,.38,.9,0,.7,.7];       // grip
const CR  =[0,.42,.12,.12,.09,.052,1.4,0,.75,.5];
const KROLL=[0,.2,.43,.43,.36,.33,.03,0,.1,.25];  // rolling resistance (x g)
const LIE =[0,.88,1,1,1,1,.62,0,.72,.85];             // distance factor shown as "lie %"
function windAt(w,z){ // log wind profile, w = {x,y} m/s at 10 m
  const k=z<.3?.3:z;const f=Math.log(k/0.03)/Math.log(10/0.03);return f<0?0:f;}
/* launch conditions from swing inputs */
function launchFrom(ci,inp,surf){
  const C=CLUBS[ci];const o={};
  let p=inp.power;const over=Math.max(0,p-1);p=Math.min(p,1.12);
  let cs=C.cs*(p<1?Math.pow(Math.max(p,.02),.6):1+over*.35);
  const q=inp.tempoQ===undefined?1:inp.tempoQ;
  const sx=inp.sx||0,sy=inp.sy||0;            // strike point on face: +x toe, +y high
  let sm=C.sm*(1-.10*sx*sx-.07*sy*sy-.03*(1-q));
  let la=C.la+(inp.dLoft||0)*.75+(C.wood?1.6:.6)*sy;
  let sp=C.sp*(1+(inp.dLoft||0)*.035)*(C.wood?1-.18*sy:1-.08*sy);
  if(p<1){la+=(1-p)*(C.loft>40?3:1);sp*=.55+.45*p}
  // lie
  if(surf===S_ROUGH){sm*=C.wood?.93:.95;sp*=.68;la+=1}
  else if(surf===S_DEEP){cs*=.78;sp*=.5;la+=2}
  else if(surf===S_SAND){const k=C.loft>=50?.7:C.loft>=40?.8:C.wood?.62:.82;sm*=k;sp*=.6;la+=C.loft>=50?5:1}
  else if(surf===S_WASTE){sm*=C.wood?.8:.92;sp*=.8}
  else if(surf!==S_TEE&&ci===0){sm*=.97;la-=1.5}
  const bs=cs*sm;
  // face / path -> start line and spin axis
  const face=inp.face||0,path=inp.path||0,ftp=face-path;
  const fw=C.wood?.85:.75;let start=fw*face+(1-fw)*path;
  let axis=ftp*(4.6-C.loft*.04);              // degrees, + = fade/slice
  axis+=-(C.wood?9:3)*sx;                        // gear effect: toe -> draw
  axis=Math.max(-45,Math.min(45,axis));
  o.club=cs;o.ball=bs;o.smash=bs/(cs||1);o.launch=Math.max(.5,la);o.spin=Math.max(400,sp);o.axis=axis;o.start=start;o.face=face;o.path=path;
  return o}
/* integrate flight. dir = aim heading (rad, map frame: x right, y fwd). wind {x,y} m/s @10m. Returns samples in yards */
function flyBall(L,x0,y0,dir,wind,out){
  const r=BALL.r,kA=.5*BALL.rho*BALL.A/BALL.m;
  const v0=L.ball*MPS,la=L.launch*Math.PI/180,hd=dir-L.start*Math.PI/180; // + start = right (heading is CCW)
  // map frame: heading angle measured from +x CCW; "right" of heading is heading - 90deg
  const ux=Math.cos(hd),uy=Math.sin(hd);
  let vx=v0*Math.cos(la)*ux,vy=v0*Math.cos(la)*uy,vz=v0*Math.sin(la);
  let x=0,y=0,z=0;
  // spin vector: backspin about axis perpendicular to flight (rightward), tilted by axis angle
  const w0=L.spin*RPM,ax=L.axis*Math.PI/180;
  const rx=uy,ry=-ux; // right vector
  // backspin axis points to the LEFT of travel for lift up (w x v = up): use left = -right
  let wx=rx*Math.cos(ax)*w0,wy=ry*Math.cos(ax)*w0,wz=-Math.sin(ax)*w0; // tilt: + axis -> lift tilts right (fade)
  const gzf=out.gz||null;const dt=1/240;let t=0,apex=0;const S=out.s;let n=0;S[n++]=x0;S[n++]=y0;S[n++]=0;
  let step=0;
  while(t<15){
    const f=windAt(wind,z),wvx=vx-wind.x*f,wvy=vy-wind.y*f,wvz=vz;
    const V=Math.hypot(wvx,wvy,wvz)||1e-6,W=Math.hypot(wx,wy,wz),Sp=r*W/V;
    const cd=AERO.cd0+AERO.cd1*Sp,cl=Math.min(AERO.clMax,AERO.cl0*(W>1?1:0)+AERO.cl1*Sp);
    // lift dir = w x v / |w||v|
    let lx=wy*wvz-wz*wvy,ly=wz*wvx-wx*wvz,lz=wx*wvy-wy*wvx;const lm=Math.hypot(lx,ly,lz)||1;lx/=lm;ly/=lm;lz/=lm;
    const D=kA*cd*V,Lf=kA*cl*V*V;
    const axx=-D*wvx+Lf*lx,ayy=-D*wvy+Lf*ly,azz=-D*wvz+Lf*lz-GRAV;
    vx+=axx*dt;vy+=ayy*dt;vz+=azz*dt;x+=vx*dt;y+=vy*dt;z+=vz*dt;t+=dt;
    const dec=Math.exp(-dt/AERO.tau);wx*=dec;wy*=dec;wz*=dec;
    if(z>apex)apex=z;
    const gz=gzf?gzf(x0+x*YD,y0+y*YD)/YD:0;
    if(++step%4===0&&n<S.length-3){S[n++]=x0+x*YD;S[n++]=y0+y*YD;S[n++]=Math.max(gz,z)*YD}
    if(z<=gz&&vz<0)break}
  // land exactly
  S[n++]=x0+x*YD;S[n++]=y0+y*YD;S[n++]=(gzf?gzf(x0+x*YD,y0+y*YD):0);
  out.n=n/3;out.t=t;out.apex=apex*YD;out.lx=x0+x*YD;out.ly=y0+y*YD;
  out.vh=Math.hypot(vx,vy);out.vz=vz;out.hx=vx/(out.vh||1);out.hy=vy/(out.vh||1);
  out.wb=Math.hypot(wx,wy,wz)*Math.cos(ax);// remaining backspin rad/s
  out.carry=Math.hypot(x,y)*YD;
  // side relative to aim line (+ right)
  const ax2=Math.cos(dir),ay2=Math.sin(dir);out.side=(x*ay2-y*ax2)*YD;
  out.desc=Math.atan2(-vz,out.vh)*180/Math.PI;
  return out}
/* bounce + roll on a surface callback. surfAt(x,y) -> code; slopeAt(x,y)->{x,y} accel in yd/s^2 on greens; cup check */
function groundRoll(F,surfAt,slopeAt,cup,rec){
  // F from flyBall. state in yards & m/s mix: convert speeds to yd/s
  let x=F.lx,y=F.ly,hx=F.hx,hy=F.hy;let vh=F.vh,vz=-F.vz,w=F.wb;const r=BALL.r;
  let z=0,bz=0;const R=rec;let n=0;const put=(a,b,c)=>{if(R&&n<R.length-3){R[n++]=a;R[n++]=b;R[n++]=c}};
  let s=surfAt(x,y);const res={kind:'rest',firstSurf:s,bounces:0};
  if(s===S_WATER||s===S_OB){res.kind=s===S_WATER?'water':'ob';res.x=x;res.y=y;res.n=0;return res}
  // landing: empirical check from descent angle + spin, then small hops
  const spinR=F.wb/RPM,desc=F.desc||30;
  let g=(desc<33?Math.min(.74,.7+(33-desc)*.008):Math.max(.04,Math.min(1,1-(desc-25)/28)))*(1-Math.min(.6,spinR/20000));
  let vr=F.putt?vh:vh*g*KROLL[s];
  if(!F.putt&&s===S_GREEN&&spinR>8000&&desc>44)vr=-Math.min(1.6,(spinR-8000)/1800);
  // landing on a slope: downhill landings kick forward, into-slope landings check up
  if(!F.putt&&slopeAt){const g=slopeAt(x,y),al=(g.x*hx+g.y*hy)/(9.81*1.0936);vr*=Math.max(.45,Math.min(1.9,1+al*5))}
  let hop=vz*REST[s]*.55;
  for(let k=0;k<3&&hop>.7;k++){
    const T=2*hop/GRAV,dt=1/60;const vxh=(k?vr:(Math.min(vh,vr*1.6)*.5+vr*.5))*hx*YD,vyh=(k?vr:(Math.min(vh,vr*1.6)*.5+vr*.5))*hy*YD;
    for(let tt=dt;tt<T;tt+=dt){put(x+vxh*tt,y+vyh*tt,(hop*tt-.5*GRAV*tt*tt)*YD)}
    x+=vxh*T;y+=vyh*T;res.bounces++;hop*=REST[s]*.8;
    s=surfAt(x,y);if(s===S_WATER||s===S_OB){res.kind=s===S_WATER?'water':'ob';break}
    if(s===S_SAND)vr*=.1}
  vh=vr;
  if(res.kind==='rest'){
    // roll
    let vx=vh*hx*YD,vy=vh*hy*YD;const dt=1/60;let lip=0;
    for(let it=0;it<1500;it++){
      s=surfAt(x,y);
      if(s===S_WATER){res.kind='water';break}if(s===S_OB){res.kind='ob';break}
      let ax=0,ay=0;{const g=slopeAt(x,y);ax=g.x;ay=g.y}
      vx+=ax*dt;vy+=ay*dt;const sp=Math.hypot(vx,vy),dec=CR[s]*GRAV*YD;
      if(sp<1e-4&&Math.hypot(ax,ay)<dec)break;
      const ns=sp-dec*dt;if(ns<=0||(ns<.06&&Math.hypot(ax,ay)<dec*.9))break;
      vx*=ns/sp;vy*=ns/sp;const nx=x+vx*dt,ny=y+vy*dt;
      if(cup){const sx=nx-x,sy=ny-y,L2=sx*sx+sy*sy;let t=L2?((cup.x-x)*sx+(cup.y-y)*sy)/L2:0;t=t<0?0:t>1?1:t;const cx=x+sx*t-cup.x,cy=y+sy*t-cup.y,cd=Math.hypot(cx,cy);
        // cup physics (capture-speed rule): cup radius 2.125 in = .059 yd; the ball's centre must pass inside ~R+ (edge catch). Max capture speed ~1.63 m/s (1.78 yd/s) dead centre, falling to ~0 at the edge.
        const RC=.066,LIPR=.084;const pinOn=cup.pin!==undefined?!!cup.pin:(typeof pinIn==='function'?pinIn():true);
        const tu=L2?((cup.x-x)*sx+(cup.y-y)*sy)/L2:-1;// decide at the point of closest approach (the line's offset from the cup centre), not on first contact
        if(cd<LIPR&&!lip&&tu>=0&&tu<=1){const e=Math.min(1,cd/RC);const vcap=e<1?1.78*Math.sqrt(1-e*e)+.08:0;const side=(cx*vy-cy*vx)>0?1:-1;res.cupV=ns;res.cupE=+(cd/RC).toFixed(2);
          if(e<1&&ns<vcap){put(cup.x,cup.y,0);res.kind='sunk';x=cup.x;y=cup.y;break}
          if(pinOn&&e<.6&&ns<6){// hits the flagstick: the pin soaks up pace, so a firm putt on line can still drop; a hard one rebounds (a very rare dead-centre blast can still fall)
            const vpin=1.78+1.6*(1-e/.6);const lucky=e<.08&&((Math.sin(ns*917.3+e*311.7)*43758.5)%1+1)%1<.03;res.pinHit=1;
            if(ns<vpin||lucky){put(cup.x,cup.y,0);res.kind='sunk';res.pin=1;x=cup.x;y=cup.y;break}
            const after=ns*(.25+.2*e);const a=Math.PI-side*(.5+1.6*e),c=Math.cos(a),sn=Math.sin(a),k=after/ns;const qx=(vx*c-vy*sn)*k,qy=(vx*sn+vy*c)*k;vx=qx;vy=qy;lip=1;res.lip='pin'}
          else if(ns<vcap*1.9+.5&&e>.3){// medium pace on the edge: lips out / horseshoes around the rim
            const a=side*(.7+1.4*(1-e)*(1-e)+.35),c=Math.cos(a),sn=Math.sin(a),k=.55;const qx=(vx*c-vy*sn)*k,qy=(vx*sn+vy*c)*k;vx=qx;vy=qy;lip=1;res.lip='lip'}
          else{// too fast: skips over the hole / catches the far rim and keeps rolling
            const a=side*.12*(1-e)+side*.05,c=Math.cos(a),sn=Math.sin(a),k=ns>4?.9:.8;const qx=(vx*c-vy*sn)*k,qy=(vx*sn+vy*c)*k;vx=qx;vy=qy;lip=1;res.lip='over';
            for(let q=1;q<=4;q++)put(x+vx*dt*q*.25,y+vy*dt*q*.25,.012*Math.sin(q/4*Math.PI))}}
        else if(lip&&cd>LIPR*2.5)lip=0}
      x=nx;y=ny;put(x,y,0);
      /* v1.21 cup assist: a slow ball whose centre is over the opening always drops (no hovering, even after a lip); a slow ball hanging on the edge is drawn in. Fast/off-line lip-outs above are untouched. */
      if(cup){const dx=cup.x-x,dy=cup.y-y,dc=Math.hypot(dx,dy),v2=Math.hypot(vx,vy);
        if(dc<.059&&v2<(lip?.3:1.1)){put(cup.x,cup.y,0);res.kind='sunk';res.assist=1;x=cup.x;y=cup.y;break}
        if(!lip&&dc<.092&&v2<.7&&dc>1e-4){const pull=2.4*dt;vx+=dx/dc*pull;vy+=dy/dc*pull}}}
    if(res.kind==='rest'&&cup&&Math.hypot(cup.x-x,cup.y-y)<.075){put(cup.x,cup.y,0);res.kind='sunk';res.assist=2;x=cup.x;y=cup.y}}
  res.x=x;res.y=y;res.n=n/3;res.surf=surfAt(x,y);return res}
/* putt: initial speed (yd/s) along heading */
function puttRoll(x,y,hd,v,surfAt,slopeAt,cup,rec){
  const F={lx:x,ly:y,hx:Math.cos(hd),hy:Math.sin(hd),vh:v/YD,vz:0,wb:0,putt:1};return groundRoll(F,surfAt,slopeAt,cup,rec)}
function puttSpeedFor(d){return Math.sqrt(2*CR[S_GREEN]*GRAV*YD*d)} // yd/s to roll d yards on flat green
if(typeof module!=='undefined')module.exports={CLUBS,launchFrom,flyBall,groundRoll,puttRoll,puttSpeedFor,AERO,S_FW,S_GREEN,S_ROUGH,MPS,YD};

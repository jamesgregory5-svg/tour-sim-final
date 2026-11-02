/* v1.20 shared coast/cliff fix: COAST_C = courses on the open sea (sea-level DEM cells beyond the mapped box become sea, terrain-driven beach/rock shoreline); CLIFF_C = bluff coasts (shoreline drop is a ~1 yd rock face) */
const COAST_C={pebble:1,cypress:1,pacificdunes:1,friars:1,fishers:1,ngla:1,seminole:1},CLIFF_C={pebble:1,cypress:1,pacificdunes:1,friars:1,fishers:1};
function seaFloor(id){const D=DEMS[id];if(!D)return -1e9;if(D.sf===undefined){let m=1e9;for(const v of D.A)if(v<m)m=v;D.sf=m}return D.sf}
'use strict';
/* Builds a playable hole (hole frame: tee at origin, play toward +y, x = right) from compact course geometry. */
const STYLE={
  parkland:{rough:'#355a22',rough2:'#3b6226',fw:'#4b7a2c',fw2:'#578a33',deep:'#2b4a1e',waste:'#a8966e',sand:'#e2d6bb',tree:0,trees:1.0,und:.8},
  heath:{rough:'#3d5f26',rough2:'#44672b',fw:'#507f2f',fw2:'#5c8c36',deep:'#5a5c34',waste:'#c4b08a',sand:'#e3d5b6',tree:1,trees:.8,und:1.1},
  links:{rough:'#5d7234',rough2:'#687c3a',fw:'#61873a',fw2:'#6c9242',deep:'#8a8550',waste:'#cbbb92',sand:'#ddcfae',tree:2,trees:.12,und:1.6},
  coastal:{rough:'#3e6429',rough2:'#456c2e',fw:'#52803a',fw2:'#5d8c40',deep:'#5f6738',waste:'#c9ba95',sand:'#e8dec6',tree:2,trees:.5,und:1.2},
  desert:{rough:'#40692a',rough2:'#477230',fw:'#548a34',fw2:'#5f963b',deep:'#5f6e36',waste:'#c2ab82',sand:'#ebe0c8',tree:3,trees:.7,und:1},
  sandhills:{rough:'#68773e',rough2:'#738244',fw:'#5a843a',fw2:'#658f41',deep:'#ad9a6c',waste:'#d0bd93',sand:'#dcc89e',tree:1,trees:.15,und:1.8}
};
STYLE.dunes=STYLE.sandhills;STYLE.prairie=Object.assign({},STYLE.links,{trees:.35,tree:0});
const DENS={augusta:1.3,pinevalley:1.05,lookaway:1.05,cypress:.7,shinnecock:.03,oakmont:.05,merion:.8,ngla:.05,sandhills:.03,pebble:.35,fishers:.04,chicago:.3,seminole:.45,wingedfoot:1,friars:.05,crystal:.9,lacc:.6,tcc:1,riviera:.8,muirfieldv:1,oaklandhills:.8,oakhill:1.1,peachtree:1,pacificdunes:.02,shadowcreek:1.2,prairie:.25};
// per-course turf colours: Riviera's kikuyu fairways read lighter against darker rough so the split fairway and small greens show
const STYLE_OVR={lookaway:{deep:'#7f7c4a',native:20,sand:'#efe8d6'},oakmont:{rough:'#46692a',rough2:'#4e722e',fw:'#5a9036',fw2:'#669e3f',deep:'#8d8a56',native:24,sand:'#e8dcc0'},ngla:{deep:'#a59a5e',native:16,fw:'#66903c',fw2:'#729c45'},riviera:{rough:'#44692a',rough2:'#4b712f',fw:'#5d963a',fw2:'#6ba445'},/* v1.30: lighter, less flat parkland roughs (more rough/rough2 contrast), softer deep */peachtree:{rough:'#3f6326',rough2:'#4d7330',deep:'#4d5c2c',fw:'#55873a',fw2:'#609440'},augusta:{rough:'#3e6527',rough2:'#47702d'},chicago:{rough:'#40652a',rough2:'#4c7231',deep:'#6f7144'},muirfieldv:{rough:'#3f6428',rough2:'#4a6f2e',fw:'#559038',fw2:'#62a042'}};
const TREEMIX={augusta:1,pinevalley:1,sandhills:1,lookaway:0,oakmont:0,crystal:2,riviera:0,shadowcreek:1,peachtree:1,seminole:3};
const SCOL=['#000','rough','fw','fw','fringe','green','sand','water','deep','waste'];
function fbm2(x,y,seed){let v=0,a=1,f=1/90;for(let o=0;o<4;o++){v+=a*vnoise(x*f+seed*7.1,y*f-seed*3.3);a*=.5;f*=2.03}return v}
function hash2(i,j){let h=Math.imul(i,374761393)+Math.imul(j,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}
function vnoise(x,y){const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash2(i,j),b=hash2(i+1,j),c=hash2(i,j+1),d=hash2(i+1,j+1);return(a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1}
function buildHole0(course,geo,hi,teeIdx,opts){
  opts=opts||{};const par=(course.tees[teeIdx].par||course.par)[hi],yards=course.tees[teeIdx].y[hi];const st=Object.assign({},STYLE[course.style]||STYLE.parkland,TREEMIX[course.id]!==undefined?{tree:TREEMIX[course.id]}:{},DENS[course.id]!==undefined?{trees:DENS[course.id]}:{},STYLE_OVR[course.id]||{});
  if(course.id==='chicago')Object.assign(st,{rough:'#41652a',rough2:'#486d2e',deep:'#3a5a25',waste:'#b8a57c'});// Wheaton IL parkland-prairie: green rough, fescue only where mapped
  {/* v1.30: per-course grass brightness/saturation matched to USGS NAIP aerials (median vegetation colour) */const AT={tcc:[1.3,.8],seminole:[1.16,.88],oaklandhills:[1.15,.92],prairie:[.88,1],fishers:[.98,.9],crystal:[1,.88],oakhill:[1.04,.9],wingedfoot:[1.04,.92]}[course.id];
    if(AT)for(const k of['rough','rough2','fw','fw2','deep']){const h=st[k];if(typeof h!=='string'||h[0]!=='#'||h.length!==7)continue;let r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);const m=(r+g+b)/3;const f=x=>Math.max(0,Math.min(255,Math.round((m+(x-m)*AT[1])*AT[0])));st[k]='#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('')}}
  const R=RNG(course.id+':'+hi+':'+(opts.seed||'')),seedN=xmur(course.id+hi)%1000;
  const hd=geo.h[hi];let L=dec(hd.l);
  // place tee by scorecard yardage
  const Lf=plen(L);let s0=Lf-yards,line;
  if(opts.teeRaw){const t=opts.teeRaw,pr=projOn(L,t[0],t[1]);line=[[t[0],t[1]]];let acc=0;for(let i=0;i<L.length-1;i++){acc+=Math.hypot(L[i+1][0]-L[i][0],L[i+1][1]-L[i][1]);if(acc>pr+8)line.push(L[i+1])}if(line.length<2)line.push(L[L.length-1])}
  else if(s0>=0){const p=pointAt(L,s0);line=[[p[0],p[1]]];let acc=0;for(let i=0;i<L.length-1;i++){acc+=Math.hypot(L[i+1][0]-L[i][0],L[i+1][1]-L[i][1]);if(acc>s0+.01)line.push(L[i+1])}}
  else{const a=Math.atan2(L[1][1]-L[0][1],L[1][0]-L[0][0]);line=[[L[0][0]+Math.cos(a)*s0,L[0][1]+Math.sin(a)*s0]].concat(L)}
  const T0=line[0],E=line[line.length-1],ang=Math.atan2(E[1]-T0[1],E[0]-T0[0]),rot=Math.PI/2-ang,cr=Math.cos(rot),sr=Math.sin(rot);
  const tf=p=>{const x=p[0]-T0[0],y=p[1]-T0[1];return[x*cr-y*sr,x*sr+y*cr]};
  const toRaw=(x,y)=>[T0[0]+x*cr+y*sr,T0[1]-x*sr+y*cr];
  const dT=demSample(course.id,T0[0],T0[1]);const dz=(x,y)=>{const r=toRaw(x,y);return demSample(course.id,r[0],r[1])-dT};
  // v1.20 coastal courses (shared): DEM cells at sea level (fine grid floor 1.33, far grid 0) beyond the mapped box are sea: sink them well under the water line so no coarse land blocks show in the ocean; smooth 0.5 m transition keeps the coastline soft
  const sf=COAST_C[course.id]?seaFloor(course.id):null;const dzP=(x,y)=>{const r=toRaw(x,y),v=demSample(course.id,r[0],r[1]);return v-dT-3.2*smooth(clamp((sf+.62-v)/.55,0,1))};
  const hl=line.map(tf);let mnx=-30,mxx=30,mxy=0;for(const p of hl){mnx=Math.min(mnx,p[0]);mxx=Math.max(mxx,p[0]);mxy=Math.max(mxy,p[1])}
  const X0=Math.floor(mnx-95),X1=Math.ceil(mxx+95),Y0=-45,Y1=Math.ceil(mxy+70),W=X1-X0,H=Y1-Y0;
  const inR=P=>{for(const p of P)if(p[0]>X0-20&&p[0]<X1+20&&p[1]>Y0-20&&p[1]<Y1+20)return true;return false};
  const F={};for(const k in geo.f){F[k]=[];for(const e of geo.f[k]){const P=dec(e).map(tf);if(k==='gc'||inR(P))F[k].push(P)}}
  const sea=(geo.sea||[]).map(e=>dec(e).map(tf)).filter(inR);
  // v1.15: OSM buildings (houses, clubhouse, lodge) near the hole: footprint + height (yd)
  const blds=[];for(const e of(geo.b||[])){const P=dec(e.slice(1)).map(tf);let ok=false;for(const p of P)if(p[0]>X0-320&&p[0]<X1+320&&p[1]>Y0-200&&p[1]<Y1+320){ok=true;break}if(ok)blds.push({h:e[0]/2,P,bb:[Math.min(...P.map(p=>p[0])),Math.min(...P.map(p=>p[1])),Math.max(...P.map(p=>p[0])),Math.max(...P.map(p=>p[1]))]})}
  const inBld=(x,y,m)=>{m=m||0;for(const b of blds){if(x<b.bb[0]-m||x>b.bb[2]+m||y<b.bb[1]-m||y>b.bb[3]+m)continue;if(m>0||pip(x,y,b.P))return true}return false};
  // per-hole layout corrections where the OSM sand polygon spills across the tee-shot corridor (flagged approximate)
  const CLIP={'seminole:5':{x:-10,y0:12,y1:165}};const cq=CLIP[course.id+':'+hi];
  if(cq&&F.bk){const clipX=P=>{const o=[];for(let k=0;k<P.length;k++){const a=P[k],b=P[(k+1)%P.length];const ia=a[0]<=cq.x,ib=b[0]<=cq.x;if(ia)o.push(a);if(ia!==ib){const t=(cq.x-a[0])/(b[0]-a[0]);o.push([cq.x,a[1]+(b[1]-a[1])*t])}}return o};
    F.bk=F.bk.map(P=>{let cy=0;for(const q of P)cy+=q[1];cy/=P.length;const ys=P.map(q=>q[1]);if(Math.max(...ys)<cq.y0||Math.min(...ys)>cq.y1||cy>cq.y1+40)return P;const r=clipX(P);return r.length>=3?r:null}).filter(Boolean)}
  // ---- surface raster (1 yd) ----
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  const PAL=['#000000','#00ff00','#0000ff','#00ffff','#ff00ff','#ffffff','#ffff00','#ff0000','#008000','#808000'];
  const PR=PAL.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);
  const path=(P)=>{g.beginPath();P.forEach((p,i)=>{const x=p[0]-X0,y=Y1-p[1];i?g.lineTo(x,y):g.moveTo(x,y)});g.closePath()};
  const fillK=(k,c)=>{g.fillStyle=PAL[c];for(const P of(F[k]||[])){path(P);g.fill()}};
  g.fillStyle=PAL[0];g.fillRect(0,0,W,H);
  const hasGC=(F.gc||[]).length>0;
  g.fillStyle=PAL[1];for(const P of(F.gc||[])){path(P);g.fill()}
  // Merion's quarry (not mapped in OSM): placed where the DEM dips and the mapped fairways break on 16, 17 and 18; a sunken pit of sand, scrub and rock
  const QUARRY={'merion:15':[322,404,38],'merion:16':[26,150,34],'merion:17':[95,214,36]}[course.id+':'+hi];const QP=[];
  if(QUARRY){const [q0,q1,hw]=QUARRY,QR=RNG('q'+hi),Lp=[],Rp=[];for(let d=q0;d<=q1;d+=4){const p0=pointAt(hl,d),p1=pointAt(hl,Math.min(d+2,q1+2));let dx=p1[0]-p0[0],dy=p1[1]-p0[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
      const e=Math.sin(Math.PI*(d-q0)/(q1-q0));const wl=hw*(.55+.45*Math.sqrt(Math.max(0,e)))*(1+.12*Math.sin(d*.09+1)),wr=hw*(.55+.45*Math.sqrt(Math.max(0,e)))*(1+.12*Math.cos(d*.07));
      const fl=(d===q0||d+4>q1)?.3:1;Lp.push([p0[0]-dy*wl*fl,p0[1]+dx*wl*fl]);Rp.push([p0[0]+dy*wr*fl,p0[1]-dx*wr*fl])}
    QP.push(Lp.concat(Rp.reverse()));(F.sd=F.sd||[]).push(QP[0])}
  fillK('wd',8);fillK('na',8);fillK('sd',9);fillK('ro',1);fillK('fw',2);/* fwh (OSM fairway inner rings) are bunker cut-outs, not rough islands: bunkers paint over them, so they stay fairway */fillK('te',3);
  // tee box for chosen tee
  // greens: find green near hole end
  const end=hl[hl.length-1];let G=null,gd=1e9;
  for(const P of(F.gr||[])){let cx=0,cy=0;for(const p of P){cx+=p[0];cy+=p[1]}cx/=P.length;cy/=P.length;const d=Math.hypot(cx-end[0],cy-end[1]);if(pip(end[0],end[1],P)){G=P;gd=0;break}if(d<gd&&d<30){gd=d;G=P}}
  if(!G){const rx=par===3?13:15,ry=par===3?11:16;G=[];for(let i=0;i<28;i++){const a=i/28*TAU,w=1+.12*Math.sin(a*2+seedN)+.07*Math.cos(a*3);G.push([end[0]+Math.cos(a)*rx*w,end[1]+Math.sin(a)*ry*w])}(F.gr=F.gr||[]).push(G);opts.synth=(opts.synth||[]).concat('green')}
  g.strokeStyle=PAL[4];g.lineWidth=3.6;g.lineJoin='round';for(const P of F.gr){path(P);g.stroke()}
  fillK('gr',5);fillK('bk',6);fillK('wa',7);g.fillStyle=PAL[7];for(const P of sea){path(P);g.fill()}
  g.fillStyle=PAL[1];g.fillRect(-7-X0,Y1-7,14,13);g.fillStyle=PAL[3];g.fillRect(-5-X0,Y1-5,10,9);
  const id=g.getImageData(0,0,W,H).data,S=new Uint8Array(W*H);
  for(let i=0,j=0;i<S.length;i++,j+=4){const r=id[j],gg=id[j+1],b=id[j+2];let best=0,bd=1e9;for(let k=0;k<10;k++){const p=PR[k],d=(p[0]-r)**2+(p[1]-gg)**2+(p[2]-b)**2;if(d<bd){bd=d;best=k}}S[i]=best}
  // flip to y-up storage: S[(y-Y0)*W + (x-X0)]
  const SU=new Uint8Array(W*H);for(let r=0;r<H;r++)SU.set(S.subarray(r*W,r*W+W),(H-1-r)*W);
  // despeckle: thin OSM slivers (tree rows, hedges, path edges) rasterize as dashed lines of deep rough / OB across play; fold isolated cells into their surroundings
  for(let pass=0;pass<2;pass++){const C=SU.slice();for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i,v=C[k];if(v!==8&&v!==0)continue;let same=0;const cnt={};for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const u=C[k+dj*W+di];if(u===v)same++;else cnt[u]=(cnt[u]||0)+1}
    if(same<3){let bv=1,bc=-1;for(const u in cnt)if(cnt[u]>bc&&+u!==7&&+u!==5&&+u!==4){bc=cnt[u];bv=+u}SU[k]=bv===2||bv===3?1:bv}}}
  // OB handling and synthesized fairway
  for(let j=0;j<H;j+=1)for(let i=0;i<W;i++){const k=j*W+i;if(SU[k]!==0)continue;const d=segD(i+X0+.5,j+Y0+.5,hl);
    if(hasGC){if(d<55)SU[k]=d<34?1:8}else{SU[k]=d<70?1:d<95?8:0}}
  if(st.native){// v1.15: native fescue on out-of-play rough (Lookaway banks): rough farther than st.native yd from any mown/sand surface and away from the line of play
    const D=new Float32Array(W*H).fill(1e4);for(let k=0;k<W*H;k++){const v=SU[k];if(v>=2&&v<=6)D[k]=0}
    for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=j*W+i;if(i>0)D[k]=Math.min(D[k],D[k-1]+1);if(j>0){D[k]=Math.min(D[k],D[k-W]+1);if(i>0)D[k]=Math.min(D[k],D[k-W-1]+1.414);if(i<W-1)D[k]=Math.min(D[k],D[k-W+1]+1.414)}}
    for(let j=H-1;j>=0;j--)for(let i=W-1;i>=0;i--){const k=j*W+i;if(i<W-1)D[k]=Math.min(D[k],D[k+1]+1);if(j<H-1){D[k]=Math.min(D[k],D[k+W]+1);if(i<W-1)D[k]=Math.min(D[k],D[k+W+1]+1.414);if(i>0)D[k]=Math.min(D[k],D[k+W-1]+1.414)}}
    const NR=RNG('nat'+hi);for(let j=0;j<H;j+=1)for(let i=0;i<W;i++){const k=j*W+i;if(SU[k]!==1)continue;const lim=st.native*(1+.35*Math.sin(i*.05+j*.037+seedN)+.2*Math.cos(i*.11-j*.07));if(D[k]>lim&&segD(i+X0+.5,j+Y0+.5,hl)>32)SU[k]=8}}
  const surfIdx=(x,y)=>{const i=Math.floor(x-X0),j=Math.floor(y-Y0);return(i<0||j<0||i>=W||j>=H)?-1:j*W+i};
  const surfAt=(x,y)=>{const k=surfIdx(x,y);return k<0?0:SU[k]};
  if(par>3){let n=0,f=0;for(let s=Math.min(200,yards*.45);s<yards-35;s+=6){const p=pointAt(hl,s);n++;if(surfAt(p[0],p[1])===2)f++}
    if(n&&f/n<.3){for(let s=Math.min(190,yards*.42);s<yards-28;s+=1.5){const p=pointAt(hl,s),w=15+3*Math.sin(s*.03+seedN);for(let dx=-w;dx<=w;dx++){const k=surfIdx(p[0]+dx,p[1]);if(k>=0&&(SU[k]===1||SU[k]===8||SU[k]===9))SU[k]=2}}opts.synth=(opts.synth||[]).concat('fairway')}}
  // open links/heathland: unmaintained ground away from the corridor is fescue (plays as native)
  if(st.trees<.1){for(let j=0;j<H;j+=1)for(let i=0;i<W;i++){const k=j*W+i;if(SU[k]!==1)continue;const x=i+X0+.5,y=j+Y0+.5;const d=segD(x,y,hl);if(d<26+8*vnoise(x*.05,y*.05))continue;
      let nearFw=false;for(const q of[[6,0],[-6,0],[0,6],[0,-6],[10,0],[-10,0]]){const c2=surfAt(x+q[0],y+q[1]);if(c2===2||c2===5||c2===4||c2===3||c2===6){nearFw=true;break}}if(!nearFw)SU[k]=8}}
  // ---- signature features ----
  let pews=null;
  if(course.id==='oakmont'&&(hi===2||hi===3)){// Church Pews: long bunker between 3 and 4 with ~12 grass ridges running along it
    let best=null,ba=0;for(const P of(F.bk||[])){let a=0;for(let i=0;i<P.length;i++){const q=P[i],r=P[(i+1)%P.length];a+=q[0]*r[1]-r[0]*q[1]}a=Math.abs(a/2);if(a>ba){ba=a;best=P}}
    if(best&&ba>900){let cx=0,cy=0;for(const p of best){cx+=p[0];cy+=p[1]}cx/=best.length;cy/=best.length;let sxx=0,syy=0,sxy=0;for(const p of best){const dx=p[0]-cx,dy=p[1]-cy;sxx+=dx*dx;syy+=dy*dy;sxy+=dx*dy}
      const ang=.5*Math.atan2(2*sxy,sxx-syy),ca=Math.cos(ang),sa=Math.sin(ang);let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(const p of best){const dx=p[0]-cx,dy=p[1]-cy,v=dx*ca+dy*sa,u=-dx*sa+dy*ca;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v)}
      const n=12,sp=(u1-u0)/(n+.5);pews={P:best,cx,cy,ang,u0,u1,v0,v1,sp,n};
      pews.at=(x,y)=>{const dx=x-cx,dy=y-cy,v=dx*ca+dy*sa,u=-dx*sa+dy*ca;if(u<u0||u>u1||v<v0+3||v>v1-3)return 0;const f=(u-u0)/sp-.5,k=Math.round(f);if(k<0||k>=n)return 0;const d=Math.abs(f-k)*sp;return d<sp*.24?1:d<sp*.36?1-(d-sp*.24)/(sp*.12):0};
      for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=j*W+i;if(SU[k]!==6)continue;if(pews.at(i+X0+.5,j+Y0+.5)>.5)SU[k]=1}}}
  // ---- green model ----
  let gcx=0,gcy=0;for(const p of G){gcx+=p[0];gcy+=p[1]}gcx/=G.length;gcy/=G.length;
  let grad=0;for(const p of G)grad=Math.max(grad,Math.hypot(p[0]-gcx,p[1]-gcy));
  const ta=R()*TAU,tm=R.range(.008,.022);
  const gm={cx:gcx,cy:gcy,tx:Math.cos(ta)*tm,ty:Math.sin(ta)*tm,b:[]};
  // greens generally tilt back-to-front
  gm.ty=-Math.abs(gm.ty)-.004;
  const nb=2+R.int(3);for(let i=0;i<nb;i++){const a=R()*TAU,d=R()*grad*.75;gm.b.push([gcx+Math.cos(a)*d,gcy+Math.sin(a)*d,R.range(4,8),R.range(-.35,.45)])}
  while(gm.b.length<4)gm.b.push([gcx,gcy,5,0]);
  // Biarritz (Chicago GC 3): the deep swale across the middle of the green (real feature; DEM too coarse to show it)
  if(course.id==='chicago'&&hi===2){const L0=Math.hypot(gcx,gcy)||1,ux=gcx/L0,uy=gcy/L0;gm.b.length=0;for(let k=-6;k<=6;k++)gm.b.push([gcx-uy*k*2.4,gcy+ux*k*2.4,4.5,-.17])/* v1.21: swale ~0.8 yd deep, ~11% max slope (was ~3.4 yd deep: putts could not cross) */;gm.tx*=.3;gm.ty*=.3;gm.swale=[ux,uy]}
  // fold the real DEM slope of the green site into the tilt (capped: greens are built flatter than the hillside)
  const dGC=dz(gcx,gcy),ddx=(dz(gcx+8,gcy)-dz(gcx-8,gcy))/16,ddy=(dz(gcx,gcy+8)-dz(gcx,gcy-8))/16;
  {const k=.55;gm.tx+=ddx*k;gm.ty+=ddy*k;const m=Math.hypot(gm.tx,gm.ty);if(m>.042){gm.tx*=.042/m;gm.ty*=.042/m}}
  gm.dem=[ddx,ddy];
  const greenH=(x,y)=>{let h=gm.tx*(x-gcx)+gm.ty*(y-gcy);for(const b of gm.b){const dx=x-b[0],dy=y-b[1];h+=b[3]*Math.exp(-(dx*dx+dy*dy)/(2*b[2]*b[2]))}return h};
  const greenG=(x,y)=>{let gx=gm.tx,gy=gm.ty;for(const b of gm.b){const dx=x-b[0],dy=y-b[1],e=b[3]*Math.exp(-(dx*dx+dy*dy)/(2*b[2]*b[2]))/(b[2]*b[2]);gx-=dx*e;gy-=dy*e}return[gx,gy]};
  /* v1.21: putting surfaces stay puttable everywhere: cap the steepest green slope at 4% (tilt + bumps scaled together); the Chicago 3 Biarritz swale is exempt */
  if(!gm.swale){let mg=0;for(let v=-grad;v<=grad;v+=1.5)for(let u=-grad;u<=grad;u+=1.5){if(u*u+v*v>grad*grad*.8)continue;const q=greenG(gcx+u,gcy+v);mg=Math.max(mg,Math.hypot(q[0],q[1]))}
    if(mg>.04){const k=.04/mg;gm.tx*=k;gm.ty*=k;for(const b of gm.b)b[3]*=k;gm.cap=+k.toFixed(2)}}
  const GA=9.81*1.0936;
  // cup placement
  const okCup=(x,y,r)=>{for(let a=0;a<8;a++){const s=surfAt(x+Math.cos(a/8*TAU)*r,y+Math.sin(a/8*TAU)*r);if(s!==5)return false}return surfAt(x,y)===5};
  let cup=null;const RC=RNG((opts.cupSeed||'')+course.id+hi);
  for(let tries=0;tries<200&&!cup;tries++){const a=RC()*TAU,d=Math.sqrt(RC())*grad;const x=gcx+Math.cos(a)*d,y=gcy+Math.sin(a)*d;if(okCup(x,y,tries<120?5:3)){const q=greenG(x,y);if(Math.hypot(q[0],q[1])<.03||tries>150)cup={x,y}}}
  if(opts.cupRaw){const c=tf(opts.cupRaw);if(surfAt(c[0],c[1])===5)cup={x:c[0],y:c[1]}}
  if(!cup)cup={x:gcx,y:gcy};
  if(opts.probe)return{cupRaw:toRaw(cup.x,cup.y),T0:T0.slice(),L};
  // ---- heights (1 yd grid, nodes) ----
  const NW=W+1,NH=H+1,HT=new Float32Array(NW*NH);
  const blur=(code,rad)=>{const m=new Float32Array(W*H);for(let i=0;i<m.length;i++){const s=SU[i];m[i]=(typeof code==='function'?code(s):s===code)?1:0}
    const t=new Float32Array(W*H);for(let pass=0;pass<2;pass++){for(let j=0;j<H;j++){let acc=0;for(let i=-rad;i<W+rad;i++){if(i+rad<W)acc+=m[j*W+i+rad];if(i-rad-1>=0)acc-=m[j*W+i-rad-1];if(i>=0&&i<W)t[j*W+i]=acc/(2*rad+1)}}
      for(let i=0;i<W;i++){let acc=0;for(let j=-rad;j<H+rad;j++){if(j+rad<H)acc+=t[(j+rad)*W+i];if(j-rad-1>=0)acc-=t[(j-rad-1)*W+i];if(j>=0&&j<H)m[j*W+i]=acc/(2*rad+1)}}}return m};
  // smooth sand coverage from the real polygons (4 px/yd, area-averaged) instead of the 1-yd raster, so bunker lips have no stair steps
  const boxF=(src,rad)=>{const m=Float32Array.from(src),t=new Float32Array(W*H);for(let pass=0;pass<2;pass++){for(let j=0;j<H;j++){let acc=0;for(let i=-rad;i<W+rad;i++){if(i+rad<W)acc+=m[j*W+i+rad];if(i-rad-1>=0)acc-=m[j*W+i-rad-1];if(i>=0&&i<W)t[j*W+i]=acc/(2*rad+1)}}
      for(let i=0;i<W;i++){let acc=0;for(let j=-rad;j<H+rad;j++){if(j+rad<H)acc+=t[(j+rad)*W+i];if(j-rad-1>=0)acc-=t[(j-rad-1)*W+i];if(j>=0&&j<H)m[j*W+i]=acc/(2*rad+1)}}}return m};
  const polyCov=(polys)=>{const K=4,cv=document.createElement('canvas');cv.width=W*K;cv.height=H*K;const q=cv.getContext('2d');q.fillStyle='#fff';q.scale(K,K);
    for(const P of polys){q.beginPath();P.forEach((p,i)=>{const x=p[0]-X0,y=Y1-p[1];i?q.lineTo(x,y):q.moveTo(x,y)});q.closePath();q.fill()}
    const d=q.getImageData(0,0,W*K,H*K).data,m=new Float32Array(W*H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){let a=0;const r0=(H-1-j)*K;for(let v=0;v<K;v++)for(let u=0;u<K;u++)a+=d[((r0+v)*W*K+i*K+u)*4];m[j*W+i]=a/(K*K*255)}
    const t=new Float32Array(W*H);for(let j=0;j<H;j++)for(let i=0;i<W;i++){let a=0,n=0;for(let v=-1;v<=1;v++)for(let u=-1;u<=1;u++){const ii=i+u,jj=j+v;if(ii<0||jj<0||ii>=W||jj>=H)continue;a+=m[jj*W+ii]*(u||v?1:2);n+=u||v?1:2}t[j*W+i]=a/n}return t};
  const mS=polyCov(F.bk||[]);
  const mG=blur(s=>s===5||s===4,3),mW=(F.wa&&F.wa.length)?(()=>{const c=polyCov(F.wa),near=boxF(c,3),o=new Float32Array(W*H);for(let k=0;k<o.length;k++)o[k]=near[k]>0.001?c[k]:(SU[k]===7?1:0);return boxF(o,2)})():blur(7,2),mT=blur(3,2);const mWB=boxF(mW,4);const mQ=QP.length?boxF(polyCov(QP),3):null;
  const und=st.und*(par===3?.8:1)*(DEM_OK?.55:1);const gBase=fbm2(gcx,gcy,seedN)*und+.35+dGC;
  const cellM=(m,i,j)=>{i=clamp(i,0,W-1);j=clamp(j,0,H-1);return m[j*W+i]};
  // famous deep pot bunkers (real OSM bunker polygons, deepened): Pine Valley 10 "Devil's Asshole", short-right of the green
  const POTS={'pinevalley:9':{dx:6,dy:-20,depth:2.3},'riviera:5':{dx:0,dy:0,depth:1.5}};const pot=(()=>{const q=POTS[course.id+':'+hi];if(!q||!F.bk)return null;let best=null,bd=14;
    for(const P of F.bk){let a=0,cx=0,cy=0;for(let k=0;k<P.length;k++){const u=P[k],v=P[(k+1)%P.length];a+=u[0]*v[1]-v[0]*u[1];cx+=u[0];cy+=u[1]}a=Math.abs(a/2);cx/=P.length;cy/=P.length;
      const d=Math.hypot(cx-(gcx+q.dx),cy-(gcy+q.dy));if(a<60&&d<bd){bd=d;best={x:cx,y:cy,r:Math.max(1.6,Math.sqrt(a/Math.PI)),depth:q.depth}}}return best})();
  // v1.15 (added feature, not in OSM): Lookaway cart-path bridges with no mapped water under them get a small creek/ditch (shallow channel, painted dark water + banks + reeds).
  // Plays as plain rough (no penalty) and stops well short of fairways, greens and tees.
  const CRK=[],BRK=[],LKT={lookaway:1,augusta:1,pinevalley:1,cypress:1,shinnecock:1,oakmont:1,merion:1,ngla:1,sandhills:1,fishers:1,chicago:1,seminole:1,wingedfoot:1,friars:1,crystal:1,lacc:1,tcc:1,riviera:1,muirfieldv:1,oaklandhills:1,oakhill:1,peachtree:1,pacificdunes:1,shadowcreek:1,prairie:1};if(LKT[course.id]){// v1.19: batch A courses get the Lookaway treatment (creeks under dry OSM bridges; bridges that cross nothing are dropped)
const WAT=(F.wa||[]).concat(sea,F.sd||[],course.id==='lacc'?(F.bk||[]):[]);/* v1.22: a bridge over a dry wash (LACC barranca, waste sand) already crosses something: no added creek */const PLAY=(F.fw||[]).concat(F.gr||[],F.te||[]).map(P=>P.concat([P[0]]));
    const inW=(x,y)=>{for(const P of WAT)if(pip(x,y,P))return true;return false};
    const dPlay=(x,y)=>{let d=1e9;for(const P of PLAY){if(pip(x,y,P))return 0;d=Math.min(d,segD(x,y,P))}return d};
    for(const L of F.br||[]){const a=L[0],c=L[L.length-1];let wet=false;for(let t=0;t<=1.001;t+=.05){const x=a[0]+(c[0]-a[0])*t,y=a[1]+(c[1]-a[1])*t;if(inW(x,y)){wet=true;break}}if(wet){BRK.push(L);continue}
      const sp=Math.hypot(c[0]-a[0],c[1]-a[1])||1,ux=(c[0]-a[0])/sp,uy=(c[1]-a[1])/sp,nx=-uy,ny=ux,mx=(a[0]+c[0])/2,my=(a[1]+c[1])/2;
      const R3=RNG('crk'+Math.round(sp*10)),A1=R3.range(2.5,4.5),k1=R3.range(.07,.11),p1=R3.range(0,6.28),A2=R3.range(.8,1.6),k2=R3.range(.19,.27),p2=R3.range(0,6.28),lim=Math.min(sp*.25,1.5);
      const off=s2=>{const v=A1*Math.sin(s2*k1+p1)+A2*Math.sin(s2*k2+p2)-(A1*Math.sin(p1)+A2*Math.sin(p2));const w=1-Math.exp(-((s2/7)**2));return Math.max(-lim-w*9,Math.min(lim+w*9,v*(.25+.75*w)))};
      const side=dir=>{const o=[];for(let s2=dir;Math.abs(s2)<=30;s2+=dir){const t=off(s2),x=mx+nx*s2+ux*t,y=my+ny*s2+uy*t;if(x<X0+2||x>X1-2||y<Y0+2||y>Y1-2||inW(x,y)||dPlay(x,y)<10)break;o.push([x,y])}return o};
      if(dPlay(mx,my)<10)continue;const P=side(-1).reverse().concat([[mx,my]],side(1));if(P.length<Math.min(16,sp+6))continue;
      let bb=[1e9,1e9,-1e9,-1e9];for(const p of P){bb=[Math.min(bb[0],p[0]),Math.min(bb[1],p[1]),Math.max(bb[2],p[0]),Math.max(bb[3],p[1])]}
      CRK.push({P,w:1.05,bb,seed:Math.round(sp*10)});BRK.push(L)}if(!{lookaway:1,augusta:1}[course.id])F.br=BRK}
  const crkD=(x,y,m)=>{let d=1e9,f=0;for(const c of CRK){if(x<c.bb[0]-m||x>c.bb[2]+m||y<c.bb[1]-m||y>c.bb[3]+m)continue;const P=c.P;for(let k=0;k<P.length-1;k++){const a=P[k],b=P[k+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;let t=((x-a[0])*dx+(y-a[1])*dy)/l2;t=t<0?0:t>1?1:t;const e=Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);if(e<d){d=e;f=Math.min(k+t,P.length-1-k-t)}}}return[d,f]};// distance to the nearest creek + distance (yd) from its nearer end
  // v1.15: Augusta 8 has grass mounds (no bunkers) short-left of and around the green; the 10 m DEM can't resolve them
  const MND=course.id==='augusta'&&hi===7?(()=>{const R2=RNG('mnd8'),o=[];for(let n=0;n<7;n++)o.push([gcx+R2.range(-34,-13),gcy+R2.range(-42,6),R2.range(1.1,2.1),R2.range(4.5,7.5)]);o.push([gcx+R2.range(14,20),gcy+R2.range(-30,-14),1.3,5.5]);return o})():null;
  for(let j=0;j<NH;j++)for(let i=0;i<NW;i++){const x=i+X0,y=j+Y0;
    const a=(cellM(mG,i,j)+cellM(mG,i-1,j)+cellM(mG,i,j-1)+cellM(mG,i-1,j-1))/4,sd=(cellM(mS,i,j)+cellM(mS,i-1,j)+cellM(mS,i,j-1)+cellM(mS,i-1,j-1))/4,
      wa=(cellM(mW,i,j)+cellM(mW,i-1,j)+cellM(mW,i,j-1)+cellM(mW,i-1,j-1))/4,te=(cellM(mT,i,j)+cellM(mT,i-1,j)+cellM(mT,i,j-1)+cellM(mT,i-1,j-1))/4;
    const gw=smooth(clamp(a*1.6-.3,0,1));const nearG=Math.hypot(x-gcx,y-gcy)<grad+12;
    const dl=segD(x,y,hl);const base=dz(x,y);let h=base+fbm2(x,y,seedN)*und*(.45+.55*smooth(clamp((dl-15)/45,0,1)))+.07*vnoise(x/7+seedN,y/7)+.035*vnoise(x/3.1,y/3.1-seedN);h=nearG?h*(1-gw)+(gBase+greenH(x,y))*gw:h+gw*.25;const hG=h;h-=sd*.75;h-=wa*.7+Math.max(0,cellM(mWB,i,j)-wa*.5)*.55;if(mQ){const q=cellM(mQ,i,j);if(q>0)h-=smooth(clamp(q*1.6,0,1))*3.2+.4*vnoise(x/4.3,y/3.7)*q}h+=te*.18;if(pews){const pw=pews.at(x,y);if(pw>0)h+=smooth(pw)*.95}if(pot){const pd=Math.hypot(x-pot.x,y-pot.y);if(pd<pot.r+2)h-=pot.depth*smooth(clamp((pot.r+2-pd)/2.4,0,1))}{const r=Math.hypot(x,y);if(r<10){const w=smooth(clamp((10-r)/4,0,1));h=lerp(h,.22,w)}}
    if(CRK.length){const q=crkD(x,y,5);if(q[0]<4.5){const tp=smooth(clamp(q[1]/7,0,1));h-=tp*(.8*smooth(clamp((4.5-q[0])/3.2,0,1))+.15*smooth(clamp((1.3-q[0])/1.3,0,1)))}}
    if(gw>0)h=lerp(h,hG,gw);/* v1.21: water/bunker/creek carving never cuts into a putting surface (no ditches on greens) */
    HT[j*NW+i]=h}
  // rocky coasts (Cypress, Pebble, Pacific Dunes): the coarse DEM smears the bluffs into ramps, so keep the inland bluff height to the mapped shoreline and drop it as a cliff face
  if(CLIFF_C[course.id]&&sea.length){const sc=polyCov(sea),n1=boxF(sc,1),n8=boxF(sc,8);const zs=[];for(let j=0;j<NH;j+=2)for(let i=0;i<NW;i+=2)if(cellM(sc,i,j)>.9)zs.push(HT[j*NW+i]);
    if(zs.length>20){zs.sort((a,b)=>a-b);const sz=zs[zs.length>>1];const H2=Float32Array.from(HT);
      for(let j=0;j<NH;j++)for(let i=0;i<NW;i++){const b8=cellM(n8,i,j);if(b8<=0.002)continue;const k=j*NW+i,cs=cellM(sc,i,j);
        if(cs<.5){let hp=H2[k];for(let v=-9;v<=9;v+=3)for(let u=-9;u<=9;u+=3){const ii=clamp(i+u,0,NW-1),jj=clamp(j+v,0,NH-1);if(cellM(sc,ii,jj)<.3)hp=Math.max(hp,H2[jj*NW+ii])}
          const lift=hp-sz>3?smooth(clamp(b8*4,0,1)):0;let h=lerp(H2[k],Math.max(H2[k],hp-.4),lift*.85);const e=cellM(n1,i,j);h=lerp(h,sz-.8,1?smooth(clamp((e-.3)/.16,0,1)):smooth(clamp((e-.05)/.4,0,1)))/* v1.20 all cliff coasts: the drop happens over ~1 yd at the mapped shoreline = a rock face, not a ramp */;HT[k]=h}
        else HT[k]=Math.min(H2[k],sz-.8)}}}
  const hAt=(x,y)=>{const fx=clamp(x-X0,0,W-.001),fy=clamp(y-Y0,0,H-.001),i=Math.floor(fx),j=Math.floor(fy),u=fx-i,v=fy-j,k=j*NW+i;
    return(HT[k]*(1-u)+HT[k+1]*u)*(1-v)+(HT[k+NW]*(1-u)+HT[k+NW+1]*u)*v};
  const slopeAt=(x,y)=>{if(Math.hypot(x-gcx,y-gcy)<grad+3){const k=surfAt(x,y);if(k===5||k===4){const q=greenG(x,y);return{x:-GA*q[0],y:-GA*q[1]}}}
    const e=.8,gx=(hAt(x+e,y)-hAt(x-e,y))/(2*e),gy=(hAt(x,y+e)-hAt(x,y-e))/(2*e);return{x:-GA*gx,y:-GA*gy}};
  const gradAt=(x,y)=>{const e=1.5;return[(hAt(x+e,y)-hAt(x-e,y))/(2*e),(hAt(x,y+e)-hAt(x,y-e))/(2*e)]};
  // ---- trees ----
  const trees=[];const TR=RNG('t'+course.id+hi);const dens=st.trees;
  const mix=treeMix(course.id);
  const addT=(x,y,s,sp0,force)=>{const k=surfIdx(x,y);if(k<0)return;const c=SU[k];if(!force&&(c===2||c===3||c===5||c===4||c===6||c===7))return;
    if(!force)for(const q of[[4,0],[-4,0],[0,4],[0,-4]]){const c2=surfAt(x+q[0],y+q[1]);if(c2===2||c2===5||c2===4||c2===3||c2===7)return}
    const sp=sp0!==undefined?sp0:pickSpecies(mix,TR());const S=SPECIES[sp];const h=lerp(S.h[0],S.h[1],TR())*(s||1);trees.push({x,y,sp,v:TR.int(8),h,w:h*S.w,cb:S.cb})};
  const kindOf=()=>undefined;
  // wood polygons: jittered grid
  const woodMask=new Uint8Array(W*H);{const c2=document.createElement('canvas');c2.width=W;c2.height=H;const g2=c2.getContext('2d');g2.fillStyle='#fff';
    for(const P of(F.wd||[])){g2.beginPath();P.forEach((p,i)=>{const x=p[0]-X0,y=Y1-p[1];i?g2.lineTo(x,y):g2.moveTo(x,y)});g2.closePath();g2.fill()}
    const d2=g2.getImageData(0,0,W,H).data;for(let r=0;r<H;r++)for(let i=0;i<W;i++)woodMask[(H-1-r)*W+i]=d2[(r*W+i)*4]>128?1:0}
  const gEnd=hl[hl.length-1];
  const farOut=(x,y)=>{if(segD(x,y,hl)<50)return false;if(y>-15&&y<gEnd[1]+25&&Math.abs(x-gEnd[0]*clamp(y/Math.max(1,gEnd[1]),0,1))<55)return false;
    for(let a=0;a<8;a++){const q=a/8*TAU;for(const r of[8,16]){const c2=surfAt(x+Math.cos(q)*r,y+Math.sin(q)*r);if(c2===2||c2===3||c2===4||c2===5||c2===7)return false}}return true};
  const sp=st.tree===1?6.5:7.5;
  for(let y=Y0;y<Y1;y+=sp)for(let x=X0;x<X1;x+=sp){const jx=x+TR()*sp,jy=y+TR()*sp,k=surfIdx(jx,jy);if(k<0)continue;
    if(woodMask[k]){if(TR()<.92*clamp(dens*1.6+.08,0,1))addT(jx,jy,TR.range(.8,1.25),kindOf());continue}
    // filler trees only well outside the corridor (never between tee, fairway, water and green)
    if((SU[k]===1||SU[k]===8)&&TR()<.03*dens&&farOut(jx,jy))addT(jx,jy,TR.range(.8,1.2)*(dens<.1?.6:1),kindOf())}
  for(let i=0;i<(geo.t||[]).length;i+=2){if(hash2(i,77)>clamp(dens*2+(dens<.1?.08:.3),0,1))continue;const p=tf([geo.t[i],geo.t[i+1]]);if(p[0]>X0&&p[0]<X1&&p[1]>Y0&&p[1]<Y1&&![2,3,4,5,6].includes(surfAt(p[0],p[1]))&&segD(p[0],p[1],hl)>(dens<.3?12:5))addT(p[0],p[1],TR.range(.9,1.2)*(dens<.1?.6:1),kindOf())}
  if(course.id==='pebble'&&hi===17)for(let i=0;i<(geo.t||[]).length;i+=2){const p=tf([geo.t[i],geo.t[i+1]]);if(p[1]>150&&segD(p[0],p[1],hl)<25)addT(p[0],p[1],1.35,3,1)}// v1.15: Pebble 18's landmark cypress in the fairway and right of the green (OSM nodes)
  if(course.id==='augusta'){for(let n=0;n<140;n++){const a=TR()*TAU,d=TR.range(16,34);const x=gcx+Math.cos(a)*d*1.2,y=gcy+Math.sin(a)*d;const k=surfIdx(x,y);if(k>=0&&(SU[k]===1||SU[k]===8))addT(x,y,1,TR()<.8?6:5)}}
  // keep the tee camera clear: nothing within ~16 yd of the tee or inside the forward view cone
  for(let i=trees.length-1;i>=0;i--){const t=trees[i],r=Math.hypot(t.x,t.y),rc=Math.hypot(t.x,t.y+10);if(r<16+t.w*.5||rc<14+t.w*.6||(t.y>-25&&t.y<70&&Math.abs(t.x)<12+Math.max(0,t.y)*.32+t.w*.6))trees.splice(i,1)}
  // Pacific Dunes: open dunes with sparse, short, wind-bent shore pines rather than a pine corridor
  if(course.id==='pacificdunes'){const RP=RNG('pd'+hi);for(let i=trees.length-1;i>=0;i--){if(RP()<.6){trees.splice(i,1);continue}const t=trees[i];if(t.sp===1){t.sp=RP()<.5?3:7;t.cb=SPECIES[t.sp].cb}const k=t.sp===7?.55:.8;t.h*=k;t.w*=t.sp===7?.8:1}}
  // tee chute: keep the line of play open from the tee to where the fairway starts along the hole line (doglegs like Augusta 13 included); woods ground in the chute becomes rough
  {let dF=0,tot=0;for(let i=1;i<hl.length;i++)tot+=Math.hypot(hl[i][0]-hl[i-1][0],hl[i][1]-hl[i-1][1]);for(let d=20;d<Math.min(300,tot-30);d+=3){const q=pointAt(hl,d);if(surfAt(q[0],q[1])===2){dF=d;break}}
    if(dF>0){const ch=[];for(let d=0;d<=dF+10;d+=4)ch.push([pointAt(hl,d),10+d*.1]);const inCh=(x,y,m)=>{const f=.75+.55*vnoise(x*.09+3.1,y*.09);for(const [q,hw] of ch)if(Math.hypot(x-q[0],y-q[1])<hw*f+m)return true;return false};
      for(let i=trees.length-1;i>=0;i--){const t=trees[i];if(inCh(t.x,t.y,t.w*.45))trees.splice(i,1)}
      for(const [q,hw] of ch)for(let y=Math.floor(q[1]-hw);y<=q[1]+hw;y++)for(let x=Math.floor(q[0]-hw);x<=q[0]+hw;x++){if(Math.hypot(x-q[0],y-q[1])>hw)continue;const k=surfIdx(x,y);if(k>=0&&SU[k]===8)SU[k]=1}}}
  if(trees.length>4500)trees.length=4500;
  // tree grid for collision
  const TG={};for(const t of trees){const k=(Math.floor(t.x/10))+','+(Math.floor(t.y/10));(TG[k]=TG[k]||[]).push(t)}
  const addTree=t=>{const k=(Math.floor(t.x/10))+','+(Math.floor(t.y/10));(TG[k]=TG[k]||[]).push(t)};
  const treeHit=(x,y,z)=>{const gx=Math.floor(x/10),gy=Math.floor(y/10);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=TG[(gx+a)+','+(gy+b)];if(!l)continue;for(const t of l){if(t.gone)continue;const d=Math.hypot(x-t.x,y-t.y);if(d>t.w*.5)continue;
    if(z<t.h*t.cb){if(d<.4&&t.sp!==6)return t;if(t.sp===6&&z<t.h&&d<t.w*.4)return t;continue}if(z<t.h){const f=(z-t.h*t.cb)/(t.h*(1-t.cb));const rr=t.w*.5*(t.sp===0||t.sp===7?Math.sin(Math.PI*clamp(f*.9+.1,0,1)):Math.sqrt(Math.max(0,1-(2*f-1)**2)))*.8;if(d<rr)return t}}}return null};
  const fwAim=[];for(let s=0;s<yards;s+=5){const p=pointAt(hl,s);fwAim.push([p[0],p[1],surfAt(p[0],p[1])])}
  for(let i=blds.length-1;i>=0;i--){const b=blds[i];const cx=b.P.reduce((a,p)=>a+p[0],0)/b.P.length,cy=b.P.reduce((a,p)=>a+p[1],0)/b.P.length;let bad=Math.hypot(cx,cy)<30||segD(cx,cy,hl)<18;
    for(const p of b.P){const ib=p[0]>X0+1&&p[0]<X1-1&&p[1]>Y0+1&&p[1]<Y1-1;const k=ib?surfAt(p[0],p[1]):1;if((k>=2&&k<=6)||Math.hypot(p[0],p[1])<85)bad=true}if(bad)blds.splice(i,1)}// drop footprints on play surfaces / the tee / the line (stale or misprojected OSM)
  for(let i=trees.length-1;i>=0;i--){const t=trees[i];if(inBld(t.x,t.y,0)||(CRK.length&&crkD(t.x,t.y,4)[0]<3.2)||(course.id==='augusta'&&hi===16&&t.y>140&&t.y<260&&segD(t.x,t.y,hl)<30))trees.splice(i,1)}// Augusta 17: Eisenhower Tree zone (removed 2014) kept open// no trees growing through roofs
  return{crk:CRK,blds,inBld,addTree,rot,course,hi,par,yards,teeIdx,line:hl,X0,Y0,X1,Y1,W,H,S:SU,HT,NW,NH,hAt,surfAt,slopeAt,greenH,greenG,gm,G,F,sea,cup,trees,treeHit,st,woodMask,tee:{x:0,y:0},pews,toRaw,demAt:sf!==null?dzP:dz,gradAt,teeFix:opts.teeFix,name:(course.names&&course.names[hi])||(hd.nm&&!/\d|hole|course/i.test(hd.nm)?hd.nm:''),sig:course.sig&&course.sig[hi+1],quarry:QP,synth:opts.synth||[],grid:opts.grid}}

function projOn(L,x,y){let best=1e9,bs=0,acc=0;for(let i=0;i<L.length-1;i++){const a=L[i],b=L[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1,l=Math.sqrt(l2);let t=((x-a[0])*dx+(y-a[1])*dy)/l2;if(i>0)t=Math.max(0,t);t=Math.min(1,t);const d=Math.hypot(a[0]+dx*t-x,a[1]+dy*t-y);if(d<best){best=d;bs=acc+t*l}acc+=l}return bs}
// place tee so straight tee->pin distance equals scorecard yardage, on land, preferring OSM tee boxes
function buildHole(course,geo,hi,teeIdx,opts){
  opts=opts||{};const yards=course.tees[teeIdx].y[hi];
  const key=course.id+':'+hi+':'+teeIdx+':'+(opts.cupSeed||'');
  let tp=(buildHole.cache||(buildHole.cache={}))[key];
  if(!tp){const pr=buildHole0(course,geo,hi,teeIdx,Object.assign({},opts,{probe:true}));const C=pr.cupRaw,Pd=pr.T0;
    const dz=k=>(geo.f[k]||[]).map(dec);const W=dz('wa').concat((geo.sea||[]).map(dec)),BAD=dz('gr').concat(dz('bk')),TE=dz('te'),GC=dz('gc');
    const inAny=(A,x,y)=>{for(const P of A)if(pip(x,y,P))return true;return false};
    const land=(x,y)=>!inAny(W,x,y)&&!inAny(BAD,x,y)&&(!GC.length||inAny(GC,x,y));
    const clear=(x,y)=>{for(let a=0;a<12;a++){const q=a/12*TAU;if(!land(x+Math.cos(q)*7,y+Math.sin(q)*7))return false}return true};
    const proj=(x,y)=>{const dx=x-C[0],dy=y-C[1],d=Math.hypot(dx,dy)||1;return[C[0]+dx/d*yards,C[1]+dy/d*yards]};
    const cand=[];const add=(x,y,pen)=>{const p=proj(x,y);cand.push([p[0],p[1],pen])};
    add(Pd[0],Pd[1],0);
    for(let a=-36;a<=36;a+=3)add(Pd[0]+(Pd[1]-C[1])/yards*a,Pd[1]-(Pd[0]-C[0])/yards*a,0);
    for(const P of TE){let cx=0,cy=0;for(const p of P){cx+=p[0];cy+=p[1]}cx/=P.length;cy/=P.length;if(Math.hypot(cx-Pd[0],cy-Pd[1])>90)continue;
      let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;for(const p of P){mnx=Math.min(mnx,p[0]);mny=Math.min(mny,p[1]);mxx=Math.max(mxx,p[0]);mxy=Math.max(mxy,p[1])}
      for(let x=mnx;x<=mxx;x+=2)for(let y=mny;y<=mxy;y+=2)if(pip(x,y,P))add(x,y,-1)}
    const land2=(x,y)=>!inAny(W,x,y)&&!inAny(BAD,x,y);let best=null;for(const c of cand){const inTe=inAny(TE,c[0],c[1]);let sc=Math.hypot(c[0]-Pd[0],c[1]-Pd[1])+(inTe?0:22);if(!land2(c[0],c[1]))sc+=1e6;else if(!land(c[0],c[1]))sc+=80;else if(!clear(c[0],c[1]))sc+=60;if(!best||sc<best[0])best=[sc,c,inTe]}
    tp={teeRaw:[best[1][0],best[1][1]],cupRaw:C,fix:{moved:Math.round(Math.hypot(best[1][0]-Pd[0],best[1][1]-Pd[1])),onTe:best[2],ok:best[0]<1e6}};buildHole.cache[key]=tp}
  return buildHole0(course,geo,hi,teeIdx,Object.assign({},opts,{teeRaw:tp.teeRaw,cupRaw:tp.cupRaw,teeFix:tp.fix}))}

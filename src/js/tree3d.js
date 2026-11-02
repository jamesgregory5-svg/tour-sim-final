'use strict';
/* ---------- 3D trees (v1.14) ----------
   Real geometry near the camera: tapered, flared trunks and recursively forked branch tubes carrying instanced leaf-cluster cards
   (broadleaf sprays, pine needle tufts, cypress scale foliage) lit with soft crown normals, wrap light, translucency and crown AO.
   Far trees stay billboards, but the billboard atlas cells for these species are rendered FROM the same 3D meshes, so the far trees match.
   A dithered 8 yd crossfade hands each tree from billboard to mesh (no popping). Flowers (dogwood / azalea) and palms keep their painted billboards. */
let T3ST={cs:1,n:1,ao:1,amb:1,sun:1,br:1};// global multipliers (options sheet); 1 = shipped baseline
// James's v1.14 baseline: per species [card size, card count] + close-range lighting (ao,amb,sun,bright) + tee-distance lighting + far thinning
const T3P={1:{g:[1.45,1.2],N:[.6,1.15,.85,1],F:[1.2,1,1.05,1.05],thin:.5},2:{g:[1.45,1.2],N:[.6,1.15,.85,1],F:[1.2,1,1.05,1.05],thin:.5},0:{g:[.8,1.8],N:[1.8,1.,1.15,1.05],F:[1.2,1,1.05,1.05],thin:.45},7:{g:[.8,1.8],N:[1.8,1.,1.15,1.05],F:[1.2,1,1.05,1.05],thin:.45},4:{g:[1,1],N:[.6,1.15,.85,1],F:[.6,1.15,.85,1],thin:0}};
T3P[8]={g:[1.35,1.9],N:[1,1.05,1,1],F:[1.1,1.05,1,1],thin:.15};T3P[9]={g:[1.25,1.6],N:[1,1.05,1,1],F:[1.1,1.05,1,1],thin:.15};// fuller eucalyptus / sycamore crowns
T3P[3]={g:[1.25,1.25],N:[1.4,.95,1.,1],F:[1.3,.95,1.,1],thin:.25};
function t3g(sp,v){if((sp===8||sp===9)&&v>=2)return[1,1];return(T3P[sp]||T3PD).g}// only half the eucalyptus / sycamore variants get the fuller crown; the rest stay naturally airy
const T3PD={g:[1,1],N:[1,1,1,1],F:[1,1,1,1],thin:0};// render-style knobs (tree style options sheet)
const T3SP=[0,1,2,3,4,7,8,9];const T3NV=4;const T3R=150;
const T3LEAF={4:[.66,.78,.58],0:[.86,.96,.8],1:[.84,.9,.72],2:[.9,.95,.72],3:[.58,.7,.62],7:[.86,.96,.78],8:[.92,.95,.92],9:[.95,.98,.76]};
const T3BARK={4:[.46,.43,.38],0:[.42,.34,.27],1:[.47,.42,.36],2:[.48,.44,.38],3:[.34,.27,.21],7:[.40,.33,.27],8:[.64,.6,.53],9:[.74,.70,.62]};
function t3LeafTex(){const W=256,c=document.createElement('canvas');c.width=W*4;c.height=W;const g=c.getContext('2d');const R=RNG('t3leaf');
  // cell 0: broadleaf spray: twigs + ~300 overlapping leaves, denser in the middle, ragged edge
  g.save();g.strokeStyle='rgba(70,52,36,1)';g.lineCap='round';for(let i=0;i<7;i++){const a=R()*6.283;g.lineWidth=R.range(1.5,3);g.beginPath();g.moveTo(128,128);g.quadraticCurveTo(128+Math.cos(a+.3)*50,128+Math.sin(a+.3)*50,128+Math.cos(a)*105,128+Math.sin(a)*105);g.stroke()}
  for(let i=0;i<330;i++){const a=R()*6.283,d=Math.pow(R(),.75)*112,x=128+Math.cos(a)*d,y=128+Math.sin(a)*d;const L=R.range(9,17),w=L*R.range(.38,.55),ro=R()*6.283;const top=(128-y)/128;
    const l=R.range(17,31)+top*7+(d<50?-4:0);g.fillStyle=`hsl(${R.range(84,104)},${R.range(32,48)}%,${l}%)`;g.beginPath();g.ellipse(x,y,L*.5,w*.5,ro,0,6.283);g.fill();
    if(R()<.3){g.strokeStyle=`hsla(80,30%,${l+10}%,.5)`;g.lineWidth=.7;g.beginPath();g.moveTo(x-Math.cos(ro)*L*.45,y-Math.sin(ro)*L*.45);g.lineTo(x+Math.cos(ro)*L*.45,y+Math.sin(ro)*L*.45);g.stroke()}}g.restore();
  // cell 1: pine needle tufts radiating from short twigs
  g.save();g.translate(W,0);g.lineCap='round';for(let t=0;t<17;t++){const a=R()*6.283,d=Math.pow(R(),.7)*70,cx=128+Math.cos(a)*d,cy=128+Math.sin(a)*d*.8;g.strokeStyle='rgba(80,58,40,1)';g.lineWidth=2.4;g.beginPath();g.moveTo(128,128);g.lineTo(cx,cy);g.stroke();
    for(let k=0;k<60;k++){const b=R()*6.283,L=R.range(22,54);const up=Math.sin(b)<0?6:0;g.strokeStyle=`hsl(${R.range(100,124)},${R.range(22,36)}%,${R.range(13,26)+up}%)`;g.lineWidth=R.range(1.1,1.9);g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(b)*L,cy+Math.sin(b)*L*.85);g.stroke()}}g.restore();
  // cell 2: cypress / juniper scale foliage: dense flattened clumps of tiny scale sprays
  g.save();g.translate(W*2,0);for(let i=0;i<900;i++){const a=R()*6.283,d=Math.pow(R(),.6)*112,x=128+Math.cos(a)*d,y=128+Math.sin(a)*d*.62;const r=R.range(2.5,5.5);const top=(128-y)/80;
    g.fillStyle=`hsl(${R.range(110,128)},${R.range(22,34)}%,${R.range(16,28)+top*6}%)`;g.beginPath();g.ellipse(x,y,r,r*.7,R()*3,0,6.283);g.fill()}g.restore();
  // cell 3: palm frond segment: midrib along x with drooping leaflets on both sides
  g.save();g.translate(W*3,0);g.lineCap='round';g.strokeStyle='hsl(70,30%,34%)';g.lineWidth=3;g.beginPath();g.moveTo(0,128);g.lineTo(256,128);g.stroke();
  for(let i=0;i<46;i++){const x=i/46*256+R.range(-2,2);for(const sg of[-1,1]){const L=R.range(70,108)*(1-Math.abs(i/46-.5)*.35);g.strokeStyle=`hsl(${R.range(88,104)},${R.range(30,44)}%,${R.range(20,32)+(sg<0?5:0)}%)`;g.lineWidth=R.range(3,4.5);
    g.beginPath();g.moveTo(x,128);g.quadraticCurveTo(x+L*.35,128+sg*L*.5,x+L*.55,128+sg*L*.95);g.stroke()}}g.restore();
  return c}
function t3Gen(sp,v){const R=RNG('t3_'+sp+'_'+v);const S=SPECIES[sp];const P=[],N=[],U=[],K=[],I=[];
  const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const add=(a,b,s)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];
  const tube=(a,b,r0,r1)=>{const d=nrm([b[0]-a[0],b[1]-a[1],b[2]-a[2]]);const L=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const t=Math.abs(d[2])<.9?[0,0,1]:[1,0,0];const u=nrm(cr(d,t)),w=cr(d,u);
    const ns=r0>.012?8:r0>.005?6:4;const base=P.length/3;for(let e=0;e<2;e++){const c=e?b:a,r=e?r1:r0;for(let i=0;i<=ns;i++){const an=i/ns*6.2832,ca=Math.cos(an),sa=Math.sin(an);const n=[u[0]*ca+w[0]*sa,u[1]*ca+w[1]*sa,u[2]*ca+w[2]*sa];
      P.push(c[0]+n[0]*r,c[1]+n[1]*r,c[2]+n[2]*r);N.push(n[0],n[1],n[2]);U.push(i/ns,c[2]*8);K.push(0,1)}}
    for(let i=0;i<ns;i++){const a0=base+i,a1=a0+1,b0=base+ns+1+i,b1=b0+1;I.push(a0,a1,b1,a0,b1,b0)}};
  const buttress=r=>{const n=4+R.int(3);for(let k=0;k<n;k++){const az=k/n*6.283+R.range(-.35,.35);const c=[Math.cos(az),Math.sin(az)];tube([c[0]*r*.5,c[1]*r*.5,R.range(.02,.03)],[c[0]*r*R.range(1.5,2.),c[1]*r*R.range(1.5,2.),-.004],r*R.range(.35,.45),r*.12)}};
  const cards=[];// leaf cards: centre, size, normal hint, cell, flat
  const card=(c,s,cell,flat,out)=>cards.push({c,s,cell,flat,out});
  const branch=(p,d,len,r,depth,o)=>{let dd=nrm([d[0],d[1],d[2]+o.trop]);const e=add(p,dd,len);tube(p,e,r,r*o.taper);
    if(o.mid&&depth<=o.mid)o.spots.push({p:add(p,dd,len*.55),k:.75});
    if(depth<=0){o.spots.push({p:e,k:1});return}
    const nk=depth>=2&&R()<o.three?3:2;for(let i=0;i<nk;i++){const t=Math.abs(dd[2])<.9?[0,0,1]:[1,0,0];const u=nrm(cr(dd,t)),w=cr(dd,u);const ph=R()*6.283+i*6.283/nk;const ang=o.spread*R.range(.75,1.25);
      const nd=nrm(add(add(dd,u,Math.tan(ang)*Math.cos(ph)),w,Math.tan(ang)*Math.sin(ph)));branch(e,nd,len*R.range(o.lr[0],o.lr[1]),r*o.taper,depth-1,o)}};
  const broad=sp===1||sp===2||sp===9||sp===8;const pine=sp===0||sp===7;const cyp=sp===3;
  let spots=[];const r0={0:.016,1:.034,2:.028,3:.032,7:.018,8:.022,9:.03}[sp];
  if(broad){
    const th=(sp===8?R.range(.3,.42):sp===9?R.range(.24,.32):sp===1?R.range(.15,.24):R.range(.2,.28));const lean=[R.range(-.04,.04),R.range(-.04,.04)];
    const tr=R.range(.8,1.25);tube([0,0,0],[0,0,.035],r0*tr*1.75,r0*tr*1.05);buttress(r0*tr);// root flare + buttress roots
    let a=[0,0,.035];const nseg=5;for(let i=1;i<=nseg;i++){const b=[lean[0]*i/nseg+R.range(-.01,.01),lean[1]*i/nseg+R.range(-.01,.01),.035+(th-.035)*i/nseg];tube(a,b,r0*tr*(1-.28*(i-1)/nseg),r0*tr*(1-.28*i/nseg));a=b}
    const o={trop:sp===8?.3:sp===2?.2:.1,taper:.7,spots,mid:sp===8&&v>=2?0:1,three:sp===1?.6:.4,spread:sp===1?.62:sp===8?.42:.5,lr:sp===1?[.62,.8]:[.62,.76]};
    const nL=sp===1?4+(R()<.5?1:0):sp===8?3+(R()<.5?1:0):3+(R()<.6?1:0);const crown=1-th;
    for(let i=0;i<nL;i++){const az=i/nL*6.283+R.range(-.4,.4),el=(sp===1?R.range(.55,.95):sp===2?R.range(.35,.6):sp===8?R.range(.2,.45):R.range(.5,.85));
      branch(a,[Math.sin(el)*Math.cos(az),Math.sin(el)*Math.sin(az),Math.cos(el)],crown*(sp===1?.36:.33)*R.range(.85,1.12),r0*.7,sp===8&&v>=2?2:3,o)}
    if(sp!==1)branch(a,[0,0,1],crown*.34,r0*.6,2,o);// leader
  } else if(pine){
    const lob=sp===0;const cb=lob?R.range(.55,.68):R.range(.32,.46);const wind=lob?0:R.range(.15,.4);const wd=R()*6.283;
    const rr=r0*R.range(.8,1.3),bend=R.range(.006,.02),ph=R()*6.283;tube([0,0,0],[0,0,.035],rr*1.9,rr*1.1);buttress(rr*.8);let a=[0,0,.035];for(let i=1;i<=8;i++){const z=.035+.935*i/8;const b=[Math.sin(i*.9+ph)*bend+(lob?0:Math.cos(wd)*.04*i/8),Math.cos(i*.7+ph)*bend+(lob?0:Math.sin(wd)*.04*i/8),z];tube(a,b,rr*Math.pow(1-.8*(i-1)/8,1.2),rr*Math.pow(1-.8*i/8,1.2));a=b}
    {const ns=R.int(5)+2;for(let k=0;k<ns;k++){const z=R.range(.2,cb-.03),az=R()*6.283;const p0=[0,0,z];tube(p0,add(p0,[Math.cos(az),Math.sin(az),R.range(-.3,.1)],R.range(.02,.05)),.0035,.0012)}}// dead branch stubs on the bare trunk
    const levels=lob?R.int(3)+8:R.int(3)+7;const cR=S.w*.5;
    for(let l=0;l<levels;l++){const f=(l+R.range(.1,.9))/levels;const z=cb+(0.95-cb)*f;const env=lob?Math.sin(Math.PI*Math.min(1,.18+f*.9)):(1-f*.55);const nb=R.int(3)+3;
      for(let k=0;k<nb;k++){if(R()<.15)continue;const az=R()*6.283;const bias=lob?1:1+wind*Math.cos(az-wd)*1.6;const len=cR*env*R.range(.6,1.1)*bias;if(len<.03)continue;
        const el=Math.PI/2-R.range(.05,.4)+(f<.3?R.range(0,.25):0);const d=[Math.sin(el)*Math.cos(az),Math.sin(el)*Math.sin(az),Math.cos(el)];const p0=[Math.sin(z*1.7*6/0.94+v)*.006,0,z];
        const e=add(p0,d,len);tube(p0,e,.0055,.0025);
        for(let q=0;q<3;q++){const t=q===0?1:R.range(.55,.95);spots.push({p:add(add(p0,d,len*t),[0,0,1],R.range(-.004,.01)),k:.8+.2*t,pine:1})}
        if(len>cR*.4){const t=R.range(.35,.6),pm=add(p0,d,len*t);const sd=nrm([d[0]+R.range(-.6,.6),d[1]+R.range(-.6,.6),d[2]+.3]);const e2=add(pm,sd,len*.35);tube(pm,e2,.0042,.002);spots.push({p:e2,k:.85,pine:1})}}}
    for(let q=0;q<3;q++)spots.push({p:[a[0]+R.range(-.02,.02),a[1]+R.range(-.02,.02),.95+R.range(-.02,.02)],k:1,pine:1});
  } else if(cyp){// Monterey cypress: gnarled, often multi-stemmed trunk, limbs swept downwind, dense dark wind-sculpted crown in irregular flat-topped tiers
    const wd=R()*6.283,lean=R.range(.1,.28);const ns=1+(R()<.55?1:0)+(R()<.25?1:0);const tops=[];
    tube([0,0,0],[0,0,.03],r0*2.,r0*1.2);buttress(r0*1.1);
    for(let k=0;k<ns;k++){const az=wd+R.range(-1.,1.)+(k?R.range(-1.2,1.2):0);let a=[0,0,.03];const ht=R.range(.32,.5);for(let i=1;i<=4;i++){const t=i/4;const b=[Math.cos(az)*lean*ht*t+R.range(-.02,.02),Math.sin(az)*lean*ht*t+R.range(-.02,.02),.03+ht*t];tube(a,b,r0*(ns>1?.8:1)*(1-.3*(i-1)/4),r0*(ns>1?.8:1)*(1-.3*i/4));a=b}tops.push(a)}
    const o={trop:.05,taper:.66,spots,mid:2,three:.6,spread:.6,lr:[.6,.8]};
    for(const tp of tops){const nL=4+R.int(3);for(let i=0;i<nL;i++){const az=wd+R.range(-2.2,2.2),el=R.range(.7,1.35);const dn=Math.cos(az-wd);branch(tp,[Math.sin(el)*Math.cos(az),Math.sin(el)*Math.sin(az),Math.cos(el)],R.range(.2,.32)*(1+.35*dn),r0*.6,3,o)}}
    // low side limbs at several heights, so the crown is a mass of tiers rather than one umbrella
    for(let k=0;k<4;k++){const tp=tops[k%tops.length];const z=R.range(.18,tp[2]-.04);const f=z/tp[2];const p0=[tp[0]*f,tp[1]*f,z];const az=wd+R.range(-2.,2.);branch(p0,[Math.cos(az),Math.sin(az),R.range(.0,.35)],R.range(.14,.24),r0*.4,2,o)}
  }
  else if(sp===4){// palms, four real types by variant: 0 Washingtonia (tall, thin, dense crown + brown skirt), 1 sabal / cabbage (rough booted trunk, round crown), 2 royal (smooth grey swollen column, green crownshaft, long arching fronds), 3 date (thick patterned trunk, huge stiff crown)
    const ty=v%4;const PT=[{top:.9,r:.011,sw:1.7,nf:[30,40],L:[.14,.17],up:.9,dr:.9,dead:[8,12],shaft:0},{top:.76,r:.016,sw:1.35,nf:[24,32],L:[.19,.23],up:.8,dr:1.1,dead:[3,6],shaft:0},{top:.74,r:.019,sw:1.25,nf:[16,22],L:[.24,.29],up:.7,dr:1.3,dead:[0,2],shaft:.1},{top:.64,r:.027,sw:1.45,nf:[34,44],L:[.22,.27],up:1.0,dr:.85,dead:[5,9],shaft:0}][ty];
    const lean=R.range(.0,ty===0?.05:.1),wd=R()*6.283,cv=R.range(-.5,1.);let a=[0,0,0];const nsg=14;
    for(let i=1;i<=nsg;i++){const t=i/nsg;const b=[Math.cos(wd)*lean*(t*t*cv+t*(1-cv)),Math.sin(wd)*lean*(t*t*cv+t*(1-cv)),PT.top*t];const rf=t0=>{const sw=1+(PT.sw-1)*Math.exp(-t0*14);const bul=ty===2?1+.18*Math.exp(-Math.pow((t0-.45)*4,2)):1;return PT.r*sw*bul*(1-.25*t0)};tube(a,b,rf((i-1)/nsg),rf(t));a=b}
    if(PT.shaft){const b=add(a,[0,0,1],PT.shaft);tube(a,b,PT.r*.85,PT.r*.7);a=b}// royal crownshaft
    const frond=(az,up,L,dead)=>{const dir=[Math.cos(az),Math.sin(az)];const lat=[-dir[1],dir[0],0];const SG=8;const curl=R.range(.2,.5);const twist=R.range(-.3,.3);
      const pt=t=>{const z=(up*.6*t-PT.dr*t*t*.75-curl*Math.max(0,t-.75)*1.0)*L;const rr=L*t*(1-.12*t*t);return[a[0]+dir[0]*rr,a[1]+dir[1]*rr,a[2]+z]};
      for(let k=0;k<SG;k++){const t0=k/SG,t1=(k+1)/SG;const seg=[[pt(t0),t0],[pt(t1),t1]];const wf=t=>L*(dead?.1:.17)*Math.sin(Math.PI*Math.min(1,.08+t*.97));const fold=.45+twist*.3;
        for(const sg of[-1,1]){const base=P.length/3;const sn=nrm([lat[0]*sg*.55+dir[0]*.15,lat[1]*sg*.55+dir[1]*.15,1]);
          for(const [q,t] of seg){const w=wf(t);P.push(q[0],q[1],q[2]);N.push(sn[0],sn[1],sn[2]);U.push(.75+t*.25,.5);K.push(dead?2:1,.55+.45*t);
            P.push(q[0]+lat[0]*w*sg,q[1]+lat[1]*w*sg,q[2]-w*fold);N.push(sn[0],sn[1],sn[2]);U.push(.75+t*.25,sg<0?0:1);K.push(dead?2:1,.5+.5*t)}
          I.push(base,base+1,base+3,base,base+3,base+2)}}
      tube(a,pt(.15),.0035,.002)};// petiole
    const nf=R.int(PT.nf[1]-PT.nf[0])+PT.nf[0];for(let f=0;f<nf;f++){const az=f*2.39996+R.range(-.12,.12);const ring=f/nf;const up=lerp(PT.up*2.4,-.1,ring)+R.range(-.25,.25);frond(az,up,R.range(PT.L[0],PT.L[1])*(ring<.15?.65:1),0)}
    const nd=R.int(PT.dead[1]-PT.dead[0]+1)+PT.dead[0];for(let f=0;f<nd;f++){const az=R()*6.283;frond(az,-2.6-R.range(0,1),R.range(PT.L[0],PT.L[1])*(ty===0?.55:.45),1)}// dead fronds hanging under the crown
    if(ty===1)for(let k=0;k<10;k++){const z=R.range(.15,PT.top-.05),az=R()*6.283;const p0=[Math.cos(wd)*lean*z,Math.sin(wd)*lean*z,z];tube(p0,add(p0,[Math.cos(az),Math.sin(az),.6],.025),.006,.003)}// sabal boots
    spots.push({p:a,k:1})}
  // fit the crown: horizontal radius to S.w/2, top of foliage at ~0.97
  const cs={0:.1,1:.15,2:.14,3:.16,4:.1,7:.105,8:.09,9:.13}[sp];
  let rmax=.01,zmax=.01;for(const s of spots){rmax=Math.max(rmax,Math.hypot(s.p[0],s.p[1]));zmax=Math.max(zmax,s.p[2])}
  const kx=sp===4?1:Math.min(1.5,Math.max(.7,(S.w*.5-cs*.5)/rmax)),kz=sp===4?1:Math.min(1.3,(.97-cs*.45)/zmax);
  for(let i=0;i<P.length;i+=3){P[i]*=kx;P[i+1]*=kx;P[i+2]*=kz}for(const s of spots){s.p=[s.p[0]*kx,s.p[1]*kx,s.p[2]*kz]}
  // crown centre / radius for soft normals and AO
  let cx=0,cy=0,cz=0;for(const s of spots){cx+=s.p[0];cy+=s.p[1];cz+=s.p[2]}cx/=spots.length;cy/=spots.length;cz/=spots.length;let cr0=0;for(const s of spots)cr0+=Math.hypot(s.p[0]-cx,s.p[1]-cy,(s.p[2]-cz)*1.3);cr0/=spots.length;
  for(const s of spots){if(sp===4)break;const n=s.pine?4:cyp?12+R.int(5):s.k<1?4:(sp===1||sp===2?7:5);const nn=Math.max(1,Math.round(n*T3ST.n*t3g(sp,v)[1]));for(let i=0;i<nn;i++){const j=cyp?[R.range(-1,1)*cs*.9,R.range(-1,1)*cs*.9,R.range(-.45,.3)*cs]:s.pine?[R.range(-.3,.3)*cs,R.range(-.3,.3)*cs,R.range(-.22,.22)*cs]:[R.range(-.5,.5)*cs,R.range(-.5,.5)*cs,R.range(-.4,.4)*cs];// v1.15: pine needle tufts stay on their limb (no floating clumps)
    card(add(s.p,j,1),cs*T3ST.cs*t3g(sp,v)[0]*R.range(.8,1.2)*(s.k<1?1.1:1),s.pine?1:cyp?2:0,s.pine?(i<2):cyp?R()<.8:false)}}
  for(const c of cards){const p=c.c;const rel=[p[0]-cx,p[1]-cy,(p[2]-cz)*1.3];const dist=Math.hypot(...rel)/cr0;const soft=nrm(add(nrm(rel),[0,0,1],.35));const ao=Math.min(1,.18+.7*Math.min(1.2,dist)*Math.min(1.2,dist));
    let n;if(c.flat)n=nrm([R.range(-.35,.35),R.range(-.35,.35),1]);else{const q=nrm([R.range(-1,1),R.range(-1,1),R.range(-1,1)]);n=nrm(add(q,soft,.7))}
    const t0=Math.abs(n[2])<.95?[0,0,1]:[1,0,0];const ta=nrm(cr(n,t0)),tb=cr(n,ta);const rot=R()*6.283,ca=Math.cos(rot),sa=Math.sin(rot);const A=add(add([0,0,0],ta,ca),tb,sa),B=add(add([0,0,0],ta,-sa),tb,ca);
    const s=c.s*.5;const base=P.length/3;const u0=c.cell/4;
    for(const [i,j] of [[-1,-1],[1,-1],[1,1],[-1,1]]){P.push(p[0]+A[0]*s*i+B[0]*s*j,p[1]+A[1]*s*i+B[1]*s*j,p[2]+A[2]*s*i+B[2]*s*j);N.push(soft[0],soft[1],soft[2]);U.push(u0+(i*.5+.5)/4,j*.5+.5);K.push(1+R()*.4,ao)}
    I.push(base,base+1,base+2,base,base+2,base+3)}
  return{P:new Float32Array(P),N:new Float32Array(N),U:new Float32Array(U),K:new Float32Array(K),I:P.length/3>65000?new Uint32Array(I):new Uint16Array(I)}}
function t3Init(R,prog,vao){const gl=R.gl;
  R.pT3=prog(`
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec2 aUV;layout(location=5) in vec2 aK;layout(location=3) in vec4 iP;layout(location=4) in vec4 iW;
uniform mat4 uVP;uniform float uTime;uniform vec3 uEye;uniform float uR3;out vec3 vP;out vec3 vN;out vec2 vUV;out vec2 vK;out float vTint;out float vFade;out float vH;
void main(){vec3 p=aP;p.xy*=iW.x;p.z*=iP.w;p.x+=iW.z*aP.z*aP.z*iP.w*.25;float sw=sin(uTime*1.2+iP.x*.31+iP.y*.23)*.012*aP.z*aP.z*iP.w;float fl=aK.x*sin(uTime*2.3+aP.x*31.+aP.y*17.)*.03*iP.w*.08;p.x+=sw+fl;p.y+=sw*.6;
 float c=cos(iW.y),s=sin(iW.y);vec3 q=vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);vN=normalize(vec3(c*aN.x-s*aN.y,s*aN.x+c*aN.y,aN.z));vP=iP.xyz+q;vUV=vec2(aUV.x+(aK.x>.5?0.:iW.w*7.3),aUV.y*(aK.x>.5?1.:iP.w*.12)+(aK.x>.5?0.:iW.w*13.1));vK=aK;vTint=iW.w;vH=aP.z;
 vFade=uR3>0.?1.-smoothstep(uR3-25.,uR3+15.,length(iP.xy-uEye.xy)):1.;gl_Position=uVP*vec4(vP,1.);}`,`
${GLSL_COMMON}
in vec3 vP;in vec3 vN;in vec2 vUV;in vec2 vK;in float vTint;in float vFade;in float vH;out vec4 o;uniform sampler2D uLeaf;uniform sampler2D uNoise;uniform vec3 uLeafCol;uniform vec3 uBark;uniform float uImp;uniform vec2 uBk;uniform vec4 uSt;uniform vec4 uStF;uniform float uThin;
void main(){{float dh=fract(sin(dot(gl_FragCoord.xy,vec2(12.98,78.23)))*43758.5);if(1.-vFade>fract(dh*7.31))discard;}vec3 N=normalize(vN);vec3 alb;float ao=vK.y;float lit;vec3 col;
 float dk=smoothstep(25.,70.,length(vP-uEye));/* v1.15: true 3D distance, so the high flyover camera gets the same tee-distance look instead of the darker close-up lighting */vec4 St=mix(uSt,uStF,dk);if(vK.x>.5&&vK.x<1.5&&fract(vK.x)*2.5<dk*uThin)discard;// tee-distance look: thinner, airier crowns (per-card, stable, gradual)
 if(vK.x>.5){vec4 t=texture(uLeaf,vUV);if(t.a<.5)discard;alb=pow(t.rgb/max(t.a,.001),vec3(2.2))*uLeafCol*mix(.84,1.16,vTint);if(vK.x>1.5){float lm=dot(alb,vec3(.33));alb=vec3(lm)*vec3(2.0,1.35,.8)*1.1;}
   float w=clamp(dot(N,uSun)*.55+.45,0.,1.);lit=w*w;vec3 amb=mix(uSkyHor*.42,uSkyTop*.6,N.z*.5+.5);vec3 V=normalize(vP-uEye);float tr=pow(max(dot(V,uSun),0.),4.)*.55;
   if(uImp>.5){o=vec4(pow(clamp(alb*(.5+.62*lit)*mix(.55,1.05,ao)*2.2,0.,1.),vec3(1./2.2)),1.);return;}
   float a2=pow(ao,St.x);col=alb*(amb*(.5+.5*a2)*1.05*St.y+uSunCol*(lit*a2*a2*.95*St.z+tr*(.5+.5*a2)))*St.w*1.15;}/* v1.25: canopies 15% brighter (dark, heavy tree walls) */
 else{float f=texture(uNoise,vec2(vUV.x*1.2,vUV.y*.35)).r*.5+texture(uNoise,vec2(vUV.x*2.6,vUV.y*.9)+.3).g*.3+texture(uNoise,vec2(vUV.x*6.,vUV.y*2.2)+.7).b*.2;float fis=smoothstep(.38,.62,f);alb=pow(uBark,vec3(2.2))*mix(.55,1.12,fis)*mix(.9,1.1,vTint);if(uBk.y>.5){float pe=smoothstep(.45,.6,texture(uNoise,vec2(vUV.x*.8,vUV.y*.12)+.5).r);alb=pow(uBark,vec3(2.2))*mix(.92,1.04,f)*mix(vec3(1.),vec3(.78,.7,.6),pe*.7)*mix(.9,1.08,vTint);}if(uBk.x>.5){float rg=fract(vUV.y*5.);alb=pow(uBark,vec3(2.2))*(.78+.22*smoothstep(.0,.35,rg)*smoothstep(1.,.6,rg))*mix(.85,1.1,f)*mix(.9,1.1,vTint);}
   float l=max(dot(N,uSun),0.);float base=smoothstep(0.,.08,vH);alb*=mix(.7,1.,base);
   if(uImp>.5){o=vec4(pow(clamp(alb*(.55+.6*l)*2.2,0.,1.),vec3(1./2.2)),1.);return;}
   vec3 Ak=mix(uSkyHor*.4,uSkyTop*.5,N.z*.5+.5)*1.1;Ak=mix(vec3(dot(Ak,vec3(.333)))*vec3(1.08,1.,.88)*1.18,Ak,.35);col=alb*(Ak+uSunCol*l*1.1);}// bark ambient: neutral-warm bounce instead of blue sky tint, lifts shaded trunks
 col=fogit(col,vP);o=vec4(pow(tm(col),vec3(1./2.2)),1.);}`);
  // leaf texture
  const lt=t3LeafTex();R.t3leaf=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,R.t3leaf);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,lt);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  // meshes
  R._t3vao=vao;t3Rebuild(R)}
function t3Rebuild(R){const vao=R._t3vao;
  R.t3=[];for(const sp of T3SP)for(let v=0;v<T3NV;v++){const m=t3Gen(sp,v);const va=vao([{loc:0,n:3,d:m.P},{loc:1,n:3,d:m.N},{loc:2,n:2,d:m.U},{loc:5,n:2,d:m.K},{loc:3,n:4,d:new Float32Array(4),inst:1,dyn:1},{loc:4,n:4,d:new Float32Array(4),inst:1,dyn:1}],m.I);
    R.t3.push({sp,v,va,cnt:0,tris:m.I.length/3})}
  t3Bake(R);R.t3key=''}
function t3St(gl,u,sp){const P=T3P[sp]||T3PD,m=[T3ST.ao,T3ST.amb,T3ST.sun,T3ST.br];if(u.uSt)gl.uniform4f(u.uSt,...P.N.map((v,i)=>v*m[i]));if(u.uStF)gl.uniform4f(u.uStF,...P.F.map((v,i)=>v*m[i]));if(u.uThin)gl.uniform1f(u.uThin,P.thin)}
function t3Uniforms(R,p){const gl=R.gl;gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,R.t3leaf);gl.uniform1i(p.u.uLeaf,4);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,R.noise);if(p.u.uNoise)gl.uniform1i(p.u.uNoise,2)}
function t3Bake(R){// render the 3D meshes into the billboard atlas cells of their species, so far billboards match the near meshes
  const gl=R.gl,p=R.pT3,u=p.u;const TS=ATL.ts||1;const cw=Math.round(ATL.cw*TS),ch=Math.round(ATL.ch*TS);
  const fb=gl.createFramebuffer(),tx=gl.createTexture(),db=gl.createRenderbuffer();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,cw,ch,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.bindRenderbuffer(gl.RENDERBUFFER,db);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,cw,ch);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tx,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,db);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.bindFramebuffer(gl.FRAMEBUFFER,null);return}
  gl.useProgram(p.p);t3Uniforms(R,p);gl.uniform1f(u.uImp,1);gl.uniform1f(u.uR3,0);gl.uniform1f(u.uTime,0);gl.uniform3fv(u.uSun,[-.45,-.55,.7]);gl.uniform3fv(u.uEye,[0,-1000,0]);
  gl.viewport(0,0,cw,ch);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);
  for(const g of R.t3){const S=SPECIES[g.sp];const xr=.5*ATL.cw/S.thpx,zr=.5*ATL.ch/S.thpx,zc=(ATL.ch*.5-4)/S.thpx;
    gl.uniformMatrix4fv(u.uVP,false,new Float32Array([1/xr,0,0,0, 0,0,.5,0, 0,-1/zr,0,0, 0,zc/zr,0,1]));gl.uniform3fv(u.uLeafCol,T3LEAF[g.sp]);gl.uniform3fv(u.uBark,T3BARK[g.sp]);if(u.uBk)gl.uniform2f(u.uBk,g.sp===4?1:0,0);t3St(gl,u,g.sp);
    for(const flip of [0,1]){const vv=g.v+flip*4;const cell=g.sp*ATL.nv+vv;if(vv>=ATL.nv)continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER,g.va.attrs[4].buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,1]),gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,g.va.attrs[5].buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([1,flip?Math.PI:0,0,.5]),gl.DYNAMIC_DRAW);
      gl.bindVertexArray(g.va.v);gl.drawElementsInstanced(gl.TRIANGLES,g.va.n,g.va.it,0,1);
      gl.bindTexture(gl.TEXTURE_2D,R.atl);gl.copyTexSubImage2D(gl.TEXTURE_2D,0,Math.round((cell%ATL.cols)*ATL.cw*TS),Math.round(Math.floor(cell/ATL.cols)*ATL.ch*TS),0,0,cw,ch)}}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindVertexArray(null);gl.bindTexture(gl.TEXTURE_2D,R.atl);gl.generateMipmap(gl.TEXTURE_2D);gl.deleteFramebuffer(fb);gl.deleteRenderbuffer(db);gl.deleteTexture(tx);R.t3baked=1}
function t3List(R,all,H){// per-tree mesh instance data (same size/variation as the billboard so the crossfade matches)
  const L=[];all.forEach((t,i)=>{if(!T3SP.includes(t.sp))return;const inR=t.x>H.X0&&t.x<H.X1&&t.y>H.Y0&&t.y<H.Y1;const hv=.86+.28*hash2(i,19),wv=.8+.42*hash2(i,13);const h=t.h*hv;
    const lean=(t.sp===3||t.sp===7?.5:.18)*(hash2(i,31)-.5);L.push({x:t.x,y:t.y,z:(inR?H.hAt(t.x,t.y):H.demAt(t.x,t.y)-.15)-.15,h,xs:h*wv*.94,rot:hash2(i,41)*6.2832,lean,tint:hash2(i,7),g:T3SP.indexOf(t.sp)*T3NV+(t.v%T3NV)})});R.t3list=L;R.t3key=''}
function t3Draw(R,common,cam){const gl=R.gl;if(!R.t3||!R.t3list)return;const e=cam.eye;const f=[cam.at[0]-e[0],cam.at[1]-e[1]];const fl=Math.hypot(f[0],f[1])||1;f[0]/=fl;f[1]/=fl;
  const key=Math.round(e[0]/1.5)+','+Math.round(e[1]/1.5)+','+Math.round(Math.atan2(f[1],f[0])*12);
  if(key!==R.t3key){R.t3key=key;const B=R.t3.map(()=>[]);for(const t of R.t3list){const dx=t.x-e[0],dy=t.y-e[1];const d=Math.hypot(dx,dy);if(d>T3R+16)continue;if(d>12&&(dx*f[0]+dy*f[1])<-t.h*.6)continue;B[t.g].push(t.x,t.y,t.z,t.h,t.xs,t.rot,t.lean,t.tint)}
    R.t3.forEach((g,i)=>{const a=B[i];g.cnt=a.length/8;if(!g.cnt)return;const ip=new Float32Array(g.cnt*4),iw=new Float32Array(g.cnt*4);for(let k=0;k<g.cnt;k++){for(let j=0;j<4;j++){ip[k*4+j]=a[k*8+j];iw[k*4+j]=a[k*8+4+j]}}
      gl.bindBuffer(gl.ARRAY_BUFFER,g.va.attrs[4].buf);gl.bufferData(gl.ARRAY_BUFFER,ip,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,g.va.attrs[5].buf);gl.bufferData(gl.ARRAY_BUFFER,iw,gl.DYNAMIC_DRAW)})}
  const p=R.pT3,u=p.u;common(p);t3Uniforms(R,p);gl.uniform1f(u.uImp,0);gl.uniform1f(u.uR3,T3R);gl.disable(gl.CULL_FACE);gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  for(const g of R.t3){if(!g.cnt)continue;gl.uniform3fv(u.uLeafCol,T3LEAF[g.sp]);gl.uniform3fv(u.uBark,T3BARK[g.sp]);if(u.uBk)gl.uniform2f(u.uBk,g.sp===4?1:0,0);t3St(gl,u,g.sp);gl.bindVertexArray(g.va.v);gl.drawElementsInstanced(gl.TRIANGLES,g.va.n,g.va.it,0,g.cnt)}
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);gl.enable(gl.CULL_FACE);gl.bindVertexArray(null)}

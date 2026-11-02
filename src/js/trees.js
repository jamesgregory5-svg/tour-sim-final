'use strict';
/* Procedurally painted tree impostor atlas (8 species x 4 variants), cylindrical billboards in the renderer */
// species: h = height range (yd), w = width/height ratio, cb = crown base (fraction of height), cr = collision radius factor
const SPECIES=[
  {n:'loblolly',h:[21,30],w:.42,cb:.44},
  {n:'oak',h:[17,25],w:1.0,cb:.3},
  {n:'maple',h:[16,23],w:.78,cb:.3},
  {n:'cypress',h:[10,15],w:1.25,cb:.35},
  {n:'palm',h:[12,20],w:.62,cb:.78},
  {n:'dogwood',h:[6,8.5],w:1.05,cb:.3},
  {n:'azalea',h:[1.6,2.6],w:2.0,cb:0},
  {n:'pitchpine',h:[17,24],w:.55,cb:.38},
  {n:'eucalyptus',h:[22,32],w:.55,cb:.42},
  {n:'sycamore',h:[16,24],w:.92,cb:.3}];
const ATL={cols:16,rows:5,cw:256,ch:512,nv:8};
for(const S of SPECIES){S.thpx=Math.min(ATL.ch-8,(ATL.cw-10)/S.w);S.qk=(ATL.ch)/S.thpx;}// quad height = tree height * qk// cell = species*4+variant -> col=(cell%8),row=floor(cell/8)
function paintTreeAtlas(){
  const TS=Math.min(innerWidth,innerHeight)<700?.85:1.25;ATL.ts=TS;// desktop: 1.5x atlas resolution for sharper foliage
  const c=document.createElement('canvas');c.width=ATL.cols*ATL.cw*TS;c.height=ATL.rows*ATL.ch*TS;const g=c.getContext('2d');
  for(let sp=0;sp<SPECIES.length;sp++)for(let v=0;v<ATL.nv;v++){const cell=sp*ATL.nv+v,cx=(cell%ATL.cols)*ATL.cw,cy=Math.floor(cell/ATL.cols)*ATL.ch;g.save();g.scale(TS,TS);g.beginPath();g.rect(cx,cy,ATL.cw,ATL.ch);g.clip();g.translate(cx,cy);paintTree(g,sp,v,RNG('tree'+sp+'_'+v));g.restore()}
  return c}
function hsl(h,s,l,a){return`hsla(${h},${s}%,${l}%,${a===undefined?1:a})`}
function clump(g,x,y,r,hue,sat,lit,R,dots){// one foliage mass: lobed silhouette edged with small leaves, shaded top-to-bottom as a volume, filled with near-tone leaf texture (no bright flecks, no dark rim)
  const lobes=[];const n=6+(R()*4|0);lobes.push([x,y,r*.6]);for(let i=0;i<n;i++){const a=i/n*TAU+R.range(-.3,.3),d=r*R.range(.36,.56);lobes.push([x+Math.cos(a)*d,y+Math.sin(a)*d*.85,r*R.range(.28,.44)])}
  const P=new Path2D();for(const [a,b,c] of lobes){P.moveTo(a+c,b);P.arc(a,b,c,0,TAU)}
  // leafy edge: many small leaves straddling the outline so the silhouette is broken up at leaf scale
  const nf=Math.min(90,Math.round(r*2.2));const ls=Math.max(1.4,r*.075);for(let i=0;i<nf;i++){const a=R()*TAU,L=lobes[1+(R()*n|0)];const d=L[2]*R.range(.85,1.15);const px=L[0]+Math.cos(a)*d,py=L[1]+Math.sin(a)*d;const s=ls*R.range(.7,1.3);P.moveTo(px+s,py);P.ellipse(px,py,s,s*.6,R()*3.2,0,TAU)}
  const gr=g.createLinearGradient(x-r*.3,y-r,x+r*.3,y+r);gr.addColorStop(0,hsl(hue-3,sat+2,lit+9));gr.addColorStop(.45,hsl(hue,sat,lit+1));gr.addColorStop(1,hsl(hue+4,sat-4,lit-8));
  g.fillStyle=gr;g.fill(P);
  g.save();g.clip(P);const A=new Path2D(),B=new Path2D(),C=new Path2D();const nl=Math.min(160,Math.round(r*r*.3));
  for(let i=0;i<nl;i++){const a=R()*TAU,d=Math.sqrt(R())*r*1.05,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.85;const s=ls*R.range(.6,1.1);const top=(py-y)/r;const T=top<-.2?(R()<.6?A:B):top>.25?(R()<.7?C:B):(R()<.5?B:C);T.moveTo(px+s,py);T.ellipse(px,py,s,s*.6,R()*3.2,0,TAU)}
  g.fillStyle=hsl(hue-3,sat+3,lit+7,.45);g.fill(A);g.fillStyle=hsl(hue+3,sat-2,lit-5,.4);g.fill(B);g.fillStyle=hsl(hue+5,sat-4,lit-11,.45);g.fill(C);
  // a couple of shaded pockets between lobes give depth
  const dn=new Path2D();for(let i=0;i<2;i++){const a=Math.PI*.5+R.range(-1.2,1.2),d=r*R.range(.25,.55),rr=r*R.range(.14,.24);const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.8;dn.moveTo(px+rr,py);dn.arc(px,py,rr,0,TAU)}g.fillStyle=hsl(hue+6,sat-4,lit-12,.3);g.fill(dn);g.restore()}
function skyHoles(g,cx,cy,rx,ry,n,R){// irregular see-through gaps (clusters of small leaf-shaped cuts), never clean round holes
  g.save();g.globalCompositeOperation='destination-out';g.fillStyle='#000';const m=Math.round(n*.3);for(let i=0;i<m;i++){const a=R()*TAU,d=R.range(.3,.8);const x=cx+Math.cos(a)*rx*d,y=cy+Math.sin(a)*ry*d;const k=4+(R()*5|0);
    g.beginPath();for(let j=0;j<k;j++){const qx=x+R.range(-6,6),qy=y+R.range(-4,4),r=R.range(1.5,3.5);g.moveTo(qx+r,qy);g.ellipse(qx,qy,r,r*.6,R()*3,0,TAU)}g.fill()}g.restore()}
function trunk(g,x0,y0,x1,y1,w0,w1,col,dark){const nx=-(y1-y0),ny=x1-x0,l=Math.hypot(nx,ny)||1;const ux=nx/l,uy=ny/l;
  // round-shaded tapered stem: lit on the left, core shadow on the right, slight flare at the base
  const gr=g.createLinearGradient(x0+ux*w0,y0+uy*w0,x0-ux*w0,y0-uy*w0);gr.addColorStop(0,dark);gr.addColorStop(.35,col);gr.addColorStop(.6,col);gr.addColorStop(1,dark);g.fillStyle=gr;
  g.beginPath();g.moveTo(x0+ux*w0,y0+uy*w0);g.quadraticCurveTo((x0+x1)/2+ux*(w0+w1)*.5,(y0+y1)/2+uy*(w0+w1)*.5,x1+ux*w1,y1+uy*w1);g.lineTo(x1-ux*w1,y1-uy*w1);g.quadraticCurveTo((x0+x1)/2-ux*(w0+w1)*.5,(y0+y1)/2-uy*(w0+w1)*.5,x0-ux*w0,y0-uy*w0);g.closePath();g.fill();
  // bark: long dark vertical fissures only (no light flecks)
  const L=Math.hypot(x1-x0,y1-y0);let sd=(x0*73+y0*31+L*7)|0;const rn=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff};
  if(Math.max(w0,w1)>2.5){g.strokeStyle='rgba(18,13,9,.32)';g.lineWidth=.9;g.beginPath();for(let k=0;k<L*Math.max(w0,w1)*.03;k++){const t=rn(),wt=w0+(w1-w0)*t,o=(rn()*2-1)*wt*.75;const px=x0+(x1-x0)*t+ux*o,py=y0+(y1-y0)*t+uy*o;const ln=4+rn()*10;
    g.moveTo(px,py);g.lineTo(px+(x1-x0)/L*ln+(rn()-.5)*1.5,py+(y1-y0)/L*ln)}g.stroke()}}
function limbs(g,x,y,ang,len,w,depth,R,spread,tips,col,dark,up){// recursive forked branching: each limb curves, tapers and splits into 2-3 children
  const bend=R.range(-.25,.25);const ex=x+Math.cos(ang)*len,ey=y+Math.sin(ang)*len;const w1=w*.62;
  trunk(g,x,y,ex,ey,w,w1,col,dark);
  if(depth<=0){tips.push([ex,ey,len]);return}
  const nk=depth>=2?2+(R()<.5?1:0):2;for(let i=0;i<nk;i++){const a=ang+(i/(nk-1)-.5)*spread*R.range(.8,1.2)+bend;const aa=a+(-Math.PI/2-a)*(up||0);limbs(g,ex,ey,aa,len*R.range(.62,.8),w1,depth-1,R,spread*.85,tips,col,dark,up)}}
function paintTree(g,sp,v,R){const W=ATL.cw,H=ATL.ch,bx=W/2,by=H-4;const S=SPECIES[sp];
  const th=S.thpx,tw=th*S.w*.94;const hv=R()*8-4;
  if(sp===0||sp===7){// pines: tall bare trunk; upper limbs sweep up and out, each ending in tufted needle masses with gaps between (loblolly: tall oval crown; pitch / shore pine: irregular, flatter, often lopsided)
    const lob=sp===0;const hue=lob?100+hv:110+hv;const tc=['#54473d','#4c4038','#5a4a3e','#504339'][v&3],td='#241c16';
    const lean=lob?R.range(-.04,.04):R.range(-.16,.16);const side=lob?0:(v%2?1:-1)*R.range(.2,.6);const tx=bx+lean*th;const top=by-th*.97;
    // trunk with a gentle S-bend
    const mid=(t)=>[bx+(tx-bx)*t+Math.sin(t*3.1+v)*th*.012,by+(top-by)*t];const seg=10;for(let i=0;i<seg;i++){const a=mid(i/seg),b=mid((i+1)/seg);trunk(g,a[0],a[1],b[0],b[1],lerp(9,2.5,i/seg),lerp(9,2.5,(i+1)/seg),tc,td)}
    const cb=lob?R.range(.5,.62):R.range(.32,.45);const nb=lob?7+(R()*3|0):6+(R()*3|0);const tips=[];
    for(let i=0;i<nb;i++){const f=(i+R.range(.1,.9))/nb,t=cb+f*(1-cb)*.92;const [x,y]=mid(t);const dir=(i%2?1:-1)*(R()<.2?-1:1);const env=lob?Math.sin(Math.PI*Math.min(1,.25+f*.85)):(1-f*.55);
      const len=tw*.5*env*R.range(.65,1.1)*(1+side*dir);const a=dir>0?-.35-R.range(0,.35)*f:Math.PI+.35+R.range(0,.35)*f;const ex=Math.max(tw*.2,Math.min(W-tw*.2,x+Math.cos(a)*len)),ey=y+Math.sin(a)*len*.5-len*.12;
      g.strokeStyle=td;g.lineCap='round';g.lineWidth=lerp(3.4,1.6,f);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo((x+ex)/2,y-len*.02,ex,ey);g.stroke();tips.push([ex,ey,len,f]);
      if(len>tw*.22){const mx=(x+ex)/2,my=(y+ey)/2-len*.04;tips.push([mx+R.range(-4,4),my,len*.5,f])}}
    tips.push([tx,top+6,tw*.18,1]);
    const pr=tw*(lob?.15:.17);
    // each tip carries 2-4 overlapping needle tufts of uneven size, so pads read as ragged, irregular masses (not stacked discs)
    const T=[];for(const [x,y,l,f] of tips){const nk=2+(R()*3|0);for(let k=0;k<nk;k++)T.push([x+R.range(-.7,.7)*pr,y+R.range(-.45,.25)*pr,pr*R.range(.5,1.05),R.range(lob?.5:.42,lob?.78:.66)])}
    for(const [x,y,r0,sy] of T){g.save();g.translate(x,y);g.scale(1,sy);clump(g,0,0,r0*1.1,hue+6,20,13,R);g.restore()}
    for(const [x,y,r0,sy] of T)if(R()<.8){g.save();g.translate(x+R.range(-3,3),y-r0*.25);g.scale(1,sy*.92);clump(g,0,0,r0*.85,hue,26,20,R);g.restore()}
    for(const [x,y,r0,sy] of T)if(R()<.5){g.save();g.translate(x-r0*.15,y-r0*.45);g.scale(1,sy*.8);clump(g,0,0,r0*.55,hue-4,30,28,R);g.restore()}}
  else if(sp===1||sp===2){// oak / maple: real branching skeleton (trunk forks into limbs, limbs into branches) carrying layered foliage masses; gaps show limbs and sky
    const oak=sp===1;const hue=(oak?90:84)+hv;const tc=['#5e5246','#55493e','#62564a','#5a4d41'][v&3],td='#251d17';const lean=R.range(-.12,.12);
    const forkY=by-th*(oak?R.range(.24,.34):R.range(.3,.4));const fx=bx+lean*th*.3;trunk(g,bx,by,fx,forkY,12,8.5,tc,td);
        const tips=[];const nL=oak?3+(R()<.6?1:0):3;const sp0=oak?1.5:1.0;
    for(let i=0;i<nL;i++){const a=-Math.PI/2+(i/(nL-1)-.5)*sp0*R.range(.85,1.15)+lean;limbs(g,fx,forkY,a,th*(oak?.2:.22)*R.range(.85,1.1),9,3,R,oak?1.0:.75,tips,tc,td,oak?.12:.28)}
    // crown envelope: keep tips inside an ellipse so the silhouette is a broad dome (oak) or an upright oval (maple)
    const cyc=by-th*(oak?.62:.64),rx=tw*.47,ry=th*(oak?.34:.38);
    // foliage points: branch tips pulled inside the crown envelope, plus a jittered fill of the envelope so the crown has depth (gaps left at random so limbs and sky show through)
    const P=tips.map(([x,y])=>{const dx=(x-bx)/rx,dy=(y-cyc)/ry,d=Math.hypot(dx,dy);const k=d>.9?.9/d:1;return[bx+dx*k*rx,cyc+dy*k*ry]});
    const base=rx*(oak?.25:.23);const step=base*1.3;
    for(let yy=cyc-ry*.85;yy<=cyc+ry*.75;yy+=step*.8)for(let xx=bx-rx;xx<=bx+rx;xx+=step){const x=xx+R.range(-.4,.4)*step,y=yy+R.range(-.35,.35)*step;const dx=(x-bx)/rx,dy=(y-cyc)/ry;
      const e=dx*dx+dy*dy*(dy>0?1.5:1);if(e<.82&&R()<(e<.4?.75:.6))P.push([x,y])}
    P.sort((p,q)=>p[1]-q[1]);// paint upper first; lower masses overlap so undersides read darker
    for(const [x,y] of P){const dy=(y-cyc)/ry;clump(g,x+(bx-x)*.06,y+(cyc-y)*.06,base*R.range(.85,1.1),hue+5,22,11+Math.max(0,-dy)*4,R)}// shaded inner layer (pulled inward, never a dark rim)
    for(const [x,y] of P)if(R()<.75){const dy=(y-cyc)/ry;clump(g,x+R.range(-6,6),y+R.range(-4,6),base*R.range(.7,.95),hue,28,17+Math.max(0,-dy)*6-Math.max(0,dy)*3,R)}
    for(const [x,y] of P){const dy=(y-cyc)/ry,dx=(x-bx)/rx;if(dy<.15&&R()<.55-dx*.25)clump(g,x-base*.15,y-base*.35,base*R.range(.5,.72),hue-3,32,25+Math.max(0,-dy)*5,R)}// sunlit clusters on the upper (sun) side
    skyHoles(g,bx,cyc,rx*.85,ry*.85,14,R);}
  else if(sp===3){// Monterey cypress: leaning trunk, flat wind-sculpted layered canopy
    const lean=(v%2?1:-1)*R.range(.12,.25);const tx=bx+lean*tw*.45,ty=by-th*.55;trunk(g,bx,by,tx,ty,13,7,'#5a4636','#271d15');
    g.strokeStyle='#3b2d22';g.lineCap='round';for(let i=0;i<4;i++){g.lineWidth=R.range(3,5);g.beginPath();g.moveTo(tx,ty);g.lineTo(tx+R.range(-.45,.45)*tw,ty-R.range(10,60));g.stroke()}
    const hue=108+hv,wind=lean>0?1:-1,nL=3+(v&1)+(v>>2);// flat-topped, wind-swept pads stacked downwind, lit edges on top, dark undersides
    for(let L=0;L<nL;L++){const f=L/(nL-1),y=by-th*(.5+f*.36),w=tw*(.34-f*.12)*R.range(.88,1.05),cx=tx+wind*tw*(.02+f*.08)+R.range(-6,6);
      g.strokeStyle='#3b2d22';g.lineWidth=R.range(2.5,4.5);g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(tx+(cx-tx)*.3,y+20,cx,y+4);g.stroke();
      g.save();g.translate(cx,y);g.scale(1,.62);
      for(let i=0;i<12;i++)clump(g,R.range(-.92,.92)*w*(.75+R()*.25),R.range(4,24),R.range(11,19),hue+6,16,10,R,3);
      for(let i=0;i<18;i++){const x=R.range(-1,1)*w*.95,yy=R.range(-14,16);clump(g,x,yy,R.range(14,22),hue,20+L*2,18+f*8,R)}
      for(let i=0;i<11;i++){const x=R.range(-.95,.95)*w*.92,yy=-22+Math.abs(x)/w*12+R.range(-4,3);clump(g,x,yy,R.range(9,15),hue-4,26,30+f*6,R,10)}
      g.restore()}}
  else if(sp===4){// palm (sabal / royal): curved tapering ringed trunk, dead-frond boot, globe of arching fronds
    const lean=R.range(-28,28),top={x:bx+lean,y:by-th*.8},ctl={x:bx+lean*.15+R.range(-10,10),y:by-th*.45};const royal=(v&3)>=2;
    const at=t=>({x:(1-t)*(1-t)*bx+2*(1-t)*t*ctl.x+t*t*top.x,y:(1-t)*(1-t)*by+2*(1-t)*t*ctl.y+t*t*top.y});
    for(let i=0;i<40;i++){const t0=i/40,t1=(i+1)/40,p0=at(t0),p1=at(t1);const w0=royal?lerp(7.5,5.5,t0)*(1+.25*Math.sin(t0*9)):lerp(8,6,t0),w1=royal?lerp(7.5,5.5,t1)*(1+.25*Math.sin(t1*9)):lerp(8,6,t1);
      trunk(g,p0.x,p0.y,p1.x,p1.y,w0,w1,royal?'#b7b1a4':'#857256',royal?'#6d685f':'#3e3226');if(!royal&&i%2===0){g.strokeStyle='rgba(40,30,20,.45)';g.lineWidth=1.4;g.beginPath();g.moveTo(p0.x-w0,p0.y);g.lineTo(p0.x+w0,p0.y+2);g.stroke()}}
    if(royal){g.fillStyle='#5f7d3c';g.beginPath();g.ellipse(top.x,top.y+10,6.5,18,0,0,TAU);g.fill()}
    else{for(let i=0;i<9;i++){const a=Math.PI/2+R.range(-1.1,1.1),L=R.range(16,26);g.strokeStyle=hsl(32,35,R.range(22,34));g.lineWidth=3;g.beginPath();g.moveTo(top.x,top.y+6);g.quadraticCurveTo(top.x+Math.cos(a)*L*.6,top.y+6,top.x+Math.cos(a)*L,top.y+6+Math.sin(a)*L);g.stroke()}}
    const nf=royal?16:22;const fl=[];for(let i=0;i<nf;i++)fl.push({a:R()*TAU,up:R.range(-.15,1)});fl.sort((p,q)=>Math.sin(p.a)-Math.sin(q.a));// back fronds first
    for(const f of fl){const L=(royal?R.range(.36,.48):R.range(.26,.36))*th,dx=Math.cos(f.a),dz=Math.sin(f.a);const ex=top.x+dx*L,lift=L*(.45*f.up),ey=top.y-lift+L*.55*(1-f.up)*(royal?1.1:.7);
      const mx=top.x+dx*L*.5,my=top.y-lift*1.2-L*.15;const back=dz<0;const lit=back?16:24+12*Math.max(0,-dx*.4+f.up*.5);
      const nl=royal?22:16;for(let k=1;k<=nl;k++){const t=k/nl;const px=(1-t)*(1-t)*top.x+2*(1-t)*t*mx+t*t*ex,py=(1-t)*(1-t)*top.y+2*(1-t)*t*my+t*t*ey;const ll=(royal?16:12)*(1-t*.7)*(.6+.4*Math.sin(t*Math.PI));
        g.strokeStyle=hsl(92+hv+R.range(-6,6),32,lit+R.range(-4,4),.95);g.lineWidth=royal?1.5:2.2;
        for(const sgn of[-1,1]){const ang=Math.atan2(ey-top.y,ex-top.x)+sgn*(royal?1.25:.85);g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(ang)*ll,py+Math.sin(ang)*ll*.8+ll*.5);g.stroke()}}
      g.strokeStyle=hsl(70,25,lit+6);g.lineWidth=1.4;g.beginPath();g.moveTo(top.x,top.y);g.quadraticCurveTo(mx,my,ex,ey);g.stroke()}}
  else if(sp===5){// dogwood: small tree, layered horizontal branches, white/pink blossoms
    trunk(g,bx,by,bx,by-th*.4,10,5,'#5d5146','#28201a');const pink=(v&3)>=2;
    for(let i=0;i<16;i++){const a=R()*TAU,d=Math.sqrt(R());clump(g,bx+Math.cos(a)*d*tw*.45,by-th*.65+Math.sin(a)*d*th*.25,R.range(18,26),95+hv,28,18+R()*8,R,8)}
    for(let i=0;i<260;i++){const a=R()*TAU,d=Math.sqrt(R());const x=bx+Math.cos(a)*d*tw*.48,y=by-th*.66+Math.sin(a)*d*th*.28;g.fillStyle=pink?hsl(335,70,R.range(78,88)):hsl(50,30,R.range(88,97));g.beginPath();g.arc(x,y,R.range(2,3.6),0,TAU);g.fill()}}
  else if(sp===8){// eucalyptus: tall pale smooth-barked trunk with peeling patches, few upswept limbs, sparse drooping grey-green clumps
    const lean=R.range(-18,18),tx=bx+lean,ty=by-th*R.range(.42,.66);trunk(g,bx,by,tx,ty,11,6,['#a89b84','#9c8f78','#b0a28a','#94886f'][v&3],'#544a3e');const spread=[.8,1.25,1,1.45][v&3]*(v>3?1.12:1);
    for(let i=0;i<7;i++){const f=R();g.fillStyle=hsl(30,25,R.range(45,62),.7);g.beginPath();g.ellipse(lerp(bx,tx,f)+R.range(-4,4),lerp(by,ty,f),R.range(2,4),R.range(5,12),0,0,TAU);g.fill()}
    const limbs=[];const nl=3+(v%3)+(R()*2|0);for(let i=0;i<nl;i++){const ex=Math.max(46,Math.min(W-46,tx+R.range(-.45,.45)*tw*spread)),ey=ty-th*R.range(.06,.34);limbs.push([ex,ey]);g.strokeStyle='#a0937c';g.lineCap='round';g.lineWidth=R.range(3,5);g.beginPath();g.moveTo(tx,ty+10);g.quadraticCurveTo((tx+ex)/2,ty-th*.05,ex,ey);g.stroke()}
    const hue=88+hv;for(const [ex,ey] of limbs){const nk=13+(R()*7|0);for(let k=0;k<nk;k++)clump(g,Math.max(26,Math.min(W-26,ex+R.range(-34,34))),ey+R.range(-20,40),R.range(13,23),hue+R.range(-6,6),14,[20,26,32][k%3],R,10)}
    for(let k=0;k<9;k++)clump(g,tx+R.range(-.3,.3)*tw,by-th*R.range(.78,.95),R.range(12,19),hue,14,26,R,8)}
  else if(sp===9){// sycamore: mottled white/tan forked trunk, broad open crown of lighter clumps
    const fx=bx+R.range(-4,4),fy=by-th*.36;trunk(g,bx,by,fx,fy,13,9,'#d8d0bf','#8b8170');
    for(let i=0;i<10;i++){const f=R();g.fillStyle=R()<.5?hsl(35,20,R.range(52,62),.8):hsl(80,10,R.range(70,82),.8);g.beginPath();g.ellipse(lerp(bx,fx,f)+R.range(-6,6),lerp(by,fy,f),R.range(3,6),R.range(3,7),R()*3,0,TAU);g.fill()}
    for(const d of[-1,1]){const ex=fx+d*tw*R.range(.18,.3),ey=by-th*R.range(.6,.7);trunk(g,fx,fy,ex,ey,8,4,'#e0d9ca','#8b8170')}
    const hue=80+hv,cyc=by-th*.68,rx=tw*.38,ry=th*.27;
    for(let pass=0;pass<3;pass++){const n=pass===0?10:pass===1?14:9;for(let i=0;i<n;i++){const a=R()*TAU,d=Math.sqrt(R());clump(g,bx+Math.cos(a)*d*rx,cyc+Math.sin(a)*d*ry-(pass===2?ry*.15:0),R.range(18,28)*(pass===2?.8:1),hue,[24,32,36][pass],[17,25,33][pass],R)}}skyHoles(g,bx,cyc,rx,ry,24,R);}
  else if(sp===6){// azalea: low dense mound with magenta / pink / white flowers
    const hueF=[320,335,350,0][v&3],lf=[52,62,70,92][v&3];
    for(let i=0;i<22;i++){const a=Math.PI+R()*Math.PI,d=Math.sqrt(R());clump(g,bx+Math.cos(a)*d*tw*.46,by-8+Math.sin(a)*d*th*.85,R.range(22,34),100+hv,26,16+R()*6,R,6)}
    for(let i=0;i<700;i++){const a=Math.PI+R()*Math.PI,d=Math.sqrt(R());const x=bx+Math.cos(a)*d*tw*.47,y=by-10+Math.sin(a)*d*th*.9;g.fillStyle=(v&3)===3?hsl(0,0,R.range(88,98)):hsl(hueF+R()*10,75,lf*.8+R()*14);g.beginPath();g.arc(x,y,R.range(2,4),0,TAU);g.fill()}}
}
// per-course species mix [species, weight]
const TREE_MIX={
  augusta:[[0,.84],[5,.1],[1,.04],[2,.02]],pinevalley:[[7,.62],[0,.32],[1,.06]],sandhills:[[1,.5],[7,.3],[2,.2]],shadowcreek:[[0,.55],[7,.35],[1,.1]],peachtree:[[0,.45],[1,.3],[2,.15],[5,.1]],
  cypress:[[3,.75],[7,.25]],pebble:[[3,.72],[7,.25],[1,.03]],pacificdunes:[[7,.8],[3,.2]],seminole:[[4,.6],[1,.28],[7,.12]],riviera:[[8,.45],[9,.25],[1,.15],[4,.15]],lacc:[[8,.5],[9,.32],[4,.18]],
  shinnecock:[[1,.6],[5,.4]],ngla:[[1,.55],[5,.45]],fishers:[[3,.5],[1,.3],[5,.2]],friars:[[7,.9],[1,.1]],oakmont:[[1,.5],[2,.5]],crystal:[[1,.36],[2,.34],[7,.3]],
  prairie:[[1,.6],[2,.4]],chicago:[[1,.55],[2,.45]]};
const TREE_X={wingedfoot:[[1,.5],[2,.38],[9,.12]],shadowcreek:[[0,.62],[7,.3],[1,.08]]};Object.assign(TREE_MIX,TREE_X);
const TREE_DEFAULT=[[1,.45],[2,.35],[7,.2]];
function treeMix(cid){return TREE_MIX[cid]||TREE_DEFAULT}
function pickSpecies(mix,r){let a=0;for(const [s,w] of mix){a+=w;if(r<a)return s}return mix[0][0]}

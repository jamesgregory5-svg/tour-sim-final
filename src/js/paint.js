'use strict';
/* paints hole ground color texture (PX px per yard) + mask texture data */
const SUN_FRAME=[.44,-.6,.47];// direction toward sun in hole frame (x,y,z), normalized below
(function(){const l=Math.hypot(...SUN_FRAME);for(let i=0;i<3;i++)SUN_FRAME[i]/=l})();
function paintHole(H,PX){
  const st=H.st,W=H.W,Hh=H.H,X0=H.X0,Y1=H.Y1,S=H.S;
  const cv=document.createElement('canvas');cv.width=W*PX;cv.height=Hh*PX;const g=cv.getContext('2d');
  // base from raster (1yd) smoothed
  const b=document.createElement('canvas');b.width=W;b.height=Hh;const bg=b.getContext('2d'),im=bg.createImageData(W,Hh);
  const hex=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
  const C=[hex(st.deep),hex(st.rough),hex(st.fw),hex(st.fw),hex('#5a923a'),hex('#62a040'),hex(st.sand),hex('#2c5a63'),hex(st.deep),hex(st.waste)];
  {const rr=hex(st.rough),dd=hex(st.deep);C[8]=dd.map((v,i)=>v*.6+rr[i]*.4|0);C[0]=C[8].map(v=>v*.9|0)}/* deep rough / woods floor: a softer step down from the rough (no dark smears) */if((H.F.bk||[]).length)C[6]=hex(st.rough);if((H.F.sd||[]).length)C[9]=hex(st.rough);// bunkers are painted from their polygons (no 1-yd stair halo)
  for(let j=0;j<Hh;j++)for(let i=0;i<W;i++){const s=S[j*W+i],c=s===3?C[1]:C[s],o=((Hh-1-j)*W+i)*4;// tee cells away from the tee in play take the rough colour (the soft tee polygons above give the hint)
    let v=1;if(s===1||s===8||s===0){v=1+.025*vnoise(i*.09,j*.09)+.02*vnoise(i*.31+9,j*.31)}
    im.data[o]=c[0]*v;im.data[o+1]=c[1]*v;im.data[o+2]=c[2]*v;im.data[o+3]=255}
  bg.putImageData(im,0,0);g.imageSmoothingEnabled=true;g.drawImage(b,0,0,W*PX,Hh*PX);
  g.save();g.scale(PX,PX);
  const noHoles=(q,fn)=>{const Hs=[];/* inner rings are bunker cut-outs (audit 03:25): keep them fairway */if(!Hs.length)return fn();q.save();q.beginPath();q.rect(-10,-10,1e5,1e5);for(const P of Hs){P.forEach((p,i)=>{const x=p[0]-X0,y=Y1-p[1];i?q.lineTo(x,y):q.moveTo(x,y)});q.closePath()}q.clip('evenodd');fn();q.restore()};// v1.15: OSM fairway inner rings (rough islands) stay rough
  const path=(P)=>{g.beginPath();P.forEach((p,i)=>{const x=p[0]-X0,y=Y1-p[1];i?g.lineTo(x,y):g.moveTo(x,y)});g.closePath()};
  const F=H.F;
  // stripes pattern (bands across play line)
  const mkStripe=(c1,c2,band,ang)=>{const p=document.createElement('canvas');const n=Math.round(band*2*PX);p.width=4;p.height=n;const q=p.getContext('2d');q.fillStyle=c1;q.fillRect(0,0,4,n);q.fillStyle=c2;q.fillRect(0,n/2,4,n/2);const pat=g.createPattern(p,'repeat');const m=new DOMMatrix();m.scaleSelf(1/PX,1/PX);if(ang)m.rotateSelf(ang);pat.setTransform(m);return pat};
  // waste / natural sand areas from their polygons (smooth edges, no 1-yd stairs)
  g.fillStyle=st.waste;for(const P of(F.sd||[])){path(P);g.fill()}
  // rough (OSM) + fairway with stripes
  g.fillStyle=st.rough;for(const P of(F.ro||[])){path(P);g.fill()}
  const fwPat=mkStripe(st.fw,st.fw2,8,0),grPat=mkStripe('#63a245','#5c9940',2.4,35);
  g.fillStyle=st.fw;noHoles(g,()=>{for(const P of(F.fw||[])){path(P);g.fill()}})// mowing stripes are shaded in the terrain shader (smooth, hole-aligned, no paint-map blocks)
  // first cut fringe around fairways
  g.lineJoin='round';g.strokeStyle='rgba(62,100,40,.75)';g.lineWidth=2.4;for(const P of(F.fw||[])){path(P);g.stroke()}
  if((F.cp||[]).length){g.save();g.lineCap='round';g.lineJoin='round';const chk=P=>{let Q=P;for(let it=0;it<4;it++){if(Q.length<3)break;const N=[Q[0]];for(let k=0;k<Q.length-1;k++){const a=Q[k],b=Q[k+1];N.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75])}N.push(Q[Q.length-1]);Q=N}return Q};const CP=F.cp.map(chk);const op=P=>{g.beginPath();P.forEach((p,i)=>{const x=p[0]-X0,y=Y1-p[1];i?g.lineTo(x,y):g.moveTo(x,y)})};/* v1.30: dead ends taper to nothing over ~7 yd (no abrupt stubby ends); joined ends stay full width */
  const fr=CP.map((P,i)=>[0,P.length-1].map(e=>{const q=P[e];for(let j=0;j<CP.length;j++){if(j===i)continue;for(const r of CP[j])if(Math.hypot(r[0]-q[0],r[1]-q[1])<4)return 0}return 1}));
  const stT=(P,i)=>{const n=P.length,f=fr[CP.indexOf(P)];let ac=[0];for(let k=1;k<n;k++)ac.push(ac[k-1]+Math.hypot(P[k][0]-P[k-1][0],P[k][1]-P[k-1][1]));const Lt=ac[n-1],w0=g.lineWidth;
    if(!(f[0]||f[1])){op(P);g.stroke();return}
    for(let k=1;k<n;k++){const m=(ac[k]+ac[k-1])/2;const t=Math.min(f[0]?m/7:1,f[1]?(Lt-m)/7:1,1);if(t<=.02)continue;g.lineWidth=w0*(.25+.75*t);const ga=g.globalAlpha;g.globalAlpha=ga*Math.min(1,t*1.3);g.beginPath();g.moveTo(P[k-1][0]-X0,Y1-P[k-1][1]);g.lineTo(P[k][0]-X0,Y1-P[k][1]);g.stroke();g.globalAlpha=ga}g.lineWidth=w0};
  g.strokeStyle='#55603f';g.lineWidth=3.0;g.globalAlpha=.2;for(const P of CP)stT(P);g.strokeStyle='#76736a';g.lineWidth=2.45;g.globalAlpha=.45;for(const P of CP)stT(P);g.strokeStyle='#8c897f';g.lineWidth=2.0;g.globalAlpha=.88;/* v1.24 A-grade: cart paths 2 yd (real ~8 ft) and lighter so they read from the tee (Merion 'faint paths') */for(const P of CP)stT(P);g.restore()}// v1.15: OSM cart paths: Chaikin-smoothed curves (4 passes), 1.35 yd core with a feathered edge, less contrast
  if((H.crk||[]).length){g.save();g.lineCap='round';g.lineJoin='round';// v1.15: added creeks under Lookaway's dry bridges: muddy banks, dark water, a few reed tufts (tapered ends)
    for(const c of H.crk){const P=c.P,n=P.length;const tp=k=>Math.min(1,Math.min(k,n-1-k)/7);
      for(const [col,wd,al] of[['#4b4a2c',4.6,.22],['#3c4128',3.2,.42],['#26312a',2.25,.85],['#2a4446',1.6,.95]]){g.strokeStyle=col;g.globalAlpha=al;for(let k=0;k<n-1;k++){const f=.35+.65*tp(k+.5);g.lineWidth=wd*c.w*f;g.beginPath();g.moveTo(P[k][0]-X0,Y1-P[k][1]);g.lineTo(P[k+1][0]-X0,Y1-P[k+1][1]);g.stroke()}}
      g.strokeStyle='#6f8f8a';g.globalAlpha=.28;g.lineWidth=.35;g.beginPath();P.forEach((p,k)=>{const x=p[0]-X0+.25,y=Y1-p[1]-.25;k?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();
      const RR=RNG('reed'+c.seed);g.lineWidth=.16;for(let k=1;k<n-1;k+=2){if(RR()>.55)continue;const p=P[k],q=P[k+1],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1;const sd=RR()<.5?1:-1,o=(1.25+RR.range(0,.7))*c.w*(.4+.6*tp(k));
        const cx=p[0]-dy/l*o*sd-X0,cy=Y1-(p[1]+dx/l*o*sd);g.strokeStyle=RR()<.5?'#45522a':'#56602f';g.globalAlpha=.55;for(let r=0;r<5;r++){const an=RR.range(0,6.28),ln=RR.range(.22,.45);g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(an)*ln,cy+Math.sin(an)*ln);g.stroke()}}}
    g.restore()}
  const myTee=P=>{let x=0,y=0;for(const q of P){x+=q[0];y+=q[1]}return Math.hypot(x/P.length,y/P.length)<90};// this hole's whole tee complex (all tee sets) reads as one even tee; other holes' boxes blend into the rough// other holes' tee boxes blend into the rough instead of reading as pale strips
  const nearTee=P=>{let x=0,y=0;for(const q of P){x+=q[0];y+=q[1]}return Math.hypot(x/P.length,y/P.length)<140};const playTee=P=>{let x=0,y=0;for(const q of P){x+=q[0];y+=q[1]}return pip(0,0,P)||Math.hypot(x/P.length,y/P.length)<8};g.fillStyle=st.fw;g.save();g.filter='blur('+(PX*.6).toFixed(1)+'px)';for(const P of(F.te||[])){g.globalAlpha=playTee(P)?.3:0;path(P);g.fill()}g.restore();g.globalAlpha=1;// the tee in play reads as a tee; other tee sets only a faint, soft-edged hint (no pale ovals)// one even tee complex (no light/dark blocks between tee sets)
  g.strokeStyle='#558c37';g.lineWidth=3.6;for(const P of F.gr){path(P);g.stroke()}
  g.fillStyle='#5f9d43';for(const P of F.gr){path(P);g.fill()}
  // bunkers: lip, sand, inner shade
  for(const P of(F.bk||[])){path(P);g.strokeStyle='rgba(60,70,30,.55)';g.lineWidth=1.1;g.stroke();g.fillStyle=st.sand;g.fill();
    g.save();path(P);g.clip();g.strokeStyle='rgba(120,100,70,.35)';g.lineWidth=2.2;g.stroke();g.restore()}
  // Church Pews ridges (signature)
  if(H.pews){const q=H.pews;g.save();path(q.P);g.clip();g.translate(q.cx-X0,Y1-q.cy);g.rotate(-q.ang);
    for(let k=0;k<q.n;k++){const u=q.u0+(k+.5)*q.sp,w=q.sp*.5;g.fillStyle='rgba(40,60,22,.5)';g.fillRect(q.v0+2.4,-(u+w*.62),q.v1-q.v0-4.8,w*1.24);g.fillStyle=st.rough;g.beginPath();g.roundRect(q.v0+3,-(u+w*.5),q.v1-q.v0-6,w,w*.5);g.fill();
      g.fillStyle='rgba(120,150,70,.25)';g.fillRect(q.v0+4,-(u+w*.45),q.v1-q.v0-8,w*.3)}g.restore()}
  // shorelines: rock revetment / seawall on rocky coasts, sand beach elsewhere; muddy bank on lakes
  const rocky={pebble:1,cypress:1,pacificdunes:1}[H.course.id];
  if(H.sea.length&&COAST_C[H.course.id])pebShore(H,g);else
  if(H.sea.length){g.lineJoin='round';
    if(rocky){g.strokeStyle='#5d574d';g.lineWidth=5.5;for(const P of H.sea){path(P);g.stroke()}g.strokeStyle='#7b7468';g.lineWidth=3;for(const P of H.sea){path(P);g.stroke()}
      const RR=RNG('rk'+H.course.id+H.hi);for(const P of H.sea)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<L;t+=1.6){const f=t/L,x=a[0]+(b[0]-a[0])*f+RR.range(-2.2,2.2),y=a[1]+(b[1]-a[1])*f+RR.range(-2.2,2.2);
        const v=RR.range(.7,1.2),rx=RR.range(.7,1.9),ry=rx*RR.range(.55,.85),ro=RR()*3,X=x-X0,Y=Y1-y;g.fillStyle='rgba(30,26,22,.45)';g.beginPath();g.ellipse(X+.3,Y+.35,rx*1.05,ry*1.05,ro,0,TAU);g.fill();const gr=g.createRadialGradient(X-rx*.35,Y-ry*.4,rx*.1,X,Y,rx);gr.addColorStop(0,`rgb(${168*v|0},${158*v|0},${142*v|0})`);gr.addColorStop(1,`rgb(${88*v|0},${80*v|0},${70*v|0})`);g.fillStyle=gr;g.beginPath();g.ellipse(X,Y,rx,ry,ro,0,TAU);g.fill()}}}
    else{g.strokeStyle='#d6c8a2';g.lineWidth=8;for(const P of H.sea){path(P);g.stroke()}g.strokeStyle='#b3a57f';g.lineWidth=3.2;for(const P of H.sea){path(P);g.stroke()}}}
  g.strokeStyle='rgba(66,70,40,.28)';g.lineWidth=6.;for(const P of(F.wa||[])){path(P);g.stroke()}g.strokeStyle='rgba(70,60,38,.5)';g.lineWidth=3.;for(const P of(F.wa||[])){path(P);g.stroke()}
  g.strokeStyle='rgba(58,52,34,.3)';g.lineWidth=1.;for(const P of(F.wa||[])){path(P);g.stroke()}
  // water
  g.fillStyle='#24525c';for(const P of(F.wa||[]).concat(H.sea)){path(P);g.fill()}
  if(!(F.te||[]).some(myTee)){g.fillStyle=st.fw;g.globalAlpha=.4;g.fillRect(-5-X0,Y1-5,10,9);g.globalAlpha=1}// no tee polygon: a plain tee (the shader mows it); never a striped pale slab
  if(H.grid){g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=.35;for(let y=150;y<=425;y+=25){g.beginPath();g.moveTo(-30-X0,Y1-y);g.lineTo(30-X0,Y1-y);g.stroke()}
    g.lineWidth=.5;for(const x of[-30,30]){g.beginPath();g.moveTo(x-X0,Y1-140);g.lineTo(x-X0,Y1-440);g.stroke()}}
  g.restore();
  // speckle detail on waste / native
  const R=RNG('p'+H.course.id+H.hi);
  for(let n=0;n<W*Hh*.02;n++){const x=R()*W,y=R()*Hh,s=S[Math.floor(Hh-1-y)*W+Math.floor(x)];
    if(s===9){g.fillStyle=R()<.5?'rgba(80,90,40,.7)':'rgba(140,120,80,.5)';g.beginPath();g.arc(x*PX,y*PX,PX*R.range(.3,.9),0,TAU);g.fill()}
    else if(s===8||s===0){g.fillStyle=R()<.5?'rgba(40,60,25,.12)':'rgba(150,150,90,.1)';g.beginPath();g.arc(x*PX,y*PX,PX*R.range(.3,.7),0,TAU);g.fill()}}
  // tree shadows (sun direction)
  // quarry floor: sandy base with scrub clumps, exposed rock and rough patches
  if(H.quarry&&H.quarry.length){const RQ=RNG('qp'+H.hi);for(const P of H.quarry){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const q of P){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])}
      g.save();path(P);g.clip();const A=(x1-x0)*(y1-y0);g.fillStyle='rgba(122,110,84,.45)';g.fillRect((x0-X0)*PX,(Y1-y1)*PX,(x1-x0)*PX,(y1-y0)*PX);
      for(let n=0;n<A*.018;n++){const x=RQ.range(x0,x1),y=RQ.range(y0,y1),r=RQ.range(2.5,6.5)*PX,k=RQ();g.fillStyle=k<.55?'rgba(64,84,38,.7)':k<.8?'rgba(86,96,52,.6)':'rgba(112,106,94,.65)';g.beginPath();g.ellipse((x-X0)*PX,(Y1-y)*PX,r,r*RQ.range(.45,.9),RQ()*3,0,TAU);g.fill()}
      for(let n=0;n<A*.11;n++){const x=RQ.range(x0,x1),y=RQ.range(y0,y1),r=RQ.range(.8,3.2)*PX,k=RQ();g.fillStyle=k<.4?'rgba(70,82,40,.6)':k<.6?'rgba(98,104,58,.5)':k<.8?'rgba(120,112,98,.55)':'rgba(205,190,150,.5)';g.beginPath();g.ellipse((x-X0)*PX,(Y1-y)*PX,r,r*RQ.range(.5,1),RQ()*3,0,TAU);g.fill()}
      g.restore()}}
  // underbrush at the base of pines on heath / pine-barren courses (Pine Valley style sandy scrub)
  if(H.course.style==='heath'||H.st.trees>.9){const RS=RNG('ub'+H.course.id+H.hi);for(const t of H.trees){if(t.sp!==0&&t.sp!==7)continue;
      const n=2+(RS()*4|0);for(let i=0;i<n;i++){const a=RS()*TAU,d=RS()*t.w*.35,x=t.x+Math.cos(a)*d,y=t.y+Math.sin(a)*d;const sf=H.surfAt(x,y);if(sf!==1&&sf!==8&&sf!==0&&sf!==9)continue;const r=RS.range(.6,1.8)*PX;
        g.fillStyle=RS()<.5?'rgba(58,70,34,.4)':'rgba(70,80,40,.32)';g.beginPath();g.ellipse((x-X0)*PX,(Y1-y)*PX,r,r*RS.range(.6,1),RS()*3,0,TAU);g.fill()}}}
  // pine straw beds under the pines (Augusta): soft, irregular reddish-brown carpets, not discs
  if(H.course.id==='augusta'){const RP=RNG('ps'+H.hi);g.save();for(const t of H.trees){if(t.sp!==0&&t.sp!==7)continue;const n=2+(RP()*3|0);for(let i=0;i<n;i++){const a=RP()*TAU,d=RP()*t.w*.3,x=t.x+Math.cos(a)*d,y=t.y+Math.sin(a)*d;const sf=H.surfAt(x,y);if(sf!==1&&sf!==8&&sf!==0)continue;
    const AUG=H.course.id==='augusta';const r=t.w*(AUG?RP.range(.34,.55):RP.range(.2,.34))*PX,cx=(x-X0)*PX,cy=(Y1-y)*PX;if(!(r>1&&isFinite(cx+cy)))continue;const gr=g.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,AUG?'rgba(118,84,52,.62)':'rgba(118,84,52,.5)');gr.addColorStop(.6,AUG?'rgba(118,84,52,.42)':'rgba(118,84,52,.32)');gr.addColorStop(1,'rgba(118,84,52,0)');g.fillStyle=gr;g.beginPath();g.ellipse(cx,cy,r,r*RP.range(.65,.95),RP()*3,0,TAU);g.fill();
    // needle litter: fine short strokes in mixed straw tones
    const m=Math.min(260,r*r*.06|0);for(let c=0;c<3;c++){g.strokeStyle=['rgba(150,108,66,.55)','rgba(96,66,40,.5)','rgba(168,130,84,.45)'][c];g.lineWidth=Math.max(.6,PX*.12);g.beginPath();for(let k=0;k<m/3;k++){const aa=RP()*TAU,dd=Math.sqrt(RP())*r*.85,px=cx+Math.cos(aa)*dd,py=cy+Math.sin(aa)*dd*.8,ang=RP()*TAU,l=PX*RP.range(.25,.6);g.moveTo(px,py);g.lineTo(px+Math.cos(ang)*l,py+Math.sin(ang)*l)}g.stroke()}}}g.restore()}
  // soft, capped tree shadows: one layer so overlapping crowns never stack darker than a single shadow, tinted by skylight so shaded turf stays green
  const SHA=.15+.07*Math.max(0,Math.min(1,(.38-SUN_FRAME[2])/.18));const sz=Math.max(SUN_FRAME[2],.36),sx=-SUN_FRAME[0]/sz,sy=-SUN_FRAME[1]/sz;
  {const cv0=g.canvas,sc=document.createElement('canvas');sc.width=cv0.width;sc.height=cv0.height;const q=sc.getContext('2d');
  for(const t of H.trees){const ch=t.h*(t.cb+(1-t.cb)*.5),rx=t.w*.5,ox=sx*ch,oy=sy*ch;const cx=(t.x+ox-X0)*PX,cy=(Y1-(t.y+oy))*PX;
    const r=Math.max(rx,.6)*PX;const gr=q.createRadialGradient(cx,cy,r*.1,cx,cy,r*1.2);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.55,'rgba(0,0,0,.85)');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;
    q.beginPath();q.ellipse(cx,cy,r*1.2,r*1.2*(t.sp===0||t.sp===7?1.2:1),Math.atan2(-oy,ox),0,TAU);q.fill();
    const bx=(t.x-X0)*PX,by=(Y1-t.y)*PX,br=Math.max(.8,rx*.35)*PX;const g2=q.createRadialGradient(bx,by,0,bx,by,br);g2.addColorStop(0,'rgba(0,0,0,1)');g2.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=g2;q.beginPath();q.arc(bx,by,br,0,TAU);q.fill()}
  q.fillStyle='rgba(0,0,0,1)';for(const B of H.blds||[]){const ox=sx*B.h*.8,oy=sy*B.h*.8;q.beginPath();for(const s2 of[0,1])B.P.forEach((p,i)=>{const x=(p[0]+ox*s2-X0)*PX,y=(Y1-(p[1]+oy*s2))*PX;i?q.lineTo(x,y):q.moveTo(x,y)});q.fill('nonzero');for(let i=0;i<B.P.length;i++){const p=B.P[i],r=B.P[(i+1)%B.P.length];q.beginPath();q.moveTo((p[0]-X0)*PX,(Y1-p[1])*PX);q.lineTo((r[0]-X0)*PX,(Y1-r[1])*PX);q.lineTo((r[0]+ox-X0)*PX,(Y1-(r[1]+oy))*PX);q.lineTo((p[0]+ox-X0)*PX,(Y1-(p[1]+oy))*PX);q.fill()}}// v1.15: building shadows
  q.globalCompositeOperation='source-in';q.fillStyle='rgb(16,40,36)';q.fillRect(0,0,sc.width,sc.height);
  g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=SHA;g.drawImage(sc,0,0);g.restore()}
  // mask: R water, G green, B sand, A fairway
  // anti-aliased mask at MS px/yd from the vector shapes (raster fallback for procedural cells)
  const MS=3,mw=W*MS,mh=Hh*MS,md=new Uint8Array(mw*mh*4);
  const chan=(fn)=>{const c=document.createElement('canvas');c.width=mw;c.height=mh;const q=c.getContext('2d');q.scale(MS,MS);fn(q);return q.getImageData(0,0,mw,mh).data};
  const pth=(q,P)=>{q.beginPath();P.forEach((p,i)=>{const x=p[0]-X0,y=Y1-p[1];i?q.lineTo(x,y):q.moveTo(x,y)});q.closePath()};
  const fromS=(q,test,col)=>{const b2=document.createElement('canvas');b2.width=W;b2.height=Hh;const bq=b2.getContext('2d'),id=bq.createImageData(W,Hh);for(let j=0;j<Hh;j++)for(let i=0;i<W;i++){const o=((Hh-1-j)*W+i)*4,v=test(S[j*W+i]);id.data[o]=id.data[o+1]=id.data[o+2]=v;id.data[o+3]=255}bq.putImageData(id,0,0);q.imageSmoothingEnabled=true;q.drawImage(b2,0,0,W,Hh)};
  const cR=chan(q=>{q.fillStyle='#000';q.fillRect(0,0,W,Hh);q.fillStyle='#fff';for(const P of(F.wa||[]).concat(H.sea)){pth(q,P);q.fill()}});
  const cG=chan(q=>{q.filter='blur('+(MS*.5)+'px)';q.fillStyle='#000';q.fillRect(0,0,W,Hh);q.fillStyle='rgb(40,40,40)';noHoles(q,()=>{for(const P of(F.fw||[])){pth(q,P);q.fill()}});q.save();q.filter='blur('+(MS*1.2)+'px)';q.fillStyle='rgb(26,26,26)';for(const P of(F.te||[]).filter(P=>{let x=0,y=0;for(const r of P){x+=r[0];y+=r[1]}return pip(0,0,P)||Math.hypot(x/P.length,y/P.length)<8})){pth(q,P);q.fill()}q.restore();q.strokeStyle='rgb(110,110,110)';q.lineWidth=3.6;q.lineJoin='round';for(const P of F.gr){pth(q,P);q.stroke()}q.fillStyle='#fff';for(const P of F.gr){pth(q,P);q.fill()}q.fillStyle='#000';for(const P of(F.bk||[])){pth(q,P);q.fill()}});
  const cB=chan(q=>{q.fillStyle='#000';q.fillRect(0,0,W,Hh);q.fillStyle='#fff';for(const P of(F.bk||[])){pth(q,P);q.fill()}
    if(H.pews){const p=H.pews;q.save();pth(q,p.P);q.clip();q.translate(p.cx-X0,Y1-p.cy);q.rotate(-p.ang);q.fillStyle='#000';for(let k=0;k<p.n;k++){const u=p.u0+(k+.5)*p.sp,w=p.sp*.5;q.beginPath();q.roundRect(p.v0+3,-(u+w*.5),p.v1-p.v0-6,w,w*.5);q.fill()}q.restore()}});
  const native=H.st.trees<.4&&['links','dunes','prairie','coastal','heath'].includes(H.course.style)&&H.course.id!=='chicago';
  const cA=chan(q=>{fromS(q,s=>(native&&H.course.id!=='chicago'&&(s===8||s===0))?128:0);if(H.course.id==='chicago'){q.fillStyle='rgb(128,128,128)';for(const P of(F.na||[])){pth(q,P);q.fill()}}q.fillStyle='#000';for(const P of(F.fw||[]).concat(F.te||[],F.gr,F.bk||[])){pth(q,P);q.fill()}});
  for(let r=0;r<mh;r++){const d0=(mh-1-r)*mw*4,s0=r*mw*4;for(let i=0;i<mw*4;i+=4){md[d0+i]=cR[s0+i];md[d0+i+1]=cG[s0+i];md[d0+i+2]=cB[s0+i];md[d0+i+3]=cA[s0+i]}}
  return{cv,mask:md,mw,mh}}

/* v1.20 shared coast (all COAST_C courses): the shoreline reads from the terrain. Low, gently rising shore = sand beach (Stillwater Cove, Carmel Bay);
   high bluff = a dark rock toe plus boulders, and every steep coastal face is painted as rock (not grass), so cliffs read as rock walls, not green ramps. */
function pebShore(H,g){const X0=H.X0,Y1=H.Y1,sz=seaLevel(H),RR=RNG('pk'+H.hi);g.lineJoin='round';g.lineCap='round';
  const rise=(x,y,nx,ny)=>Math.max(H.hAt(x+nx*7,y+ny*7),H.hAt(x-nx*7,y-ny*7),H.hAt(x+nx*14,y+ny*14),H.hAt(x-nx*14,y-ny*14))-sz;
  const inB=(x,y)=>x>X0+1&&x<H.X1-1&&y>H.Y0+1&&y<Y1-1;
  const segs=[];for(const P of H.sea)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<.01)continue;const n=Math.ceil(L/3);
    for(let k=0;k<n;k++){const f0=k/n,f1=(k+1)/n,x0=a[0]+(b[0]-a[0])*f0,y0=a[1]+(b[1]-a[1])*f0,x1=a[0]+(b[0]-a[0])*f1,y1=a[1]+(b[1]-a[1])*f1,mx=(x0+x1)/2,my=(y0+y1)/2;if(!inB(mx,my))continue;
      segs.push([x0,y0,x1,y1,rise(mx,my,-(y1-y0)/(L/n),(x1-x0)/(L/n))<2.4])}}
  const st=(w,c,beach)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();for(const q of segs)if(q[4]===beach){g.moveTo(q[0]-X0,Y1-q[1]);g.lineTo(q[2]-X0,Y1-q[3])}g.stroke()};
  st(10,'#d9cba4',true);st(4,'#c4b48c',true);st(2,'#a99872',true);
  st(5.5,'#4f4a42',false);st(3,'#6e675c',false);
  for(const q of segs){if(q[4])continue;const L=Math.hypot(q[2]-q[0],q[3]-q[1]);for(let t=0;t<L;t+=1.7){const f=t/L,x=q[0]+(q[2]-q[0])*f+RR.range(-2,2),y=q[1]+(q[3]-q[1])*f+RR.range(-2,2);
    const v=RR.range(.7,1.15),rx=RR.range(.7,1.8),ry=rx*RR.range(.55,.85),ro=RR()*3,X=x-X0,Y=Y1-y;g.fillStyle=`rgb(${120*v|0},${112*v|0},${100*v|0})`;g.beginPath();g.ellipse(X,Y,rx,ry,ro,0,TAU);g.fill()}}
  // v1.30: low ground right at sea level outside the mapped sea (tidal rocks, ledges) reads as wet rock, not green grass patches in the water
  for(let y=H.Y0+1;y<Y1-1;y+=1)for(let x=X0+1;x<H.X1-1;x+=1){const z=H.hAt(x,y);if(z>sz+1.1)continue;const s=H.surfAt(x,y);if(s!==S_ROUGH&&s!==S_DEEP&&s!==S_OB)continue;if(H.surfAt(x+6,y)!==S_WATER&&H.surfAt(x-6,y)!==S_WATER&&H.surfAt(x,y+6)!==S_WATER&&H.surfAt(x,y-6)!==S_WATER)continue;const v=.75+.3*hash2(x*5+y,y*7-x);g.fillStyle=`rgba(${96*v|0},${92*v|0},${84*v|0},.92)`;g.fillRect(x-X0-.5,Y1-y-.5,1.05,1.05)}
  // steep coastal faces -> rock (sandstone/granite greys with streaks); only on rough-type ground within reach of the sea level
  for(let y=H.Y0+1;y<Y1-1;y+=1)for(let x=X0+1;x<H.X1-1;x+=1){const z=H.hAt(x,y);if(z-sz>24||z<sz+.2)continue;const s=H.surfAt(x,y);if(s!==S_ROUGH&&s!==S_DEEP&&s!==S_OB)continue;
    const gr=H.gradAt(x,y),m=Math.hypot(gr[0],gr[1]);if(m<.75)continue;const a=Math.min(1,(m-.75)/.6),v=.78+.3*hash2(x*7+y,y*3-x);
    g.fillStyle=`rgba(${118*v|0},${108*v|0},${94*v|0},${(.55+.45*a).toFixed(2)})`;g.fillRect(x-X0-.5,Y1-y-.5,1.05,1.05)}}
